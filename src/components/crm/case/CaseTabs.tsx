import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Folder,
  Upload,
  FolderPlus,
  Phone,
  Plus,
  FileText,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  mockCommsThread,
  mockThreadMembers,
  mockDocFolders,
  mockRecentDocs,
  mockDeadlineRules,
  mockTimeEntries,
  mockAuditTrail,
  mockAccessMatrix,
  mockDrafting,
  type MockMessage,
} from "@/data/caseDetailMock";

const kindTone: Record<string, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/10 text-primary border-primary/20",
  received: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const kindLabel: Record<string, string> = {
  internal: "INTERNAL",
  sent: "EMAIL — SENT",
  received: "EMAIL — RECEIVED",
};

/** Internal notes + external correspondence in one thread. */
export function CaseCommunicationsTab({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<MockMessage[]>(() =>
    mockCommsThread(caseId),
  );
  const [kind, setKind] = useState("internal");
  const [body, setBody] = useState("");
  const members = mockThreadMembers();

  const send = () => {
    if (!body.trim()) return;
    setMessages((m) => [
      ...m,
      {
        id: `${caseId}-${m.length + 1}`,
        kind: kind as MockMessage["kind"],
        author: "You",
        at: "Just now",
        body: body.trim(),
      },
    ]);
    setBody("");
    toast({
      title: kind === "internal" ? "Internal note added" : "Email sent",
      description:
        kind === "internal"
          ? "Visible to the case team only."
          : "Logged to the audit trail automatically.",
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <p className="text-sm text-muted-foreground">
          Internal team discussion and external client/counterparty
          correspondence, in one thread. Internal notes are never visible to the
          client portal or opposing counsel.
        </p>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-3 ${
              m.kind === "sent" ? "bg-primary/5" : "bg-muted/30"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${kindTone[m.kind]}`}
                >
                  {kindLabel[m.kind]}
                </Badge>
                <span className="text-sm font-semibold">
                  {m.author}
                  {m.to && ` → ${m.to}`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{m.at}</span>
            </div>
            <p className="mt-1.5 text-sm">{m.body}</p>
          </div>
        ))}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal note</SelectItem>
              <SelectItem value="sent">Email → client</SelectItem>
              <SelectItem value="received">Email → opposing counsel</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            className="flex-1"
            rows={2}
            placeholder="Write a note or an email — internal notes stay inside the case team; emails send externally and log automatically."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={send} disabled={!body.trim()}>
            Send
          </Button>
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Who's on this thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-2">
              <span className="text-sm">{p.name}</span>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${
                  p.reach === "Email only"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                {p.reach}
              </Badge>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Every outbound email logs to the audit trail automatically. Internal
            notes never leave the case team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Drafting workspace — documents being authored on this case. */
export function CaseDraftingTab() {
  const drafts = mockDrafting();
  const tone: Record<string, string> = {
    Final: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "In review": "bg-amber-100 text-amber-700 border-amber-200",
    Draft: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Documents being drafted on this case. Finalised drafts move into
          Documents and lock a version.
        </p>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New draft
        </Button>
      </div>
      {drafts.map((d) => (
        <Card key={d.title}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.meta}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tone[d.status]}>
                {d.status}
              </Badge>
              <Button size="sm" variant="outline">
                Open editor
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Folder-organised case documents. */
export function CaseDocumentsTab({ caseId }: { caseId: string }) {
  const folders = mockDocFolders(caseId);
  const recent = mockRecentDocs();
  const total = folders.reduce((s, f) => s + f.count, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {total} documents, organised into folders for this case. Folders keep
          filing consistent across every ADR and litigation matter.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Upload className="mr-1.5 h-4 w-4" /> Upload
          </Button>
          <Button size="sm">
            <FolderPlus className="mr-1.5 h-4 w-4" /> New folder
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {folders.map((f) => (
          <Card key={f.name} className="cursor-pointer hover:border-primary/50">
            <CardContent className="p-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.tone}`}
              >
                <Folder className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-sm font-semibold">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.count} documents
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Recently added</h4>
        <Card>
          <CardContent className="divide-y p-0">
            {recent.map((d) => (
              <div
                key={d.title}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="flex gap-3">
                  <div className="h-9 w-7 shrink-0 rounded bg-muted" />
                  <div>
                    <p className="text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.meta}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{d.size}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Computed deadlines driven by trigger + rule, never typed in. */
export function CaseDeadlineRulesTab({ caseId }: { caseId: string }) {
  const rules = mockDeadlineRules(caseId);
  const tone: Record<string, string> = {
    met: "bg-emerald-100 text-emerald-700 border-emerald-200",
    due: "bg-amber-100 text-amber-700 border-amber-200",
    idle: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Deadlines here are computed from rules, not typed in. Set a trigger event
        and a rule once; the due date — and anything that cascades from it —
        updates itself.
      </p>
      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm">
              <span className="font-semibold">Trigger: </span>
              {r.trigger}
            </p>
            <p className="text-sm text-muted-foreground">→ {r.rule}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tone[r.tone]}>
                {r.status}
              </Badge>
              <Button size="sm" variant="outline">
                Edit rule
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button size="sm">
        <Plus className="mr-1.5 h-4 w-4" /> Add deadline rule
      </Button>
    </div>
  );
}

/** Time entries and disbursement summary for the case. */
export function CaseTimeBillingTab({
  hours,
  fees,
  disbursed,
}: {
  hours: string;
  fees: string;
  disbursed: string;
}) {
  const entries = mockTimeEntries();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hours} logged · {fees} fees · {disbursed} disbursements. Entries sync
          to the firm timesheet automatically.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Phone className="mr-1.5 h-4 w-4" /> Log call
          </Button>
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Log time
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Timekeeper</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{e.date}</TableCell>
                  <TableCell className="text-sm">{e.timekeeper}</TableCell>
                  <TableCell className="text-sm">{e.activity}</TableCell>
                  <TableCell className="text-sm">{e.type}</TableCell>
                  <TableCell className="text-sm">{e.duration}</TableCell>
                  <TableCell className="text-sm">{e.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        e.billable
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {e.billable ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Audit trail plus confidentiality / access matrix. */
export function CaseAuditAccessTab() {
  const trail = mockAuditTrail();
  const access = mockAccessMatrix();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trail.map((t) => (
            <div key={t.title} className="flex gap-3">
              <div
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <span className="text-xs text-muted-foreground">{t.at}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.detail}</p>
              </div>
            </div>
          ))}
          <Button variant="link" size="sm" className="px-0">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export full audit trail
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Confidentiality &amp; access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {access.map((a) => (
            <div key={a.who} className="flex items-center justify-between gap-2">
              <span className="text-sm">{a.who}</span>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${a.tone}`}>
                {a.level}
              </Badge>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-1.5 h-4 w-4" /> Manage access
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** A named search box used above case lists. */
export function CaseSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="max-w-xs"
    />
  );
}
