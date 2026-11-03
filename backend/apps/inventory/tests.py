from decimal import Decimal

from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.roles import Role

from .models import Material, Product, ProductionOrder

D = Decimal


class StockLedgerTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(User.objects.create_user(email="p@example.com", password="x", role=Role.PRODUCTION))
        self.material = Material.objects.create(sku="M1", name="Primer", unit="l", quantity=D("10"))

    def move(self, movement_type, quantity):
        return self.client.post(
            "/api/inventory/movements/",
            {"material": self.material.id, "movement_type": movement_type, "quantity": quantity},
            format="json",
        )

    def test_in_out_and_count_update_balance(self):
        self.assertEqual(self.move("in", "5").status_code, 201)
        self.assertEqual(self.move("out", "3").data["balance_after"], 12)
        self.assertEqual(self.move("adjust", "11.5").data["balance_after"], 11.5)
        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, D("11.5"))

    def test_cannot_take_more_than_in_stock(self):
        response = self.move("out", "50")
        self.assertEqual(response.status_code, 400)
        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, D("10"))

    def test_ledger_is_append_only(self):
        movement_id = self.move("in", "1").data["id"]
        self.assertEqual(self.client.delete(f"/api/inventory/movements/{movement_id}/").status_code, 405)

    def test_quantity_not_editable_directly(self):
        self.client.patch(f"/api/inventory/materials/{self.material.id}/", {"quantity": "999"}, format="json")
        self.material.refresh_from_db()
        self.assertEqual(self.material.quantity, D("10"))


class ProductionTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(User.objects.create_user(email="p@example.com", password="x", role=Role.PRODUCTION))
        self.product = Product.objects.create(sku="SCF", name="Scaffolding", category="scaffolding", quantity=D("2"))

    def test_completing_an_order_posts_stock_once(self):
        order = self.client.post(
            "/api/inventory/production-orders/", {"product": self.product.id, "quantity": "10"}, format="json"
        ).data
        self.assertTrue(order["number"].startswith("PO-"))
        self.client.post(f"/api/inventory/production-orders/{order['id']}/complete/")
        self.client.post(f"/api/inventory/production-orders/{order['id']}/complete/")
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, D("12"))

        response = self.client.patch(
            f"/api/inventory/production-orders/{order['id']}/", {"quantity": "20"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(ProductionOrder.objects.get(pk=order["id"]).stock_posted)
