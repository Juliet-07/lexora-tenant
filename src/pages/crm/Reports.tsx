import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Play, Download, FileText, CalendarClock, Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  prebuiltReports, scheduledReports, mandates, timeEntries, pmInvoices,
  tickets, pmContracts, utilisation, portfolioRisks, money, ragClass,
} from "@/data/crmPmMockData";

const mockContacts = [
  { name: "Eleanor Pritchard", company: "Meridian Holdings Ltd", email: "e.pritchard@meridian.com", stage: "Client" },
  { name: "Isabella Ortega", company: "Helios Renewables", email: "i.ortega@helios.com", stage: "Client" },
  { name: "Kenji Watanabe", company: "Tanaka Enterprises", email: "k.watanabe@tanaka.jp", stage: "Prospect" },
];

const DATA_SOURCES: Record<string, { label: string; fields: string[]; rows: any[] }> = {
  Mandates: { label: "Mandates", fields: ["ref", "name", "clientName", "stage", "rag", "budget", "progress"], rows: mandates },
  Timesheets: { label: "Timesheets", fields: ["date", "member", "mandateName", "hours", "billable", "status"], rows: timeEntries },
  Invoices: { label: "Invoices", fields: ["id", "clientName", "mandateName", "subtotal", "stage", "issuedOn"], rows: pmInvoices },
  Tickets: { label: "Tickets", fields: ["id", "subject", "clientName", "status", "priority", "agent"], rows: tickets },
  Contacts: { label: "Contacts", fields: ["name", "company", "email", "stage"], rows: mockContacts },
  Contracts: { label: "Contracts", fields: ["id", "title", "counterparty", "stage", "value", "expiresOn"], rows: pmContracts },
};

const REPORT_GROUPS = Array.from(new Set(prebuiltReports.map((r) => r.category)));

