"use client";

import clsx from "clsx";
import { Calculator, CircleCheck, CircleX, Copy, Download, Eye, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { RecordModal, saveRecord } from "@/components/resource-table";
import { Badge, StatusBadge } from "@/components/status-badge";
import { Button, Card, DetailList, ErrorState, Input, Modal, PageHeader, PageLoader, Select, Spinner, useConfirm } from "@/components/ui";
import { api, fetchBlobUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { labels } from "@/lib/fields";
import { date, money, qty, unit } from "@/lib/format";
import { quotationFields } from "@/lib/forms";
import { useInvalidate, useOptions, useRecord } from "@/lib/hooks";
import { t } from "@/lib/i18n";
import type { Row } from "@/lib/types";

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ url: string; filename: string } | null>(null);
  const { data: quote, isLoading, error, refetch } = useRecord("/quotations/", id);

  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf.url);
    },
    [pdf],
  );

  if (isLoading) return <PageLoader />;
  if (error || !quote) return <ErrorState error={error ?? new Error(t("Not found."))} onRetry={() => refetch()} />;

  const writable = can("quotes", "write");
  const quoteId = quote.id;
  const currency = quote.currency ?? "GEL";
  const refresh = () => invalidate("/quotations/", "/dashboard/summary/");

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: string) =>
    run(status, async () => {
      await api(`/quotations/${quoteId}/`, { method: "PATCH", body: { status } });
      toast.success(t("Status: {status}", { status: choiceLabel(CHOICES.quoteStatus, status) }));
      await refresh();
    });

  const preview = () =>
    run("pdf", async () => {
      const file = await fetchBlobUrl(`/quotations/${quoteId}/pdf/`);
      setPdf({ url: file.url, filename: `${quote.number}.pdf` });
    });

  const convert = async () => {
    const ok = await confirm({
      title: t("Accept quotation and start the project?"),
      message: t("The quotation is marked accepted, and a project (budget = quotation total) and a draft contract are created."),
      confirmLabel: t("Accept & create project"),
    });
    if (!ok) return;
    await run("convert", async () => {
      const result = await api<{ project: number }>(`/quotations/${quoteId}/convert/`, { method: "POST" });
      toast.success(t("Project and contract created"));
      await invalidate("/quotations/", "/projects/", "/crm/contracts/", "/crm/customers/");
      router.push(`/projects/${result.project}`);
    });
  };

  const duplicate = () =>
    run("duplicate", async () => {
      const copy = await api<Row>(`/quotations/${quoteId}/duplicate/`, { method: "POST" });
      toast.success(t("Created {number}", { number: copy.number }));
      await refresh();
      router.push(`/quotations/${copy.id}`);
    });

  const remove = async () => {
    if (!(await confirm({ title: t("Delete quotation?"), message: t("This cannot be undone."), confirmLabel: t("Delete"), danger: true }))) return;
    await run("delete", async () => {
      await api(`/quotations/${quoteId}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await refresh();
      router.push("/quotations");
    });
  };

  const open = quote.status === "draft" || quote.status === "sent";
  const languageName = CHOICES.language.find((l) => l.value === quote.language)?.label;

  return (
    <>
      <PageHeader
        back={{ href: "/quotations", label: t("Quotations") }}
        meta={
          <>
            <span className="font-mono text-xs font-semibold text-stone-500">{quote.number}</span>
            <StatusBadge status={quote.status} label={choiceLabel(CHOICES.quoteStatus, quote.status)} />
            {quote.is_expired && <Badge tone="warning">{t("validity expired")}</Badge>}
            {languageName && <Badge tone="info">PDF: {languageName}</Badge>}
          </>
        }
        title={quote.title}
        description={
          <>
            <Link href={`/customers/${quote.customer}`} className="font-medium text-stone-700 hover:text-brand-700">
              {quote.customer_name}
            </Link>
            {` · ${t("Issue date")}: ${date(quote.issue_date)}`}
            {quote.valid_until ? ` · ${t("Valid until")}: ${date(quote.valid_until)}` : ""}
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={<Eye className="h-4 w-4" />} loading={busy === "pdf"} onClick={preview}>
              PDF
            </Button>
            {writable && quote.status === "draft" && (
              <Button variant="secondary" icon={<Send className="h-4 w-4" />} loading={busy === "sent"} onClick={() => setStatus("sent")}>
                {t("Mark as sent")}
              </Button>
            )}
            {writable && open && can("projects", "write") && (
              <Button icon={<CircleCheck className="h-4 w-4" />} loading={busy === "convert"} onClick={convert}>
                {t("Accept & start project")}
              </Button>
            )}
            {writable && open && (
              <Button variant="secondary" icon={<CircleX className="h-4 w-4" />} loading={busy === "rejected"} onClick={() => setStatus("rejected")}>
                {t("Rejected")}
              </Button>
            )}
            {writable && (
              <>
                <Button variant="secondary" icon={<Copy className="h-4 w-4" />} loading={busy === "duplicate"} onClick={duplicate} aria-label={t("Duplicate")} title={t("Duplicate")} />
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)} aria-label={t("Edit details")} title={t("Edit details")} />
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={remove} aria-label={t("Delete quotation")} title={t("Delete quotation")} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <ItemsEditor quote={quote} writable={writable} currency={currency} onChange={refresh} />
          {writable && <EstimatePanel quoteId={quoteId} onAdded={refresh} />}
        </div>

        <aside className="space-y-6">
          <Card title={t("Totals")}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-600">{t("Subtotal")}</dt>
                <dd className="tabular-nums">{money(quote.subtotal, currency)}</dd>
              </div>
              {Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-stone-600">{t("Discount")}</dt>
                  <dd className="tabular-nums">− {money(Math.min(quote.discount_amount, quote.subtotal), currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-stone-600">{t("VAT {rate}%", { rate: Number(quote.vat_percent) })}</dt>
                <dd className="tabular-nums">{money(quote.vat_amount, currency)}</dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg bg-stone-900 px-3 py-2 text-base font-semibold text-white">
                <dt>{t("Total")}</dt>
                <dd className="whitespace-nowrap tabular-nums">{money(quote.total, currency)}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-md border border-dashed border-stone-300 p-3">
              <p className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase">{t("Internal — not on the PDF")}</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-600">{t("Estimated cost")}</dt>
                  <dd className="tabular-nums">{money(quote.cost_total, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-600">{t("Profit (excl. VAT)")}</dt>
                  <dd className={clsx("font-semibold tabular-nums", Number(quote.profit) < 0 ? "text-red-600" : "text-emerald-700")}>{money(quote.profit, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-600">{t("Margin")}</dt>
                  <dd className="tabular-nums">{quote.margin_actual === null ? "—" : `${quote.margin_actual}%`}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card
            title={t("Details")}
            actions={
              writable && (
                <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>
                  {t("Edit")}
                </Button>
              )
            }
          >
            <DetailList
              columns={1}
              items={[
                { label: t("Site address"), value: quote.site_address },
                {
                  label: t("Project"),
                  value: quote.project ? (
                    <Link className="text-brand-700 hover:underline" href={`/projects/${quote.project}`}>
                      {quote.project_code}
                    </Link>
                  ) : null,
                },
                { label: t("Enquiry"), value: quote.enquiry_label },
                {
                  label: t("Markup used by the estimator"),
                  value: `${t("Overhead %")} ${Number(quote.overhead_percent)} · ${t("Margin %")} ${Number(quote.margin_percent)}`,
                },
                { label: t("Prepared by"), value: quote.created_by_name },
              ]}
            />
            {quote.notes && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="text-xs font-medium text-stone-500">{t("Notes")}</p>
                <p className="mt-1 text-sm whitespace-pre-line text-stone-700">{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="text-xs font-medium text-stone-500">{t("Terms & conditions")}</p>
                <p className="mt-1 line-clamp-6 text-xs whitespace-pre-line text-stone-600">{quote.terms}</p>
              </div>
            )}
          </Card>
        </aside>
      </div>

      <RecordModal
        open={editing}
        onClose={() => setEditing(false)}
        title={t("Quotation details")}
        fields={[...quotationFields, { name: "status", label: t("Status"), type: "select", options: CHOICES.quoteStatus, required: true }]}
        initial={quote}
        isEdit
        size="lg"
        onSubmit={async (values) => {
          await saveRecord("/quotations/", quoteId, values);
          toast.success(t("Saved"));
          setEditing(false);
          await refresh();
        }}
      />

      <Modal
        open={pdf !== null}
        onClose={() => setPdf(null)}
        title={`${quote.number}.pdf`}
        size="xl"
        footer={
          pdf && (
            <a href={pdf.url} download={pdf.filename} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700">
              <Download className="h-4 w-4" aria-hidden /> {t("Download PDF")}
            </a>
          )
        }
      >
        {pdf && <iframe src={pdf.url} title={t("Quotation PDF preview")} className="h-[70vh] w-full rounded-md border border-stone-200" />}
      </Modal>
      {confirmDialog}
    </>
  );
}

/* ------------------------------------------------------------------ */

const KIND_DOT: Record<string, string> = { material: "bg-brand-500", labour: "bg-sky-500", service: "bg-stone-700" };

function ItemsEditor({ quote, writable, currency, onChange }: { quote: Row; writable: boolean; currency: string; onChange: () => Promise<unknown> }) {
  const items = useMemo<Row[]>(() => quote.items ?? [], [quote.items]);
  const groups = useMemo(() => {
    const out: { name: string; items: Row[] }[] = [];
    for (const item of items) {
      const last = out[out.length - 1];
      if (last && last.name === item.group) last.items.push(item);
      else out.push({ name: item.group, items: [item] });
    }
    return out;
  }, [items]);

  return (
    <Card
      title={`${t("Line items")} · ${items.length}`}
      padded={false}
      actions={
        <span className="flex items-center gap-3 text-xs text-stone-500">
          {(["material", "labour", "service"] as const).map((kind) => (
            <span key={kind} className="flex items-center gap-1">
              <span className={clsx("h-2 w-2 rounded-full", KIND_DOT[kind])} aria-hidden /> {choiceLabel(CHOICES.itemKind, kind)}
            </span>
          ))}
        </span>
      }
    >
      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-stone-500">{t("No items yet. Add lines manually below, or use “Add from a service” to estimate materials and labour automatically.")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <th className="px-4 py-2.5">{t("Description")}</th>
                <th className="w-20 px-2 py-2.5 text-right">{t("Qty")}</th>
                <th className="w-16 px-2 py-2.5">{t("Unit")}</th>
                <th className="w-24 px-2 py-2.5 text-right">{t("Price")}</th>
                <th className="w-24 px-2 py-2.5 text-right" title={t("Internal cost per unit")}>
                  {t("Cost")}
                </th>
                <th className="w-32 px-4 py-2.5 text-right">{t("Amount")}</th>
                {writable && <th className="w-10" aria-label={t("Actions")} />}
              </tr>
            </thead>
            {groups.map((group, index) => (
              <tbody key={`${group.name}-${index}`} className="divide-y divide-stone-100">
                {group.name && (
                  <tr className="bg-brand-50/60">
                    <td colSpan={writable ? 7 : 6} className="px-4 py-2 text-xs font-semibold text-stone-800">
                      {group.name}
                    </td>
                  </tr>
                )}
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} writable={writable} currency={currency} onChange={onChange} />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {writable && <AddItemForm quoteId={quote.id} lastGroup={items[items.length - 1]?.group ?? ""} onAdded={onChange} />}
    </Card>
  );
}

const cellInput =
  "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-stone-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

function ItemRow({ item, writable, currency, onChange }: { item: Row; writable: boolean; currency: string; onChange: () => Promise<unknown> }) {
  const [draft, setDraft] = useState({
    description: String(item.description),
    quantity: String(Number(item.quantity)),
    unit: String(item.unit),
    unit_price: Number(item.unit_price).toFixed(2),
    unit_cost: Number(item.unit_cost).toFixed(2),
  });
  const [saving, setSaving] = useState(false);
  const kindLabel = choiceLabel(CHOICES.itemKind, item.kind);

  async function save(field: keyof typeof draft) {
    const value = draft[field];
    const original = String(item[field]);
    if (value === original || (field !== "description" && field !== "unit" && Number(value) === Number(original))) return;
    setSaving(true);
    try {
      await api(`/quotation-items/${item.id}/`, { method: "PATCH", body: { [field]: value } });
      await onChange();
    } catch (error) {
      toast.error((error as Error).message);
      setDraft((current) => ({ ...current, [field]: original }));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api(`/quotation-items/${item.id}/`, { method: "DELETE" });
      await onChange();
    } catch (error) {
      toast.error((error as Error).message);
      setSaving(false);
    }
  }

  const bind = (field: keyof typeof draft) => ({
    value: draft[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [field]: e.target.value })),
    onBlur: () => save(field),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.target as HTMLInputElement).blur(),
    disabled: saving,
  });

  if (!writable) {
    return (
      <tr>
        <td className="px-4 py-2.5">{item.description}</td>
        <td className="px-2 py-2.5 text-right tabular-nums">{qty(item.quantity)}</td>
        <td className="px-2 py-2.5">{unit(item.unit)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums">{money(item.unit_price, "")}</td>
        <td className="px-2 py-2.5 text-right text-stone-400 tabular-nums">{money(item.unit_cost, "")}</td>
        <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">{money(item.line_total, currency)}</td>
      </tr>
    );
  }

  return (
    <tr className={clsx(saving && "opacity-60")}>
      <td className="px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={clsx("h-2 w-2 shrink-0 rounded-full", KIND_DOT[item.kind] ?? "bg-stone-300")} title={kindLabel} aria-hidden />
          <span className="sr-only">{kindLabel}</span>
          <input {...bind("description")} className={cellInput} aria-label={t("Description")} title={draft.description} />
        </div>
      </td>
      <td className="px-1 py-1.5">
        <input {...bind("quantity")} inputMode="decimal" className={clsx(cellInput, "text-right tabular-nums")} aria-label={t("Quantity")} />
      </td>
      <td className="px-1 py-1.5">
        <input {...bind("unit")} className={cellInput} aria-label={t("Unit")} />
      </td>
      <td className="px-1 py-1.5">
        <input {...bind("unit_price")} inputMode="decimal" className={clsx(cellInput, "text-right tabular-nums")} aria-label={t("Price")} />
      </td>
      <td className="px-1 py-1.5">
        <input {...bind("unit_cost")} inputMode="decimal" className={clsx(cellInput, "text-right text-stone-500 tabular-nums")} aria-label={t("Internal cost per unit")} />
      </td>
      <td className="px-4 py-1.5 text-right font-medium whitespace-nowrap tabular-nums">{money(item.line_total, currency)}</td>
      <td className="pr-2">
        <Button variant="ghost" size="sm" aria-label={t("Remove line")} title={t("Remove line")} className="hover:text-red-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove} />
      </td>
    </tr>
  );
}

function AddItemForm({ quoteId, lastGroup, onAdded }: { quoteId: number; lastGroup: string; onAdded: () => Promise<unknown> }) {
  const empty = { kind: "service", description: "", quantity: "1", unit: "pcs", unit_price: "", unit_cost: "" };
  const [form, setForm] = useState(empty);
  const [group, setGroup] = useState(lastGroup);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await api("/quotation-items/", {
        method: "POST",
        body: { ...form, quotation: quoteId, group, unit_price: form.unit_price || 0, unit_cost: form.unit_cost || 0, order: 10_000 },
      });
      setForm(empty);
      await onAdded();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((c) => ({ ...c, [field]: e.target.value }));

  return (
    <form onSubmit={submit} className="border-t border-stone-100 bg-stone-50/50 p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t("Add a line")}</p>
      <div className="grid gap-2 sm:grid-cols-12">
        <Select value={form.kind} onChange={set("kind")} className="sm:col-span-2" aria-label={t("Type")}>
          {CHOICES.itemKind.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
        <Input value={form.description} onChange={set("description")} placeholder={t("Description")} className="sm:col-span-4" aria-label={t("Description")} />
        <Input value={form.quantity} onChange={set("quantity")} inputMode="decimal" placeholder={t("Qty")} className="sm:col-span-1" aria-label={t("Quantity")} />
        <Input value={form.unit} onChange={set("unit")} placeholder={t("Unit")} className="sm:col-span-1" aria-label={t("Unit")} />
        <Input value={form.unit_price} onChange={set("unit_price")} inputMode="decimal" placeholder={t("Price")} className="sm:col-span-2" aria-label={t("Price")} />
        <Input value={form.unit_cost} onChange={set("unit_cost")} inputMode="decimal" placeholder={t("Cost (internal)")} className="sm:col-span-2" aria-label={t("Internal cost per unit")} />
        <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder={t("Section heading (optional)")} className="sm:col-span-10" aria-label={t("Section heading (optional)")} />
        <Button type="submit" loading={saving} disabled={!form.description.trim()} icon={<Plus className="h-4 w-4" />} className="sm:col-span-2">
          {t("Add line")}
        </Button>
      </div>
    </form>
  );
}

function EstimatePanel({ quoteId, onAdded }: { quoteId: number; onAdded: () => Promise<unknown> }) {
  const { data: services = [], isLoading } = useOptions("/catalog/services/");
  const [service, setService] = useState("");
  const [quantity, setQuantity] = useState("");
  const [labour, setLabour] = useState(true);
  const [saving, setSaving] = useState(false);
  const selected = services.find((s) => String(s.id) === service);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/quotations/${quoteId}/estimate/`, { method: "POST", body: { service: Number(service), quantity, include_labour: labour } });
      toast.success(t("Estimate added: {service}", { service: selected?.title ?? "" }));
      setQuantity("");
      await onAdded();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t("Add from a service")} actions={<Calculator className="h-4 w-4 text-stone-400" />}>
      <p className="mb-4 text-sm text-stone-500">
        {t("Pick a service and the area or quantity. Materials (with waste) and labour are calculated from the service recipe and priced with this quotation's overhead and margin.")}
      </p>
      {isLoading ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_160px_auto_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">{t("Service")}</span>
            <Select value={service} onChange={(e) => setService(e.target.value)} required>
              <option value="">{t("Choose a service…")}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {labels.service(s)} {s.recipe?.length ? "" : s.price_from ? `(${t("base price")})` : `(${t("no recipe")})`}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Quantity")} {selected ? `(${unit(selected.unit)})` : ""}
            </span>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" placeholder={t("e.g. 450")} required />
          </label>
          <label className="flex h-9 items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={labour} onChange={(e) => setLabour(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            {t("Labour")}
          </label>
          <Button type="submit" loading={saving} disabled={!service || !quantity} icon={<Plus className="h-4 w-4" />}>
            {t("Add estimate")}
          </Button>
        </form>
      )}
    </Card>
  );
}
