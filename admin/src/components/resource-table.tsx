"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useDebounced, useInvalidate, useList, useOptions } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { Module, Row } from "@/lib/types";

import { DataTable, Pagination, type Column } from "./data-table";
import { ResourceForm, type FieldDef, type FormFiles, type FormValues } from "./resource-form";
import { Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, useConfirm } from "./ui";
import { t } from "@/lib/i18n";

type Params = Record<string, string | number | boolean | undefined>;

export type FilterDef = {
  name: string;
  label: string;
  options?: { value: string; label: string }[];
  endpoint?: string;
  optionLabel?: (row: Row) => string;
};

export type ResourceConfig = {
  endpoint: string;
  module: Module;
  singular: string;
  columns: Column[];
  fields?: FieldDef[];
  filters?: FilterDef[];
  searchPlaceholder?: string;
  defaultOrdering?: string;
  detailHref?: (row: Row) => string;
  rowActions?: (row: Row) => ReactNode;
  toForm?: (row: Row) => FormValues;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  modalSize?: "md" | "lg";
  /** Other cached endpoints affected by changes here. */
  invalidate?: string[];
  createDefaults?: FormValues;
  emptyText?: string;
  pageSize?: number;
  /** Return a URL to open the new record's page after creating it. */
  afterCreate?: (row: Row) => string | void;
};

function appendFormValue(form: FormData, key: string, value: unknown) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) form.append(key, String(item));
    return;
  }
  form.append(key, String(value));
}

/**
 * Create/update a record. JSON for data; files go multipart (whole payload on
 * create, so required file fields validate, and a follow-up PATCH on edit).
 */
export async function saveRecord(endpoint: string, id: number | null, values: FormValues, files: FormFiles = {}): Promise<Row> {
  const chosen = Object.entries(files).filter((entry): entry is [string, File] => entry[1] instanceof File);
  const cleared = Object.entries(files)
    .filter(([, file]) => file === null)
    .map(([key]) => key);

  if (id === null && chosen.length) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) appendFormValue(form, key, value);
    for (const [key, file] of chosen) form.append(key, file);
    return api<Row>(endpoint, { method: "POST", body: form });
  }

  const body = { ...values, ...Object.fromEntries(cleared.map((key) => [key, null])) };
  let saved = id === null ? await api<Row>(endpoint, { method: "POST", body }) : await api<Row>(`${endpoint}${id}/`, { method: "PATCH", body });
  if (chosen.length) {
    const form = new FormData();
    for (const [key, file] of chosen) form.append(key, file);
    saved = await api<Row>(`${endpoint}${saved.id}/`, { method: "PATCH", body: form });
  }
  return saved;
}

