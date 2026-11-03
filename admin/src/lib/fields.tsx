import Link from "next/link";

import type { FieldDef } from "@/components/resource-form";

import { t } from "./i18n";
import type { Row } from "./types";

/** Option labels for relation selects. */
export const labels = {
  customer: (r: Row) => String(r.name),
  project: (r: Row) => `${r.code} — ${r.title}`,
  service: (r: Row) => String(r.title),
  material: (r: Row) => `${r.name} (${r.sku})`,
  product: (r: Row) => String(r.name),
  employee: (r: Row) => String(r.full_name),
  user: (r: Row) => String(r.full_name || r.email),
  quotation: (r: Row) => `${r.number} — ${r.title}`,
  enquiry: (r: Row) => `${r.name}${r.service_title ? ` — ${r.service_title}` : ""}`,
};

type RelationOptions = { name?: string; label?: string; required?: boolean; help?: string };

function relation(endpoint: string, defaults: { name: string; label: string }, optionLabel: (r: Row) => string) {
  return ({ name = defaults.name, label = defaults.label, required, help }: RelationOptions = {}): FieldDef => ({
    name,
    label,
    type: "relation",
    endpoint,
    optionLabel,
    required,
    help,
  });
}

export const rel = {
  customer: relation("/crm/customers/", { name: "customer", label: t("Customer") }, labels.customer),
  project: relation("/projects/", { name: "project", label: t("Project") }, labels.project),
  service: relation("/catalog/services/", { name: "service", label: t("Service") }, labels.service),
  material: relation("/inventory/materials/", { name: "material", label: t("Material") }, labels.material),
  product: relation("/inventory/products/", { name: "product", label: t("Product") }, labels.product),
  employee: relation("/staff/employees/", { name: "employee", label: t("Employee") }, labels.employee),
  user: relation("/users/", { name: "assigned_to", label: t("Assigned to") }, labels.user),
  quotation: relation("/quotations/", { name: "quotation", label: t("Quotation") }, labels.quotation),
};

/** A link cell that doesn't trigger the row click. */
export function CellLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className="font-medium text-stone-900 hover:text-brand-700 hover:underline">
      {children}
    </Link>
  );
}
