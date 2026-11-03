/** Choice lists mirroring the Django models (value, label in the interface language). */
import { LANGUAGES, t } from "./i18n";

type Choices = { value: string; label: string }[];

const c = (pairs: [string, string][]): Choices => pairs.map(([value, label]) => ({ value, label: t(label) }));

export const CHOICES = {
  role: c([["admin", "Administrator"], ["manager", "Project manager"], ["sales", "Sales & estimating"], ["production", "Production & warehouse"], ["staff", "Site staff"]]),
  projectStatus: c([["planned", "Planned"], ["in_progress", "In progress"], ["on_hold", "On hold"], ["completed", "Completed"], ["cancelled", "Cancelled"]]),
  priority: c([["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent"]]),
  buildingType: c([["house", "Private house"], ["residential", "Residential building"], ["commercial", "Commercial"], ["industrial", "Industrial"], ["public", "Public building"], ["other", "Other"]]),
  photoStage: c([["before", "Before"], ["progress", "In progress"], ["after", "Completed"]]),
  documentKind: c([["contract", "Contract"], ["drawing", "Drawing / design"], ["permit", "Permit"], ["estimate", "Estimate"], ["invoice", "Invoice"], ["report", "Report / act"], ["other", "Other"]]),
  expenseCategory: c([["materials", "Materials"], ["labour", "Labour"], ["equipment", "Equipment & rental"], ["transport", "Transport"], ["subcontractor", "Subcontractor"], ["permits", "Permits & fees"], ["other", "Other"]]),
  paymentMethod: c([["bank_transfer", "Bank transfer"], ["cash", "Cash"], ["card", "Card"], ["other", "Other"]]),
  customerKind: c([["individual", "Individual"], ["company", "Company"]]),
  customerStatus: c([["lead", "Potential client"], ["active", "Active client"], ["inactive", "Inactive"]]),
  source: c([["website", "Website"], ["phone", "Phone call"], ["referral", "Referral"], ["social", "Social media"], ["walk_in", "Office visit"], ["repeat", "Returning client"], ["other", "Other"]]),
  enquiryStatus: c([["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["quoted", "Quoted"], ["won", "Won"], ["lost", "Lost"]]),
  channel: c([["call", "Phone call"], ["email", "Email"], ["meeting", "Meeting"], ["site_visit", "Site visit"], ["whatsapp", "WhatsApp / Viber"], ["sms", "SMS"], ["other", "Other"]]),
  direction: c([["outbound", "Outbound"], ["inbound", "Inbound"]]),
  contractStatus: c([["draft", "Draft"], ["active", "Active"], ["completed", "Completed"], ["terminated", "Terminated"]]),
  quoteStatus: c([["draft", "Draft"], ["sent", "Sent"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["expired", "Expired"]]),
  itemKind: c([["material", "Material"], ["labour", "Labour"], ["service", "Service"], ["equipment", "Equipment"], ["other", "Other"]]),
  serviceUnit: c([["m2", "m²"], ["m", "linear m"], ["pcs", "piece"], ["h", "hour"], ["day", "day"], ["project", "project"]]),
  materialUnit: c([["kg", "kg"], ["bag", "bag"], ["m2", "m²"], ["m", "m"], ["m3", "m³"], ["l", "litre"], ["pcs", "pcs"], ["sheet", "sheet"], ["set", "set"], ["roll", "roll"], ["t", "tonne"]]),
  categoryIcon: c([["building", "Building"], ["layers", "Layers"], ["brush", "Brush"], ["hammer", "Hammer"], ["sofa", "Sofa"], ["factory", "Factory"], ["shield", "Shield"]]),
  solutionKind: c([["cladding", "Cladding panels"], ["insulation", "Insulation"], ["plaster", "Plaster & render"], ["decorative", "Decorative finish"], ["stone", "Stone"], ["metal", "Metal systems"], ["other", "Other"]]),
  movementType: c([["in", "Stock in"], ["out", "Stock out"], ["adjust", "Stock count"]]),
  productCategory: c([["scaffolding", "Façade scaffolding"], ["formwork", "Metal formwork"], ["railing", "Safety railings"], ["staircase", "Metal staircases"], ["furniture", "Furniture"], ["other", "Other"]]),
  productionStatus: c([["planned", "Planned"], ["in_progress", "In production"], ["completed", "Completed"], ["cancelled", "Cancelled"]]),
  equipmentKind: c([["machine", "Machine"], ["tool", "Power tool"], ["vehicle", "Vehicle"], ["scaffold_set", "Scaffolding set"], ["formwork_set", "Formwork set"], ["other", "Other"]]),
  equipmentStatus: c([["available", "Available"], ["in_use", "In use"], ["maintenance", "In maintenance"], ["retired", "Retired"]]),
  employeeStatus: c([["active", "Active"], ["on_leave", "On leave"], ["inactive", "Inactive"]]),
  specialization: c([["facade", "Façade & plastering"], ["cladding", "Cladding"], ["finishing", "Decorative finishing"], ["renovation", "Renovation"], ["furniture", "Furniture workshop"], ["metal", "Metal & scaffolding"], ["general", "General construction"]]),
  language: LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
} satisfies Record<string, Choices>;

/** Label for a stored value, e.g. choiceLabel(CHOICES.projectStatus, "in_progress"). */
export function choiceLabel(choices: Choices, value: string | null | undefined) {
  if (!value) return "";
  return choices.find((choice) => choice.value === value)?.label ?? value;
}
