"""Pure pricing arithmetic (no database access) shared by quotes and the estimator."""

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
ZERO = Decimal("0")

UNIT_LABELS = {
    "en": {"m2": "m²", "m3": "m³", "m": "m", "l": "L", "h": "h", "pcs": "pcs", "kg": "kg", "bag": "bag",
           "sheet": "sheet", "set": "set", "roll": "roll", "t": "t", "day": "day", "project": "project"},
    "ka": {"m2": "მ²", "m3": "მ³", "m": "მ", "l": "ლ", "h": "სთ", "pcs": "ც", "kg": "კგ", "bag": "ტომარა",
           "sheet": "ფურცელი", "set": "კომპლ.", "roll": "რულონი", "t": "ტ", "day": "დღე", "project": "პროექტი"},
    "ru": {"m2": "м²", "m3": "м³", "m": "м", "l": "л", "h": "ч", "pcs": "шт.", "kg": "кг", "bag": "меш.",
           "sheet": "лист", "set": "компл.", "roll": "рул.", "t": "т", "day": "день", "project": "проект"},
}


def unit_label(code: str, language: str = "en") -> str:
    return UNIT_LABELS.get(language[:2], UNIT_LABELS["en"]).get(code, code)


def money(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def markup_factor(overhead_percent, margin_percent) -> Decimal:
    """Selling price = cost × (1 + overhead) × (1 + margin)."""
    return (1 + Decimal(overhead_percent) / 100) * (1 + Decimal(margin_percent) / 100)


@dataclass(frozen=True)
class Totals:
    subtotal: Decimal
    discount: Decimal
    net_total: Decimal
    vat_amount: Decimal
    total: Decimal
    cost_total: Decimal

    @property
    def profit(self) -> Decimal:
        return self.net_total - self.cost_total

    @property
    def margin_percent(self) -> Decimal:
        if not self.net_total:
            return ZERO
        return (self.profit / self.net_total * 100).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    def as_dict(self) -> dict:
        return {
            "subtotal": self.subtotal,
            "discount": self.discount,
            "net_total": self.net_total,
            "vat_amount": self.vat_amount,
            "total": self.total,
            "cost_total": self.cost_total,
            "profit": self.profit,
            "margin_percent": self.margin_percent,
        }


def compute_totals(lines: Iterable[tuple[Decimal, Decimal, Decimal]], discount, vat_percent) -> Totals:
    """``lines`` are ``(quantity, unit_price, unit_cost)`` tuples."""
    subtotal = cost_total = ZERO
    for quantity, unit_price, unit_cost in lines:
        subtotal += money(quantity * unit_price)
        cost_total += money(quantity * unit_cost)
    discount = min(max(Decimal(discount or 0), ZERO), subtotal)
    net_total = subtotal - discount
    vat_amount = money(net_total * Decimal(vat_percent or 0) / 100)
    return Totals(
        subtotal=subtotal,
        discount=money(discount),
        net_total=money(net_total),
        vat_amount=vat_amount,
        total=money(net_total + vat_amount),
        cost_total=cost_total,
    )
