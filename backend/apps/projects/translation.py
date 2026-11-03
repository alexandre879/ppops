from modeltranslation.translator import TranslationOptions, register

from .models import Project


@register(Project)
class ProjectTranslation(TranslationOptions):
    # Shown in the public portfolio.
    fields = ("title", "public_summary", "city")
