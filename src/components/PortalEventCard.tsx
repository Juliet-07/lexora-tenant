import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  MapPin,
  Video,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// How an in-house event shows up in a portal (employee workspace,
// client dashboard, board portal): the same look as the invitation
// email — a dark banner with the date badge, the key facts in a row,
// the agenda as time + item rows — as a card in the list, and the full
// picture in a popup when the card is clicked. The only thing the
// reader can do is confirm attendance (that confirmation IS their
// attendance record — there's no separate check-in).
//
// The same file is used by all three apps; it only depends on this
// structural shape, which each app's own portal-event type satisfies.
// ─────────────────────────────────────────────────────────────

export interface PortalEventView {
  _id: string;
  title: string;
  type: string;
  status: string; // Published | Completed | Cancelled
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  virtual: boolean;
  meetingLink: string;
  host: string;
  agenda?: string;
  agendaItems?: { time?: string; label: string }[];
  timezone?: string;
  inviteMessage?: string;
  inviteImageUrl?: string;
  documents?: {
    id: string;
    name: string;
    description?: string;
    url: string;
    size?: number;
  }[];
  myStatus: string | null;
  myRespondedAt?: string | null;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// `date` is the calendar day itself, stored at UTC midnight.
const badgeOf = (date: string) => {
  const d = new Date(date);
  return { day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()] };
};
const longDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
const timeLabel = (e: PortalEventView) =>
  e.startTime
    ? `${e.startTime}${e.endTime ? ` – ${e.endTime}` : ""}${e.timezone ? ` (${e.timezone})` : ""}`
    : "";
const whereLabel = (e: PortalEventView) =>
  e.virtual ? "Virtual" : e.location || "To be confirmed";

// Rows to show: the structured agenda, or — for an event saved before
// agendas were rows — the old text split into time + item.
export function agendaRows(e: PortalEventView) {
  const rows = (e.agendaItems ?? []).filter((r) => r?.label);
  if (rows.length)
    return rows.map((r) => ({ time: r.time ?? "", label: r.label }));
  return String(e.agenda ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(
        /^(\d{1,2}[:.]\d{2}(?:\s?[AaPp][Mm])?)\s*(?:[-–—:|]\s*)?(.+)$/,
      );
      return m
        ? { time: m[1].replace(".", ":"), label: m[2].trim() }
        : { time: "", label: line };
    });
}

// The UTC instant of a wall-clock time in an IANA zone (same approach
// the server uses for its reminders).
function zonedToUtcMs(ymd: string, hm: string, tz: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = (hm || "09:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const offset = (at: number) => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(new Date(at));
      const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
      return (
        Date.UTC(
          g("year"),
          g("month") - 1,
          g("day"),
          g("hour"),
          g("minute"),
          g("second"),
        ) -
        Math.floor(at / 1000) * 1000
      );
    } catch {
      return 0;
    }
  };
  const o1 = offset(guess);
  let utc = guess - o1;
  const o2 = offset(utc);
  if (o2 !== o1) utc = guess - o2;
  return utc;
}

