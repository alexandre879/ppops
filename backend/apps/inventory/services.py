from decimal import Decimal

from django.db import transaction
from django.utils.translation import gettext as _
from rest_framework.exceptions import ValidationError

from .models import Material, StockMovement


def record_movement(*, material: Material, movement_type: str, quantity: Decimal, user=None, **extra) -> StockMovement:
    """Apply a stock movement atomically and write it to the ledger.

    ``in``/``out`` add or remove ``quantity``; ``adjust`` records a physical
    stock count and sets the balance to ``quantity``.
    """
    with transaction.atomic():
        material = Material.objects.select_for_update().get(pk=material.pk)
        if movement_type == StockMovement.Type.IN:
            balance = material.quantity + quantity
        elif movement_type == StockMovement.Type.OUT:
            if quantity > material.quantity:
                raise ValidationError(
                    {"quantity": _("Only %(quantity)s %(unit)s in stock.") % {"quantity": f"{material.quantity.normalize():f}", "unit": material.unit}}
                )
            balance = material.quantity - quantity
        elif movement_type == StockMovement.Type.ADJUST:
            balance = quantity
        else:
            raise ValidationError({"movement_type": _("Unknown movement type.")})

        material.quantity = balance
        material.save(update_fields=["quantity", "updated_at"])
        return StockMovement.objects.create(
            material=material,
            movement_type=movement_type,
            quantity=quantity,
            balance_after=balance,
            created_by=user,
            **extra,
        )
