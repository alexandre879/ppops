"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import type { Row } from "@/lib/types";

import { Button, EmptyState, Spinner } from "./ui";
import { t } from "@/lib/i18n";

export type Column<T extends Row = Row> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  /** Ordering field sent to the API (``?ordering=``) when the header is clicked. */
  sort?: string;
  align?: "left" | "right";
  className?: string;
};

function defaultCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-stone-400">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function DataTable<T extends Row>({
  columns,
  rows,
  loading,
  fetching,
  onRowClick,
  ordering,
  onOrderingChange,
  actions,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  fetching?: boolean;
  onRowClick?: (row: T) => void;
  ordering?: string;
  onOrderingChange?: (ordering: string) => void;
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (!rows.length) return <>{empty ?? <EmptyState title={t("Nothing here yet")} />}</>;

  const toggleSort = (field: string) => {
    if (!onOrderingChange) return;
    onOrderingChange(ordering === field ? `-${field}` : ordering === `-${field}` ? "" : field);
  };

  return (
    <div className={clsx("overflow-x-auto transition-opacity", fetching && "opacity-60")}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/70 text-left">
            {columns.map((column) => {
              const active = ordering === column.sort || ordering === `-${column.sort}`;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx("px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-stone-500 uppercase", column.align === "right" && "text-right", column.className)}
                  aria-sort={active ? (ordering?.startsWith("-") ? "descending" : "ascending") : undefined}
                >
                  {column.sort && onOrderingChange ? (
                    <button type="button" onClick={() => toggleSort(column.sort!)} className="inline-flex items-center gap-1 uppercase hover:text-stone-900">
                      {column.header}
                      {active && (ordering?.startsWith("-") ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {actions && <th className="px-4 py-2.5" aria-label={t("Actions")} />}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx("group", onRowClick && "cursor-pointer hover:bg-brand-50/40")}
            >
              {columns.map((column) => (
                <td key={column.key} className={clsx("px-4 py-3 align-middle text-stone-800", column.align === "right" && "text-right whitespace-nowrap tabular-nums", column.className)}>
                  {column.render ? column.render(row) : defaultCell(row[column.key])}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, count, onPage }: { page: number; totalPages: number; count: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return <p className="px-4 py-3 text-xs text-stone-500">{t("Records: {count}", { count })}</p>;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-3">
      <p className="text-xs text-stone-500">
        {t("Page {page} of {total}", { page, total: totalPages })} · {t("Records: {count}", { count })}
      </p>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("Previous page")} icon={<ChevronLeft className="h-4 w-4" />} />
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("Next page")} icon={<ChevronRight className="h-4 w-4" />} />
      </div>
    </div>
  );
}
