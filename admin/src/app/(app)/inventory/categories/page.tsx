"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/inventory/categories/",
  module: "inventory",
  singular: t("Category"),
  searchPlaceholder: t("Search categories…"),
  defaultOrdering: "name",
  columns: [
    { key: "name", header: t("Category"), sort: "name", render: (r) => <span className="font-medium text-stone-900">{r.name}</span> },
    { key: "description", header: t("Description") },
    { key: "material_count", header: t("Materials"), align: "right" },
  ],
  fields: [
    { name: "name", label: t("Name"), type: "translated", required: true },
    { name: "description", label: t("Description"), type: "translated", input: "textarea" },
  ],
};

export default function MaterialCategoriesPage() {
  return <ResourcePage title={t("Material categories")} config={config} />;
}
