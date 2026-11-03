from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from .roles import MODULE_PERMISSIONS, Role


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Platform account. Signs in with email; access is governed by ``role``."""

    username = None
    email = models.EmailField("email address", unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STAFF)
    phone = models.CharField(max_length=40, blank=True)
    language = models.CharField(max_length=5, choices=settings.LANGUAGES, default="ka", help_text="Admin interface language")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ["first_name", "last_name", "email"]

    def __str__(self):
        return self.get_full_name() or self.email

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def can(self, module: str, action: str = "read") -> bool:
        if not self.is_active:
            return False
        if self.is_superuser:
            return True
        return self.role in MODULE_PERMISSIONS.get(module, {}).get(action, ())

    def permission_map(self) -> dict[str, dict[str, bool]]:
        return {
            module: {"read": self.can(module, "read"), "write": self.can(module, "write")}
            for module in MODULE_PERMISSIONS
        }
