import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  advanceInvestor,
  createInvestor,
  deleteInvestor,
  updateInvestor,
  type InvestorInput,
  type PipelineInvestor,
} from "@/lib/grc/readiness-workspace-api";
import { Tile, fail, fmtDate, fmtMoney, type TabProps } from "./shared";
import {
  SendReportDialog,
  SendRoomDialog,
  type SendTarget,
} from "./SendDialogs";

const TYPES = ["DFI", "Impact", "VC", "PE", "Angel", "Strategic", "Bank"];
const STAGE_TONE: Record<string, string> = {
  outreach: "text-muted-foreground",
  nda_signed: "text-sky-600 border-sky-500/40 bg-sky-500/10",
  dd_progress: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  term_sheet: "text-violet-600 border-violet-500/40 bg-violet-500/10",
  closing: "text-yellow-700 border-yellow-500/40 bg-yellow-500/10",
  closed: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
};
const INTEREST_TONE: Record<string, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-muted-foreground",
};

type Sort = "name" | "last_contact" | "interest";
const INTEREST_RANK = { high: 0, medium: 1, low: 2 } as const;

export function PipelineTab({ current, ws, onWorkspace }: TabProps) {
  const [stage, setStage] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("last_contact");
  const [edit, setEdit] = useState<PipelineInvestor | "new" | null>(null);
  const [roomFor, setRoomFor] = useState<SendTarget | null>(null);
  const [reportFor, setReportFor] = useState<SendTarget | null>(null);

  const advance = useMutation({
    mutationFn: (id: string) => advanceInvestor(id),
    onSuccess: (w, id) => {
      onWorkspace(w);
      const inv = w.investors.find((i) => i._id === id);
      const label = w.stages.find((s) => s.key === inv?.stage)?.label;
      toast({ title: `${inv?.name} moved to ${label}` });
    },
    onError: (e) => fail("Could not advance the investor", e),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteInvestor(id),
    onSuccess: onWorkspace,
    onError: (e) => fail("Could not remove the investor", e),
  });

  const all = ws.investors;
  const shown = all
    .filter((i) => stage === "all" || i.stage === stage)
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "interest")
        return INTEREST_RANK[a.interest] - INTEREST_RANK[b.interest];
      return +new Date(b.lastContact) - +new Date(a.lastContact);
    });

  // Ticket sizes are summed per currency — adding USD to RWF would be
  // meaningless.
  const tickets = new Map<string, number>();
  for (const i of all) {
    if (i.ticketAmount > 0) {
      tickets.set(
        i.ticketCurrency,
        (tickets.get(i.ticketCurrency) ?? 0) + i.ticketAmount,
      );
    }
  }
  const ticketLabel = tickets.size
    ? [...tickets.entries()].map(([c, n]) => fmtMoney(n, c)).join(" + ")
    : "—";

  const target = (i: PipelineInvestor): SendTarget => ({
    investorId: i._id,
    investorName: i.name,
    organisation: i.organisation,
    email: i.email,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ws.stages.map((s, idx) => {
          const n = all.filter((i) => i.stage === s.key).length;
          const on = stage === s.key;
          return (
            <button
              type="button"
              key={s.key}
              onClick={() => setStage(on ? "all" : s.key)}
              className={`relative rounded-lg border p-3 text-left transition ${
                on ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
              }`}
            >
              <div className="text-2xl font-bold">{n}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              {idx < ws.stages.length - 1 ? (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground lg:block" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Investors" value={all.length} />
        <Tile
          label="Total ticket"
          value={<span className="text-base">{ticketLabel}</span>}
        />
        <Tile
          label="NDAs signed"
          value={`${all.filter((i) => i.ndaSignedAt).length}/${all.length}`}
        />
        <Tile
          label="Data room views"
          value={all.reduce((n, i) => n + i.engagement.views, 0)}
        />
        <Tile
          label="Downloads"
          value={all.reduce((n, i) => n + i.engagement.downloads, 0)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">
            {stage === "all"
              ? "All investors"
              : ws.stages.find((s) => s.key === stage)?.label}
          </h3>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger
              className="h-8 w-[170px]"
              aria-label="Sort investors"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_contact">Sort: Last contact</SelectItem>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="interest">Sort: Interest level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setEdit("new")}>
          <Plus className="mr-2 h-4 w-4" /> Add investor
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {all.length === 0
            ? "No investors yet — add the first one you're talking to."
            : "No investors in this stage."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((i) => {
            const st = ws.stages.find((s) => s.key === i.stage);
            const last = ws.stages[ws.stages.length - 1];
            return (
              <div key={i._id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {i.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {i.name}
                      {i.organisation ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          — {i.organisation}
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {i.email || "No email"} · {i.type}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className={STAGE_TONE[i.stage]}>
                      {st?.label ?? i.stage}
                    </Badge>
                    {i.ndaSignedAt ? (
                      <Badge variant="outline" className="text-[10px]">
                        <Lock className="mr-1 h-3 w-3" /> NDA
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Ticket:{" "}
                    <strong className="text-foreground">
                      {i.ticketAmount
                        ? fmtMoney(i.ticketAmount, i.ticketCurrency)
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Interest:{" "}
                    <strong className={INTEREST_TONE[i.interest]}>
                      {i.interest}
                    </strong>
                  </span>
                  <span>First contact: {fmtDate(i.firstContact)}</span>
                  <span>Last contact: {fmtDate(i.lastContact)}</span>
                </div>
                {i.notes ? (
                  <p className="mb-2 text-xs italic text-muted-foreground">
                    {i.notes}
                  </p>
                ) : null}

                <div className="grid grid-cols-4 gap-2 rounded-md bg-muted/40 p-2 text-center">
                  <Stat label="Views" value={i.engagement.views} />
                  <Stat label="Downloads" value={i.engagement.downloads} />
                  <Stat label="Questions" value={i.questions} />
                  <Stat
                    label="Last view"
                    value={fmtDate(i.engagement.lastView)}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRoomFor(target(i))}
                  >
                    <FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Send data room
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!current}
                    onClick={() => setReportFor(target(i))}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Send report
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={i.stage === last.key || advance.isPending}
                    onClick={() => advance.mutate(i._id)}
                  >
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Advance stage
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${i.name}`}
                    onClick={() => setEdit(i)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${i.name}`}
                    onClick={() => del.mutate(i._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit ? (
        <InvestorDialog
          key={edit === "new" ? "new" : edit._id}
          investor={edit === "new" ? undefined : edit}
          stages={ws.stages}
          onClose={() => setEdit(null)}
          onWorkspace={onWorkspace}
        />
      ) : null}
      <SendRoomDialog
        open={!!roomFor}
        onOpenChange={(o) => !o && setRoomFor(null)}
        ws={ws}
        target={roomFor ?? undefined}
        onDone={onWorkspace}
      />
      <SendReportDialog
        open={!!reportFor}
        onOpenChange={(o) => !o && setReportFor(null)}
        ws={ws}
        assessment={current}
        target={reportFor ?? undefined}
        onDone={onWorkspace}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function InvestorDialog({
  investor,
  stages,
  onClose,
  onWorkspace,
}: {
  investor?: PipelineInvestor;
  stages: { key: string; label: string }[];
  onClose: () => void;
  onWorkspace: TabProps["onWorkspace"];
}) {
  const [f, setF] = useState({
    name: investor?.name ?? "",
    organisation: investor?.organisation ?? "",
    email: investor?.email ?? "",
    type: investor?.type ?? "VC",
    stage: investor?.stage ?? "outreach",
    interest: investor?.interest ?? "medium",
    ticketAmount: investor?.ticketAmount ? String(investor.ticketAmount) : "",
    ticketCurrency: investor?.ticketCurrency ?? "USD",
    notes: investor?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: () => {
      const body: InvestorInput = {
        name: f.name.trim(),
        organisation: f.organisation.trim(),
        email: f.email.trim(),
        type: f.type,
        stage: f.stage,
        interest: f.interest as InvestorInput["interest"],
        ticketAmount: Number(f.ticketAmount.replace(/,/g, "")) || 0,
        ticketCurrency: f.ticketCurrency.trim().toUpperCase() || "USD",
        notes: f.notes,
      };
      if (!body.email) delete body.email;
      return investor
        ? updateInvestor(investor._id, body)
        : createInvestor(body);
    },
    onSuccess: (w) => {
      onWorkspace(w);
      onClose();
    },
    onError: (e) => fail("Could not save the investor", e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {investor ? "Edit investor" : "Add investor"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Contact name</Label>
            <Input
              id="inv-name"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-org">Organisation</Label>
            <Input
              id="inv-org"
              value={f.organisation}
              onChange={(e) => setF({ ...f, organisation: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Investor type</Label>
            <Select
              value={f.type}
              onValueChange={(v) => setF({ ...f, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select
              value={f.stage}
              onValueChange={(v) => setF({ ...f, stage: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Interest</Label>
            <Select
              value={f.interest}
              onValueChange={(v) => setF({ ...f, interest: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-ticket">Ticket size</Label>
            <div className="flex gap-2">
              <Input
                className="w-20"
                aria-label="Currency"
                value={f.ticketCurrency}
                maxLength={4}
                onChange={(e) => setF({ ...f, ticketCurrency: e.target.value })}
              />
              <Input
                id="inv-ticket"
                inputMode="numeric"
                value={f.ticketAmount}
                onChange={(e) => setF({ ...f, ticketAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              className="min-h-[70px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!f.name.trim() || save.isPending}
          >
            {investor ? "Save" : "Add investor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
