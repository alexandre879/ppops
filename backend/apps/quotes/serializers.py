from datetime import timedelta
from decimal import Decimal

from django.utils import timezone, translation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.catalog.models import Service
from apps.core.serializers import BaseModelSerializer

from .models import PricingSettings, Quotation, QuotationItem


class PricingSettingsSerializer(BaseModelSerializer):
    class Meta:
        model = PricingSettings
        exclude = ["id"]
        read_only_fields = ["updated_at", "default_terms", "default_notes"]


class QuotationItemSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = QuotationItem
        fields = [
            "id", "quotation", "kind", "kind_display", "group", "description", "unit", "quantity",
            "unit_cost", "unit_price", "line_total", "material", "service", "order",
        ]
        read_only_fields = ["line_total"]

    def validate(self, attrs):
        for field in ("quantity", "unit_cost", "unit_price"):
            if attrs.get(field) is not None and attrs[field] < 0:
                raise serializers.ValidationError({field: _("Cannot be negative.")})
        return attrs


class QuotationListSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Quotation
        fields = [
            "id", "number", "title", "customer", "customer_name", "project", "project_code", "status",
            "status_display", "issue_date", "valid_until", "total", "is_expired", "created_at",
        ]


class QuotationSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    enquiry_label = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default=None)
    items = QuotationItemSerializer(many=True, read_only=True)
    profit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    margin_actual = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = [
            "id", "number", "title", "customer", "customer_name", "enquiry", "enquiry_label", "project",
            "project_code", "status", "status_display", "language", "issue_date", "valid_until", "site_address",
            "overhead_percent", "margin_percent", "vat_percent", "discount_amount", "notes", "terms",
            "subtotal", "net_total", "vat_amount", "total", "cost_total", "profit", "margin_actual",
            "currency", "is_expired", "items", "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = [
            "number", "subtotal", "net_total", "vat_amount", "total", "cost_total", "created_by",
            "created_at", "updated_at",
        ]

    def get_enquiry_label(self, obj) -> str | None:
        return str(obj.enquiry) if obj.enquiry_id else None

    def get_margin_actual(self, obj) -> float | None:
        if not obj.net_total:
            return None
        return round(float(obj.profit / obj.net_total * 100), 1)

    def get_currency(self, obj) -> str:
        return self.context.get("currency") or PricingSettings.load().currency

    def validate(self, attrs):
        issue = attrs.get("issue_date", getattr(self.instance, "issue_date", None))
        valid_until = attrs.get("valid_until", getattr(self.instance, "valid_until", None))
        if issue and valid_until and valid_until < issue:
            raise serializers.ValidationError({"valid_until": _("Cannot be before the issue date.")})
        for field in ("overhead_percent", "margin_percent", "vat_percent", "discount_amount"):
            if attrs.get(field) is not None and attrs[field] < 0:
                raise serializers.ValidationError({field: _("Cannot be negative.")})
        return attrs

    def create(self, validated_data):
        pricing = PricingSettings.load()
        for field in ("overhead_percent", "margin_percent", "vat_percent"):
            validated_data.setdefault(field, getattr(pricing, field))
        language = validated_data.setdefault("language", translation.get_language() or "ka")[:2]
        with translation.override(language):
            validated_data.setdefault("terms", pricing.default_terms)
            validated_data.setdefault("notes", pricing.default_notes)
        issue_date = validated_data.setdefault("issue_date", timezone.localdate())
        validated_data.setdefault("valid_until", issue_date + timedelta(days=pricing.validity_days))
        return super().create(validated_data)


class EstimateRequestSerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    include_labour = serializers.BooleanField(default=True)
    group = serializers.CharField(max_length=200, required=False, allow_blank=True)


class CalculateRequestSerializer(serializers.Serializer):
    lines = EstimateRequestSerializer(many=True, allow_empty=False)
    overhead_percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, required=False)
    margin_percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, required=False)
    vat_percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, required=False)
    discount_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, required=False)
