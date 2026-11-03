from django.contrib import admin

from .models import Employee, Team


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("full_name", "position", "phone", "status", "daily_rate")
    list_filter = ("status",)
    search_fields = ("first_name", "last_name", "position", "phone")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "specialization", "leader", "is_active")
    list_filter = ("specialization", "is_active")
    filter_horizontal = ("members",)
