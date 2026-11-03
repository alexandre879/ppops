from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer, TranslatedFieldsMixin, translated

from .models import Service, ServiceCategory, ServiceImage, ServiceMaterial, Solution


class ServiceCategorySerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("name",)
    service_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ServiceCategory
        fields = [
            "id", "name", "slug", "description", "icon", "order", "is_published", "service_count",
            *translated("name", "description"),
        ]
        read_only_fields = ["name", "description"]
        extra_kwargs = {"slug": {"required": False}}


class SolutionSerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("name",)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Solution
        fields = [
            "id", "name", "slug", "kind", "kind_display", "description", "image", "is_published", "order",
            *translated("name", "description"),
        ]
        read_only_fields = ["name", "description"]
        extra_kwargs = {"slug": {"required": False}}


class ServiceImageSerializer(BaseModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ["id", "service", "image", "caption", "order"]


class ServiceMaterialSerializer(BaseModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_sku = serializers.CharField(source="material.sku", read_only=True)
    material_unit = serializers.CharField(source="material.unit", read_only=True)
    material_unit_cost = serializers.DecimalField(
        source="material.unit_cost", max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ServiceMaterial
        fields = [
            "id", "service", "material", "material_name", "material_sku", "material_unit",
            "material_unit_cost", "consumption_per_unit", "waste_percent", "note",
        ]

    def validate(self, attrs):
        if attrs.get("consumption_per_unit", 1) <= 0:
            raise serializers.ValidationError({"consumption_per_unit": _("Must be greater than zero.")})
        return attrs


class ServiceSerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("title",)
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    solutions = serializers.PrimaryKeyRelatedField(many=True, queryset=Solution.objects.all(), required=False)
    images = ServiceImageSerializer(many=True, read_only=True)
    recipe = ServiceMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            "id", "category", "category_name", "title", "slug", "summary", "description", "features",
            "image", "price_from", "unit", "unit_display", "labour_hours_per_unit", "solutions",
            "is_published", "is_featured", "order", "images", "recipe", "created_at", "updated_at",
            *translated("title", "summary", "description", "features"),
        ]
        read_only_fields = ["title", "summary", "description", "features", "created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False}}
