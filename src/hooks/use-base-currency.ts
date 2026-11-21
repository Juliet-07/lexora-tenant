import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setDefaultCurrency } from "@/lib/currency";

export const BASE_CURRENCY_KEY = ["base-currency"];

export interface BaseCurrencyState {
  baseCurrency: string;
  /** True once the ledger has entries — the currency can no longer change. */
  locked: boolean;
  lockedReason: string | null;
}

export const fetchBaseCurrency = async (): Promise<BaseCurrencyState> => {
  const res = await api.get("/tenant/currency");
  const d = (res.data?.data ?? res.data) as BaseCurrencyState;
  setDefaultCurrency(d?.baseCurrency);
  return d;
};

/** The account's base currency, from the engine; cached for the session. */
export const useBaseCurrency = () =>
  useQuery({
    queryKey: BASE_CURRENCY_KEY,
    queryFn: fetchBaseCurrency,
    staleTime: 5 * 60_000,
    retry: 1,
  });

/**
 * The account's currency changed (Settings → Profile). Point every screen at
 * the new one: update the shared default, drop the per-browser "show finance
 * in…" override (it would keep showing the old currency), and refetch
 * everything that was computed or displayed in the old one.
 */
export function applyBaseCurrencyChange(qc: QueryClient, code: string) {
  setDefaultCurrency(code);
  try {
    localStorage.removeItem("lexora.finance.displayCurrency");
  } catch {
    /* storage unavailable — nothing to clear */
  }
  qc.invalidateQueries();
}
