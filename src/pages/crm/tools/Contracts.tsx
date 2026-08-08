import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { FileSignature, Bell, RefreshCw, ArrowRight, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import {
  pmContracts as seed,
  PmContract,
  CONTRACT_STAGES,
  ContractStage,
  money,
} from "@/data/crmPmMockData";

const daysTo = (d: string) =>
  Math.ceil((new Date(d).getTime() - new Date("2026-07-30").getTime()) / 86400000);

export default function Contracts() {
  const [list, setList] = useState<PmContract[]>(seed);
  const [selected, setSelected] = useState<PmContract | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const { toast } = useToast();

  const patch = (id: string, p: Partial<PmContract>) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, ...p } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const advance = (c: PmContract) => {
    const i = CONTRACT_STAGES.indexOf(c.stage);
    const next = CONTRACT_STAGES[Math.min(i + 1, CONTRACT_STAGES.length - 1)];
    patch(c.id, {
      stage: next,
      ...(next === "Active"
        ? {
            executedOn: new Date().toISOString().slice(0, 10),
            effectiveOn: new Date().toISOString().slice(0, 10),
          }
        : {}),
    });
    toast({ title: `Moved to ${next}`, description: c.title });
  };

  const filtered = list.filter(
    (c) => stageFilter === "all" || c.stage === stageFilter,
  );
  const expiring = list.filter(
    (c) => daysTo(c.expiresOn) > 0 && daysTo(c.expiresOn) <= 90,
  );
  const obligationsDue = list.flatMap((c) =>
    c.obligations
      .filter((o) => !o.done && daysTo(o.due) <= 90)
      .map((o) => ({ ...o, contract: c })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-sm text-muted-foreground">
            Draft → review → negotiation → execution → active → renewal, with
            obligation and expiry tracking
          </p>
        </div>
        <Button onClick={() => toast({ title: "New contract", description: "Start from a precedent template." })}>
          <Plus className="mr-2 h-4 w-4" /> New contract
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total contracts", v: String(list.length) },
          { l: "Active", v: String(list.filter((c) => c.stage === "Active").length) },
          { l: "Expiring ≤ 90 days", v: String(expiring.length) },
          { l: "Obligations due", v: String(obligationsDue.length) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <TabsList className="flex-wrap">
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle board</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="renewals">Renewals &amp; expiry</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-3 pt-4">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {CONTRACT_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.counterparty}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.stage}</TableCell>
                      <TableCell className="text-sm">
                        {c.expiresOn}
                        {daysTo(c.expiresOn) <= 90 && daysTo(c.expiresOn) > 0 && (
                          <Badge className="ml-2 bg-warning/10 text-warning">
                            {daysTo(c.expiresOn)}d
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{c.owner}</TableCell>
                      <TableCell className="text-right text-sm">
                        {money(c.value, c.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            {CONTRACT_STAGES.map((s) => (
              <Card key={s}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s} ({list.filter((c) => c.stage === s).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list
                    .filter((c) => c.stage === s)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className="w-full rounded border p-2 text-left hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{c.counterparty}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.type} · {money(c.value, c.currency)}
                        </p>
                      </button>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="obligations" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obligation</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Reminder</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligationsDue.map((o) => (
                    <TableRow key={`${o.contract.id}-${o.label}`}>
                      <TableCell className="text-sm">{o.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.contract.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{o.due}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Bell className="mr-1 inline h-3 w-3" />
                        {o.leadDays} days before
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            patch(o.contract.id, {
                              obligations: o.contract.obligations.map((x) =>
                                x.label === o.label ? { ...x, done: true } : x,
                              ),
                            });
                            toast({ title: "Obligation completed", description: o.label });
                          }}
                        >
                          Mark done
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="pt-4">
          <div className="space-y-3">
            {expiring.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {c.expiresOn} ·{" "}
                        {c.autoRenew ? "Auto-renew ON" : "Manual renewal"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          patch(c.id, { autoRenew: !c.autoRenew })
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {c.autoRenew ? "Disable auto-renew" : "Enable auto-renew"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          patch(c.id, { stage: "Renewal" });
                          toast({
                            title: "Renewal initiated",
                            description: "Renewal task created for the owner.",
                          });
                        }}
                      >
                        Start renewal
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (daysTo(c.expiresOn) / 90) * 100)}
                  />
                </CardContent>
              </Card>
            ))}
            {!expiring.length && (
              <p className="text-sm text-muted-foreground">
                No contracts expiring within 90 days.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.id} · {selected.counterparty} · {selected.mandateName}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selected.stage}</Badge>
                  <Button size="sm" onClick={() => advance(selected)}>
                    Advance stage <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {selected.stage === "Execution" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        patch(selected.id, {
                          stage: "Active",
                          executedOn: "2026-07-30",
                          effectiveOn: "2026-07-30",
                        });
                        toast({
                          title: "Executed",
                          description:
                            "Signature captured and executed copy stored in the repository.",
                        });
                      }}
                    >
                      <FileSignature className="mr-2 h-4 w-4" /> Capture
                      signature
                    </Button>
                  )}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Negotiation rounds</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.rounds.map((r) => (
                      <div key={r.round} className="rounded border p-2">
                        <p className="font-medium">
                          Round {r.round} — {r.by}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.at} · {r.summary}
                        </p>
                      </div>
                    ))}
                    {!selected.rounds.length && (
                      <p className="text-muted-foreground">No rounds yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Obligations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.obligations.map((o) => (
                      <label key={o.label} className="flex items-center gap-2">
                        <Checkbox
                          checked={o.done}
                          onCheckedChange={(v) =>
                            patch(selected.id, {
                              obligations: selected.obligations.map((x) =>
                                x.label === o.label ? { ...x, done: !!v } : x,
                              ),
                            })
                          }
                        />
                        <span className={o.done ? "line-through opacity-60" : ""}>
                          {o.label}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {o.due}
                        </span>
                      </label>
                    ))}
                    {!selected.obligations.length && (
                      <p className="text-muted-foreground">
                        No obligations recorded.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Amendments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.amendments.map((a) => (
                      <div key={a.ref} className="rounded border p-2">
                        <p className="font-medium">{a.ref}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.at} · {a.summary}
                        </p>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const ref = `AMD-0${selected.amendments.length + 1}`;
                        patch(selected.id, {
                          amendments: [
                            ...selected.amendments,
                            {
                              ref,
                              at: "2026-07-30",
                              summary: "New amendment drafted",
                            },
                          ],
                        });
                      }}
                    >
                      Add amendment
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Executed on</Label>
                    <p>{selected.executedOn ?? "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Effective from</Label>
                    <p>{selected.effectiveOn ?? "—"}</p>
                  </div>
                </div>

                <CommentThread subject={selected.id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
