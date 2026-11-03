from rest_framework.permissions import SAFE_METHODS, BasePermission


class ModulePermission(BasePermission):
    """Role-based access control.

    Each view declares a ``permission_module`` (e.g. ``"crm"``); the user's role
    decides whether they may read and/or write in that module. Views that do
    not declare a module are closed by default.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        module = getattr(view, "permission_module", None)
        if module is None:
            return False
        action = "read" if request.method in SAFE_METHODS else "write"
        return user.can(module, action)
