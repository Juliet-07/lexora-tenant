import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  attachSideLetterDocument,
  createSideLetter,
  deleteSideLetter,
  executeSideLetter,
  fetchSideLetters,
  recordMfnElection,
  setProvisionCompliance,
  updateSideLetter,
  type CapitalCommitment,
  type ProvisionCompliance,
  type SideLetterMfn,
  type SideLetterProvisionInput,
  type SideLetterRecord,
  type SideLetterStatus,
} from "@/lib/crm/finance-api";
import {
  SectionTitle,
  StatusPill,
  errMessage,
  fmtDate,
  money,
  today,
} from "./fundShared";

const COMPLIANCE: ProvisionCompliance[] = [
  "Pending",
  "Applied",
  "Noted",
  "Seated",
  "Delivered",
  "Monitored",
  "Breach",
];
const complianceKind = (c?: string) =>
  c === "Breach" ? "red" : c === "Pending" ? "amber" : c ? "green" : "grey";

const statusKind = (s: SideLetterStatus) =>
  s === "Executed" ? "green" : s === "Under negotiation" ? "amber" : "grey";

interface ProvRow extends SideLetterProvisionInput {
  key: number;
  custom?: boolean;
}
let pk = 1;
const blankProv = (): ProvRow => ({
  key: pk++,
  type: "",
  lpaDefault: "",
  term: "",
  mfn: "N/A",
  notes: "",
});

