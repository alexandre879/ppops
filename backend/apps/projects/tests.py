import tempfile

from django.core.files.base import ContentFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.roles import Role
from apps.projects.models import Project, ProjectDocument


class ProjectDocumentAccessTests(APITestCase):
    """Commercial documents follow their own module's roles, not the open "projects" module."""

    def setUp(self):
        self.media = override_settings(PRIVATE_MEDIA_ROOT=tempfile.mkdtemp())
        self.media.enable()
        self.addCleanup(self.media.disable)
        project = Project.objects.create(title="House")
        self.docs = {}
        for kind in ("contract", "estimate", "invoice", "drawing"):
            doc = ProjectDocument(project=project, title=kind, kind=kind)
            doc.file.save(f"{kind}.pdf", ContentFile(b"%PDF-1.4"), save=True)
            self.docs[kind] = doc

    def visible(self, role):
        self.client.force_authenticate(User.objects.create_user(email=f"{role}@example.com", password="x", role=role))
        listed = {d["kind"] for d in self.client.get("/api/project-documents/").data}
        downloadable = {
            kind for kind, doc in self.docs.items()
            if self.client.get(f"/api/project-documents/{doc.pk}/download/").status_code == 200
        }
        self.assertEqual(listed, downloadable)
        return listed

    def test_site_staff_only_see_non_commercial_documents(self):
        self.assertEqual(self.visible(Role.STAFF), {"drawing"})
        self.assertEqual(self.visible(Role.PRODUCTION), {"drawing"})

    def test_sales_see_contracts_and_estimates_but_not_invoices(self):
        self.assertEqual(self.visible(Role.SALES), {"contract", "estimate", "drawing"})

    def test_managers_see_everything(self):
        self.assertEqual(self.visible(Role.MANAGER), {"contract", "estimate", "invoice", "drawing"})
