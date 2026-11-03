from django.conf import settings
from django.db import models

from apps.core.files import validate_file_size
from apps.core.models import TimeStampedModel


class Employee(TimeStampedModel):
    """A worker or office employee. Not every employee has a platform login."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ON_LEAVE = "on_leave", "On leave"
        INACTIVE = "inactive", "Inactive"

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    position = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    hire_date = models.DateField(null=True, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="employee"
    )
    photo = models.ImageField(upload_to="employees/", null=True, blank=True, validators=[validate_file_size])
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Team(TimeStampedModel):
    class Specialization(models.TextChoices):
        FACADE = "facade", "Façade & plastering"
        CLADDING = "cladding", "Cladding"
        FINISHING = "finishing", "Decorative finishing"
        RENOVATION = "renovation", "Renovation"
        FURNITURE = "furniture", "Furniture workshop"
        METAL = "metal", "Metal & scaffolding"
        GENERAL = "general", "General construction"

    name = models.CharField(max_length=120, unique=True)
    specialization = models.CharField(
        max_length=20, choices=Specialization.choices, default=Specialization.GENERAL
    )
    leader = models.ForeignKey(
        Employee, null=True, blank=True, on_delete=models.SET_NULL, related_name="led_teams"
    )
    members = models.ManyToManyField(Employee, blank=True, related_name="teams")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
