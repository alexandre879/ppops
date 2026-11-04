from django.db.models import Prefetch

from apps.projects.models import Project, ProjectPhoto


def portfolio_projects():
    """Projects shown in the public portfolio, with only their public photos."""
    return (
        Project.objects.filter(show_in_portfolio=True)
        .exclude(status=Project.Status.CANCELLED)
        .prefetch_related(
            "services",
            Prefetch("photos", queryset=ProjectPhoto.objects.filter(is_public=True), to_attr="public_photos"),
        )
        .order_by("-is_featured", "-completed_date", "-created_at")
    )