export default function Reports() {
  const { toast } = useToast();
  const [reportPreview, setReportPreview] = useState<typeof prebuiltReports[number] | null>(null);

  const runReport = (r: typeof prebuiltReports[number], action: string) => {
    toast({ title: `${action} — ${r.name}`, description: "Generating from latest data…" });
    setReportPreview(r);
  };

  // Custom builder
  const [source, setSource] = useState("Mandates");
  const src = DATA_SOURCES[source];
  const [selectedFields, setSelectedFields] = useState<string[]>(src.fields.slice(0, 4));
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState("none");
  const [calcField, setCalcField] = useState("");

  const changeSource = (v: string) => {
    setSource(v);
    setSelectedFields(DATA_SOURCES[v].fields.slice(0, 4));
  };

  const toggleField = (f: string) =>
    setSelectedFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const previewRows = useMemo(() => {
    let rows = [...src.rows];
    if (filterField && filterValue) {
      rows = rows.filter((r) => String(r[filterField] ?? "").toLowerCase().includes(filterValue.toLowerCase()));
    }
    if (sortBy !== "none") {
      rows = rows.sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")));
    }
    return rows.slice(0, 8);
  }, [src, filterField, filterValue, sortBy]);

  // Scheduled reports
  const [schedules, setSchedules] = useState(scheduledReports);
  const [schOpen, setSchOpen] = useState(false);
  const [schDraft, setSchDraft] = useState({ report: prebuiltReports[0].name, frequency: "Weekly (Mon 07:00)", recipients: "", format: "PDF", role: "Partners" });

  const addSchedule = () => {
    setSchedules((s) => [...s, { id: `SCH-${s.length + 1}`, report: schDraft.report, frequency: schDraft.frequency, recipients: schDraft.recipients || "Partners", format: schDraft.format }]);
    setSchOpen(false);
    toast({ title: "Schedule created", description: `${schDraft.report} · ${schDraft.frequency}` });
  };

  // Executive pack
  const [pack, setPack] = useState(false);
  const totalBudget = mandates.reduce((s, m) => s + m.budget, 0);
  const totalActual = mandates.reduce((s, m) => s + m.actualCost, 0);
  const avgUtil = Math.round(utilisation.reduce((s, u) => s + u.billable / u.available, 0) / utilisation.length * 100);
  const atRisk = mandates.filter((m) => m.rag !== "Green").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Pre-built and custom reporting across mandates, finance, people and service desk.
        </p>
      </div>

      <Tabs defaultValue="prebuilt">
        <TabsList className="flex-wrap">
          <TabsTrigger value="prebuilt">Pre-built</TabsTrigger>
          <TabsTrigger value="custom">Custom builder</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="exec">Executive pack</TabsTrigger>
        </TabsList>

        <TabsContent value="prebuilt" className="space-y-6 pt-4">
          {REPORT_GROUPS.map((g) => (
            <div key={g} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{g}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {prebuiltReports.filter((r) => r.category === g).map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{r.name}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">Last run: {r.lastRun}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => runReport(r, "Run")}><Play className="mr-1 h-3.5 w-3.5" /> Run</Button>
                        <Button size="sm" variant="outline" onClick={() => runReport(r, "Export PDF")}><Download className="mr-1 h-3.5 w-3.5" /> PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => runReport(r, "Export Excel")}><Download className="mr-1 h-3.5 w-3.5" /> Excel</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="custom" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Data source</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={source} onValueChange={changeSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(DATA_SOURCES).map((k) => <SelectItem key={k} value={k}>{DATA_SOURCES[k].label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-xs">Fields</Label>
                  {src.fields.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selectedFields.includes(f)} onCheckedChange={() => toggleField(f)} /> {f}
                    </label>
                  ))}
                </div>
                <div>
                  <Label className="text-xs">Filter field</Label>
                  <Input placeholder="field name" value={filterField} onChange={(e) => setFilterField(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Filter value contains</Label>
                  <Input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Group by</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {src.fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sort by</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {src.fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Calculated field</Label>
                  <Input placeholder="e.g. margin = budget - actualCost" value={calcField} onChange={(e) => setCalcField(e.target.value)} />
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Live preview — {src.label}{groupBy !== "none" && ` (grouped by ${groupBy})`}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>{selectedFields.map((f) => <TableHead key={f}>{f}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((r, i) => (
                        <TableRow key={i}>
                          {selectedFields.map((f) => (
                            <TableCell key={f} className="text-sm">{String(r[f] ?? "—")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {previewRows.length === 0 && (
                        <TableRow><TableCell colSpan={selectedFields.length || 1} className="text-center text-sm text-muted-foreground">No rows match this filter.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {calcField && <p className="mt-3 rounded bg-muted p-2 text-xs text-muted-foreground">Calculated field defined: {calcField}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setSchOpen(true)}><CalendarClock className="mr-2 h-4 w-4" /> Schedule report</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead><TableHead>Frequency</TableHead><TableHead>Recipients</TableHead><TableHead>Format</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.report}</TableCell>
                      <TableCell className="text-sm">{s.frequency}</TableCell>
                      <TableCell className="text-sm">{s.recipients}</TableCell>
                      <TableCell><Badge variant="outline">{s.format}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exec" className="pt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Executive pack</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Assembles portfolio health, financial summary, utilisation and risk summary into a single board-ready pack.
              </p>
              <Button onClick={() => setPack(true)}><FileText className="mr-2 h-4 w-4" /> Generate executive pack</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report preview */}
      <Dialog open={!!reportPreview} onOpenChange={(o) => !o && setReportPreview(null)}>
        <DialogContent className="max-w-2xl">
          {reportPreview && (
            <>
              <DialogHeader><DialogTitle>{reportPreview.name}</DialogTitle></DialogHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Client</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Budget</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mandates.slice(0, 5).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.ref}</TableCell>
                      <TableCell className="text-sm">{m.clientName}</TableCell>
                      <TableCell><Badge variant="outline">{m.stage}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{money(m.budget, m.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportPreview(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={schOpen} onOpenChange={setSchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule report</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Report</Label>
              <Select value={schDraft.report} onValueChange={(v) => setSchDraft({ ...schDraft, report: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{prebuiltReports.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={schDraft.frequency} onValueChange={(v) => setSchDraft({ ...schDraft, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Daily", "Weekly (Mon 07:00)", "Monthly (1st)", "Quarterly"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Input placeholder="e.g. Finance, Partners" value={schDraft.recipients} onChange={(e) => setSchDraft({ ...schDraft, recipients: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Format</Label>
                <Select value={schDraft.format} onValueChange={(v) => setSchDraft({ ...schDraft, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["PDF", "Excel"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role visibility</Label>
                <Select value={schDraft.role} onValueChange={(v) => setSchDraft({ ...schDraft, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Partners", "PMO", "Finance", "All staff"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={addSchedule}>Save schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Executive pack preview */}
      <Dialog open={pack} onOpenChange={setPack}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Executive pack — {new Date().toLocaleDateString()}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold">Portfolio health</p>
              <p className="text-muted-foreground">{mandates.length} active mandates · {atRisk} at risk (Amber/Red)</p>
            </div>
            <div>
              <p className="font-semibold">Financial summary</p>
              <p className="text-muted-foreground">Total budget {money(totalBudget)} · Actual cost {money(totalActual)}</p>
            </div>
            <div>
              <p className="font-semibold">Utilisation</p>
              <p className="text-muted-foreground">Average billable utilisation: {avgUtil}%</p>
            </div>
            <div>
              <p className="font-semibold">Risk summary</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {portfolioRisks.slice(0, 4).map((r) => (
                  <li key={r.id}>{r.title} — <Badge className={ragClass[r.severity === "Critical" ? "Red" : r.severity === "High" ? "Amber" : "Green"]}>{r.severity}</Badge></li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PowerPoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
