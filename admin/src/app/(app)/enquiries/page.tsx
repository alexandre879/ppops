"use client";

import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { CellLink, labels, rel } from "@/lib/fields";
import { dateTime } from "@/lib/format";
import { useInvalidate } from "@/lib/hooks";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

export default function EnquiriesPage() {
  const invalidate = useInvalidate();

  async function convert(row: Row) {
    try {
      await api(`/crm/enquiries/${row.id}/convert/`, { method: "POST" });
      toast.success(t("{name} added to customers", { name: row.name }));
      await invalidate("/crm/enquiries/", "/crm/customers/");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const config: ResourceConfig = {
    endpoint: "/crm/enquiries/",
    module: "crm",
    singular: t("Enquiry"),
    searchPlaceholder: t("Search name, phone, message…"),
    filters: [
      { name: "status", label: t("Status"), options: CHOICES.enquiryStatus },
      { name: "source", label: t("Source"), options: CHOICES.source },
    ],
    columns: [
      { key: "created_at", header: t("Received"), sort: "created_at", render: (r) => <span className="whitespace-nowrap text-stone-500">{dateTime(r.created_at)}</span> },
      {
        key: "name",
        header: t("Contact"),
        render: (r) => (
          <div>
            <p className="font-medium text-stone-900">{r.name}</p>
            <p className="text-xs text-stone-500">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
          </div>
        ),
      },
      { key: "service_title", header: t("Service"), render: (r) => r.service_title ?? r.subject ?? "—" },
      { key: "message", header: t("Message"), render: (r) => <p className="line-clamp-2 max-w-sm text-stone-600">{r.message || "—"}</p> },
      { key: "status", header: t("Status"), sort: "status", render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.enquiryStatus, r.status)} /> },
      { key: "customer", header: t("Customer"), render: (r) => (r.customer ? <CellLink href={`/customers/${r.customer}`}>{r.customer_name}</CellLink> : "—") },
    ],
    rowActions: (row) =>
      !row.customer ? (
        <Button variant="secondary" size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => convert(row)}>
          {t("To customer")}
        </Button>
      ) : null,
    fields: [
      { name: "name", label: t("Name"), required: true },
      { name: "company", label: t("Company") },
      { name: "phone", label: t("Phone"), type: "tel" },
      { name: "email", label: t("Email"), type: "email" },
      { ...rel.service({ label: t("Service of interest") }), optionLabel: labels.service },
      { name: "location", label: t("Project location") },
      { name: "message", label: t("Message"), type: "textarea" },
      { name: "source", label: t("Source"), type: "select", options: CHOICES.source, required: true },
      { name: "status", label: t("Status"), type: "select", options: CHOICES.enquiryStatus, required: true },
      rel.user(),
      { name: "internal_notes", label: t("Internal notes"), type: "textarea" },
    ],
    createDefaults: { source: "phone", status: "new" },
  };

  return <ResourcePage title={t("Enquiries")} description={t("Requests from the website and phone. Convert promising ones into customers.")} config={config} />;
}
