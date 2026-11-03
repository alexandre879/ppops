"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { money, unit } from "@/lib/format";
import { serviceFields } from "@/lib/forms";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/catalog/services/",
  module: "services",
  singular: t("Service"),
  searchPlaceholder: t("Search services…"),
  filters: [
    { name: "category", label: t("Category"), endpoint: "/catalog/categories/" },
    { name: "is_published", label: t("Published"), options: [{ value: "true", label: t("Published") }, { value: "false", label: t("Hidden") }] },
  ],
  columns: [
    {
      key: "title",
      header: t("Service"),
      sort: "title",
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.image ? <img src={r.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-stone-100" />}
          <div>
            <p className="font-medium text-stone-900">{r.title}</p>
            <p className="text-xs text-stone-500">{r.category_name}</p>
          </div>
        </div>
      ),
    },
    { key: "price_from", header: t("Price from"), sort: "price_from", align: "right", render: (r) => (r.price_from ? `${money(r.price_from)} / ${unit(r.unit)}` : <span className="text-stone-400">{t("on request")}</span>) },
    { key: "recipe", header: t("Estimator"), render: (r) => (r.recipe?.length ? t("Materials: {count} · {hours} h/{unit}", { count: r.recipe.length, hours: r.labour_hours_per_unit, unit: unit(r.unit) }) : <span className="text-stone-400">{t("not set up")}</span>) },
    {
      key: "is_published",
      header: t("Website"),
      render: (r) => (
        <span className="flex gap-1">
          {r.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>}
          {r.is_featured && <Badge tone="progress">{t("featured")}</Badge>}
        </span>
      ),
    },
  ],
  fields: serviceFields,
  createDefaults: { unit: "m2", is_published: true, order: 0, labour_hours_per_unit: 0 },
  detailHref: (r) => `/services/${r.id}`,
  afterCreate: (r) => `/services/${r.id}`,
  allowEdit: false,
  modalSize: "lg",
};

export default function ServicesPage() {
  return <ResourcePage title={t("Services")} description={t("Services shown on the website, with pricing and estimator recipes.")} config={config} />;
}
