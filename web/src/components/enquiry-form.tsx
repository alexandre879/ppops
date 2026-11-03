"use client";

import clsx from "clsx";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

import { buttonClass } from "./ui";

type ServiceOption = { slug: string; title: string; group: string };
type Status = "idle" | "sending" | "sent" | "error";

const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-stone-300/80 bg-white px-3.5 py-2.5 transition-shadow duration-300 text-[15px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none";

export function EnquiryForm({
  services,
  defaultService = "",
  dark = false,
  lang,
  t,
}: {
  services: ServiceOption[];
  defaultService?: string;
  dark?: boolean;
  lang: Locale;
  t: Dictionary["form"];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!body.service) delete body.service;

    setStatus("sending");
    setErrors({});
    try {
      const response = await fetch("/api/public/enquiries/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": lang },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus("sent");
        setMessage(data.detail ?? t.sentText);
        form.reset();
        return;
      }
      if (response.status === 429) {
        setMessage(t.tooMany);
      } else {
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
        }
        setErrors(fieldErrors);
        setMessage(fieldErrors.non_field_errors ?? fieldErrors.detail ?? t.checkFields);
      }
      setStatus("error");
    } catch {
      setStatus("error");
      setMessage(t.network);
    }
  }

  if (status === "sent") {
    return (
      <div className={clsx("rounded-2xl border p-8 text-center", dark ? "border-white/10 bg-white/5" : "border-stone-200 bg-stone-50")}>
        <CircleCheck className="mx-auto h-12 w-12 text-brand-500" aria-hidden />
        <h3 className={clsx("mt-4 text-xl font-bold", dark && "text-white")}>{t.sentTitle}</h3>
        <p className={clsx("mt-2", dark ? "text-stone-300" : "text-stone-600")}>{message}</p>
        <button type="button" className={buttonClass(dark ? "ghostLight" : "outline", "mt-6")} onClick={() => setStatus("idle")}>
          {t.sendAnother}
        </button>
      </div>
    );
  }

  const label = clsx("block text-sm font-semibold", dark ? "text-stone-200" : "text-stone-800");
  const groups = Array.from(new Set(services.map((s) => s.group)));

  const error = (name: string) =>
    errors[name] ? (
      <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="enq-name" className={label}>
          {t.name} *
        </label>
        <input id="enq-name" name="name" required maxLength={160} autoComplete="name" className={fieldClass} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        {error("name")}
      </div>
      <div>
        <label htmlFor="enq-phone" className={label}>
          {t.phone} *
        </label>
        <input id="enq-phone" name="phone" type="tel" autoComplete="tel" placeholder="+995" className={fieldClass} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} />
        {error("phone")}
      </div>
      <div>
        <label htmlFor="enq-email" className={label}>
          {t.email}
        </label>
        <input id="enq-email" name="email" type="email" autoComplete="email" className={fieldClass} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
        {error("email")}
      </div>
      <div>
        <label htmlFor="enq-service" className={label}>
          {t.service}
        </label>
        <select id="enq-service" name="service" defaultValue={defaultService} className={fieldClass}>
          <option value="">{t.notSure}</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {services
                .filter((s) => s.group === group)
                .map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="enq-location" className={label}>
          {t.location}
        </label>
        <input id="enq-location" name="location" placeholder={t.locationPlaceholder} className={fieldClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="enq-message" className={label}>
          {t.message}
        </label>
        <textarea id="enq-message" name="message" rows={5} maxLength={5000} placeholder={t.messagePlaceholder} className={fieldClass} />
        {error("message")}
      </div>
      {/* Honeypot — hidden from people, irresistible to bots */}
      <div className="hidden" aria-hidden>
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={clsx("text-sm", dark ? "text-stone-400" : "text-stone-500")}>
          {t.hint}
        </p>
        <button type="submit" disabled={status === "sending"} className={buttonClass("primary", "shrink-0")}>
          {status === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {status === "sending" ? t.sending : t.submit}
        </button>
      </div>
      {status === "error" && message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
          {message}
        </p>
      )}
    </form>
  );
}
