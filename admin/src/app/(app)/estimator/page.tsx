"use client";

import { useQuery } from "@tanstack/react-query";
import { Calculator, FilePlus2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { RecordModal, saveRecord } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rel } from "@/lib/fields";
import { money, qty, unit } from "@/lib/format";
import { useInvalidate, useOptions } from "@/lib/hooks";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";
import { CHOICES, choiceLabel } from "@/lib/choices";

type Line = { key: number; service: string; quantity: string; include_labour: boolean };
type Result = {
  lines: Row[];
  totals: Record<string, number>;
  settings: { currency: string; overhead_percent: number; margin_percent: number; vat_percent: number; labour_rate_per_hour: number };
};

let nextKey = 1;
const newLine = (): Line => ({ key: nextKey++, service: "", quantity: "", include_labour: true });

export default function EstimatorPage() {
  const router = useRouter();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const { data: services = [] } = useOptions("/catalog/services/");
  const { data: pricing } = useQuery({ queryKey: ["/settings/pricing/"], queryFn: () => api<Row>("/settings/pricing/") });
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [overrides, setOverrides] = useState({ overhead_percent: "", margin_percent: "", vat_percent: "", discount_amount: "" });
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [creating, setCreating] = useState(false);

  const update = (key: number, patch: Partial<Line>) => setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const ready = lines.filter((l) => l.service && Number(l.quantity) > 0);

  async function calculate(event?: FormEvent) {
    event?.preventDefault();
    if (!ready.length) return;
    setCalculating(true);
    try {
      const body: Record<string, unknown> = {
        lines: ready.map((l) => ({ service: Number(l.service), quantity: l.quantity, include_labour: l.include_labour })),
      };
      for (const [key, value] of Object.entries(overrides)) if (value !== "") body[key] = value;
      setResult(await api<Result>("/quotations/calculate/", { method: "POST", body }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCalculating(false);
    }
  }

  const groups = result ? Array.from(new Set(result.lines.map((l) => l.group))) : [];
  const currency = result?.settings.currency ?? "GEL";

  return (
    <>
      <PageHeader
        title={t("Cost estimator")}
        description={t("Calculate material requirements, labour and the selling price for one or more services. Nothing is saved until you create a quotation.")}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title={t("Scope of work")}>
          <form onSubmit={calculate} className="space-y-4">
            {lines.map((line, index) => {
              const service = services.find((s) => String(s.id) === line.service);
              return (
                <div key={line.key} className="rounded-lg border border-stone-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-500">{t("Item")} {index + 1}</span>
                    {lines.length > 1 && (
                      <Button variant="ghost" size="sm" aria-label={t("Remove item")} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setLines((c) => c.filter((l) => l.key !== line.key))} />
                    )}
                  </div>
                  <Select value={line.service} onChange={(e) => update(line.key, { service: e.target.value })} aria-label={t("Service")}>
                    <option value="">{t("Choose a service…")}</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-2 flex items-center gap-3">
                    <Input value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })} inputMode="decimal" placeholder={t("Quantity")} aria-label={t("Quantity")} />
                    <span className="w-16 shrink-0 text-sm text-stone-500">{service ? unit(service.unit) : ""}</span>
                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-stone-700">
                      <input type="checkbox" checked={line.include_labour} onChange={(e) => update(line.key, { include_labour: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                      {t("Labour")}
                    </label>
                  </div>
                  {service && !service.recipe?.length && (
                    <p className="mt-2 text-xs text-amber-700">{service.price_from ? t("No recipe — the base price will be used.") : t("No recipe or base price set for this service.")}</p>
                  )}
                </div>
              );
            })}
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setLines((c) => [...c, newLine()])}>
              {t("Add service")}
            </Button>

            <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4">
              {(
                [
                  ["overhead_percent", t("Overhead %")],
                  ["margin_percent", t("Margin %")],
                  ["vat_percent", t("VAT %")],
                  ["discount_amount", t("Discount (GEL)")],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={key}>
                  <Input
                    id={key}
                    inputMode="decimal"
                    value={overrides[key]}
                    onChange={(e) => setOverrides((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder={key === "discount_amount" ? "0" : pricing ? String(Number(pricing[key])) : ""}
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              {t("Empty fields use the company defaults.")} {pricing ? t("Labour rate: {rate} / h", { rate: money(pricing.labour_rate_per_hour) }) : ""}
            </p>
            <Button type="submit" className="w-full" loading={calculating} disabled={!ready.length} icon={<Calculator className="h-4 w-4" />}>
              {t("Calculate")}
            </Button>
          </form>
        </Card>

        <div className="min-w-0 space-y-6">
          {!result ? (
            <Card>
              <EmptyState icon={<Calculator className="h-5 w-5" />} title={t("No estimate yet")} description={t("Choose services and quantities, then press Calculate.")} />
            </Card>
          ) : (
            <>
              <Card
                title={t("Breakdown")}
                padded={false}
                actions={
                  can("quotes", "write") && (
                    <Button icon={<FilePlus2 className="h-4 w-4" />} onClick={() => setCreating(true)}>
                      {t("Create quotation")}
                    </Button>
                  )
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/70 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                        <th className="px-4 py-2.5">{t("Item")}</th>
                        <th className="px-3 py-2.5 text-right">{t("Quantity")}</th>
                        <th className="px-3 py-2.5 text-right">{t("Cost / unit")}</th>
                        <th className="px-3 py-2.5 text-right">{t("Price / unit")}</th>
                        <th className="px-4 py-2.5 text-right">{t("Amount")}</th>
                      </tr>
                    </thead>
                    {groups.map((group) => (
                      <tbody key={group} className="divide-y divide-stone-100">
                        <tr className="bg-brand-50/60">
                          <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-stone-800">
                            {group}
                          </td>
                        </tr>
                        {result.lines
                          .filter((l) => l.group === group)
                          .map((l, i) => (
                            <tr key={`${group}-${i}`}>
                              <td className="px-4 py-2.5">
                                <span className="mr-2">
                                  <Badge tone={l.kind === "labour" ? "info" : "neutral"}>{choiceLabel(CHOICES.itemKind, l.kind)}</Badge>
                                </span>
                                {l.description}
                              </td>
                              <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                                {qty(l.quantity)} {unit(l.unit)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-stone-500 tabular-nums">{money(l.unit_cost, "")}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{money(l.unit_price, "")}</td>
                              <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">{money(l.line_total, currency)}</td>
                            </tr>
                          ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  [t("Subtotal"), money(result.totals.subtotal, currency)],
                  [t("VAT {rate}%", { rate: result.settings.vat_percent }), money(result.totals.vat_amount, currency)],
                  [t("Total for the client"), money(result.totals.total, currency)],
                  [t("Estimated profit"), `${money(result.totals.profit, currency)} · ${result.totals.margin_percent}%`],
                ].map(([label, value], i) => (
                  <div key={label} className={i === 2 ? "rounded-xl bg-brand-500 p-4 text-stone-950" : "rounded-xl border border-stone-200 bg-white p-4"}>
                    <p className={i === 2 ? "text-xs font-semibold uppercase" : "text-xs font-medium text-stone-500 uppercase"}>{label}</p>
                    <p className="mt-1.5 text-lg font-bold whitespace-nowrap tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-stone-500">
                {t("Cost")}: {money(result.totals.cost_total, currency)} · {t("Overhead %")} {result.settings.overhead_percent} · {t("Margin %")} {result.settings.margin_percent} · {t("Labour rate: {rate} / h", { rate: money(result.settings.labour_rate_per_hour, currency) })}
              </p>
            </>
          )}
        </div>
      </div>

      <RecordModal
        open={creating}
        onClose={() => setCreating(false)}
        title={t("Create quotation from this estimate")}
        submitLabel={t("Create & open")}
        fields={[{ name: "title", label: t("Title"), required: true, span: 2 }, rel.customer({ required: true }), { name: "site_address", label: t("Site address") }]}
        onSubmit={async (values) => {
          const settings = result!.settings;
          const quote = await saveRecord("/quotations/", null, {
            ...values,
            overhead_percent: settings.overhead_percent,
            margin_percent: settings.margin_percent,
            vat_percent: settings.vat_percent,
            discount_amount: overrides.discount_amount || 0,
          });
          for (const line of ready) {
            await api(`/quotations/${quote.id}/estimate/`, {
              method: "POST",
              body: { service: Number(line.service), quantity: line.quantity, include_labour: line.include_labour },
            });
          }
          toast.success(t("Created {number}", { number: quote.number }));
          await invalidate("/quotations/");
          router.push(`/quotations/${quote.id}`);
        }}
      />
    </>
  );
}
