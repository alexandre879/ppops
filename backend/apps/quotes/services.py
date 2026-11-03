"""Cost estimation: turns "N units of a service" into priced material and labour lines."""

from dataclasses import asdict, dataclass
from decimal import ROUND_CEILING, Decimal

from django.db import transaction
from django.db.models import Max
from django.utils import translation
from django.utils.translation import gettext as _

from apps.catalog.models import Service

from .calculations import markup_factor, money, unit_label
from .models import PricingSettings, Quotation, QuotationItem

# Materials sold in whole packs are rounded up to the next full unit.
WHOLE_UNITS = {"bag", "pcs", "sheet", "set", "roll"}


@dataclass
class EstimateLine:
    kind: str
    group: str
    description: str
    unit: str
    quantity: Decimal
    unit_cost: Decimal
    unit_price: Decimal
    material_id: int | None = None
    service_id: int | None = None

    @property
    def line_total(self) -> Decimal:
        return money(self.quantity * self.unit_price)

    def as_dict(self) -> dict:
        return {**asdict(self), "line_total": self.line_total}


def estimate_service(
    service: Service,
    quantity: Decimal,
    *,
    overhead_percent: Decimal,
    margin_percent: Decimal,
    labour_rate: Decimal,
    include_labour: bool = True,
    group: str = "",
) -> list[EstimateLine]:
    quantity = Decimal(quantity)
    factor = markup_factor(overhead_percent, margin_percent)
    language = translation.get_language() or "en"
    group = group or f"{service.title} — {quantity.normalize():f} {unit_label(service.unit, language)}"
    lines: list[EstimateLine] = []

    for usage in service.recipe.select_related("material"):
        material = usage.material
        needed = quantity * usage.consumption_per_unit * (1 + usage.waste_percent / 100)
        if material.unit in WHOLE_UNITS:
            needed = needed.to_integral_value(rounding=ROUND_CEILING)
        else:
            needed = needed.quantize(Decimal("0.01"), rounding=ROUND_CEILING)
        lines.append(
            EstimateLine(
                kind=QuotationItem.Kind.MATERIAL,
                group=group,
                description=material.name,
                unit=material.unit,
                quantity=needed,
                unit_cost=material.unit_cost,
                unit_price=money(material.unit_cost * factor),
                material_id=material.id,
            )
        )

    if include_labour and service.labour_hours_per_unit > 0:
        hours = (quantity * service.labour_hours_per_unit).quantize(Decimal("0.1"), rounding=ROUND_CEILING)
        lines.append(
            EstimateLine(
                kind=QuotationItem.Kind.LABOUR,
                group=group,
                description=_("Labour — %(service)s") % {"service": service.title},
                unit="h",
                quantity=hours,
                unit_cost=money(labour_rate),
                unit_price=money(Decimal(labour_rate) * factor),
                service_id=service.id,
            )
        )

    # Services without a recipe can still be quoted at their published base price.
    if not lines and service.price_from:
        lines.append(
            EstimateLine(
                kind=QuotationItem.Kind.SERVICE,
                group=group,
                description=service.title,
                unit=service.unit,
                quantity=quantity,
                unit_cost=Decimal("0"),
                unit_price=money(service.price_from),
                service_id=service.id,
            )
        )
    return lines


def add_estimate_to_quotation(quotation: Quotation, service: Service, quantity: Decimal, **options) -> list[QuotationItem]:
    pricing = PricingSettings.load()
    # Line texts (material names, "Labour — …") are written in the quotation's language.
    with translation.override(quotation.language):
        lines = estimate_service(
            service,
            quantity,
            overhead_percent=quotation.overhead_percent,
            margin_percent=quotation.margin_percent,
            labour_rate=pricing.labour_rate_per_hour,
            **options,
        )
    with transaction.atomic():
        start = (quotation.items.aggregate(m=Max("order"))["m"] or 0) + 1
        items = [
            QuotationItem.objects.create(quotation=quotation, order=start + i, **asdict(line))
            for i, line in enumerate(lines)
        ]
        quotation.recalculate()
    return items
