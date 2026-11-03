from modeltranslation.translator import TranslationOptions, register

from .models import PricingSettings


@register(PricingSettings)
class PricingSettingsTranslation(TranslationOptions):
    # Quotations copy these in the quotation's own language.
    fields = ("default_terms", "default_notes")
    fallback_undefined = ""  # see SiteSettingsTranslation
