import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, FileText, FolderOpen, ClipboardCheck, ShieldCheck, PenSquare, ListChecks, Archive, MessageSquare, Trash2, GripVertical, ChevronRight, CheckCircle2 } from "lucide-react";
import { CP, DDItem, DEAL_STAGES, DealStage, cpsProgress, ddProgress, formatMoney, gid, stageColor, updateDeal, useDeals } from "@/lib/dealsStore";
import { toast } from "sonner";

export default function DealDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const s = useDeals();
  const deal = s.deals.find((d) => d.id === id);

  if (!deal) return (
    <div className="p-6">
      <Button variant="ghost" onClick={() => nav("/grc/deals/pipeline")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <div className="mt-6 text-muted-foreground">Deal not found.</div>
    </div>
  );

  const stageIdx = DEAL_STAGES.indexOf(deal.stage);
  const cps = cpsProgress(deal);

  function moveStage(next: DealStage) {
    // gating example: prevent signing without passing pre-sign checklist
    if (next === "Signing") {
      const remaining = deal.signing.checklist.filter((c) => c.status !== "Done").length;
      if (deal.signing.checklist.length > 0 && remaining > 0) {
        return toast.error(`Cannot move to Signing — ${remaining} pre-signing item(s) outstanding.`);
      }
    }
    updateDeal(deal.id, { stage: next });
    toast.success(`Stage updated to ${next}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/grc/deals/pipeline" className="hover:underline">Deal Pipeline</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{deal.name}</span>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{deal.name}</h1>
                <Badge variant="outline">{deal.type}</Badge>
                <Badge variant="outline" className={stageColor(deal.stage)}>{deal.stage}</Badge>
                <Badge variant="outline">{deal.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {deal.client} <span className="mx-1">↔</span> {deal.counterparty} · Lead: {deal.leadPartner} · {deal.jurisdiction}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={deal.stage} onValueChange={(v) => moveStage(v as DealStage)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={deal.status} onValueChange={(v) => updateDeal(deal.id, { status: v as any })}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>{["Active", "Completed", "Lost", "On Hold"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Lifecycle strip */}
          <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-1">
            {DEAL_STAGES.map((st, i) => (
              <button
                key={st}
                onClick={() => moveStage(st)}
                className={`text-[10px] py-2 px-1 rounded border transition text-center ${
                  i < stageIdx ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" :
                  i === stageIdx ? "bg-primary text-primary-foreground border-primary" :
                  "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i + 1}. {st}
              </button>
            ))}
          </div>

          {/* Snapshot */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Value</div><div className="font-semibold">{formatMoney(deal.value, deal.currency)}</div></div>
            <div><div className="text-xs text-muted-foreground">Start</div><div className="font-semibold">{deal.startDate}</div></div>
            <div><div className="text-xs text-muted-foreground">Target close</div><div className="font-semibold">{deal.targetClose}</div></div>
            <div><div className="text-xs text-muted-foreground">Longstop</div><div className={`font-semibold ${deal.longstopDate < new Date().toISOString().slice(0, 10) ? "text-rose-600" : ""}`}>{deal.longstopDate}</div></div>
            <div><div className="text-xs text-muted-foreground">DD / CPs</div><div className="font-semibold">{ddProgress(deal)}% · {cps.done}/{cps.total}</div></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="termsheet">Term Sheet</TabsTrigger>
          <TabsTrigger value="dataroom">Data Room</TabsTrigger>
          <TabsTrigger value="dd">Due Diligence</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="cps">CPs Tracker</TabsTrigger>
          <TabsTrigger value="signing">Signing</TabsTrigger>
          <TabsTrigger value="post">Post-Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab deal={deal} />
        </TabsContent>
        <TabsContent value="termsheet"><TermSheetTab deal={deal} /></TabsContent>
        <TabsContent value="dataroom"><DataRoomTab deal={deal} /></TabsContent>
        <TabsContent value="dd"><DDTab deal={deal} /></TabsContent>
        <TabsContent value="contract"><ContractTab deal={deal} clauses={s.clauses} /></TabsContent>
        <TabsContent value="cps"><CPsTab deal={deal} /></TabsContent>
        <TabsContent value="signing"><SigningTab deal={deal} /></TabsContent>
        <TabsContent value="post"><PostTab deal={deal} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────── Overview ───────────────────────────
function OverviewTab({ deal }: { deal: any }) {
  const cps = cpsProgress(deal);
  const dd = ddProgress(deal);
  const flags = deal.dd.filter((x: DDItem) => x.status === "Red Flag");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Due Diligence</span><span>{dd}%</span></div>
            <Progress value={dd} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Conditions Precedent</span><span>{cps.done}/{cps.total}</span></div>
            <Progress value={cps.total ? (cps.done / cps.total) * 100 : 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Pre-signing checklist</span><span>{deal.signing.checklist.filter((c: any) => c.status === "Done").length}/{deal.signing.checklist.length}</span></div>
            <Progress value={deal.signing.checklist.length ? (deal.signing.checklist.filter((c: any) => c.status === "Done").length / deal.signing.checklist.length) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Deal team</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><b>Lead partner:</b> {deal.leadPartner}</div>
          {deal.team.length > 0 && <div><b>Team:</b> {deal.team.join(", ")}</div>}
          <div className="pt-2"><b>Conflict check:</b> {deal.conflictCheck.cleared ? <Badge variant="outline" className="text-emerald-700 border-emerald-500/30">Cleared</Badge> : <Badge variant="outline" className="text-rose-700 border-rose-500/30">Flagged</Badge>}</div>
          <div className="text-xs text-muted-foreground">{deal.conflictCheck.note}</div>
        </CardContent>
      </Card>
      {flags.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base text-rose-700">Red-flag findings ({flags.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {flags.map((f: DDItem) => (
              <div key={f.id} className="rounded border border-rose-500/30 bg-rose-500/5 p-2 text-sm">
                <div className="font-medium">{f.workstream}: {f.item}</div>
                <div className="text-xs text-muted-foreground">{f.finding} · Materiality: {f.materiality}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────── Term Sheet ───────────────────────────
function TermSheetTab({ deal }: { deal: any }) {
  const [t, setT] = useState(deal.termSheet);
  const fields: [string, keyof typeof t][] = [
    ["Parties", "parties"],
    ["Structure", "structure"],
    ["Consideration", "consideration"],
    ["Conditions", "conditions"],
    ["Exclusivity", "exclusivity"],
    ["Confidentiality", "confidentiality"],
    ["Timeline", "timeline"],
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Term Sheet Builder</CardTitle>
        <Button size="sm" onClick={() => { updateDeal(deal.id, { termSheet: { ...t, updatedAt: new Date().toISOString() } }); toast.success("Term sheet saved"); }}>Save</Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(([label, key]) => (
          <div key={key} className={key === "parties" || key === "structure" ? "md:col-span-2" : ""}>
            <Label>{label}</Label>
            <Textarea value={(t as any)[key]} onChange={(e) => setT({ ...t, [key]: e.target.value })} rows={2} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Data Room ───────────────────────────
function DataRoomTab({ deal }: { deal: any }) {
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("01 Corporate");
  const [q, setQ] = useState("");
  const [qa, setQa] = useState("");

  const files = deal.dataRoom.files.filter((f: any) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  function addFile() {
    if (!name) return;
    updateDeal(deal.id, (d) => ({ ...d, dataRoom: { ...d.dataRoom, files: [...d.dataRoom.files, { id: gid("f"), name, folder, size: "1.0 MB", uploadedAt: new Date().toISOString(), uploadedBy: "You", version: 1, views: 0 }] } }));
    setName("");
    toast.success("File added (watermarked on view/download)");
  }
  function addQA() {
    if (!qa) return;
    updateDeal(deal.id, (d) => ({ ...d, dataRoom: { ...d.dataRoom, qa: [...d.dataRoom.qa, { id: gid("qa"), question: qa, askedBy: "Counterparty", askedAt: new Date().toISOString(), status: "Open" }] } }));
    setQa("");
  }
  function answerQA(qid: string, answer: string) {
    updateDeal(deal.id, (d) => ({ ...d, dataRoom: { ...d.dataRoom, qa: d.dataRoom.qa.map((x: any) => x.id === qid ? { ...x, answer, status: "Answered", answeredBy: "Deal lead" } : x) } }));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FolderOpen className="h-4 w-4" />Documents ({deal.dataRoom.files.length})</CardTitle>
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48 h-8" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Folder</TableHead><TableHead>Size</TableHead><TableHead>Version</TableHead><TableHead>Views</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {files.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">{f.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.folder}</TableCell>
                  <TableCell className="text-xs">{f.size}</TableCell>
                  <TableCell className="text-xs">v{f.version}</TableCell>
                  <TableCell className="text-xs">{f.views}</TableCell>
                </TableRow>
              ))}
              {files.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No files.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <div className="p-3 border-t flex gap-2">
            <Input placeholder="File name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{["01 Corporate", "02 Financials", "03 Contracts", "04 HR", "05 Regulatory", "06 IP"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={addFile}><Plus className="h-4 w-4 mr-1" />Upload</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Party access</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {deal.dataRoom.parties.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.type} · {p.members} member(s)</div>
              </div>
              <Badge variant="outline">{p.permission}</Badge>
            </div>
          ))}
          {deal.dataRoom.parties.length === 0 && <div className="text-xs text-muted-foreground">No parties invited yet.</div>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Q&A workflow</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Log counterparty question…" value={qa} onChange={(e) => setQa(e.target.value)} />
            <Button onClick={addQA}>Log Q</Button>
          </div>
          <div className="space-y-2">
            {deal.dataRoom.qa.map((q: any) => (
              <div key={q.id} className="border rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">{q.question}</div>
                  <Badge variant="outline">{q.status}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">Asked by {q.askedBy} · {new Date(q.askedAt).toLocaleDateString()}</div>
                {q.answer ? (
                  <div className="mt-2 text-sm bg-muted/40 rounded p-2">
                    <div className="text-[11px] text-muted-foreground mb-1">Answered by {q.answeredBy}</div>
                    {q.answer}
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="Draft answer…" onKeyDown={(e) => { if (e.key === "Enter") { answerQA(q.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} />
                  </div>
                )}
              </div>
            ))}
            {deal.dataRoom.qa.length === 0 && <div className="text-xs text-muted-foreground">No questions raised yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Due Diligence ───────────────────────────
function DDTab({ deal }: { deal: any }) {
  const [item, setItem] = useState({ workstream: "Legal" as DDItem["workstream"], item: "", owner: "" });
  function add() {
    if (!item.item) return;
    updateDeal(deal.id, (d) => ({ ...d, dd: [...d.dd, { id: gid("dd"), workstream: item.workstream, item: item.item, owner: item.owner || "Unassigned", status: "Not Started" }] }));
    setItem({ ...item, item: "", owner: "" });
  }
  function setStatus(iid: string, status: DDItem["status"], finding?: string) {
    updateDeal(deal.id, (d) => ({ ...d, dd: d.dd.map((x: DDItem) => x.id === iid ? { ...x, status, ...(finding !== undefined ? { finding } : {}) } : x) }));
  }
  const grouped = deal.dd.reduce((a: any, d: DDItem) => { (a[d.workstream] ||= []).push(d); return a; }, {});
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Due Diligence workspace ({ddProgress(deal)}% complete)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Progress value={ddProgress(deal)} className="h-2" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select value={item.workstream} onValueChange={(v) => setItem({ ...item, workstream: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Legal", "Financial", "Tax", "Commercial", "Operational", "ESG"].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Checklist item…" value={item.item} onChange={(e) => setItem({ ...item, item: e.target.value })} className="md:col-span-2" />
            <div className="flex gap-2">
              <Input placeholder="Owner" value={item.owner} onChange={(e) => setItem({ ...item, owner: e.target.value })} />
              <Button onClick={add}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {Object.entries(grouped).map(([ws, items]: any) => (
        <Card key={ws}>
          <CardHeader><CardTitle className="text-base">{ws} workstream</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead>Finding</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((it: DDItem) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{it.item}</TableCell>
                    <TableCell className="text-xs">{it.owner}</TableCell>
                    <TableCell>
                      <Select value={it.status} onValueChange={(v) => setStatus(it.id, v as any)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Not Started", "In Progress", "Complete", "Red Flag"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{it.finding ?? "—"}{it.materiality && <Badge variant="outline" className="ml-1 text-[10px]">{it.materiality}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {deal.dd.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No DD items yet. Checklist auto-generates on entering the Due Diligence stage.</div>}
    </div>
  );
}

// ─────────────────────────── Contract Builder ───────────────────────────
function ContractTab({ deal, clauses }: any) {
  const [showLib, setShowLib] = useState(false);
  const vars = deal.contract.variables as Record<string, string>;
  const varList = Object.keys(vars);
  const bodyText = deal.contract.sections.map((s: any) => s.body).join(" ");
  const usedVars = Array.from(new Set((bodyText.match(/\[([A-Z_]+)\]/g) || []).map((v: string) => v.slice(1, -1))));
  const unfilled = usedVars.filter((v) => !vars[v]);

  function addClause(cl: any) {
    updateDeal(deal.id, (d) => ({ ...d, contract: { ...d.contract, sections: [...d.contract.sections, { id: gid("sec"), clauseId: cl.id, title: cl.title, body: cl.body, comments: [] }] } }));
  }
  function removeSection(sid: string) {
    updateDeal(deal.id, (d) => ({ ...d, contract: { ...d.contract, sections: d.contract.sections.filter((s: any) => s.id !== sid) } }));
  }
  function updateSectionBody(sid: string, body: string) {
    updateDeal(deal.id, (d) => ({ ...d, contract: { ...d.contract, sections: d.contract.sections.map((s: any) => s.id === sid ? { ...s, body } : s) } }));
  }
  function setVar(k: string, v: string) {
    updateDeal(deal.id, (d) => ({ ...d, contract: { ...d.contract, variables: { ...d.contract.variables, [k]: v } } }));
  }

  function renderBody(body: string) {
    return body.replace(/\[([A-Z_]+)\]/g, (_, k) => vars[k] ? vars[k] : `[${k}]`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><PenSquare className="h-4 w-4" />Live workspace ({deal.contract.sections.length} clauses)</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowLib(!showLib)}>{showLib ? "Hide" : "Insert from"} library</Button>
            <Button size="sm" onClick={() => toast.success("Export ready — Word/PDF")}>Export</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {deal.contract.sections.map((s: any) => (
            <div key={s.id} className="border-2 border-dashed rounded-md p-3 hover:border-primary/60">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold"><GripVertical className="h-4 w-4 text-muted-foreground" />{s.title}</div>
                <Button size="icon" variant="ghost" onClick={() => removeSection(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea value={s.body} onChange={(e) => updateSectionBody(s.id, e.target.value)} rows={3} className="text-sm" />
              <div className="text-xs text-muted-foreground mt-1">Preview: {renderBody(s.body)}</div>
            </div>
          ))}
          {deal.contract.sections.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No clauses yet. Insert from the Clause Library.</div>}
          {showLib && (
            <div className="border rounded p-3 space-y-2 bg-muted/30">
              <div className="text-xs font-semibold">Clause Library</div>
              {clauses.map((cl: any) => (
                <div key={cl.id} className="flex items-center justify-between text-sm border-b py-1 last:border-0">
                  <div><span className="font-medium">{cl.title}</span> <span className="text-xs text-muted-foreground">— {cl.category}</span></div>
                  <Button size="sm" variant="outline" onClick={() => addClause(cl)}><Plus className="h-3 w-3 mr-1" />Insert</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Smart variables</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {usedVars.map((k) => (
            <div key={k}>
              <Label className="text-xs">{k}</Label>
              <Input value={vars[k] || ""} onChange={(e) => setVar(k, e.target.value)} placeholder={`[${k}]`} />
            </div>
          ))}
          {varList.filter((v) => !usedVars.includes(v)).map((k) => (
            <div key={k}>
              <Label className="text-xs text-muted-foreground">{k} (unused)</Label>
              <Input value={vars[k] || ""} onChange={(e) => setVar(k, e.target.value)} />
            </div>
          ))}
          <div className="text-xs pt-2 border-t">
            <div className="flex items-center justify-between"><span>Unfilled</span><Badge variant="outline" className={unfilled.length ? "text-rose-700 border-rose-500/30" : "text-emerald-700 border-emerald-500/30"}>{unfilled.length}</Badge></div>
          </div>
          <div className="pt-2 border-t text-xs space-y-1">
            <div className="font-semibold">Playbook checks</div>
            <div className="flex items-start gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5" />Governing law present</div>
            {deal.value > 10_000_000 && <div className="flex items-start gap-1 text-amber-700"><AlertTriangleIcon />Board approval clause required (value > $10m)</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function AlertTriangleIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>; }

// ─────────────────────────── CPs ───────────────────────────
function CPsTab({ deal }: { deal: any }) {
  const [f, setF] = useState({ type: "Precedent" as CP["type"], description: "", responsible: "", deadline: "" });
  function add() {
    if (!f.description) return;
    updateDeal(deal.id, (d) => ({ ...d, cps: [...d.cps, { id: gid("cp"), type: f.type, description: f.description, responsible: f.responsible || "TBD", deadline: f.deadline || new Date().toISOString().slice(0, 10), status: "Pending" }] }));
    setF({ ...f, description: "", responsible: "", deadline: "" });
  }
  function setStatus(cid: string, status: CP["status"]) {
    updateDeal(deal.id, (d) => ({ ...d, cps: d.cps.map((c: CP) => c.id === cid ? { ...c, status } : c) }));
  }
  const today = new Date().toISOString().slice(0, 10);
  const groups = [["Precedent", "Conditions Precedent"], ["Subsequent", "Conditions Subsequent"]] as const;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Longstop monitoring</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Longstop date</div><div className={`text-lg font-bold ${deal.longstopDate < today ? "text-rose-600" : ""}`}>{deal.longstopDate}</div></div>
          <div><div className="text-xs text-muted-foreground">CPs at risk</div><div className="text-lg font-bold text-amber-700">{deal.cps.filter((c: CP) => c.status === "At Risk").length}</div></div>
          <div><div className="text-xs text-muted-foreground">Days remaining</div><div className="text-lg font-bold">{Math.max(0, Math.ceil((new Date(deal.longstopDate).getTime() - Date.now()) / 86400000))}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Add condition</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Precedent">Precedent</SelectItem><SelectItem value="Subsequent">Subsequent</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="md:col-span-2" />
          <Input placeholder="Responsible" value={f.responsible} onChange={(e) => setF({ ...f, responsible: e.target.value })} />
          <div className="flex gap-2"><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /><Button onClick={add}><Plus className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>

      {groups.map(([key, label]) => {
        const rows = deal.cps.filter((c: CP) => c.type === key);
        return (
          <Card key={key}>
            <CardHeader><CardTitle className="text-base">{label} ({rows.filter((r: CP) => r.status === "Satisfied").length}/{rows.length})</CardTitle></CardHeader>
            <CardContent className="p-0"><Table>
              <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Responsible</TableHead><TableHead>Deadline</TableHead><TableHead>Evidence</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((c: CP) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.description}</TableCell>
                    <TableCell className="text-xs">{c.responsible}</TableCell>
                    <TableCell className={`text-xs ${c.deadline < today && c.status !== "Satisfied" ? "text-rose-600 font-semibold" : ""}`}>{c.deadline}</TableCell>
                    <TableCell className="text-xs">{c.evidence ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => setStatus(c.id, v as CP["status"])}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Satisfied", "Pending", "At Risk", "Not Yet Due"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No {label.toLowerCase()}.</TableCell></TableRow>}
              </TableBody>
            </Table></CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Signing ───────────────────────────
function SigningTab({ deal }: { deal: any }) {
  const [item, setItem] = useState({ item: "", owner: "" });
  function addChecklist() {
    if (!item.item) return;
    updateDeal(deal.id, (d) => ({ ...d, signing: { ...d.signing, checklist: [...d.signing.checklist, { id: gid("sk"), item: item.item, owner: item.owner || "TBD", status: "Pending" }] } }));
    setItem({ item: "", owner: "" });
  }
  function toggle(iid: string) {
    updateDeal(deal.id, (d) => ({ ...d, signing: { ...d.signing, checklist: d.signing.checklist.map((c: any) => c.id === iid ? { ...c, status: c.status === "Done" ? "Pending" : "Done" } : c) } }));
  }
  function sign(sid: string) {
    updateDeal(deal.id, (d) => ({ ...d, signing: { ...d.signing, signatories: d.signing.signatories.map((s: any) => s.id === sid ? { ...s, signed: true, signedAt: new Date().toISOString() } : s) } }));
  }

  const done = deal.signing.checklist.filter((c: any) => c.status === "Done").length;
  const total = deal.signing.checklist.length;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />Pre-signing checklist ({done}/{total})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Progress value={total ? (done / total) * 100 : 0} className="h-2" />
          {deal.signing.checklist.map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40">
              <input type="checkbox" checked={c.status === "Done"} onChange={() => toggle(c.id)} />
              <span className={c.status === "Done" ? "line-through text-muted-foreground" : ""}>{c.item}</span>
              <span className="ml-auto text-xs text-muted-foreground">{c.owner}</span>
            </label>
          ))}
          <div className="flex gap-2 pt-2 border-t">
            <Input placeholder="Checklist item" value={item.item} onChange={(e) => setItem({ ...item, item: e.target.value })} />
            <Input placeholder="Owner" value={item.owner} onChange={(e) => setItem({ ...item, owner: e.target.value })} className="w-32" />
            <Button onClick={addChecklist}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Signing session</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xs text-muted-foreground">Signing date</div><div className="font-semibold">{deal.signing.signingDate ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Venue</div><div className="font-semibold">{deal.signing.venue ?? "—"}</div></div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xs font-semibold mb-2">Signatories</div>
            {deal.signing.signatories.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border rounded p-2 mb-1">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.party} · {s.role}</div>
                </div>
                {s.signed ? <Badge variant="outline" className="text-emerald-700 border-emerald-500/30">Signed {new Date(s.signedAt).toLocaleDateString()}</Badge> : <Button size="sm" onClick={() => sign(s.id)}>Mark signed</Button>}
              </div>
            ))}
            {deal.signing.signatories.length === 0 && <div className="text-xs text-muted-foreground">No signatories added.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────── Post-Completion ───────────────────────────
function PostTab({ deal }: { deal: any }) {
  const [f, setF] = useState({ item: "", dueDate: "" });
  function add() {
    if (!f.item) return;
    updateDeal(deal.id, (d) => ({ ...d, postCompletion: [...d.postCompletion, { item: f.item, dueDate: f.dueDate || new Date().toISOString().slice(0, 10), status: "Pending" }] }));
    setF({ item: "", dueDate: "" });
  }
  function toggle(i: number) {
    updateDeal(deal.id, (d) => ({ ...d, postCompletion: d.postCompletion.map((p: any, idx: number) => idx === i ? { ...p, status: p.status === "Done" ? "Pending" : "Done" } : p) }));
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" />Post-Completion register</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {deal.postCompletion.map((p: any, i: number) => (
          <label key={i} className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40">
            <input type="checkbox" checked={p.status === "Done"} onChange={() => toggle(i)} />
            <span className={p.status === "Done" ? "line-through text-muted-foreground" : ""}>{p.item}</span>
            <span className="ml-auto text-xs text-muted-foreground">{p.dueDate}</span>
          </label>
        ))}
        <div className="flex gap-2 pt-2 border-t">
          <Input placeholder="Register item (e.g. warranty period ends)" value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} />
          <Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="w-40" />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
