"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, CalendarClock, FileText, FolderKanban, Inbox, Receipt, Warehouse } from "lucide-react";
import Link from "next/link";

import { RevenueChart } from "@/components/revenue-chart";
import { Badge, StatusBadge } from "@/components/status-badge";
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { compactMoney, date, dateTime, daysUntil, longDate, money, qty, unit } from "@/lib/format";
import { t, tn } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any -- dashboard payload is a wide, read-only JSON document */
type Summary = Record<string, any>;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");
}

function DeadlineText({ value, overdue }: { value: string; overdue: boolean }) {
  const days = daysUntil(value) ?? 0;
  if (overdue) return <span className="font-medium text-red-600">{tn("{count} days overdue", Math.abs(days))}</span>;
  if (days === 0) return <span className="font-medium text-amber-700">{t("today")}</span>;
  return <span className="text-stone-500">{tn("in {count} days", days)}</span>;
}

const allLink = (href: string, label: string) => (
  <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">
    {label}
  </Link>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["/dashboard/summary/"],
    queryFn: () => api<Summary>("/dashboard/summary/"),
    refetchInterval: 120_000,
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error ?? new Error(t("No data"))} onRetry={() => refetch()} />;

  const { projects, finance, customers, quotations, inventory, staff, deadlines } = data;
  const today = longDate(new Date());

  return (
    <>
      <PageHeader title={user?.first_name ? `${greeting()}, ${user.first_name}` : greeting()} description={today} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t("Active projects")}
          value={projects.active}
          icon={<FolderKanban className="h-4 w-4" />}
          hint={projects.overdue ? tn("{count} overdue", projects.overdue) : t("avg. progress {value}%", { value: projects.average_progress })}
          tone={projects.overdue ? "warning" : "default"}
          href="/projects"
        />
        {finance && (
          <>
            <StatCard label={t("Revenue this month")} value={compactMoney(finance.revenue_month)} icon={<Banknote className="h-4 w-4" />} hint={t("{amount} this year", { amount: compactMoney(finance.revenue_year) })} />
            <StatCard label={t("Expenses this month")} value={compactMoney(finance.expenses_month)} icon={<Receipt className="h-4 w-4" />} hint={t("{amount} this year", { amount: compactMoney(finance.expenses_year) })} />
          </>
        )}
        {quotations && (
          <StatCard
            label={t("Pending quotations")}
            value={quotations.pending_count}
            icon={<FileText className="h-4 w-4" />}
            hint={t("{amount} in offers", { amount: compactMoney(quotations.pending_value) })}
            href="/quotations?status=sent"
          />
        )}
        {customers && (
          <StatCard
            label={t("New enquiries")}
            value={customers.enquiries_new}
            icon={<Inbox className="h-4 w-4" />}
            hint={t("This month: {count}", { count: customers.enquiries_this_month })}
            tone={customers.enquiries_new ? "warning" : "default"}
            href="/enquiries"
          />
        )}
        {inventory && (
          <StatCard
            label={t("Low stock items")}
            value={inventory.low_stock_count}
            icon={<Warehouse className="h-4 w-4" />}
            hint={t("Stock value: {amount}", { amount: compactMoney(inventory.stock_value) })}
            tone={inventory.low_stock_count ? "warning" : "default"}
            href="/inventory"
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {finance ? (
          <Card title={t("Revenue vs expenses — last 12 months")} className="xl:col-span-2">
            <RevenueChart data={finance.monthly} />
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-4">
              {[
                [t("Revenue (all time)"), money(finance.revenue_total)],
                [t("Expenses (all time)"), money(finance.expenses_total)],
                [t("Active project budgets"), money(finance.active_budget)],
                [t("Outstanding on active"), money(finance.outstanding)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-stone-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-stone-900 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}

        <Card title={t("Projects by status")}>
          <ul className="space-y-3">
            {projects.by_status.map((row: Summary) => {
              const max = Math.max(1, ...projects.by_status.map((s: Summary) => s.count));
              return (
                <li key={row.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Link href={`/projects?status=${row.status}`} className="text-stone-700 hover:text-brand-700">
                      {choiceLabel(CHOICES.projectStatus, row.status)}
                    </Link>
                    <span className="font-semibold text-stone-900 tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-stone-700" style={{ width: `${(row.count / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
            <div>
              <dt className="text-xs text-stone-500">{t("Completed this year")}</dt>
              <dd className="text-lg font-bold text-stone-900">{projects.completed_this_year}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">{t("On-time delivery")}</dt>
              <dd className="text-lg font-bold text-stone-900">{projects.on_time_rate === null ? "—" : `${projects.on_time_rate}%`}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title={t("Active project performance")} className="xl:col-span-2" padded={false} actions={allLink("/projects", t("All projects"))}>
          {projects.performance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
                    <th className="px-5 py-2.5 font-medium">{t("Project")}</th>
                    <th className="px-3 py-2.5 font-medium">{t("Progress")}</th>
                    <th className="px-3 py-2.5 font-medium">{t("Deadline")}</th>
                    {finance && <th className="px-5 py-2.5 text-right font-medium">{t("Budget used")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {projects.performance.map((p: Summary) => (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <td className="px-5 py-3">
                        <Link href={`/projects/${p.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                          {p.title}
                        </Link>
                        <p className="text-xs text-stone-500">
                          <span className="font-mono">{p.code}</span>
                          {p.customer_name ? ` · ${p.customer_name}` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex w-36 items-center gap-2">
                          <ProgressBar value={p.progress} />
                          <span className="w-9 text-right text-xs text-stone-600 tabular-nums">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {p.deadline ? (
                          <>
                            <p>{date(p.deadline)}</p>
                            <p className="text-xs">
                              <DeadlineText value={p.deadline} overdue={p.is_overdue} />
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      {finance && (
                        <td className="px-5 py-3 text-right">
                          {p.budget_used_percent === null ? (
                            "—"
                          ) : (
                            <>
                              <p className={p.budget_used_percent > 100 ? "font-semibold text-red-600" : "font-medium text-stone-900"}>{p.budget_used_percent}%</p>
                              <p className="text-xs whitespace-nowrap text-stone-500">
                                {compactMoney(p.spent)} / {compactMoney(p.budget)}
                              </p>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={t("No active projects")} />
          )}
        </Card>

        <Card title={t("Upcoming deadlines")} actions={<CalendarClock className="h-4 w-4 text-stone-400" />}>
          {deadlines.projects.length || deadlines.milestones.length ? (
            <ul className="space-y-3 text-sm">
              {deadlines.projects.map((p: Summary) => (
                <li key={`p-${p.id}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="block truncate font-medium text-stone-900 hover:text-brand-700">
                      {p.title}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {t("Project deadline")} · {date(p.deadline)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs">
                    <DeadlineText value={p.deadline} overdue={p.is_overdue} />
                  </span>
                </li>
              ))}
              {deadlines.milestones.map((m: Summary) => (
                <li key={`m-${m.id}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/projects/${m.project}`} className="block truncate font-medium text-stone-900 hover:text-brand-700">
                      {m.title}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {t("Milestone")} · <span className="font-mono">{m.project_code}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs">
                    <DeadlineText value={m.due_date} overdue={m.is_overdue} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("Nothing due in the next 30 days")} />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {customers && (
          <Card title={t("Latest enquiries")} padded={false} actions={allLink("/enquiries", t("All enquiries"))}>
            {customers.recent_enquiries.length ? (
              <ul className="divide-y divide-stone-100">
                {customers.recent_enquiries.map((e: Summary) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{e.name}</p>
                      <p className="truncate text-xs text-stone-500">{[e.service, e.phone].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={e.status} label={choiceLabel(CHOICES.enquiryStatus, e.status)} />
                      <p className="mt-1 text-[11px] text-stone-400">{dateTime(e.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("No enquiries yet")} />
            )}
            <div className="grid grid-cols-3 border-t border-stone-100 text-center">
              {[
                [t("Customers"), customers.total],
                [t("New this month"), customers.new_this_month],
                [t("Win rate"), customers.conversion_rate === null ? "—" : `${customers.conversion_rate}%`],
              ].map(([label, value]) => (
                <div key={label} className="px-2 py-3">
                  <p className="text-base font-bold text-stone-900">{value}</p>
                  <p className="text-[11px] text-stone-500">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {quotations && (
          <Card title={t("Open quotations")} padded={false} actions={allLink("/quotations", t("All quotations"))}>
            {quotations.recent.length ? (
              <ul className="divide-y divide-stone-100">
                {quotations.recent.map((q: Summary) => (
                  <li key={q.id}>
                    <Link href={`/quotations/${q.id}`} className="flex items-start justify-between gap-3 px-5 py-3 text-sm hover:bg-stone-50">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-stone-900">{q.title}</p>
                        <p className="truncate text-xs text-stone-500">
                          <span className="font-mono">{q.number}</span> · {q.customer_name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-stone-900 tabular-nums">{compactMoney(q.total)}</p>
                        {q.is_expired ? <Badge tone="warning">{t("expired")}</Badge> : <StatusBadge status={q.status} label={choiceLabel(CHOICES.quoteStatus, q.status)} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("No open quotations")} />
            )}
            <div className="grid grid-cols-2 border-t border-stone-100 text-center">
              <div className="px-2 py-3">
                <p className="text-base font-bold text-stone-900">{compactMoney(quotations.accepted_year_value)}</p>
                <p className="text-[11px] text-stone-500">{t("Accepted this year")}</p>
              </div>
              <div className="px-2 py-3">
                <p className="text-base font-bold text-stone-900">{quotations.acceptance_rate === null ? "—" : `${quotations.acceptance_rate}%`}</p>
                <p className="text-[11px] text-stone-500">{t("Acceptance rate")}</p>
              </div>
            </div>
          </Card>
        )}

        {inventory && (
          <Card title={t("Stock & equipment alerts")} actions={<AlertTriangle className="h-4 w-4 text-stone-400" />}>
            {inventory.low_stock.length || inventory.equipment_service_due.length ? (
              <ul className="space-y-3 text-sm">
                {inventory.low_stock.map((m: Summary) => (
                  <li key={`m-${m.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{m.name}</p>
                      <p className="text-xs text-stone-500">
                        {t("Minimum")}: {qty(m.min_quantity)} {unit(m.unit)}
                      </p>
                    </div>
                    <Badge tone="warning">{t("Left: {amount}", { amount: `${qty(m.quantity)} ${unit(m.unit)}` })}</Badge>
                  </li>
                ))}
                {inventory.equipment_service_due.map((e: Summary) => (
                  <li key={`e-${e.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{e.name}</p>
                      <p className="text-xs text-stone-500">
                        {t("Service due")}: {date(e.next_service_date)}
                      </p>
                    </div>
                    <Badge tone="info">{t("service")}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("All stock levels are healthy")} />
            )}
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              {t("Production orders in progress: {count}", { count: inventory.production_active })} ·{" "}
              {t("Products below minimum: {count}", { count: inventory.products_low_count })}
            </p>
          </Card>
        )}

        {staff && (
          <Card title={t("Teams & workload")} actions={allLink("/staff/teams", t("Teams"))}>
            <ul className="space-y-2.5 text-sm">
              {staff.teams.map((team: Summary) => (
                <li key={team.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-stone-800">{team.name}</span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {t("People: {count}", { count: team.members })} · {t("Active projects")}: <span className="font-semibold text-stone-800">{team.active_projects}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              {t("Active employees: {count}", { count: staff.employees_active })} · {t("Platform users: {count}", { count: staff.users_active })}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
