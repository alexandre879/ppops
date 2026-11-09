"""Email alerts to staff when a visitor sends an enquiry from the website.

Switched on by two settings: ``EMAIL_URL`` (how to send) and ``ENQUIRY_NOTIFY_EMAILS`` (to whom).
The alert is written in the site's default language, whatever language the visitor used, and
replies go straight to the visitor when they left an email address.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import translation
from django.utils.translation import gettext as _

from .models import Enquiry

logger = logging.getLogger(__name__)

DUMMY_BACKEND = "django.core.mail.backends.dummy.EmailBackend"


def _one_line(text: str) -> str:
    """Email headers can't contain line breaks."""
    return " ".join(text.split())


def build_enquiry_alert(enquiry: Enquiry, recipients: list[str]) -> EmailMessage:
    with translation.override(settings.LANGUAGE_CODE):
        fields = [
            (_("Name"), enquiry.name),
            (_("Phone"), enquiry.phone),
            (_("Email"), enquiry.email),
            (_("Company"), enquiry.company),
            (_("Service"), enquiry.service.title if enquiry.service else ""),
            (_("Subject"), enquiry.subject),
            (_("Location"), enquiry.location),
        ]
        lines = [f"{label}: {value}" for label, value in fields if value]
        if enquiry.message:
            lines += ["", _("Message:"), enquiry.message]
        if settings.ADMIN_URL:
            lines += ["", _("Open it in the admin platform: {url}").format(url=f"{settings.ADMIN_URL}/enquiries")]
        subject = _("New enquiry from the website: {name}").format(name=_one_line(enquiry.name))
    return EmailMessage(
        subject=subject,
        body="\n".join(lines) + "\n",
        to=recipients,
        reply_to=[enquiry.email] if enquiry.email else None,
    )


def notify_new_enquiry(enquiry: Enquiry) -> bool:
    """Email the enquiry to the staff list. Never raises: a mail problem must not lose the lead,
    which is already saved and visible under Enquiries. Returns whether an email was sent."""
    recipients = settings.ENQUIRY_NOTIFY_EMAILS
    if not recipients:
        return False
    if settings.EMAIL_BACKEND == DUMMY_BACKEND:
        logger.warning("Enquiry %s: ENQUIRY_NOTIFY_EMAILS is set but EMAIL_URL is not, so no alert was sent.", enquiry.pk)
        return False
    try:
        build_enquiry_alert(enquiry, recipients).send()
    except Exception:
        logger.exception("Enquiry %s: the email alert could not be sent.", enquiry.pk)
        return False
    logger.info("Enquiry %s: alert emailed to %d recipient(s).", enquiry.pk, len(recipients))
    return True
