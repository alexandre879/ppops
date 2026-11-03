"""Branded A4 PDF quotations rendered with ReportLab."""

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils import translation
from django.utils.translation import gettext as _
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.core.models import SiteSettings

from .calculations import unit_label
from .models import PricingSettings, Quotation

BRAND = colors.HexColor("#F26B1D")
INK = colors.HexColor("#1C1917")
MUTED = colors.HexColor("#78716C")
LINE = colors.HexColor("#E7E5E4")
TINT = colors.HexColor("#FFF4EC")

MARGIN = 18 * mm
CONTENT_WIDTH = A4[0] - 2 * MARGIN

# Unicode fonts first so Georgian customer names and addresses render correctly.
_FONT_CANDIDATES = [
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", None),
]
_fonts: tuple[str, str] | None = None


def _fonts_pair() -> tuple[str, str]:
    global _fonts
    if _fonts:
        return _fonts
    candidates = list(_FONT_CANDIDATES)
    if settings.PDF_FONT_REGULAR:
        candidates.insert(0, (settings.PDF_FONT_REGULAR, settings.PDF_FONT_BOLD or None))
    for regular, bold in candidates:
        if not Path(regular).is_file():
            continue
        try:
            pdfmetrics.registerFont(TTFont("NHM-Regular", regular))
            bold_name = "NHM-Regular"
            if bold and Path(bold).is_file():
                pdfmetrics.registerFont(TTFont("NHM-Bold", bold))
                bold_name = "NHM-Bold"
            _fonts = ("NHM-Regular", bold_name)
            return _fonts
        except Exception:  # unreadable/unsupported font file: try the next one
            continue
    _fonts = ("Helvetica", "Helvetica-Bold")
    return _fonts


def _text(value) -> str:
    return escape(str(value or "")).replace("\n", "<br/>")


def _qty(value) -> str:
    return f"{value.normalize():f}" if value == value.to_integral() else f"{value:.2f}".rstrip("0").rstrip(".")


class _Styles:
    def __init__(self, regular: str, bold: str):
        self.body = ParagraphStyle("body", fontName=regular, fontSize=9, leading=12.5, textColor=INK)
        self.small = ParagraphStyle("small", parent=self.body, fontSize=8, leading=11, textColor=MUTED)
        self.label = ParagraphStyle("label", parent=self.small, fontName=bold, fontSize=7.5, textColor=BRAND)
        self.title = ParagraphStyle("title", fontName=bold, fontSize=19, leading=23, textColor=INK)
        self.h2 = ParagraphStyle("h2", fontName=bold, fontSize=10.5, leading=14, textColor=INK, spaceAfter=3)
        self.cell = ParagraphStyle("cell", parent=self.body, fontSize=8.5, leading=11)
        self.cell_right = ParagraphStyle("cell_right", parent=self.cell, alignment=TA_RIGHT)
        self.group = ParagraphStyle("group", parent=self.cell, fontName=bold)
        self.head = ParagraphStyle("head", parent=self.cell, fontName=bold, textColor=colors.white)
        self.head_right = ParagraphStyle("head_right", parent=self.head, alignment=TA_RIGHT)
        self.meta_right = ParagraphStyle("meta_right", parent=self.body, alignment=TA_RIGHT)


def render_quotation_pdf(quotation: Quotation) -> bytes:
    """Render in the quotation's own language (labels, units, company texts)."""
    with translation.override(quotation.language):
        return _render(quotation)


