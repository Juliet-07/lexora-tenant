import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Send,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdrCase,
  fetchAdrMessages,
  sendAdrMessage,
  sendAdrPartyEmail,
  addAdrTimelineEntry,
} from "@/lib/crm/adr-api";
import {
  mockDocFolders,
  mockRecentDocs,
  mockDeadlineRules,
  mockTimeEntries,
  mockAuditTrail,
  mockAccessMatrix,
  mockDrafting,
} from "@/data/caseDetailMock";

/** Internal notes + external correspondence in one thread. */
export function CaseCommunicationsTab({
  caseId,
  caseType,
}: {
  caseId: string;
  caseType: "ADR" | "Litigation";
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (caseType === "Litigation") {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Litigation communication is coming in the next phase of this build —
        available today for ADR cases.
      </p>
    );
  }

  // Shares the same query key the parent case page already uses, so
  // this reads from cache rather than firing a duplicate fetch.
  const { data: c } = useQuery({
    queryKey: ["adrCase", caseId],
    queryFn: () => fetchAdrCase(caseId),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["adrMessages", caseId],
    queryFn: () => fetchAdrMessages(caseId),
  });

  const [clientText, setClientText] = useState("");
  const clientMsgMut = useMutation({
    mutationFn: () => sendAdrMessage(caseId, "You", clientText.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrMessages", caseId] });
      setClientText("");
      toast({ title: "Message sent to client" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send message",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const [noteTitle, setNoteTitle] = useState("");
  const noteMut = useMutation({
    mutationFn: () => addAdrTimelineEntry(caseId, { title: noteTitle.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adrCase", caseId] });
      setNoteTitle("");
      toast({ title: "Internal note added" });
    },
  });

  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const partiesWithEmail = (c?.parties ?? []).filter((p) => p.email);
  const partyEmailMut = useMutation({
    mutationFn: () =>
      sendAdrPartyEmail(caseId, {
        partyIds: selectedPartyIds,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adrCase", caseId] });
      setSelectedPartyIds([]);
      setEmailSubject("");
      setEmailBody("");
      toast({
        title: "Email sent",
        description: `Sent to ${res.sentTo.join(", ")}`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send email",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const internalNotes = (c?.timeline ?? []).filter(
    (t) => t.source === "Manual",
  );
  const partyEmailLog = (c?.timeline ?? []).filter((t) =>
    t.title.startsWith("Email sent to"),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!messages.length && (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m._id}
              className={`rounded-lg p-2.5 text-sm ${m.direction === "tenant" ? "bg-primary/5" : "bg-muted/40"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{m.author}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1">{m.body}</p>
            </div>
          ))}
        </div>
        {!c?.mandateName ? (
          <p className="text-xs text-muted-foreground">
            No mandate linked — nothing to message here.
          </p>
        ) : (
          <div className="flex gap-2">
            <Textarea
              className="min-h-[60px] flex-1"
              placeholder="Message the client…"
              value={clientText}
              onChange={(e) => setClientText(e.target.value)}
            />
            <Button
              disabled={clientMsgMut.isPending || !clientText.trim()}
              onClick={() => clientMsgMut.mutate()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Parties
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!partyEmailLog.length && (
            <p className="text-sm text-muted-foreground">
              No emails sent to parties yet.
            </p>
          )}
          {partyEmailLog.map((t, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-sm">
              <p className="text-xs font-semibold">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.description}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(t.at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        {!partiesWithEmail.length ? (
          <p className="text-xs text-muted-foreground">
            No parties on this case have an email on file.
          </p>
        ) : (
          <div className="space-y-2 rounded border p-2">
            {partiesWithEmail.map((p) => (
              <label key={p._id} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedPartyIds.includes(p._id)}
                  onCheckedChange={() =>
                    setSelectedPartyIds((ids) =>
                      ids.includes(p._id)
                        ? ids.filter((x) => x !== p._id)
                        : [...ids, p._id],
                    )
                  }
                />
                {p.name} ({p.role})
              </label>
            ))}
            <Input
              placeholder="Subject"
              className="h-8 text-xs"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <Textarea
              placeholder="Message…"
              className="min-h-[60px] text-xs"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              disabled={
                partyEmailMut.isPending ||
                !selectedPartyIds.length ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
              onClick={() => partyEmailMut.mutate()}
            >
              Send
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Internal notes
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
          {!internalNotes.length && (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          {internalNotes.map((t, i) => (
            <div key={i} className="rounded-lg bg-muted/40 p-2.5 text-sm">
              <p>{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.description}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(t.at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Note for the case team…"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <Button
            disabled={noteMut.isPending || !noteTitle.trim()}
            onClick={() => noteMut.mutate()}
          >
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Visible to the case team only — never sent to the client or parties.
        </p>
      </div>
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
        Deadlines here are computed from rules, not typed in. Set a trigger
        event and a rule once; the due date — and anything that cascades from it
        — updates itself.
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
          <CardTitle className="text-base">
            Confidentiality &amp; access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {access.map((a) => (
            <div
              key={a.who}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm">{a.who}</span>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${a.tone}`}
              >
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
