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
    {
      key: "name",
      header: t("Category"),
      sort: "name",
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.image ? <img src={r.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-stone-100" />}
          <span className="font-medium text-stone-900">{r.name}</span>
        </div>
      ),
    },
    { key: "description", header: t("Description"), render: (r) => <p className="line-clamp-2 max-w-md text-stone-600">{r.description}</p> },
    { key: "service_count", header: t("Services"), align: "right" },
    { key: "is_published", header: t("Website"), render: (r) => (r.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>) },
  ],
  fields: [
    { name: "name", label: t("Name"), type: "translated", required: true },
    { name: "icon", label: t("Icon"), type: "select", options: CHOICES.categoryIcon, required: true },
    { name: "description", label: t("Description"), type: "translated", input: "textarea" },
    { name: "image", label: t("Image"), type: "image", help: t("Shown at the top of the category card on the website home page.") },
    { name: "order", label: t("Display order"), type: "number", step: "1" },
    { name: "is_published", label: t("Published on website"), type: "checkbox" },
  ],
  createDefaults: { icon: "building", is_published: true, order: 0 },
};

export default function CategoriesPage() {
  return <ResourcePage title={t("Service categories")} description={t("Groups of services on the website and in the admin.")} config={config} />;
}
