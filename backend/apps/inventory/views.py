from django.db.models import Count, F, Q
from django_filters import rest_framework as filters
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.serializers import translated

from .models import Equipment, Material, MaterialCategory, Product, ProductionOrder, StockMovement
from .serializers import (
    EquipmentSerializer,
    MaterialCategorySerializer,
    MaterialSerializer,
    ProductionOrderSerializer,
    ProductSerializer,
    StockMovementSerializer,
)


class MaterialFilter(filters.FilterSet):
    low_stock = filters.BooleanFilter(method="filter_low_stock")

    class Meta:
        model = Material
        fields = ["category", "unit", "is_active"]

    def filter_low_stock(self, queryset, name, value):
        low = Q(min_quantity__gt=0, quantity__lte=F("min_quantity"))
        return queryset.filter(low) if value else queryset.exclude(low)


class MaterialCategoryViewSet(viewsets.ModelViewSet):
    permission_module = "inventory"
    queryset = MaterialCategory.objects.annotate(material_count=Count("materials"))
    serializer_class = MaterialCategorySerializer
    search_fields = translated("name", "description")
    ordering_fields = ["name"]


class MaterialViewSet(viewsets.ModelViewSet):
    permission_module = "inventory"
    queryset = Material.objects.select_related("category")
    serializer_class = MaterialSerializer
    filterset_class = MaterialFilter
    search_fields = ["sku", *translated("name"), "supplier"]
    ordering_fields = ["name", "sku", "quantity", "unit_cost", "updated_at"]


class StockMovementViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Append-only stock ledger: movements can be recorded but never edited."""

    permission_module = "inventory"
    queryset = StockMovement.objects.select_related("material", "project", "created_by")
    serializer_class = StockMovementSerializer
    filterset_fields = ["material", "movement_type", "project"]
    search_fields = [*translated("material__name"), "material__sku", "reference", "note"]
    ordering_fields = ["created_at", "quantity"]


class ProductViewSet(viewsets.ModelViewSet):
    permission_module = "inventory"
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_fields = ["category", "is_published"]
    search_fields = ["sku", *translated("name")]
    ordering_fields = ["name", "category", "quantity", "order"]


class ProductionOrderViewSet(viewsets.ModelViewSet):
    permission_module = "inventory"
    queryset = ProductionOrder.objects.select_related("product", "responsible", "project")
    serializer_class = ProductionOrderSerializer
    filterset_fields = ["status", "product", "project", "responsible"]
    search_fields = ["number", *translated("product__name"), "notes"]
    ordering_fields = ["created_at", "due_date", "status"]

    def perform_create(self, serializer):
        serializer.save().post_stock_if_completed()

    def perform_update(self, serializer):
        serializer.save().post_stock_if_completed()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status != ProductionOrder.Status.COMPLETED:
            order.status = ProductionOrder.Status.COMPLETED
            order.save(update_fields=["status", "updated_at"])
        order.post_stock_if_completed()
        return Response(self.get_serializer(order).data)


class EquipmentViewSet(viewsets.ModelViewSet):
    permission_module = "inventory"
    queryset = Equipment.objects.select_related("project")
    serializer_class = EquipmentSerializer
    filterset_fields = ["kind", "status", "project"]
    search_fields = ["name", "code", "serial_number", "location"]
    ordering_fields = ["name", "next_service_date", "status"]
