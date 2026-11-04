"""The website assistant's knowledge base, and the search that picks what it reads (the "R" in RAG).

Every fact here comes from content the public website already shows: the company profile and
contacts, published service categories, services, materials, products and portfolio projects.
Internal data (costs, budgets, customers, labour norms, stock) is never read, so the assistant
cannot reveal it.

Each entry is one page of the website. Its ``blocks`` are written in the visitor's language
and become the citable units Claude quotes from; its ``search_text`` holds every translation,
so a question typed in Georgian, English or Russian finds the page whatever the site language.
"""

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from decimal import Decimal

from django.conf import settings
from django.db.models import Prefetch
from django.utils import translation
from django.utils.translation import gettext as _

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.core.models import SiteSettings
from apps.inventory.models import Product
from apps.projects.models import Project

from .queries import portfolio_projects

LANGUAGES = [code for code, _name in settings.LANGUAGES]

# Entries sent with each question on top of the pinned ones.
TOP_K = 6
# Matches scoring under this share of the best match are noise rather than context.
MIN_RELATIVE_SCORE = 0.25
# Words are also indexed by their first letters, so inflected forms still match
# (фасада / фасадов, ფასადის / ფასადზე, plastering / plaster).
STEM_LENGTH = 5
# BM25 parameters (the usual defaults).
K1 = 1.2
B = 0.75


@dataclass
class Entry:
    source: str  # site path, e.g. "/en/services/facade-plastering"; also the link shown to the visitor
    title: str
    blocks: list[str]
    search_text: str = ""

    def as_search_result(self) -> dict:
        return {
            "type": "search_result",
            "source": self.source,
            "title": self.title,
            "content": [{"type": "text", "text": block} for block in self.blocks],
            "citations": {"enabled": True},
        }


@dataclass
class Knowledge:
    company_name: str
    # Sent with every question: who the company is, how to reach it, and what it offers.
    pinned: list[Entry] = field(default_factory=list)
    # Searched for each question.
    entries: list[Entry] = field(default_factory=list)


def build_knowledge(lang: str) -> Knowledge:
    with translation.override(lang):
        site = SiteSettings.load()
        public_services = Service.objects.filter(is_published=True, category__is_published=True)
        categories = list(
            ServiceCategory.objects.filter(is_published=True).prefetch_related(
                Prefetch("services", queryset=public_services.order_by("order", "title"), to_attr="public_services")
            )
        )
        services = list(
            public_services.select_related("category").prefetch_related(
                Prefetch("solutions", queryset=Solution.objects.filter(is_published=True), to_attr="public_solutions")
            )
        )
        solutions = list(
            Solution.objects.filter(is_published=True).prefetch_related(
                Prefetch("services", queryset=public_services, to_attr="public_services")
            )
        )
        products = list(Product.objects.filter(is_published=True))
        projects = list(portfolio_projects())

        pinned = [_about(site, lang), _contacts(site, lang), _catalogue(categories, lang)]
        entries = (
            [_category(category, lang) for category in categories]
            + [_service(service, lang) for service in services]
            + [_solution(solution, lang) for solution in solutions]
            + [_product(product, lang) for product in products]
            + [_project(project, lang) for project in projects]
        )
        return Knowledge(
            company_name=site.company_name,
            pinned=[entry for entry in pinned if entry.blocks],
            entries=[entry for entry in entries if entry.blocks],
        )


def search(entries: list[Entry], question: str, context: str = "") -> list[Entry]:
    """Ranks entries against the question with BM25.

    ``context`` is the visitor's previous question: it counts for less, but lets a follow-up
    such as "and how much does it cost?" still find the service being discussed.
    """
    if not entries:
        return []
    weights = {term: 0.4 for term in _terms(context)}
    weights.update({term: 1.0 for term in _terms(question)})
    if not weights:
        return []

    documents = [Counter(_terms(entry.search_text)) for entry in entries]
    lengths = [sum(document.values()) or 1 for document in documents]
    average_length = sum(lengths) / len(lengths)
    document_frequency = Counter(term for document in documents for term in document)
    count = len(documents)

    scores = []
    for index, (document, length) in enumerate(zip(documents, lengths)):
        score = 0.0
        for term, weight in weights.items():
            frequency = document.get(term)
            if not frequency:
                continue
            idf = math.log(1 + (count - document_frequency[term] + 0.5) / (document_frequency[term] + 0.5))
            score += weight * idf * frequency * (K1 + 1) / (frequency + K1 * (1 - B + B * length / average_length))
        if score > 0:
            scores.append((score, index))
    if not scores:
        return []

    scores.sort(key=lambda item: (-item[0], item[1]))
    best = scores[0][0]
    return [entries[index] for score, index in scores[:TOP_K] if score >= best * MIN_RELATIVE_SCORE]


_WORD = re.compile(r"\w+")


def _terms(text: str) -> list[str]:
    terms = []
    for word in _WORD.findall(text.lower()):
        if len(word) < 2:
            continue
        terms.append(word)
        if len(word) > STEM_LENGTH:
            terms.append(word[:STEM_LENGTH])
    return terms


def _every_language(obj, *fields: str) -> str:
    """Every translation of the fields. A field named twice counts twice: names weigh more than descriptions."""
    parts = []
    for name in fields:
        for code in LANGUAGES:
            value = getattr(obj, f"{name}_{code}", None)
            if isinstance(value, list):
                parts.extend(str(item) for item in value if item)
            elif value:
                parts.append(str(value))
    return " ".join(parts)


def _facts(*facts: str | None) -> list[str]:
    return [fact.strip() for fact in facts if fact and fact.strip()]


