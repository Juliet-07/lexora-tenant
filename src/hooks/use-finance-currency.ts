import { useState } from "react";

const KEY = "lexora.finance.displayCurrency";

// The same list used in Payroll and the tenant profile's currency
// picker, kept in one place so every finance page offers the same
// options.
export const FINANCE_CURRENCIES = [
  "USD",
  "RWF",
  "EUR",
  "GBP",
  "NGN",
  "KES",
  "ZAR",
  "GHS",
  "INR",
  "JPY",
];

// A shared display-currency preference across every Finance page —
// "" means "use the tenant's own base currency" (the default for
// every figure already), anything else asks the backend to convert
// into that currency instead. Persisted per browser, not per page,
// so picking a currency on one Finance screen carries over to the
// rest without needing a shared layout or routing change.
export function useFinanceCurrency() {
  const [currency, setCurrencyState] = useState<string>(
    () => localStorage.getItem(KEY) || "",
  );
  const setCurrency = (next: string) => {
    if (next) {
      localStorage.setItem(KEY, next);
    } else {
      localStorage.removeItem(KEY);
    }
    setCurrencyState(next);
  };
  return [currency, setCurrency] as const;
}
