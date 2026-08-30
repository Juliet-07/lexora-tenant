import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowTable } from "@/components/finance/WorkflowTable";
import { Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAssets,
  createAsset,
  disposeAsset,
  generateDepreciationJournal,
  fetchMaintenanceLog,
  createMaintenanceLog,
  type AssetKind,
  type AssetRecord,
} from "@/lib/crm/finance-api";

const money = (n: number, c = "USD") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

const currentPeriod = () => new Date().toISOString().slice(0, 7);

const assetWorkflow = [
  {
    action: "Tag asset",
    detail: "A real tag (FA-### or MA-###) is generated at registration",
    owner: "Office manager",
    trigger: "Asset delivered / capitalised",
  },
  {
    action: "Assign & verify",
    detail:
      "Movable assets assigned to a holder; condition confirmed at handover",
    owner: "Office manager",
    trigger: "Issue to employee",
  },
  {
    action: "Run depreciation",
    detail:
      "Real straight-line NBV computed live; a real journal is generated and posted monthly",
    owner: "Finance",
    trigger: "Month-end close",
  },
  {
    action: "Renew insurance",
    detail: "Policy renewed and certificate filed against the asset",
    owner: "Finance",
    trigger: "30 days before renewal",
  },
  {
    action: "Log maintenance",
    detail: "Service, repair and cost recorded on the asset history",
    owner: "Office manager",
    trigger: "Service completed",
  },
  {
    action: "Dispose",
    detail:
      "Disposal value posted, real gain/loss computed against NBV at disposal, asset retired",
    owner: "Partner approval",
    trigger: "End of useful life or sale",
  },
];

