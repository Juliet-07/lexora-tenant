import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Search, Loader2, Trash2, Download, Eye, History, Send, Mail, FileText, BookOpen, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { usePersistentState, uid, fmtDate } from "@/lib/grc/usePersistentState";
import {
  fetchGovernanceCodes, createGovernanceCode, updateCodeBody, publishCode, deleteGovernanceCode,
  type GovernanceCode, type GovernanceCodeCategory,
} from "@/lib/grc/governance-api";

type Stage = "Draft" | "Internal review" | "Board / Committee approval" | "Published";
const STAGES: Stage[] = ["Draft", "Internal review", "Board / Committee approval", "Published"];

interface CodeMeta {
  owner: string;
  standard: string;
  description: string;
  stage: Stage;
  reviewCycle: "Annual" | "Biennial";
  approval: "Full Board" | "Committee";
  nextReview: string; // ISO date
  nextAction: string;
  audience: string;
  audienceSize: number;
  acknowledged: number;
  comments: { by: string; at: string; text: string }[];
  history: { at: string; text: string }[];
}

interface CodeRow {
  id: string;
  title: string;
  category: GovernanceCodeCategory;
  body: string;
  version: number;
  updatedAt: string;
  demo: boolean;
  meta: CodeMeta;
}

interface Template {
  group: string; tag: string; title: string; desc: string; standard: string; category: GovernanceCodeCategory; sections: string[];
}

const TEMPLATES: Template[] = [
  { group: "Board & governance", tag: "Governance", title: "Board Charter", desc: "Purpose, composition, director roles, meeting cadence, and committee delegation.", standard: "King V Report (2026) aligned", category: "Board Charter", sections: ["Purpose", "Composition", "Roles & responsibilities", "Meetings & quorum", "Committees", "Board evaluation", "Review & amendment"] },
  { group: "Board & governance", tag: "Governance", title: "Committee Charter", desc: "Generic committee mandate — reusable for Audit, Risk, Remuneration, Nomination, or ESG.", standard: "King V aligned", category: "Governance Charter", sections: ["Mandate", "Membership", "Meetings", "Duties", "Reporting to the Board", "Review"] },
  { group: "Board & governance", tag: "Governance", title: "Remuneration Policy", desc: "Director and executive remuneration structure, disclosure, and approval process.", standard: "King V aligned", category: "Governance Charter", sections: ["Principles", "Structure", "Disclosure", "Approval"] },
  { group: "Ethics & conduct", tag: "Ethics", title: "Code of Conduct & Ethics", desc: "Standards of behaviour, gifts & hospitality, conflicts, and reporting obligations.", standard: "Custom, ISO 37301 informed", category: "Code of Conduct", sections: ["Scope", "Standards of behaviour", "Gifts & hospitality", "Conflicts", "Reporting obligations", "Sanctions"] },
  { group: "Ethics & conduct", tag: "Ethics", title: "Anti-Bribery & Corruption Policy", desc: "Bribery risk controls, due diligence, gifts register, and facilitation payments.", standard: "ISO 37001 aligned", category: "Ethics", sections: ["Purpose", "Scope", "Prohibited conduct", "Due diligence", "Gifts register", "Facilitation payments", "Reporting"] },
  { group: "Ethics & conduct", tag: "Ethics", title: "Whistleblower Protection Policy", desc: "Reporting channels, investigation process, and non-retaliation guarantees.", standard: "Custom", category: "Ethics", sections: ["Purpose", "Reporting channels", "Investigation", "Non-retaliation", "Confidentiality"] },
  { group: "Ethics & conduct", tag: "Ethics", title: "Conflict of Interest Policy", desc: "Declaration process, register, and recusal rules for directors and staff.", standard: "King V aligned", category: "Ethics", sections: ["Purpose", "Declaration", "Register", "Recusal", "Breaches"] },
  { group: "Financial controls & risk", tag: "Financial controls", title: "Delegation of Authority Policy", desc: "Approval matrix by role, value threshold, and transaction type.", standard: "Custom", category: "Governance Charter", sections: ["Principles", "Approval matrix", "Sub-delegation", "Review"] },
  { group: "Financial controls & risk", tag: "Financial controls", title: "Related Party Transactions Policy", desc: "Identification, disclosure register, and independent approval process.", standard: "King V aligned", category: "Governance Charter", sections: ["Identification", "Disclosure register", "Approval", "Reporting"] },
  { group: "Financial controls & risk", tag: "Risk & compliance", title: "Data Protection & Privacy Policy", desc: "Data handling principles, breach response, and DPO responsibilities.", standard: "Rwanda DPL aligned", category: "Other", sections: ["Principles", "Lawful processing", "Data subject rights", "Breach response", "DPO responsibilities"] },
];

