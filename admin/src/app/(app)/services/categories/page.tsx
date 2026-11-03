"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES } from "@/lib/choices";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/catalog/categories/",
  module: "services",
  singular: t("Category"),
  defaultOrdering: "order",
  columns: [
    { key: "order", header: t("#"), sort: "order", className: "w-12 text-stone-400" },
    { key: "name", header: t("Category"), sort: "name", render: (r) => <span className="font-medium text-stone-900">{r.name}</span> },
    { key: "description", header: t("Description"), render: (r) => <p className="line-clamp-2 max-w-md text-stone-600">{r.description}</p> },
    { key: "service_count", header: t("Services"), align: "right" },
    { key: "is_published", header: t("Website"), render: (r) => (r.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>) },
  ],
  fields: [
    { name: "name", label: t("Name"), type: "translated", required: true },
    { name: "icon", label: t("Icon"), type: "select", options: CHOICES.categoryIcon, required: true },
    { name: "description", label: t("Description"), type: "translated", input: "textarea" },
    { name: "order", label: t("Display order"), type: "number", step: "1" },
    { name: "is_published", label: t("Published on website"), type: "checkbox" },
  ],
  createDefaults: { icon: "building", is_published: true, order: 0 },
};

export default function CategoriesPage() {
  return <ResourcePage title={t("Service categories")} description={t("Groups of services on the website and in the admin.")} config={config} />;
}
