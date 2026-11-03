from modeltranslation.translator import TranslationOptions, register

from .models import SiteSettings

SITE_TRANSLATED_FIELDS = ("tagline", "hero_title", "hero_subtitle", "about_text", "mission", "promise", "address", "working_hours")


@register(SiteSettings)
class SiteSettingsTranslation(TranslationOptions):
    fields = SITE_TRANSLATED_FIELDS
    # These fields have English defaults; only an empty value means "not translated"
    # (by default modeltranslation would treat the default text itself as missing).
    fallback_undefined = ""