// Side letters: terms offered to one investor outside the fund's LPA. Each
// provision records what the LPA says, what the side letter says instead,
// whether it opens most-favoured-nation rights for other LPs, and whether
// the GP is honouring it.
export function SideLettersPanel({
  fundId,
  currency,
  commitments,
  invalidate,
}: {
  fundId: string;
  currency: string;
  commitments: CapitalCommitment[];
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["fundSideLetters", fundId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchSideLetters(fundId),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    invalidate();
  };
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errMessage(e), variant: "destructive" });

  const [editor, setEditor] = useState<{
    open: boolean;
    letter: SideLetterRecord | null;
  }>({
    open: false,
    letter: null,
  });

  const exec = useMutation({
    mutationFn: (id: string) => executeSideLetter(fundId, id),
    onSuccess: () => {
      refresh();
      toast({
        title: "Side letter executed",
        description:
          "Fee terms now apply to this LP and MFN offers have opened for other LPs.",
      });
    },
    onError: fail("Could not execute"),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteSideLetter(fundId, id),
    onSuccess: () => {
      refresh();
      toast({ title: "Side letter deleted" });
    },
    onError: fail("Could not delete"),
  });
  const compliance = useMutation({
    mutationFn: (v: { id: string; pid: string; c: ProvisionCompliance }) =>
      setProvisionCompliance(fundId, v.id, v.pid, { compliance: v.c }),
    onSuccess: refresh,
    onError: fail("Could not update compliance"),
  });
  const election = useMutation({
    mutationFn: (v: {
      id: string;
      flag: string;
      lp: string;
      status: "Elected" | "Declined";
    }) => recordMfnElection(fundId, v.id, v.flag, v.lp, v.status),
    onSuccess: () => {
      refresh();
      toast({ title: "Election recorded" });
    },
    onError: fail("Could not record the election"),
  });
  const attach = useMutation({
    mutationFn: (v: { id: string; file: File }) =>
      attachSideLetterDocument(fundId, v.id, v.file),
    onSuccess: () => {
      refresh();
      toast({ title: "Document attached" });
    },
    onError: fail("Could not attach the document"),
  });

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Side letters</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Terms offered to an investor outside the global investment
              agreement (the LPA). Capture every provision here — executing a
              side letter applies its fee rate and opens most-favoured-nation
              elections for other LPs.
            </p>
          </div>
          <Button
            size="sm"
            disabled={!commitments.length}
            onClick={() => setEditor({ open: true, letter: null })}
          >
            <Plus className="mr-2 h-4 w-4" /> New side letter
          </Button>
        </CardHeader>
        {stats && (
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
              {(
                [
                  ["Side letters", stats.total],
                  ["Executed", stats.executed],
                  ["In draft", stats.draft],
                  ["Open MFN elections", stats.mfnOpen],
                  ["Compliance breaches", stats.breaches],
                  ["LPAC members", stats.lpacMembers],
                ] as const
              ).map(([l, v]) => (
                <div key={l} className="rounded-md border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {l}
                  </p>
                  <p
                    className={`text-lg font-semibold ${l === "Compliance breaches" && v > 0 ? "text-red-700" : ""}`}
                  >
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {data && data.letters.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No side letters yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              When you offer an LP terms outside the LPA — a lower fee, a
              co-invest right, an LPAC seat — record them here so every
              obligation is tracked.
            </p>
          </CardContent>
        </Card>
      )}

      {data?.letters.map((l) => (
        <Card key={l._id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    {l.ref} — {l.lpName}
                  </CardTitle>
                  <StatusPill label={l.status} kind={statusKind(l.status)} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.lpType} · commitment {money(l.commitment, currency)} ·
                  effective {fmtDate(l.effectiveDate)}
                  {l.executedAt ? ` · executed ${fmtDate(l.executedAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {l.document && (
                  <a
                    href={l.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted"
                  >
                    <FileText className="h-3.5 w-3.5" /> {l.document.name}
                  </a>
                )}
                <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  {l.document ? "Replace" : "Attach letter"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) attach.mutate({ id: l._id, file: f });
                      e.target.value = "";
                    }}
                  />
                </label>
                {l.status !== "Executed" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditor({ open: true, letter: l })}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      disabled={exec.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            "Execute this side letter? Its fee rate will apply to this LP and MFN offers will open. It cannot be edited afterwards.",
                          )
                        )
                          exec.mutate(l._id);
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark
                      executed
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${l.ref}?`)) del.mutate(l._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provision</TableHead>
                  <TableHead>LPA default</TableHead>
                  <TableHead>Side letter term</TableHead>
                  <TableHead>MFN</TableHead>
                  <TableHead className="w-40">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {l.provisions.map((p, i) => (
                  <TableRow key={p._id ?? i}>
                    <TableCell className="font-medium">
                      {p.type}
                      {p.feePct != null && (
                        <div className="text-xs text-muted-foreground">
                          Sets fee at {p.feePct}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.lpaDefault || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.term}
                      {p.notes && (
                        <div className="text-xs text-muted-foreground">
                          {p.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={p.mfn}
                        kind={p.mfn === "Triggered" ? "amber" : "grey"}
                      />
                    </TableCell>
                    <TableCell>
                      {l.status === "Executed" && p._id ? (
                        <Select
                          value={p.compliance ?? "Pending"}
                          onValueChange={(c) =>
                            compliance.mutate({
                              id: l._id,
                              pid: p._id!,
                              c: c as ProvisionCompliance,
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLIANCE.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusPill label="Tracked once executed" />
                      )}
                      {l.status === "Executed" && p.complianceCheckedAt && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          checked {fmtDate(p.complianceCheckedAt)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {l.mfnFlags.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>MFN elections</SectionTitle>
                {l.mfnFlags.map((f) => (
                  <div key={f._id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">
                      {f.provisionType}: {f.term}
                    </p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Other LPs may elect the same term until{" "}
                      {fmtDate(f.electionDeadline)}.
                    </p>
                    {f.elections.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No other LP has a commitment at least this size, so no
                        one is entitled to elect.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {f.elections.map((e) => (
                          <div
                            key={e.commitmentId}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span>{e.lpName}</span>
                            <span className="flex items-center gap-2">
                              <StatusPill
                                label={e.status}
                                kind={
                                  e.status === "Elected"
                                    ? "green"
                                    : e.status === "Declined"
                                      ? "grey"
                                      : "amber"
                                }
                              />
                              {e.status === "Pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7"
                                    disabled={election.isPending}
                                    onClick={() =>
                                      election.mutate({
                                        id: l._id,
                                        flag: f._id,
                                        lp: e.commitmentId,
                                        status: "Elected",
                                      })
                                    }
                                  >
                                    Elect
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7"
                                    disabled={election.isPending}
                                    onClick={() =>
                                      election.mutate({
                                        id: l._id,
                                        flag: f._id,
                                        lp: e.commitmentId,
                                        status: "Declined",
                                      })
                                    }
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {data && data.lpac.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">LPAC members</CardTitle>
            <p className="text-xs text-muted-foreground">
              Investors with an executed LPAC seat provision. “LPAC only”
              reports go to these LPs.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {data.lpac.map((m) => (
                <li
                  key={m.commitmentId + m.sideLetterRef}
                  className="flex justify-between"
                >
                  <span>{m.lpName}</span>
                  <span className="text-muted-foreground">
                    {money(m.commitment, currency)} · {m.sideLetterRef}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <SideLetterEditor
        open={editor.open}
        letter={editor.letter}
        onOpenChange={(o) => setEditor((e) => ({ ...e, open: o }))}
        fundId={fundId}
        commitments={commitments}
        provisionTypes={data?.provisionTypes ?? []}
        onDone={refresh}
      />
    </div>
  );
}

function SideLetterEditor({
  open,
  letter,
  onOpenChange,
  fundId,
  commitments,
  provisionTypes,
  onDone,
}: {
  open: boolean;
  letter: SideLetterRecord | null;
  onOpenChange: (o: boolean) => void;
  fundId: string;
  commitments: CapitalCommitment[];
  provisionTypes: string[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [commitmentId, setCommitmentId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [status, setStatus] = useState<SideLetterStatus>("Draft");
  const [deadline, setDeadline] = useState("");
  const [rows, setRows] = useState<ProvRow[]>([blankProv()]);

  useEffect(() => {
    if (!open) return;
    if (letter) {
      setCommitmentId(letter.commitmentId);
      setEffectiveDate(letter.effectiveDate.slice(0, 10));
      setStatus(letter.status);
      setDeadline(letter.mfnElectionDeadline?.slice(0, 10) ?? "");
      setRows(
        letter.provisions.map((p) => ({
          key: pk++,
          type: p.type,
          lpaDefault: p.lpaDefault,
          term: p.term,
          mfn: p.mfn,
          notes: p.notes,
          feePct: p.feePct ?? undefined,
        })),
      );
    } else {
      setCommitmentId("");
      setEffectiveDate(today());
      setStatus("Draft");
      setDeadline("");
      setRows([blankProv()]);
    }
  }, [open, letter]);

  const upd = (key: number, patch: Partial<ProvRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const isFee = (t: string) => /management fee/i.test(t);
  const valid =
    !!commitmentId &&
    rows.length > 0 &&
    rows.every(
      (r) =>
        r.type.trim() &&
        r.term.trim() &&
        (!isFee(r.type) || (r.feePct != null && r.feePct >= 0)),
    );

  const save = useMutation({
    mutationFn: () => {
      const provisions = rows.map(({ key: _k, custom: _c, ...p }) => ({
        ...p,
        feePct: isFee(p.type) ? p.feePct : undefined,
      }));
      return letter
        ? updateSideLetter(fundId, letter._id, {
            effectiveDate,
            status,
            mfnElectionDeadline: deadline || undefined,
            provisions,
          })
        : createSideLetter(fundId, {
            commitmentId,
            effectiveDate,
            status,
            mfnElectionDeadline: deadline || undefined,
            provisions,
          });
    },
    onSuccess: () => {
      onDone();
      onOpenChange(false);
      toast({ title: letter ? "Side letter updated" : "Side letter recorded" });
    },
    onError: (e) =>
      toast({
        title: "Could not save the side letter",
        description: errMessage(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {letter ? `Edit ${letter.ref}` : "New side letter"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Investor (LP)</Label>
              <Select
                value={commitmentId}
                onValueChange={setCommitmentId}
                disabled={!!letter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an LP…" />
                </SelectTrigger>
                <SelectContent>
                  {commitments
                    .filter((c) => !c.isGpCommitment)
                    .map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.lpName}
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
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SideLetterStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Under negotiation">
                    Under negotiation
                  </SelectItem>
                  <SelectItem value="Executed">Executed (apply now)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>MFN election deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Defaults to 30 days from execution.
              </p>
            </div>
          </div>

          <SectionTitle>Provisions</SectionTitle>
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.key} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Provision {idx + 1}
                  </span>
                  {rows.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={
                        r.custom || (r.type && !provisionTypes.includes(r.type))
                          ? "Other"
                          : r.type
                      }
                      onValueChange={(v) =>
                        upd(
                          r.key,
                          v === "Other"
                            ? { type: "", custom: true }
                            : { type: v, custom: false },
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {provisionTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(r.custom ||
                      (r.type && !provisionTypes.includes(r.type))) && (
                      <Input
                        className="mt-2"
                        placeholder="Describe the provision type"
                        value={r.type}
                        onChange={(e) => upd(r.key, { type: e.target.value })}
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">MFN</Label>
                    <Select
                      value={r.mfn ?? "N/A"}
                      onValueChange={(v) =>
                        upd(r.key, { mfn: v as SideLetterMfn })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A">Not applicable</SelectItem>
                        <SelectItem value="Triggered">
                          Triggered — other LPs may elect it
                        </SelectItem>
                        <SelectItem value="Excluded">
                          Excluded from MFN
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">LPA default</Label>
                    <Input
                      value={r.lpaDefault ?? ""}
                      onChange={(e) =>
                        upd(r.key, { lpaDefault: e.target.value })
                      }
                      placeholder="What the LPA says"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Side letter term *</Label>
                    <Input
                      value={r.term}
                      onChange={(e) => upd(r.key, { term: e.target.value })}
                      placeholder="What this LP gets instead"
                    />
                  </div>
                </div>
                {isFee(r.type) && (
                  <div className="max-w-xs">
                    <Label className="text-xs">
                      Management fee rate this sets (% p.a.) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.feePct ?? ""}
                      onChange={(e) =>
                        upd(r.key, {
                          feePct:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Applied to this LP's fees and call notices once executed.
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={2}
                    value={r.notes ?? ""}
                    onChange={(e) => upd(r.key, { notes: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRows((rs) => [...rs, blankProv()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add provision
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {letter ? "Save changes" : "Record side letter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
