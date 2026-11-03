from django.db import models

from apps.core.files import validate_file_size
from apps.core.models import TimeStampedModel
from apps.core.utils import slug_source, unique_slug


class ServiceCategory(TimeStampedModel):
    class Icon(models.TextChoices):
        BUILDING = "building", "Building"
        LAYERS = "layers", "Layers"
        BRUSH = "brush", "Brush"
        HAMMER = "hammer", "Hammer"
        SOFA = "sofa", "Sofa"
        FACTORY = "factory", "Factory"
        SHIELD = "shield", "Shield"

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=20, choices=Icon.choices, default=Icon.BUILDING)
    image = models.ImageField(
        upload_to="services/categories/",
        null=True,
        blank=True,
        validators=[validate_file_size],
        help_text="Shown at the top of the category card on the website home page",
    )
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "service categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, slug_source(self, "name"))
        super().save(*args, **kwargs)


class Solution(TimeStampedModel):
    """A material, system or finish the company offers (e.g. ACP panels, Venetian plaster)."""

    class Kind(models.TextChoices):
        CLADDING = "cladding", "Cladding panels"
        INSULATION = "insulation", "Insulation"
        PLASTER = "plaster", "Plaster & render"
        DECORATIVE = "decorative", "Decorative finish"
        STONE = "stone", "Stone"
        METAL = "metal", "Metal systems"
        OTHER = "other", "Other"

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="solutions/", null=True, blank=True, validators=[validate_file_size])
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["kind", "order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, slug_source(self, "name"))
        super().save(*args, **kwargs)


class Service(TimeStampedModel):
    class Unit(models.TextChoices):
        M2 = "m2", "m²"
        M = "m", "linear m"
        PIECE = "pcs", "piece"
        HOUR = "h", "hour"
        DAY = "day", "day"
        PROJECT = "project", "project"

    category = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name="services")
    title = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    summary = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    features = models.JSONField(default=list, blank=True)
    image = models.ImageField(upload_to="services/", null=True, blank=True, validators=[validate_file_size])
    price_from = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, help_text="Public starting price per unit"
    )
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.M2)
    labour_hours_per_unit = models.DecimalField(
        max_digits=8, decimal_places=3, default=0, help_text="Used by the cost estimator"
    )
    solutions = models.ManyToManyField(Solution, blank=True, related_name="services")
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["category__order", "order", "title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, slug_source(self, "title"))
        super().save(*args, **kwargs)


class ServiceImage(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="services/gallery/", validators=[validate_file_size])
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.caption or f"Image {self.pk}"


class ServiceMaterial(models.Model):
    """Estimator recipe: how much of a material one unit of a service consumes."""

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="recipe")
    material = models.ForeignKey("inventory.Material", on_delete=models.CASCADE, related_name="service_usages")
    consumption_per_unit = models.DecimalField(max_digits=10, decimal_places=4)
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["service", "material"], name="unique_service_material"),
        ]

    def __str__(self):
        return f"{self.service}: {self.consumption_per_unit} {self.material.unit} {self.material.name}"
