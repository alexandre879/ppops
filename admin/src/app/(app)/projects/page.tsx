"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { ProgressBar } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { date, money } from "@/lib/format";
import { projectFields } from "@/lib/forms";
import { t } from "@/lib/i18n";

export default function ProjectsPage() {
  const { can } = useAuth();
  const finance = can("finance");

  const config: ResourceConfig = {
    endpoint: "/projects/",
    module: "projects",
    singular: t("Project"),
    searchPlaceholder: t("Search code, title, city, customer…"),
    filters: [
      { name: "status", label: t("Status"), options: CHOICES.projectStatus },
      { name: "priority", label: t("Priority"), options: CHOICES.priority },
      { name: "overdue", label: t("Overdue"), options: [{ value: "true", label: t("Overdue only") }] },
    ],
    columns: [
      {
        key: "title",
        header: t("Project"),
        sort: "title",
        render: (r) => (
          <div>
            <p className="font-medium text-stone-900">{r.title}</p>
            <p className="text-xs text-stone-500">
              <span className="font-mono">{r.code}</span>
              {r.customer_name ? ` · ${r.customer_name}` : ""}
              {r.city ? ` · ${r.city}` : ""}
            </p>
          </div>
        ),
      },
      { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.projectStatus, r.status)} /> },
      {
        key: "progress",
        header: t("Progress"),
        sort: "progress",
        render: (r) => (
          <div className="flex w-32 items-center gap-2">
            <ProgressBar value={r.progress} tone={r.status === "completed" ? "success" : "brand"} />
            <span className="w-9 text-right text-xs tabular-nums text-stone-600">{r.progress}%</span>
          </div>
        ),
      },
      {
        key: "deadline",
        header: t("Deadline"),
        sort: "deadline",
        render: (r) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {date(r.deadline)} {r.is_overdue && <Badge tone="danger">{t("overdue")}</Badge>}
          </span>
        ),
      },
      { key: "manager_name", header: t("Manager") },
      ...(finance
        ? [
            { key: "budget", header: t("Budget"), sort: "budget", align: "right" as const, render: (r: Record<string, unknown>) => money(r.budget as number) },
            {
              key: "budget_used_percent",
              header: t("Spent"),
              align: "right" as const,
              render: (r: Record<string, unknown>) => {
                const pct = r.budget_used_percent as number | null;
                return pct === null ? "—" : <span className={pct > 100 ? "font-semibold text-red-600" : ""}>{pct}%</span>;
              },
            },
          ]
        : []),
    ],
    fields: projectFields,
    createDefaults: { status: "planned", priority: "normal", building_type: "residential" },
    detailHref: (r) => `/projects/${r.id}`,
    afterCreate: (r) => `/projects/${r.id}`,
    allowEdit: false,
  };

  return <ResourcePage title={t("Projects")} description={t("Construction projects, status, teams and deadlines.")} config={config} />;
}
