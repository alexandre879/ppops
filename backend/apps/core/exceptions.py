from django.db.models import ProtectedError, RestrictedError
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    """DRF's handler, plus a readable 409 when a delete is blocked by related records."""
    if isinstance(exc, (ProtectedError, RestrictedError)):
        detail = _(
            "This record is linked to other records (for example quotations, contracts or projects) "
            "and cannot be deleted. Set it to inactive instead."
        )
        return Response({"detail": detail}, status=status.HTTP_409_CONFLICT)
    return drf_exception_handler(exc, context)