export function calendarLink(e: PortalEventView, includeMeetingLink: boolean) {
  const ymd = new Date(e.date).toISOString().slice(0, 10);
  const tz = e.timezone || "Africa/Kigali";
  const start = zonedToUtcMs(ymd, e.startTime || "09:00", tz);
  let end = e.endTime ? zonedToUtcMs(ymd, e.endTime, tz) : start;
  if (end <= start) end = start + 3600_000;
  const f = (ms: number) =>
    new Date(ms)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${f(start)}/${f(end)}`,
    details: e.inviteMessage || e.description || "",
    location: e.virtual
      ? includeMeetingLink && e.meetingLink
        ? e.meetingLink
        : "Online"
      : e.location || "",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const fmtSize = (n?: number) =>
  !n
    ? ""
    : n >= 1024 * 1024
      ? `${(n / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(n / 1024))} KB`;

function DateBadge({ date }: { date: string }) {
  const b = badgeOf(date);
  return (
    <div className="shrink-0 rounded-[10px] bg-white px-4 py-2.5 text-center text-[#181229]">
      <div className="text-2xl font-extrabold leading-none">{b.day}</div>
      <div className="mt-0.5 text-[11px] font-bold tracking-wide text-primary">
        {b.month}
      </div>
    </div>
  );
}

// ── List card ──────────────────────────────────────────────────

export function PortalEventCard({
  e,
  onOpen,
  onAcknowledge,
  acknowledging,
}: {
  e: PortalEventView;
  onOpen: () => void;
  onAcknowledge: () => void;
  acknowledging?: boolean;
}) {
  const acknowledged = e.myStatus === "Acknowledged";
  const upcoming = e.status === "Published";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-4 bg-[#181229] px-5 py-4 text-white">
        <DateBadge date={e.date} />
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-snug">{e.title}</p>
          <p className="truncate text-xs text-[#b9b5d6]">
            {e.type} · {whereLabel(e)}
          </p>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {e.startTime && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {e.startTime}
              {e.endTime ? `–${e.endTime}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            {e.virtual ? (
              <Video className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {whereLabel(e)}
          </span>
        </div>
        {(e.inviteMessage || e.description) && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {e.inviteMessage || e.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          {acknowledged ? (
            <Badge className="bg-success/15 text-success" variant="secondary">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Attending
            </Badge>
          ) : upcoming ? (
            <Button
              size="sm"
              disabled={acknowledging}
              onClick={(ev) => {
                ev.stopPropagation();
                onAcknowledge();
              }}
            >
              Acknowledge attendance
            </Button>
          ) : (
            <Badge variant="outline">{e.status}</Badge>
          )}
          <span className="inline-flex items-center text-xs font-medium text-primary">
            {(e.documents ?? []).length > 0 && (
              <span className="mr-2 inline-flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {(e.documents ?? []).length}
              </span>
            )}
            View details
            <ChevronRight className="ml-0.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Detail popup ───────────────────────────────────────────────

export function PortalEventDialog({
  e,
  onClose,
  onAcknowledge,
  acknowledging,
}: {
  e: PortalEventView | null;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  acknowledging?: boolean;
}) {
  // Keep the last event while the close animation runs.
  const [last, setLast] = useState<PortalEventView | null>(null);
  if (e && e !== last) setLast(e);
  const ev = e ?? last;

  const acknowledged = ev?.myStatus === "Acknowledged";
  const upcoming = ev?.status === "Published";
  const rows = ev ? agendaRows(ev) : [];
  const facts = ev
    ? [
        { label: "Date", value: longDate(ev.date) },
        ...(timeLabel(ev) ? [{ label: "Time", value: timeLabel(ev) }] : []),
        { label: "Where", value: whereLabel(ev) },
        ...(ev.host ? [{ label: "Host", value: ev.host }] : []),
      ]
    : [];

  return (
    <Dialog open={!!e} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0">
        {ev && (
          <>
            <div className="flex items-center gap-5 bg-[#181229] px-7 py-7 pr-12 text-white">
              <DateBadge date={ev.date} />
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold leading-snug text-white">
                  {ev.title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#b9b5d6]">
                  {ev.type} · {whereLabel(ev)}
                </DialogDescription>
              </div>
            </div>

            {ev.inviteImageUrl && (
              <img
                src={ev.inviteImageUrl}
                alt=""
                className="block h-auto w-full"
              />
            )}

            <div className="space-y-6 px-7 py-6">
              {(ev.inviteMessage || ev.description) && (
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {ev.inviteMessage && (
                    <p className="whitespace-pre-line">{ev.inviteMessage}</p>
                  )}
                  {ev.description && ev.description !== ev.inviteMessage && (
                    <p className="whitespace-pre-line">{ev.description}</p>
                  )}
                </div>
              )}

              <div
                className={`grid divide-y overflow-hidden rounded-lg border sm:divide-x sm:divide-y-0 ${
                  facts.length >= 4
                    ? "sm:grid-cols-4"
                    : facts.length === 3
                      ? "sm:grid-cols-3"
                      : "sm:grid-cols-2"
                }`}
              >
                {facts.map((f) => (
                  <div key={f.label} className="px-4 py-3 text-center">
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </p>
                    <p className="mt-1 text-[13px] font-bold">{f.value}</p>
                  </div>
                ))}
              </div>

              {rows.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Agenda
                  </p>
                  <ul className="divide-y">
                    {rows.map((r, i) => (
                      <li key={i} className="flex gap-4 py-2.5 text-sm">
                        {r.time && (
                          <span className="w-14 shrink-0 font-bold text-primary">
                            {r.time}
                          </span>
                        )}
                        <span className="text-foreground/80">{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(ev.documents ?? []).length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    Documents
                  </p>
                  <ul className="divide-y rounded-lg border">
                    {(ev.documents ?? []).map((d) => (
                      <li key={d.id}>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                        >
                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {d.name}
                            </span>
                            {(d.description || d.size) && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {[d.description, fmtSize(d.size)]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}
                          </span>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ev.virtual && (
                <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  {acknowledged && ev.meetingLink ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Video className="h-4 w-4" /> Online event
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={ev.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join online
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <p className="inline-flex items-center gap-2 text-muted-foreground">
                      <Video className="h-4 w-4" />
                      {upcoming
                        ? "This is an online event — the joining link appears here once you acknowledge your attendance."
                        : "This was an online event."}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                {acknowledged ? (
                  <Badge
                    className="bg-success/15 text-success"
                    variant="secondary"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> You're attending
                    {ev.myRespondedAt
                      ? ` · confirmed ${new Date(ev.myRespondedAt).toLocaleDateString()}`
                      : ""}
                  </Badge>
                ) : upcoming ? (
                  <Button
                    disabled={acknowledging}
                    onClick={() => onAcknowledge(ev._id)}
                  >
                    Acknowledge attendance
                  </Button>
                ) : (
                  <Badge variant="outline">{ev.status}</Badge>
                )}
                {upcoming && (
                  <a
                    href={calendarLink(ev, acknowledged)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <CalendarPlus className="h-4 w-4" /> Add to calendar
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
