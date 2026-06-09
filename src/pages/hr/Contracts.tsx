import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { FileSignature, Plus, FileText, Download, Send, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { contracts as initial, employees, type Contract } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const statusTone = (s: Contract["status"]) =>
  s === "Signed" ? "bg-success/10 text-success border-success/20"
  : s === "Sent" ? "bg-info/10 text-info border-info/20"
  : s === "Draft" ? "bg-muted text-muted-foreground"
  : s === "Expired" ? "bg-warning/10 text-warning border-warning/20"
  : "bg-destructive/10 text-destructive border-destructive/20";

const typeTone: Record<Contract["type"], string> = {
  Permanent: "bg-primary/10 text-primary border-primary/20",
  "Fixed-term": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Probation: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Contractor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  NDA: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Amendment: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function HRContracts() {
  const [items, setItems] = useState<Contract[]>(initial);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: employees[0].id, type: "Permanent" as Contract["type"], title: "", startDate: "", endDate: "", salary: 0, noticePeriod: "30 days" });
  const { toast } = useToast();

  const create = () => {
    if (!form.title) return;
    const emp = employees.find(e => e.id === form.employeeId)!;
    const c: Contract = {
      id: `CT-${String(items.length + 1).padStart(3, "0")}`,
      employeeId: emp.id, employeeName: `${emp.firstName} ${emp.lastName}`,
      type: form.type, title: form.title, startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate || null, status: "Draft",
      salary: form.salary, currency: "USD", noticePeriod: form.noticePeriod,
    };
    setItems([c, ...items]); setOpen(false);
    toast({ title: "Contract drafted", description: `${c.title} created for ${c.employeeName}.` });
  };

  const send = (c: Contract) => {
    setItems(items.map(x => x.id === c.id ? { ...x, status: "Sent" } : x));
    toast({ title: "Contract sent", description: `Sent to ${c.employeeName} for e-signature.` });
  };

  const counts = {
    total: items.length,
    signed: items.filter(c => c.status === "Signed").length,
    sent: items.filter(c => c.status === "Sent").length,
    expiring: items.filter(c => c.endDate && new Date(c.endDate).getTime() - Date.now() < 90 * 86400000 && c.status === "Signed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground">Employment agreements, amendments, NDAs and e-signature.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> New Contract</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Draft New Contract</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Permanent","Fixed-term","Probation","Contractor","NDA","Amendment"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Notice</Label><Input value={form.noticePeriod} onChange={e => setForm({ ...form, noticePeriod: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Employment Agreement — Senior Engineer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Start date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="space-y-1"><Label>End date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Annual salary (USD)</Label><Input type="number" value={form.salary || ""} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-to-r from-primary to-secondary">Create Draft</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Contracts" value={counts.total} icon={FileSignature} tone="from-primary to-secondary" />
        <Stat label="Signed" value={counts.signed} icon={ShieldCheck} tone="from-emerald-500 to-teal-500" />
        <Stat label="Awaiting Signature" value={counts.sent} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Expiring < 90 days" value={counts.expiring} icon={AlertTriangle} tone="from-rose-500 to-red-500" />
      </div>

      <Tabs defaultValue="all" className="space-y-3">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending Signature</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {["all","active","pending"].map(t => (
          <TabsContent key={t} value={t} className="space-y-2">
            {items.filter(c => t === "all" ? true : t === "active" ? c.status === "Signed" : c.status === "Sent").map(c => (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(c)}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.employeeName} · {c.startDate}{c.endDate ? ` → ${c.endDate}` : " · open-ended"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeTone[c.type]}>{c.type}</Badge>
                    <Badge variant="outline" className={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}

        <TabsContent value="templates" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Permanent Employment", desc: "Standard full-time agreement with confidentiality & IP clauses." },
            { name: "Fixed-term Contract", desc: "Time-bound agreement with optional renewal terms." },
            { name: "Independent Contractor", desc: "Service agreement with milestones and indemnity clauses." },
            { name: "Probation Agreement", desc: "Trial-period agreement with conversion criteria." },
            { name: "Mutual NDA", desc: "Two-way confidentiality with 3-year survival period." },
            { name: "Compensation Amendment", desc: "Salary/title change amendment to active contract." },
          ].map(t => (
            <Card key={t.name}>
              <CardContent className="p-5 space-y-2">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
                <Button variant="outline" size="sm" className="w-full mt-2">Use Template</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (<>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> {selected.title}</SheetTitle>
              <SheetDescription>{selected.employeeName} · {selected.type}</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-3">
              {[
                ["Status", selected.status],
                ["Start date", selected.startDate],
                ["End date", selected.endDate ?? "Open-ended"],
                ["Salary", selected.salary ? `${selected.currency} ${selected.salary.toLocaleString()}/yr` : "—"],
                ["Notice period", selected.noticePeriod],
                ["Signed", selected.signedDate ?? "—"],
              ].map(([k, v]) => <div key={k} className="flex justify-between text-sm border-b pb-2"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>)}
              <div className="flex gap-2 pt-2">
                {selected.status === "Draft" && <Button className="flex-1 bg-gradient-to-r from-primary to-secondary" onClick={() => send(selected)}><Send className="h-4 w-4 mr-2" /> Send for Signature</Button>}
                <Button variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
              </div>
            </div>
          </>)}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
