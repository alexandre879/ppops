from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer, TranslatedFieldsMixin, translated

from .models import Equipment, Material, MaterialCategory, Product, ProductionOrder, StockMovement
from .services import record_movement


class MaterialCategorySerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("name",)
    material_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = MaterialCategory
        fields = ["id", "name", "description", "material_count", "created_at", *translated("name", "description")]
        read_only_fields = ["name", "description", "created_at"]


class MaterialSerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("name",)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_value = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = Material
        fields = [
            "id", "sku", "name", "category", "category_name", "unit", "unit_display", "unit_cost",
            "quantity", "min_quantity", "is_low_stock", "stock_value", "supplier", "location",
            "description", "is_active", "created_at", "updated_at", *translated("name"),
        ]
        # Stock levels only change through stock movements, so the ledger stays complete.
        read_only_fields = ["name", "quantity", "created_at", "updated_at"]


class StockMovementSerializer(BaseModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_unit = serializers.CharField(source="material.unit", read_only=True)
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = StockMovement
        fields = [
            "id", "material", "material_name", "material_unit", "movement_type", "movement_type_display",
            "quantity", "balance_after", "unit_cost", "project", "project_code", "reference", "note",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["balance_after", "created_by", "created_at"]

    def validate(self, attrs):
        quantity = attrs["quantity"]
        if attrs["movement_type"] == StockMovement.Type.ADJUST:
            if quantity < 0:
                raise serializers.ValidationError({"quantity": _("Counted quantity cannot be negative.")})
        elif quantity <= Decimal("0"):
            raise serializers.ValidationError({"quantity": _("Quantity must be greater than zero.")})
        return attrs

    def create(self, validated_data):
        return record_movement(
            material=validated_data.pop("material"),
            movement_type=validated_data.pop("movement_type"),
            quantity=validated_data.pop("quantity"),
            user=self.context["request"].user,
            **validated_data,
        )


class ProductSerializer(TranslatedFieldsMixin, BaseModelSerializer):
    required_translations = ("name",)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    unit_display = serializers.CharField(source="get_unit_display", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "sku", "name", "slug", "category", "category_display", "description", "standard",
            "unit", "unit_display", "unit_cost", "sale_price", "rental_price_per_day", "quantity",
            "min_quantity", "is_low_stock", "image", "is_published", "order", "created_at", "updated_at",
            *translated("name", "description", "standard"),
        ]
        read_only_fields = ["name", "description", "standard", "created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False}}


class ProductionOrderSerializer(BaseModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_unit = serializers.CharField(source="product.unit", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    responsible_name = serializers.CharField(source="responsible.full_name", read_only=True, default=None)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = ProductionOrder
        fields = [
            "id", "number", "product", "product_name", "product_unit", "quantity", "status",
            "status_display", "start_date", "due_date", "completed_at", "responsible",
            "responsible_name", "project", "project_code", "material_cost", "labour_cost", "total_cost",
            "notes", "stock_posted", "created_at", "updated_at",
        ]
        read_only_fields = ["number", "completed_at", "stock_posted", "created_at", "updated_at"]

    def get_total_cost(self, obj) -> Decimal:
        return obj.material_cost + obj.labour_cost

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(_("Quantity must be greater than zero."))
        return value

    def validate(self, attrs):
        order = self.instance
        if order and order.stock_posted:
            locked = {
                "product": order.product,
                "quantity": order.quantity,
                "status": ProductionOrder.Status.COMPLETED,
            }
            for field, current in locked.items():
                if field in attrs and attrs[field] != current:
                    raise serializers.ValidationError(
                        {field: _("This order is completed and its output is already in stock.")}
                    )
        return attrs


class EquipmentSerializer(BaseModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    project_code = serializers.CharField(source="project.code", read_only=True, default=None)
    service_due = serializers.BooleanField(read_only=True)

    class Meta:
        model = Equipment
        fields = [
            "id", "name", "code", "serial_number", "kind", "kind_display", "status", "status_display",
            "project", "project_code", "location", "purchase_date", "purchase_cost",
            "last_service_date", "next_service_date", "service_due", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