const CLAUSES: Record<string, string> = {
  "Quorum requirement": "A quorum shall be {{quorum_number}} directors, of whom at least one must be independent.",
  "Term limits": "Non-executive directors shall serve terms of three years, renewable to a maximum of nine years.",
  "Delegation of authority": "The Board may delegate authority to committees and management in accordance with the Delegation of Authority Policy, while retaining ultimate accountability.",
  "Related party approval": "All related party transactions shall be disclosed and approved by independent directors before execution.",
  "Confidentiality of deliberations": "All Board deliberations and papers are confidential and shall not be disclosed without authorisation of the Chair.",
};

const buildBody = (t: Template) =>
  `<h2>${t.title.toUpperCase()}</h2><p><i>{{company_name}} · Adopted by resolution of the Board</i></p>` +
  t.sections.map((s, i) => `<h3>${i + 1}. ${s}</h3><p>${i === 0 ? `This ${t.title} sets out the framework adopted by {{company_name}} (the "Company") in line with the {{governance_standard}}.` : "[Draft this section]"}</p>`).join("");

const daysFrom = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const defaultMeta = (title: string, published: boolean): CodeMeta => ({
  owner: "Company Secretary", standard: "Custom", description: "", stage: published ? "Published" : "Draft",
  reviewCycle: "Annual", approval: "Full Board", nextReview: daysFrom(300), nextAction: published ? "—" : "Complete draft, send for internal review",
  audience: "All staff", audienceSize: 12, acknowledged: published ? 9 : 0, comments: [], history: [{ at: new Date().toISOString(), text: `${title} created` }],
});

const DEMO: CodeRow[] = [
  ["demo_bc", "Board Charter", "Board Charter", 3, "Published", "Rudo Sibanda (Company Secretary)", "King V (2026) aligned", "Governs board purpose, composition, roles, and meeting cadence", 52, "Directors", 7, 7],
  ["demo_coc", "Code of Conduct & Ethics", "Code of Conduct", 2, "Published", "HR & Compliance", "ISO 37301 informed", "Standards of behaviour for directors and employees", 100, "All staff", 12, 10],
  ["demo_doa", "Delegation of Authority Policy", "Governance Charter", 4, "Published", "James Karenzi (CFO)", "Custom", "Approval limits and financial authority by role", 150, "Management", 5, 5],
  ["demo_coi", "Conflict of Interest Policy", "Ethics", 2, "Internal review", "Rudo Sibanda", "King V aligned", "Declaration and management of director/employee conflicts", -5, "Directors", 7, 0],
  ["demo_wb", "Whistleblower Protection Policy", "Ethics", 1, "Published", "Compliance", "Custom", "Reporting channels and non-retaliation protections", 30, "All staff", 12, 9],
  ["demo_abc", "Anti-Bribery & Corruption Policy", "Ethics", 1, "Draft", "Rudo Sibanda", "ISO 37001 aligned", "ISO 37001-aligned anti-bribery controls", 365, "All staff", 12, 0],
  ["demo_rpt", "Related Party Transactions Policy", "Governance Charter", 1, "Draft", "Amara Nkurunziza", "King V aligned", "Identification, disclosure, and approval of related party deals", 365, "Directors", 7, 0],
].map(([id, title, category, version, stage, owner, standard, description, review, audience, size, ack]: any) => {
  const tpl = TEMPLATES.find((t) => t.title.startsWith(title.split(" ")[0])) ?? TEMPLATES[0];
  return {
    id, title, category, version, demo: true, updatedAt: new Date().toISOString(),
    body: buildBody({ ...tpl, title }),
    meta: {
      ...defaultMeta(title, stage === "Published"), owner, standard, description, stage,
      nextReview: daysFrom(review), audience, audienceSize: size, acknowledged: ack,
      nextAction: stage === "Draft" ? "Complete remaining sections, send for internal review" : stage === "Internal review" ? "Complete review and submit to Board" : "—",
      comments: id === "demo_bc" ? [
        { by: "Rudo Sibanda", at: "2 days ago", text: "Confirmed quorum number with legal counsel — using 4 (majority of 7) per King V guidance." },
        { by: "Upendo Mbeki", at: "1 day ago", text: "Please add a term-limit clause under Composition before this goes to the Nomination Committee." },
      ] : [],
    },
  } as CodeRow;
});

