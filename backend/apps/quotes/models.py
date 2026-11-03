from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import SingletonModel, TimeStampedModel
from apps.core.utils import next_sequence_number

from .calculations import compute_totals, money


class PricingSettings(SingletonModel):
    """Company-wide pricing defaults; editable by administrators."""

    currency = models.CharField(max_length=3, default="GEL")
    labour_rate_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=25)
    overhead_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    validity_days = models.PositiveSmallIntegerField(default=30)
    default_terms = models.TextField(
        default=(
            "Prices are valid for the period stated above. Works start after the advance payment "
            "agreed in the contract. Additional works not listed in this quotation are priced "
            "separately. Material quantities are estimated and settled against actual measurements."
        )
    )
    default_notes = models.TextField(blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account = models.CharField("bank account (IBAN)", max_length=60, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pricing settings"
        verbose_name_plural = "pricing settings"

    def __str__(self):
        return "Pricing settings"


class Quotation(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    OPEN_STATUSES = (Status.DRAFT, Status.SENT)

    number = models.CharField(max_length=30, unique=True, editable=False)
    title = models.CharField(max_length=200)
    customer = models.ForeignKey("crm.Customer", on_delete=models.PROTECT, related_name="quotations")
    enquiry = models.ForeignKey(
        "crm.Enquiry", null=True, blank=True, on_delete=models.SET_NULL, related_name="quotations"
    )
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="quotations"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    language = models.CharField(
        max_length=5, choices=settings.LANGUAGES, default="ka", help_text="Language of the client PDF"
    )
    issue_date = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(null=True, blank=True)
    site_address = models.CharField(max_length=255, blank=True)
    overhead_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    # Cached totals, refreshed by ``recalculate()`` whenever items change.
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)
    cost_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_sequence_number(Quotation, "number", "Q")
        super().save(*args, **kwargs)

    def totals(self):
        # Query fresh rows rather than self.items.all(): a prefetched cache may be stale.
        lines = QuotationItem.objects.filter(quotation=self).values_list("quantity", "unit_price", "unit_cost")
        return compute_totals(lines, self.discount_amount, self.vat_percent)

    def recalculate(self):
        totals = self.totals()
        self.subtotal = totals.subtotal
        self.net_total = totals.net_total
        self.vat_amount = totals.vat_amount
        self.total = totals.total
        self.cost_total = totals.cost_total
        self.save(update_fields=["subtotal", "net_total", "vat_amount", "total", "cost_total", "updated_at"])

    @property
    def profit(self):
        return self.net_total - self.cost_total

    @property
    def is_expired(self) -> bool:
        return bool(
            self.valid_until and self.status in self.OPEN_STATUSES and self.valid_until < timezone.localdate()
        )


class QuotationItem(models.Model):
    class Kind(models.TextChoices):
        MATERIAL = "material", "Material"
        LABOUR = "labour", "Labour"
        SERVICE = "service", "Service"
        EQUIPMENT = "equipment", "Equipment"
        OTHER = "other", "Other"

    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name="items")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.SERVICE)
    group = models.CharField(max_length=200, blank=True, help_text="Section heading in the quotation")
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=20, default="pcs")
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=1)
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, help_text="Internal cost; never shown to the client"
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, editable=False)
    material = models.ForeignKey(
        "inventory.Material", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    service = models.ForeignKey(
        "catalog.Service", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.description

    def save(self, *args, **kwargs):
        self.line_total = money(self.quantity * self.unit_price)
        super().save(*args, **kwargs)
