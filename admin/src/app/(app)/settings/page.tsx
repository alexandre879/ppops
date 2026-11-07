"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ResourceForm, type FieldDef, type FormFiles, type FormValues } from "@/components/resource-form";
import { Button, Card, ErrorState, PageHeader, PageLoader, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Row } from "@/lib/types";
import { t } from "@/lib/i18n";

const siteFields: FieldDef[] = [
  { name: "company_name", label: t("Company name"), required: true },
  { name: "tagline", label: t("Tagline"), type: "translated" },
  { name: "hero_title", label: t("Homepage headline"), type: "translated", span: 2 },
  { name: "hero_subtitle", label: t("Homepage introduction"), type: "translated", input: "textarea", rows: 3 },
  { name: "hero_image", label: t("Homepage image"), type: "image", help: t("Optional. Replaces the façade illustration in the homepage hero.") },
  { name: "about_text", label: t("About the company"), type: "translated", input: "textarea", rows: 5 },
  { name: "mission", label: t("Mission"), type: "translated", input: "textarea", rows: 2 },
  { name: "promise", label: t("Our promise"), type: "translated", input: "textarea", rows: 2 },
  { name: "phone_primary", label: t("Main phone"), type: "tel", required: true },
  { name: "phone_secondary", label: t("Second phone"), type: "tel" },
  { name: "phone_tertiary", label: t("Third phone"), type: "tel" },
  { name: "phone_quaternary", label: t("Fourth phone"), type: "tel" },
  { name: "phone_quinary", label: t("Fifth phone"), type: "tel" },
  { name: "email", label: t("Email"), type: "email" },
  { name: "address", label: t("Address"), type: "translated" },
  { name: "legal_name", label: t("Registered legal name"), help: t("Shown in the website footer and legal pages, e.g. “New House Modern LLC”.") },
  { name: "registration_code", label: t("Identification code"), help: t("Company registration (identification) code.") },
  { name: "working_hours", label: t("Working hours"), type: "translated", placeholder: t("e.g. Mon–Sat, 09:00–19:00") },
  { name: "facebook_url", label: t("Facebook URL"), type: "url" },
  { name: "instagram_url", label: t("Instagram URL"), type: "url" },
  { name: "map_embed_url", label: t("Google Maps embed URL"), type: "url", span: 2, help: t("Google Maps → Share → Embed a map → copy the src URL.") },
  { name: "years_experience", label: t("Years of experience"), type: "number", step: "1", help: t("Headline numbers appear on the homepage once set (0 hides them).") },
  { name: "projects_completed", label: t("Completed projects"), type: "number", step: "1" },
  { name: "specialists", label: t("Qualified specialists"), type: "number", step: "1" },
];

const pricingFields: FieldDef[] = [
  { name: "currency", label: t("Currency"), required: true },
  { name: "labour_rate_per_hour", label: t("Labour rate per hour"), type: "number", step: "0.01", required: true, help: t("Cost of one labour hour, used by the estimator.") },
  { name: "overhead_percent", label: t("Overhead %"), type: "number", step: "0.01", help: t("Added to material and labour cost.") },
  { name: "margin_percent", label: t("Profit margin %"), type: "number", step: "0.01", help: t("Added on top of cost + overhead.") },
  { name: "vat_percent", label: t("VAT %"), type: "number", step: "0.01" },
  { name: "validity_days", label: t("Quotation validity (days)"), type: "number", step: "1" },
  { name: "bank_name", label: t("Bank name") },
  { name: "bank_account", label: t("Bank account (IBAN)") },
  { name: "default_terms", label: t("Default terms & conditions"), type: "translated", input: "textarea", rows: 5 },
  { name: "default_notes", label: t("Default notes"), type: "translated", input: "textarea", rows: 3 },
];

function SettingsForm({ endpoint, fields, writable }: { endpoint: string; fields: FieldDef[]; writable: boolean }) {
  const client = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: [endpoint], queryFn: () => api<Row>(endpoint) });
  const [saving, setSaving] = useState(false);
  const formId = `form-${endpoint}`;

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error ?? new Error("No data")} onRetry={() => refetch()} />;

  async function save(values: FormValues, files: FormFiles) {
    setSaving(true);
    try {
      const cleared = Object.entries(files).filter(([, f]) => f === null).map(([k]) => [k, null]);
      await api(endpoint, { method: "PATCH", body: { ...values, ...Object.fromEntries(cleared) } });
      const chosen = Object.entries(files).filter((entry): entry is [string, File] => entry[1] instanceof File);
      if (chosen.length) {
        const form = new FormData();
        for (const [key, file] of chosen) form.append(key, file);
        await api(endpoint, { method: "PATCH", body: form });
      }
      await client.invalidateQueries({ queryKey: [endpoint] });
      toast.success(t("Saved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <fieldset disabled={!writable}>
        <ResourceForm key={data.updated_at} formId={formId} fields={fields} initial={data} isEdit onSubmit={save} />
      </fieldset>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <p className="text-xs text-stone-500">{writable ? t("Changes apply immediately on the website and new quotations.") : t("Only administrators can change settings.")}</p>
        {writable && (
          <Button type="submit" form={formId} loading={saving}>
            {t("Save changes")}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"site" | "pricing">("site");
  const writable = can("settings", "write");
  return (
    <>
      <PageHeader title={t("Settings")} description={t("Company details shown on the website, and pricing defaults for estimates and quotations.")} />
      <Tabs
        tabs={[
          { value: "site", label: t("Website & company") },
          { value: "pricing", label: t("Pricing & quotations") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "site" ? (
        <SettingsForm endpoint="/settings/site/" fields={siteFields} writable={writable} />
      ) : (
        <SettingsForm endpoint="/settings/pricing/" fields={pricingFields} writable={writable} />
      )}
    </>
  );
}
