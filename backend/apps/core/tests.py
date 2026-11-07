"""Georgian / English / Russian behaviour across the API."""

from decimal import Decimal
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.roles import Role
from apps.catalog.models import Service, ServiceCategory
from apps.crm.models import Customer
from apps.quotes.models import Quotation
from apps.quotes.pdf import render_quotation_pdf


class LanguageTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.category = ServiceCategory.objects.create(name_en="Cladding", name_ka="მოპირკეთება", name_ru="Облицовка")
        self.service = Service.objects.create(
            category=self.category,
            title_en="Venetian plaster",
            title_ka="ვენეციური ბათქაში",
            title_ru="Венецианская штукатурка",
            labour_hours_per_unit=Decimal("1"),
        )

    def test_public_content_follows_accept_language(self):
        expected = {
            "ka": ("ვენეციური ბათქაში", "მოპირკეთება"),
            "en": ("Venetian plaster", "Cladding"),
            "ru": ("Венецианская штукатурка", "Облицовка"),
        }
        for language, (title, category) in expected.items():
            data = self.client.get("/api/public/services/", HTTP_ACCEPT_LANGUAGE=language).data
            self.assertEqual(data[0]["title"], title)
            self.assertEqual(data[0]["category"]["name"], category)

    def test_georgian_is_the_default_language(self):
        self.assertEqual(self.client.get("/api/public/services/").data[0]["title"], "ვენეციური ბათქაში")

    def test_missing_translation_falls_back_to_english(self):
        Service.objects.create(category=self.category, title_en="Only English")
        titles = [s["title"] for s in self.client.get("/api/public/services/", HTTP_ACCEPT_LANGUAGE="ru").data]
        self.assertIn("Only English", titles)

    def test_slug_is_built_from_the_english_title(self):
        self.assertEqual(self.service.slug, "venetian-plaster")

    def test_validation_messages_are_translated(self):
        ka = self.client.post("/api/public/enquiries/", {"name": "", "phone": "1"}, format="json")
        self.assertEqual(ka.data["name"][0], "ეს ველი არ შეიძლება იყოს ცარიელი.")
        ru = self.client.post("/api/public/enquiries/", {"name": "Иван", "privacy_consent": True}, format="json", HTTP_ACCEPT_LANGUAGE="ru")
        self.assertIn("телефон", ru.data["phone"][0])

    def test_admin_api_reads_and_writes_every_language(self):
        self.client.force_authenticate(User.objects.create_user(email="m@example.com", password="x", role=Role.MANAGER))
        response = self.client.post(
            "/api/catalog/services/",
            {"category": self.category.id, "title_ka": "ფასადი", "title_ru": "Фасад"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="ru",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["title"], "Фасад")
        self.assertEqual(response.data["title_ka"], "ფასადი")
        self.assertEqual(response.data["slug"], "pasadi")  # transliterated Georgian when no English title

        empty = self.client.post("/api/catalog/services/", {"category": self.category.id}, format="json")
        self.assertEqual(empty.status_code, 400)
        self.assertIn("title_ka", empty.data)

    def test_quotation_lines_and_pdf_use_the_quotation_language(self):
        self.client.force_authenticate(User.objects.create_user(email="s@example.com", password="x", role=Role.SALES))
        customer = Customer.objects.create(name="კლიენტი", phone="1")
        for language, labour in (("ka", "სამუშაო — ვენეციური ბათქაში"), ("ru", "Работы — Венецианская штукатурка")):
            quote = self.client.post(
                "/api/quotations/", {"title": "Q", "customer": customer.id, "language": language}, format="json"
            ).data
            items = self.client.post(
                f"/api/quotations/{quote['id']}/estimate/", {"service": self.service.id, "quantity": "10"}, format="json"
            ).data["items"]
            self.assertEqual(items[-1]["description"], labour)
            pdf = render_quotation_pdf(Quotation.objects.get(pk=quote["id"]))
            self.assertTrue(pdf.startswith(b"%PDF"))

    def test_seeded_company_texts_exist_in_every_language(self):
        call_command("seed", stdout=StringIO())
        taglines = {
            language: self.client.get("/api/public/site/", HTTP_ACCEPT_LANGUAGE=language).data["tagline"]
            for language in ("ka", "en", "ru")
        }
        self.assertTrue(taglines["en"].startswith("Façades"))  # English must not fall back to Georgian
        self.assertTrue(taglines["ka"].startswith("ფასადები"))
        self.assertTrue(taglines["ru"].startswith("Фасады"))

    def test_user_language_preference_is_saved(self):
        user = User.objects.create_user(email="u@example.com", password="x")
        self.assertEqual(user.language, "ka")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.patch("/api/auth/me/", {"language": "ru"}, format="json").data["language"], "ru")
