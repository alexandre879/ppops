import os

from django.http import FileResponse, Http404
from django.utils.translation import gettext as _
from rest_framework import generics
from rest_framework.decorators import action

from .models import SiteSettings
from .serializers import SiteSettingsSerializer


class SingletonView(generics.RetrieveUpdateAPIView):
    model = None

    def get_object(self):
        obj = self.model.load()
        self.check_object_permissions(self.request, obj)
        return obj


class SiteSettingsView(SingletonView):
    model = SiteSettings
    serializer_class = SiteSettingsSerializer
    permission_module = "settings"


class PrivateFileDownloadMixin:
    """Adds ``GET <detail>/download/`` streaming the object's private ``file``."""

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()
        if not obj.file:
            raise Http404(_("No file attached."))
        return FileResponse(
            obj.file.open("rb"), as_attachment=True, filename=os.path.basename(obj.file.name)
        )
