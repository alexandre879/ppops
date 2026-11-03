"use client";

import clsx from "clsx";
import {
  Boxes,
  Calculator,
  ExternalLink,
  Factory,
  FileSignature,
  FileText,
  FolderKanban,
  HardHat,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Package,
  Settings,
  Shapes,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHOICES, choiceLabel } from "@/lib/choices";
import { initials } from "@/lib/format";
import { hasSavedLanguage, lang, LANGUAGES, setLanguage, t, type Lang } from "@/lib/i18n";
import type { Module } from "@/lib/types";

type NavItem = { href: string; label: string; icon: LucideIcon; module: Module };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { label: "", items: [{ href: "/", label: t("Dashboard"), icon: LayoutDashboard, module: "dashboard" }] },
  {
    label: t("Sales & CRM"),
    items: [
      { href: "/enquiries", label: t("Enquiries"), icon: Inbox, module: "crm" },
      { href: "/customers", label: t("Customers"), icon: UserRound, module: "crm" },
      { href: "/quotations", label: t("Quotations"), icon: FileText, module: "quotes" },
      { href: "/estimator", label: t("Cost estimator"), icon: Calculator, module: "quotes" },
      { href: "/contracts", label: t("Contracts"), icon: FileSignature, module: "crm" },
    ],
  },
  { label: t("Operations"), items: [{ href: "/projects", label: t("Projects"), icon: FolderKanban, module: "projects" }] },
  {
    label: t("Services"),
    items: [
      { href: "/services", label: t("Services"), icon: Wrench, module: "services" },
      { href: "/services/categories", label: t("Categories"), icon: Shapes, module: "services" },
      { href: "/services/solutions", label: t("Materials & solutions"), icon: Layers, module: "services" },
    ],
  },
  {
    label: t("Inventory"),
    items: [
      { href: "/inventory", label: t("Materials stock"), icon: Warehouse, module: "inventory" },
      { href: "/inventory/movements", label: t("Stock movements"), icon: Truck, module: "inventory" },
      { href: "/inventory/products", label: t("Products"), icon: Package, module: "inventory" },
      { href: "/inventory/production", label: t("Production"), icon: Factory, module: "inventory" },
      { href: "/inventory/equipment", label: t("Equipment"), icon: Boxes, module: "inventory" },
    ],
  },
  {
    label: t("Team"),
    items: [
      { href: "/staff", label: t("Employees"), icon: HardHat, module: "staff" },
      { href: "/staff/teams", label: t("Teams"), icon: Users, module: "staff" },
      { href: "/users", label: t("User accounts"), icon: ShieldCheck, module: "users" },
    ],
  },
  { label: "", items: [{ href: "/settings", label: t("Settings"), icon: Settings, module: "settings" }] },
];

const ALL_HREFS = NAV.flatMap((group) => group.items.map((item) => item.href));

/** The most specific nav entry matching the path (so /services/12 → Services, /services/categories → Categories). */
function activeHref(pathname: string) {
  return ALL_HREFS.filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`))).sort(
    (a, b) => b.length - a.length,
  )[0];
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <BrandMark />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">New House Modern</span>
        <span className="block text-[11px] font-medium text-stone-400">{t("Management platform")}</span>
      </span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const current = activeHref(usePathname());
  const { can } = useAuth();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label={t("Main menu")}>
      {NAV.map((group, index) => {
        const items = group.items.filter((item) => can(item.module));
        if (!items.length) return null;
        return (
          <div key={group.label || index}>
            {group.label && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">{group.label}</p>}
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active = href === current;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-brand-500 text-stone-950" : "text-stone-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-bold text-white">{initials(user.full_name || user.email)}</span>
        <Link href="/account" className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{user.full_name || user.email}</span>
          <span className="block truncate text-xs text-stone-400">{choiceLabel(CHOICES.role, user.role)}</span>
        </Link>
        <button type="button" onClick={() => void signOut()} className="rounded-md p-1.5 text-stone-400 hover:bg-white/5 hover:text-white" aria-label={t("Sign out")} title={t("Sign out")}>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** ქარ · EN · RU — saves the choice on the user's account too, then reloads. */
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { user } = useAuth();
  const choose = async (code: Lang) => {
    if (code === lang) return;
    if (user) await api("/auth/me/", { method: "PATCH", body: { language: code } }).catch(() => undefined);
    setLanguage(code);
  };
  return (
    <div role="group" aria-label={t("Language")} className={clsx("flex gap-0.5 rounded-md p-0.5", dark ? "bg-white/10" : "border border-stone-200")}>
      {LANGUAGES.map(({ code, short, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={label}
          aria-pressed={code === lang}
          onClick={() => void choose(code)}
          className={clsx(
            "rounded px-2 py-1 text-xs font-semibold transition-colors",
            code === lang ? (dark ? "bg-white text-stone-950" : "bg-stone-900 text-white") : dark ? "text-stone-300 hover:text-white" : "text-stone-600 hover:text-stone-950",
          )}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

/** Browser tab title in the interface language (the server cannot know it). */
function useDocumentTitle() {
  const pathname = usePathname();
  useEffect(() => {
    const href = activeHref(pathname);
    const item = NAV.flatMap((group) => group.items).find((entry) => entry.href === href);
    const page = pathname === "/account" ? t("My account") : item?.label;
    document.title = page ? `${page} · New House Modern` : "New House Modern";
  }, [pathname]);
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  useDocumentTitle();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // First visit on this device: use the language saved on the user's account.
  useEffect(() => {
    if (user?.language && user.language !== lang && !hasSavedLanguage()) setLanguage(user.language as Lang);
  }, [user]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-stone-950 lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-3">
          <Brand />
        </div>
        <SidebarNav />
        <UserCard />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-stone-950/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-stone-950">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-3">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-stone-400 hover:text-white" aria-label={t("Close menu")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <UserCard />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} className="-ml-2 rounded-md p-2 text-stone-700 lg:hidden" aria-label={t("Open menu")}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-stone-900 lg:hidden">NHM</span>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <a href={`${siteUrl}/${lang}`} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-950 sm:inline-flex">
            {t("View website")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
