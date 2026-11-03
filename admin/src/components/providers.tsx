"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Toaster } from "sonner";

import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { t } from "@/lib/i18n";

const subscribe = () => () => {};

export function Providers({ children }: { children: ReactNode }) {
  // The admin is a client-side app whose language comes from the browser, so it
  // renders only after hydration (avoids server/client language mismatches).
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );
  if (!mounted) return null;
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-right" richColors closeButton containerAriaLabel={t("Notifications")} />
    </QueryClientProvider>
  );
}
