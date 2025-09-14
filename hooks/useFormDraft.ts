"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export interface UseFormDraftOptions<T> {
  key: string; // unique key, e.g., `event-edit:${eventId}`
  data: T | undefined; // current form data
  enabled?: boolean; // default true
  debounceMs?: number; // default 600ms
}

export function useFormDraft<T = any>({ key, data, enabled = true, debounceMs = 600 }: UseFormDraftOptions<T>) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const getDraft = useQuery(api.formDrafts.get, enabled ? { key } : "skip");
  const upsertDraft = useMutation(api.formDrafts.upsert);
  const clearDraft = useMutation(api.formDrafts.clear);

  const timer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef<string>("");

  // Save on data changes with debounce
  useEffect(() => {
    if (!enabled) return;
    const payload = JSON.stringify(data ?? {});
    if (payload === lastSaved.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await upsertDraft({ key, data: data ?? {} } as any);
        lastSaved.current = payload;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1200);
      } catch (e) {
        setStatus("error");
      }
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [JSON.stringify(data), enabled, debounceMs, key, upsertDraft]);

  const restore = useMemo(() => (getDraft?.data as T | undefined), [getDraft?.data]);

  const clear = async () => {
    await clearDraft({ key } as any);
    lastSaved.current = JSON.stringify(data ?? {});
    setStatus("idle");
  };

  return { status, restore, clear };
}
