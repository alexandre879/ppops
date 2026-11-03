import os

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import SiteSettings
from .translation import SITE_TRANSLATED_FIELDS

LANGUAGE_CODES = [code for code, _name in settings.LANGUAGES]


def translated(*fields: str) -> list[str]:
    """``translated("title")`` → ``["title_ka", "title_en", "title_ru"]``."""
    return [f"{field}_{code}" for field in fields for code in LANGUAGE_CODES]


class TranslatedFieldsMixin:
    """For admin serializers of translated models.

    The plain field (``title``) is read-only and returns the request language;
    editors write ``title_ka`` / ``title_en`` / ``title_ru``. Fields listed in
    ``required_translations`` must be filled in at least one language.
    """

    required_translations: tuple[str, ...] = ()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        for field in self.required_translations:
            values = [
                attrs[name] if name in attrs else getattr(self.instance, name, None)
                for name in translated(field)
            ]
            if not any(values):
                raise serializers.ValidationError({f"{field}_{LANGUAGE_CODES[0]}": _("Fill this in at least one language.")})
        return attrs


class MediaURLMixin:
    """Serialize uploads as site-relative URLs (``/media/...``).

    Relative URLs resolve correctly whether the browser reaches Django through
    nginx, the Next.js dev proxy or directly, unlike absolute URLs built from
    whichever internal host made the request.
    """

    def to_representation(self, value):
        if not value:
            return None
        try:
            return value.url
        except ValueError:
            return None


class MediaFileField(MediaURLMixin, serializers.FileField):
    pass


class MediaImageField(MediaURLMixin, serializers.ImageField):
    pass


class BaseModelSerializer(serializers.ModelSerializer):
    serializer_field_mapping = {
        **serializers.ModelSerializer.serializer_field_mapping,
        models.FileField: MediaFileField,
        models.ImageField: MediaImageField,
    }


class PrivateFileSerializerMixin(serializers.Serializer):
    """For models with a private ``file`` field: upload-only ``file`` plus an
    authenticated ``download_url`` (``<basename>-download`` route)."""

    download_basename: str = ""

    file_name = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    def get_file_name(self, obj) -> str | None:
        return os.path.basename(obj.file.name) if obj.file else None

    def get_download_url(self, obj) -> str | None:
        if not obj.file:
            return None
        return reverse(f"{self.download_basename}-download", args=[obj.pk])


class SiteSettingsSerializer(BaseModelSerializer):
    class Meta:
        model = SiteSettings
        exclude = ["id"]
        read_only_fields = ["updated_at", *SITE_TRANSLATED_FIELDS]
