from decimal import Decimal

from django.db.models import Sum
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer, PrivateFileSerializerMixin, TranslatedFieldsMixin, translated
from apps.staff.serializers import EmployeeBriefSerializer

from .models import Project, ProjectDocument, ProjectExpense, ProjectMilestone, ProjectPayment, ProjectPhoto

FINANCE_FIELDS = ("budget", "total_expenses", "total_payments", "budget_used_percent", "balance")


def _total(obj, attr, related):
    value = getattr(obj, attr, None)
    if value is None:
        value = getattr(obj, related).aggregate(total=Sum("amount"))["total"] or 0
    return value


class ProjectListSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True, default=None)
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True, default=None)
    is_overdue = serializers.BooleanField(read_only=True)
    total_expenses = serializers.SerializerMethodField()
    total_payments = serializers.SerializerMethodField()
    budget_used_percent = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "code", "title", "slug", "customer", "customer_name", "status", "status_display",
            "priority", "priority_display", "progress", "city", "start_date", "deadline",
            "completed_date", "budget", "total_expenses", "total_payments", "budget_used_percent",
            "is_overdue", "manager", "manager_name", "cover_image", "show_in_portfolio", "is_featured",
            "created_at", "updated_at",
        ]
        read_only_fields = ["code", "created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False}}

    def get_total_expenses(self, obj) -> Decimal:
        return _total(obj, "total_expenses", "expenses")

    def get_total_payments(self, obj) -> Decimal:
        return _total(obj, "total_payments", "payments")

    def get_budget_used_percent(self, obj) -> float | None:
        if not obj.budget:
            return None
        return round(float(self.get_total_expenses(obj)) / float(obj.budget) * 100, 1)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.can("finance", "read"):
            for field in FINANCE_FIELDS:
                data.pop(field, None)
        return data


class ProjectDetailSerializer(TranslatedFieldsMixin, ProjectListSerializer):
    required_translations = ("title",)
    building_type_display = serializers.CharField(source="get_building_type_display", read_only=True)
    services_detail = serializers.SerializerMethodField()
    teams_detail = serializers.SerializerMethodField()
    employees_detail = EmployeeBriefSerializer(source="employees", many=True, read_only=True)
    balance = serializers.SerializerMethodField()
    counts = serializers.SerializerMethodField()

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + [
            "description", "public_summary", "address", "building_type", "building_type_display",
            "floors", "area_m2", "services", "services_detail", "teams", "teams_detail", "employees",
            "employees_detail", "balance", "counts", *translated("title", "public_summary", "city"),
        ]
        read_only_fields = ProjectListSerializer.Meta.read_only_fields + ["title", "public_summary", "city"]

    def get_services_detail(self, obj) -> list[dict]:
        return [{"id": s.id, "title": s.title} for s in obj.services.all()]

    def get_teams_detail(self, obj) -> list[dict]:
        return [{"id": t.id, "name": t.name} for t in obj.teams.all()]

    def get_balance(self, obj) -> Decimal:
        """Amount the client still owes against the budget."""
        return obj.budget - self.get_total_payments(obj)

    def get_counts(self, obj) -> dict:
        milestones = obj.milestones.all()
        return {
            "photos": obj.photos.count(),
            "documents": obj.documents.count(),
            "milestones": len(milestones),
            "milestones_done": sum(1 for m in milestones if m.is_completed),
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        if start and deadline and deadline < start:
            raise serializers.ValidationError({"deadline": _("Deadline cannot be before the start date.")})
        return attrs


class ProjectPhotoSerializer(BaseModelSerializer):
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = ProjectPhoto
        fields = [
            "id", "project", "image", "caption", "stage", "stage_display", "is_public", "order",
            "uploaded_by", "created_at",
        ]
        read_only_fields = ["uploaded_by", "created_at"]


class ProjectDocumentSerializer(PrivateFileSerializerMixin, BaseModelSerializer):
    download_basename = "projectdocument"
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = ProjectDocument
        fields = [
            "id", "project", "title", "kind", "kind_display", "file", "file_name", "download_url",
            "uploaded_by", "uploaded_by_name", "created_at",
        ]
        read_only_fields = ["uploaded_by", "created_at"]
        extra_kwargs = {"file": {"write_only": True}}


class ProjectExpenseSerializer(BaseModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True)
    has_receipt = serializers.SerializerMethodField()

    class Meta:
        model = ProjectExpense
        fields = [
            "id", "project", "project_code", "category", "category_display", "description", "amount",
            "date", "supplier", "receipt", "has_receipt", "created_by", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]
        extra_kwargs = {"receipt": {"write_only": True}}

    def get_has_receipt(self, obj) -> bool:
        return bool(obj.receipt)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(_("Amount must be greater than zero."))
        return value


class ProjectPaymentSerializer(BaseModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True)

    class Meta:
        model = ProjectPayment
        fields = [
            "id", "project", "project_code", "amount", "date", "method", "method_display", "reference",
            "note", "created_by", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(_("Amount must be greater than zero."))
        return value


class ProjectMilestoneSerializer(BaseModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectMilestone
        fields = ["id", "project", "title", "due_date", "is_completed", "completed_at", "is_overdue", "order"]
        read_only_fields = ["completed_at"]
