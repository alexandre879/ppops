import datetime
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.core.models import SiteSettings
from apps.crm.models import Customer, Enquiry
from apps.inventory.models import Material, Product, StockMovement
from apps.projects.models import Project
from apps.quotes.models import Quotation
from apps.staff.models import Employee


def run(*args):
    out = StringIO()
    call_command("remove_demo_data", *args, stdout=out)
    return out.getvalue()


class RemoveDemoDataTests(TestCase):
    def setUp(self):
        call_command("seed", stdout=StringIO())
        self.materials = dict(Material.objects.values_list("pk", "quantity"))
        self.products = dict(Product.objects.values_list("pk", "quantity"))
        call_command("seed", "--demo", stdout=StringIO())

    def test_preview_changes_nothing(self):
        projects, materials = Project.objects.count(), dict(Material.objects.values_list("pk", "quantity"))
        self.assertIn("Preview only", run())
        self.assertGreater(projects, 0)
        self.assertEqual(Project.objects.count(), projects)
        self.assertEqual(dict(Material.objects.values_list("pk", "quantity")), materials)

    def test_apply_removes_the_demo_and_keeps_the_website(self):
        content = [SiteSettings.objects.count(), ServiceCategory.objects.count(), Service.objects.count(), Solution.objects.count()]
        run("--apply")
        for model in (Project, Quotation, Customer, Enquiry, StockMovement, Employee):
            self.assertFalse(model.objects.exists(), model.__name__)
        self.assertEqual(list(get_user_model().objects.values_list("email", flat=True)), ["admin@newhousemodern.ge"])
        self.assertEqual(content, [SiteSettings.objects.count(), ServiceCategory.objects.count(), Service.objects.count(), Solution.objects.count()])

    def test_stock_goes_back_to_what_it_was_before_the_demo(self):
        self.assertNotEqual(dict(Material.objects.values_list("pk", "quantity")), self.materials)
        run("--apply")
        self.assertEqual(dict(Material.objects.values_list("pk", "quantity")), self.materials)
        self.assertEqual(dict(Product.objects.values_list("pk", "quantity")), self.products)

    def test_records_added_later_are_kept(self):
        real = Customer.objects.create(name="Real customer", phone="+995 555 12 34 56")
        Customer.objects.filter(pk=real.pk).update(created_at=timezone.now() + datetime.timedelta(days=1))
        output = run("--apply")
        self.assertEqual(list(Customer.objects.all()), [real])
        self.assertIn("Keeping 1", output)

    def test_does_nothing_without_demo_logins(self):
        get_user_model().objects.exclude(email="admin@newhousemodern.ge").delete()
        self.assertIn("No demo data found", run("--apply"))
        self.assertTrue(Project.objects.exists())
