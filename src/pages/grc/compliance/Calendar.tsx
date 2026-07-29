import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BellRing,
} from "lucide-react";
import {
  fetchObligations,
  fetchFilings,
  daysUntil,
  todayStr,
} from "@/lib/grc/compliance-api";

type Kind = "Obligation" | "Certification" | "Policy" | "Audit";

interface CalEvent {
  id: string;
  date: string;
  title: string;
  kind: Kind;
  detail: string;
  done: boolean;
}

const KIND_STYLE: Record<Kind, { dot: string; chip: string }> = {
  Obligation: {
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  },
  Certification: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  },
  Policy: {
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  },
  Audit: {
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  },
};

const REMINDERS = [90, 60, 30, 14, 7];

export default function ComplianceCalendar() {
  // Certification/Policy/Audit sources are stubbed empty until those
  // features get their own real backends — this only aggregates real
  // data for what actually exists today (Obligations + Filings).
  const { data: obligations = [] } = useQuery({
    queryKey: ["compliance-obligations"],
    queryFn: fetchObligations,
  });
  const { data: filings = [] } = useQuery({
    queryKey: ["compliance-filings"],
    queryFn: fetchFilings,
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [kinds, setKinds] = useState<Kind[]>([
    "Obligation",
    "Certification",
    "Policy",
    "Audit",
  ]);

  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    obligations.forEach((o) =>
      out.push({
        id: o._id,
        date: o.nextDueDate.slice(0, 10),
        title: o.title,
        kind: "Obligation",
        detail: `${o.regulator} · ${o.owner}`,
        done: false,
      }),
    );
    filings
      .filter((f) => f.stage === "Receipt confirmed")
      .forEach((f) =>
        out.push({
          id: f._id,
          date: f.dueDate.slice(0, 10),
          title: `${f.periodLabel} filing submitted`,
          kind: "Obligation",
          detail: f.receiptRef ?? "",
          done: true,
        }),
      );
    return out.filter((e) => !!e.date);
  }, [obligations, filings]);

  const visible = events.filter((e) => kinds.includes(e.kind));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const upcomingAlerts = visible
    .filter((e) => !e.done)
    .map((e) => ({ e, d: daysUntil(e.date) }))
    .filter(({ d }) => d >= -30 && d <= 90)
    .sort((a, b) => a.d - b.d);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Read-only aggregation of every deadline — regulatory filings,
          certification renewals, policy reviews and audit milestones.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold w-44 text-center">
                {cursor.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Today
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {(Object.keys(KIND_STYLE) as Kind[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={kinds.includes(k)}
                    onCheckedChange={(v) =>
                      setKinds((prev) =>
                        v ? [...prev, k] : prev.filter((x) => x !== k),
                      )
                    }
                  />
                  <span
                    className={`h-2 w-2 rounded-full ${KIND_STYLE[k].dot}`}
                  />
                  {k}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="bg-muted/60 text-center text-xs font-medium py-1.5"
              >
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              const ds = d ? dateStr(d) : "";
              const dayEvents = d ? visible.filter((e) => e.date === ds) : [];
              const isToday = ds === todayStr();
              return (
                <div
                  key={i}
                  className={`bg-card min-h-[92px] p-1.5 ${d ? "" : "opacity-40"}`}
                >
                  {d && (
                    <div
                      className={`text-xs mb-1 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}
                    >
                      {d}
                    </div>
                  )}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => {
                      const overdue = !e.done && e.date < todayStr();
                      return (
                        <div
                          key={e.id}
                          title={`${e.title} — ${e.detail}`}
                          className={`text-[10px] leading-tight rounded px-1 py-0.5 border truncate ${
                            e.done
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 line-through"
                              : overdue
                                ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                : KIND_STYLE[e.kind].chip
                          }`}
                        >
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <Legend className="bg-rose-500" label="Overdue" />
            <Legend className="bg-amber-500" label="Regulatory deadline" />
            <Legend className="bg-sky-500" label="Policy review" />
            <Legend className="bg-violet-500" label="Audit" />
            <Legend
              className="bg-emerald-500"
              label="Completed / certification"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-medium text-sm flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Deadline alerts — 90 / 60 / 30 / 14 / 7 day reminders
          </div>
          {upcomingAlerts.map(({ e, d }) => {
            const milestone = REMINDERS.filter((r) => d <= r).sort(
              (a, b) => a - b,
            )[0];
            return (
              <div
                key={e.kind + e.id}
                className="flex items-center justify-between border rounded p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.kind} · {e.detail} · {e.date}
                  </div>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <div
                    className={
                      d < 0
                        ? "text-rose-600 font-medium"
                        : d <= 7
                          ? "text-amber-600 font-medium"
                          : ""
                    }
                  >
                    {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {d < 0
                      ? "Escalated to senior management"
                      : d <= 7
                        ? "Escalated to manager"
                        : milestone
                          ? `${milestone}-day reminder sent`
                          : "Scheduled"}
                  </div>
                </div>
              </div>
            );
          })}
          {upcomingAlerts.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nothing due in the next 90 days.
            </div>
          )}
        </CardContent>
      </Card>

      {/* <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Badge variant="outline">External sync</Badge>
        Microsoft 365 and Google Calendar two-way sync is configured at tenant
        level — deadlines mirror into each owner's personal calendar.
      </div> */}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
