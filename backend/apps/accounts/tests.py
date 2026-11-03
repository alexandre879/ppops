from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User
from .roles import Role


class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email="Sales@Example.com", password="S3cure-pass!", role=Role.SALES)

    def test_login_returns_access_token_and_sets_httponly_refresh_cookie(self):
        response = self.client.post("/api/auth/login/", {"email": "sales@example.com", "password": "S3cure-pass!"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], Role.SALES)
        cookie = response.cookies[settings.AUTH_REFRESH_COOKIE["name"]]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["path"], "/api/auth/")

    def test_refresh_uses_cookie_and_logout_revokes_it(self):
        self.client.post("/api/auth/login/", {"email": "sales@example.com", "password": "S3cure-pass!"})
        refreshed = self.client.post("/api/auth/refresh/")
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn("access", refreshed.data)

        rotated = self.client.cookies[settings.AUTH_REFRESH_COOKIE["name"]].value
        self.client.post("/api/auth/logout/")
        self.client.cookies[settings.AUTH_REFRESH_COOKIE["name"]] = rotated
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 401)

    def test_wrong_password_is_rejected(self):
        response = self.client.post("/api/auth/login/", {"email": "sales@example.com", "password": "nope"})
        self.assertEqual(response.status_code, 400)


class RolePermissionTests(APITestCase):
    def test_module_permissions_follow_role(self):
        sales = User.objects.create_user(email="s@example.com", password="x", role=Role.SALES)
        self.client.force_authenticate(sales)
        self.assertEqual(self.client.get("/api/crm/customers/").status_code, 200)
        self.assertEqual(self.client.get("/api/inventory/materials/").status_code, 200)  # read-only
        self.assertEqual(self.client.post("/api/inventory/materials/", {}).status_code, 403)
        self.assertEqual(self.client.get("/api/users/").status_code, 403)
        self.assertEqual(self.client.get("/api/project-expenses/").status_code, 403)

    def test_finance_fields_hidden_without_finance_access(self):
        from apps.projects.models import Project

        Project.objects.create(title="Test project", budget=1000)
        staff = User.objects.create_user(email="w@example.com", password="x", role=Role.STAFF)
        self.client.force_authenticate(staff)
        row = self.client.get("/api/projects/").data["results"][0]
        self.assertNotIn("budget", row)
        self.assertIn("progress", row)

    def test_me_exposes_permission_map(self):
        manager = User.objects.create_user(email="m@example.com", password="x", role=Role.MANAGER)
        self.client.force_authenticate(manager)
        perms = self.client.get("/api/auth/me/").data["permissions"]
        self.assertTrue(perms["projects"]["write"])
        self.assertFalse(perms["users"]["read"])

    def test_anonymous_requests_are_rejected(self):
        self.assertEqual(self.client.get("/api/projects/").status_code, 401)

    def test_deleting_a_protected_record_returns_conflict(self):
        from apps.crm.models import Customer
        from apps.quotes.models import Quotation

        customer = Customer.objects.create(name="Client", phone="1")
        Quotation.objects.create(title="Q", customer=customer)
        self.client.force_authenticate(User.objects.create_user(email="m@example.com", password="x", role=Role.MANAGER))
        response = self.client.delete(f"/api/crm/customers/{customer.id}/", HTTP_ACCEPT_LANGUAGE="en")
        self.assertEqual(response.status_code, 409)
        self.assertIn("quotations", response.data["detail"])
