import { useMemo, useState } from "react";
import {
  useResolutions,
  mutate as mutateRes,
  nextReference,
  tallyBoard,
  tallyWritten,
  computeOutcome,
  resUid,
  type Resolution,
  type ResolutionType,
  type BoardVote,
  type BoardVoteRow,
  type WrittenRow,
  type WrittenStatus,
  type ShareholderSubType,
  type Proxy,
} from "@/lib/grcResolutionsStore";
import { useGov } from "@/lib/grcGovernanceStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gavel,
  Plus,
  FileText,
  Send,
  Lock,
  Download,
  Clock,
  Vote,
  Search,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";

const TYPE_COLORS: Record<ResolutionType, string> = {
  Board: "bg-blue-100 text-blue-700 border-blue-200",
  Written: "bg-purple-100 text-purple-700 border-purple-200",
  Shareholder: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Voting open": "bg-emerald-100 text-emerald-700",
  Circulating: "bg-emerald-100 text-emerald-700",
  Closed: "bg-slate-200 text-slate-800",
};

function statusPill(r: Resolution) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ""}>
      {r.status}
    </Badge>
  );
}

function outcomePill(o: Resolution["outcome"]) {
  if (!o) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      className={
        o === "Passed"
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-rose-100 text-rose-700 border-rose-200"
      }
    >
      {o}
    </Badge>
  );
}

