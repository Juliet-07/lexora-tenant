import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TONE_TEXT,
  fmtScore,
  fmtValue,
  scoreTone,
  type HealthScore,
} from "@/lib/grc/health-score-api";

const r1 = (n: number) => Math.round(n * 10) / 10;

// Explains the score in plain language, then walks one area through the
// arithmetic using the company's real numbers so the reader can check it.
export default function AlgorithmTab({ hs }: { hs: HealthScore }) {
  const [key, setKey] = useState(
    hs.modules.find((m) => m.score !== null)?.key ?? hs.modules[0].key,
  );
  const m = hs.modules.find((x) => x.key === key) ?? hs.modules[0];
  const live = m.indicators.filter((i) => i.isMeasured);
  const crit = live.filter((i) => (i.normalised ?? 100) < 50);
  const scored = hs.modules.filter((x) => x.score !== null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">The score in four steps</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            [
              "1 · Measure",
              "Each indicator is measured from your own records — meetings held, invoices collected, policies reviewed — as a percentage, ratio or number of months.",
            ],
            [
              "2 · Place on a 0–100 scale",
              "The measure is placed between a floor (scores 0) and a target (scores 100): (value − floor) ÷ (target − floor) × 100, kept between 0 and 100.",
            ],
            [
              "3 · Combine into an area score",
              "An area’s score is the weighted average of its indicators. Every indicator under 50 multiplies the result by 0.95 — one red flag costs 5%, two cost about 10%.",
            ],
            [
              "4 · Combine the areas",
              "The company score is each area’s score times its weight: GRC 25, Finance 25, HR 18, CRM 17, AML 15 (unless your administrator changed them).",
            ],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border p-3">
              <div className="text-sm font-semibold">{t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
          <div className="md:col-span-4 rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
            Health Score = Σ ( area weight × area score )<br />
            Area score = Σ ( indicator weight × normalised ) ÷ Σ weights × 0.95
            <sup>(indicators under 50)</sup>
            <br />
            Normalised = clamp( (value − floor) ÷ (target − floor) × 100, 0, 100
            )
          </div>
          <p className="md:col-span-4 text-xs text-muted-foreground">
            An indicator that cannot be measured yet is <b>left out</b>, and its
            weight is shared among the others in the same area. If a whole area
            has nothing measured, its weight is shared among the other areas.
            Nothing unmeasured is ever counted as a perfect score or a zero.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Worked example</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick an area to see exactly how your figures became its score.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {hs.modules.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setKey(x.key)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                  x.key === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {x.name}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {live.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Nothing in {m.name} can be measured yet, so it has no score and is
              left out of the company total.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicator</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Floor</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Scores</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="text-right">Adds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {live.map((i) => (
                      <TableRow key={i.key}>
                        <TableCell className="text-sm">{i.label}</TableCell>
                        <TableCell className="text-right">
                          {fmtValue(i.value, i.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtValue(i.floor, i.unit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmtValue(i.target, i.unit)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${TONE_TEXT[scoreTone(i.normalised)]}`}
                        >
                          {fmtScore(i.normalised)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {i.effectiveWeight}%
                        </TableCell>
                        <TableCell className="text-right">
                          {r1(((i.normalised ?? 0) * i.effectiveWeight) / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ol className="space-y-1.5 rounded-md bg-muted/50 p-4 text-sm">
                <li>
                  <b>Weighted average</b> of the “Adds” column ={" "}
                  <b>{fmtScore(m.rawScore)}</b>
                </li>
                <li>
                  <b>Indicators under 50:</b> {m.critCount}
                  {crit.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({crit.map((c) => c.label).join(", ")})
                    </span>
                  )}{" "}
                  → multiplier 0.95
                  <sup>{m.critCount}</sup> = <b>{m.penalty}</b>
                </li>
                <li>
                  <b>{m.name} score</b> = {fmtScore(m.rawScore)} × {m.penalty} ={" "}
                  <b className={TONE_TEXT[scoreTone(m.score)]}>
                    {fmtScore(m.score)}
                  </b>{" "}
                  <Badge variant="outline" className="ml-1">
                    {m.grade} · {m.gradeLabel}
                  </Badge>
                </li>
                {m.measuredCount < m.totalCount && (
                  <li className="text-xs text-muted-foreground">
                    {m.totalCount - m.measuredCount} of {m.totalCount}{" "}
                    indicators are not measured yet and are left out; the
                    “Share” column already reflects that.
                  </li>
                )}
              </ol>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Putting the areas together
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Set weight</TableHead>
                  <TableHead className="text-right">Weight used</TableHead>
                  <TableHead className="text-right">Adds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hs.modules.map((x) => (
                  <TableRow key={x.key}>
                    <TableCell className="text-sm">{x.name}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${TONE_TEXT[scoreTone(x.score)]}`}
                    >
                      {x.score === null ? "Not measured" : fmtScore(x.score)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {x.weight}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {x.score === null ? "—" : `${x.effectiveWeight}%`}
                    </TableCell>
                    <TableCell className="text-right">
                      {x.score === null
                        ? "—"
                        : r1((x.score * x.effectiveWeight) / 100)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Company score</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right">
                    {scored.length ? "100%" : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right ${TONE_TEXT[scoreTone(hs.composite)]}`}
                  >
                    {fmtScore(hs.composite)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grades</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {hs.grades.map((g, idx) => {
            const upper = idx === 0 ? 100 : hs.grades[idx - 1].min - 0.1;
            const current = hs.grade === g.grade;
            return (
              <div
                key={g.grade}
                className={`rounded-lg border p-3 text-center ${current ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="text-lg font-bold">{g.grade}</div>
                <div className="text-xs text-muted-foreground">{g.label}</div>
                <div className="mt-1 text-xs">
                  {g.min === 0
                    ? `below ${hs.grades[idx - 1].min}`
                    : `${g.min}–${r1(upper)}`}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
