from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.crm.models import Communication, Customer, Enquiry
from apps.inventory.models import Equipment, Material, Product, ProductionOrder
from apps.projects.models import Project, ProjectExpense, ProjectMilestone, ProjectPayment
from apps.quotes.models import Quotation
from apps.staff.models import Employee, Team

ZERO = Decimal("0")


def _sum(queryset, field="amount"):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def _last_12_months(today: date) -> list[date]:
    index = today.year * 12 + today.month - 1
    return [date((index - i) // 12, (index - i) % 12 + 1, 1) for i in range(11, -1, -1)]


def _rate(part: int, whole: int):
    return round(part / whole * 100) if whole else None


class DashboardSummaryView(APIView):
    """One call that feeds the admin dashboard. Sections depend on the user's role."""

    permission_module = "dashboard"

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        today = timezone.localdate()
        user = request.user
        show_finance = user.can("finance", "read")
        data = {
            "generated_at": timezone.now(),
            "projects": self._projects(today, show_finance),
            "deadlines": self._deadlines(today),
        }
        if show_finance:
            data["finance"] = self._finance(today)
        if user.can("crm", "read"):
            data["customers"] = self._customers(today)
        if user.can("quotes", "read"):
            data["quotations"] = self._quotations(today)
        if user.can("staff", "read"):
            data["staff"] = self._staff()
        if user.can("inventory", "read"):
            data["inventory"] = self._inventory()
        return Response(data)

    def _projects(self, today, show_finance):
        projects = Project.objects.all()
        counts = dict(projects.values_list("status").annotate(n=Count("id")))
        active = projects.active()
        finished = projects.filter(
            status=Project.Status.COMPLETED, deadline__isnull=False, completed_date__isnull=False
        )
        on_time = finished.filter(completed_date__lte=F("deadline")).count()

        performance = []
        for p in active.with_totals().select_related("customer").order_by(F("deadline").asc(nulls_last=True))[:8]:
            row = {
                "id": p.id,
                "code": p.code,
                "title": p.title,
                "customer_name": p.customer.name if p.customer else None,
                "status": p.status,
                "status_display": p.get_status_display(),
                "progress": p.progress,
                "deadline": p.deadline,
                "is_overdue": p.is_overdue,
            }
            if show_finance:
                row.update(
                    budget=p.budget,
                    spent=p.total_expenses,
                    received=p.total_payments,
                    budget_used_percent=round(float(p.total_expenses) / float(p.budget) * 100, 1)
                    if p.budget
                    else None,
                )
            performance.append(row)

        return {
            "total": projects.count(),
            "active": active.count(),
            "overdue": projects.overdue().count(),
            "completed_this_year": projects.filter(
                status=Project.Status.COMPLETED, completed_date__year=today.year
            ).count(),
            "by_status": [
                {"status": value, "label": label, "count": counts.get(value, 0)}
                for value, label in Project.Status.choices
            ],
            "on_time_rate": _rate(on_time, finished.count()),
            "average_progress": round(active.aggregate(avg=Avg("progress"))["avg"] or 0),
            "performance": performance,
        }

    def _finance(self, today):
        months = _last_12_months(today)
        first = months[0]

        def monthly(model):
            rows = (
                model.objects.filter(date__gte=first)
                .annotate(month=TruncMonth("date"))
                .values("month")
                .annotate(total=Sum("amount"))
            )
            return {row["month"]: row["total"] for row in rows}

        revenue, expenses = monthly(ProjectPayment), monthly(ProjectExpense)
        this_month = months[-1]
        payments_year = ProjectPayment.objects.filter(date__year=today.year)
        expenses_year = ProjectExpense.objects.filter(date__year=today.year)
        active_budget = _sum(Project.objects.active(), "budget")
        active_received = _sum(ProjectPayment.objects.filter(project__status__in=Project.ACTIVE_STATUSES))
        expense_split = (
            expenses_year.values("category").annotate(total=Sum("amount")).order_by("-total")
        )
        categories = dict(ProjectExpense.Category.choices)
        return {
            "revenue_month": revenue.get(this_month, ZERO),
            "expenses_month": expenses.get(this_month, ZERO),
            "revenue_year": _sum(payments_year),
            "expenses_year": _sum(expenses_year),
            "revenue_total": _sum(ProjectPayment.objects.all()),
            "expenses_total": _sum(ProjectExpense.objects.all()),
            "active_budget": active_budget,
            "outstanding": max(active_budget - active_received, ZERO),
            "monthly": [
                {
                    "month": m.strftime("%Y-%m"),
                    "label": m.strftime("%b"),
                    "revenue": revenue.get(m, ZERO),
                    "expenses": expenses.get(m, ZERO),
                }
                for m in months
            ],
            "expenses_by_category": [
                {"category": row["category"], "label": categories.get(row["category"], row["category"]), "total": row["total"]}
                for row in expense_split
            ],
        }

    def _customers(self, today):
        month_start = today.replace(day=1)
        enquiries = Enquiry.objects.all()
        counts = dict(enquiries.values_list("status").annotate(n=Count("id")))
        won, lost = counts.get(Enquiry.Status.WON, 0), counts.get(Enquiry.Status.LOST, 0)
        recent = enquiries.select_related("service").order_by("-created_at")[:6]
        follow_ups = (
            Communication.objects.filter(follow_up_date__range=(today, today + timedelta(days=7)))
            .select_related("customer")
            .order_by("follow_up_date")[:6]
        )
        return {
            "total": Customer.objects.count(),
            "active": Customer.objects.filter(status=Customer.Status.ACTIVE).count(),
            "leads": Customer.objects.filter(status=Customer.Status.LEAD).count(),
            "new_this_month": Customer.objects.filter(created_at__date__gte=month_start).count(),
            "enquiries_new": counts.get(Enquiry.Status.NEW, 0),
            "enquiries_this_month": enquiries.filter(created_at__date__gte=month_start).count(),
            "enquiries_by_status": [
                {"status": value, "label": label, "count": counts.get(value, 0)}
                for value, label in Enquiry.Status.choices
            ],
            "conversion_rate": _rate(won, won + lost),
            "recent_enquiries": [
                {
                    "id": e.id,
                    "name": e.name,
                    "phone": e.phone,
                    "service": e.service.title if e.service else e.subject,
                    "status": e.status,
                    "status_display": e.get_status_display(),
                    "created_at": e.created_at,
                }
                for e in recent
            ],
            "follow_ups": [
                {
                    "id": c.id,
                    "customer": c.customer_id,
                    "customer_name": c.customer.name,
                    "subject": c.subject or c.get_channel_display(),
                    "follow_up_date": c.follow_up_date,
                }
                for c in follow_ups
            ],
        }

    def _quotations(self, today):
        quotes = Quotation.objects.all()
        pending = quotes.filter(status__in=Quotation.OPEN_STATUSES)
        accepted_year = quotes.filter(status=Quotation.Status.ACCEPTED, issue_date__year=today.year)
        decided = quotes.filter(status__in=[Quotation.Status.ACCEPTED, Quotation.Status.REJECTED])
        return {
            "pending_count": pending.count(),
            "pending_value": _sum(pending, "total"),
            "accepted_year_count": accepted_year.count(),
            "accepted_year_value": _sum(accepted_year, "total"),
            "acceptance_rate": _rate(decided.filter(status=Quotation.Status.ACCEPTED).count(), decided.count()),
            "recent": [
                {
                    "id": q.id,
                    "number": q.number,
                    "title": q.title,
                    "customer_name": q.customer.name,
                    "status": q.status,
                    "status_display": q.get_status_display(),
                    "total": q.total,
                    "valid_until": q.valid_until,
                    "is_expired": q.is_expired,
                }
                for q in pending.select_related("customer").order_by("-created_at")[:6]
            ],
        }

    def _staff(self):
        teams = Team.objects.filter(is_active=True).annotate(
            member_count=Count("members", distinct=True),
            active_projects=Count("projects", filter=Q(projects__status__in=Project.ACTIVE_STATUSES), distinct=True),
        )
        return {
            "employees_active": Employee.objects.filter(status=Employee.Status.ACTIVE).count(),
            "employees_total": Employee.objects.count(),
            "teams_active": teams.count(),
            "users_active": User.objects.filter(is_active=True).count(),
            "teams": [
                {"id": t.id, "name": t.name, "members": t.member_count, "active_projects": t.active_projects}
                for t in teams.order_by("-active_projects", "name")[:6]
            ],
        }

    def _inventory(self):
        low = Material.objects.filter(is_active=True, min_quantity__gt=0, quantity__lte=F("min_quantity"))
        value = ExpressionWrapper(F("quantity") * F("unit_cost"), output_field=DecimalField(max_digits=18, decimal_places=2))
        service_due = [e for e in Equipment.objects.exclude(status=Equipment.Status.RETIRED).filter(next_service_date__isnull=False) if e.service_due]
        return {
            "stock_value": Material.objects.aggregate(total=Sum(value))["total"] or ZERO,
            "low_stock_count": low.count(),
            "low_stock": [
                {"id": m.id, "sku": m.sku, "name": m.name, "quantity": m.quantity, "min_quantity": m.min_quantity, "unit": m.unit}
                for m in low.order_by("name")[:6]
            ],
            "products_low_count": Product.objects.filter(min_quantity__gt=0, quantity__lte=F("min_quantity")).count(),
            "production_active": ProductionOrder.objects.filter(
                status__in=[ProductionOrder.Status.PLANNED, ProductionOrder.Status.IN_PROGRESS]
            ).count(),
            "equipment_service_due": [
                {"id": e.id, "name": e.name, "next_service_date": e.next_service_date} for e in service_due[:6]
            ],
        }

    def _deadlines(self, today):
        horizon = today + timedelta(days=30)
        projects = (
            Project.objects.active()
            .filter(deadline__isnull=False, deadline__lte=horizon)
            .order_by("deadline")[:8]
        )
        milestones = (
            ProjectMilestone.objects.filter(
                is_completed=False,
                due_date__isnull=False,
                due_date__lte=today + timedelta(days=14),
                project__status__in=Project.ACTIVE_STATUSES,
            )
            .select_related("project")
            .order_by("due_date")[:8]
        )
        return {
            "projects": [
                {"id": p.id, "code": p.code, "title": p.title, "deadline": p.deadline, "progress": p.progress, "is_overdue": p.is_overdue}
                for p in projects
            ],
            "milestones": [
                {
                    "id": m.id,
                    "title": m.title,
                    "due_date": m.due_date,
                    "is_overdue": m.is_overdue,
                    "project": m.project_id,
                    "project_code": m.project.code,
                }
                for m in milestones
            ],
        }