export default function AssetRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
  });
  const { data: maintenanceLog = [] } = useQuery({
    queryKey: ["maintenanceLog"],
    queryFn: fetchMaintenanceLog,
  });

  const fixed = assets.filter((a) => a.kind === "Fixed");
  const movable = assets.filter((a) => a.kind === "Movable");
  const cost = assets.reduce((s, a) => s + a.cost, 0);
  const nbv = assets.reduce((s, a) => s + a.nbv, 0);

  // ── New asset ──────────────────────────────────────────────
  const [newAssetOpen, setNewAssetOpen] = useState(false);
  const [assetDraft, setAssetDraft] = useState({
    name: "",
    category: "",
    kind: "Fixed" as AssetKind,
    cost: 0,
    acquiredOn: "",
    usefulLifeYears: 5,
    assignedTo: "",
    condition: "",
    insurer: "",
    renewalDate: "",
  });
  const createAssetMut = useMutation({
    mutationFn: () =>
      createAsset({
        ...assetDraft,
        assignedTo: assetDraft.assignedTo || undefined,
        condition: assetDraft.condition || undefined,
        insurer: assetDraft.insurer || undefined,
        renewalDate: assetDraft.renewalDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setNewAssetOpen(false);
      setAssetDraft({
        name: "",
        category: "",
        kind: "Fixed",
        cost: 0,
        acquiredOn: "",
        usefulLifeYears: 5,
        assignedTo: "",
        condition: "",
        insurer: "",
        renewalDate: "",
      });
      toast({ title: "Asset registered" });
    },
    onError: onErr("Failed to register asset"),
  });

  // ── Dispose ────────────────────────────────────────────────
  const [disposeTarget, setDisposeTarget] = useState<AssetRecord | null>(null);
  const [disposalValue, setDisposalValue] = useState(0);
  const disposeMut = useMutation({
    mutationFn: () => disposeAsset(disposeTarget!._id, disposalValue),
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDisposeTarget(null);
      setDisposalValue(0);
      toast({
        title: "Disposed",
        description: `Gain/loss: ${money(a.disposalGainLoss ?? 0)}`,
      });
    },
    onError: onErr("Failed to dispose"),
  });

  // ── Depreciation ───────────────────────────────────────────
  const generateDeprecMut = useMutation({
    mutationFn: () => generateDepreciationJournal(currentPeriod(), "You"),
    onSuccess: (j) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast({
        title: "Depreciation journal generated",
        description: `${j.ref} — review and post it in Accounting.`,
      });
    },
    onError: onErr("Failed to generate depreciation"),
  });

  // ── Maintenance ────────────────────────────────────────────
  const [newMaintenanceOpen, setNewMaintenanceOpen] = useState(false);
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    assetId: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    vendor: "",
    cost: 0,
  });
  const createMaintenanceMut = useMutation({
    mutationFn: () => createMaintenanceLog(maintenanceDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceLog"] });
      setNewMaintenanceOpen(false);
      setMaintenanceDraft({
        assetId: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        vendor: "",
        cost: 0,
      });
      toast({ title: "Maintenance logged" });
    },
    onError: onErr("Failed to log maintenance"),
  });

  const table = (rows: AssetRecord[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Acquired</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead>Useful life</TableHead>
            <TableHead className="text-right">NBV</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a._id}>
              <TableCell className="text-sm font-medium">{a.tag}</TableCell>
              <TableCell className="text-sm">{a.name}</TableCell>
              <TableCell className="text-sm">{a.category}</TableCell>
              <TableCell className="text-sm">
                {a.acquiredOn?.slice(0, 10)}
              </TableCell>
              <TableCell className="text-sm text-right">
                {money(a.cost)}
              </TableCell>
              <TableCell className="text-sm">{a.usefulLifeYears} yrs</TableCell>
              <TableCell className="text-sm text-right font-semibold">
                {money(a.nbv)}
              </TableCell>
              <TableCell className="text-sm">{a.assignedTo ?? "—"}</TableCell>
              <TableCell className="text-sm">{a.condition ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {a.status !== "Disposed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDisposeTarget(a);
                      setDisposalValue(0);
                    }}
                  >
                    Dispose
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell
                colSpan={11}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No assets in this category yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Asset Register</h1>
          <p className="text-sm text-muted-foreground">
            Fixed and movable assets, tagging, depreciation, disposals,
            insurance and maintenance
          </p>
        </div>
        <Button size="sm" onClick={() => setNewAssetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Register asset
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          ["Assets tracked", `${assets.length}`],
          ["Total cost", money(cost)],
          ["Net book value", money(nbv)],
          ["Accumulated depreciation", money(cost - nbv)],
        ].map(([l, v]) => (
          <Card key={l}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="fixed">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="fixed">Fixed assets</TabsTrigger>
          <TabsTrigger value="movable">Movable assets</TabsTrigger>
          <TabsTrigger value="depreciation">
            Depreciation & disposals
          </TabsTrigger>
          <TabsTrigger value="insurance">Insurance & maintenance</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="mt-4">
          <Card>
            <CardContent className="p-4">{table(fixed)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movable" className="mt-4">
          <Card>
            <CardContent className="p-4">{table(movable)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={generateDeprecMut.isPending}
              onClick={() => generateDeprecMut.mutate()}
            >
              <FileText className="mr-2 h-4 w-4" /> Generate {currentPeriod()}{" "}
              depreciation journal
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Straight-line depreciation schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Annual charge</TableHead>
                    <TableHead className="text-right">Monthly charge</TableHead>
                    <TableHead className="text-right">NBV</TableHead>
                    <TableHead>Last depreciated</TableHead>
                    <TableHead>Disposal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell className="text-sm font-medium">
                        {a.tag}
                      </TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm text-right">
                        {money(a.cost)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {money(a.annualDepreciation)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {money(a.monthlyDepreciation)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold">
                        {money(a.nbv)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.lastDepreciationPeriod ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.status === "Disposed"
                          ? `Disposed — gain/loss ${money(a.disposalGainLoss ?? 0)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!assets.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No assets yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="insurance"
          className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insurance coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assets
                .filter((a) => a.insurer)
                .map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between border-b pb-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.insurer}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Renews {a.renewalDate?.slice(0, 10) ?? "—"}
                    </span>
                  </div>
                ))}
              {!assets.some((a) => a.insurer) && (
                <p className="text-sm text-muted-foreground">
                  No insured assets yet.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Maintenance log</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewMaintenanceOpen(true)}
              >
                Log entry
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {maintenanceLog.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between border-b pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{m.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.assetTag} · {m.vendor || "—"} · {m.date?.slice(0, 10)}
                    </p>
                  </div>
                  <span className="font-medium">{money(m.cost)}</span>
                </div>
              ))}
              {!maintenanceLog.length && (
                <p className="text-sm text-muted-foreground">
                  No maintenance logged yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          <WorkflowTable
            title="How the asset register is used"
            steps={assetWorkflow}
          />
        </TabsContent>
      </Tabs>

      {/* New asset */}
      <Dialog open={newAssetOpen} onOpenChange={setNewAssetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register asset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={assetDraft.name}
                onChange={(e) =>
                  setAssetDraft({ ...assetDraft, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  value={assetDraft.category}
                  onChange={(e) =>
                    setAssetDraft({ ...assetDraft, category: e.target.value })
                  }
                  placeholder="e.g. IT equipment"
                />
              </div>
              <div>
                <Label>Kind</Label>
                <Select
                  value={assetDraft.kind}
                  onValueChange={(v) =>
                    setAssetDraft({ ...assetDraft, kind: v as AssetKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="Movable">Movable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost</Label>
                <Input
                  type="number"
                  value={assetDraft.cost}
                  onChange={(e) =>
                    setAssetDraft({
                      ...assetDraft,
                      cost: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Useful life (years)</Label>
                <Input
                  type="number"
                  value={assetDraft.usefulLifeYears}
                  onChange={(e) =>
                    setAssetDraft({
                      ...assetDraft,
                      usefulLifeYears: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Acquired on</Label>
              <Input
                type="date"
                value={assetDraft.acquiredOn}
                onChange={(e) =>
                  setAssetDraft({ ...assetDraft, acquiredOn: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned to (optional)</Label>
                <Input
                  value={assetDraft.assignedTo}
                  onChange={(e) =>
                    setAssetDraft({ ...assetDraft, assignedTo: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Condition (optional)</Label>
                <Input
                  value={assetDraft.condition}
                  onChange={(e) =>
                    setAssetDraft({ ...assetDraft, condition: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Insurer (optional)</Label>
                <Input
                  value={assetDraft.insurer}
                  onChange={(e) =>
                    setAssetDraft({ ...assetDraft, insurer: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Renewal date (optional)</Label>
                <Input
                  type="date"
                  value={assetDraft.renewalDate}
                  onChange={(e) =>
                    setAssetDraft({
                      ...assetDraft,
                      renewalDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !assetDraft.name ||
                !assetDraft.category ||
                !assetDraft.acquiredOn ||
                createAssetMut.isPending
              }
              onClick={() => createAssetMut.mutate()}
            >
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispose */}
      <Dialog
        open={!!disposeTarget}
        onOpenChange={(o) => !o && setDisposeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose {disposeTarget?.tag}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Current NBV: {disposeTarget ? money(disposeTarget.nbv) : "—"}
            </p>
            <div>
              <Label>Disposal value</Label>
              <Input
                type="number"
                value={disposalValue}
                onChange={(e) => setDisposalValue(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={disposeMut.isPending}
              onClick={() => disposeMut.mutate()}
            >
              Confirm disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New maintenance */}
      <Dialog open={newMaintenanceOpen} onOpenChange={setNewMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log maintenance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Asset</Label>
              <Select
                value={maintenanceDraft.assetId}
                onValueChange={(v) =>
                  setMaintenanceDraft({ ...maintenanceDraft, assetId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.tag} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={maintenanceDraft.description}
                onChange={(e) =>
                  setMaintenanceDraft({
                    ...maintenanceDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={maintenanceDraft.date}
                  onChange={(e) =>
                    setMaintenanceDraft({
                      ...maintenanceDraft,
                      date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Cost</Label>
                <Input
                  type="number"
                  value={maintenanceDraft.cost}
                  onChange={(e) =>
                    setMaintenanceDraft({
                      ...maintenanceDraft,
                      cost: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Vendor (optional)</Label>
              <Input
                value={maintenanceDraft.vendor}
                onChange={(e) =>
                  setMaintenanceDraft({
                    ...maintenanceDraft,
                    vendor: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                !maintenanceDraft.assetId ||
                !maintenanceDraft.description ||
                createMaintenanceMut.isPending
              }
              onClick={() => createMaintenanceMut.mutate()}
            >
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
