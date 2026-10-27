import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { downloadManagementReportPdf } from "@/lib/crm/finance-api";
import {
  saveReportContent,
  type ActionPriority,
  type ReportAction,
  type ReportCommentary,
  type ReportRisk,
  type RiskSeverity,
} from "@/lib/crm/report-api";
import { cn } from "@/lib/utils";
import { EmailReportDialog } from "./EmailReportDialog";
import {
  BudgetSection,
  CashFlowSection,
  CostsSection,
  KeyFigures,
  KpisSection,
  PayablesSection,
  ReceivablesSection,
  RevenueSection,
  SummarySection,
} from "./ManagementSections";
import { ManagementPreview } from "./ManagementPreview";
import { Pill, useReport } from "./shared";

type SubId =
  | "ceo-message"
  | "summary"
  | "revenue"
  | "costs"
  | "cashflow"
  | "receivables"
  | "payables"
  | "budget-cmt"
  | "kpis"
  | "risks"
  | "actions";

const SUBTABS: { id: SubId; label: string }[] = [
  { id: "ceo-message", label: "CEO/MD's Message" },
  { id: "summary", label: "Financial Summary" },
  { id: "revenue", label: "Revenue" },
  { id: "costs", label: "Costs" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "receivables", label: "Receivables" },
  { id: "payables", label: "Payables" },
  { id: "budget-cmt", label: "Budget" },
  { id: "kpis", label: "KPIs" },
  { id: "risks", label: "Risks" },
  { id: "actions", label: "Actions" },
];

// Which commentary field each editor tab writes to, with its accent.
const COMMENTARY: Partial<Record<SubId, { field: keyof ReportCommentary; title: string; border: string; tip: string }>> = {
  revenue: { field: "revenue", title: "Revenue commentary", border: "border-l-success", tip: "What drove revenue this period, and what to expect next." },
  costs: { field: "costs", title: "Cost commentary", border: "border-l-warning", tip: "Notable movements against budget and prior period." },
  cashflow: { field: "cashflow", title: "Cash flow commentary", border: "border-l-primary", tip: "Operating cash generation, capital spending and runway." },
  receivables: { field: "receivables", title: "Receivables commentary", border: "border-l-destructive", tip: "Overdue accounts, collection actions and DSO." },
  payables: { field: "payables", title: "Payables commentary", border: "border-l-warning", tip: "Supplier payments due and any disputes." },
  "budget-cmt": { field: "budget", title: "Budget commentary", border: "border-l-primary", tip: "Main variances to budget and the reasons." },
};

const SEVERITY_STYLE: Record<RiskSeverity, string> = {
  high: "border-destructive/40 bg-destructive/5",
  medium: "border-warning/40 bg-warning/5",
  low: "border-success/40 bg-success/5",
};
const PRIORITY_DOT: Record<ActionPriority, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  normal: "bg-primary",
  low: "bg-muted-foreground",
};

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("block space-y-1", className)}>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    {children}
  </label>
);

let tempId = 0;
const withId = <T extends object>(x: T): T & { id: string } => ({ ...x, id: (x as any).id ?? `tmp-${++tempId}` });

