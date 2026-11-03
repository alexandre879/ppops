from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Administrator"
    MANAGER = "manager", "Project manager"
    SALES = "sales", "Sales & estimating"
    PRODUCTION = "production", "Production & warehouse"
    STAFF = "staff", "Site staff"


ADMIN, MANAGER, SALES, PRODUCTION, STAFF = (r.value for r in Role)
EVERYONE = frozenset(r.value for r in Role)

# module -> {"read": roles, "write": roles}. Superusers bypass this table.
MODULE_PERMISSIONS: dict[str, dict[str, frozenset[str]]] = {
    "dashboard": {"read": EVERYONE, "write": frozenset()},
    "services": {"read": EVERYONE, "write": frozenset({ADMIN, MANAGER})},
    "projects": {"read": EVERYONE, "write": frozenset({ADMIN, MANAGER})},
    "finance": {"read": frozenset({ADMIN, MANAGER}), "write": frozenset({ADMIN, MANAGER})},
    "crm": {"read": frozenset({ADMIN, MANAGER, SALES}), "write": frozenset({ADMIN, MANAGER, SALES})},
    "quotes": {"read": frozenset({ADMIN, MANAGER, SALES}), "write": frozenset({ADMIN, MANAGER, SALES})},
    "inventory": {
        "read": frozenset({ADMIN, MANAGER, SALES, PRODUCTION}),
        "write": frozenset({ADMIN, MANAGER, PRODUCTION}),
    },
    "staff": {"read": frozenset({ADMIN, MANAGER, PRODUCTION}), "write": frozenset({ADMIN, MANAGER})},
    "users": {"read": frozenset({ADMIN}), "write": frozenset({ADMIN})},
    "settings": {"read": frozenset({ADMIN, MANAGER, SALES}), "write": frozenset({ADMIN})},
}
