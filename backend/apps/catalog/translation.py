from modeltranslation.translator import TranslationOptions, register

from .models import Service, ServiceCategory, Solution


@register(ServiceCategory)
class ServiceCategoryTranslation(TranslationOptions):
    fields = ("name", "description")


@register(Solution)
class SolutionTranslation(TranslationOptions):
    fields = ("name", "description")


@register(Service)
class ServiceTranslation(TranslationOptions):
    fields = ("title", "summary", "description", "features")
