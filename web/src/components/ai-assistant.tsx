"use client";

import clsx from "clsx";
import { ArrowUp, ArrowUpRight, Phone, RotateCcw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { localePath, type Locale } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n";
import { telHref } from "@/lib/format";

type Source = { title: string; url: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  /** A status line (offline, error) shown in the chat but never sent back to the API. */
  notice?: boolean;
};
type Status = "unknown" | "checking" | "online" | "offline";

const ENDPOINT = "/api/public/assistant/";
const STORAGE_KEY = "nhm-assistant";
// The API reads the latest 12 messages and accepts questions up to 1000 characters.
const HISTORY_SENT = 12;
const MAX_QUESTION = 1000;

/** The conversation survives page reloads within the browser tab. */
function loadMessages(): Message[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string",
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // Private mode or storage full: the chat still works, it just won't survive a reload.
  }
}

/** Replies are plain text; lines starting with "- " become a list. */
function ReplyText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (!items.length) return;
    blocks.push(
      <ul key={blocks.length} className="list-disc space-y-1 pl-5 marker:text-brand-500">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    );
    items = [];
  };
  for (const raw of text.replace(/\*\*(.+?)\*\*/g, "$1").split("\n")) {
    const line = raw.trim();
    const bullet = /^[-•*]\s+/.exec(line);
    if (bullet) {
      items.push(line.slice(bullet[0].length));
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{line}</p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

/** Every company number as a tap-to-call link, shown when the assistant can't answer. */
function CallLinks({ phones }: { phones: string[] }) {
  if (!phones.length) return null;
  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      {phones.map((phone) => (
        <a key={phone} href={telHref(phone)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {phone}
        </a>
      ))}
    </div>
  );
}

export function AiAssistant({
  lang,
  t,
  phones,
  company,
}: {
  lang: Locale;
  t: Dictionary["assistant"];
  phones: string[];
  company: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>("unknown");
  const loaded = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const vars = { company };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function commit(next: Message[]) {
    setMessages(next);
    saveMessages(next);
  }

  async function checkStatus() {
    setStatus("checking");
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      setStatus(response.ok && data.enabled ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }

  function openPanel() {
    if (!loaded.current) {
      loaded.current = true;
      setMessages(loadMessages());
    }
    if (status === "unknown" || status === "offline") void checkStatus();
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  async function ask(text: string) {
    const question = text.trim().slice(0, MAX_QUESTION);
    if (!question || pending || status === "offline") return;

    const withQuestion: Message[] = [...messages, { role: "user", content: question }];
    commit(withQuestion);
    setInput("");
    setPending(true);

    const history = withQuestion
      .filter((m) => !m.notice)
      .slice(-HISTORY_SENT)
      .map(({ role, content }) => ({ role, content }));
    let reply: Message;
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": lang },
        body: JSON.stringify({ messages: history }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.answer === "string") {
        const sources = Array.isArray(data.sources)
          ? (data.sources as Source[]).filter((s) => typeof s?.url === "string" && s.url.startsWith("/") && !s.url.startsWith("//"))
          : [];
        reply = { role: "assistant", content: data.answer, sources };
      } else if (response.ok) {
        reply = { role: "assistant", content: t.declined, notice: true };
      } else if (response.status === 429) {
        reply = { role: "assistant", content: fmt(t.tooMany, vars), notice: true };
      } else if (response.status === 503) {
        setStatus("offline");
        reply = { role: "assistant", content: fmt(t.unavailable, vars), notice: true };
      } else {
        reply = { role: "assistant", content: fmt(t.error, vars), notice: true };
      }
    } catch {
      reply = { role: "assistant", content: fmt(t.network, vars), notice: true };
    }
    commit([...withQuestion, reply]);
    setPending(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(input);
    }
  }

  function onPanelKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") closePanel();
  }

  // On phones the panel covers the page, so following a source link closes it.
  function onFollowLink() {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }

  const offline = status === "offline";
  const statusLine = { unknown: t.checking, checking: t.checking, online: t.online, offline: t.offline }[status];

  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={onPanelKey}
          className="animate-pop flex h-[min(38rem,calc(100dvh-7.5rem))] w-[calc(100vw-1.5rem)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_30px_80px_-20px_rgb(28_25_23/0.5),0_0_40px_-10px_rgb(242_107_29/0.35)] sm:w-[25rem]"
        >
          <header className="relative isolate bg-stone-950 bg-[radial-gradient(120%_160%_at_0%_0%,rgb(242_107_29/0.5),transparent_60%)] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 shadow-[0_0_18px_2px_rgb(242_107_29/0.6)]">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-base leading-tight font-bold text-white">
                  {t.title}
                </h2>
                <p className="mt-0.5 flex items-start gap-1.5 text-xs leading-snug text-stone-300">
                  <span
                    className={clsx(
                      "mt-[5px] h-2 w-2 shrink-0 rounded-full",
                      status === "online" && "bg-emerald-400 shadow-[0_0_8px_1px_rgb(52_211_153/0.8)]",
                      offline && "bg-stone-500",
                      (status === "unknown" || status === "checking") && "animate-pulse bg-amber-300",
                    )}
                    aria-hidden
                  />
                  {statusLine}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => commit([])}
                  className="rounded-full p-2 text-stone-300 transition hover:bg-white/10 hover:text-white"
                  aria-label={t.newChat}
                  title={t.newChat}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={closePanel}
                className="rounded-full p-2 text-stone-300 transition hover:bg-white/10 hover:text-white"
                aria-label={t.close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-stone-50 px-4 py-4 text-[14px] leading-relaxed" aria-live="polite">
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-stone-800 shadow-sm ring-1 ring-stone-200/70">
              {fmt(t.welcome, vars)}
            </div>

            {messages.length === 0 && !offline && (
              <div className="flex flex-wrap gap-2 pt-1">
                {t.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    disabled={pending}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-brand-800 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, i) =>
              message.role === "user" ? (
                <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2.5 whitespace-pre-wrap text-white shadow-sm">
                  {message.content}
                </div>
              ) : (
                <div
                  key={i}
                  className={clsx(
                    "max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm ring-1",
                    message.notice ? "bg-brand-50 text-stone-800 ring-brand-200" : "bg-white text-stone-800 ring-stone-200/70",
                  )}
                >
                  <ReplyText text={message.content} />
                  {message.notice && <CallLinks phones={phones} />}
                  {!!message.sources?.length && (
                    <div className="mt-3 border-t border-stone-200/80 pt-2.5">
                      <p className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">{t.sources}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {message.sources.map((source) => (
                          <Link
                            key={source.url}
                            href={source.url}
                            onClick={onFollowLink}
                            className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 transition hover:border-brand-400 hover:bg-brand-100"
                          >
                            {source.title}
                            <ArrowUpRight className="h-3 w-3" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}

            {offline && !messages.at(-1)?.notice && (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-brand-50 px-3.5 py-2.5 text-stone-800 shadow-sm ring-1 ring-brand-200">
                <p>{t.unavailable}</p>
                <CallLinks phones={phones} />
              </div>
            )}

            {pending && (
              <div className="flex items-center gap-2" role="status">
                <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-stone-200/70" aria-hidden>
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
                <span className="text-xs text-stone-500">{t.thinking}</span>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-stone-200 bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-stone-300/80 bg-white py-1.5 pr-1.5 pl-3.5 transition-shadow focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25">
              <label htmlFor={`${panelId}-input`} className="sr-only">
                {t.placeholder}
              </label>
              <textarea
                ref={inputRef}
                id={`${panelId}-input`}
                rows={1}
                value={input}
                maxLength={MAX_QUESTION}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKey}
                placeholder={t.placeholder}
                disabled={offline}
                className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || pending || offline}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_0_14px_rgb(242_107_29/0.45)] transition hover:bg-brand-600 disabled:bg-stone-300 disabled:shadow-none"
                aria-label={t.send}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-2 px-1 text-[11px] leading-snug text-stone-500">
              {t.disclaimer}{" "}
              <Link href={localePath(lang, "/contact")} onClick={onFollowLink} className="font-semibold text-brand-700 hover:underline">
                {t.getEstimate}
              </Link>
            </p>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={open ? closePanel : openPanel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? t.close : t.launcher}
        className="group flex items-center gap-3 rounded-full focus-visible:outline-none"
      >
        {!open && (
          <span className="hidden items-center gap-2 rounded-full border border-brand-200/80 bg-white/95 px-4 py-2 text-sm font-semibold text-stone-900 shadow-[0_10px_30px_-8px_rgb(242_107_29/0.6)] transition duration-300 ease-liquid group-hover:-translate-x-1 sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 shadow-[0_0_10px_2px_rgb(242_107_29/0.8)]" aria-hidden />
            {t.launcher}
          </span>
        )}
        <span className="relative isolate flex h-16 w-16 items-center justify-center">
          <span className="ai-halo" aria-hidden />
          <span className="ai-pulse flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-brand-400 via-brand-500 to-brand-700 text-white ring-2 ring-white/80 transition duration-300 ease-liquid group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-brand-300 group-active:scale-95">
            {open ? <X className="h-7 w-7" aria-hidden /> : <Sparkles className="h-7 w-7" aria-hidden />}
          </span>
          {!open && (
            <span className="absolute -top-1 -right-1 rounded-full bg-stone-950 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white ring-2 ring-white" aria-hidden>
              {t.badge}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
