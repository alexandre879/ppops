"use client";

import { ResourcePage, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { dateTime } from "@/lib/format";
import { t } from "@/lib/i18n";

const config: ResourceConfig = {
  endpoint: "/users/",
  module: "users",
  singular: t("User"),
  searchPlaceholder: t("Search name or email…"),
  filters: [{ name: "role", label: t("Role"), options: CHOICES.role }],
  columns: [
    {
      key: "full_name",
      header: t("User"),
      sort: "first_name",
      render: (r) => (
        <div>
          <p className="font-medium text-stone-900">{r.full_name || "—"}</p>
          <p className="text-xs text-stone-500">{r.email}</p>
        </div>
      ),
    },
    { key: "role", header: t("Role"), render: (r) => choiceLabel(CHOICES.role, r.role) },
    { key: "language", header: t("Language"), render: (r) => CHOICES.language.find((l) => l.value === r.language)?.label ?? r.language },
    { key: "phone", header: t("Phone") },
    { key: "last_login", header: t("Last sign-in"), sort: "last_login", render: (r) => dateTime(r.last_login) },
    { key: "is_active", header: t("Status"), render: (r) => (r.is_active ? <Badge tone="success">{t("active")}</Badge> : <Badge>{t("disabled")}</Badge>) },
  ],
  fields: [
    { name: "email", label: t("Email"), type: "email", required: true },
    { name: "role", label: t("Role"), type: "select", options: CHOICES.role, required: true },
    { name: "first_name", label: t("First name") },
    { name: "last_name", label: t("Last name") },
    { name: "phone", label: t("Phone"), type: "tel" },
    { name: "language", label: t("Interface language"), type: "select", options: CHOICES.language, required: true },
    { name: "password", label: t("Password"), type: "password", required: true, createOnly: true, help: t("At least 8 characters, not too common.") },
    { name: "password", label: t("Set a new password"), type: "password", editOnly: true, help: t("Leave empty to keep the current password.") },
    { name: "is_active", label: t("Account active"), type: "checkbox" },
  ],
  createDefaults: { role: "staff", is_active: true, language: "ka" },
};

const ROLE_HELP = t(
  "Administrators: everything · Project managers: projects, finance, CRM, quotes, inventory, staff · Sales: CRM & quotations · Production: inventory & manufacturing · Site staff: projects (read only).",
);

export default function UsersPage() {
  return <ResourcePage title={t("User accounts")} description={ROLE_HELP} config={config} />;
}
