import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  Target,
} from "lucide-react";
import {
  TONE_SOFT,
  TONE_TEXT,
  fmtScore,
  fmtValue,
  rangeText,
  readScore,
  scoreTone,
  type HealthScore,
  type HsIndicator,
  type HsModule,
} from "@/lib/grc/health-score-api";
import { ScoreRing } from "./ScoreRing";
import { IndicatorBar } from "./IndicatorBar";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function GradeBadge({
  grade,
  score,
}: {
  grade: string | null;
  score: number | null;
}) {
  if (!grade) return <Badge variant="outline">No grade</Badge>;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${TONE_SOFT[scoreTone(score)]}`}
    >
      {grade}
    </span>
  );
}

export default function DashboardTab({ hs }: { hs: HealthScore }) {
  const [drill, setDrill] = useState<string | null>(null);
  const drillModule = hs.modules.find((m) => m.key === drill) ?? null;

  const measured = hs.modules.flatMap((m) =>
    m.indicators.filter((i) => i.isMeasured),
  );
  const priorities = measured
    .filter((i) => (i.normalised ?? 100) < 60)
    .sort((a, b) => (a.normalised ?? 0) - (b.normalised ?? 0))
    .slice(0, 8);
  const unmeasured = hs.modules.flatMap((m) =>
    m.indicators.filter((i) => !i.isMeasured),
  );
  const modName = (k: string) => hs.modules.find((m) => m.key === k)?.name ?? k;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <ScoreRing
            score={hs.composite}
            size={168}
            stroke={14}
            label={hs.grade ?? undefined}
          />
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                GRC Health Score · {hs.periodLabel}
              </div>
              <div
                className={`mt-1 text-xl font-semibold ${TONE_TEXT[scoreTone(hs.composite)]}`}
              >
                {hs.gradeLabel ?? "Not enough data"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {readScore(hs.composite)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">Assessed {fmtDate(hs.assessedAt)}</Badge>
              <Badge variant="outline">
                {hs.coverage.measured} of {hs.coverage.total} indicators
                measured
              </Badge>
              {hs.change !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${
                    hs.change > 0
                      ? TONE_SOFT.good
                      : hs.change < 0
                        ? TONE_SOFT.poor
                        : TONE_SOFT.none
                  }`}
                >
                  {hs.change > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : hs.change < 0 ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                  {hs.change > 0 ? "+" : ""}
                  {hs.change} vs {hs.previous?.label}
                </span>
              )}
              {hs.customised && (
                <Badge variant="secondary">Custom weights in use</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to read */}
      <Card className="border-dashed hidden">
        <CardContent className="flex gap-3 p-4 text-sm">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-muted-foreground">
            <p>
              <b className="text-foreground">How to read this.</b> The company
              is scored from <b>0 to 100</b> across five areas — GRC, Finance,
              HR and Payroll, CRM, and AML — each worth a share of the total
              (shown as its weight). Every area is made of indicators measured
              from your own records, such as “meetings held on time” or
              “invoices collected”.
            </p>
            <p>
              Each indicator is placed between a <b>floor</b> (scores 0) and a{" "}
              <b>target</b> (scores 100). Any indicator under 50 is a red flag
              and trims its area’s score by 5%. Open an area to see exactly what
              was counted, or the <b>How it’s calculated</b> tab for a worked
              example.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hs.modules.map((m) => (
          <ModuleCard key={m.key} m={m} onOpen={() => setDrill(m.key)} />
        ))}
      </div>

      {/* Priorities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Where to act first
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The weakest measured indicators (below 60), lowest first.
          </p>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {measured.length === 0
                ? "Nothing has been measured yet."
                : "Nothing is scoring below 60. Keep it up."}
            </p>
          ) : (
            <ul className="divide-y">
              {priorities.map((i) => (
                <li key={`${i.module}.${i.key}`}>
                  <button
                    type="button"
                    onClick={() => setDrill(i.module)}
                    className="flex w-full items-center gap-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div
                      className={`w-12 shrink-0 text-right text-lg font-bold ${TONE_TEXT[scoreTone(i.normalised)]}`}
                    >
                      {fmtScore(i.normalised)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {i.label}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {modName(i.module)} · {i.basis}
                      </div>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                      <div>
                        Now{" "}
                        <b className="text-foreground">
                          {fmtValue(i.value, i.unit)}
                        </b>
                      </div>
                      <div>Target {fmtValue(i.target, i.unit)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Not measured */}
      {unmeasured.length > 0 && (
        <Card className="hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Not measured yet ({unmeasured.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              There is nothing recorded in Lexora to measure these from. They
              are left out of the score — not counted as zero — and their weight
              is shared among the indicators that are measured. Record the
              underlying activity and they appear automatically.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
            {unmeasured.map((i) => (
              <div key={`${i.module}.${i.key}`} className="text-sm">
                <span className="font-medium">{i.label}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  · {modName(i.module)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ModuleDialog m={drillModule} onClose={() => setDrill(null)} />
    </div>
  );
}

function ModuleCard({ m, onOpen }: { m: HsModule; onOpen: () => void }) {
  const tone = scoreTone(m.score);
  // Weakest measured first, so the card leads with what needs attention.
  const shown = [...m.indicators]
    .sort((a, b) => {
      if (a.isMeasured !== b.isMeasured) return a.isMeasured ? -1 : 1;
      return (a.normalised ?? 0) - (b.normalised ?? 0);
    })
    .slice(0, 4);
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${m.name} indicators`}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{m.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {m.fullName}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[11px]">
                Weight {m.weight}%
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {m.measuredCount}/{m.totalCount} measured
              </Badge>
              {m.critCount > 0 && (
                <Badge
                  variant="outline"
                  className={`text-[11px] ${TONE_SOFT.poor}`}
                >
                  {m.critCount} under 50
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold leading-none ${TONE_TEXT[tone]}`}
            >
              {fmtScore(m.score)}
            </div>
            <div className="mt-1">
              <GradeBadge grade={m.grade} score={m.score} />
            </div>
          </div>
        </div>
        <div className="space-y-2.5">
          {shown.map((i) => (
            <div key={i.key} className={i.isMeasured ? "" : "opacity-60"}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{i.label}</span>
                <span className="shrink-0 font-medium">
                  {i.isMeasured ? fmtValue(i.value, i.unit) : "Not measured"}
                </span>
              </div>
              <IndicatorBar value={i.normalised} muted={!i.isMeasured} />
            </div>
          ))}
        </div>
        <div className="text-xs text-primary">
          View all {m.totalCount} indicators →
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleDialog({
  m,
  onClose,
}: {
  m: HsModule | null;
  onClose: () => void;
}) {
  if (!m) return null;
  const sorted = [...m.indicators].sort((a, b) => {
    if (a.isMeasured !== b.isMeasured) return a.isMeasured ? -1 : 1;
    return (a.normalised ?? 0) - (b.normalised ?? 0);
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {m.name}
            <span className={TONE_TEXT[scoreTone(m.score)]}>
              {fmtScore(m.score)}
            </span>
            <GradeBadge grade={m.grade} score={m.score} />
          </DialogTitle>
          <DialogDescription>
            {m.fullName} · {m.weight}% of the company score · weakest indicators
            first
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {sorted.map((i) => (
            <IndicatorCard key={i.key} i={i} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IndicatorCard({ i }: { i: HsIndicator }) {
  const tone = scoreTone(i.normalised);
  return (
    <div
      className={`rounded-lg border p-4 ${i.isMeasured ? "" : "bg-muted/30"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{i.label}</span>
            {i.customised && (
              <Badge variant="secondary" className="text-[10px]">
                Custom
              </Badge>
            )}
            {i.isMeasured && (i.normalised ?? 100) < 50 && (
              <Badge
                variant="outline"
                className={`text-[10px] ${TONE_SOFT.poor}`}
              >
                Under 50
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{i.desc}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xl font-bold leading-none ${TONE_TEXT[tone]}`}>
            {i.isMeasured ? fmtValue(i.value, i.unit) : "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {i.isMeasured ? `scores ${fmtScore(i.normalised)}` : "Not measured"}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <IndicatorBar value={i.normalised} muted={!i.isMeasured} />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Floor {fmtValue(i.floor, i.unit)}</span>
          <span>Target {fmtValue(i.target, i.unit)}</span>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs md:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">What was counted</dt>
          <dd className="text-muted-foreground">{i.basis}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">
            Weight in {i.module.toUpperCase()}
          </dt>
          <dd className="text-muted-foreground">
            {i.isMeasured
              ? `${i.effectiveWeight}% of the area score (set weight ${i.weight})`
              : `Set weight ${i.weight} — shared out while not measured`}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-medium text-foreground">How it’s measured</dt>
          <dd className="text-muted-foreground">
            {i.how} <span className="italic">({rangeText(i)}.)</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
