"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ResourceForm } from "@/components/resource-form";
import { Button, Card, DetailList, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { t } from "@/lib/i18n";
import { CHOICES, choiceLabel } from "@/lib/choices";

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFormKey, setPasswordFormKey] = useState(0);
  if (!user) return null;

  return (
    <>
      <PageHeader title={t("My account")} description={user.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("Profile")}>
          <ResourceForm
            formId="profile-form"
            isEdit
            initial={user}
            fields={[
              { name: "first_name", label: t("First name") },
              { name: "last_name", label: t("Last name") },
              { name: "phone", label: t("Phone"), type: "tel" },
            ]}
            onSubmit={async (values) => {
              setSavingProfile(true);
              try {
                setUser(await api<Me>("/auth/me/", { method: "PATCH", body: values }));
                toast.success(t("Saved"));
              } finally {
                setSavingProfile(false);
              }
            }}
          />
          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
            <DetailList columns={1} items={[{ label: t("Role"), value: choiceLabel(CHOICES.role, user.role) }]} />
            <Button type="submit" form="profile-form" loading={savingProfile}>
              {t("Save profile")}
            </Button>
          </div>
        </Card>

        <Card title={t("Change password")}>
          <ResourceForm
            key={passwordFormKey}
            formId="password-form"
            columns={1}
            fields={[
              { name: "current_password", label: t("Current password"), type: "password", required: true },
              { name: "new_password", label: t("New password"), type: "password", required: true, help: t("At least 8 characters; avoid common or purely numeric passwords.") },
            ]}
            onSubmit={async (values) => {
              setSavingPassword(true);
              try {
                await api("/auth/change-password/", { method: "POST", body: values });
                toast.success(t("Password changed"));
                setPasswordFormKey((k) => k + 1);
              } finally {
                setSavingPassword(false);
              }
            }}
          />
          <div className="mt-5 flex justify-end border-t border-stone-100 pt-4">
            <Button type="submit" form="password-form" loading={savingPassword}>
              {t("Change password")}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
