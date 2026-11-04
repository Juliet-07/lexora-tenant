import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TONE_HEX,
  TONE_TEXT,
  fmtScore,
  scoreTone,
  type HealthScore,
} from "@/lib/grc/health-score-api";

export default function TrendTab({ hs }: { hs: HealthScore }) {
  const data = hs.trend.map((t) => ({
    label: t.label,
    composite: t.composite,
    ...t.modules,
  }));
  const recorded = hs.trend.filter((t) => t.composite !== null).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Company score, last 12 months
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {recorded <= 1
              ? "History starts today. Lexora records the score each month the first time it is calculated, so the chart fills in over the coming months."
              : `${recorded} months recorded. A month is saved the first time the score is calculated in it.`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number | null) => [fmtScore(v), "Score"]}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="composite" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={TONE_HEX[scoreTone(d.composite)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hs.modules.map((m) => {
          const series = hs.trend.map((t) => ({
            label: t.label,
            v: t.modules[m.key] ?? null,
          }));
          return (
            <Card key={m.key}>
              <CardContent className="p-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div
                    className={`text-xl font-bold ${TONE_TEXT[scoreTone(m.score)]}`}
                  >
                    {fmtScore(m.score)}
                  </div>
                </div>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={series}
                      margin={{ top: 6, right: 6, left: 6, bottom: 0 }}
                    >
                      <YAxis domain={[0, 100]} hide />
                      <XAxis dataKey="label" hide />
                      <Tooltip
                        formatter={(v: number | null) => [fmtScore(v), m.name]}
                      />
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={TONE_HEX[scoreTone(m.score)]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
