from decimal import Decimal

from django.test import TestCase
from django.utils import translation
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.roles import Role
from apps.catalog.models import Service, ServiceCategory, ServiceMaterial
from apps.crm.models import Contract, Customer
from apps.inventory.models import Material

from .calculations import compute_totals, markup_factor
from .models import PricingSettings, Quotation, QuotationItem
from .services import estimate_service

D = Decimal


def make_service():
    category = ServiceCategory.objects.create(name="Façade")
    service = Service.objects.create(category=category, title="ETICS", unit="m2", labour_hours_per_unit=D("1.1"))
    eps = Material.objects.create(sku="EPS", name="EPS board", unit="m2", unit_cost=D("9.00"))
    glue = Material.objects.create(sku="GLUE", name="Adhesive 25 kg", unit="bag", unit_cost=D("22.00"))
    ServiceMaterial.objects.create(service=service, material=eps, consumption_per_unit=D("1"), waste_percent=D("5"))
    ServiceMaterial.objects.create(service=service, material=glue, consumption_per_unit=D("0.36"), waste_percent=D("5"))
    return service


class CalculationTests(TestCase):
    def test_totals_with_discount_and_vat(self):
        totals = compute_totals([(D("10"), D("100"), D("60")), (D("2.5"), D("40"), D("20"))], D("100"), D("18"))
        self.assertEqual(totals.subtotal, D("1100.00"))
        self.assertEqual(totals.net_total, D("1000.00"))
        self.assertEqual(totals.vat_amount, D("180.00"))
        self.assertEqual(totals.total, D("1180.00"))
        self.assertEqual(totals.cost_total, D("650.00"))
        self.assertEqual(totals.profit, D("350.00"))

    def test_discount_cannot_exceed_subtotal(self):
        totals = compute_totals([(D("1"), D("50"), D("0"))], D("500"), D("18"))
        self.assertEqual(totals.total, D("0.00"))

    def test_markup_factor(self):
        self.assertEqual(markup_factor(10, 20), D("1.32"))

    def test_estimate_rounds_whole_packs_up_and_adds_labour(self):
        service = make_service()
        with translation.override("en"):
            lines = estimate_service(
                service, D("100"), overhead_percent=D("10"), margin_percent=D("20"), labour_rate=D("25")
            )
        by_desc = {line.description: line for line in lines}
        self.assertEqual(by_desc["EPS board"].quantity, D("105.00"))
        self.assertEqual(by_desc["Adhesive 25 kg"].quantity, D("38"))  # 37.8 bags → 38
        self.assertEqual(by_desc["EPS board"].unit_price, D("11.88"))  # 9 × 1.32
        labour = by_desc["Labour — ETICS"]
        self.assertEqual(labour.quantity, D("110.0"))
        self.assertEqual(labour.unit_cost, D("25.00"))


class QuotationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="m@example.com", password="x", role=Role.MANAGER, first_name="Giorgi")
        self.client.force_authenticate(self.user)
        self.customer = Customer.objects.create(name="ქართული კომპანია", phone="+995 555 000 000")
        self.service = make_service()

    def create_quote(self):
        response = self.client.post("/api/quotations/", {"title": "Façade", "customer": self.customer.id}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_new_quotation_takes_pricing_defaults(self):
        pricing = PricingSettings.load()
        data = self.create_quote()
        self.assertTrue(data["number"].startswith("Q-"))
        self.assertEqual(D(str(data["vat_percent"])), pricing.vat_percent)
        self.assertIsNotNone(data["valid_until"])
        self.assertEqual(data["terms"], pricing.default_terms)
        self.assertIsNone(data["enquiry_label"])

    def test_estimate_and_item_edits_recalculate_totals(self):
        quote = self.create_quote()
        response = self.client.post(
            f"/api/quotations/{quote['id']}/estimate/", {"service": self.service.id, "quantity": "100"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["items"]), 3)
        total_before = D(str(response.data["total"]))
        self.assertGreater(total_before, 0)

        item = QuotationItem.objects.filter(quotation_id=quote["id"]).first()
        self.client.delete(f"/api/quotation-items/{item.id}/")
        quotation = Quotation.objects.get(pk=quote["id"])
        self.assertLess(quotation.total, total_before)
        self.assertEqual(quotation.total, quotation.totals().total)

    def test_pdf_renders(self):
        quote = self.create_quote()
        self.client.post(f"/api/quotations/{quote['id']}/estimate/", {"service": self.service.id, "quantity": "50"}, format="json")
        response = self.client.get(f"/api/quotations/{quote['id']}/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_calculate_preview_saves_nothing(self):
        response = self.client.post(
            "/api/quotations/calculate/", {"lines": [{"service": self.service.id, "quantity": "10"}]}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["lines"]), 3)
        self.assertGreater(response.data["totals"]["total"], 0)
        self.assertFalse(QuotationItem.objects.exists())

    def test_convert_creates_project_and_contract(self):
        quote = self.create_quote()
        self.client.post(f"/api/quotations/{quote['id']}/estimate/", {"service": self.service.id, "quantity": "20"}, format="json")
        response = self.client.post(f"/api/quotations/{quote['id']}/convert/")
        self.assertEqual(response.status_code, 200, response.data)
        quotation = Quotation.objects.get(pk=quote["id"])
        self.assertEqual(quotation.status, Quotation.Status.ACCEPTED)
        self.assertEqual(quotation.project.budget, quotation.total)
        self.assertTrue(Contract.objects.filter(quotation=quotation).exists())
        # Idempotent: converting again does not duplicate the project or contract.
        self.client.post(f"/api/quotations/{quote['id']}/convert/")
        self.assertEqual(Contract.objects.filter(quotation=quotation).count(), 1)

    def test_sales_cannot_convert_without_project_access(self):
        quote = self.create_quote()
        sales = User.objects.create_user(email="s@example.com", password="x", role=Role.SALES)
        self.client.force_authenticate(sales)
        self.assertEqual(self.client.post(f"/api/quotations/{quote['id']}/convert/").status_code, 403)
