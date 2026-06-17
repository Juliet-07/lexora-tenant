// MIFOTRA-aligned Workplace Demographics report.
// MIFOTRA (Rwanda Ministry of Public Service and Labour) requires employers
// to report headcount by gender, age band, nationality, disability, contract
// type, education level and occupational category.

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileBarChart, Users, Globe, Accessibility, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";

interface DemographicRow {
  category: string;
  male: number;
  female: number;
  total: number;
  share: number;
}

const seedAge: DemographicRow[] = build([
  ["Under 25", 6, 9],
  ["25 – 34", 18, 21],
  ["35 – 44", 14, 11],
  ["45 – 54", 7, 5],
  ["55+", 3, 2],
]);

const seedNationality: DemographicRow[] = build([
  ["Rwandan", 38, 41],
  ["East African Community", 6, 4],
  ["Other African", 2, 2],
  ["International", 2, 1],
]);

const seedContract: DemographicRow[] = build([
  ["Full-time", 36, 39],
  ["Part-time", 4, 3],
  ["Fixed-term", 6, 4],
  ["Internship", 2, 2],
]);

const seedEducation: DemographicRow[] = build([
  ["Secondary", 5, 4],
  ["TVET / Diploma", 9, 11],
  ["Bachelor's", 24, 22],
  ["Master's", 9, 10],
  ["PhD", 1, 1],
]);

const seedOccupation: DemographicRow[] = build([
  ["Managers", 8, 6],
  ["Professionals", 18, 21],
  ["Technicians", 9, 8],
  ["Clerical", 6, 7],
  ["Service / Sales", 5, 4],
  ["Elementary", 2, 2],
]);

const seedDisability = { withDisability: 3, withoutDisability: 92 };

function build(rows: [string, number, number][]): DemographicRow[] {
  const total = rows.reduce((s, r) => s + r[1] + r[2], 0);
  return rows.map(([category, male, female]) => ({
    category,
    male,
    female,
    total: male + female,
    share: Math.round(((male + female) / total) * 100),
  }));
}

