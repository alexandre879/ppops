import clsx from "clsx";

const TONES = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  progress: "bg-brand-50 text-brand-800 ring-brand-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
} as const;

export type Tone = keyof typeof TONES;

const STATUS_TONES: Record<string, Tone> = {
  // projects / production
  planned: "neutral",
  in_progress: "progress",
  on_hold: "warning",
  completed: "success",
  cancelled: "danger",
  // enquiries
  new: "info",
  contacted: "progress",
  qualified: "progress",
  quoted: "info",
  won: "success",
  lost: "danger",
  // quotations / contracts
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "danger",
  expired: "warning",
  active: "success",
  terminated: "danger",
  // customers / staff
  lead: "info",
  inactive: "neutral",
  on_leave: "warning",
  // equipment
  available: "success",
  in_use: "info",
  maintenance: "warning",
  retired: "neutral",
  // priority
  low: "neutral",
  normal: "neutral",
  high: "warning",
  urgent: "danger",
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string | null }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label ?? status.replace(/_/g, " ")}</Badge>;
}
