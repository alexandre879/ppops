from django.utils import timezone
from django.utils.text import slugify

# Georgian (Mkhedruli) → Latin, so Georgian titles still produce readable URLs.
_GEORGIAN = str.maketrans(
    {
        "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e", "ვ": "v", "ზ": "z", "თ": "t",
        "ი": "i", "კ": "k", "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p", "ჟ": "zh",
        "რ": "r", "ს": "s", "ტ": "t", "უ": "u", "ფ": "p", "ქ": "k", "ღ": "gh", "ყ": "q",
        "შ": "sh", "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "ts", "ჭ": "ch", "ხ": "kh",
        "ჯ": "j", "ჰ": "h",
    }
)


def slug_source(instance, field: str) -> str:
    """Text to build a slug from: English if available (readable URLs), else Georgian/Russian."""
    for code in ("en", "ka", "ru"):
        value = getattr(instance, f"{field}_{code}", None)
        if value:
            return value
    return getattr(instance, field, "") or ""


def unique_slug(instance, value: str, field: str = "slug", max_length: int = 80) -> str:
    """Return a slug for ``value`` that is unique among the model's rows."""
    base = slugify(value.translate(_GEORGIAN))[:max_length].strip("-") or "item"
    manager = type(instance)._default_manager
    queryset = manager.exclude(pk=instance.pk) if instance.pk else manager.all()
    slug, n = base, 2
    while queryset.filter(**{field: slug}).exists():
        suffix = f"-{n}"
        slug = f"{base[: max_length - len(suffix)]}{suffix}"
        n += 1
    return slug


def next_sequence_number(model, field: str, prefix: str, width: int = 4) -> str:
    """Yearly sequential document numbers, e.g. ``Q-2026-0007``."""
    stem = f"{prefix}-{timezone.localdate().year}-"
    last = (
        model._default_manager.filter(**{f"{field}__startswith": stem})
        .order_by(f"-{field}")
        .values_list(field, flat=True)
        .first()
    )
    sequence = int(last.rsplit("-", 1)[1]) + 1 if last else 1
    return f"{stem}{sequence:0{width}d}"
