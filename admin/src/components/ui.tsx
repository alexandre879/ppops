"use client";

import clsx from "clsx";
import { ArrowLeft, Inbox, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { t } from "@/lib/i18n";

/* ---------- Buttons ---------- */

const buttonVariants = {
  primary: "bg-stone-900 text-white shadow-sm hover:bg-stone-700 active:bg-stone-950",
  secondary: "border border-stone-200 bg-white text-stone-800 shadow-xs hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
  danger: "border border-red-200 bg-white text-red-700 shadow-xs hover:bg-red-50 hover:border-red-300",
  dark: "bg-stone-900 text-white shadow-sm hover:bg-stone-700 active:bg-stone-950",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
};

export function buttonClass(variant: keyof typeof buttonVariants = "primary", size: "sm" | "md" = "md", className?: string) {
  return clsx(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
    buttonVariants[variant],
    className,
  );
}

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants; size?: "sm" | "md" }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ---------- Form controls ---------- */

export const controlClass =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-xs transition-[border-color,box-shadow] placeholder:text-stone-400 hover:border-stone-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none disabled:bg-stone-50 disabled:text-stone-500 disabled:shadow-none disabled:hover:border-stone-300 aria-invalid:border-red-400";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(controlClass, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(controlClass, "pr-8", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  help,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  help?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : help ? <p className="mt-1 text-xs text-stone-500">{help}</p> : null}
    </div>
  );
}

/* ---------- Layout ---------- */

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {meta && <div className="mb-1.5 flex flex-wrap items-center gap-2">{meta}</div>}
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">{title}</h1>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={clsx("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs", className)}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-stone-200/70 px-5 py-2.5">
          {title && <h2 className="text-sm font-semibold tracking-tight text-stone-950">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "warning";
  href?: string;
}) {
  const body = (
    <div className={clsx("h-full rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition", href && "hover:border-stone-300 hover:shadow-sm")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug font-medium text-stone-500">{label}</p>
        {icon && (
          <span className={clsx("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-stone-100 text-stone-500")}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl leading-none font-semibold tracking-tight text-stone-950 tabular-nums">{value}</p>
      {hint && (
        <p className={clsx("mt-2 flex items-center gap-1.5 text-xs", tone === "warning" ? "font-medium text-amber-700" : "text-stone-500")}>
          {tone === "warning" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />}
          {hint}
        </p>
      )}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function DetailList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={clsx("grid gap-x-6 gap-y-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-stone-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-stone-900">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "danger" | "success" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={clsx("h-full rounded-full", tone === "danger" ? "bg-red-500" : tone === "success" ? "bg-emerald-500" : "bg-brand-500")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx("h-5 w-5 animate-spin text-stone-400", className)} aria-label={t("Loading…")} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400 shadow-xs">{icon ?? <Inbox className="h-5 w-5" aria-hidden />}</span>
      <p className="mt-3 text-sm font-semibold text-stone-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p className="font-semibold">{t("Could not load data")}</p>
      <p className="mt-1">{error.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t("Try again")}
        </Button>
      )}
    </div>
  );
}

/* ---------- Tabs ---------- */

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 -mx-1 overflow-x-auto border-b border-stone-200">
      <div role="tablist" className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={tab.value === value}
            onClick={() => onChange(tab.value)}
            className={clsx(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              tab.value === value ? "border-brand-500 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-800",
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="rounded-full bg-stone-100 px-1.5 text-xs text-stone-600 tabular-nums">{tab.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Modal & confirm ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
      (target ?? panelRef.current)?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" }[size],
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-stone-200/70 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-stone-950">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label={t("Close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-stone-200/70 bg-stone-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

type ConfirmRequest = { title: string; message?: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void };

/** ``const [confirm, dialog] = useConfirm()`` — render ``dialog`` once, ``await confirm({...})`` anywhere. */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirm = useCallback(
    (options: Omit<ConfirmRequest, "resolve">) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };
  const dialog = (
    <Modal
      open={request !== null}
      onClose={() => close(false)}
      title={request?.title ?? ""}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            {t("Cancel")}
          </Button>
          <Button variant={request?.danger ? "danger" : "primary"} onClick={() => close(true)}>
            {request?.confirmLabel ?? t("Confirm")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-stone-600">{request?.message}</p>
    </Modal>
  );
  return [confirm, dialog] as const;
}
