"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RecordModal, ResourcePage, saveRecord, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { CHOICES } from "@/lib/choices";
import { money, qty, unit } from "@/lib/format";
import { movementFields } from "@/lib/forms";
import { useInvalidate } from "@/lib/hooks";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function MaterialsPage() {
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [moving, setMoving] = useState<Row | "new" | null>(null);

  const config: ResourceConfig = {
    endpoint: "/inventory/materials/",
    module: "inventory",
    singular: t("Material"),
    searchPlaceholder: t("Search SKU, name, supplier…"),
    defaultOrdering: "name",
    filters: [
      { name: "category", label: t("Category"), endpoint: "/inventory/categories/" },
      { name: "low_stock", label: t("Stock"), options: [{ value: "true", label: t("Low stock only") }] },
    ],
    columns: [
      { key: "sku", header: t("SKU"), sort: "sku", render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
      { key: "name", header: t("Material"), sort: "name", render: (r) => (<div><p className="font-medium text-stone-900">{r.name}</p><p className="text-xs text-stone-500">{r.category_name ?? t("Uncategorised")}</p></div>) },
      {
        key: "quantity",
        header: t("In stock"),
        sort: "quantity",
        align: "right",
        render: (r) => (
          <span className="inline-flex items-center gap-1.5">
            {r.is_low_stock && <Badge tone="warning">{t("low")}</Badge>}
            <span className={r.is_low_stock ? "font-semibold text-amber-700" : ""}>
              {qty(r.quantity)} {unit(r.unit)}
            </span>
          </span>
        ),
      },
      { key: "min_quantity", header: t("Minimum"), align: "right", render: (r) => `${qty(r.min_quantity)} ${unit(r.unit)}` },
      { key: "unit_cost", header: t("Unit cost"), sort: "unit_cost", align: "right", render: (r) => money(r.unit_cost) },
      { key: "stock_value", header: t("Stock value"), align: "right", render: (r) => money(r.stock_value) },
    ],
    rowActions: (row) =>
      can("inventory", "write") ? (
        <Button variant="ghost" size="sm" aria-label={t("Record stock movement")} title={t("Record stock movement")} icon={<ArrowLeftRight className="h-3.5 w-3.5" />} onClick={() => setMoving(row)} />
      ) : null,
    fields: [
      { name: "sku", label: t("SKU"), required: true },
      { name: "name", label: t("Name"), type: "translated", required: true },
      { name: "category", label: t("Category"), type: "relation", endpoint: "/inventory/categories/" },
      { name: "unit", label: t("Unit"), type: "select", options: CHOICES.materialUnit, required: true },
      { name: "unit_cost", label: t("Unit cost (GEL)"), type: "number", step: "0.01", help: t("Used to price estimates.") },
      { name: "min_quantity", label: t("Minimum stock"), type: "number", step: "0.001" },
      { name: "supplier", label: t("Supplier") },
      { name: "location", label: t("Storage location") },
      { name: "description", label: t("Description"), type: "textarea" },
      { name: "is_active", label: t("Active"), type: "checkbox" },
    ],
    createDefaults: { unit: "pcs", is_active: true, unit_cost: 0, min_quantity: 0 },
  };

  return (
    <>
      <ResourcePage
        title={t("Materials stock")}
        description={t("Construction materials, stock levels and unit costs used by the estimator. Stock changes are recorded as movements.")}
        config={config}
        actions={
          can("inventory", "write") ? (
            <Button variant="secondary" icon={<ArrowLeftRight className="h-4 w-4" />} onClick={() => setMoving("new")}>
              {t("Record movement")}
            </Button>
          ) : undefined
        }
      />
      <RecordModal
        open={moving !== null}
        onClose={() => setMoving(null)}
        title={moving && moving !== "new" ? `${t("Stock movement")} — ${moving.name}` : t("Record stock movement")}
        fields={movementFields}
        initial={{ movement_type: "in", material: moving && moving !== "new" ? moving.id : "" }}
        submitLabel={t("Record")}
        onSubmit={async (values) => {
          await saveRecord("/inventory/movements/", null, values);
          toast.success(t("Saved"));
          setMoving(null);
          await invalidate("/inventory/materials/", "/inventory/movements/");
        }}
      />
    </>
  );
}