def _number(value: Decimal) -> str:
    return format(value.normalize(), "f")


def _about(site: SiteSettings, lang: str) -> Entry:
    numbers = []
    if site.years_experience:
        numbers.append(f"{site.years_experience} years of experience")
    if site.projects_completed:
        numbers.append(f"{site.projects_completed} completed projects")
    if site.specialists:
        numbers.append(f"{site.specialists} specialists")
    return Entry(
        source=f"/{lang}/about",
        title=_("About us"),
        blocks=_facts(
            f"Company: {site.company_name}" + (f" — {site.tagline}" if site.tagline else ""),
            site.about_text,
            site.mission and f"Mission: {site.mission}",
            site.promise and f"Our promise: {site.promise}",
            numbers and "Track record: " + ", ".join(numbers) + ".",
        ),
    )


def _contacts(site: SiteSettings, lang: str) -> Entry:
    phones = site.phones
    return Entry(
        source=f"/{lang}/contact",
        title=_("Contacts"),
        blocks=_facts(
            phones and "Phone: " + ", ".join(phones),
            site.email and f"Email: {site.email}",
            site.address and f"Address: {site.address}",
            site.working_hours and f"Working hours: {site.working_hours}",
            site.facebook_url and f"Facebook: {site.facebook_url}",
            site.instagram_url and f"Instagram: {site.instagram_url}",
            "Free estimate: visitors can request a free estimate with the form on the Contact page by leaving "
            "a phone number or an email address; the team replies within one working day.",
        ),
    )


def _catalogue(categories: list[ServiceCategory], lang: str) -> Entry:
    blocks = []
    for category in categories:
        services = []
        for service in category.public_services:
            if service.price_from:
                services.append(f"{service.title} (from {_number(service.price_from)} GEL per {service.get_unit_display()})")
            else:
                services.append(service.title)
        if services:
            blocks.append(f"{category.name}: " + "; ".join(services))
    if blocks:
        blocks.insert(0, "Services the company offers, by category (prices are starting prices):")
    return Entry(source=f"/{lang}/services", title=_("Services"), blocks=blocks)


def _category(category: ServiceCategory, lang: str) -> Entry:
    titles = [service.title for service in category.public_services]
    return Entry(
        source=f"/{lang}/services#{category.slug}",
        title=category.name,
        blocks=_facts(
            f"Service category: {category.name}",
            category.description,
            titles and "Services in this category: " + "; ".join(titles),
        ),
        search_text=" ".join(
            [_every_language(category, "name", "name"), _every_language(category, "description")]
            + [_every_language(service, "title") for service in category.public_services]
        ),
    )


def _service(service: Service, lang: str) -> Entry:
    price = None
    if service.price_from:
        price = (
            f"Starting price: from {_number(service.price_from)} GEL per {service.get_unit_display()}. "
            "The exact cost depends on the project and is confirmed in a free estimate."
        )
    materials = [solution.name for solution in service.public_solutions]
    return Entry(
        source=f"/{lang}/services/{service.slug}",
        title=service.title,
        blocks=_facts(
            f"Service: {service.title} (category: {service.category.name})",
            service.summary,
            service.description,
            service.features and "What's included: " + "; ".join(str(item) for item in service.features if item),
            price,
            materials and "Materials and systems used: " + ", ".join(materials),
        ),
        search_text=" ".join(
            [
                _every_language(service, "title", "title", "summary", "description", "features"),
                _every_language(service.category, "name"),
            ]
            + [_every_language(solution, "name") for solution in service.public_solutions]
        ),
    )


def _solution(solution: Solution, lang: str) -> Entry:
    services = solution.public_services
    return Entry(
        source=f"/{lang}/services/{services[0].slug}" if services else f"/{lang}/services",
        title=solution.name,
        blocks=_facts(
            f"Material or system we work with: {solution.name} ({solution.get_kind_display()})",
            solution.description,
            services and "Used in these services: " + "; ".join(service.title for service in services),
        ),
        search_text=" ".join(
            [_every_language(solution, "name", "name", "description"), solution.get_kind_display()]
            + [_every_language(service, "title") for service in services]
        ),
    )


def _product(product: Product, lang: str) -> Entry:
    return Entry(
        source=f"/{lang}/manufacturing",
        title=product.name,
        blocks=_facts(
            f"Product from our own manufacturing: {product.name} ({product.get_category_display()})",
            product.description,
            product.standard and f"Standard: {product.standard}",
        ),
        search_text=" ".join(
            [_every_language(product, "name", "name", "description", "standard"), product.get_category_display()]
        ),
    )


def _project(project: Project, lang: str) -> Entry:
    details = [project.get_building_type_display()]
    if project.city:
        details.append(f"in {project.city}")
    if project.floors:
        details.append(f"{project.floors} floors")
    if project.area_m2:
        details.append(f"{_number(project.area_m2)} m²")
    day = project.completed_date or project.start_date
    if day:
        details.append(str(day.year))
    services = [service for service in project.services.all() if service.is_published]
    return Entry(
        source=f"/{lang}/projects/{project.slug}",
        title=project.title,
        blocks=_facts(
            f"Portfolio project: {project.title} (status: {project.get_status_display()})",
            "Details: " + ", ".join(details),
            project.public_summary,
            services and "Work we did: " + "; ".join(service.title for service in services),
        ),
        search_text=" ".join(
            [_every_language(project, "title", "title", "public_summary", "city"), project.get_building_type_display()]
            + [_every_language(service, "title") for service in services]
        ),
    )
