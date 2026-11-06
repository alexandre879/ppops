from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SingletonModel(models.Model):
    """A settings table that always holds exactly one row (pk=1)."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return 0, {}

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class SiteSettings(SingletonModel):
    """Company details and editable homepage copy for the public website."""

    company_name = models.CharField(max_length=120, default="New House Modern")
    tagline = models.CharField(
        max_length=200,
        default="Façades, cladding, decorative finishes and in-house manufacturing",
    )
    hero_title = models.CharField(
        max_length=200,
        default="Modern façades and construction solutions, built to last",
    )
    hero_subtitle = models.TextField(
        default=(
            "Façade plastering, modern cladding, energy-efficient insulation, decorative finishes, "
            "custom furniture and our own European-standard scaffolding and formwork — delivered by "
            "qualified teams, at fair prices and within agreed deadlines."
        )
    )
    hero_image = models.ImageField(upload_to="site/", blank=True, null=True)
    about_text = models.TextField(
        default=(
            "New House Modern is a construction and renovation company specialising in façade "
            "plastering, modern exterior and interior cladding, energy-efficient insulation systems, "
            "painting, furniture manufacturing and metal construction systems. We deliver professional "
            "construction and renovation services using modern technologies, high-quality materials "
            "and qualified teams, and undertake projects of varying complexity — including buildings "
            "of different heights and architectural designs."
        )
    )
    mission = models.TextField(
        default=(
            "To provide high-quality workmanship, modern architectural solutions, competitive pricing "
            "and reliable project delivery within agreed deadlines."
        )
    )
    promise = models.TextField(
        default=(
            "Save time and receive high-quality construction services at reasonable prices and within "
            "agreed deadlines."
        )
    )
    phone_primary = models.CharField(max_length=40, default="+995 557 60 30 04")
    phone_secondary = models.CharField(max_length=40, blank=True, default="+995 568 28 27 72")
    phone_tertiary = models.CharField(max_length=40, blank=True, default="")
    phone_quaternary = models.CharField(max_length=40, blank=True, default="")
    phone_quinary = models.CharField(max_length=40, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.CharField(max_length=255, blank=True, default="")
    working_hours = models.CharField(max_length=120, blank=True, default="")
    facebook_url = models.URLField(blank=True, default="")
    instagram_url = models.URLField(blank=True, default="")
    map_embed_url = models.URLField(blank=True, default="", max_length=1000)
    # Headline numbers are only shown on the website once they are filled in.
    years_experience = models.PositiveIntegerField(default=0)
    projects_completed = models.PositiveIntegerField(default=0)
    specialists = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site settings"
        verbose_name_plural = "site settings"

    def __str__(self):
        return self.company_name

    @property
    def phones(self) -> list[str]:
        """The filled-in phone numbers, main one first."""
        numbers = (
            self.phone_primary,
            self.phone_secondary,
            self.phone_tertiary,
            self.phone_quaternary,
            self.phone_quinary,
        )
        return [p for p in numbers if p]
