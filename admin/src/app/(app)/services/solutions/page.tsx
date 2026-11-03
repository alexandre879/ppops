"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/catalog/solutions/",
  module: "services",
  singular: t("Solution"),
  searchPlaceholder: t("Search materials & solutions…"),
  filters: [{ name: "kind", label: t("Type"), options: CHOICES.solutionKind }],
  columns: [
    { key: "name", header: t("Name"), sort: "name", render: (r) => <span className="font-medium text-stone-900">{r.name}</span> },
    { key: "kind", header: t("Type"), render: (r) => choiceLabel(CHOICES.solutionKind, r.kind) },
    { key: "description", header: t("Description"), render: (r) => <p className="line-clamp-2 max-w-md text-stone-600">{r.description || "—"}</p> },
    { key: "is_published", header: t("Website"), render: (r) => (r.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>) },
  ],
  fields: [
    { name: "name", label: t("Name"), type: "translated", required: true },
    { name: "kind", label: t("Type"), type: "select", options: CHOICES.solutionKind, required: true },
    { name: "description", label: t("Description"), type: "translated", input: "textarea" },
    { name: "order", label: t("Display order"), type: "number", step: "1" },
    { name: "image", label: t("Image"), type: "image" },
    { name: "is_published", label: t("Published on website"), type: "checkbox" },
  ],
  createDefaults: { kind: "cladding", is_published: true, order: 0 },
};

export default function SolutionsPage() {
  return (
    <ResourcePage
      title={t("Materials & solutions")}
      description={t("Cladding panels, insulation systems and decorative finishes offered to clients (shown on the website).")}
      config={config}
    />
  );
}
