"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { CellLink } from "@/lib/fields";
import { dateTime, qty, unit } from "@/lib/format";
import { movementFields } from "@/lib/forms";
import { t } from "@/lib/i18n";

const TONE = { in: "success", out: "info", adjust: "warning" } as const;

const config: ResourceConfig = {
  endpoint: "/inventory/movements/",
  module: "inventory",
  singular: t("Movement"),
  searchPlaceholder: t("Search material, reference…"),
  filters: [
    { name: "movement_type", label: t("Type"), options: CHOICES.movementType },
    { name: "material", label: t("Material"), endpoint: "/inventory/materials/" },
  ],
  columns: [
    { key: "created_at", header: t("Date"), sort: "created_at", render: (r) => <span className="whitespace-nowrap text-stone-500">{dateTime(r.created_at)}</span> },
    { key: "material_name", header: t("Material"), render: (r) => <span className="font-medium text-stone-900">{r.material_name}</span> },
    { key: "movement_type", header: t("Type"), render: (r) => <Badge tone={TONE[r.movement_type as keyof typeof TONE]}>{choiceLabel(CHOICES.movementType, r.movement_type)}</Badge> },
    {
      key: "quantity",
      header: t("Quantity"),
      sort: "quantity",
      align: "right",
      render: (r) => `${r.movement_type === "out" ? "−" : r.movement_type === "in" ? "+" : "="}${qty(r.quantity)} ${unit(r.material_unit)}`,
    },
    { key: "balance_after", header: t("Balance"), align: "right", render: (r) => `${qty(r.balance_after)} ${unit(r.material_unit)}` },
    { key: "project_code", header: t("Project"), render: (r) => (r.project ? <CellLink href={`/projects/${r.project}`}>{r.project_code}</CellLink> : "—") },
    { key: "reference", header: t("Reference") },
    { key: "created_by_name", header: t("By") },
  ],
  fields: movementFields,
  createDefaults: { movement_type: "in" },
  allowEdit: false,
  allowDelete: false,
  invalidate: ["/inventory/materials/"],
};

export default function MovementsPage() {
  return <ResourcePage title={t("Stock movements")} description={t("Append-only ledger of deliveries, site issues and stock counts.")} config={config} />;
}
