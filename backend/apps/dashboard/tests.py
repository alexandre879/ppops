from io import StringIO

from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.roles import Role


class DashboardTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed", "--demo", stdout=StringIO())

    def test_admin_sees_every_section(self):
        self.client.force_authenticate(User.objects.get(email="admin@newhousemodern.ge"))
        data = self.client.get("/api/dashboard/summary/").data
        for section in ("projects", "finance", "customers", "quotations", "staff", "inventory", "deadlines"):
            self.assertIn(section, data)
        self.assertEqual(len(data["finance"]["monthly"]), 12)
        self.assertGreater(data["projects"]["active"], 0)
        self.assertGreater(data["quotations"]["pending_count"], 0)

    def test_sections_are_limited_by_role(self):
        self.client.force_authenticate(User.objects.create_user(email="w@example.com", password="x", role=Role.STAFF))
        data = self.client.get("/api/dashboard/summary/").data
        self.assertIn("projects", data)
        self.assertNotIn("finance", data)
        self.assertNotIn("customers", data)
        self.assertNotIn("budget", data["projects"]["performance"][0])

    def test_seed_is_idempotent(self):
        call_command("seed", "--demo", stdout=StringIO())
        self.assertEqual(User.objects.filter(email="admin@newhousemodern.ge").count(), 1)
