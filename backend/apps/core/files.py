"""Upload storage and validation shared by every app."""

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


def private_storage():
    """Storage for confidential files (contracts, documents, receipts)."""
    return FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)


def validate_file_size(file):
    if file.size > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(_("File is too large (maximum %(size)s MB).") % {"size": MAX_UPLOAD_MB})


validate_document_extension = FileExtensionValidator(DOCUMENT_EXTENSIONS)
