"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui";
import { downloadFile } from "@/lib/api";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { CellLink } from "@/lib/fields";
import { date, money } from "@/lib/format";
import { contractFields } from "@/lib/forms";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/crm/contracts/",
  module: "crm",
  singular: t("Contract"),
  searchPlaceholder: t("Search number, title, customer…"),
  filters: [{ name: "status", label: t("Status"), options: CHOICES.contractStatus }],
  columns: [
    { key: "number", header: t("Number"), sort: "created_at", render: (r) => <span className="font-mono text-xs font-semibold">{r.number}</span> },
    { key: "title", header: t("Title"), render: (r) => <span className="font-medium text-stone-900">{r.title}</span> },
    { key: "customer_name", header: t("Customer"), render: (r) => <CellLink href={`/customers/${r.customer}`}>{r.customer_name}</CellLink> },
    { key: "project_code", header: t("Project"), render: (r) => (r.project ? <CellLink href={`/projects/${r.project}`}>{r.project_code}</CellLink> : "—") },
    { key: "signed_date", header: t("Signed"), sort: "signed_date", render: (r) => date(r.signed_date) },
    { key: "end_date", header: t("Ends"), sort: "end_date", render: (r) => date(r.end_date) },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.contractStatus, r.status)} /> },
    { key: "value", header: t("Value"), sort: "value", align: "right", render: (r) => money(r.value) },
  ],
  rowActions: (row) =>
    row.download_url ? (
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("Download contract file")}
        icon={<Download className="h-3.5 w-3.5" />}
        onClick={() => downloadFile(row.download_url).catch((e: Error) => toast.error(e.message))}
      />
    ) : null,
  fields: contractFields,
  createDefaults: { status: "draft" },
  modalSize: "lg",
};

export default function ContractsPage() {
  return <ResourcePage title={t("Contracts")} description={t("Active and completed contracts. Files are stored privately.")} config={config} />;
}
