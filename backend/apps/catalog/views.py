from django.db.models import Count
from rest_framework import viewsets

from apps.core.serializers import translated

from .models import Service, ServiceCategory, ServiceImage, ServiceMaterial, Solution
from .serializers import (
    ServiceCategorySerializer,
    ServiceImageSerializer,
    ServiceMaterialSerializer,
    ServiceSerializer,
    SolutionSerializer,
)


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    permission_module = "services"
    queryset = ServiceCategory.objects.annotate(service_count=Count("services"))
    serializer_class = ServiceCategorySerializer
    filterset_fields = ["is_published"]
    search_fields = translated("name", "description")
    ordering_fields = ["order", "name"]


class ServiceViewSet(viewsets.ModelViewSet):
    permission_module = "services"
    queryset = Service.objects.select_related("category").prefetch_related(
        "solutions", "images", "recipe__material"
    )
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "is_published", "is_featured", "unit"]
    search_fields = translated("title", "summary")
    ordering_fields = ["order", "title", "price_from", "updated_at"]


class ServiceImageViewSet(viewsets.ModelViewSet):
    permission_module = "services"
    queryset = ServiceImage.objects.all()
    serializer_class = ServiceImageSerializer
    filterset_fields = ["service"]
    pagination_class = None


class ServiceMaterialViewSet(viewsets.ModelViewSet):
    permission_module = "services"
    queryset = ServiceMaterial.objects.select_related("material", "service")
    serializer_class = ServiceMaterialSerializer
    filterset_fields = ["service", "material"]
    pagination_class = None


class SolutionViewSet(viewsets.ModelViewSet):
    permission_module = "services"
    queryset = Solution.objects.all()
    serializer_class = SolutionSerializer
    filterset_fields = ["kind", "is_published"]
    search_fields = translated("name", "description")
    ordering_fields = ["kind", "order", "name"]
