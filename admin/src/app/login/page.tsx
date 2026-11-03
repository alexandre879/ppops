"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { LanguageSwitcher } from "@/components/shell";
import { Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

function safeNext(value: string | null) {
  // Only allow same-site relative paths (prevents open redirects).
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginForm() {
  const { signIn, status } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  useEffect(() => {
    document.title = `${t("Sign in")} · New House Modern`;
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Field label={t("Email")} htmlFor="email">
        <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </Field>
      <Field label={t("Password")} htmlFor="password">
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" loading={submitting}>
        {t("Sign in")}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-stone-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
            <rect width="40" height="40" rx="8" fill="#f26b1d" />
            <path d="M9 20.5 20 11l11 9.5" fill="none" stroke="#1c1917" strokeWidth="3.2" strokeLinejoin="round" />
            <path d="M13 19v11h5.5v-6h3v6H27V19" fill="#1c1917" />
          </svg>
          <span className="text-lg font-bold text-white">New House Modern</span>
        </div>
        <div className="relative">
          <p className="text-3xl leading-tight font-bold text-white">
            {t("Projects, customers, quotations and production —")} <span className="text-brand-400">{t("in one place.")}</span>
          </p>
          <p className="mt-4 max-w-md text-stone-400">{t("The internal management platform for the New House Modern team.")}</p>
        </div>
      </div>
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <LockKeyhole className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-stone-950">{t("Sign in")}</h1>
          <p className="mt-1 mb-7 text-sm text-stone-500">{t("Use your company account to continue.")}</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
