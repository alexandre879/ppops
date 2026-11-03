from modeltranslation.translator import TranslationOptions, register

from .models import Material, MaterialCategory, Product


@register(MaterialCategory)
class MaterialCategoryTranslation(TranslationOptions):
    fields = ("name", "description")


@register(Material)
class MaterialTranslation(TranslationOptions):
    # Material names appear on client quotations, so they are translatable.
    fields = ("name",)


@register(Product)
class ProductTranslation(TranslationOptions):
    fields = ("name", "description", "standard")
