from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import PrivateFileDownloadMixin

from .models import Communication, Contract, Customer, Enquiry
from .serializers import CommunicationSerializer, ContractSerializer, CustomerSerializer, EnquirySerializer


class CustomerViewSet(viewsets.ModelViewSet):
    permission_module = "crm"
    queryset = Customer.objects.select_related("assigned_to").annotate(
        projects_count=Count("projects", distinct=True),
        quotations_count=Count("quotations", distinct=True),
        contracts_count=Count("contracts", distinct=True),
    )
    serializer_class = CustomerSerializer
    filterset_fields = ["kind", "status", "source", "assigned_to", "city"]
    search_fields = ["name", "contact_person", "email", "phone", "tax_id", "address"]
    ordering_fields = ["name", "created_at", "updated_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EnquiryViewSet(viewsets.ModelViewSet):
    permission_module = "crm"
    queryset = Enquiry.objects.select_related("service", "customer", "assigned_to")
    serializer_class = EnquirySerializer
    filterset_fields = ["status", "source", "service", "customer", "assigned_to"]
    search_fields = ["name", "email", "phone", "company", "subject", "message", "location"]
    ordering_fields = ["created_at", "status"]

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Turn the enquiry into a customer record (idempotent)."""
        enquiry = self.get_object()
        enquiry.convert_to_customer(user=request.user)
        return Response(self.get_serializer(enquiry).data)


class CommunicationViewSet(viewsets.ModelViewSet):
    permission_module = "crm"
    queryset = Communication.objects.select_related("customer", "user")
    serializer_class = CommunicationSerializer
    filterset_fields = ["customer", "enquiry", "channel", "direction"]
    search_fields = ["subject", "summary", "customer__name"]
    ordering_fields = ["occurred_at", "follow_up_date"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ContractViewSet(PrivateFileDownloadMixin, viewsets.ModelViewSet):
    permission_module = "crm"
    queryset = Contract.objects.select_related("customer", "project", "quotation")
    serializer_class = ContractSerializer
    filterset_fields = ["status", "customer", "project"]
    search_fields = ["number", "title", "customer__name"]
    ordering_fields = ["created_at", "signed_date", "value", "end_date"]
