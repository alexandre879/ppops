"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's cookie / storage choice, kept in localStorage (itself strictly necessary).
 *
 * - "essential": only what the site needs to work (language cookie, this choice).
 * - "all": also optional third-party embeds (Google Maps) and remembering the AI assistant chat.
 * - null: not decided yet, so the banner is shown and nothing optional loads.
 */
export type Consent = "essential" | "all";

const STORAGE_KEY = "nhm-consent";
// Bump when the categories change so everyone is asked again.
const VERSION = 1;
const CHANGE_EVENT = "nhm-consent-change";
export const OPEN_SETTINGS_EVENT = "nhm-consent-open";

function read(): Consent | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed?.v === VERSION && (parsed.choice === "essential" || parsed.choice === "all")) return parsed.choice;
  } catch {
    // Unreadable or blocked storage counts as "not decided".
  }
  return null;
}

export function getConsent(): Consent | null {
  return typeof window === "undefined" ? null : read();
}

export function setConsent(choice: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, choice, at: new Date().toISOString() }));
  } catch {
    // Storage blocked: the choice holds for this page only.
  }
  if (choice !== "all") {
    // Withdrawing consent removes what was stored under it.
    try {
      window.sessionStorage.removeItem("nhm-assistant");
    } catch {}
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: choice }));
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Current choice; `undefined` during server render and hydration (unknown yet). */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
