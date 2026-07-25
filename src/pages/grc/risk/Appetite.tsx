import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/hooks/use-toast";
import {
  fetchAppetiteCurrent,
  saveAppetiteVersion,
  fetchAppetiteHistory,
  fetchRisks,
  zoneTone,
  RISK_CATEGORIES,
  type AppetiteEntry,
  type RiskCategory,
} from "@/lib/grc/risk-api";

const POSTURES = ["Averse", "Cautious", "Open", "Hungry"] as const;

export default function GrcAppetite() {
  const queryClient = useQueryClient();
  const { data: current = [], isLoading } = useQuery({
    queryKey: ["grc-appetite-current"],
    queryFn: fetchAppetiteCurrent,
  });
  const { data: history = [] } = useQuery({
    queryKey: ["grc-appetite-history"],
    queryFn: fetchAppetiteHistory,
  });
  const { data: risks = [] } = useQuery({
    queryKey: ["grc-risks"],
    queryFn: fetchRisks,
  });

  const [draft, setDraft] = useState<AppetiteEntry[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (current.length > 0) setDraft(current);
  }, [current]);

  const update = (cat: RiskCategory, patch: Partial<AppetiteEntry>) => {
    setDraft((d) =>
      d.map((e) => (e.category === cat ? { ...e, ...patch } : e)),
    );
  };

  const saveMut = useMutation({
    mutationFn: () => saveAppetiteVersion(note, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-appetite-current"] });
      queryClient.invalidateQueries({ queryKey: ["grc-appetite-history"] });
      queryClient.invalidateQueries({ queryKey: ["grc-risks"] }); // zones depend on appetite
      setNote("");
      toast({
        title: "Appetite saved",
        description: "New version added to history.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const save = () => {
    if (!note.trim()) {
      toast({
        title: "Add a change note",
        description: "Describe why this version changes.",
        variant: "destructive",
      });
      return;
    }
    saveMut.mutate();
  };

  if (isLoading || draft.length === 0) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading risk appetite…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Appetite & Governance</h1>
        <p className="text-sm text-muted-foreground">
          Board-approved posture and thresholds. Everything else is measured
          against this.
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="actual">Appetite vs. actual</TabsTrigger>
          <TabsTrigger value="history">Version history</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Per-category posture and thresholds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {draft.map((e) => (
                  <div
                    key={e.category}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.category}</div>
                      <Select
                        value={e.posture}
                        onValueChange={(v) =>
                          update(e.category, { posture: v as any })
                        }
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POSTURES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      rows={2}
                      value={e.qualitative}
                      onChange={(ev) =>
                        update(e.category, { qualitative: ev.target.value })
                      }
                      placeholder="Qualitative posture statement"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Max loss per event</Label>
                        <Input
                          type="number"
                          value={e.maxLossPerEvent}
                          onChange={(ev) =>
                            update(e.category, {
                              maxLossPerEvent: Number(ev.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          Max aggregate exposure
                        </Label>
                        <Input
                          type="number"
                          value={e.maxAggregateExposure}
                          onChange={(ev) =>
                            update(e.category, {
                              maxAggregateExposure: Number(ev.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          Amber threshold (% of max)
                        </Label>
                        <Input
                          type="number"
                          value={e.amberThresholdPct}
                          onChange={(ev) =>
                            update(e.category, {
                              amberThresholdPct: Number(ev.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end">
                <div className="flex-1">
                  <Label>Change note (required)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Annual review — tightened IT security threshold"
                  />
                </div>
                <Button onClick={save} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save new version"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where risks sit today</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Posture</TableHead>
                    <TableHead className="text-right">Green</TableHead>
                    <TableHead className="text-right">Amber</TableHead>
                    <TableHead className="text-right">Red</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RISK_CATEGORIES.map((c) => {
                    const rs = risks.filter(
                      (r) => r.category === c && r.status !== "Closed",
                    );
                    const green = rs.filter((r) => r.zone === "Green").length;
                    const amber = rs.filter((r) => r.zone === "Amber").length;
                    const red = rs.filter((r) => r.zone === "Red").length;
                    const p =
                      current.find((a) => a.category === c)?.posture ?? "—";
                    return (
                      <TableRow key={c}>
                        <TableCell className="font-medium">{c}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={zoneTone("Green")}
                          >
                            {green}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={zoneTone("Amber")}
                          >
                            {amber}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={zoneTone("Red")}>
                            {red}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version date</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Categories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell>
                        {new Date(v.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{v.note}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.entries.length} categories
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
