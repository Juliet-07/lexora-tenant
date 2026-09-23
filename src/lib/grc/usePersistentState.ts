import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state for prototype flows not yet covered by the API. */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
      else setState(typeof initial === "function" ? (initial as () => T)() : initial);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          /* ignore */
        }
        return value;
      });
    },
    [key],
  );

  return [state, update] as const;
}

export const uid = (p = "id") =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
