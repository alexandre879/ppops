from django.db import transaction
from django.http import HttpResponse
from django.utils.translation import gettext as _
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response

from apps.core.views import SingletonView
from apps.crm.models import Contract, Customer, Enquiry
from apps.projects.models import Project

from .calculations import compute_totals
from .models import PricingSettings, Quotation, QuotationItem
from .pdf import render_quotation_pdf
from .serializers import (
    CalculateRequestSerializer,
    EstimateRequestSerializer,
    PricingSettingsSerializer,
    QuotationItemSerializer,
    QuotationListSerializer,
    QuotationSerializer,
)
from .services import add_estimate_to_quotation, estimate_service


class PDFRenderer(BaseRenderer):
    media_type = "application/pdf"
    format = "pdf"
    charset = None
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class PricingSettingsView(SingletonView):
    model = PricingSettings
    serializer_class = PricingSettingsSerializer
    permission_module = "settings"


class QuotationViewSet(viewsets.ModelViewSet):
    permission_module = "quotes"
    queryset = Quotation.objects.select_related("customer", "project", "enquiry", "created_by").prefetch_related("items")
    filterset_fields = ["status", "customer", "project", "enquiry"]
    search_fields = ["number", "title", "customer__name", "site_address"]
    ordering_fields = ["created_at", "issue_date", "valid_until", "total"]

    def get_serializer_class(self):
        return QuotationListSerializer if self.action == "list" else QuotationSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save().recalculate()

    def _detail(self, quotation, status_code=status.HTTP_200_OK):
        quotation = self.get_queryset().get(pk=quotation.pk)
        return Response(QuotationSerializer(quotation, context=self.get_serializer_context()).data, status=status_code)

    @action(detail=True, methods=["post"])
    def estimate(self, request, pk=None):
        """Append material + labour lines calculated from a service recipe."""
        quotation = self.get_object()
        params = EstimateRequestSerializer(data=request.data)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        items = add_estimate_to_quotation(
            quotation,
            data["service"],
            data["quantity"],
            include_labour=data["include_labour"],
            group=data.get("group", ""),
        )
        if not items:
            return Response(
                {"detail": _("This service has no material recipe, labour norm or base price to estimate from.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._detail(quotation)

    @action(detail=False, methods=["post"])
    def calculate(self, request):
        """Stateless estimate preview for the cost calculator (nothing is saved)."""
        params = CalculateRequestSerializer(data=request.data)
        params.is_valid(raise_exception=True)
        data = params.validated_data
        pricing = PricingSettings.load()
        overhead = data.get("overhead_percent", pricing.overhead_percent)
        margin = data.get("margin_percent", pricing.margin_percent)
        vat = data.get("vat_percent", pricing.vat_percent)
        lines = []
        for line in data["lines"]:
            lines += estimate_service(
                line["service"],
                line["quantity"],
                overhead_percent=overhead,
                margin_percent=margin,
                labour_rate=pricing.labour_rate_per_hour,
                include_labour=line["include_labour"],
                group=line.get("group", ""),
            )
        totals = compute_totals(
            [(l.quantity, l.unit_price, l.unit_cost) for l in lines], data.get("discount_amount", 0), vat
        )
        return Response(
            {
                "lines": [line.as_dict() for line in lines],
                "totals": totals.as_dict(),
                "settings": {
                    "currency": pricing.currency,
                    "overhead_percent": overhead,
                    "margin_percent": margin,
                    "vat_percent": vat,
                    "labour_rate_per_hour": pricing.labour_rate_per_hour,
                },
            }
        )

    @action(detail=True, methods=["get"], renderer_classes=[PDFRenderer, JSONRenderer])
    def pdf(self, request, pk=None):
        quotation = self.get_object()
        response = HttpResponse(render_quotation_pdf(quotation), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{quotation.number}.pdf"'
        return response

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        with transaction.atomic():
            copy = Quotation.objects.create(
                title=f"{original.title} ({_('copy')})",
                language=original.language,
                customer=original.customer,
                enquiry=original.enquiry,
                site_address=original.site_address,
                overhead_percent=original.overhead_percent,
                margin_percent=original.margin_percent,
                vat_percent=original.vat_percent,
                discount_amount=original.discount_amount,
                notes=original.notes,
                terms=original.terms,
                valid_until=None,
                created_by=request.user,
            )
            QuotationItem.objects.bulk_create(
                [
                    QuotationItem(
                        quotation=copy,
                        kind=item.kind,
                        group=item.group,
                        description=item.description,
                        unit=item.unit,
                        quantity=item.quantity,
                        unit_cost=item.unit_cost,
                        unit_price=item.unit_price,
                        line_total=item.line_total,
                        material_id=item.material_id,
                        service_id=item.service_id,
                        order=item.order,
                    )
                    for item in original.items.all()
                ]
            )
            copy.recalculate()
        return self._detail(copy, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Accept the quotation: create the project and a draft contract from it."""
        if not request.user.can("projects", "write"):
            raise PermissionDenied(_("You need project management access to start a project."))
        quotation = self.get_object()
        with transaction.atomic():
            project = quotation.project
            if project is None:
                project = Project.objects.create(
                    title=quotation.title,
                    customer=quotation.customer,
                    address=quotation.site_address,
                    city=quotation.customer.city,
                    budget=quotation.total,
                    manager=request.user,
                    created_by=request.user,
                )
                service_ids = {i.service_id for i in quotation.items.all() if i.service_id}
                project.services.set(service_ids)
            quotation.project = project
            quotation.status = Quotation.Status.ACCEPTED
            quotation.save(update_fields=["project", "status", "updated_at"])

            contract = quotation.contracts.first() or Contract.objects.create(
                title=quotation.title,
                customer=quotation.customer,
                project=project,
                quotation=quotation,
                value=quotation.total,
            )
            Customer.objects.filter(pk=quotation.customer_id, status=Customer.Status.LEAD).update(
                status=Customer.Status.ACTIVE
            )
            if quotation.enquiry_id:
                Enquiry.objects.filter(pk=quotation.enquiry_id).update(status=Enquiry.Status.WON)
        return Response({"project": project.id, "contract": contract.id, "quotation": quotation.id})


class QuotationItemViewSet(viewsets.ModelViewSet):
    permission_module = "quotes"
    queryset = QuotationItem.objects.select_related("quotation")
    serializer_class = QuotationItemSerializer
    filterset_fields = ["quotation", "kind"]
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save().quotation.recalculate()

    def perform_update(self, serializer):
        serializer.save().quotation.recalculate()

    def perform_destroy(self, instance):
        quotation = instance.quotation
        instance.delete()
        quotation.recalculate()