export default function HRReports() {
  const [period, setPeriod] = useState("2026-Q2");
  const [location, setLocation] = useState("all");

  const totals = useMemo(() => {
    const sum = seedAge.reduce(
      (acc, r) => ({ m: acc.m + r.male, f: acc.f + r.female }),
      { m: 0, f: 0 },
    );
    return { ...sum, total: sum.m + sum.f };
  }, []);

  const download = (fmt: "csv" | "html") => {
    if (fmt === "csv") {
      const rows = [
        ["MIFOTRA Workplace Demographics Report"],
        [`Period: ${period}`, `Location: ${location}`],
        [],
        ["AGE BAND", "Male", "Female", "Total", "% Share"],
        ...seedAge.map((r) => [r.category, r.male, r.female, r.total, `${r.share}%`]),
        [],
        ["NATIONALITY", "Male", "Female", "Total", "% Share"],
        ...seedNationality.map((r) => [r.category, r.male, r.female, r.total, `${r.share}%`]),
        [],
        ["CONTRACT TYPE", "Male", "Female", "Total", "% Share"],
        ...seedContract.map((r) => [r.category, r.male, r.female, r.total, `${r.share}%`]),
        [],
        ["EDUCATION", "Male", "Female", "Total", "% Share"],
        ...seedEducation.map((r) => [r.category, r.male, r.female, r.total, `${r.share}%`]),
        [],
        ["OCCUPATIONAL CATEGORY", "Male", "Female", "Total", "% Share"],
        ...seedOccupation.map((r) => [r.category, r.male, r.female, r.total, `${r.share}%`]),
        [],
        ["DISABILITY", "Count"],
        ["With disability", seedDisability.withDisability],
        ["Without disability", seedDisability.withoutDisability],
      ]
        .map((r) => r.join(","))
        .join("\n");
      triggerDownload(rows, `mifotra-${period}.csv`, "text/csv");
    } else {
      const html = renderHtml(period, location);
      triggerDownload(html, `mifotra-${period}.html`, "text/html");
    }
    toast.success(`Report exported (${fmt.toUpperCase()}).`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">HR Reports</h1>
          <p className="text-sm text-muted-foreground">
            Workplace demographics — aligned with the MIFOTRA reporting standard.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download("csv")}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button className="bg-gradient-to-r from-primary to-secondary" onClick={() => download("html")}>
            <Download className="h-4 w-4 mr-2" /> Full Report
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Reporting period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2026-Q1", "2026-Q2", "2025-Annual", "2025-Q4"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                <SelectItem value="kigali">Kigali HQ</SelectItem>
                <SelectItem value="huye">Huye Branch</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[180px]">
            <Label className="text-xs">Submitting officer</Label>
            <Input placeholder="Name of HR officer" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Headcount" value={totals.total} icon={Users} tone="from-primary to-secondary" />
        <Stat label="Male" value={`${totals.m} (${Math.round((totals.m / totals.total) * 100)}%)`} icon={Users} tone="from-blue-500 to-cyan-500" />
        <Stat label="Female" value={`${totals.f} (${Math.round((totals.f / totals.total) * 100)}%)`} icon={Users} tone="from-pink-500 to-rose-500" />
        <Stat label="With disability" value={seedDisability.withDisability} icon={Accessibility} tone="from-amber-500 to-orange-500" />
      </div>

      <Tabs defaultValue="age">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="age">Age Band</TabsTrigger>
          <TabsTrigger value="nationality">Nationality</TabsTrigger>
          <TabsTrigger value="contract">Contract Type</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="occupation">Occupation</TabsTrigger>
          <TabsTrigger value="disability">Disability</TabsTrigger>
        </TabsList>

        <TabsContent value="age" className="mt-4"><DemoTable rows={seedAge} icon={Users} title="Age distribution" /></TabsContent>
        <TabsContent value="nationality" className="mt-4"><DemoTable rows={seedNationality} icon={Globe} title="Nationality" /></TabsContent>
        <TabsContent value="contract" className="mt-4"><DemoTable rows={seedContract} icon={FileText} title="Contract type" /></TabsContent>
        <TabsContent value="education" className="mt-4"><DemoTable rows={seedEducation} icon={GraduationCap} title="Education level" /></TabsContent>
        <TabsContent value="occupation" className="mt-4"><DemoTable rows={seedOccupation} icon={FileBarChart} title="Occupational category" /></TabsContent>
        <TabsContent value="disability" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Accessibility className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Disability inclusion</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">With disability</p>
                  <p className="text-2xl font-bold">{seedDisability.withDisability}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Without disability</p>
                  <p className="text-2xl font-bold">{seedDisability.withoutDisability}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DemoTable({ rows, icon: Icon, title }: { rows: DemographicRow[]; icon: any; title: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-5 py-3 border-b">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Category</th>
                <th className="text-right px-5 py-2 font-medium">Male</th>
                <th className="text-right px-5 py-2 font-medium">Female</th>
                <th className="text-right px-5 py-2 font-medium">Total</th>
                <th className="text-right px-5 py-2 font-medium">% Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category} className="border-t">
                  <td className="px-5 py-2">{r.category}</td>
                  <td className="px-5 py-2 text-right">{r.male}</td>
                  <td className="px-5 py-2 text-right">{r.female}</td>
                  <td className="px-5 py-2 text-right font-medium">{r.total}</td>
                  <td className="px-5 py-2 text-right">
                    <Badge variant="outline">{r.share}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function triggerDownload(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderHtml(period: string, location: string) {
  const section = (title: string, rows: DemographicRow[]) => `
    <h2>${title}</h2>
    <table><thead><tr><th>Category</th><th>Male</th><th>Female</th><th>Total</th><th>% Share</th></tr></thead>
    <tbody>${rows
      .map((r) => `<tr><td>${r.category}</td><td>${r.male}</td><td>${r.female}</td><td>${r.total}</td><td>${r.share}%</td></tr>`)
      .join("")}</tbody></table>`;
  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>MIFOTRA Workplace Demographics — ${period}</title>
  <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:40px;color:#0f172a}
  h1{background:linear-gradient(90deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  h2{margin-top:28px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  th,td{padding:6px 10px;text-align:left;border-bottom:1px solid #f1f5f9}
  th{background:#f8fafc;color:#475569;font-weight:600}
  </style></head><body>
  <h1>MIFOTRA Workplace Demographics Report</h1>
  <p>Period: <strong>${period}</strong> · Location: <strong>${location}</strong> · Generated ${new Date().toLocaleString("en-GB")}</p>
  ${section("Age band", seedAge)}
  ${section("Nationality", seedNationality)}
  ${section("Contract type", seedContract)}
  ${section("Education", seedEducation)}
  ${section("Occupational category", seedOccupation)}
  <h2>Disability</h2>
  <p>With disability: <strong>${seedDisability.withDisability}</strong> · Without: <strong>${seedDisability.withoutDisability}</strong></p>
  </body></html>`;
}
