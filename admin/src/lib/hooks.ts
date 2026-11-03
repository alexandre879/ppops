"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, type Paginated } from "./api";
import type { Row } from "./types";

type Params = Record<string, string | number | boolean | null | undefined>;

/** Lists accept both paginated and plain-array endpoints. */
export function useList<T extends Row = Row>(endpoint: string, params: Params = {}, enabled = true) {
  return useQuery({
    queryKey: [endpoint, "list", params],
    queryFn: async ({ signal }) => {
      const data = await api<Paginated<T> | T[]>(endpoint, { params, signal });
      return Array.isArray(data) ? { count: data.length, total_pages: 1, page: 1, results: data } : data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRecord<T extends Row = Row>(endpoint: string, id: number | string | null | undefined) {
  return useQuery({
    queryKey: [endpoint, "detail", String(id)],
    queryFn: ({ signal }) => api<T>(`${endpoint}${id}/`, { signal }),
    enabled: id !== null && id !== undefined && id !== "",
  });
}

/** Options for relation selects: fetches up to 500 rows once and caches them. */
export function useOptions(endpoint: string | undefined, params: Params = {}) {
  return useQuery({
    queryKey: [endpoint, "options", params],
    queryFn: async ({ signal }) => {
      const data = await api<Paginated<Row> | Row[]>(endpoint!, { params: { page_size: 500, ...params }, signal });
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(endpoint),
    staleTime: 60_000,
  });
}

export function useInvalidate() {
  const client = useQueryClient();
  return (...endpoints: string[]) =>
    Promise.all(endpoints.map((endpoint) => client.invalidateQueries({ queryKey: [endpoint] })));
}

/** POST/PATCH/DELETE with toast feedback and cache invalidation. */
export function useAction<TArgs = void, TResult = unknown>(
  fn: (args: TArgs) => Promise<TResult>,
  { invalidate = [], success }: { invalidate?: string[]; success?: string | ((result: TResult) => string) } = {},
) {
  const refresh = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result) => {
      await refresh(...invalidate);
      if (success) toast.success(typeof success === "function" ? success(result) : success);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
