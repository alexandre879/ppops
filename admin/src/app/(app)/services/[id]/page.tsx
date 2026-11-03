"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ImageGallery } from "@/components/image-gallery";
import { RecordModal, ResourceTable, saveRecord, type ResourceConfig } from "@/components/resource-table";
import { Badge } from "@/components/status-badge";
import { Button, Card, DetailList, ErrorState, PageHeader, PageLoader, useConfirm } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rel } from "@/lib/fields";
import { money, qty, unit } from "@/lib/format";
import { serviceFields } from "@/lib/forms";
import { useInvalidate, useRecord } from "@/lib/hooks";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const materialCostPerUnit = (r: Row) => Number(r.consumption_per_unit) * (1 + Number(r.waste_percent) / 100) * Number(r.material_unit_cost);

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const invalidate = useInvalidate();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(false);
  const { data: service, isLoading, error, refetch } = useRecord("/catalog/services/", id);

  if (isLoading) return <PageLoader />;
  if (error || !service) return <ErrorState error={error ?? new Error("Not found")} onRetry={() => refetch()} />;

  const writable = can("services", "write");
  const serviceId = service.id;
  const recipe: Row[] = service.recipe ?? [];
  const materialCost = recipe.reduce((sum, r) => sum + materialCostPerUnit(r), 0);
  const serviceUnit = unit(service.unit);

  async function remove() {
    if (!(await confirm({ title: t("Delete service?"), message: t("It will disappear from the website. Consider hiding it instead."), confirmLabel: t("Delete"), danger: true }))) return;
    try {
      await api(`/catalog/services/${serviceId}/`, { method: "DELETE" });
      toast.success(t("Deleted"));
      await invalidate("/catalog/services/");
      router.push("/services");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const recipeConfig: ResourceConfig = {
    endpoint: "/catalog/service-materials/",
    module: "services",
    singular: t("Material"),
    columns: [
      { key: "material_name", header: t("Material"), render: (r) => (<div><p className="font-medium text-stone-900">{r.material_name}</p><p className="font-mono text-xs text-stone-500">{r.material_sku}</p></div>) },
      { key: "consumption_per_unit", header: t("Per {unit}", { unit: serviceUnit }), align: "right", render: (r) => `${qty(r.consumption_per_unit)} ${unit(r.material_unit)}` },
      { key: "waste_percent", header: t("Waste"), align: "right", render: (r) => `${Number(r.waste_percent)}%` },
      { key: "material_unit_cost", header: t("Unit cost"), align: "right", render: (r) => money(r.material_unit_cost) },
      { key: "cost", header: t("Cost per {unit}", { unit: serviceUnit }), align: "right", render: (r) => <span className="font-medium">{money(materialCostPerUnit(r))}</span> },
    ],
    fields: [
      rel.material({ required: true }),
      { name: "consumption_per_unit", label: t("Consumption per {unit}", { unit: serviceUnit }), type: "number", step: "0.0001", required: true, help: t("In the material's own unit (bags, m², pcs…).") },
      { name: "waste_percent", label: t("Waste %"), type: "number", step: "0.01" },
      { name: "note", label: t("Note") },
    ],
    createDefaults: { waste_percent: 5 },
    invalidate: ["/catalog/services/"],
    emptyText: t("No materials in the recipe"),
  };

  return (
    <>
      <PageHeader
        back={{ href: "/services", label: t("Services") }}
        meta={
          <>
            <Badge>{service.category_name}</Badge>
            {service.is_published ? <Badge tone="success">{t("published")}</Badge> : <Badge>{t("hidden")}</Badge>}
            {service.is_featured && <Badge tone="progress">{t("featured")}</Badge>}
          </>
        }
        title={service.title}
        description={service.summary}
        actions={
          <>
            {service.is_published && (
              <a href={`${siteUrl}/services/${service.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3.5 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                View on website <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            {writable && (
              <>
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                  {t("Edit service")}
                </Button>
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={remove} aria-label={t("Delete service")} />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="mb-1 text-base font-semibold text-stone-900">{t("Estimator recipe")}</h2>
            <p className="mb-3 text-sm text-stone-500">
              Materials consumed per {serviceUnit} of this service. The cost estimator and quotations use this recipe, the labour norm and the pricing settings.
            </p>
            <ResourceTable config={recipeConfig} fixedParams={{ service: serviceId }} />
          </div>
          <Card title={t("Gallery")}>
            <ImageGallery endpoint="/catalog/service-images/" parentField="service" parentId={serviceId} writable={writable} invalidate={["/catalog/services/"]} />
          </Card>
        </div>
        <aside className="space-y-6">
          <Card title={t("Cost basis per {unit}", { unit: serviceUnit })}>
            <DetailList
              columns={1}
              items={[
                { label: t("Materials (incl. waste)"), value: money(materialCost) },
                { label: t("Labour norm"), value: t("{hours} h per {unit}", { hours: Number(service.labour_hours_per_unit), unit: serviceUnit }) },
                { label: t("Public price"), value: service.price_from ? t("from {price} / {unit}", { price: money(service.price_from), unit: serviceUnit }) : "On request" },
              ]}
            />
            <p className="mt-4 text-xs text-stone-500">{t("Labour cost and markup come from Settings → Pricing.")}</p>
          </Card>
          {service.image && (
            <Card title={t("Main image")} padded={false}>
              <img src={service.image} alt="" className="aspect-[4/3] w-full rounded-b-xl object-cover" />
            </Card>
          )}
          {service.features?.length > 0 && (
            <Card title={t("What's included")}>
              <ul className="list-inside list-disc space-y-1 text-sm text-stone-700">
                {service.features.map((f: string) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <RecordModal
        open={editing}
        onClose={() => setEditing(false)}
        title={t("Edit service")}
        fields={serviceFields}
        initial={service}
        isEdit
        size="lg"
        onSubmit={async (values, files) => {
          await saveRecord("/catalog/services/", serviceId, values, files);
          toast.success(t("Saved"));
          setEditing(false);
          await invalidate("/catalog/services/");
        }}
      />
      {confirmDialog}
    </>
  );
}
