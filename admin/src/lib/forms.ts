/** Form definitions shared between list pages and detail pages. */
import type { FieldDef } from "@/components/resource-form";

import { CHOICES } from "./choices";
import { labels, rel } from "./fields";
import { t } from "./i18n";

export const customerFields: FieldDef[] = [
  { name: "kind", label: t("Type"), type: "select", options: CHOICES.customerKind, required: true },
  { name: "name", label: t("Name / company"), required: true },
  { name: "contact_person", label: t("Contact person") },
  { name: "phone", label: t("Phone"), type: "tel" },
  { name: "secondary_phone", label: t("Second phone"), type: "tel" },
  { name: "email", label: t("Email"), type: "email" },
  { name: "city", label: t("City") },
  { name: "address", label: t("Address") },
  { name: "tax_id", label: t("Tax ID") },
  { name: "source", label: t("Source"), type: "select", options: CHOICES.source, required: true },
  { name: "status", label: t("Status"), type: "select", options: CHOICES.customerStatus, required: true },
  rel.user(),
  { name: "notes", label: t("Notes"), type: "textarea" },
];

export const contractFields: FieldDef[] = [
  { name: "title", label: t("Title"), required: true, span: 2 },
  rel.customer({ required: true }),
  rel.project(),
  rel.quotation(),
  { name: "value", label: t("Contract value (GEL)"), type: "number", step: "0.01" },
  { name: "status", label: t("Status"), type: "select", options: CHOICES.contractStatus, required: true },
  { name: "signed_date", label: t("Signed on"), type: "date" },
  { name: "start_date", label: t("Start date"), type: "date" },
  { name: "end_date", label: t("End date"), type: "date" },
  { name: "file", label: t("Signed contract (PDF, scan…)"), type: "file", fileNameField: "file_name" },
  { name: "notes", label: t("Notes"), type: "textarea" },
];

export const projectFields: FieldDef[] = [
  { name: "title", label: t("Project title"), type: "translated", required: true },
  rel.customer(),
  rel.user({ name: "manager", label: t("Project manager") }),
  { name: "status", label: t("Status"), type: "select", options: CHOICES.projectStatus, required: true },
  { name: "priority", label: t("Priority"), type: "select", options: CHOICES.priority, required: true },
  { name: "start_date", label: t("Start date"), type: "date" },
  { name: "deadline", label: t("Deadline"), type: "date" },
  { name: "budget", label: t("Budget (GEL)"), type: "number", step: "0.01" },
  { name: "progress", label: t("Progress (%)"), type: "number", step: "1", editOnly: true },
  { name: "city", label: t("City"), type: "translated" },
  { name: "address", label: t("Address") },
  { name: "building_type", label: t("Building type"), type: "select", options: CHOICES.buildingType, required: true },
  { name: "floors", label: t("Floors"), type: "number", step: "1" },
  { name: "area_m2", label: t("Area (m²)"), type: "number", step: "0.01" },
  { name: "completed_date", label: t("Completed on"), type: "date", editOnly: true },
  { name: "services", label: t("Services"), type: "multirelation", endpoint: "/catalog/services/", optionLabel: labels.service },
  { name: "teams", label: t("Teams"), type: "multirelation", endpoint: "/staff/teams/", editOnly: true },
  { name: "employees", label: t("Employees"), type: "multirelation", endpoint: "/staff/employees/", optionLabel: labels.employee, optionParams: { status: "active" }, editOnly: true },
  { name: "description", label: t("Internal description"), type: "textarea" },
  { name: "public_summary", label: t("Website summary"), type: "translated", input: "textarea", help: t("Shown in the public portfolio."), editOnly: true },
  { name: "cover_image", label: t("Cover image"), type: "image", editOnly: true },
  { name: "show_in_portfolio", label: t("Show in website portfolio"), type: "checkbox", editOnly: true },
  { name: "is_featured", label: t("Featured project"), type: "checkbox", editOnly: true },
];

export const serviceFields: FieldDef[] = [
  { name: "title", label: t("Title"), type: "translated", required: true },
  { name: "category", label: t("Category"), type: "relation", endpoint: "/catalog/categories/", required: true },
  { name: "summary", label: t("Short summary"), type: "translated", input: "textarea", rows: 2, help: t("Shown on service cards (max 300 characters).") },
  { name: "description", label: t("Full description"), type: "translated", input: "textarea", rows: 6, help: t("Separate paragraphs with an empty line.") },
  { name: "features", label: t("What's included"), type: "translated", input: "lines", help: t("One item per line.") },
  { name: "price_from", label: t("Price from (GEL)"), type: "number", step: "0.01", help: t("Leave empty to show “price on request”.") },
  { name: "unit", label: t("Unit"), type: "select", options: CHOICES.serviceUnit, required: true },
  { name: "labour_hours_per_unit", label: t("Labour hours per unit"), type: "number", step: "0.001", help: t("Used by the cost estimator.") },
  { name: "order", label: t("Display order"), type: "number", step: "1" },
  { name: "solutions", label: t("Materials & solutions"), type: "multirelation", endpoint: "/catalog/solutions/" },
  { name: "image", label: t("Main image"), type: "image" },
  { name: "is_published", label: t("Published on website"), type: "checkbox" },
  { name: "is_featured", label: t("Featured"), type: "checkbox" },
];

export const movementFields: FieldDef[] = [
  rel.material({ required: true }),
  { name: "movement_type", label: t("Movement"), type: "select", options: CHOICES.movementType, required: true },
  { name: "quantity", label: t("Quantity"), type: "number", step: "0.001", required: true, help: t("For a stock count, enter the counted quantity.") },
  { name: "unit_cost", label: t("Unit cost (GEL)"), type: "number", step: "0.01" },
  rel.project({ help: t("Optional — the site the material went to.") }),
  { name: "reference", label: t("Reference"), placeholder: t("Invoice / delivery note no.") },
  { name: "note", label: t("Note"), type: "textarea", rows: 2 },
];

export const quotationFields: FieldDef[] = [
  { name: "title", label: t("Title"), required: true, span: 2 },
  rel.customer({ required: true }),
  { name: "language", label: t("Quotation language"), type: "select", options: CHOICES.language, required: true, help: t("Language of the PDF and of estimated lines.") },
  { name: "site_address", label: t("Site address") },
  { name: "issue_date", label: t("Issue date"), type: "date" },
  { name: "valid_until", label: t("Valid until"), type: "date" },
  { name: "overhead_percent", label: t("Overhead %"), type: "number", step: "0.01", help: t("Applied to estimator lines.") },
  { name: "margin_percent", label: t("Margin %"), type: "number", step: "0.01", help: t("Applied to estimator lines.") },
  { name: "vat_percent", label: t("VAT %"), type: "number", step: "0.01" },
  { name: "discount_amount", label: t("Discount (GEL)"), type: "number", step: "0.01" },
  rel.project(),
  { name: "enquiry", label: t("Enquiry"), type: "relation", endpoint: "/crm/enquiries/", optionLabel: labels.enquiry },
  { name: "notes", label: t("Notes for the client"), type: "textarea" },
  { name: "terms", label: t("Terms & conditions"), type: "textarea", rows: 4 },
];
