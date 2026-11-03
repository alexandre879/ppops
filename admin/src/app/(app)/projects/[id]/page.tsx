"use client";

import clsx from "clsx";
import { Check, Download, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ImageGallery } from "@/components/image-gallery";
import { RecordModal, ResourceTable, saveRecord, type ResourceConfig } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { Button, Card, DetailList, EmptyState, ErrorState, Input, PageHeader, PageLoader, ProgressBar, StatCard, Tabs, useConfirm } from "@/components/ui";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { date, daysUntil, money } from "@/lib/format";
import { projectFields } from "@/lib/forms";
import { useInvalidate, useList, useRecord } from "@/lib/hooks";
import { t, tn } from "@/lib/i18n";
import type { Row } from "@/lib/types";

type Tab = "overview" | "milestones" | "photos" | "documents" | "expenses" | "payments";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const { data: project, isLoading, error, refetch } = useRecord("/projects/", id);

  if (isLoading) return <PageLoader />;
  if (error || !project) return <ErrorState error={error ?? new Error(t("Not found."))} onRetry={() => refetch()} />;

  const writable = can("projects", "write");
  const finance = can("finance");
  const projectId = project.id;
  const deadlineIn = daysUntil(project.deadline) ?? 0;

  async function remove() {
    const ok = await confirm({
      title: t("Delete project?"),
      message: t("Photos, documents, expenses, payments and milestones of this project will be deleted too."),
      confirmLabel: t("Delete project"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/projects/${projectId}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await invalidate("/projects/");
      router.push("/projects");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "overview", label: t("Overview") },
    { value: "milestones", label: t("Milestones"), count: project.counts.milestones },
    { value: "photos", label: t("Photos"), count: project.counts.photos },
    { value: "documents", label: t("Documents"), count: project.counts.documents },
    ...(finance ? [{ value: "expenses" as const, label: t("Expenses") }, { value: "payments" as const, label: t("Payments") }] : []),
  ];

  const deadlineHint = !project.deadline
    ? t("not set")
    : project.is_overdue
      ? tn("{count} days overdue", Math.abs(deadlineIn))
      : project.status === "completed"
        ? t("completed {date}", { date: date(project.completed_date) })
        : tn("{count} days left", deadlineIn);

  return (
    <>
      <PageHeader
        back={{ href: "/projects", label: t("Projects") }}
        meta={
          <>
            <span className="font-mono text-xs font-semibold text-stone-500">{project.code}</span>
            <StatusBadge status={project.status} label={choiceLabel(CHOICES.projectStatus, project.status)} />
            <StatusBadge status={project.priority} label={`${t("Priority")}: ${choiceLabel(CHOICES.priority, project.priority)}`} />
            {project.is_overdue && <Badge tone="danger">{t("overdue")}</Badge>}
            {project.show_in_portfolio && <Badge tone="success">{t("on website")}</Badge>}
          </>
        }
        title={project.title}
        description={
          <>
            {project.customer ? (
              <Link href={`/customers/${project.customer}`} className="font-medium text-stone-700 hover:text-brand-700">
                {project.customer_name}
              </Link>
            ) : (
              t("No customer")
            )}
            {project.city ? ` · ${project.city}` : ""}
            {project.manager_name ? ` · ${t("Manager")}: ${project.manager_name}` : ""}
          </>
        }
        actions={
          writable && (
            <>
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                {t("Edit project")}
              </Button>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={remove} aria-label={t("Delete project")} title={t("Delete project")} />
            </>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{t("Progress")}</p>
          <p className="mt-2 text-xl font-bold text-stone-950">{project.progress}%</p>
          <div className="mt-2">
            <ProgressBar value={project.progress} tone={project.status === "completed" ? "success" : "brand"} />
          </div>
        </div>
        <StatCard label={t("Deadline")} value={date(project.deadline)} hint={deadlineHint} tone={project.is_overdue ? "warning" : "default"} />
        {finance ? (
          <>
            <StatCard
              label={t("Budget")}
              value={money(project.budget)}
              hint={project.budget_used_percent === null ? undefined : t("{value}% spent", { value: project.budget_used_percent })}
              tone={project.budget_used_percent > 100 ? "warning" : "default"}
            />
            <StatCard label={t("Expenses")} value={money(project.total_expenses)} />
            <StatCard label={t("Received")} value={money(project.total_payments)} hint={t("{amount} outstanding", { amount: money(project.balance) })} />
          </>
        ) : (
          <StatCard label={t("Start date")} value={date(project.start_date)} />
        )}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={t("Details")} className="lg:col-span-2">
            <DetailList
              items={[
                { label: t("Address"), value: [project.address, project.city].filter(Boolean).join(", ") },
                { label: t("Building"), value: choiceLabel(CHOICES.buildingType, project.building_type) },
                { label: t("Floors"), value: project.floors },
                { label: t("Area"), value: project.area_m2 ? `${project.area_m2} m²` : null },
                { label: t("Start date"), value: date(project.start_date) },
                { label: t("Deadline"), value: date(project.deadline) },
                { label: t("Completed on"), value: project.completed_date ? date(project.completed_date) : null },
                { label: t("Project manager"), value: project.manager_name },
              ]}
            />
            {project.description && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-xs font-medium text-stone-500">{t("Internal description")}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-stone-800">{project.description}</p>
              </div>
            )}
            {project.public_summary && (
              <div className="mt-4">
                <p className="text-xs font-medium text-stone-500">{t("Website summary")}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-stone-800">{project.public_summary}</p>
              </div>
            )}
          </Card>
          <div className="space-y-6">
            <Card title={t("Services")}>
              {project.services_detail.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {project.services_detail.map((s: Row) => (
                    <Badge key={s.id}>{s.title}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t("No services selected.")}</p>
              )}
            </Card>
            <Card title={t("Team")}>
              {project.teams_detail.length === 0 && project.employees_detail.length === 0 ? (
                <p className="text-sm text-stone-500">{t("No teams assigned. Use “Edit project” to assign teams and employees.")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {project.teams_detail.map((team: Row) => (
                      <Badge key={team.id} tone="progress">
                        {team.name}
                      </Badge>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {project.employees_detail.map((e: Row) => (
                      <li key={e.id} className="flex justify-between gap-2">
                        <span className="text-stone-800">{e.full_name}</span>
                        <span className="text-xs text-stone-500">{e.position}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "milestones" && <Milestones projectId={projectId} writable={writable} />}

      {tab === "photos" && (
        <Card title={t("Project photos")}>
          <p className="mb-4 text-sm text-stone-500">{t("Photos marked “on website” appear in the public portfolio when the project is shown there.")}</p>
          <ImageGallery endpoint="/project-photos/" parentField="project" parentId={projectId} writable={writable} stages={CHOICES.photoStage} publicToggle invalidate={["/projects/"]} />
        </Card>
      )}

      {tab === "documents" && <ResourceTable config={documentsConfig} fixedParams={{ project: projectId }} title={t("Documents")} />}
      {tab === "expenses" && <ResourceTable config={expensesConfig} fixedParams={{ project: projectId }} title={t("Expenses")} />}
      {tab === "payments" && <ResourceTable config={paymentsConfig} fixedParams={{ project: projectId }} title={t("Client payments")} />}

      <RecordModal
        open={editing}
        onClose={() => setEditing(false)}
        title={t("Edit project")}
        fields={projectFields}
        initial={project}
        isEdit
        size="lg"
        onSubmit={async (values, files) => {
          await saveRecord("/projects/", projectId, values, files);
          toast.success(t("Saved"));
          setEditing(false);
          await invalidate("/projects/");
        }}
      />
      {confirmDialog}
    </>
  );
}

const documentsConfig: ResourceConfig = {
  endpoint: "/project-documents/",
  module: "projects",
  singular: t("Document"),
  columns: [
    { key: "title", header: t("Document"), render: (r) => <span className="font-medium text-stone-900">{r.title}</span> },
    { key: "kind", header: t("Type"), render: (r) => choiceLabel(CHOICES.documentKind, r.kind) },
    { key: "file_name", header: t("File"), render: (r) => <span className="text-xs text-stone-500">{r.file_name}</span> },
    { key: "uploaded_by_name", header: t("Uploaded by") },
    { key: "created_at", header: t("Date"), render: (r) => date(r.created_at?.slice(0, 10)) },
  ],
  rowActions: (row) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("Download")}
      title={t("Download")}
      icon={<Download className="h-3.5 w-3.5" />}
      onClick={() => downloadFile(row.download_url).catch((e: Error) => toast.error(e.message))}
    />
  ),
  fields: [
    { name: "title", label: t("Title"), required: true },
    { name: "kind", label: t("Type"), type: "select", options: CHOICES.documentKind, required: true },
    { name: "file", label: t("File"), type: "file", required: true, fileNameField: "file_name", help: t("PDF, Office, DWG/DXF, images or ZIP — max 25 MB. Stored privately.") },
  ],
  createDefaults: { kind: "other" },
  invalidate: ["/projects/"],
  emptyText: t("No documents uploaded"),
};

const expensesConfig: ResourceConfig = {
  endpoint: "/project-expenses/",
  module: "finance",
  singular: t("Expense"),
  columns: [
    { key: "date", header: t("Date"), render: (r) => date(r.date) },
    { key: "category", header: t("Category"), render: (r) => choiceLabel(CHOICES.expenseCategory, r.category) },
    { key: "description", header: t("Description"), render: (r) => <span className="text-stone-900">{r.description}</span> },
    { key: "supplier", header: t("Supplier") },
    { key: "amount", header: t("Amount"), align: "right", render: (r) => <span className="font-medium">{money(r.amount)}</span> },
  ],
  rowActions: (row) =>
    row.has_receipt ? (
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("Download receipt")}
        title={t("Download receipt")}
        icon={<Download className="h-3.5 w-3.5" />}
        onClick={() => downloadFile(`/project-expenses/${row.id}/receipt/`).catch((e: Error) => toast.error(e.message))}
      />
    ) : null,
  fields: [
    { name: "category", label: t("Category"), type: "select", options: CHOICES.expenseCategory, required: true },
    { name: "date", label: t("Date"), type: "date", required: true },
    { name: "description", label: t("Description"), required: true, span: 2 },
    { name: "amount", label: t("Amount (GEL)"), type: "number", step: "0.01", required: true },
    { name: "supplier", label: t("Supplier") },
    { name: "receipt", label: t("Receipt / invoice"), type: "file" },
  ],
  createDefaults: { category: "materials", date: new Date().toISOString().slice(0, 10) },
  invalidate: ["/projects/"],
  emptyText: t("No expenses recorded"),
};

const paymentsConfig: ResourceConfig = {
  endpoint: "/project-payments/",
  module: "finance",
  singular: t("Payment"),
  columns: [
    { key: "date", header: t("Date"), render: (r) => date(r.date) },
    { key: "method", header: t("Method"), render: (r) => choiceLabel(CHOICES.paymentMethod, r.method) },
    { key: "reference", header: t("Reference") },
    { key: "note", header: t("Note") },
    { key: "amount", header: t("Amount"), align: "right", render: (r) => <span className="font-medium">{money(r.amount)}</span> },
  ],
  fields: [
    { name: "amount", label: t("Amount (GEL)"), type: "number", step: "0.01", required: true },
    { name: "date", label: t("Date"), type: "date", required: true },
    { name: "method", label: t("Method"), type: "select", options: CHOICES.paymentMethod, required: true },
    { name: "reference", label: t("Reference"), placeholder: t("Invoice / transfer no.") },
    { name: "note", label: t("Note"), span: 2 },
  ],
  createDefaults: { method: "bank_transfer", date: new Date().toISOString().slice(0, 10) },
  invalidate: ["/projects/"],
  emptyText: t("No payments received yet"),
};

function Milestones({ projectId, writable }: { projectId: number; writable: boolean }) {
  const { data, isLoading } = useList("/project-milestones/", { project: projectId });
  const invalidate = useInvalidate();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const rows = data?.results ?? [];

  const reload = () => invalidate("/project-milestones/", "/projects/");

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api("/project-milestones/", { method: "POST", body: { project: projectId, title: title.trim(), due_date: due || null, order: rows.length } });
      setTitle("");
      setDue("");
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function update(row: Row, body: Record<string, unknown>) {
    try {
      await api(`/project-milestones/${row.id}/`, { method: "PATCH", body });
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function remove(row: Row) {
    try {
      await api(`/project-milestones/${row.id}/`, { method: "DELETE" });
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const done = rows.filter((r) => r.is_completed).length;

  return (
    <Card title={rows.length ? `${t("Milestones")} · ${done}/${rows.length}` : t("Milestones")} padded={false}>
      {isLoading ? null : rows.length ? (
        <ul className="divide-y divide-stone-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                disabled={!writable}
                onClick={() => update(row, { is_completed: !row.is_completed })}
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                  row.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 hover:border-brand-500",
                )}
                aria-label={row.is_completed ? t("Mark as not done: {title}", { title: row.title }) : t("Mark as done: {title}", { title: row.title })}
              >
                {row.is_completed && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={clsx("text-sm", row.is_completed ? "text-stone-400 line-through" : "font-medium text-stone-900")}>{row.title}</p>
              </div>
              <span className={clsx("text-xs whitespace-nowrap", row.is_overdue ? "font-semibold text-red-600" : "text-stone-500")}>
                {row.due_date ? date(row.due_date) : t("no date")}
                {row.is_overdue && ` · ${t("overdue")}`}
              </span>
              {writable && (
                <Button variant="ghost" size="sm" aria-label={t("Delete")} title={t("Delete")} className="hover:text-red-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove(row)} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("No milestones yet")} description={t("Break the project into steps with due dates to track deadlines.")} />
      )}
      {writable && (
        <form onSubmit={add} className="flex flex-col gap-2 border-t border-stone-100 p-4 sm:flex-row">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("New milestone, e.g. “Scaffolding installed”")} aria-label={t("Milestone")} />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-44" aria-label={t("Due date")} />
          <Button type="submit" loading={saving} icon={<Plus className="h-4 w-4" />} disabled={!title.trim()}>
            {t("Add")}
          </Button>
        </form>
      )}
    </Card>
  );
}
