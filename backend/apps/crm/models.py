from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.files import private_storage, validate_document_extension, validate_file_size
from apps.core.models import TimeStampedModel
from apps.core.utils import next_sequence_number


class Source(models.TextChoices):
    WEBSITE = "website", "Website"
    PHONE = "phone", "Phone call"
    REFERRAL = "referral", "Referral"
    SOCIAL = "social", "Social media"
    WALK_IN = "walk_in", "Office visit"
    REPEAT = "repeat", "Returning client"
    OTHER = "other", "Other"


class Customer(TimeStampedModel):
    class Kind(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        COMPANY = "company", "Company"

    class Status(models.TextChoices):
        LEAD = "lead", "Potential client"
        ACTIVE = "active", "Active client"
        INACTIVE = "inactive", "Inactive"

    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.INDIVIDUAL)
    name = models.CharField(max_length=200, help_text="Person or company name")
    contact_person = models.CharField(max_length=160, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    secondary_phone = models.CharField(max_length=40, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)
    tax_id = models.CharField("tax ID", max_length=40, blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.OTHER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LEAD)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="customers"
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Enquiry(TimeStampedModel):
    """A request for work — from the website form or logged by staff."""

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        QUOTED = "quoted", "Quoted"
        WON = "won", "Won"
        LOST = "lost", "Lost"

    name = models.CharField(max_length=160)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    company = models.CharField(max_length=160, blank=True)
    service = models.ForeignKey(
        "catalog.Service", null=True, blank=True, on_delete=models.SET_NULL, related_name="enquiries"
    )
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True, help_text="Project address or city")
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.WEBSITE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    customer = models.ForeignKey(
        Customer, null=True, blank=True, on_delete=models.SET_NULL, related_name="enquiries"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="enquiries"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, editable=False)
    # When the visitor accepted the privacy policy on the website form (proof of consent).
    privacy_consent_at = models.DateTimeField(null=True, blank=True, editable=False)
    internal_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "enquiries"

    def __str__(self):
        return f"{self.name} — {self.subject or self.service or 'enquiry'}"

    def convert_to_customer(self, user=None) -> Customer:
        """Create (or reuse) the customer record for this enquiry."""
        if self.customer_id:
            return self.customer
        customer = Customer.objects.create(
            kind=Customer.Kind.COMPANY if self.company else Customer.Kind.INDIVIDUAL,
            name=self.company or self.name,
            contact_person=self.name if self.company else "",
            email=self.email,
            phone=self.phone,
            address=self.location,
            source=self.source,
            status=Customer.Status.LEAD,
            assigned_to=self.assigned_to,
            created_by=user,
        )
        self.customer = customer
        if self.status in (self.Status.NEW, self.Status.CONTACTED):
            self.status = self.Status.QUALIFIED
        self.save(update_fields=["customer", "status", "updated_at"])
        return customer


class Communication(models.Model):
    class Channel(models.TextChoices):
        CALL = "call", "Phone call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"
        SITE_VISIT = "site_visit", "Site visit"
        WHATSAPP = "whatsapp", "WhatsApp / Viber"
        SMS = "sms", "SMS"
        OTHER = "other", "Other"

    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="communications")
    enquiry = models.ForeignKey(
        Enquiry, null=True, blank=True, on_delete=models.SET_NULL, related_name="communications"
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.CALL)
    direction = models.CharField(max_length=10, choices=Direction.choices, default=Direction.OUTBOUND)
    subject = models.CharField(max_length=200, blank=True)
    summary = models.TextField()
    occurred_at = models.DateTimeField(default=timezone.now)
    follow_up_date = models.DateField(null=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="communications"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.get_channel_display()} with {self.customer} on {self.occurred_at:%Y-%m-%d}"


class Contract(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        TERMINATED = "terminated", "Terminated"

    number = models.CharField(max_length=30, unique=True, editable=False)
    title = models.CharField(max_length=200)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="contracts")
    project = models.ForeignKey(
        "projects.Project", null=True, blank=True, on_delete=models.SET_NULL, related_name="contracts"
    )
    quotation = models.ForeignKey(
        "quotes.Quotation", null=True, blank=True, on_delete=models.SET_NULL, related_name="contracts"
    )
    value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    signed_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    file = models.FileField(
        upload_to="contracts/",
        storage=private_storage,
        null=True,
        blank=True,
        validators=[validate_document_extension, validate_file_size],
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = next_sequence_number(Contract, "number", "CTR", width=3)
        super().save(*args, **kwargs)