def _render(quotation: Quotation) -> bytes:
    language = quotation.language

    def caps(text: str) -> str:
        # Georgian has no capitals in everyday text (str.upper() yields Mtavruli, unsupported by most fonts).
        return text if language == "ka" else text.upper()

    site = SiteSettings.load()
    pricing = PricingSettings.load()
    regular, bold = _fonts_pair()
    st = _Styles(regular, bold)
    currency = pricing.currency

    def fmt(amount) -> str:
        return f"{amount:,.2f} {currency}"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=34 * mm,
        bottomMargin=22 * mm,
        title=f"{_('Quotation')} {quotation.number}",
        author=site.company_name,
    )

    story = []

    # Title + key dates
    meta = [
        f"<font name='{bold}'>{_('No.')}</font> {_text(quotation.number)}",
        f"<font name='{bold}'>{_('Issue date')}:</font> {quotation.issue_date:%d.%m.%Y}",
    ]
    if quotation.valid_until:
        meta.append(f"<font name='{bold}'>{_('Valid until')}:</font> {quotation.valid_until:%d.%m.%Y}")
    header = Table(
        [[Paragraph(_text(_("Quotation")), st.title), Paragraph("<br/>".join(meta), st.meta_right)]],
        colWidths=[CONTENT_WIDTH * 0.62, CONTENT_WIDTH * 0.38],
    )
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [header, Spacer(1, 6 * mm)]

    # Client / project boxes
    customer = quotation.customer
    client_lines = [f"<font name='{bold}'>{_text(customer.name)}</font>"]
    for value in (customer.contact_person, customer.phone, customer.email, customer.address, customer.city):
        if value:
            client_lines.append(_text(value))
    if customer.tax_id:
        client_lines.append(f"{_text(_('Tax ID'))}: {_text(customer.tax_id)}")
    project_lines = [f"<font name='{bold}'>{_text(quotation.title)}</font>"]
    if quotation.site_address:
        project_lines.append(_text(quotation.site_address))
    if quotation.project_id:
        project_lines.append(f"{_text(_('Project ref.'))}: {_text(quotation.project.code)}")

    parties = Table(
        [
            [Paragraph(_text(caps(_("Prepared for"))), st.label), Paragraph(_text(caps(_("Project"))), st.label)],
            [Paragraph("<br/>".join(client_lines), st.body), Paragraph("<br/>".join(project_lines), st.body)],
        ],
        colWidths=[CONTENT_WIDTH / 2 - 2 * mm, CONTENT_WIDTH / 2 - 2 * mm],
        spaceBefore=0,
    )
    parties.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), TINT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 7),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
                ("LINEAFTER", (0, 0), (0, -1), 4, colors.white),
            ]
        )
    )
    story += [parties, Spacer(1, 7 * mm)]

    # Line items, grouped under section headings
    rows = [[
        Paragraph("#", st.head),
        Paragraph(_text(_("Description")), st.head),
        Paragraph(_text(_("Qty")), st.head_right),
        Paragraph(_text(_("Unit")), st.head),
        Paragraph(_text(_("Unit price")), st.head_right),
        Paragraph(_text(_("Amount")), st.head_right),
    ]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
    ]
    current_group, n = None, 0
    items = list(quotation.items.all())
    for item in items:
        if item.group and item.group != current_group:
            current_group = item.group
            rows.append([Paragraph(_text(item.group), st.group), "", "", "", "", ""])
            style += [("SPAN", (0, len(rows) - 1), (-1, len(rows) - 1)), ("BACKGROUND", (0, len(rows) - 1), (-1, len(rows) - 1), TINT)]
        n += 1
        rows.append([
            Paragraph(str(n), st.cell),
            Paragraph(_text(item.description), st.cell),
            Paragraph(_qty(item.quantity), st.cell_right),
            Paragraph(_text(unit_label(item.unit, language)), st.cell),
            Paragraph(f"{item.unit_price:,.2f}", st.cell_right),
            Paragraph(f"{item.line_total:,.2f}", st.cell_right),
        ])
    if not items:
        rows.append(["", Paragraph(_text(_("No items yet.")), st.small), "", "", "", ""])
    table = Table(rows, colWidths=[9 * mm, 74 * mm, 17 * mm, 22 * mm, 26 * mm, 26 * mm], repeatRows=1)
    table.setStyle(TableStyle(style))
    story += [table, Spacer(1, 5 * mm)]

    # Totals
    totals = [[_("Subtotal"), fmt(quotation.subtotal)]]
    if quotation.discount_amount:
        totals.append([_("Discount"), f"− {fmt(min(quotation.discount_amount, quotation.subtotal))}"])
    if quotation.vat_percent:
        totals.append([_("VAT %(rate)s%%") % {"rate": f"{quotation.vat_percent.normalize():f}"}, fmt(quotation.vat_amount)])
    total_rows = [[Paragraph(_text(a), st.cell), Paragraph(_text(b), st.cell_right)] for a, b in totals]
    total_rows.append([
        Paragraph(f"<font name='{bold}' color='white'>{_text(_('Total'))}</font>", st.cell),
        Paragraph(f"<font name='{bold}' color='white'>{_text(fmt(quotation.total))}</font>", st.cell_right),
    ])
    totals_table = Table(total_rows, colWidths=[40 * mm, 42 * mm], hAlign="RIGHT")
    totals_table.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
                ("BACKGROUND", (0, -1), (-1, -1), BRAND),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [KeepTogether(totals_table), Spacer(1, 8 * mm)]

    # Notes, terms, payment details
    if quotation.notes:
        story += [Paragraph(_text(_("Notes")), st.h2), Paragraph(_text(quotation.notes), st.body), Spacer(1, 4 * mm)]
    # Terms, payment details and signatures stay on one page, so the signature
    # block is never left alone at the top of a new page.
    closing = []
    if quotation.terms:
        closing += [Paragraph(_text(_("Terms & conditions")), st.h2), Paragraph(_text(quotation.terms), st.small), Spacer(1, 4 * mm)]
    if pricing.bank_name or pricing.bank_account:
        bank = " · ".join(_text(v) for v in (pricing.bank_name, pricing.bank_account) if v)
        closing += [Paragraph(_text(_("Payment details")), st.h2), Paragraph(bank, st.body), Spacer(1, 4 * mm)]

    prepared_by = quotation.created_by.get_full_name() if quotation.created_by else ""
    signatures = Table(
        [
            [Paragraph(_text(_("Prepared by: %(name)s") % {"name": prepared_by}), st.small), Paragraph(_text(_("Accepted by client:")), st.small)],
            [
                Paragraph(f"{_text(_('Signature'))} ____________________", st.small),
                Paragraph(f"{_text(_('Signature'))} ____________________   {_text(_('Date'))} ___________", st.small),
            ],
        ],
        colWidths=[CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
    )
    signatures.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 1), (-1, 1), 9)]))
    story.append(KeepTogether([*closing, Spacer(1, 3 * mm), signatures]))

    def decorate(canvas, document):
        width, height = A4
        canvas.saveState()
        canvas.setFillColor(BRAND)
        canvas.rect(0, height - 24 * mm, width, 24 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont(bold, 15)
        canvas.drawString(MARGIN, height - 13 * mm, site.company_name.upper())
        canvas.setFont(regular, 8)
        canvas.drawString(MARGIN, height - 18.5 * mm, site.tagline[:90])
        phones = [p for p in (site.phone_primary, site.phone_secondary, site.phone_tertiary) if p]
        for i, phone in enumerate(phones[:3]):
            canvas.drawRightString(width - MARGIN, height - (9 + i * 4.5) * mm, phone)
        canvas.setStrokeColor(LINE)
        canvas.line(MARGIN, 15 * mm, width - MARGIN, 15 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont(regular, 7.5)
        footer = " · ".join(v for v in (site.company_name, site.email, site.address) if v)
        canvas.drawString(MARGIN, 10.5 * mm, footer[:120])
        canvas.drawRightString(width - MARGIN, 10.5 * mm, f"{quotation.number} · " + _("page %(number)s") % {"number": document.page})
        canvas.restoreState()

    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()
