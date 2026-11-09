"""Upload storage and validation shared by every app."""

import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext as _

MAX_UPLOAD_MB = 25

DOCUMENT_EXTENSIONS = [
    "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "odt", "ods",
    "dwg", "dxf", "jpg", "jpeg", "png", "webp", "heic", "zip",
]


class PrivateStorage(FileSystemStorage):
    """Files under settings.PRIVATE_MEDIA_ROOT, which is only reachable through authenticated API
    endpoints. The folder is read on each use, not fixed when the models load, so a test that
    points PRIVATE_MEDIA_ROOT at a temporary folder keeps its files out of the real one."""

    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)


def private_storage():
    """Storage for confidential files (contracts, documents, receipts)."""
    return PrivateStorage()


def validate_file_size(file):
    if file.size > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(_("File is too large (maximum %(size)s MB).") % {"size": MAX_UPLOAD_MB})


validate_document_extension = FileExtensionValidator(DOCUMENT_EXTENSIONS)
