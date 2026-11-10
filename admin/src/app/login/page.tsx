"use client";

import clsx from "clsx";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  FileText,
  FolderKanban,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/shell";
import { Field } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

// Taller, rounder controls than the shared Input/Button: the sign-in form is the only thing on the page.
const inputClass =
  "block h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";
const iconClass = "pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400";

const MODULES: { label: string; icon: LucideIcon }[] = [
  { label: t("Projects"), icon: FolderKanban },
  { label: t("Customers"), icon: UserRound },
  { label: t("Quotations"), icon: FileText },
  { label: t("Production"), icon: Factory },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  useEffect(() => {
    document.title = `${t("Sign in")} · New House World`;
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
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Field label={t("Email")} htmlFor="email">
        <div className="relative">
          <Mail className={iconClass} aria-hidden />
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={clsx(inputClass, "pr-3")}
          />
        </div>
      </Field>
      <Field label={t("Password")} htmlFor="password">
        <div className="relative">
          <LockKeyhole className={iconClass} aria-hidden />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={clsx(inputClass, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
            aria-label={showPassword ? t("Hide password") : t("Show password")}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </Field>
      <button
        type="submit"
        disabled={submitting}
        className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("Sign in")}
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-stone-200 bg-stone-50 p-12 lg:flex xl:p-16">
        {/* Dot grid, faded out toward the bottom-right corner. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-stone-300)_1px,transparent_1px)] [mask-image:linear-gradient(135deg,black,transparent_75%)] bg-[size:22px_22px]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <BrandMark className="h-11 w-11" />
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight text-stone-950">New House World</span>
            <span className="block text-xs font-medium text-stone-500">{t("Management platform")}</span>
          </span>
        </div>
        <div className="relative">
          <p className="max-w-lg text-3xl leading-tight font-semibold tracking-tight text-stone-950 xl:text-4xl">
            {t("Projects, customers, quotations and production —")} <span className="text-brand-600">{t("in one place.")}</span>
          </p>
          <p className="mt-4 max-w-md text-stone-600">{t("The internal management platform for the New House World team.")}</p>
          <ul className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {MODULES.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-xs">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-stone-800">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex items-center justify-center bg-white px-4 py-20 sm:px-6">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">
          {/* The brand panel is desktop-only; keep the logo on small screens. */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-10 w-10" />
            <span className="text-base font-semibold tracking-tight text-stone-950">New House World</span>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-[0_24px_60px_-28px_rgb(9_9_11/0.22)] sm:p-9">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{t("Sign in")}</h1>
            <p className="mt-1.5 mb-7 text-sm text-stone-500">{t("Use your company account to continue.")}</p>
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
