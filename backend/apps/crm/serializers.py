from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer, PrivateFileSerializerMixin

from .models import Communication, Contract, Customer, Enquiry


class CustomerSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)
    projects_count = serializers.IntegerField(read_only=True)
    quotations_count = serializers.IntegerField(read_only=True)
    contracts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id", "kind", "kind_display", "name", "contact_person", "email", "phone", "secondary_phone",
            "address", "city", "tax_id", "source", "source_display", "status", "status_display",
            "assigned_to", "assigned_to_name", "notes", "projects_count", "quotations_count",
            "contracts_count", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        email = attrs.get("email", getattr(self.instance, "email", ""))
        phone = attrs.get("phone", getattr(self.instance, "phone", ""))
        if not (email or phone):
            raise serializers.ValidationError(_("Enter at least a phone number or an email address."))
        return attrs


class EnquirySerializer(BaseModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    service_title = serializers.CharField(source="service.title", read_only=True, default=None)
    customer_name = serializers.CharField(source="customer.name", read_only=True, default=None)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)

    class Meta:
        model = Enquiry
        fields = [
            "id", "name", "email", "phone", "company", "service", "service_title", "subject", "message",
            "location", "source", "source_display", "status", "status_display", "customer",
            "customer_name", "assigned_to", "assigned_to_name", "internal_notes", "privacy_consent_at", "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CommunicationSerializer(BaseModelSerializer):
    channel_display = serializers.CharField(source="get_channel_display", read_only=True)
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True, default=None)

    class Meta:
        model = Communication
        fields = [
            "id", "customer", "customer_name", "enquiry", "channel", "channel_display", "direction",
            "direction_display", "subject", "summary", "occurred_at", "follow_up_date", "user",
            "user_name", "created_at",
        ]
        read_only_fields = ["user", "created_at"]


class ContractSerializer(PrivateFileSerializerMixin, BaseModelSerializer):
    download_basename = "contract"

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    quotation_number = serializers.CharField(source="quotation.number", read_only=True, default=None)

    class Meta:
        model = Contract
        fields = [
            "id", "number", "title", "customer", "customer_name", "project", "project_code", "quotation",
            "quotation_number", "value", "status", "status_display", "signed_date", "start_date",
            "end_date", "file", "file_name", "download_url", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["number", "created_at", "updated_at"]
        extra_kwargs = {"file": {"write_only": True}}

    def validate(self, attrs):
        start, end = attrs.get("start_date"), attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": _("End date cannot be before the start date.")})
        return attrs
