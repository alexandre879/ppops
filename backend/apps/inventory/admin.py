from django.contrib import admin

from .models import Equipment, Material, MaterialCategory, Product, ProductionOrder, StockMovement

admin.site.register(MaterialCategory)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "unit", "unit_cost", "quantity", "min_quantity")
    list_filter = ("category", "is_active")
    search_fields = ("sku", "name")
    readonly_fields = ("quantity",)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("created_at", "material", "movement_type", "quantity", "balance_after", "created_by")
    list_filter = ("movement_type",)

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "quantity", "is_published")
    list_filter = ("category", "is_published")


@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = ("number", "product", "quantity", "status", "due_date", "stock_posted")
    list_filter = ("status",)


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "kind", "status", "next_service_date")
    list_filter = ("kind", "status")
