"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { labels, rel } from "@/lib/fields";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/staff/teams/",
  module: "staff",
  singular: t("Team"),
  searchPlaceholder: t("Search teams…"),
  defaultOrdering: "name",
  filters: [{ name: "specialization", label: t("Specialisation"), options: CHOICES.specialization }],
  columns: [
    { key: "name", header: t("Team"), sort: "name", render: (r) => <span className="font-medium text-stone-900">{r.name}</span> },
    { key: "specialization", header: t("Specialisation"), render: (r) => choiceLabel(CHOICES.specialization, r.specialization) },
    { key: "leader_name", header: t("Leader") },
    {
      key: "members_detail",
      header: t("Members"),
      render: (r) => (
        <span className="text-stone-600">
          {r.member_count} · {(r.members_detail as Row[]).slice(0, 3).map((m) => m.full_name).join(", ")}
          {r.member_count > 3 ? "…" : ""}
        </span>
      ),
    },
    { key: "is_active", header: t("Status"), render: (r) => (r.is_active ? <Badge tone="success">{t("active")}</Badge> : <Badge>{t("inactive")}</Badge>) },
  ],
  fields: [
    { name: "name", label: t("Team name"), required: true },
    { name: "specialization", label: t("Specialisation"), type: "select", options: CHOICES.specialization, required: true },
    rel.employee({ name: "leader", label: t("Team leader") }),
    { name: "is_active", label: t("Active"), type: "checkbox" },
    { name: "members", label: t("Members"), type: "multirelation", endpoint: "/staff/employees/", optionLabel: labels.employee },
    { name: "description", label: t("Description"), type: "textarea" },
  ],
  createDefaults: { specialization: "general", is_active: true },
  modalSize: "lg",
};

export default function TeamsPage() {
  return <ResourcePage title={t("Teams")} description={t("Construction and workshop teams that are assigned to projects.")} config={config} />;
}
