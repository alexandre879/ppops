"use client";

import clsx from "clsx";
import { Eye, EyeOff, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useInvalidate, useList } from "@/lib/hooks";
import type { Row } from "@/lib/types";

import { RecordModal } from "./resource-table";
import { Badge } from "./status-badge";
import { Button, EmptyState, Select, Spinner, useConfirm } from "./ui";
import { t } from "@/lib/i18n";
import { choiceLabel } from "@/lib/choices";

/**
 * Upload / caption / delete images that belong to a parent record.
 * Project photos additionally have a stage and a "show on website" flag.
 */
export function ImageGallery({
  endpoint,
  parentField,
  parentId,
  writable,
  stages,
  publicToggle = false,
  invalidate = [],
}: {
  endpoint: string;
  parentField: string;
  parentId: number;
  writable: boolean;
  stages?: { value: string; label: string }[];
  publicToggle?: boolean;
  invalidate?: string[];
}) {
  const { data, isLoading } = useList(endpoint, { [parentField]: parentId });
  const refresh = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [stage, setStage] = useState(stages?.[0]?.value ?? "");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const rows = data?.results ?? [];

  const reload = () => refresh(endpoint, ...invalidate);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let done = 0;
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append(parentField, String(parentId));
        form.append("image", file);
        if (stages) form.append("stage", stage);
        form.append("order", String(rows.length + done));
        await api(endpoint, { method: "POST", body: form });
        done += 1;
      }
      toast.success(t("Images uploaded: {count}", { count: done }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
      await reload();
    }
  }

  async function patch(row: Row, body: Record<string, unknown>) {
    try {
      await api(`${endpoint}${row.id}/`, { method: "PATCH", body });
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function remove(row: Row) {
    if (!(await confirm({ title: t("Delete image?"), message: t("The file will be removed permanently."), confirmLabel: t("Delete"), danger: true }))) return;
    try {
      await api(`${endpoint}${row.id}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div>
      {writable && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {stages && (
            <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-auto" aria-label={t("Stage for new photos")}>
              {stages.map((s) => (
                <option key={s.value} value={s.value}>
                  {t("Stage")}: {s.label}
                </option>
              ))}
            </Select>
          )}
          <input ref={input} type="file" accept="image/*" multiple className="sr-only" id={`${endpoint}-upload`} onChange={(e) => upload(e.target.files)} />
          <Button icon={<ImagePlus className="h-4 w-4" />} loading={uploading} onClick={() => input.current?.click()}>
            {t("Upload images")}
          </Button>
          <p className="text-xs text-stone-500">{t("JPG, PNG or WebP, up to 25 MB each.")}</p>
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <li key={row.id} className="group overflow-hidden rounded-lg border border-stone-200 bg-white">
              <div className="relative aspect-[4/3] bg-stone-100">
                <img src={row.image} alt={row.caption || ""} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute top-2 left-2 flex gap-1">
                  {row.stage && stages && <Badge>{choiceLabel(stages, row.stage)}</Badge>}
                  {publicToggle && row.is_public && <Badge tone="success">{t("on website")}</Badge>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <p className={clsx("truncate px-1 text-xs", row.caption ? "text-stone-700" : "text-stone-400")}>{row.caption || t("No caption")}</p>
                {writable && (
                  <div className="flex shrink-0">
                    {publicToggle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={row.is_public ? t("Hide from website") : t("Show on website")}
                        title={row.is_public ? t("Hide from website") : t("Show on website")}
                        icon={row.is_public ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        onClick={() => patch(row, { is_public: !row.is_public })}
                      />
                    )}
                    <Button variant="ghost" size="sm" aria-label={t("Edit caption")} icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(row)} />
                    <Button variant="ghost" size="sm" aria-label={t("Delete image")} className="hover:text-red-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove(row)} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t("No images yet")} description={writable ? t("Upload photos to build the gallery.") : undefined} />
      )}

      <RecordModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("Edit image")}
        initial={editing ?? undefined}
        isEdit
        fields={[
          { name: "caption", label: t("Caption"), span: 2 },
          ...(stages ? [{ name: "stage", label: t("Stage"), type: "select" as const, options: stages, required: true }] : []),
          { name: "order", label: t("Order"), type: "number" as const, step: "1" },
          ...(publicToggle ? [{ name: "is_public", label: t("Show on website"), type: "checkbox" as const }] : []),
        ]}
        onSubmit={async (values) => {
          await api(`${endpoint}${editing!.id}/`, { method: "PATCH", body: values });
          toast.success(t("Saved"));
          setEditing(null);
          await reload();
        }}
      />
      {confirmDialog}
    </div>
  );
}
