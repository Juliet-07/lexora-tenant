/**
 * Date/time helpers for forms.
 *
 * Why this exists: `<input type="datetime-local">` hands back a *naive*
 * wall-clock string ("2026-11-05T10:30") with no zone. Sent as-is, the
 * server read it as UTC, so a time picked as 10:30 in Kigali was stored
 * as 10:30Z and came back as 12:30 (and emails, rendered in UTC, said
 * 8:30 after a round trip through `toISOString()` on the wrong side).
 * Always turn the wall-clock value into a real instant before sending it,
 * and always format an instant back into the zone the user thinks in.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DDTHH:mm" with no zone information. */
export const NAIVE_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** The browser's IANA zone, falling back to UTC. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function isValidZone(tz?: string | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function zoneOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * Interpret a naive "YYYY-MM-DDTHH:mm" as wall-clock time in `tz` and
 * return the UTC ISO string. Without a usable `tz` it uses the browser's
 * own zone, which is what a bare datetime-local means.
 */
export function zonedToUtcIso(local: string, tz?: string | null): string {
  if (!local) return local;
  if (!NAIVE_DATETIME.test(local)) {
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? local : d.toISOString();
  }
  if (!isValidZone(tz)) return new Date(local).toISOString();
  const [datePart, timePart] = local.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s = "0"] = timePart.split(":");
  const wall = Date.UTC(
    y,
    mo - 1,
    d,
    Number(h),
    Number(mi),
    Math.floor(Number(s)),
  );
  // Two passes settle the offset across a DST change.
  let guess = wall - zoneOffsetMs(wall, tz);
  guess = wall - zoneOffsetMs(guess, tz);
  return new Date(guess).toISOString();
}

/** Format an instant as a datetime-local value, in `tz` (default: browser zone). */
export function toLocalInput(iso?: string | null, tz?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (!isValidZone(tz)) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "now" as a datetime-local value in the browser's zone (not UTC). */
export function nowLocalInput(offsetMs = 0): string {
  return toLocalInput(new Date(Date.now() + offsetMs).toISOString());
}

/**
 * Walk a JSON request body and turn every naive datetime-local string into
 * a real UTC instant (interpreted in the browser's zone). Strings that
 * already carry a zone, and date-only strings, are left alone.
 */
export function normaliseNaiveDateTimes<T>(value: T): T {
  if (typeof value === "string") {
    if (NAIVE_DATETIME.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString() as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => normaliseNaiveDateTimes(v)) as unknown as T;
  }
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normaliseNaiveDateTimes(v);
    }
    return out as T;
  }
  return value;
}
