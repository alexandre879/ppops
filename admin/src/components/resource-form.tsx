"use client";

import clsx from "clsx";
import { FileText, Upload, X } from "lucide-react";
import { useId, useMemo, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { useOptions } from "@/lib/hooks";
import { lang as uiLang, LANGUAGES, t, type Lang } from "@/lib/i18n";
import type { Row } from "@/lib/types";

import { Field, Input, Select, Textarea, controlClass } from "./ui";

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "relation"
  | "multirelation"
  | "date"
  | "datetime"
  | "checkbox"
  | "image"
  | "file"
  | "lines"
  | "translated";

type Params = Record<string, string | number | boolean | undefined>;

export type FieldDef = {
  name: string;
  label: string;
  type?: FieldType;
  /** For "translated" fields: the control used per language. */
  input?: "text" | "textarea" | "lines";
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For relation fields. */
  endpoint?: string;
  optionLabel?: (row: Row) => string;
  optionParams?: Params;
  span?: 2;
  step?: string;
  rows?: number;
  accept?: string;
  /** Only shown when creating / editing. */
  createOnly?: boolean;
  editOnly?: boolean;
  /** Empty select sends null instead of "" (nullable choice). */
  nullable?: boolean;
  /** Name of a read-only field holding the current file name (private files). */
  fileNameField?: string;
};

export type FormValues = Record<string, unknown>;
/** File chosen, ``null`` = remove the current file, ``undefined`` = unchanged. */
export type FormFiles = Record<string, File | null | undefined>;

const LANG_CODES = LANGUAGES.map((l) => l.code);
const translatedKey = (name: string, code: Lang) => `${name}_${code}`;

const defaultLabel = (row: Row) => String(row.name ?? row.title ?? row.full_name ?? row.code ?? row.number ?? row.email ?? `#${row.id}`);

function toLocalDateTime(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialValue(type: FieldType | undefined, raw: unknown) {
  switch (type) {
    case "checkbox":
      return Boolean(raw);
    case "multirelation":
      return Array.isArray(raw) ? raw.map(Number) : [];
    case "lines":
      return Array.isArray(raw) ? raw.join("\n") : "";
    case "datetime":
      return toLocalDateTime(raw);
    case "image":
    case "file":
    case "password":
      return "";
    default:
      return raw === null || raw === undefined ? "" : String(raw);
  }
}

function initialState(fields: FieldDef[], initial: FormValues): FormValues {
  const state: FormValues = {};
  for (const field of fields) {
    if (field.type === "translated") {
      for (const code of LANG_CODES) {
        const key = translatedKey(field.name, code);
        state[key] = initialValue(field.input === "lines" ? "lines" : "text", initial[key]);
      }
    } else {
      state[field.name] = initialValue(field.type, initial[field.name]);
    }
  }
  return state;
}

const splitLines = (value: unknown) =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Converts form state into the JSON body DRF expects. Files are handled separately. */
function toPayload(fields: FieldDef[], values: FormValues): FormValues {
  const payload: FormValues = {};
  for (const field of fields) {
    const value = values[field.name];
    switch (field.type) {
      case "image":
      case "file":
        break;
      case "translated":
        for (const code of LANG_CODES) {
          const key = translatedKey(field.name, code);
          payload[key] = field.input === "lines" ? splitLines(values[key]) : values[key];
        }
        break;
      case "number":
      case "date":
        payload[field.name] = value === "" ? null : value;
        break;
      case "datetime":
        payload[field.name] = value ? new Date(String(value)).toISOString() : null;
        break;
      case "relation":
        payload[field.name] = value === "" ? null : Number(value);
        break;
      case "select":
        payload[field.name] = value === "" && field.nullable ? null : value;
        break;
      case "lines":
        payload[field.name] = splitLines(value);
        break;
      case "password":
        if (value) payload[field.name] = value;
        break;
      default:
        payload[field.name] = value;
    }
  }
  return payload;
}

export function ResourceForm({
  fields,
  initial = {},
  isEdit = false,
  onSubmit,
  formId,
  columns = 2,
}: {
  fields: FieldDef[];
  initial?: FormValues;
  isEdit?: boolean;
  onSubmit: (values: FormValues, files: FormFiles) => Promise<void>;
  formId: string;
  columns?: 1 | 2;
}) {
  const visible = useMemo(
    () => fields.filter((f) => !(isEdit && f.createOnly) && !(!isEdit && f.editOnly)),
    [fields, isEdit],
  );
  const [values, setValues] = useState<FormValues>(() => initialState(visible, initial));
  const [files, setFiles] = useState<FormFiles>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  const set = (name: string, value: unknown) => setValues((current) => ({ ...current, [name]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setGeneral(null);
    try {
      await onSubmit(toPayload(visible, values), files);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        setErrors(fieldErrors);
        const known = new Set(
          visible.flatMap((f) => (f.type === "translated" ? LANG_CODES.map((code) => translatedKey(f.name, code)) : [f.name])),
        );
        const unmatched = Object.entries(fieldErrors).filter(([key]) => !known.has(key));
        setGeneral(unmatched.length ? unmatched.map(([, msg]) => msg).join(" ") : error.message);
      } else {
        setGeneral((error as Error).message);
      }
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className={clsx("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
      {general && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2" role="alert">
          {general}
        </p>
      )}
      {visible.map((field) =>
        field.type === "translated" ? (
          <TranslatedControl key={field.name} field={field} values={values} errors={errors} onChange={set} />
        ) : (
          <FieldControl
            key={field.name}
            field={field}
            value={values[field.name]}
            current={initial[field.name]}
            currentName={field.fileNameField ? (initial[field.fileNameField] as string | undefined) : undefined}
            file={files[field.name]}
            error={errors[field.name]}
            onChange={(value) => set(field.name, value)}
            onFile={(file) => setFiles((current) => ({ ...current, [field.name]: file }))}
            wide={columns === 1 || field.span === 2 || ["textarea", "multirelation", "lines", "image", "file"].includes(field.type ?? "")}
          />
        ),
      )}
    </form>
  );
}

/** One value per language (Georgian / English / Russian) behind language tabs. */
function TranslatedControl({
  field,
  values,
  errors,
  onChange,
}: {
  field: FieldDef;
  values: FormValues;
  errors: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
}) {
  const id = useId();
  const firstError = LANG_CODES.find((code) => errors[translatedKey(field.name, code)]);
  const [active, setActive] = useState<Lang>(firstError ?? uiLang);
  const key = translatedKey(field.name, active);
  const error = firstError ? errors[translatedKey(field.name, firstError)] : undefined;
  const input = field.input ?? "text";
  const common = {
    id,
    value: String(values[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(key, e.target.value),
    lang: active,
    "aria-invalid": errors[key] ? true : undefined,
    placeholder: field.placeholder,
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-stone-700">
          {field.label}
          {field.required && <span className="text-brand-600"> *</span>}
        </label>
        <div role="tablist" aria-label={t("Language")} className="flex gap-0.5 rounded-md bg-stone-100 p-0.5">
          {LANGUAGES.map(({ code, short, label }) => {
            const filled = Boolean(String(values[translatedKey(field.name, code)] ?? "").trim());
            return (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={active === code}
                title={label}
                onClick={() => setActive(code)}
                className={clsx(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-colors",
                  active === code ? "bg-white text-stone-950 shadow-xs" : "text-stone-500 hover:text-stone-800",
                  errors[translatedKey(field.name, code)] && "text-red-600",
                )}
              >
                {short}
                <span className={clsx("h-1.5 w-1.5 rounded-full", filled ? "bg-emerald-500" : "bg-stone-300")} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
      {input === "text" ? <Input {...common} /> : <Textarea {...common} rows={field.rows ?? (input === "lines" ? 4 : 3)} />}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : field.help ? <p className="mt-1 text-xs text-stone-500">{field.help}</p> : null}
    </div>
  );
}

function FieldControl({
  field,
  value,
  current,
  currentName,
  file,
  error,
  onChange,
  onFile,
  wide,
}: {
  field: FieldDef;
  value: unknown;
  current: unknown;
  currentName?: string;
  file: File | null | undefined;
  error?: string;
  onChange: (value: unknown) => void;
  onFile: (file: File | null | undefined) => void;
  wide: boolean;
}) {
  const id = useId();
  const type = field.type ?? "text";
  const common = { id, "aria-invalid": error ? true : undefined, placeholder: field.placeholder };
  const className = wide ? "sm:col-span-2" : undefined;

  if (type === "checkbox") {
    return (
      <label htmlFor={id} className={clsx("flex items-start gap-2.5 rounded-md border border-stone-200 px-3 py-2.5", className)}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-brand-500" />
        <span>
          <span className="block text-sm font-medium text-stone-800">{field.label}</span>
          {field.help && <span className="block text-xs text-stone-500">{field.help}</span>}
        </span>
      </label>
    );
  }

  let control;
  switch (type) {
    case "textarea":
    case "lines":
      control = <Textarea {...common} rows={field.rows ?? (type === "lines" ? 4 : 3)} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "select":
      control = (
        <Select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {(!field.required || field.nullable) && <option value="">—</option>}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "relation":
      control = <RelationSelect field={field} id={id} value={String(value ?? "")} onChange={onChange} invalid={!!error} />;
      break;
    case "multirelation":
      control = <MultiRelation field={field} value={(value as number[]) ?? []} onChange={onChange} />;
      break;
    case "image":
    case "file":
      control = <FileInput field={field} id={id} current={current} currentName={currentName} file={file} onFile={onFile} />;
      break;
    default:
      control = (
        <Input
          {...common}
          type={type === "datetime" ? "datetime-local" : type}
          step={type === "number" ? (field.step ?? "any") : undefined}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={type === "password" ? "new-password" : undefined}
        />
      );
  }

  return (
    <Field label={field.label} htmlFor={id} error={error} help={field.help} required={field.required} className={className}>
      {control}
    </Field>
  );
}

function RelationSelect({ field, id, value, onChange, invalid }: { field: FieldDef; id: string; value: string; onChange: (v: unknown) => void; invalid: boolean }) {
  const { data = [], isLoading } = useOptions(field.endpoint, field.optionParams);
  const label = field.optionLabel ?? defaultLabel;
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} disabled={isLoading}>
      <option value="">{isLoading ? t("Loading…") : "—"}</option>
      {data.map((row) => (
        <option key={row.id} value={row.id}>
          {label(row)}
        </option>
      ))}
    </Select>
  );
}

function MultiRelation({ field, value, onChange }: { field: FieldDef; value: number[]; onChange: (v: unknown) => void }) {
  const { data = [], isLoading } = useOptions(field.endpoint, field.optionParams);
  const [filter, setFilter] = useState("");
  const label = field.optionLabel ?? defaultLabel;
  const shown = data.filter((row) => label(row).toLowerCase().includes(filter.toLowerCase()));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="rounded-md border border-stone-300">
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 p-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("Filter…")} className="w-full bg-transparent px-1 text-sm outline-none" aria-label={t("Filter")} />
        <span className="shrink-0 text-xs text-stone-500">{t("Selected: {count}", { count: value.length })}</span>
      </div>
      <div className="max-h-44 overflow-y-auto p-1">
        {isLoading && <p className="p-2 text-xs text-stone-500">{t("Loading…")}</p>}
        {shown.map((row) => (
          <label key={row.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-stone-50">
            <input type="checkbox" checked={value.includes(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 accent-brand-500" />
            {label(row)}
          </label>
        ))}
        {!isLoading && !shown.length && <p className="p-2 text-xs text-stone-500">{t("No options")}</p>}
      </div>
    </div>
  );
}

function FileInput({
  field,
  id,
  current,
  currentName,
  file,
  onFile,
}: {
  field: FieldDef;
  id: string;
  current: unknown;
  currentName?: string;
  file: File | null | undefined;
  onFile: (file: File | null | undefined) => void;
}) {
  const isImage = field.type === "image";
  const existing = file === null ? null : typeof current === "string" ? current : null;
  const preview = useMemo(() => (file && isImage ? URL.createObjectURL(file) : null), [file, isImage]);
  const shownName = file ? file.name : (currentName ?? (existing ? existing.split("/").pop() : null));

  return (
    <div className="flex items-center gap-3">
      {isImage && (preview || existing) ? (
        <img src={preview ?? existing!} alt="" className="h-14 w-14 shrink-0 rounded-md border border-stone-200 object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-stone-300 text-stone-400">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-stone-700">{shownName ?? (file === null ? t("Will be removed") : t("No file selected"))}</p>
        <div className="mt-1.5 flex gap-2">
          <label htmlFor={id} className={clsx(controlClass, "inline-flex w-auto cursor-pointer items-center gap-1.5 py-1 text-xs font-semibold")}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> {shownName ? t("Replace") : t("Choose file")}
          </label>
          <input id={id} type="file" className="sr-only" accept={field.accept ?? (isImage ? "image/*" : undefined)} onChange={(e) => onFile(e.target.files?.[0] ?? undefined)} />
          {(file || (existing && !field.required)) && (
            <button type="button" onClick={() => onFile(file ? undefined : null)} className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-red-600">
              <X className="h-3.5 w-3.5" aria-hidden /> {file ? t("Undo") : t("Remove")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
