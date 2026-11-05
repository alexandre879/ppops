from decimal import Decimal
from types import SimpleNamespace
from unittest import mock

import anthropic
import httpx2
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from apps.catalog.models import Service, ServiceCategory, Solution
from apps.inventory.models import Product
from apps.projects.models import Project
from apps.public.knowledge import build_knowledge, search


def make_catalogue():
    facades = ServiceCategory.objects.create(name_en="Façades", name_ru="Фасады", name_ka="ფასადები")
    plaster = Service.objects.create(
        category=facades,
        title_en="Façade plastering",
        title_ru="Штукатурка фасадов",
        title_ka="ფასადის შელესვა",
        summary_en="Mineral and silicone plaster for new and old buildings.",
        price_from=Decimal("25.00"),
        labour_hours_per_unit=Decimal("0.731"),
    )
    plaster.solutions.add(Solution.objects.create(name_en="Silicone plaster", kind="plaster"))
    Service.objects.create(category=facades, title_en="Metal staircases", summary_en="Welded steel stairs.")
    Service.objects.create(category=facades, title_en="Secret draft service", is_published=False)
    Product.objects.create(sku="SC-1", name_en="Façade scaffolding", is_published=True, unit_cost=Decimal("123.45"))
    Product.objects.create(sku="X-1", name_en="Unreleased product", is_published=False)
    Project.objects.create(title_en="Tbilisi residence", show_in_portfolio=True, budget=Decimal("98765"))
    Project.objects.create(title_en="Private internal job", show_in_portfolio=False)
    return plaster


class KnowledgeTests(TestCase):
    def setUp(self):
        self.plaster = make_catalogue()

    def test_questions_in_any_language_find_the_right_service(self):
        entries = build_knowledge("en").entries
        for question in ("How much is façade plastering?", "Сколько стоит штукатурка фасада?", "ფასადის შელესვა"):
            with self.subTest(question=question):
                found = search(entries, question)
                self.assertEqual(found[0].source, f"/en/services/{self.plaster.slug}")

    def test_a_follow_up_question_keeps_the_previous_topic(self):
        entries = build_knowledge("en").entries
        found = search(entries, "what does it cost?", context="Tell me about metal staircases")
        self.assertIn("Metal staircases", found[0].title)

    def test_small_talk_retrieves_nothing(self):
        self.assertEqual(search(build_knowledge("en").entries, "!!!"), [])

    def test_only_published_public_content_is_known(self):
        knowledge = build_knowledge("en")
        text = " ".join(block for entry in knowledge.pinned + knowledge.entries for block in entry.blocks)
        self.assertIn("Façade plastering", text)
        self.assertIn("from 25 GEL per m²", text)
        self.assertIn("Tbilisi residence", text)
        for hidden in ("Secret draft service", "Unreleased product", "Private internal job", "98765", "123.45", "0.731"):
            self.assertNotIn(hidden, text)

    def test_content_is_written_in_the_visitor_language(self):
        knowledge = build_knowledge("ru")
        service = next(e for e in knowledge.entries if e.source == f"/ru/services/{self.plaster.slug}")
        self.assertEqual(service.title, "Штукатурка фасадов")
        self.assertEqual(knowledge.pinned[1].title, "Контакты")


def fake_response(*blocks, stop_reason="end_turn"):
    return SimpleNamespace(
        content=list(blocks),
        stop_reason=stop_reason,
        stop_details=None,
        usage=SimpleNamespace(input_tokens=10, output_tokens=5),
        _request_id="req_test",
    )


def text_block(text, *sources):
    citations = [SimpleNamespace(type="search_result_location", source=s, title=f"Page {s}") for s in sources]
    return SimpleNamespace(type="text", text=text, citations=citations or None)


@override_settings(ANTHROPIC_API_KEY="test-key")
class AssistantApiTests(APITestCase):
    url = "/api/public/assistant/"

    def setUp(self):
        cache.clear()
        self.plaster = make_catalogue()
        patcher = mock.patch("apps.public.assistant._client")
        self.client_factory = patcher.start()
        self.addCleanup(patcher.stop)
        self.create = self.client_factory.return_value.beta.messages.create

    def ask(self, *messages, lang="en"):
        history = [{"role": "user" if i % 2 == 0 else "assistant", "content": m} for i, m in enumerate(messages)]
        return self.client.post(self.url, {"messages": history}, format="json", HTTP_ACCEPT_LANGUAGE=lang)

    def test_answers_from_retrieved_content_and_links_the_cited_pages(self):
        page = f"/en/services/{self.plaster.slug}"
        self.create.return_value = fake_response(
            SimpleNamespace(type="thinking", thinking=""),
            text_block("Façade plastering starts from 25 GEL per m².", page, "https://elsewhere.example"),
            text_block(" Call us for an exact estimate.", page),
        )
        response = self.ask("How much is façade plastering?")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["answer"], "Façade plastering starts from 25 GEL per m². Call us for an exact estimate.")
        # Cited pages are listed once each; a source that wasn't one of ours is ignored.
        self.assertEqual(response.data["sources"], [{"title": f"Page {page}", "url": page}])

        request = self.create.call_args.kwargs
        self.assertEqual(request["model"], "claude-opus-5-5")
        self.assertEqual(request["fallbacks"], "default")
        content = request["messages"][-1]["content"]
        self.assertEqual(content[-1], {"type": "text", "text": "How much is façade plastering?"})
        sources = [block["source"] for block in content if block["type"] == "search_result"]
        self.assertEqual(sources[:3], ["/en/about", "/en/contact", "/en/services"])
        self.assertIn(page, sources)
        self.assertNotIn("Secret draft service", str(content))

    def test_earlier_turns_are_sent_as_plain_text(self):
        self.create.return_value = fake_response(text_block("From 25 GEL."))
        self.ask("Do you do plastering?", "Yes, we do façade plastering.", "How much is it?")
        messages = self.create.call_args.kwargs["messages"]
        self.assertEqual(messages[0], {"role": "user", "content": "Do you do plastering?"})
        self.assertEqual(messages[1], {"role": "assistant", "content": "Yes, we do façade plastering."})
        self.assertEqual(messages[2]["role"], "user")

    def test_a_declined_request_returns_no_answer(self):
        self.create.return_value = fake_response(stop_reason="refusal")
        response = self.ask("Hello")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["answer"])

    def test_api_failures_ask_the_visitor_to_call_instead(self):
        request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        self.create.side_effect = anthropic.APIConnectionError(request=request)
        response = self.ask("Hello")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data, {"code": "unavailable"})

    def test_invalid_conversations_are_rejected(self):
        too_long = self.ask("x" * 1001)
        ends_with_assistant = self.client.post(
            self.url, {"messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]}, format="json"
        )
        self.assertEqual(too_long.status_code, 400)
        self.assertEqual(ends_with_assistant.status_code, 400)
        self.create.assert_not_called()

    def test_long_conversations_keep_only_the_latest_turns(self):
        self.create.return_value = fake_response(text_block("OK"))
        self.ask(*[f"message {i}" for i in range(21)])
        messages = self.create.call_args.kwargs["messages"]
        self.assertLessEqual(len(messages), 12)
        self.assertEqual(messages[0]["role"], "user")

    def test_status_reports_enabled(self):
        self.assertEqual(self.client.get(self.url).data, {"enabled": True})

    @override_settings(ANTHROPIC_API_KEY="")
    def test_switched_off_without_an_api_key(self):
        self.assertEqual(self.client.get(self.url).data, {"enabled": False})
        response = self.ask("Hello")
        self.assertEqual(response.status_code, 503)
        self.create.assert_not_called()
