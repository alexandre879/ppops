from django.contrib import admin

from .models import Communication, Contract, Customer, Enquiry


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "phone", "email", "status", "source")
    list_filter = ("kind", "status", "source")
    search_fields = ("name", "contact_person", "email", "phone")


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "phone", "service", "status", "source")
    list_filter = ("status", "source")
    search_fields = ("name", "email", "phone", "message")


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ("occurred_at", "customer", "channel", "subject", "user")
    list_filter = ("channel",)


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ("number", "title", "customer", "value", "status", "signed_date")
    list_filter = ("status",)
    search_fields = ("number", "title", "customer__name")
