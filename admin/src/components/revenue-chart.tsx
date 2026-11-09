"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compactValue, money, monthLabel } from "@/lib/format";
import { t } from "@/lib/i18n";

// Validated pair (dataviz validator: CVD ΔE 26.5, contrast ≥ 3:1 on white).
const SERIES = [
  { key: "revenue", label: t("Revenue received"), color: "#e3530c" },
  { key: "expenses", label: t("Project expenses"), color: "#2a78d6" },
] as const;

type Point = { month: string; label: string; revenue: number; expenses: number };


type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
  label?: ReactNode;
};

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-stone-500">{typeof label === "string" ? monthLabel(label, true) : label}</p>
      {SERIES.map((series) => {
        const entry = payload.find((p) => p.dataKey === series.key);
        return (
          <p key={series.key} className="flex items-center gap-2 py-0.5">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: series.color }} aria-hidden />
            <span className="font-semibold text-stone-950 tabular-nums">{money(Number(entry?.value ?? 0))}</span>
            <span className="text-stone-500">{series.label}</span>
          </p>
        );
      })}
    </div>
  );
}

export function RevenueChart({ data }: { data: Point[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs text-stone-600" aria-label={t("Legend")}>
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: series.color }} aria-hidden />
              {series.label}
            </li>
          ))}
        </ul>
        <div className="flex gap-0.5 rounded-lg bg-stone-100 p-0.5 text-xs" role="tablist" aria-label={t("Chart view")}>
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={clsx("rounded-md px-2.5 py-1 font-medium transition-colors", view === option ? "bg-white text-stone-950 shadow-xs" : "text-stone-500 hover:text-stone-950")}
            >
              {option === "chart" ? t("Chart") : t("Table")}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <div className="h-64" role="img" aria-label={t("Revenue and expenses for the last 12 months")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="24%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="month" tickFormatter={(value: string) => monthLabel(value)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
              <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v: number) => compactValue(v)} />
              <Tooltip
                content={(props) => <ChartTooltip active={props.active} payload={props.payload} label={props.label} />}
                cursor={{ fill: "rgba(28, 25, 23, 0.04)" }}
              />
              {SERIES.map((series) => (
                <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={16} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="py-2 font-medium">{t("Month")}</th>
                <th className="py-2 text-right font-medium">{t("Revenue")}</th>
                <th className="py-2 text-right font-medium">{t("Expenses")}</th>
                <th className="py-2 text-right font-medium">{t("Net")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {data.map((row) => (
                <tr key={row.month}>
                  <td className="py-1.5 text-stone-600">{monthLabel(row.month, true)}</td>
                  <td className="py-1.5 text-right">{money(row.revenue)}</td>
                  <td className="py-1.5 text-right">{money(row.expenses)}</td>
                  <td className={clsx("py-1.5 text-right font-medium", row.revenue - row.expenses < 0 && "text-red-600")}>{money(row.revenue - row.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