export default function GrcResolutions() {
  const list = useResolutions();
  const gov = useGov();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Resolution | null>(null);
  const [filterType, setFilterType] = useState<"all" | ResolutionType>("all");
  const [filterOutcome, setFilterOutcome] = useState<
    "all" | "Passed" | "Failed" | "Pending"
  >("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return list
      .filter((r) => filterType === "all" || r.type === filterType)
      .filter((r) =>
        filterOutcome === "all"
          ? true
          : filterOutcome === "Pending"
            ? r.outcome === null
            : r.outcome === filterOutcome,
      )
      .filter((r) =>
        q
          ? r.subject.toLowerCase().includes(q.toLowerCase()) ||
            r.reference.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [list, filterType, filterOutcome, q]);

  const stats = useMemo(() => {
    return {
      total: list.length,
      open: list.filter((r) => r.status !== "Closed" && r.status !== "Draft")
        .length,
      passed: list.filter((r) => r.outcome === "Passed").length,
      failed: list.filter((r) => r.outcome === "Failed").length,
    };
  }, [list]);

  const openDetail = (r: Resolution) => setCurrent(r);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            Resolutions
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Board, Written and Shareholder resolutions — one register, three
            voting mechanisms. All resolutions become read-only once the
            outcome is locked.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New resolution
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} tone="slate" />
        <StatCard label="Open / circulating" value={stats.open} tone="emerald" />
        <StatCard label="Passed" value={stats.passed} tone="blue" />
        <StatCard label="Failed" value={stats.failed} tone="rose" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reference or subject…"
                className="pl-8"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(v) =>
                setFilterType(v as typeof filterType)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Board">Board</SelectItem>
                <SelectItem value="Written">Written</SelectItem>
                <SelectItem value="Shareholder">Shareholder</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterOutcome}
              onValueChange={(v) =>
                setFilterOutcome(v as typeof filterOutcome)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Passed">Passed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Tally</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openDetail(r)}
                  >
                    <TableCell className="font-mono text-xs">
                      {r.reference}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TYPE_COLORS[r.type]}>
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate">
                      {r.subject}
                    </TableCell>
                    <TableCell>{statusPill(r)}</TableCell>
                    <TableCell>{outcomePill(r.outcome)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.effectiveDate}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {summariseTally(r)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No resolutions match your filters yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateResolutionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(r) => {
          setOpen(false);
          setCurrent(r);
        }}
      />

      {current && (
        <ResolutionSheet
          resolution={
            list.find((r) => r.id === current.id) ?? current
          }
          onClose={() => setCurrent(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "blue" | "rose";
}) {
  const bg = {
    slate: "from-slate-500 to-slate-600",
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    rose: "from-rose-500 to-rose-600",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${bg} text-white flex items-center justify-center shadow`}
        >
          <Vote className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold leading-none mt-1">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function summariseTally(r: Resolution) {
  if (r.type === "Board" && r.boardVotes) {
    const t = tallyBoard(r.boardVotes);
    return `${t.approve}✓ / ${t.oppose}✗ / ${t.abstain}∙`;
  }
  if (r.type === "Written" && r.writtenRows) {
    const t = tallyWritten(r.writtenRows);
    return `${t.approve}✓ / ${t.oppose}✗ / ${t.abstain}∙`;
  }
  if (r.type === "Shareholder") {
    return `${r.pollFor ?? 0} for / ${r.pollAgainst ?? 0} against`;
  }
  return "—";
}

function exportCsv(rows: Resolution[]) {
  const header = [
    "Reference",
    "Type",
    "Subject",
    "Status",
    "Outcome",
    "Effective",
  ];
  const body = rows.map((r) => [
    r.reference,
    r.type,
    `"${r.subject.replace(/"/g, "'")}"`,
    r.status,
    r.outcome ?? "",
    r.effectiveDate,
  ]);
  const csv = [header, ...body].map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `resolutions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────── Create dialog ────────────────────────── */

function CreateResolutionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (r: Resolution) => void;
}) {
  const list = useResolutions();
  const gov = useGov();
  const [type, setType] = useState<ResolutionType>("Board");
  const [reference, setReference] = useState(nextReference(list));
  const [subject, setSubject] = useState("");
  const [fullText, setFullText] = useState("");
  const [linkedMeetingId, setLinkedMeetingId] = useState<string>("");
  const [proposer, setProposer] = useState("");
  const [seconder, setSeconder] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [subType, setSubType] = useState<ShareholderSubType>("Ordinary");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
  );

  const reset = () => {
    setType("Board");
    setReference(nextReference(list));
    setSubject("");
    setFullText("");
    setLinkedMeetingId("");
    setProposer("");
    setSeconder("");
    setSubType("Ordinary");
  };

  const submit = () => {
    if (!subject.trim() || !fullText.trim()) {
      toast({ title: "Subject and full text required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const directors = gov.boardMembers;
    const base: Resolution = {
      id: resUid("res"),
      reference,
      type,
      subject: subject.trim(),
      fullText,
      linkedMeetingId: linkedMeetingId || null,
      effectiveDate,
      status: "Draft",
      outcome: null,
      createdAt: now,
    };
    let r: Resolution = base;
    if (type === "Board") {
      r = {
        ...base,
        proposer,
        seconder,
        boardVotes: directors.map<BoardVoteRow>((d) => ({
          directorId: d.id,
          directorName: d.name,
          recused: d.conflicts.length > 0, // system-driven from declarations
          vote: null,
        })),
      };
    } else if (type === "Written") {
      r = {
        ...base,
        deadline: new Date(deadline).toISOString(),
        majorityRule: "Simple",
        writtenRows: directors.map<WrittenRow>((d) => ({
          directorId: d.id,
          directorName: d.name,
          recused: d.conflicts.length > 0,
          status: "Not sent",
          response: null,
        })),
        notifications: [
          {
            id: resUid("ev"),
            at: now,
            kind: "System",
            message: "Resolution drafted — awaiting circulation.",
          },
        ],
      };
    } else {
      r = {
        ...base,
        subType,
        quorumRequired: 50,
        quorumPresent: 0,
        proxies: [],
        pollFor: 0,
        pollAgainst: 0,
        pollAbstain: 0,
      };
    }
    mutateRes((l) => [r, ...l]);
    toast({ title: "Resolution created" });
    reset();
    onCreated(r);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New resolution</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Resolution type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ResolutionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Board">Board</SelectItem>
                  <SelectItem value="Written">Written</SelectItem>
                  <SelectItem value="Shareholder">Shareholder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference number</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Subject / title</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <Label>Full resolution text</Label>
            <RichTextEditor value={fullText} onChange={setFullText} minHeight={160} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Locked once voting or circulation opens.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Linked meeting (optional)</Label>
              <Select
                value={linkedMeetingId || "__none__"}
                onValueChange={(v) => setLinkedMeetingId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {gov.meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title} — {new Date(m.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effective date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          {type === "Board" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proposer</Label>
                <Select value={proposer} onValueChange={setProposer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select director" />
                  </SelectTrigger>
                  <SelectContent>
                    {gov.boardMembers.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seconder</Label>
                <Select value={seconder} onValueChange={setSeconder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select director" />
                  </SelectTrigger>
                  <SelectContent>
                    {gov.boardMembers.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === "Written" && (
            <div>
              <Label>Response deadline</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          )}

          {type === "Shareholder" && (
            <div>
              <Label>Resolution sub-type</Label>
              <Select
                value={subType}
                onValueChange={(v) => setSubType(v as ShareholderSubType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ordinary">Ordinary (50%+1)</SelectItem>
                  <SelectItem value="Special">Special (75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Detail sheet ─────────────────────────── */

function ResolutionSheet({
  resolution,
  onClose,
}: {
  resolution: Resolution;
  onClose: () => void;
}) {
  const readOnly = resolution.status === "Closed";
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm">{resolution.reference}</span>
            <Badge variant="outline" className={TYPE_COLORS[resolution.type]}>
              {resolution.type}
            </Badge>
            {statusPill(resolution)}
            {outcomePill(resolution.outcome)}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-lg font-semibold">{resolution.subject}</div>
            <div className="text-xs text-muted-foreground">
              Effective {resolution.effectiveDate}
              {resolution.proposer && ` · Proposed by ${resolution.proposer}`}
              {resolution.seconder && ` · Seconded by ${resolution.seconder}`}
            </div>
          </div>

          <div className="border rounded-md p-3 bg-muted/30">
            <div className="text-xs font-medium mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Resolution text
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: resolution.fullText }}
            />
          </div>

          {resolution.type === "Board" && (
            <BoardVotingPanel resolution={resolution} readOnly={readOnly} />
          )}
          {resolution.type === "Written" && (
            <WrittenPanel resolution={resolution} readOnly={readOnly} />
          )}
          {resolution.type === "Shareholder" && (
            <ShareholderPanel resolution={resolution} readOnly={readOnly} />
          )}

          {resolution.status === "Closed" && (
            <OutcomeCard resolution={resolution} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OutcomeCard({ resolution }: { resolution: Resolution }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardContent className="p-3 text-sm flex items-center gap-2">
        <Lock className="h-4 w-4 text-emerald-700" />
        <div>
          <div className="font-medium">
            Outcome locked — {resolution.outcome}
          </div>
          <div className="text-xs text-muted-foreground">
            Closed on{" "}
            {resolution.closedAt
              ? new Date(resolution.closedAt).toLocaleString()
              : "—"}{" "}
            · This record is now read-only and part of the register.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────── Board voting ─────────────────────────── */

function BoardVotingPanel({
  resolution,
  readOnly,
}: {
  resolution: Resolution;
  readOnly: boolean;
}) {
  const rows = resolution.boardVotes ?? [];
  const tally = tallyBoard(rows);
  const canClose =
    resolution.status !== "Closed" &&
    tally.total > 0 &&
    tally.awaiting === 0;

  const setVote = (idx: number, vote: BoardVote) => {
    if (readOnly) return;
    mutateRes((list) =>
      list.map((r) => {
        if (r.id !== resolution.id) return r;
        const next = [...(r.boardVotes ?? [])];
        next[idx] = { ...next[idx], vote };
        return {
          ...r,
          boardVotes: next,
          status: r.status === "Draft" ? "Voting open" : r.status,
        };
      }),
    );
  };

  const closeVote = () => {
    const outcome = computeOutcome(tally.approve, tally.total, "Simple");
    mutateRes((list) =>
      list.map((r) =>
        r.id === resolution.id
          ? {
              ...r,
              status: "Closed",
              outcome,
              closedAt: new Date().toISOString(),
            }
          : r,
      ),
    );
    toast({ title: `Vote closed — ${outcome}` });
  };

  return (
    <div className="space-y-3">
      <TallyRow t={tally} />
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Director</TableHead>
              <TableHead>Conflict</TableHead>
              <TableHead className="text-right">Vote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.directorId}>
                <TableCell className="font-medium">
                  {row.directorName}
                </TableCell>
                <TableCell>
                  {row.recused ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-700 border-amber-200"
                    >
                      Recused
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Eligible
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.recused ? (
                    <span className="text-xs text-muted-foreground text-right block">
                      Excluded from tally
                    </span>
                  ) : (
                    <div className="flex justify-end gap-1">
                      {(["Approve", "Oppose", "Abstain"] as BoardVote[]).map(
                        (v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={row.vote === v ? "default" : "outline"}
                            disabled={readOnly}
                            onClick={() => setVote(i, v)}
                          >
                            {v}
                          </Button>
                        ),
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <div className="flex justify-end">
          <Button disabled={!canClose} onClick={closeVote}>
            <Lock className="h-4 w-4 mr-1" />
            Close vote and record outcome
          </Button>
        </div>
      )}
    </div>
  );
}

function TallyRow({
  t,
}: {
  t: { approve: number; oppose: number; abstain: number; awaiting: number };
}) {
  const cell = (label: string, val: number, tone: string) => (
    <div className={`rounded-md p-2 text-center border ${tone}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="text-xl font-semibold leading-tight">{val}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-4 gap-2">
      {cell("Approve", t.approve, "bg-emerald-50 border-emerald-200 text-emerald-800")}
      {cell("Oppose", t.oppose, "bg-rose-50 border-rose-200 text-rose-800")}
      {cell("Abstain", t.abstain, "bg-slate-50 border-slate-200 text-slate-800")}
      {cell("Awaiting", t.awaiting, "bg-amber-50 border-amber-200 text-amber-800")}
    </div>
  );
}

