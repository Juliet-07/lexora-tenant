// The account's base currency, shared by every screen.
//
// It is set once in Settings → Profile (the owner chooses it) and read from
// the engine when the app loads (see hooks/use-base-currency.ts). Anything
// that needs "the currency to use when none was chosen" — the default on a
// new invoice, a bill, a rate card, a deal; the fallback when a record has no
// currency of its own; the first option in a currency picker — reads it from
// here instead of assuming USD.

const CODE = /^[A-Z]{3}$/;

let current = "USD";

/** The account's base currency (USD until the account's own is loaded). */
export const defaultCurrency = (): string => current;

/** Called when the account's currency is loaded or changed. */
export const setDefaultCurrency = (code?: string | null): void => {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (CODE.test(c)) current = c;
};

/** A currency picker's options, with the account's own currency first. */
export const withBase = (list: readonly string[]): string[] =>
  Array.from(new Set([current, ...list]));
