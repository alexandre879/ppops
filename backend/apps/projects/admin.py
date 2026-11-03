from django.contrib import admin

from .models import Project, ProjectDocument, ProjectExpense, ProjectMilestone, ProjectPayment, ProjectPhoto


class PhotoInline(admin.TabularInline):
    model = ProjectPhoto
    extra = 0


class DocumentInline(admin.TabularInline):
    model = ProjectDocument
    extra = 0


class ExpenseInline(admin.TabularInline):
    model = ProjectExpense
    extra = 0


class PaymentInline(admin.TabularInline):
    model = ProjectPayment
    extra = 0


class MilestoneInline(admin.TabularInline):
    model = ProjectMilestone
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "customer", "status", "progress", "deadline", "budget")
    list_filter = ("status", "priority", "show_in_portfolio")
    search_fields = ("code", "title", "customer__name", "city")
    filter_horizontal = ("services", "teams", "employees")
    inlines = [MilestoneInline, PhotoInline, DocumentInline, ExpenseInline, PaymentInline]