/* ───────────────────────── Written circulation ───────────────────── */

function WrittenPanel({
  resolution,
  readOnly,
}: {
  resolution: Resolution;
  readOnly: boolean;
}) {
  const rows = resolution.writtenRows ?? [];
  const t = tallyWritten(rows);
  const remainingMs = resolution.deadline
    ? new Date(resolution.deadline).getTime() - Date.now()
    : 0;
  const warn = remainingMs > 0 && remainingMs < 2 * 86400000;
  const passed = remainingMs <= 0;

  const setStatus = (idx: number, status: WrittenStatus) => {
    mutateRes((list) =>
      list.map((r) => {
        if (r.id !== resolution.id) return r;
        const next = [...(r.writtenRows ?? [])];
        next[idx] = { ...next[idx], status };
        return {
          ...r,
          writtenRows: next,
          status: r.status === "Draft" ? "Circulating" : r.status,
          notifications: [
            ...(r.notifications ?? []),
            {
              id: resUid("ev"),
              at: new Date().toISOString(),
              kind: status === "Reminded" ? "Reminder" : "Sent",
              message: `${status} — ${next[idx].directorName}`,
            },
          ],
        };
      }),
    );
  };

  const recordResponse = (
    idx: number,
    response: BoardVote,
    manual = false,
  ) => {
    mutateRes((list) =>
      list.map((r) => {
        if (r.id !== resolution.id) return r;
        const next = [...(r.writtenRows ?? [])];
        next[idx] = {
          ...next[idx],
          response,
          status: "Responded",
          respondedAt: new Date().toISOString(),
          manualEntry: manual,
        };
        return {
          ...r,
          writtenRows: next,
          notifications: [
            ...(r.notifications ?? []),
            {
              id: resUid("ev"),
              at: new Date().toISOString(),
              kind: "Response",
              message: `${next[idx].directorName} responded: ${response}${
                manual ? " (logged manually)" : ""
              }`,
            },
          ],
        };
      }),
    );
  };

  const closeAndRecord = (forced = false) => {
    const outcome = computeOutcome(t.approve, t.total, "Simple");
    mutateRes((list) =>
      list.map((r) =>
        r.id === resolution.id
          ? {
              ...r,
              status: "Closed",
              outcome,
              closedAt: new Date().toISOString(),
              forceClosedBy: forced ? "Admin" : undefined,
              forceClosedAt: forced ? new Date().toISOString() : undefined,
              notifications: [
                ...(r.notifications ?? []),
                {
                  id: resUid("ev"),
                  at: new Date().toISOString(),
                  kind: "System",
                  message: forced
                    ? "Force-closed by Admin"
                    : "Circulation closed",
                },
              ],
            }
          : r,
      ),
    );
    toast({ title: `Circulation closed — ${outcome}` });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Deadline</div>
          <div className="text-sm font-medium">
            {resolution.deadline
              ? new Date(resolution.deadline).toLocaleString()
              : "—"}
          </div>
        </div>
        <div
          className={`rounded-md border p-2 ${
            warn ? "bg-amber-50 border-amber-200" : ""
          }`}
        >
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Time remaining
          </div>
          <div className="text-sm font-medium">
            {passed ? "Deadline passed" : formatRemaining(remainingMs)}
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Majority</div>
          <div className="text-sm font-medium">
            {resolution.majorityRule ?? "Simple"}
          </div>
        </div>
      </div>

      <TallyRow t={t} />

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Director</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.directorId}>
                <TableCell className="font-medium">
                  {row.directorName}
                  {row.recused && (
                    <Badge
                      variant="outline"
                      className="ml-2 bg-amber-100 text-amber-700 border-amber-200"
                    >
                      Recused
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <StatusPill status={row.status} />
                </TableCell>
                <TableCell className="text-xs">
                  {row.response ?? "—"}
                  {row.manualEntry && (
                    <span className="text-[10px] ml-1 text-muted-foreground">
                      (manual)
                    </span>
                  )}
                  {row.respondedAt && (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(row.respondedAt).toLocaleString()}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {!row.recused && !readOnly && row.status !== "Responded" && (
                    <div className="flex justify-end gap-1 flex-wrap">
                      {row.status === "Not sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(i, "Sent")}
                        >
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
                      {row.status !== "Not sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(i, "Reminded")}
                        >
                          Remind
                        </Button>
                      )}
                      <ManualResponseButton
                        onPick={(v) => recordResponse(i, v, true)}
                      />
                    </div>
                  )}
                  {!row.recused && !readOnly && row.status === "Responded" && (
                    <span className="text-[10px] text-muted-foreground">
                      Logged
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <div className="text-xs font-medium mb-1">Notification log</div>
        <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
          {(resolution.notifications ?? []).map((e) => (
            <div key={e.id} className="text-[11px] flex gap-2">
              <span className="text-muted-foreground">
                {new Date(e.at).toLocaleString()}
              </span>
              <Badge variant="outline" className="text-[10px] h-4">
                {e.kind}
              </Badge>
              <span>{e.message}</span>
            </div>
          ))}
          {(resolution.notifications ?? []).length === 0 && (
            <div className="text-[11px] text-muted-foreground">No events yet.</div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => closeAndRecord(true)}>
            Force close
          </Button>
          <Button
            disabled={t.total > 0 && t.awaiting > 0 && !passed}
            onClick={() => closeAndRecord(false)}
          >
            <Lock className="h-4 w-4 mr-1" />
            Close and record outcome
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: WrittenStatus }) {
  const cls: Record<WrittenStatus, string> = {
    "Not sent": "bg-slate-100 text-slate-700",
    Sent: "bg-blue-100 text-blue-700",
    Reminded: "bg-amber-100 text-amber-700",
    Responded: "bg-emerald-100 text-emerald-700",
  };
  return (
    <Badge variant="outline" className={cls[status]}>
      {status}
    </Badge>
  );
}

function ManualResponseButton({
  onPick,
}: {
  onPick: (v: BoardVote) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Log manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Log a manual response</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Use for directors who responded via email or signed PDF.
        </p>
        <div className="flex gap-2 mt-2">
          {(["Approve", "Oppose", "Abstain"] as BoardVote[]).map((v) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              onClick={() => {
                onPick(v);
                setOpen(false);
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "0";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

/* ─────────────────────── Shareholder resolution ──────────────────── */

function ShareholderPanel({
  resolution,
  readOnly,
}: {
  resolution: Resolution;
  readOnly: boolean;
}) {
  const [proxyName, setProxyName] = useState("");
  const [representing, setRepresenting] = useState("");
  const [shares, setShares] = useState<number>(100);
  const [pollFor, setPollFor] = useState<number>(resolution.pollFor ?? 0);
  const [pollAgainst, setPollAgainst] = useState<number>(
    resolution.pollAgainst ?? 0,
  );
  const [pollAbstain, setPollAbstain] = useState<number>(
    resolution.pollAbstain ?? 0,
  );
  const [quorumPresent, setQuorumPresent] = useState<number>(
    resolution.quorumPresent ?? 0,
  );

  const quorumMet =
    (quorumPresent ?? 0) >= (resolution.quorumRequired ?? 50);

  const addProxy = () => {
    if (!proxyName.trim() || !representing.trim()) return;
    const p: Proxy = {
      id: resUid("px"),
      proxyName: proxyName.trim(),
      representing: representing.trim(),
      shares,
      vote: null,
    };
    mutateRes((list) =>
      list.map((r) =>
        r.id === resolution.id
          ? { ...r, proxies: [...(r.proxies ?? []), p] }
          : r,
      ),
    );
    setProxyName("");
    setRepresenting("");
    setShares(100);
  };

  const savePoll = () => {
    mutateRes((list) =>
      list.map((r) =>
        r.id === resolution.id
          ? {
              ...r,
              status: r.status === "Draft" ? "Voting open" : r.status,
              pollFor,
              pollAgainst,
              pollAbstain,
              quorumPresent,
            }
          : r,
      ),
    );
    toast({ title: "Poll saved" });
  };

  const close = () => {
    const total = pollFor + pollAgainst + pollAbstain;
    const outcome = computeOutcome(
      pollFor,
      total,
      resolution.subType === "Special" ? "Special" : "Simple",
    );
    mutateRes((list) =>
      list.map((r) =>
        r.id === resolution.id
          ? {
              ...r,
              status: "Closed",
              outcome,
              closedAt: new Date().toISOString(),
              pollFor,
              pollAgainst,
              pollAbstain,
              quorumPresent,
            }
          : r,
      ),
    );
    toast({ title: `Poll closed — ${outcome}` });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Sub-type</div>
          <div className="text-sm font-medium">
            {resolution.subType} ·{" "}
            {resolution.subType === "Special" ? "75%" : "50%+1"}
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-[11px] text-muted-foreground">Quorum required</div>
          <div className="text-sm font-medium">
            {resolution.quorumRequired}%
          </div>
        </div>
        <div
          className={`rounded-md border p-2 ${
            quorumMet
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="text-[11px] text-muted-foreground">Present / represented</div>
          <div className="text-sm font-medium">
            {quorumPresent}% — {quorumMet ? "Quorum met" : "Waiting"}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-xs">Present (%)</Label>
            <Input
              type="number"
              value={quorumPresent}
              onChange={(e) => setQuorumPresent(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Votes for</Label>
            <Input
              type="number"
              value={pollFor}
              onChange={(e) => setPollFor(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Against</Label>
            <Input
              type="number"
              value={pollAgainst}
              onChange={(e) => setPollAgainst(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Abstain</Label>
            <Input
              type="number"
              value={pollAbstain}
              onChange={(e) => setPollAbstain(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-medium mb-1">Proxies</div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proxy</TableHead>
                <TableHead>Representing</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead>Vote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resolution.proxies ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.proxyName}</TableCell>
                  <TableCell>{p.representing}</TableCell>
                  <TableCell className="text-right">{p.shares}</TableCell>
                  <TableCell>{p.vote ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(resolution.proxies ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-3">
                    No proxies recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!readOnly && (
          <div className="grid grid-cols-4 gap-2 mt-2 items-end">
            <Input
              placeholder="Proxy name"
              value={proxyName}
              onChange={(e) => setProxyName(e.target.value)}
            />
            <Input
              placeholder="Representing"
              value={representing}
              onChange={(e) => setRepresenting(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Shares"
              value={shares}
              onChange={(e) => setShares(Number(e.target.value))}
            />
            <Button variant="outline" size="sm" onClick={addProxy}>
              Add proxy
            </Button>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={savePoll}>
            Save poll
          </Button>
          <Button disabled={!quorumMet} onClick={close}>
            <Lock className="h-4 w-4 mr-1" />
            Close and record outcome
          </Button>
        </div>
      )}
    </div>
  );
}
