from django.contrib import admin

from .models import Service, ServiceCategory, ServiceImage, ServiceMaterial, Solution


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 0


class ServiceMaterialInline(admin.TabularInline):
    model = ServiceMaterial
    extra = 0
    autocomplete_fields = ("material",)


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "is_published")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price_from", "unit", "is_published", "is_featured")
    list_filter = ("category", "is_published", "is_featured")
    search_fields = ("title",)
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("solutions",)
    inlines = [ServiceMaterialInline, ServiceImageInline]


@admin.register(Solution)
class SolutionAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "is_published")
    list_filter = ("kind", "is_published")
    prepopulated_fields = {"slug": ("name",)}
