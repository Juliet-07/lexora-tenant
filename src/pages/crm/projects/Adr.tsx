import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ArrowRight, Gavel, Handshake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import { fetchEmployees } from "@/lib/hr/hr-api";
import {
  fetchAdrCases,
  createAdrCase,
  setAdrStage,
  addAdrSession,
  recordAdrSettlement,
  recordAdrOutcome,
  ADR_STAGES,
  ADR_TYPES,
  type AdrCase,
  type AdrStage,
  type SessionMode,
} from "@/lib/crm/adr-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export default function Adr() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["adrCases"],
    queryFn: fetchAdrCases,
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const employees = employeesPage?.items ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = list.find((c) => c._id === selectedId) ?? null;
  const [openNew, setOpenNew] = useState(false);
  const [session, setSession] = useState({
    date: "",
    mode: "Physical" as SessionMode,
    venue: "",
    outcome: "",
  });
  const [draft, setDraft] = useState({
    title: "",
    type: ADR_TYPES[0],
    partyA: "",
    partyB: "",
    neutralUserId: "",
    neutral: "",
    claimValue: 0,
  });
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState({
    amount: 0,
    terms: "",
  });
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["adrCases"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const settled = list.filter((c) => c.settlement).length;

  const createMut = useMutation({
    mutationFn: () =>
      createAdrCase({
        title: draft.title,
        type: draft.type,
        parties: [draft.partyA, draft.partyB].filter(Boolean),
        neutralUserId: draft.neutralUserId || undefined,
        neutral: draft.neutral,
        claimValue: Number(draft.claimValue) || 0,
      }),
    onSuccess: (c) => {
      invalidate();
      setOpenNew(false);
      toast({ title: "Case filed", description: `${c.ref} · Stage: Intake` });
    },
    onError: onErr("Failed to file case"),
  });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: AdrStage }) =>
      setAdrStage(id, stage),
    onSuccess: invalidate,
    onError: onErr("Failed to update stage"),
  });

  const sessionMut = useMutation({
    mutationFn: () => addAdrSession(selected!._id, session),
    onSuccess: () => {
      invalidate();
      setSession({ date: "", mode: "Physical", venue: "", outcome: "" });
      toast({
        title: "Session scheduled",
        description: "Added to the case file.",
      });
    },
    onError: onErr("Failed to add session"),
  });

  const settlementMut = useMutation({
    mutationFn: () =>
      recordAdrSettlement(
        selected!._id,
        Number(settlementDraft.amount),
        settlementDraft.terms,
      ),
    onSuccess: () => {
      invalidate();
      setSettlementOpen(false);
      setSettlementDraft({ amount: 0, terms: "" });
      toast({ title: "Settlement recorded" });
    },
    onError: onErr("Failed to record settlement"),
  });

  const outcomeMut = useMutation({
    mutationFn: () => recordAdrOutcome(selected!._id, outcomeDraft),
    onSuccess: () => {
      invalidate();
      setOutcomeOpen(false);
      setOutcomeDraft("");
      toast({ title: "Outcome recorded" });
    },
    onError: onErr("Failed to record outcome"),
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading cases…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ADR Case Management</h1>
          <p className="text-sm text-muted-foreground">
            Mediation, arbitration and expert determination — own case lifecycle
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New case
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            l: "Active cases",
            v: list.filter((c) => c.stage !== "Closed").length,
          },
          {
            l: "Total claim value",
            v: money(list.reduce((s, c) => s + c.claimValue, 0)),
          },
          { l: "Settled", v: settled },
          {
            l: "Settlement rate",
            v: list.length
              ? `${Math.round((settled / list.length) * 100)}%`
              : "—",
          },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases">Case register</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Outcomes &amp; analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Parties</TableHead>
                    <TableHead>Neutral</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Claim value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((c) => (
                    <TableRow
                      key={c._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(c._id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {c.ref} · filed {c.filedOn?.slice(0, 10)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{c.type}</TableCell>
                      <TableCell className="text-xs">
                        {c.parties.join(" v. ")}
                      </TableCell>
                      <TableCell className="text-sm">{c.neutral}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {money(c.claimValue, c.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!list.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No cases filed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list
                    .flatMap((c) => c.sessions.map((s) => ({ ...s, case: c })))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {s.date?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.case.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.mode}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{s.venue}</TableCell>
                        <TableCell className="text-sm">{s.outcome}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Outcomes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {list.map((c) => (
                  <div key={c._id} className="rounded border p-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.settlement
                        ? `Settled at ${money(c.settlement.amount, c.currency)} on ${c.settlement.date?.slice(0, 10)} — ${c.settlement.terms}`
                        : (c.outcome ?? "In progress")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Case mix</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(
                  list.reduce<Record<string, number>>((a, c) => {
                    a[c.type] = (a[c.type] ?? 0) + 1;
                    return a;
                  }, {}),
                ).map(([t, n]) => (
                  <div
                    key={t}
                    className="flex justify-between rounded border p-2"
                  >
                    <span>{t}</span>
                    <span className="font-medium">{n}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New case */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New ADR case</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Case title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Party A</Label>
                <Input
                  value={draft.partyA}
                  onChange={(e) =>
                    setDraft({ ...draft, partyA: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Party B</Label>
                <Input
                  value={draft.partyB}
                  onChange={(e) =>
                    setDraft({ ...draft, partyB: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Neutral</Label>
                {employees.length > 0 ? (
                  <Select
                    value={draft.neutralUserId}
                    onValueChange={(v) => {
                      const e = employees.find((x: any) => x._id === v);
                      setDraft({
                        ...draft,
                        neutralUserId: v,
                        neutral: e ? `${e.firstName} ${e.lastName}` : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select neutral..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.firstName} {e.lastName}
                          {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Neutral's name"
                    value={draft.neutral}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        neutral: e.target.value,
                        neutralUserId: "",
                      })
                    }
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Claim value (USD)</Label>
              <Input
                type="number"
                value={draft.claimValue}
                onChange={(e) =>
                  setDraft({ ...draft, claimValue: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={createMut.isPending || !draft.title || !draft.neutral}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Filing…" : "File case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.type} · neutral {selected.neutral}
                </p>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ADR_STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <Badge
                      variant={
                        i <= ADR_STAGES.indexOf(selected.stage)
                          ? "default"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {s}
                    </Badge>
                    {i < ADR_STAGES.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selected.stage}
                    onValueChange={(v) =>
                      stageMut.mutate({
                        id: selected._id,
                        stage: v as AdrStage,
                      })
                    }
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADR_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSettlementDraft({ amount: 0, terms: "" });
                      setSettlementOpen(true);
                    }}
                  >
                    <Handshake className="mr-2 h-4 w-4" /> Record settlement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOutcomeDraft("");
                      setOutcomeOpen(true);
                    }}
                  >
                    <Gavel className="mr-2 h-4 w-4" /> Record award
                  </Button>
                </div>

                {selected.settlement && (
                  <p className="rounded border border-success/30 bg-success/5 p-3 text-sm">
                    Settled at{" "}
                    {money(selected.settlement.amount, selected.currency)} on{" "}
                    {selected.settlement.date?.slice(0, 10)} —{" "}
                    {selected.settlement.terms}
                  </p>
                )}
                {selected.outcome && (
                  <p className="rounded border p-3 text-sm">
                    {selected.outcome}
                  </p>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.sessions.map((s, i) => (
                      <div key={i} className="rounded border p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {s.date?.slice(0, 10)}
                          </span>
                          <Badge variant="outline">{s.mode}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.venue} · {s.outcome}
                        </p>
                      </div>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={session.date}
                        onChange={(e) =>
                          setSession({ ...session, date: e.target.value })
                        }
                      />
                      <Select
                        value={session.mode}
                        onValueChange={(v) =>
                          setSession({ ...session, mode: v as SessionMode })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Physical">Physical</SelectItem>
                          <SelectItem value="Virtual">Virtual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Venue / link"
                        value={session.venue}
                        onChange={(e) =>
                          setSession({ ...session, venue: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Outcome"
                        value={session.outcome}
                        onChange={(e) =>
                          setSession({ ...session, outcome: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={!session.date || sessionMut.isPending}
                      onClick={() => sessionMut.mutate()}
                    >
                      Add session
                    </Button>
                  </CardContent>
                </Card>

                <CommentThread subject={selected._id} subjectType="ADR case" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Settlement dialog */}
      <Dialog open={settlementOpen} onOpenChange={setSettlementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record settlement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Amount ({selected?.currency ?? "USD"})</Label>
              <Input
                type="number"
                value={settlementDraft.amount}
                onChange={(e) =>
                  setSettlementDraft({
                    ...settlementDraft,
                    amount: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea
                value={settlementDraft.terms}
                onChange={(e) =>
                  setSettlementDraft({
                    ...settlementDraft,
                    terms: e.target.value,
                  })
                }
                placeholder="e.g. Payment within 60 days"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!settlementDraft.amount || settlementMut.isPending}
              onClick={() => settlementMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome dialog */}
      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record award / outcome</DialogTitle>
          </DialogHeader>
          <Textarea
            value={outcomeDraft}
            onChange={(e) => setOutcomeDraft(e.target.value)}
            placeholder="e.g. Award issued in favour of claimant — USD 780,000"
          />
          <DialogFooter>
            <Button
              disabled={!outcomeDraft.trim() || outcomeMut.isPending}
              onClick={() => outcomeMut.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
