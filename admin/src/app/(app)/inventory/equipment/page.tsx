"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { CellLink, rel } from "@/lib/fields";
import { date } from "@/lib/format";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/inventory/equipment/",
  module: "inventory",
  singular: t("Equipment"),
  searchPlaceholder: t("Search name, code, serial…"),
  defaultOrdering: "name",
  filters: [
    { name: "status", label: t("Status"), options: CHOICES.equipmentStatus },
    { name: "kind", label: t("Type"), options: CHOICES.equipmentKind },
  ],
  columns: [
    {
      key: "name",
      header: t("Equipment"),
      sort: "name",
      render: (r) => (
        <div>
          <p className="font-medium text-stone-900">{r.name}</p>
          <p className="text-xs text-stone-500">{[choiceLabel(CHOICES.equipmentKind, r.kind), r.code].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.equipmentStatus, r.status)} /> },
    { key: "project_code", header: t("Location"), render: (r) => (r.project ? <CellLink href={`/projects/${r.project}`}>{r.project_code}</CellLink> : r.location || "—") },
    {
      key: "next_service_date",
      header: t("Next service"),
      sort: "next_service_date",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {date(r.next_service_date)} {r.service_due && <Badge tone="warning">{t("due")}</Badge>}
        </span>
      ),
    },
  ],
  fields: [
    { name: "name", label: t("Name"), required: true },
    { name: "kind", label: t("Type"), type: "select", options: CHOICES.equipmentKind, required: true },
    { name: "code", label: t("Inventory code") },
    { name: "serial_number", label: t("Serial number") },
    { name: "status", label: t("Status"), type: "select", options: CHOICES.equipmentStatus, required: true },
    rel.project({ label: t("Assigned to project") }),
    { name: "location", label: t("Location"), placeholder: t("e.g. Main warehouse") },
    { name: "purchase_date", label: t("Purchase date"), type: "date" },
    { name: "purchase_cost", label: t("Purchase cost (GEL)"), type: "number", step: "0.01" },
    { name: "last_service_date", label: t("Last service"), type: "date" },
    { name: "next_service_date", label: t("Next service"), type: "date" },
    { name: "notes", label: t("Notes"), type: "textarea" },
  ],
  createDefaults: { kind: "tool", status: "available" },
};

export default function EquipmentPage() {
  return <ResourcePage title={t("Equipment")} description={t("Machines, tools, vehicles and scaffolding sets — where they are and when they need service.")} config={config} />;
}
