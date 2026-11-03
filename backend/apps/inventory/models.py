from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.core.files import validate_file_size
from apps.core.models import TimeStampedModel
from apps.core.utils import next_sequence_number, slug_source, unique_slug


class Unit(models.TextChoices):
    KG = "kg", "kg"
    BAG = "bag", "bag"
    M2 = "m2", "m²"
    M = "m", "m"
    M3 = "m3", "m³"
    LITRE = "l", "litre"
    PIECE = "pcs", "pcs"
    SHEET = "sheet", "sheet"
    SET = "set", "set"
    ROLL = "roll", "roll"
    TONNE = "t", "tonne"


class MaterialCategory(TimeStampedModel):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "material categories"

    def __str__(self):
        return self.name


class Material(TimeStampedModel):
    """A construction material kept in stock and used in cost estimates."""

    sku = models.CharField("SKU", max_length=40, unique=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        MaterialCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="materials"
    )
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PIECE)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    min_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    supplier = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def is_low_stock(self) -> bool:
        return self.min_quantity > 0 and self.quantity <= self.min_quantity

    @property
    def stock_value(self):
        return round(self.quantity * self.unit_cost, 2)


class StockMovement(models.Model):
    """Immutable stock ledger entry. Create via ``services.record_movement``."""

    class Type(models.TextChoices):
        IN = "in", "Stock in"
        OUT = "out", "Stock out"
        ADJUST = "adjust", "Stock count"

    material = models.ForeignKey(Material, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=10, choices=Type.choices)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    balance_after = models.DecimalField(max_digits=14, decimal_places=3, editable=False)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_movements"
    )
    reference = models.CharField(max_length=120, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.get_movement_type_display()} {self.quantity} × {self.material}"


class Product(TimeStampedModel):
    """Equipment produced in the company's own manufacturing facility."""

    class Category(models.TextChoices):
        SCAFFOLDING = "scaffolding", "Façade scaffolding"
        FORMWORK = "formwork", "Metal formwork"
        RAILING = "railing", "Safety railings"
        STAIRCASE = "staircase", "Metal staircases"
        FURNITURE = "furniture", "Furniture"
        OTHER = "other", "Other"

    sku = models.CharField("SKU", max_length=40, unique=True)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True)
    standard = models.CharField(max_length=120, blank=True, help_text="Applicable standard, e.g. EN 12810")
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PIECE)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rental_price_per_day = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    min_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    image = models.ImageField(upload_to="products/", null=True, blank=True, validators=[validate_file_size])
    is_published = models.BooleanField(default=False, help_text="Show on the public manufacturing page")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["category", "order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, slug_source(self, "name"))
        super().save(*args, **kwargs)

    @property
    def is_low_stock(self) -> bool:
        return self.min_quantity > 0 and self.quantity <= self.min_quantity


class ProductionOrder(TimeStampedModel):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In production"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    number = models.CharField(max_length=30, unique=True, editable=False)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="production_orders")
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    responsible = models.ForeignKey(
        "staff.Employee", null=True, blank=True, on_delete=models.SET_NULL, related_name="production_orders"
    )
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="production_orders"
    )
    material_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labour_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    stock_posted = models.BooleanField(default=False, editable=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.product}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_sequence_number(ProductionOrder, "number", "PO", width=3)
        super().save(*args, **kwargs)

    def post_stock_if_completed(self):
        """Add the produced quantity to product stock exactly once."""
        if self.status != self.Status.COMPLETED:
            return
        with transaction.atomic():
            order = ProductionOrder.objects.select_for_update().get(pk=self.pk)
            if order.stock_posted:
                return
            product = Product.objects.select_for_update().get(pk=order.product_id)
            product.quantity += order.quantity
            product.save(update_fields=["quantity", "updated_at"])
            order.stock_posted = True
            order.completed_at = order.completed_at or timezone.now()
            order.save(update_fields=["stock_posted", "completed_at", "updated_at"])
        self.refresh_from_db()


class Equipment(TimeStampedModel):
    class Kind(models.TextChoices):
        MACHINE = "machine", "Machine"
        TOOL = "tool", "Power tool"
        VEHICLE = "vehicle", "Vehicle"
        SCAFFOLD_SET = "scaffold_set", "Scaffolding set"
        FORMWORK_SET = "formwork_set", "Formwork set"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        IN_USE = "in_use", "In use"
        MAINTENANCE = "maintenance", "In maintenance"
        RETIRED = "retired", "Retired"

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=40, blank=True, help_text="Internal inventory code")
    serial_number = models.CharField(max_length=80, blank=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.TOOL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="equipment"
    )
    location = models.CharField(max_length=120, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_service_date = models.DateField(null=True, blank=True)
    next_service_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "equipment"

    def __str__(self):
        return self.name

    @property
    def service_due(self) -> bool:
        if not self.next_service_date or self.status == self.Status.RETIRED:
            return False
        return (self.next_service_date - timezone.localdate()).days <= 14
