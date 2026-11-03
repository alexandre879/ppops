"use client";

import { FilePlus2, Mail, MessageSquarePlus, Pencil, Phone, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { RecordModal, ResourceTable, saveRecord, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { Button, Card, DetailList, EmptyState, ErrorState, PageHeader, PageLoader, Tabs, useConfirm } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { date, dateTime, money } from "@/lib/format";
import { contractFields, customerFields } from "@/lib/forms";
import { useInvalidate, useList, useRecord } from "@/lib/hooks";
import { t } from "@/lib/i18n";

type Tab = "activity" | "quotations" | "projects" | "contracts" | "enquiries";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [tab, setTab] = useState<Tab>("activity");
  const [modal, setModal] = useState<"edit" | "quote" | "note" | null>(null);
  const { data: customer, isLoading, error, refetch } = useRecord("/crm/customers/", id);

  if (isLoading) return <PageLoader />;
  if (error || !customer) return <ErrorState error={error ?? new Error("Not found")} onRetry={() => refetch()} />;

  const writable = can("crm", "write");
  const customerId = customer.id;

  async function remove() {
    if (!(await confirm({ title: t("Delete customer?"), message: t("Customers with quotations or contracts cannot be deleted — set them to inactive instead."), confirmLabel: t("Delete"), danger: true }))) return;
    try {
      await api(`/crm/customers/${customerId}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await invalidate("/crm/customers/");
      router.push("/customers");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "activity", label: t("Communication") },
    ...(can("quotes") ? [{ value: "quotations" as const, label: t("Quotations"), count: customer.quotations_count }] : []),
    { value: "projects", label: t("Projects"), count: customer.projects_count },
    { value: "contracts", label: t("Contracts"), count: customer.contracts_count },
    { value: "enquiries", label: t("Enquiries") },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/customers", label: t("Customers") }}
        meta={
          <>
            <Badge>{choiceLabel(CHOICES.customerKind, customer.kind)}</Badge>
            <StatusBadge status={customer.status} label={choiceLabel(CHOICES.customerStatus, customer.status)} />
            <Badge tone="info">{t("Source")}: {choiceLabel(CHOICES.source, customer.source)}</Badge>
          </>
        }
        title={customer.name}
        description={customer.kind === "company" && customer.contact_person ? `${t("Contact person")}: ${customer.contact_person}` : undefined}
        actions={
          <>
            {can("quotes", "write") && (
              <Button icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setModal("quote")}>
                {t("New quotation")}
              </Button>
            )}
            {writable && (
              <>
                <Button variant="secondary" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={() => setModal("note")}>
                  {t("Log contact")}
                </Button>
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setModal("edit")} aria-label={t("Edit customer")} />
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={remove} aria-label={t("Delete customer")} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card title={t("Contact details")}>
            <div className="mb-4 space-y-2">
              {customer.phone && (
                <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm font-medium text-stone-900 hover:text-brand-700">
                  <Phone className="h-4 w-4 text-stone-400" aria-hidden /> {customer.phone}
                </a>
              )}
              {customer.secondary_phone && (
                <a href={`tel:${customer.secondary_phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm text-stone-700 hover:text-brand-700">
                  <Phone className="h-4 w-4 text-stone-400" aria-hidden /> {customer.secondary_phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-stone-700 hover:text-brand-700">
                  <Mail className="h-4 w-4 text-stone-400" aria-hidden /> {customer.email}
                </a>
              )}
            </div>
            <DetailList
              columns={1}
              items={[
                { label: t("Address"), value: [customer.address, customer.city].filter(Boolean).join(", ") },
                { label: t("Tax ID"), value: customer.tax_id },
                { label: t("Account manager"), value: customer.assigned_to_name },
                { label: t("Customer since"), value: date(customer.created_at?.slice(0, 10)) },
              ]}
            />
            {customer.notes && <p className="mt-4 border-t border-stone-100 pt-3 text-sm whitespace-pre-line text-stone-700">{customer.notes}</p>}
          </Card>
        </div>

        <div className="min-w-0">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {tab === "activity" && <CommunicationLog customerId={customerId} />}
          {tab === "quotations" && <ResourceTable config={quotationsConfig} fixedParams={{ customer: customerId }} />}
          {tab === "projects" && <ResourceTable config={projectsConfig} fixedParams={{ customer: customerId }} />}
          {tab === "contracts" && <ResourceTable config={{ ...contractsConfig }} fixedParams={{ customer: customerId }} />}
          {tab === "enquiries" && <ResourceTable config={enquiriesConfig} fixedParams={{ customer: customerId }} />}
        </div>
      </div>

      <RecordModal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        title={t("Edit customer")}
        fields={customerFields}
        initial={customer}
        isEdit
        onSubmit={async (values) => {
          await saveRecord("/crm/customers/", customerId, values);
          toast.success(t("Saved"));
          setModal(null);
          await invalidate("/crm/customers/");
        }}
      />
      <RecordModal
        open={modal === "quote"}
        onClose={() => setModal(null)}
        title={`${t("New quotation")} — ${customer.name}`}
        submitLabel={t("Create & open")}
        fields={[
          { name: "title", label: t("Title"), required: true, span: 2, placeholder: t("e.g. Façade insulation — 3-storey house") },
          { name: "site_address", label: t("Site address"), span: 2 },
        ]}
        initial={{ site_address: [customer.address, customer.city].filter(Boolean).join(", ") }}
        onSubmit={async (values) => {
          const quote = await saveRecord("/quotations/", null, { ...values, customer: customerId });
          await invalidate("/quotations/", "/crm/customers/");
          router.push(`/quotations/${quote.id}`);
        }}
      />
      <RecordModal
        open={modal === "note"}
        onClose={() => setModal(null)}
        title={t("Log communication")}
        fields={communicationFields}
        initial={{ channel: "call", direction: "outbound", occurred_at: new Date().toISOString() }}
        onSubmit={async (values) => {
          await saveRecord("/crm/communications/", null, { ...values, customer: customerId });
          toast.success(t("Saved"));
          setModal(null);
          await invalidate("/crm/communications/");
          setTab("activity");
        }}
      />
      {confirmDialog}
    </>
  );
}

const communicationFields = [
  { name: "channel", label: t("Channel"), type: "select" as const, options: CHOICES.channel, required: true },
  { name: "direction", label: t("Direction"), type: "select" as const, options: CHOICES.direction, required: true },
  { name: "subject", label: t("Subject"), span: 2 as const },
  { name: "summary", label: t("Summary"), type: "textarea" as const, required: true, rows: 4 },
  { name: "occurred_at", label: t("When"), type: "datetime" as const, required: true },
  { name: "follow_up_date", label: t("Follow up on"), type: "date" as const },
];

function CommunicationLog({ customerId }: { customerId: number }) {
  const { data, isLoading } = useList("/crm/communications/", { customer: customerId, page_size: 100 });
  const rows = data?.results ?? [];
  if (isLoading) return null;
  if (!rows.length) {
    return (
      <Card>
        <EmptyState title={t("No communication logged yet")} description={t("Log calls, meetings and site visits to keep the history in one place.")} />
      </Card>
    );
  }
  return (
    <Card padded={false}>
      <ol className="divide-y divide-stone-100">
        {rows.map((row) => (
          <li key={row.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <Badge tone={row.direction === "inbound" ? "info" : "neutral"}>{choiceLabel(CHOICES.channel, row.channel)}</Badge>
              <span>{dateTime(row.occurred_at)}</span>
              {row.user_name && <span>· {row.user_name}</span>}
              {row.follow_up_date && <Badge tone="warning">follow up {date(row.follow_up_date)}</Badge>}
            </div>
            {row.subject && <p className="mt-2 text-sm font-semibold text-stone-900">{row.subject}</p>}
            <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{row.summary}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const quotationsConfig: ResourceConfig = {
  endpoint: "/quotations/",
  module: "quotes",
  singular: t("Quotation"),
  columns: [
    { key: "number", header: t("Number"), render: (r) => <span className="font-mono text-xs font-semibold">{r.number}</span> },
    { key: "title", header: t("Title"), render: (r) => <span className="font-medium text-stone-900">{r.title}</span> },
    { key: "issue_date", header: t("Issued"), render: (r) => date(r.issue_date) },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.quoteStatus, r.status)} /> },
    { key: "total", header: t("Total"), align: "right", render: (r) => money(r.total) },
  ],
  detailHref: (r) => `/quotations/${r.id}`,
  allowDelete: false,
};

const projectsConfig: ResourceConfig = {
  endpoint: "/projects/",
  module: "projects",
  singular: t("Project"),
  columns: [
    { key: "code", header: t("Code"), render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
    { key: "title", header: t("Project"), render: (r) => <span className="font-medium text-stone-900">{r.title}</span> },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.projectStatus, r.status)} /> },
    { key: "progress", header: t("Progress"), align: "right", render: (r) => `${r.progress}%` },
    { key: "deadline", header: t("Deadline"), render: (r) => date(r.deadline) },
  ],
  detailHref: (r) => `/projects/${r.id}`,
  allowDelete: false,
};

const contractsConfig: ResourceConfig = {
  endpoint: "/crm/contracts/",
  module: "crm",
  singular: t("Contract"),
  columns: [
    { key: "number", header: t("Number"), render: (r) => <span className="font-mono text-xs font-semibold">{r.number}</span> },
    { key: "title", header: t("Title") },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.contractStatus, r.status)} /> },
    { key: "signed_date", header: t("Signed"), render: (r) => date(r.signed_date) },
    { key: "value", header: t("Value"), align: "right", render: (r) => money(r.value) },
  ],
  fields: contractFields.filter((f) => f.name !== "customer"),
  createDefaults: { status: "draft" },
  modalSize: "lg",
  invalidate: ["/crm/customers/"],
};

const enquiriesConfig: ResourceConfig = {
  endpoint: "/crm/enquiries/",
  module: "crm",
  singular: t("Enquiry"),
  columns: [
    { key: "created_at", header: t("Received"), render: (r) => dateTime(r.created_at) },
    { key: "service_title", header: t("Service"), render: (r) => r.service_title ?? r.subject ?? "—" },
    { key: "message", header: t("Message"), render: (r) => <p className="line-clamp-2 max-w-md text-stone-600">{r.message}</p> },
    { key: "status", header: t("Status"), render: (r) => <StatusBadge status={r.status} label={choiceLabel(CHOICES.enquiryStatus, r.status)} /> },
  ],
  allowDelete: false,
};
