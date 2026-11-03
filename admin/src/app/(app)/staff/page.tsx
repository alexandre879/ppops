"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { StatusBadge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { date, initials, money } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function EmployeesPage() {
  const { can } = useAuth();
  const config: ResourceConfig = {
    endpoint: "/staff/employees/",
    module: "staff",
    singular: t("Employee"),
    searchPlaceholder: t("Search name, position, phone…"),
    defaultOrdering: "last_name",
    filters: [{ name: "status", label: t("Status"), options: CHOICES.employeeStatus }],
    columns: [
      {
        key: "full_name",
        header: t("Employee"),
        sort: "last_name",
        render: (r) => (
          <div className="flex items-center gap-3">
            {r.photo ? (
              <img src={r.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">{initials(r.full_name)}</span>
            )}
            <div>
              <p className="font-medium text-stone-900">{r.full_name}</p>
              <p className="text-xs text-stone-500">{r.position || "—"}</p>
            </div>
          </div>
        ),
      },
      { key: "phone", header: t("Phone") },
      { key: "team_names", header: t("Teams"), render: (r) => (r.team_names?.length ? r.team_names.join(", ") : "—") },
      { key: "hire_date", header: t("Hired"), sort: "hire_date", render: (r) => date(r.hire_date) },
      ...(can("finance") ? [{ key: "daily_rate", header: t("Daily rate"), sort: "daily_rate", align: "right" as const, render: (r: Record<string, unknown>) => money(r.daily_rate as number) }] : []),
      { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.employeeStatus, r.status)} /> },
    ],
    fields: [
      { name: "first_name", label: t("First name"), required: true },
      { name: "last_name", label: t("Last name"), required: true },
      { name: "position", label: t("Position") },
      { name: "status", label: t("Status"), type: "select", options: CHOICES.employeeStatus, required: true },
      { name: "phone", label: t("Phone"), type: "tel" },
      { name: "email", label: t("Email"), type: "email" },
      { name: "hire_date", label: t("Hire date"), type: "date" },
      { name: "daily_rate", label: t("Daily rate (GEL)"), type: "number", step: "0.01" },
      { name: "user", label: t("Platform account"), type: "relation", endpoint: "/users/", optionLabel: (r) => String(r.full_name || r.email), help: t("Link if this person signs in to the platform.") },
      { name: "photo", label: t("Photo"), type: "image" },
      { name: "notes", label: t("Notes"), type: "textarea" },
    ],
    createDefaults: { status: "active", daily_rate: 0 },
  };
  return <ResourcePage title={t("Employees")} description={t("Workers and office staff. Assign them to teams and projects.")} config={config} />;
}
