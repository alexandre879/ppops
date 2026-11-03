from rest_framework import viewsets

from .models import Employee, Team
from .serializers import EmployeeSerializer, TeamSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_module = "staff"
    queryset = Employee.objects.prefetch_related("teams")
    serializer_class = EmployeeSerializer
    filterset_fields = ["status"]
    search_fields = ["first_name", "last_name", "position", "phone", "email"]
    ordering_fields = ["last_name", "hire_date", "daily_rate", "created_at"]


class TeamViewSet(viewsets.ModelViewSet):
    permission_module = "staff"
    queryset = Team.objects.select_related("leader").prefetch_related("members")
    serializer_class = TeamSerializer
    filterset_fields = ["specialization", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
