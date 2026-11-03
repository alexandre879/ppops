from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator
from django.db import models
from django.db.models import DecimalField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.core.files import private_storage, validate_document_extension, validate_file_size
from apps.core.models import TimeStampedModel
from apps.core.utils import next_sequence_number, slug_source, unique_slug

MONEY = DecimalField(max_digits=14, decimal_places=2)


def _sum_subquery(model, field="amount"):
    rows = model.objects.filter(project=OuterRef("pk")).values("project").annotate(total=Sum(field))
    return Coalesce(Subquery(rows.values("total"), output_field=MONEY), Value(Decimal("0")), output_field=MONEY)


class ProjectQuerySet(models.QuerySet):
    def with_totals(self):
        return self.annotate(
            total_expenses=_sum_subquery(ProjectExpense),
            total_payments=_sum_subquery(ProjectPayment),
        )

    def active(self):
        return self.filter(status__in=Project.ACTIVE_STATUSES)

    def overdue(self):
        return self.active().filter(deadline__lt=timezone.localdate())


class Project(TimeStampedModel):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        IN_PROGRESS = "in_progress", "In progress"
        ON_HOLD = "on_hold", "On hold"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class BuildingType(models.TextChoices):
        HOUSE = "house", "Private house"
        RESIDENTIAL = "residential", "Residential building"
        COMMERCIAL = "commercial", "Commercial"
        INDUSTRIAL = "industrial", "Industrial"
        PUBLIC = "public", "Public building"
        OTHER = "other", "Other"

    ACTIVE_STATUSES = (Status.PLANNED, Status.IN_PROGRESS, Status.ON_HOLD)

    code = models.CharField(max_length=30, unique=True, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    customer = models.ForeignKey(
        "crm.Customer", null=True, blank=True, on_delete=models.SET_NULL, related_name="projects"
    )
    services = models.ManyToManyField("catalog.Service", blank=True, related_name="projects")
    description = models.TextField(blank=True, help_text="Internal description")
    public_summary = models.TextField(blank=True, help_text="Shown on the website portfolio")
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)
    building_type = models.CharField(max_length=20, choices=BuildingType.choices, default=BuildingType.RESIDENTIAL)
    floors = models.PositiveSmallIntegerField(null=True, blank=True)
    area_m2 = models.DecimalField("area (m²)", max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    progress = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(100)])
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="managed_projects"
    )
    teams = models.ManyToManyField("staff.Team", blank=True, related_name="projects")
    employees = models.ManyToManyField("staff.Employee", blank=True, related_name="projects")
    cover_image = models.ImageField(upload_to="projects/covers/", null=True, blank=True, validators=[validate_file_size])
    show_in_portfolio = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    objects = ProjectQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = next_sequence_number(Project, "code", "PRJ", width=3)
        if not self.slug:
            self.slug = unique_slug(self, slug_source(self, "title"))
        if self.status == self.Status.COMPLETED:
            self.progress = 100
            self.completed_date = self.completed_date or timezone.localdate()
        super().save(*args, **kwargs)

    @property
    def is_overdue(self) -> bool:
        return bool(
            self.deadline
            and self.status in self.ACTIVE_STATUSES
            and self.deadline < timezone.localdate()
        )


class ProjectPhoto(models.Model):
    class Stage(models.TextChoices):
        BEFORE = "before", "Before"
        PROGRESS = "progress", "In progress"
        AFTER = "after", "Completed"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="projects/photos/", validators=[validate_file_size])
    caption = models.CharField(max_length=200, blank=True)
    stage = models.CharField(max_length=10, choices=Stage.choices, default=Stage.PROGRESS)
    is_public = models.BooleanField(default=False, help_text="Show in the website portfolio")
    order = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.caption or f"Photo {self.pk}"


class ProjectDocument(models.Model):
    class Kind(models.TextChoices):
        CONTRACT = "contract", "Contract"
        DRAWING = "drawing", "Drawing / design"
        PERMIT = "permit", "Permit"
        ESTIMATE = "estimate", "Estimate"
        INVOICE = "invoice", "Invoice"
        REPORT = "report", "Report / act"
        OTHER = "other", "Other"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=200)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    file = models.FileField(
        upload_to="projects/documents/",
        storage=private_storage,
        validators=[validate_document_extension, validate_file_size],
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectExpense(models.Model):
    class Category(models.TextChoices):
        MATERIALS = "materials", "Materials"
        LABOUR = "labour", "Labour"
        EQUIPMENT = "equipment", "Equipment & rental"
        TRANSPORT = "transport", "Transport"
        SUBCONTRACTOR = "subcontractor", "Subcontractor"
        PERMITS = "permits", "Permits & fees"
        OTHER = "other", "Other"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="expenses")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.MATERIALS)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.localdate)
    supplier = models.CharField(max_length=200, blank=True)
    receipt = models.FileField(
        upload_to="projects/receipts/",
        storage=private_storage,
        null=True,
        blank=True,
        validators=[validate_document_extension, validate_file_size],
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.description}: {self.amount}"


class ProjectPayment(models.Model):
    """Money received from the client for a project."""

    class Method(models.TextChoices):
        BANK = "bank_transfer", "Bank transfer"
        CASH = "cash", "Cash"
        CARD = "card", "Card"
        OTHER = "other", "Other"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.BANK)
    reference = models.CharField(max_length=120, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.project.code}: {self.amount} on {self.date}"


class ProjectMilestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=200)
    due_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "due_date", "id"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_completed and not self.completed_at:
            self.completed_at = timezone.now()
        elif not self.is_completed:
            self.completed_at = None
        super().save(*args, **kwargs)

    @property
    def is_overdue(self) -> bool:
        return bool(self.due_date and not self.is_completed and self.due_date < timezone.localdate())
