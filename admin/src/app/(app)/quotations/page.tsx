"use client";

import { Calculator } from "lucide-react";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/ui";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { rel } from "@/lib/fields";
import { date, money } from "@/lib/format";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/quotations/",
  module: "quotes",
  singular: t("Quotation"),
  searchPlaceholder: t("Search number, title, customer…"),
  filters: [{ name: "status", label: t("Status"), options: CHOICES.quoteStatus }],
  columns: [
    { key: "number", header: t("Number"), sort: "created_at", render: (r) => <span className="font-mono text-xs font-semibold">{r.number}</span> },
    {
      key: "title",
      header: t("Quotation"),
      render: (r) => (
        <div>
          <p className="font-medium text-stone-900">{r.title}</p>
          <p className="text-xs text-stone-500">{r.customer_name}</p>
        </div>
      ),
    },
    { key: "issue_date", header: t("Issued"), sort: "issue_date", render: (r) => date(r.issue_date) },
    {
      key: "valid_until",
      header: t("Valid until"),
      sort: "valid_until",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {date(r.valid_until)} {r.is_expired && <Badge tone="warning">{t("expired")}</Badge>}
        </span>
      ),
    },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.quoteStatus, r.status)} /> },
    { key: "total", header: t("Total"), sort: "total", align: "right", render: (r) => <span className="font-semibold">{money(r.total)}</span> },
  ],
  fields: [
    { name: "title", label: t("Title"), required: true, span: 2, placeholder: t("e.g. Façade insulation — 3-storey house") },
    rel.customer({ required: true }),
    { name: "site_address", label: t("Site address") },
  ],
  detailHref: (r) => `/quotations/${r.id}`,
  afterCreate: (r) => `/quotations/${r.id}`,
  allowEdit: false,
};

export default function QuotationsPage() {
  return (
    <ResourcePage
      title={t("Quotations")}
      description={t("Itemised offers with material and labour estimates. Open a quotation to edit items and download the PDF.")}
      config={config}
      actions={
        <LinkButton href="/estimator" variant="secondary">
          <Calculator className="h-4 w-4" aria-hidden /> {t("Cost estimator")}
        </LinkButton>
      }
    />
  );
}
