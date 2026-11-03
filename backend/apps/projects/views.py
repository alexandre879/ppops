import os

from django.http import FileResponse, Http404
from django.utils.translation import gettext as _
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action

from apps.core.serializers import translated
from apps.core.views import PrivateFileDownloadMixin

from .models import Project, ProjectDocument, ProjectExpense, ProjectMilestone, ProjectPayment, ProjectPhoto
from .serializers import (
    ProjectDetailSerializer,
    ProjectDocumentSerializer,
    ProjectExpenseSerializer,
    ProjectListSerializer,
    ProjectMilestoneSerializer,
    ProjectPaymentSerializer,
    ProjectPhotoSerializer,
)


class ProjectFilter(filters.FilterSet):
    overdue = filters.BooleanFilter(method="filter_overdue")
    active = filters.BooleanFilter(method="filter_active")

    class Meta:
        model = Project
        fields = ["status", "priority", "customer", "manager", "building_type", "show_in_portfolio", "teams"]

    def filter_overdue(self, queryset, name, value):
        overdue = queryset.overdue()
        return overdue if value else queryset.exclude(pk__in=overdue.values("pk"))

    def filter_active(self, queryset, name, value):
        return queryset.active() if value else queryset.exclude(status__in=Project.ACTIVE_STATUSES)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_module = "projects"
    filterset_class = ProjectFilter
    search_fields = ["code", *translated("title", "city"), "address", "customer__name"]
    ordering_fields = ["created_at", "deadline", "start_date", "progress", "budget", "title"]

    def get_queryset(self):
        queryset = Project.objects.with_totals().select_related("customer", "manager")
        if self.action != "list":
            queryset = queryset.prefetch_related("services", "teams", "employees", "milestones")
        return queryset

    def get_serializer_class(self):
        return ProjectListSerializer if self.action == "list" else ProjectDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProjectChildViewSet(viewsets.ModelViewSet):
    """Base for project sub-resources, filtered with ``?project=<id>``."""

    permission_module = "projects"
    filterset_fields = ["project"]
    pagination_class = None
    owner_field = "created_by"

    def perform_create(self, serializer):
        serializer.save(**{self.owner_field: self.request.user})


class ProjectPhotoViewSet(ProjectChildViewSet):
    queryset = ProjectPhoto.objects.all()
    serializer_class = ProjectPhotoSerializer
    filterset_fields = ["project", "stage", "is_public"]
    owner_field = "uploaded_by"


class ProjectDocumentViewSet(PrivateFileDownloadMixin, ProjectChildViewSet):
    queryset = ProjectDocument.objects.select_related("uploaded_by")
    serializer_class = ProjectDocumentSerializer
    filterset_fields = ["project", "kind"]
    owner_field = "uploaded_by"


class ProjectExpenseViewSet(ProjectChildViewSet):
    permission_module = "finance"
    queryset = ProjectExpense.objects.select_related("project")
    serializer_class = ProjectExpenseSerializer
    filterset_fields = ["project", "category"]

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        expense = self.get_object()
        if not expense.receipt:
            raise Http404(_("No receipt attached."))
        return FileResponse(
            expense.receipt.open("rb"), as_attachment=True, filename=os.path.basename(expense.receipt.name)
        )


class ProjectPaymentViewSet(ProjectChildViewSet):
    permission_module = "finance"
    queryset = ProjectPayment.objects.select_related("project")
    serializer_class = ProjectPaymentSerializer
    filterset_fields = ["project", "method"]


class ProjectMilestoneViewSet(ProjectChildViewSet):
    queryset = ProjectMilestone.objects.all()
    serializer_class = ProjectMilestoneSerializer
    filterset_fields = ["project", "is_completed"]

    def perform_create(self, serializer):
        serializer.save()
