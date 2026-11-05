from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.crm.models import Enquiry, Source
from apps.projects.models import Project, ProjectPhoto


class PublicApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        category = ServiceCategory.objects.create(name="Cladding")
        self.service = Service.objects.create(category=category, title="ACP cladding")
        Service.objects.create(category=category, title="Hidden draft", is_published=False)

    def test_site_settings_are_public(self):
        data = self.client.get("/api/public/site/").data
        self.assertEqual(data["company_name"], "New House Modern")
        self.assertEqual(data["phones"][-1], "+995 568 28 27 72")
        self.assertEqual(len(data["phones"]), 5)

    def test_only_published_services_are_listed(self):
        titles = [s["title"] for s in self.client.get("/api/public/services/").data]
        self.assertEqual(titles, ["ACP cladding"])
        self.assertEqual(self.client.get("/api/public/services/hidden-draft/").status_code, 404)

    def test_each_category_and_service_shows_only_its_own_photo(self):
        # A material photo linked to the service must not be borrowed as the service's photo.
        panel = Solution.objects.create(name="ACP panel", image="solutions/acp.jpg")
        self.service.solutions.add(panel)
        detail = self.client.get(f"/api/public/services/{self.service.slug}/").data
        self.assertIsNone(detail["image"])
        category = self.client.get("/api/public/categories/").data[0]
        self.assertIsNone(category["image"])
        self.assertIsNone(category["services"][0]["image"])

        # Nor is a service's photo borrowed for its category card.
        self.service.image = "services/own.jpg"
        self.service.save()
        category = self.client.get("/api/public/categories/").data[0]
        self.assertIsNone(category["image"])
        self.assertEqual(category["services"][0]["image"], "/media/services/own.jpg")

        ServiceCategory.objects.update(image="services/categories/own.jpg")
        self.assertEqual(self.client.get("/api/public/categories/").data[0]["image"], "/media/services/categories/own.jpg")

    def test_portfolio_hides_internal_projects_and_fields(self):
        shown = Project.objects.create(title="Shown", show_in_portfolio=True, budget=50000)
        Project.objects.create(title="Internal", show_in_portfolio=False)
        ProjectPhoto.objects.create(project=shown, image="projects/photos/a.jpg", is_public=True)
        ProjectPhoto.objects.create(project=shown, image="projects/photos/b.jpg", is_public=False)

        listing = self.client.get("/api/public/projects/").data
        self.assertEqual([p["title"] for p in listing], ["Shown"])
        self.assertNotIn("budget", listing[0])
        self.assertNotIn("customer", listing[0])
        detail = self.client.get(f"/api/public/projects/{shown.slug}/").data
        self.assertEqual(len(detail["photos"]), 1)

    def test_enquiry_is_stored_as_website_lead(self):
        response = self.client.post(
            "/api/public/enquiries/",
            {"name": "Nino", "phone": "+995 555 11 22 33", "service": self.service.slug, "message": "Price please"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        enquiry = Enquiry.objects.get()
        self.assertEqual(enquiry.source, Source.WEBSITE)
        self.assertEqual(enquiry.service, self.service)

    def test_enquiry_requires_contact_details(self):
        response = self.client.post("/api/public/enquiries/", {"name": "Nino", "message": "Hi"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_honeypot_submissions_are_silently_dropped(self):
        response = self.client.post(
            "/api/public/enquiries/",
            {"name": "Bot", "phone": "1", "website": "http://spam.example"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(Enquiry.objects.exists())
