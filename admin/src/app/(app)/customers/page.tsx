"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { StatusBadge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { customerFields } from "@/lib/forms";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/crm/customers/",
  module: "crm",
  singular: t("Customer"),
  searchPlaceholder: t("Search name, phone, email, tax ID…"),
  defaultOrdering: "name",
  filters: [
    { name: "status", label: t("Status"), options: CHOICES.customerStatus },
    { name: "kind", label: t("Type"), options: CHOICES.customerKind },
    { name: "source", label: t("Source"), options: CHOICES.source },
  ],
  columns: [
    {
      key: "name",
      header: t("Customer"),
      sort: "name",
      render: (r) => (
        <div>
          <p className="font-medium text-stone-900">{r.name}</p>
          <p className="text-xs text-stone-500">{r.kind === "company" ? r.contact_person || t("Company") : t("Individual")}</p>
        </div>
      ),
    },
    { key: "phone", header: t("Phone") },
    { key: "email", header: t("Email") },
    { key: "city", header: t("City") },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.customerStatus, r.status)} /> },
    { key: "projects_count", header: t("Projects"), align: "right" },
    { key: "quotations_count", header: t("Quotes"), align: "right" },
  ],
  fields: customerFields,
  createDefaults: { kind: "individual", source: "phone", status: "lead" },
  detailHref: (r) => `/customers/${r.id}`,
  afterCreate: (r) => `/customers/${r.id}`,
  allowEdit: false,
};

export default function CustomersPage() {
  return <ResourcePage title={t("Customers")} description={t("Clients, potential clients and their history.")} config={config} />;
}