export default function ManagementTab({ displayCurrency }: { displayCurrency: string }) {
  const { pack } = useReport();
  const { toast } = useToast();
  const qc = useQueryClient();
  const m = pack.meta;

  const [sub, setSub] = useState<SubId>("ceo-message");
  const [commentary, setCommentary] = useState<ReportCommentary>(pack.management.commentary);
  const [status, setStatus] = useState<"Draft" | "Final">(pack.management.ceoMessageStatus);
  const [risks, setRisks] = useState(() => pack.management.risks.map(withId));
  const [actions, setActions] = useState(() => pack.management.actions.map(withId));
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [email, setEmail] = useState(false);

  const strip = <T extends { id?: string }>(l: T[]) => l.map(({ id, ...rest }) => rest) as Omit<T, "id">[];

  // What's on screen vs what was last saved. The PDF and the Board email are
  // built from the saved copy, so anything unsaved is saved first.
  const snapshot = JSON.stringify({
    commentary,
    status,
    risks: strip(risks).filter((r) => r.text.trim()),
    actions: strip(actions).filter((a) => a.text.trim()),
  });
  const savedSnapshot = useRef(snapshot);
  const dirty = snapshot !== savedSnapshot.current;

  // Everything is sent in one PUT — the engine replaces what it holds, so
  // the page never has to reason about partial updates.
  const persist = async (label: string, over?: { status?: "Draft" | "Final" }): Promise<boolean> => {
    setSaving(label);
    try {
      const nextStatus = over?.status ?? status;
      await saveReportContent(m.periodType, m.periodKey, {
        commentary,
        ceoMessageStatus: nextStatus,
        risks: strip(risks).filter((r) => r.text.trim()),
        actions: strip(actions).filter((a) => a.text.trim()),
      });
      if (over?.status) setStatus(over.status);
      savedSnapshot.current = JSON.stringify({
        commentary,
        status: nextStatus,
        risks: strip(risks).filter((r) => r.text.trim()),
        actions: strip(actions).filter((a) => a.text.trim()),
      });
      await qc.invalidateQueries({ queryKey: ["report-pack"] });
      toast({ title: `${label} saved` });
      return true;
    } catch (e: any) {
      toast({
        title: `Could not save ${label.toLowerCase()}`,
        description: e?.response?.data?.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(null);
    }
  };

  const ensureSaved = async () => (dirty ? persist("Changes") : true);
  const downloadPdf = async () => {
    if (await ensureSaved()) downloadManagementReportPdf(m.periodType, m.periodKey, displayCurrency || undefined);
  };
  const openEmail = async () => {
    if (await ensureSaved()) setEmail(true);
  };

  const setField = (f: keyof ReportCommentary, v: string) => {
    setCommentary((c) => ({ ...c, [f]: v }));
    if (f === "ceoMessage" && status === "Final") setStatus("Draft");
  };

  const riskCounts = useMemo(
    () => ({
      high: risks.filter((r) => r.severity === "high").length,
      medium: risks.filter((r) => r.severity === "medium").length,
      low: risks.filter((r) => r.severity === "low").length,
    }),
    [risks],
  );

  const SaveButton = ({ label }: { label: string }) => (
    <Button size="sm" variant="outline" onClick={() => persist(label)} disabled={saving !== null}>
      {saving === label && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
    </Button>
  );

  const cm = COMMENTARY[sub];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">Management Report</h3>
          <p className="text-xs text-muted-foreground">
            {m.periodType === "Month" ? "For the month ended" : m.periodType === "Quarter" ? "For the quarter ended" : "For the year ended"}{" "}
            {new Date(m.to).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <>
              <Pill tone="amber">Unsaved changes</Pill>
              <Button size="sm" variant="outline" onClick={() => persist("Changes")} disabled={saving !== null}>
                {saving === "Changes" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save all
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="border-primary text-primary" onClick={() => setPreview(true)}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPdf} disabled={saving !== null}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" onClick={openEmail} disabled={saving !== null}>
            <Mail className="mr-2 h-4 w-4" /> Email to Board
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              sub === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "ceo-message" && (
        <>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  CEO / Managing Director's message
                  <Pill tone={status === "Final" ? "green" : "grey"}>{status}</Pill>
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  This message opens the management report
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={commentary.ceoMessage}
                onChange={(e) => setField("ceoMessage", e.target.value)}
                className="min-h-[200px]"
                placeholder="Address the Board directly: performance highlights, key concerns, outlook and any recommendations for approval."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Tip: cover performance highlights, key concerns, the outlook, and any recommendations for Board approval.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => persist("CEO message", { status: "Draft" })} disabled={saving !== null}>
                    {saving === "CEO message" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => persist("CEO message", { status: "Final" })}
                    disabled={saving !== null || !commentary.ceoMessage.trim()}
                  >
                    Finalise
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <KeyFigures />
        </>
      )}

      {sub === "summary" && <SummarySection />}
      {sub === "revenue" && <RevenueSection />}
      {sub === "costs" && <CostsSection />}
      {sub === "cashflow" && <CashFlowSection />}
      {sub === "receivables" && <ReceivablesSection />}
      {sub === "payables" && <PayablesSection />}
      {sub === "budget-cmt" && <BudgetSection />}
      {sub === "kpis" && <KpisSection />}

      {cm && (
        <Card className={cn("border-l-4", cm.border)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{cm.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={commentary[cm.field]}
              onChange={(e) => setField(cm.field, e.target.value)}
              className="min-h-[110px]"
              placeholder={cm.tip}
            />
            <div className="flex justify-end">
              <SaveButton label={cm.title} />
            </div>
          </CardContent>
        </Card>
      )}

      {sub === "risks" && (
        <RisksEditor
          risks={risks}
          setRisks={setRisks}
          counts={riskCounts}
          saving={saving === "Risks"}
          onSave={() => persist("Risks")}
        />
      )}
      {sub === "actions" && (
        <ActionsEditor actions={actions} setActions={setActions} saving={saving === "Actions"} onSave={() => persist("Actions")} />
      )}

      <ManagementPreview
        open={preview}
        onOpenChange={setPreview}
        commentary={commentary}
        risks={risks}
        actions={actions}
        onDownload={downloadPdf}
        onEmail={async () => {
          if (await ensureSaved()) {
            setPreview(false);
            setEmail(true);
          }
        }}
      />
      <EmailReportDialog open={email} onOpenChange={setEmail} displayCurrency={displayCurrency} />
    </div>
  );
}

// ── Risks ────────────────────────────────────────────────────

type RiskRow = ReportRisk & { id: string };

function RisksEditor({
  risks,
  setRisks,
  counts,
  saving,
  onSave,
}: {
  risks: RiskRow[];
  setRisks: React.Dispatch<React.SetStateAction<RiskRow[]>>;
  counts: { high: number; medium: number; low: number };
  saving: boolean;
  onSave: () => void;
}) {
  const blank = useRef({ text: "", severity: "medium" as RiskSeverity, impact: "", owner: "" });
  const [draft, setDraft] = useState(blank.current);

  const patch = (id: string, p: Partial<ReportRisk>) =>
    setRisks((l) => l.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const add = () => {
    if (!draft.text.trim()) return;
    setRisks((l) => [
      ...l,
      withId({ ...draft, text: draft.text.trim(), likelihood: "", mitigation: "" }) as RiskRow,
    ]);
    setDraft(blank.current);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm text-destructive">Risks and issues</CardTitle>
          <div className="flex gap-2 text-[10px] font-bold">
            {counts.high > 0 && <Pill tone="red">{counts.high} High</Pill>}
            {counts.medium > 0 && <Pill tone="amber">{counts.medium} Medium</Pill>}
            {counts.low > 0 && <Pill tone="green">{counts.low} Low</Pill>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!risks.length && <p className="py-2 text-sm text-muted-foreground">No risks recorded for this period.</p>}
        {risks.map((r) => (
          <div key={r.id} className={cn("rounded-lg border p-3", SEVERITY_STYLE[r.severity])}>
            <div className="flex items-start gap-2">
              <Input
                value={r.text}
                onChange={(e) => patch(r.id, { text: e.target.value })}
                className="font-semibold"
                placeholder="Describe the risk or issue"
              />
              <Button size="icon" variant="ghost" onClick={() => setRisks((l) => l.filter((x) => x.id !== r.id))} title="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <Field label="Severity">
                <Select value={r.severity} onValueChange={(v) => patch(r.id, { severity: v as RiskSeverity })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Owner">
                <Input className="h-8" placeholder="e.g. CFO" value={r.owner} onChange={(e) => patch(r.id, { owner: e.target.value })} />
              </Field>
              <Field label="Impact">
                <Input className="h-8" placeholder="e.g. cash shortfall" value={r.impact} onChange={(e) => patch(r.id, { impact: e.target.value })} />
              </Field>
              <Field label="Likelihood">
                <Input className="h-8" placeholder="e.g. Likely" value={r.likelihood} onChange={(e) => patch(r.id, { likelihood: e.target.value })} />
              </Field>
            </div>
            <Field label="Mitigation" className="mt-2">
              <Input className="h-8" placeholder="What is being done about it" value={r.mitigation} onChange={(e) => patch(r.id, { mitigation: e.target.value })} />
            </Field>
          </div>
        ))}

        <div className="border-t-2 pt-4">
          <p className="mb-2 text-xs font-bold text-destructive">+ Add new risk</p>
          <div className="space-y-2">
            <Input
              placeholder="Describe the risk or issue…"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <div className="flex flex-wrap gap-2">
              <Select value={draft.severity} onValueChange={(v) => setDraft((d) => ({ ...d, severity: v as RiskSeverity }))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="min-w-[180px] flex-1"
                placeholder="Impact (e.g. revenue shortfall)"
                value={draft.impact}
                onChange={(e) => setDraft((d) => ({ ...d, impact: e.target.value }))}
              />
              <Input
                className="w-36"
                placeholder="Owner"
                value={draft.owner}
                onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
              />
              <Button onClick={add} disabled={!draft.text.trim()}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save risks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Actions ──────────────────────────────────────────────────

type ActionRow = ReportAction & { id: string };

function ActionsEditor({
  actions,
  setActions,
  saving,
  onSave,
}: {
  actions: ActionRow[];
  setActions: React.Dispatch<React.SetStateAction<ActionRow[]>>;
  saving: boolean;
  onSave: () => void;
}) {
  const blank = { text: "", priority: "normal" as ActionPriority, owner: "", due: "" };
  const [draft, setDraft] = useState(blank);

  const patch = (id: string, p: Partial<ReportAction>) =>
    setActions((l) => l.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const add = () => {
    if (!draft.text.trim()) return;
    setActions((l) => [...l, withId({ ...draft, text: draft.text.trim() }) as ActionRow]);
    setDraft(blank);
  };

  const PrioritySelect = ({ value, onChange, className }: { value: ActionPriority; onChange: (v: ActionPriority) => void; className?: string }) => (
    <Select value={value} onValueChange={(v) => onChange(v as ActionPriority)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="normal">Normal</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-primary">Actions for next period</CardTitle>
          <Badge variant="outline" className="text-xs">
            {actions.length} item{actions.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!actions.length && <p className="py-2 text-sm text-muted-foreground">No actions recorded for this period.</p>}
        {actions.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
            <span className={cn("mt-3 h-2.5 w-2.5 shrink-0 rounded-full", PRIORITY_DOT[a.priority])} />
            <div className="min-w-0 flex-1 space-y-2">
              <Input value={a.text} onChange={(e) => patch(a.id, { text: e.target.value })} placeholder="What needs to happen" />
              <div className="flex flex-wrap gap-2">
                <Field label="Priority">
                  <PrioritySelect className="h-8 w-28" value={a.priority} onChange={(v) => patch(a.id, { priority: v })} />
                </Field>
                <Field label="Owner">
                  <Input className="h-8 w-40" placeholder="e.g. Finance" value={a.owner} onChange={(e) => patch(a.id, { owner: e.target.value })} />
                </Field>
                <Field label="Due date">
                  <Input className="h-8 w-40" type="date" value={a.due} onChange={(e) => patch(a.id, { due: e.target.value })} />
                </Field>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setActions((l) => l.filter((x) => x.id !== a.id))} title="Remove">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="border-t-2 pt-4">
          <p className="mb-2 text-xs font-bold text-primary">+ Add new action</p>
          <div className="space-y-2">
            <Input
              placeholder="What needs to happen next period…"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <div className="flex flex-wrap gap-2">
              <PrioritySelect className="w-28" value={draft.priority} onChange={(v) => setDraft((d) => ({ ...d, priority: v }))} />
              <Input className="w-40" placeholder="Owner" value={draft.owner} onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))} />
              <Input className="w-44" type="date" value={draft.due} onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))} />
              <Button onClick={add} disabled={!draft.text.trim()}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
