"""Read-only shapes for the public website. Never expose internal fields here
(budgets, customers, costs, internal notes)."""

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.core.models import SiteSettings
from apps.core.serializers import BaseModelSerializer
from apps.crm.models import Enquiry
from apps.inventory.models import Product
from apps.projects.models import Project


class PublicSiteSerializer(BaseModelSerializer):
    phones = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            "company_name", "tagline", "hero_title", "hero_subtitle", "hero_image", "about_text",
            "mission", "promise", "phones", "email", "address", "working_hours", "facebook_url",
            "instagram_url", "map_embed_url", "years_experience", "projects_completed", "specialists",
        ]

    def get_phones(self, obj) -> list[str]:
        return obj.phones


class PublicSolutionSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Solution
        fields = ["name", "slug", "kind", "kind_display", "description", "image"]


class PublicCategoryRefSerializer(BaseModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["name", "slug", "icon"]


class PublicServiceListSerializer(BaseModelSerializer):
    category = PublicCategoryRefSerializer(read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)

    class Meta:
        model = Service
        fields = ["title", "slug", "summary", "image", "price_from", "unit", "unit_display", "is_featured", "category"]


class PublicCategorySerializer(BaseModelSerializer):
    # Each category card and each service shows only its own photo: one material photo is
    # often linked to several services, and borrowing it would repeat the same picture.
    services = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ["name", "slug", "description", "icon", "image", "services"]

    def get_services(self, obj) -> list[dict]:
        return [
            {"title": s.title, "slug": s.slug, "summary": s.summary, "image": s.image.url if s.image else None}
            for s in obj.published_services
        ]


class PublicProjectListSerializer(BaseModelSerializer):
    building_type_display = serializers.CharField(source="get_building_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    cover = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    year = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "title", "slug", "public_summary", "city", "building_type", "building_type_display", "floors",
            "area_m2", "status", "status_display", "year", "cover", "services", "is_featured",
        ]

    def get_cover(self, obj) -> str | None:
        if obj.cover_image:
            return obj.cover_image.url
        photo = next(iter(obj.public_photos), None)
        return photo.image.url if photo else None

    def get_services(self, obj) -> list[dict]:
        return [{"title": s.title, "slug": s.slug} for s in obj.services.all() if s.is_published]

    def get_year(self, obj) -> int | None:
        day = obj.completed_date or obj.start_date
        return day.year if day else None


class PublicProjectDetailSerializer(PublicProjectListSerializer):
    photos = serializers.SerializerMethodField()

    class Meta(PublicProjectListSerializer.Meta):
        fields = PublicProjectListSerializer.Meta.fields + ["photos"]

    def get_photos(self, obj) -> list[dict]:
        return [
            {"image": p.image.url, "caption": p.caption, "stage": p.stage, "stage_display": p.get_stage_display()}
            for p in obj.public_photos
        ]


class PublicServiceDetailSerializer(PublicServiceListSerializer):
    images = serializers.SerializerMethodField()
    solutions = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta(PublicServiceListSerializer.Meta):
        fields = PublicServiceListSerializer.Meta.fields + ["description", "features", "images", "solutions", "projects"]

    def get_images(self, obj) -> list[dict]:
        return [{"image": i.image.url, "caption": i.caption} for i in obj.images.all()]

    def get_solutions(self, obj) -> list[dict]:
        return PublicSolutionSerializer([s for s in obj.solutions.all() if s.is_published], many=True).data

    def get_projects(self, obj) -> list[dict]:
        projects = self.context.get("related_projects", [])
        return PublicProjectListSerializer(projects, many=True).data


class PublicProductSerializer(BaseModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)

    class Meta:
        model = Product
        fields = ["name", "slug", "category", "category_display", "description", "standard", "image", "unit_display"]


class EnquiryCreateSerializer(serializers.ModelSerializer):
    service = serializers.SlugRelatedField(
        slug_field="slug", queryset=Service.objects.filter(is_published=True), required=False, allow_null=True
    )
    # Honeypot: hidden on the website, so only bots fill it in.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=200)

    class Meta:
        model = Enquiry
        fields = ["name", "email", "phone", "company", "service", "subject", "message", "location", "website"]
        extra_kwargs = {
            "name": {"max_length": 160},
            "message": {"max_length": 5000},
        }

    def validate(self, attrs):
        if not (attrs.get("phone") or attrs.get("email")):
            raise serializers.ValidationError({"phone": _("Please leave a phone number or an email so we can reply.")})
        return attrs


class AssistantMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class AssistantRequestSerializer(serializers.Serializer):
    """A chat with the website assistant: earlier turns plus the visitor's new question last."""

    MAX_QUESTION_LENGTH = 1000
    # Earlier turns give follow-up questions their context; older ones are dropped, not rejected.
    MAX_MESSAGES = 12

    messages = AssistantMessageSerializer(many=True, allow_empty=False)

    def validate_messages(self, messages):
        if len(messages) > 50:
            raise serializers.ValidationError("Too many messages.")
        messages = messages[-self.MAX_MESSAGES :]
        while messages and messages[0]["role"] != "user":
            messages = messages[1:]
        if not messages or messages[-1]["role"] != "user":
            raise serializers.ValidationError("The last message must be the visitor's question.")
        if len(messages[-1]["content"]) > self.MAX_QUESTION_LENGTH:
            raise serializers.ValidationError(f"Questions are limited to {self.MAX_QUESTION_LENGTH} characters.")
        return messages
