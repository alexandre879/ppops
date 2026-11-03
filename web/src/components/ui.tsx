import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("container-page", className)} {...props} />;
}

/** Slowly moving orange light; place inside a `relative isolate` parent. */
export function LiquidBackdrop({ tone = "dark", className }: { tone?: "dark" | "light" | "brand"; className?: string }) {
  return (
    <div className={clsx("liquid", tone === "light" && "liquid-light", tone === "brand" && "liquid-brand", className)} aria-hidden>
      <span className="liquid-blob" />
      <span className="liquid-blob" />
      <span className="liquid-blob" />
      <span className="liquid-grain" />
    </div>
  );
}

/** A number that counts up from zero on page load (CSS only). */
export function CountUp({ value }: { value: number }) {
  return (
    <>
      <span className="sr-only">{value}</span>
      <span className="count-up tabular-nums" style={{ "--to": value } as CSSProperties} aria-hidden />
    </>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={clsx(
        "inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase",
        light ? "text-brand-400" : "text-brand-700",
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", light ? "bg-brand-400 shadow-[0_0_12px_2px_rgb(242_107_29/0.7)]" : "bg-brand-500")} aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
  align = "left",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "reveal flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center",
      )}
    >
      <div className={clsx("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
        <h2 className={clsx("mt-3 text-3xl font-extrabold sm:text-4xl", light && "text-white")}>{title}</h2>
        {description && (
          <p className={clsx("mt-4 text-lg leading-relaxed", light ? "text-stone-300" : "text-stone-600")}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

const buttonStyles = {
  primary:
    "bg-brand-500 text-stone-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_28px_-10px_rgb(242_107_29/0.7)] hover:bg-brand-400 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_16px_36px_-10px_rgb(242_107_29/0.85)]",
  dark: "bg-stone-950 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-stone-800",
  outline: "border border-stone-300 bg-white/70 text-stone-900 hover:border-stone-950 hover:bg-white",
  ghostLight:
    "border border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-md hover:border-white/40 hover:bg-white/20",
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-300 ease-liquid",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    "disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-60",
    buttonStyles[variant],
    className,
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-clip bg-stone-950 text-white">
      <LiquidBackdrop />
      <div className="bg-blueprint mask-soft absolute inset-0 -z-10" aria-hidden />
      <Container className="pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-44">
        <div className="animate-rise">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h1 className="text-sheen mt-4 max-w-3xl pb-1 text-4xl font-extrabold sm:text-5xl">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-300">{description}</p>}
        </div>
        {children && <div className="animate-rise [animation-delay:150ms]">{children}</div>}
      </Container>
    </section>
  );
}
