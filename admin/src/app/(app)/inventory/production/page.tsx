"use client";

import { CircleCheck } from "lucide-react";
import { toast } from "sonner";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { CellLink, rel } from "@/lib/fields";
import { date, money, qty, unit } from "@/lib/format";
import { useInvalidate } from "@/lib/hooks";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function ProductionPage() {
  const { can } = useAuth();
  const invalidate = useInvalidate();

  async function complete(row: Row) {
    try {
      await api(`/inventory/production-orders/${row.id}/complete/`, { method: "POST" });
      toast.success(t("{number} completed — {amount} added to stock", { number: row.number, amount: `${qty(row.quantity)} ${unit(row.product_unit)}` }));
      await invalidate("/inventory/production-orders/", "/inventory/products/");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const config: ResourceConfig = {
    endpoint: "/inventory/production-orders/",
    module: "inventory",
    singular: t("Production order"),
    searchPlaceholder: t("Search order no., product…"),
    filters: [{ name: "status", label: t("Status"), options: CHOICES.productionStatus }],
    columns: [
      { key: "number", header: t("Order"), sort: "created_at", render: (r) => <span className="font-mono text-xs font-semibold">{r.number}</span> },
      { key: "product_name", header: t("Product"), render: (r) => <span className="font-medium text-stone-900">{r.product_name}</span> },
      { key: "quantity", header: t("Quantity"), align: "right", render: (r) => `${qty(r.quantity)} ${unit(r.product_unit)}` },
      {
        key: "status",
        header: t("Status"),
        render: (r) => (
          <span className="inline-flex gap-1">
            <StatusBadge status={r.status} label={choiceLabel(CHOICES.productionStatus, r.status)} />
            {r.stock_posted && <Badge tone="success">{t("in stock")}</Badge>}
          </span>
        ),
      },
      { key: "due_date", header: t("Due"), sort: "due_date", render: (r) => date(r.due_date) },
      { key: "responsible_name", header: t("Responsible") },
      { key: "project_code", header: t("Project"), render: (r) => (r.project ? <CellLink href={`/projects/${r.project}`}>{r.project_code}</CellLink> : "—") },
      { key: "total_cost", header: t("Cost"), align: "right", render: (r) => money(r.total_cost) },
    ],
    rowActions: (row) =>
      can("inventory", "write") && !row.stock_posted && row.status !== "cancelled" ? (
        <Button variant="secondary" size="sm" icon={<CircleCheck className="h-3.5 w-3.5" />} onClick={() => complete(row)}>
          {t("Complete")}
        </Button>
      ) : null,
    fields: [
      rel.product({ required: true }),
      { name: "quantity", label: t("Quantity"), type: "number", step: "0.001", required: true },
      { name: "status", label: t("Status"), type: "select", options: CHOICES.productionStatus, required: true, help: t("Completing adds the quantity to product stock.") },
      { ...rel.employee({ name: "responsible", label: t("Responsible") }) },
      { name: "start_date", label: t("Start date"), type: "date" },
      { name: "due_date", label: t("Due date"), type: "date" },
      rel.project({ help: t("If produced for a specific project.") }),
      { name: "material_cost", label: t("Material cost (GEL)"), type: "number", step: "0.01" },
      { name: "labour_cost", label: t("Labour cost (GEL)"), type: "number", step: "0.01" },
      { name: "notes", label: t("Notes"), type: "textarea" },
    ],
    createDefaults: { status: "planned", material_cost: 0, labour_cost: 0 },
    invalidate: ["/inventory/products/"],
  };

  return <ResourcePage title={t("Production")} description={t("Production orders for the manufacturing facility.")} config={config} />;
}
