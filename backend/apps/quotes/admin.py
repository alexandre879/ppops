from django.contrib import admin

from .models import PricingSettings, Quotation, QuotationItem


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ("number", "title", "customer", "status", "issue_date", "total")
    list_filter = ("status",)
    search_fields = ("number", "title", "customer__name")
    readonly_fields = ("subtotal", "net_total", "vat_amount", "total", "cost_total")
    inlines = [QuotationItemInline]

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        form.instance.recalculate()


@admin.register(PricingSettings)
class PricingSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not PricingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
