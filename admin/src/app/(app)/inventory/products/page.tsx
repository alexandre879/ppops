"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { money, qty, unit } from "@/lib/format";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/inventory/products/",
  module: "inventory",
  singular: t("Product"),
  searchPlaceholder: t("Search products…"),
  filters: [{ name: "category", label: t("Category"), options: CHOICES.productCategory }],
  columns: [
    {
      key: "name",
      header: t("Product"),
      sort: "name",
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.image ? <img src={r.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-stone-100" />}
          <div>
            <p className="font-medium text-stone-900">{r.name}</p>
            <p className="font-mono text-xs text-stone-500">{r.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: t("Category"), render: (r) => choiceLabel(CHOICES.productCategory, r.category) },
    {
      key: "quantity",
      header: t("In stock"),
      sort: "quantity",
      align: "right",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.is_low_stock && <Badge tone="warning">{t("low")}</Badge>}
          {qty(r.quantity)} {unit(r.unit)}
        </span>
      ),
    },
    { key: "sale_price", header: t("Sale price"), align: "right", render: (r) => money(r.sale_price) },
    { key: "rental_price_per_day", header: t("Rent / day"), align: "right", render: (r) => money(r.rental_price_per_day) },
    { key: "is_published", header: t("Website"), render: (r) => (r.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>) },
  ],
  fields: [
    { name: "name", label: t("Name"), type: "translated", required: true },
    { name: "sku", label: t("SKU"), required: true },
    { name: "category", label: t("Category"), type: "select", options: CHOICES.productCategory, required: true },
    { name: "unit", label: t("Unit"), type: "select", options: CHOICES.materialUnit, required: true },
    { name: "description", label: t("Description"), type: "translated", input: "textarea" },
    { name: "standard", label: t("Standard"), type: "translated", placeholder: t("e.g. EN 12810 / EN 12811") },
    { name: "unit_cost", label: t("Production cost (GEL)"), type: "number", step: "0.01" },
    { name: "sale_price", label: t("Sale price (GEL)"), type: "number", step: "0.01" },
    { name: "rental_price_per_day", label: t("Rental price / day (GEL)"), type: "number", step: "0.01" },
    { name: "quantity", label: t("In stock"), type: "number", step: "0.001", help: t("Production orders add to this automatically.") },
    { name: "min_quantity", label: t("Minimum stock"), type: "number", step: "0.001" },
    { name: "order", label: t("Display order"), type: "number", step: "1" },
    { name: "image", label: t("Image"), type: "image" },
    { name: "is_published", label: t("Show on the website manufacturing page"), type: "checkbox" },
  ],
  createDefaults: { category: "scaffolding", unit: "set", unit_cost: 0, quantity: 0, min_quantity: 0, order: 0 },
  modalSize: "lg",
};

export default function ProductsPage() {
  return (
    <ResourcePage
      title={t("Manufactured products")}
      description={t("Scaffolding, formwork, railings, staircases and furniture produced in the company's own facility.")}
      config={config}
    />
  );
}