/** Modal with a ResourceForm; used for create/edit everywhere. */
export function RecordModal({
  open,
  onClose,
  title,
  fields,
  initial,
  isEdit,
  onSubmit,
  size = "md",
  submitLabel = t("Save"),
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FieldDef[];
  initial?: FormValues;
  isEdit?: boolean;
  onSubmit: (values: FormValues, files: FormFiles) => Promise<void>;
  size?: "md" | "lg";
  submitLabel?: string;
}) {
  const [saving, setSaving] = useState(false);
  const formId = "record-form";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {open && (
        <ResourceForm
          formId={formId}
          fields={fields}
          initial={initial}
          isEdit={isEdit}
          onSubmit={async (values, files) => {
            setSaving(true);
            try {
              await onSubmit(values, files);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </Modal>
  );
}

function FilterSelect({ filter, value, onChange }: { filter: FilterDef; value: string; onChange: (value: string) => void }) {
  const { data = [] } = useOptions(filter.endpoint);
  const options = filter.options ?? data.map((row) => ({ value: String(row.id), label: (filter.optionLabel ?? ((r: Row) => String(r.name ?? r.title ?? r.full_name ?? r.id)))(row) }));
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={filter.label} className="w-auto min-w-36">
      <option value="">{t("{label}: all", { label: filter.label })}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function ResourceTable({
  config,
  fixedParams = {},
  title,
  toolbar,
}: {
  config: ResourceConfig;
  /** Applied to the list query and merged into new records (e.g. ``{project: 5}``). */
  fixedParams?: Params;
  title?: string;
  toolbar?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  // Filters can be pre-set from the URL, e.g. /projects?status=in_progress
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (config.filters ?? []).flatMap((f) => {
        const value = searchParams.get(f.name);
        return value ? [[f.name, value]] : [];
      }),
    ),
  );
  const [ordering, setOrdering] = useState(config.defaultOrdering ?? "");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const debouncedSearch = useDebounced(search);

  const writable = can(config.module, "write");
  const allowCreate = writable && config.allowCreate !== false && Boolean(config.fields);
  const allowEdit = writable && config.allowEdit !== false && Boolean(config.fields);
  const allowDelete = writable && config.allowDelete !== false;

  const params: Params = {
    ...fixedParams,
    ...filters,
    search: debouncedSearch || undefined,
    ordering: ordering || undefined,
    page,
    page_size: config.pageSize ?? 25,
  };
  const { data, isLoading, isFetching, error, refetch } = useList(config.endpoint, params);

  const refresh = () => invalidate(config.endpoint, ...(config.invalidate ?? []));

  async function handleSave(values: FormValues, files: FormFiles) {
    const isNew = editing === "new";
    const payload = isNew ? { ...fixedParams, ...values } : values;
    const saved = await saveRecord(config.endpoint, isNew ? null : (editing as Row).id, payload, files);
    toast.success(isNew ? t("Created") : t("Saved"));
    setEditing(null);
    await refresh();
    const next = isNew ? config.afterCreate?.(saved) : undefined;
    if (next) router.push(next);
  }

  async function handleDelete(row: Row) {
    const ok = await confirm({
      title: t("Delete this record?"),
      message: `${config.singular}: ${String(row.name ?? row.title ?? row.full_name ?? row.number ?? row.code ?? row.email ?? "")}. ${t("This cannot be undone.")}`,
      confirmLabel: t("Delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`${config.endpoint}${row.id}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const hasToolbar = Boolean(config.searchPlaceholder || config.filters?.length || allowCreate || toolbar || title);

  return (
    <Card padded={false}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-stone-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {title && <h2 className="mr-2 px-1 text-sm font-semibold text-stone-900">{title}</h2>}
            {config.searchPlaceholder && (
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={config.searchPlaceholder}
                  className="pl-9"
                  aria-label={t("Search")}
                />
              </div>
            )}
            {config.filters?.map((filter) => (
              <FilterSelect
                key={filter.name}
                filter={filter}
                value={filters[filter.name] ?? ""}
                onChange={(value) => {
                  setFilters((current) => ({ ...current, [filter.name]: value }));
                  setPage(1);
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {toolbar}
            {allowCreate && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
                {t("Add")}
              </Button>
            )}
          </div>
        </div>
      )}

      {error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          <DataTable
            columns={config.columns}
            rows={data?.results ?? []}
            loading={isLoading}
            fetching={isFetching}
            ordering={ordering}
            onOrderingChange={(value) => {
              setOrdering(value);
              setPage(1);
            }}
            onRowClick={
              config.detailHref
                ? (row) => router.push(config.detailHref!(row))
                : allowEdit
                  ? (row) => setEditing(row)
                  : undefined
            }
            actions={
              config.rowActions || allowEdit || allowDelete
                ? (row) => (
                    <>
                      {config.rowActions?.(row)}
                      {allowEdit && (
                        <Button variant="ghost" size="sm" aria-label={t("Edit")} title={t("Edit")} onClick={() => setEditing(row)} icon={<Pencil className="h-3.5 w-3.5" />} />
                      )}
                      {allowDelete && (
                        <Button variant="ghost" size="sm" aria-label={t("Delete")} title={t("Delete")} onClick={() => handleDelete(row)} icon={<Trash2 className="h-3.5 w-3.5" />} className="hover:text-red-600" />
                      )}
                    </>
                  )
                : undefined
            }
            empty={
              <EmptyState
                title={debouncedSearch || Object.values(filters).some(Boolean) ? t("No matching records") : (config.emptyText ?? t("Nothing here yet"))}
                action={allowCreate && !debouncedSearch ? <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>{t("Add")}</Button> : undefined}
              />
            }
          />
          {data && data.count > 0 && <Pagination page={data.page} totalPages={data.total_pages} count={data.count} onPage={setPage} />}
        </>
      )}

      {config.fields && (
        <RecordModal
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={`${config.singular} — ${editing === "new" ? t("new record") : t("editing")}`}
          fields={config.fields}
          initial={editing === "new" ? config.createDefaults : editing ? (config.toForm?.(editing) ?? editing) : undefined}
          isEdit={editing !== "new"}
          onSubmit={handleSave}
          size={config.modalSize}
        />
      )}
      {confirmDialog}
    </Card>
  );
}

export function ResourcePage({ title, description, config, actions }: { title: string; description?: string; config: ResourceConfig; actions?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} description={description} actions={actions} />
      <ResourceTable config={config} />
    </>
  );
}
