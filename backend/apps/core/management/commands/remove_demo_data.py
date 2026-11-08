"""Remove the sample business data that ``seed --demo`` creates, keeping the website content.

    python manage.py remove_demo_data            # preview: shows what would go, changes nothing
    python manage.py remove_demo_data --apply    # delete

Removes the demo customers, enquiries, communications, contracts, projects (with their photos,
expenses, payments and milestones), quotations, production orders, stock movements, equipment,
employees, teams and the three demo staff logins. Keeps site settings, the service catalogue,
solutions, products, materials, recipes, pricing and every other account.

Demo rows are recognised by when they were made: ``seed --demo`` creates the demo staff logins
first and everything else within seconds, so rows created within ten minutes of those logins
count as demo. Anything created later is kept and reported. Stock that the demo movements and
completed demo production orders changed is put back first, so quantities stay true.
"""

import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.crm.models import Communication, Contract, Customer, Enquiry
from apps.inventory.models import Equipment, Material, Product, ProductionOrder, StockMovement
from apps.projects.models import Project
from apps.quotes.models import Quotation
from apps.staff.models import Employee, Team

# In an order where nothing is deleted while a demo row still points at it.
DEMO_MODELS = [
    Project, Quotation, Contract, Communication, Enquiry, Customer,
    ProductionOrder, StockMovement, Equipment, Employee, Team,
]
DEMO_LOGINS = [f"{role}@newhousemodern.ge" for role in ("manager", "sales", "production")]
WINDOW = datetime.timedelta(minutes=10)
# seed --demo sets these products' stock directly, with no ledger entry; products start at 0.
DEMO_PRODUCT_STOCK = {"RLG-001": (Decimal("120"), Decimal("50")), "STR-001": (Decimal("3"), Decimal("2"))}


class Command(BaseCommand):
    help = "Remove the sample data created by seed --demo. Shows a preview unless --apply is given."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Delete for real instead of previewing.")

    def handle(self, *args, apply=False, **options):
        logins = get_user_model().objects.filter(email__in=DEMO_LOGINS)
        first = logins.order_by("date_joined").first()
        if first is None:
            self.stdout.write("No demo data found: the demo staff logins are not here, so nothing was changed.")
            return
        start, end = first.date_joined - WINDOW, first.date_joined + WINDOW
        self.stdout.write(f"Demo data was created at {first.date_joined:%Y-%m-%d %H:%M} UTC.")

        with transaction.atomic():
            demo = {model: model.objects.filter(created_at__range=(start, end)) for model in DEMO_MODELS}
            for model, rows in demo.items():
                later = model.objects.count() - rows.count()
                if later:
                    self.stdout.write(self.style.WARNING(
                        f"Keeping {later} {model._meta.verbose_name_plural} added after the demo data."
                    ))

            self.restore_stock(demo[StockMovement], demo[ProductionOrder])

            deleted = {}
            for rows in [*demo.values(), logins]:
                for label, count in rows.delete()[1].items():
                    deleted[label] = deleted.get(label, 0) + count
            self.stdout.write("Removed:" if apply else "Would remove:")
            for label, count in sorted(deleted.items()):
                if count:
                    self.stdout.write(f"  {label:<32} {count}")

            if apply:
                self.stdout.write(self.style.SUCCESS("Demo data removed."))
            else:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING("Preview only: nothing was changed. Add --apply to delete."))

    def restore_stock(self, movements, orders):
        """Undo what the demo did to stock levels before its records go."""
        stuck = set()
        for movement in movements.order_by("-created_at", "-id"):
            material = Material.objects.get(pk=movement.material_id)
            if material.pk in stuck:
                continue
            # Only undo a movement that is still the latest word on this material's stock.
            if movement.movement_type == StockMovement.Type.ADJUST or material.quantity != movement.balance_after:
                stuck.add(material.pk)
                self.stdout.write(self.style.WARNING(f"  {material}: stock left at {material.quantity} (changed since)"))
                continue
            sign = -1 if movement.movement_type == StockMovement.Type.IN else 1
            before = movement.balance_after + sign * movement.quantity
            self.stdout.write(f"  {material}: stock {material.quantity} -> {before}")
            material.quantity = before
            material.save(update_fields=["quantity", "updated_at"])

        for order in orders.filter(stock_posted=True):
            product = Product.objects.get(pk=order.product_id)
            before = max(product.quantity - order.quantity, 0)
            self.stdout.write(f"  {product}: stock {product.quantity} -> {before}")
            product.quantity = before
            product.save(update_fields=["quantity", "updated_at"])

        for sku, (quantity, minimum) in DEMO_PRODUCT_STOCK.items():
            product = Product.objects.filter(sku=sku).first()
            if product is None:
                continue
            if (product.quantity, product.min_quantity) != (quantity, minimum):
                self.stdout.write(self.style.WARNING(f"  {product}: stock left at {product.quantity} (changed since)"))
                continue
            self.stdout.write(f"  {product}: stock {product.quantity} -> 0")
            product.quantity = product.min_quantity = Decimal(0)
            product.save(update_fields=["quantity", "min_quantity", "updated_at"])
