import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Download } from "lucide-react";
import { EsgMetricsPanel } from "@/components/grc/EsgMetricsPanel";
import {
  SOCIAL_CATEGORIES,
  fetchMetrics,
  fetchContext,
} from "@/lib/grc/esg-api";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";

export default function EsgSocial() {
  const { data: social = [] } = useQuery({
    queryKey: ["esgMetrics", "Social"],
    queryFn: () => fetchMetrics("Social"),
  });
  const { data: context } = useQuery({
    queryKey: ["esgContext"],
    queryFn: fetchContext,
  });
  const find = (n: string) => social.find((m) => m.name === n);
  const score = social.length
    ? Math.round(
        social.reduce((s, m) => s + m.targetProgress, 0) / social.length,
      )
    : 0;

  const definition = {
    id: "esg-social",
    title: "Social Performance Report",
    subtitle: `Pillar score ${score}/100 · workforce data sourced from the HR module`,
    summary: [
      { label: "Pillar score", value: score },
      { label: "Headcount", value: context?.employees ?? "—" },
      {
        label: "Women in workforce",
        value: `${find("Women in workforce")?.value ?? "—"}%`,
      },
      {
        label: "Gender pay gap",
        value: `${find("Gender pay gap (mean)")?.value ?? "—"}%`,
      },
    ],
    sections: [
      {
        heading: "Social metrics",
        columns: [
          "Category",
          "Metric",
          "Value",
          "Unit",
          "Intensity",
          "YoY %",
          "Target",
          "Progress %",
          "Source",
        ],
        rows: social.map((m) => [
          m.category,
          m.name,
          m.value,
          m.unit,
          m.intensity ? `${m.intensity.value} ${m.intensity.label}` : "—",
          m.improvement,
          `${m.target} by ${m.targetYear}`,
          m.targetProgress,
          m.source,
        ]),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-600" />
            Social
          </h1>
          <p className="text-sm text-muted-foreground">
            Workforce, diversity, health &amp; safety, engagement, equal pay and
            community data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReportPdf(definition)}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReportExcel(definition)}
          >
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Pillar score" value={score} />
        <Stat label="Headcount" value={context?.employees ?? "—"} />
        <Stat
          label="Women in workforce"
          value={`${find("Women in workforce")?.value ?? "—"}%`}
        />
        <Stat
          label="LTIFR"
          value={find("Lost-time injury frequency rate")?.value ?? "—"}
        />
        <Stat
          label="Engagement"
          value={`${find("Employee engagement score")?.value ?? "—"}/100`}
        />
      </div>

      <Tabs defaultValue="Workforce">
        <TabsList className="flex-wrap h-auto">
          {SOCIAL_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
        {SOCIAL_CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            <EsgMetricsPanel
              pillar="Social"
              category={c}
              categories={SOCIAL_CATEGORIES}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