const stageVariant = (s: Stage) => (s === "Published" ? "default" : s === "Draft" ? "outline" : "secondary") as any;

export default function GrcCodes() {
  const qc = useQueryClient();
  const { data: apiCodes = [], isLoading } = useQuery({ queryKey: ["grc-gov-codes"], queryFn: fetchGovernanceCodes, retry: 1 });
  const [metaStore, setMetaStore] = usePersistentState<Record<string, CodeMeta>>("grc_codes_meta_v1", {});
  const [demoStore, setDemoStore] = usePersistentState<CodeRow[]>("grc_codes_demo_v1", DEMO);
  const [view, setView] = useState<"library" | "templates" | "editor">("library");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Stage>("all");

  const isDemo = apiCodes.length === 0;
  const rows: CodeRow[] = useMemo(
    () =>
      isDemo
        ? demoStore
        : apiCodes.map((c: GovernanceCode) => {
            const m = metaStore[c._id] ?? defaultMeta(c.title, c.status === "Published");
            return {
              id: c._id, title: c.title, category: c.category, body: c.body || "", version: c.version, updatedAt: c.updatedAt, demo: false,
              meta: { ...m, stage: c.status === "Published" ? "Published" : m.stage === "Published" ? "Draft" : m.stage },
            };
          }),
    [isDemo, apiCodes, metaStore, demoStore],
  );

  const setMeta = (id: string, patch: Partial<CodeMeta>) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (row.demo) setDemoStore((s) => s.map((r) => (r.id === id ? { ...r, meta: { ...r.meta, ...patch } } : r)));
    else setMetaStore((s) => ({ ...s, [id]: { ...row.meta, ...patch } }));
  };
  const logHistory = (id: string, text: string) => {
    const row = rows.find((r) => r.id === id);
    if (row) setMeta(id, { history: [{ at: new Date().toISOString(), text }, ...row.meta.history] });
  };

  const createMut = useMutation({
    mutationFn: (t: Template) => createGovernanceCode({ title: t.title, category: t.category, body: buildBody(t) }),
    onSuccess: (c, t) => {
      setMetaStore((s) => ({ ...s, [c._id]: { ...defaultMeta(t.title, false), standard: t.standard, description: t.desc } }));
      qc.invalidateQueries({ queryKey: ["grc-gov-codes"] });
      setEditingId(c._id); setView("editor");
      toast({ title: "Draft created from template" });
    },
    onError: (e: any) => toast({ title: "Could not create code", description: e?.response?.data?.message ?? e.message, variant: "destructive" }),
  });

  const startFromTemplate = (t: Template) => {
    if (!isDemo) return createMut.mutate(t);
    const row: CodeRow = { id: uid("demo"), title: t.title, category: t.category, body: buildBody(t), version: 1, updatedAt: new Date().toISOString(), demo: true, meta: { ...defaultMeta(t.title, false), standard: t.standard, description: t.desc } };
    setDemoStore((s) => [row, ...s]);
    setEditingId(row.id); setView("editor");
    toast({ title: "Draft created from template" });
  };

  if (isLoading) return <div className="flex justify-center py-24 gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading codes…</div>;

  const editing = rows.find((r) => r.id === editingId);
  if (view === "editor" && editing) {
    return (
      <CodeEditor
        row={editing}
        onBack={() => setView("library")}
        setMeta={(p) => setMeta(editing.id, p)}
        logHistory={(t) => logHistory(editing.id, t)}
        onSaveBody={async (body) => {
          if (editing.demo) setDemoStore((s) => s.map((r) => (r.id === editing.id ? { ...r, body, updatedAt: new Date().toISOString() } : r)));
          else { await updateCodeBody(editing.id, body); qc.invalidateQueries({ queryKey: ["grc-gov-codes"] }); }
        }}
        onPublish={async () => {
          if (editing.demo) setDemoStore((s) => s.map((r) => (r.id === editing.id ? { ...r, meta: { ...r.meta, stage: "Published", acknowledged: 0 } } : r)));
          else { await publishCode(editing.id); setMeta(editing.id, { stage: "Published", acknowledged: 0 }); qc.invalidateQueries({ queryKey: ["grc-gov-codes"] }); }
        }}
      />
    );
  }

  if (view === "templates") {
    const groups = [...new Set(TEMPLATES.map((t) => t.group))];
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setView("library")}><ArrowLeft className="h-4 w-4 mr-1" />Back to Governance Codes</Button>
        <div><h1 className="text-2xl font-bold">Start a new code from a template</h1><p className="text-sm text-muted-foreground">Every template is pre-structured with standard sections and merge fields.</p></div>
        {groups.map((g) => (
          <div key={g} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{g}</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {TEMPLATES.filter((t) => t.group === g).map((t) => (
                <Card key={t.title} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition" onClick={() => startFromTemplate(t)}>
                  <CardContent className="p-4 space-y-2">
                    <Badge variant="secondary">{t.tag}</Badge>
                    <div className="font-semibold">{t.title}</div>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                    <div className="text-[11px] text-primary">{t.standard}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const counts = { all: rows.length, Published: rows.filter((r) => r.meta.stage === "Published").length, Draft: rows.filter((r) => r.meta.stage === "Draft").length, review: rows.filter((r) => r.meta.stage === "Internal review" || r.meta.stage === "Board / Committee approval").length };
  const overdue = rows.filter((r) => new Date(r.meta.nextReview).getTime() < Date.now());
  const nextDue = [...rows].filter((r) => new Date(r.meta.nextReview).getTime() >= Date.now()).sort((a, b) => a.meta.nextReview.localeCompare(b.meta.nextReview))[0];
  const filtered = rows.filter((r) => (filter === "all" || r.meta.stage === filter) && `${r.title} ${r.meta.owner} ${r.meta.standard}`.toLowerCase().includes(q.toLowerCase()));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const curMonth = new Date().getMonth();
  const inProgress = rows.filter((r) => r.meta.stage !== "Published");
  const published = rows.filter((r) => r.meta.stage === "Published");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold">Governance Codes</h1><p className="text-sm text-muted-foreground">Author, publish, and maintain governance codes and charters — drafted inside Lexora from templates, not uploaded as static files.</p></div>
        <Button onClick={() => setView("templates")}><Plus className="h-4 w-4 mr-1" />New code</Button>
      </div>
      {isDemo && <div className="text-xs rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground">Showing sample codes. Create your first code from a template to start your own library.</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Total codes", counts.all, ""], ["Published", counts.Published, ""], ["In draft", counts.Draft, ""], ["Under review", counts.review, overdue.length ? `${overdue.length} overdue` : ""], ["Next review due", nextDue?.title ?? "—", nextDue ? fmtDate(nextDue.meta.nextReview) : ""]].map(([l, v, s]) => (
          <Card key={l as string}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className={`font-bold mt-1 ${typeof v === "number" ? "text-2xl" : "text-sm"}`}>{v}</div>{s && <div className="text-[11px] text-destructive">{s}</div>}</CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Annual review cycle</CardTitle><p className="text-sm text-muted-foreground">Each code has a scheduled review date. Overdue reviews are escalated to the Governance Overview dashboard.</p></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
            {months.map((m, i) => {
              const due = rows.filter((r) => new Date(r.meta.nextReview).getMonth() === i && new Date(r.meta.nextReview).getFullYear() <= new Date().getFullYear() + 1);
              const isOver = due.some((r) => overdue.includes(r));
              return (
                <div key={m} className={`rounded-md border p-2 text-center ${i === curMonth ? "border-primary bg-primary/5" : ""} ${isOver ? "bg-destructive/10 border-destructive/40" : ""}`}>
                  <div className="text-[11px] font-semibold">{m}{i === curMonth ? " ←" : ""}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{due.length ? due.map((d) => d.title.split(" ")[0]).join(", ") : "—"}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]"><Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search codes by name, owner, or standard…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {([["all", `All (${counts.all})`], ["Published", `Published (${counts.Published})`], ["Draft", `Draft (${counts.Draft})`], ["Internal review", `Under review (${counts.review})`]] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k as any)}>{l}</Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Code library</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((r) => {
            const isOver = overdue.includes(r);
            return (
              <div key={r.id} className="flex items-center gap-3 border rounded-lg p-3 hover:bg-muted/30 cursor-pointer" onClick={() => { setEditingId(r.id); setView("editor"); }}>
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.meta.description || r.category}</div>
                  <div className="text-[11px] text-muted-foreground">Owner: {r.meta.owner} · {r.meta.standard}{isOver && <span className="text-destructive"> · Review overdue</span>}</div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={stageVariant(r.meta.stage)}>{r.meta.stage === "Internal review" ? "Under review" : r.meta.stage}</Badge>
                  <div className="text-[11px] text-muted-foreground">v{r.version} · Next review {fmtDate(r.meta.nextReview)}</div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader><AlertDialogTitle>Delete "{r.title}"?</AlertDialogTitle><AlertDialogDescription>This removes the code and its version history.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        if (r.demo) setDemoStore((s) => s.filter((x) => x.id !== r.id));
                        else { await deleteGovernanceCode(r.id); qc.invalidateQueries({ queryKey: ["grc-gov-codes"] }); }
                        toast({ title: "Code deleted" });
                      }}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No codes match.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Approval workflow</CardTitle><p className="text-sm text-muted-foreground">Every code follows a 5-stage lifecycle. Codes cannot be published without board or committee approval.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">{[...STAGES, "Acknowledgement"].map((s, i) => <Badge key={s} variant="outline" className="py-1">{i + 1}. {s}</Badge>)}</div>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Stage</TableHead><TableHead>Owner</TableHead><TableHead>Next action</TableHead><TableHead>Target date</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {inProgress.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell><Badge variant={stageVariant(r.meta.stage)}>{r.meta.stage}</Badge></TableCell>
                  <TableCell>{r.meta.owner}</TableCell>
                  <TableCell className={`text-xs ${overdue.includes(r) ? "text-destructive" : ""}`}>{overdue.includes(r) ? "Overdue — " : ""}{r.meta.nextAction}</TableCell>
                  <TableCell>{fmtDate(r.meta.nextReview)}</TableCell>
                  <TableCell>
                    {r.meta.stage !== "Board / Committee approval" && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const next = STAGES[STAGES.indexOf(r.meta.stage) + 1];
                        setMeta(r.id, { stage: next, nextAction: next === "Internal review" ? "Complete review and submit to Board" : "Awaiting Board / Committee approval" });
                        logHistory(r.id, `Moved to ${next}`);
                        toast({ title: `${r.title} moved to ${next}` });
                      }}>Advance</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {inProgress.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No codes in progress.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-start space-y-0 flex-wrap gap-2">
          <div><CardTitle className="text-base">Acknowledgement tracking</CardTitle><p className="text-sm text-muted-foreground">Published codes require acknowledgement from all relevant personnel.</p></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast({ title: "Reminders sent", description: `${published.reduce((a, r) => a + (r.meta.audienceSize - r.meta.acknowledged), 0)} people reminded.` })}><Mail className="h-4 w-4 mr-1" />Send reminders to pending</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const csv = ["Code,Audience,Acknowledged,Pending,Coverage", ...published.map((r) => `${r.title},${r.meta.audience} (${r.meta.audienceSize}),${r.meta.acknowledged},${r.meta.audienceSize - r.meta.acknowledged},${Math.round((r.meta.acknowledged / r.meta.audienceSize) * 100)}%`)].join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "code-acknowledgements.csv"; a.click();
            }}><Download className="h-4 w-4 mr-1" />Export report</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Published code</TableHead><TableHead>Audience</TableHead><TableHead>Acknowledged</TableHead><TableHead>Pending</TableHead><TableHead>Coverage</TableHead></TableRow></TableHeader>
            <TableBody>{published.map((r) => {
              const cov = Math.round((r.meta.acknowledged / Math.max(1, r.meta.audienceSize)) * 100);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell><TableCell>{r.meta.audience} ({r.meta.audienceSize})</TableCell>
                  <TableCell>{r.meta.acknowledged}</TableCell><TableCell>{r.meta.audienceSize - r.meta.acknowledged}</TableCell>
                  <TableCell><Badge variant={cov === 100 ? "default" : cov >= 80 ? "secondary" : "destructive"}>{cov}%</Badge></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeEditor({ row, onBack, setMeta, logHistory, onSaveBody, onPublish }: {
  row: CodeRow; onBack: () => void; setMeta: (p: Partial<CodeMeta>) => void; logHistory: (t: string) => void;
  onSaveBody: (body: string) => Promise<void>; onPublish: () => Promise<void>;
}) {
  const [body, setBody] = useState(row.body);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [preview, setPreview] = useState(false);
  const sections = [...body.matchAll(/<h3>(.*?)<\/h3>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));
  const drafted = body.split(/<h3>/).slice(1).filter((s) => !s.includes("[Draft this section]")).length;
  const locked = row.meta.stage === "Published";

  const save = async (silent = false) => {
    setSaving(true);
    try { await onSaveBody(body); if (!silent) { toast({ title: "Draft saved" }); logHistory("Draft saved"); } }
    catch (e: any) { toast({ title: "Save failed", description: e?.response?.data?.message ?? e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const exportDoc = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>${row.title}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.6}</style></head><body>${body}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to Governance Codes</Button>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex gap-2"><Badge variant={stageVariant(row.meta.stage)}>{row.meta.stage}</Badge><Badge variant="outline">v{row.version}</Badge>{row.demo && <Badge variant="outline">Sample</Badge>}</div>
          <h1 className="text-2xl font-bold mt-1">{row.title}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}><Eye className="h-4 w-4 mr-1" />{preview ? "Edit" : "Preview"}</Button>
          <Button size="sm" variant="outline" onClick={exportDoc}><Download className="h-4 w-4 mr-1" />Export</Button>
          {!locked && <Button size="sm" variant="outline" disabled={saving} onClick={() => save()}>{saving ? "Saving…" : "Save draft"}</Button>}
          {row.meta.stage === "Draft" && <Button size="sm" onClick={async () => { await save(true); setMeta({ stage: "Internal review", nextAction: "Complete review and submit to Board" }); logHistory("Sent for internal review"); toast({ title: "Sent for internal review" }); }}><Send className="h-4 w-4 mr-1" />Send for review</Button>}
          {row.meta.stage === "Internal review" && <Button size="sm" onClick={async () => { await save(true); setMeta({ stage: "Board / Committee approval", nextAction: "Awaiting Board / Committee approval" }); logHistory(`Sent for ${row.meta.approval} approval`); toast({ title: "Sent for board approval" }); }}><Send className="h-4 w-4 mr-1" />Send for board approval</Button>}
          {row.meta.stage === "Board / Committee approval" && <Button size="sm" onClick={async () => { try { await save(true); await onPublish(); logHistory("Approved and published"); toast({ title: "Code published", description: "Acknowledgement requests sent to the audience." }); } catch (e: any) { toast({ title: "Publish failed", description: e?.message, variant: "destructive" }); } }}><Check className="h-4 w-4 mr-1" />Record approval & publish</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr_300px] gap-4">
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Contents</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">{sections.map((s) => <div key={s} className="truncate">{s}</div>)}</CardContent></Card>
          {!locked && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Clause library · click to insert</CardTitle></CardHeader>
              <CardContent className="space-y-1">{Object.entries(CLAUSES).map(([k, v]) => (
                <button key={k} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted" onClick={() => { setBody((b) => `${b}<p>${v}</p>`); toast({ title: `Inserted: ${k}` }); }}>+ {k}</button>
              ))}</CardContent></Card>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            {preview || locked ? (
              <div className="prose prose-sm max-w-none p-4" dangerouslySetInnerHTML={{ __html: body }} />
            ) : (
              <RichTextEditor value={body} onChange={setBody} minHeight={520} />
            )}
            <div className="text-xs text-muted-foreground mt-2">{drafted} of {sections.length} sections drafted{locked && " · Published codes are read-only — start a new version to amend."}</div>
          </CardContent>
        </Card>

        <Card>
          <Tabs defaultValue="comments" className="p-3">
            <TabsList className="w-full"><TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger><TabsTrigger value="props" className="flex-1">Properties</TabsTrigger><TabsTrigger value="history" className="flex-1">History</TabsTrigger></TabsList>
            <TabsContent value="comments" className="space-y-3">
              {row.meta.comments.map((c, i) => (
                <div key={i} className="border rounded-lg p-2.5"><div className="text-xs font-semibold">{c.by} <span className="font-normal text-muted-foreground">· {c.at}</span></div><div className="text-sm mt-1">{c.text}</div></div>
              ))}
              <Textarea rows={2} placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button size="sm" className="w-full" onClick={() => { if (!comment.trim()) return; setMeta({ comments: [...row.meta.comments, { by: "You", at: "just now", text: comment }] }); setComment(""); }}>Comment</Button>
            </TabsContent>
            <TabsContent value="props" className="space-y-3">
              <div><Label className="text-xs">Owner</Label><Input value={row.meta.owner} onChange={(e) => setMeta({ owner: e.target.value })} /></div>
              <div><Label className="text-xs">Standard</Label><Input value={row.meta.standard} onChange={(e) => setMeta({ standard: e.target.value })} /></div>
              <div><Label className="text-xs">Review cycle</Label>
                <Select value={row.meta.reviewCycle} onValueChange={(v: any) => setMeta({ reviewCycle: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Biennial">Biennial</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Next review</Label><Input type="date" value={row.meta.nextReview.slice(0, 10)} onChange={(e) => setMeta({ nextReview: e.target.value })} /></div>
              <div><Label className="text-xs">Approval authority</Label>
                <Select value={row.meta.approval} onValueChange={(v: any) => setMeta({ approval: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Full Board">Full Board</SelectItem><SelectItem value="Committee">Committee</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Audience</Label><Input value={row.meta.audience} onChange={(e) => setMeta({ audience: e.target.value })} /></div>
                <div><Label className="text-xs">Headcount</Label><Input type="number" value={row.meta.audienceSize} onChange={(e) => setMeta({ audienceSize: Number(e.target.value) || 0 })} /></div>
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-2">
              {row.meta.history.map((h, i) => (
                <div key={i} className="flex gap-2 text-sm"><History className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div>{h.text}</div><div className="text-[11px] text-muted-foreground">{fmtDate(h.at)}</div></div></div>
              ))}
              {row.meta.history.length === 0 && <div className="text-sm text-muted-foreground flex gap-2"><FileText className="h-4 w-4" />No history yet.</div>}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
