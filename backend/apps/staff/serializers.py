from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import Employee, Team


class EmployeeBriefSerializer(BaseModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "full_name", "position", "phone"]


class EmployeeSerializer(BaseModelSerializer):
    full_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    team_names = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id", "first_name", "last_name", "full_name", "position", "phone", "email", "hire_date",
            "daily_rate", "status", "status_display", "user", "photo", "notes", "team_names",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_team_names(self, obj) -> list[str]:
        return [team.name for team in obj.teams.all()]


class TeamSerializer(BaseModelSerializer):
    specialization_display = serializers.CharField(source="get_specialization_display", read_only=True)
    leader_name = serializers.CharField(source="leader.full_name", read_only=True, default=None)
    members_detail = EmployeeBriefSerializer(source="members", many=True, read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            "id", "name", "specialization", "specialization_display", "leader", "leader_name",
            "members", "members_detail", "member_count", "description", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_member_count(self, obj) -> int:
        return len(obj.members.all())
