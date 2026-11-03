/**
 * API client for the admin platform.
 *
 * - The short-lived access token is kept in memory only.
 * - The refresh token is an httpOnly cookie set by Django; on a 401 we refresh
 *   once (deduplicated across concurrent requests) and retry.
 */
import { lang, t } from "./i18n";
import type { Me } from "./types";

export type Paginated<T> = { count: number; total_pages: number; page: number; results: T[] };
type AuthPayload = { access: string; user: Me };
type Params = Record<string, string | number | boolean | null | undefined>;
type RequestOptions = { method?: string; body?: unknown; params?: Params; signal?: AbortSignal };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown,
  ) {
    super(message);
  }

  /** DRF field errors flattened to ``{field: "first message"}``. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (this.data && typeof this.data === "object" && !Array.isArray(this.data)) {
      for (const [key, value] of Object.entries(this.data as Record<string, unknown>)) {
        out[key] = Array.isArray(value) ? String(value[0]) : typeof value === "string" ? value : JSON.stringify(value);
      }
    }
    return out;
  }
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    const general = record.non_field_errors;
    if (Array.isArray(general) && general.length) return String(general[0]);
    if (Array.isArray(data) && data.length) return String(data[0]);
    if (Object.keys(record).length) return t("Please check the highlighted fields.");
  }
  if (status === 403) return t("You don't have permission to do that.");
  if (status === 404) return t("Not found.");
  if (status >= 500) return t("Server error. Please try again.");
  return t("Request failed ({status}).", { status });
}

let accessToken: string | null = null;
let refreshing: Promise<AuthPayload | null> | null = null;
let sessionListener: (user: Me | null) => void = () => {};

export function onSessionChange(listener: (user: Me | null) => void) {
  sessionListener = listener;
}

export function refreshSession(): Promise<AuthPayload | null> {
  refreshing ??= fetch("/api/auth/refresh/", { method: "POST", credentials: "same-origin", headers: { "Accept-Language": lang } })
    .then(async (response) => (response.ok ? ((await response.json()) as AuthPayload) : null))
    .catch(() => null)
    .then((payload) => {
      accessToken = payload?.access ?? null;
      sessionListener(payload?.user ?? null);
      return payload;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function login(email: string, password: string): Promise<Me> {
  const response = await fetch("/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Language": lang },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 429 ? t("Too many attempts. Please wait a minute.") : errorMessage(data, response.status);
    throw new ApiError(message, response.status, data);
  }
  accessToken = (data as AuthPayload).access;
  return (data as AuthPayload).user;
}

export async function logout() {
  await fetch("/api/auth/logout/", { method: "POST" }).catch(() => undefined);
  accessToken = null;
  sessionListener(null);
}

export function buildUrl(path: string, params?: Params) {
  const url = path.startsWith("/api/") ? path : `/api${path}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

function send(path: string, options: RequestOptions) {
  const isForm = options.body instanceof FormData;
  // The server answers in the interface language (messages, content translations).
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": lang };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  return fetch(buildUrl(path, options.params), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    signal: options.signal,
  });
}

export async function apiFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  let response = await send(path, options);
  if (response.status === 401 && (await refreshSession())) {
    response = await send(path, options);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(errorMessage(data, response.status), response.status, data);
  }
  return response;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Fetch an authenticated file as a blob URL (caller revokes it). */
export async function fetchBlobUrl(path: string): Promise<{ url: string; filename: string }> {
  const response = await apiFetch(path);
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), filename: match ? decodeURIComponent(match[1]) : "download" };
}

export async function downloadFile(path: string) {
  const { url, filename } = await fetchBlobUrl(path);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
