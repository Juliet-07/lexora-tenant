import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import {
  adrCases as seed,
  AdrCase,
  AdrStage,
  ADR_STAGES,
  money,
  teamDirectory,
} from "@/data/crmPmMockData";

export default function Adr() {
  const [list, setList] = useState<AdrCase[]>(seed);
  const [selected, setSelected] = useState<AdrCase | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [session, setSession] = useState({
    date: "",
    mode: "Physical" as "Physical" | "Virtual",
    venue: "",
    outcome: "",
  });
  const [draft, setDraft] = useState({
    title: "",
    type: "Mediation" as AdrCase["type"],
    partyA: "",
    partyB: "",
    neutral: "Sarah Chen",
    claimValue: 0,
  });
  const { toast } = useToast();

  const patch = (id: string, p: Partial<AdrCase>) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, ...p } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const settled = list.filter((c) => c.settlement).length;

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
          { l: "Active cases", v: list.filter((c) => c.stage !== "Closed").length },
          { l: "Total claim value", v: money(list.reduce((s, c) => s + c.claimValue, 0)) },
          { l: "Settled", v: settled },
          {
            l: "Settlement rate",
            v: `${Math.round((settled / list.length) * 100)}%`,
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
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(c)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {c.id} · filed {c.filedOn}
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
                        {money(c.claimValue)}
                      </TableCell>
                    </TableRow>
                  ))}
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
                        <TableCell className="text-sm">{s.date}</TableCell>
                        <TableCell className="text-sm">{s.case.title}</TableCell>
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
                  <div key={c.id} className="rounded border p-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.settlement
                        ? `Settled at ${money(c.settlement.amount)} on ${c.settlement.date} — ${c.settlement.terms}`
                        : c.outcome ?? "In progress"}
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
                  <div key={t} className="flex justify-between rounded border p-2">
                    <span>{t}</span>
                    <span className="font-medium">{n}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
                  onChange={(e) => setDraft({ ...draft, partyA: e.target.value })}
                />
              </div>
              <div>
                <Label>Party B</Label>
                <Input
                  value={draft.partyB}
                  onChange={(e) => setDraft({ ...draft, partyB: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) =>
                    setDraft({ ...draft, type: v as AdrCase["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mediation", "Arbitration", "Conciliation", "Expert determination"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Neutral</Label>
                <Select
                  value={draft.neutral}
                  onValueChange={(v) => setDraft({ ...draft, neutral: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamDirectory
                      .filter((t) => t.mandates > 0)
                      .map((t) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
              onClick={() => {
                if (!draft.title) return;
                setList([
                  {
                    id: `ADR-${String(list.length + 1).padStart(3, "0")}`,
                    title: draft.title,
                    type: draft.type,
                    parties: [draft.partyA, draft.partyB].filter(Boolean),
                    neutral: draft.neutral,
                    stage: "Intake",
                    claimValue: Number(draft.claimValue) || 0,
                    filedOn: new Date().toISOString().slice(0, 10),
                    sessions: [],
                  },
                  ...list,
                ]);
                setOpenNew(false);
                toast({ title: "Case filed", description: "Stage: Intake" });
              }}
            >
              File case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.id} · {selected.type} · neutral {selected.neutral}
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
                      patch(selected.id, { stage: v as AdrStage })
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
                      patch(selected.id, {
                        stage: "Settlement",
                        settlement: {
                          amount: Math.round(selected.claimValue * 0.55),
                          date: new Date().toISOString().slice(0, 10),
                          terms: "Payment within 60 days",
                        },
                      });
                      toast({ title: "Settlement recorded" });
                    }}
                  >
                    <Handshake className="mr-2 h-4 w-4" /> Record settlement
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      patch(selected.id, {
                        stage: "Award / Outcome",
                        outcome: "Award issued — see case file",
                      });
                      toast({ title: "Outcome recorded" });
                    }}
                  >
                    <Gavel className="mr-2 h-4 w-4" /> Record award
                  </Button>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.sessions.map((s, i) => (
                      <div key={i} className="rounded border p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{s.date}</span>
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
                          setSession({ ...session, mode: v as "Physical" | "Virtual" })
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
                      disabled={!session.date}
                      onClick={() => {
                        patch(selected.id, {
                          sessions: [...selected.sessions, session],
                          stage: "Sessions",
                        });
                        setSession({ date: "", mode: "Physical", venue: "", outcome: "" });
                        toast({
                          title: "Session scheduled",
                          description: "Added to the shared calendar (ADR layer).",
                        });
                      }}
                    >
                      Add session
                    </Button>
                  </CardContent>
                </Card>

                <CommentThread subject={selected.id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
