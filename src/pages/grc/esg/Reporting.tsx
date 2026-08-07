import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
  FileBarChart,
  Download,
  Paperclip,
  CheckCircle2,
  Plus,
  Send,
  BookMarked,
  Settings2,
  Pencil,
  Trash2,
  EyeOff,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchFrameworks,
  fetchFrameworkCoverage,
  createFramework,
  updateFramework,
  setFrameworkActive,
  deleteFramework,
  fetchIndicators,
  addIndicator,
  updateIndicatorResponse,
  addIndicatorEvidence,
  submitIndicatorForSignOff,
  signOffIndicator,
  fetchReports,
  compileReport,
  publishReport,
  fetchDashboard,
  EsgFramework,
  ReportIndicator,
  EsgReport,
  indicatorTone,
} from "@/lib/grc/esg-api";
import {
  exportReportExcel,
  exportReportPdf,
  ReportDefinition,
} from "@/lib/grc/reportExport";

export default function EsgReporting() {
  const queryClient = useQueryClient();
  const { data: frameworks = [] } = useQuery({
    queryKey: ["esgFrameworks"],
    queryFn: fetchFrameworks,
  });
  const { data: coverage = {} } = useQuery({
    queryKey: ["esgFrameworkCoverage"],
    queryFn: fetchFrameworkCoverage,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["esgReports"],
    queryFn: fetchReports,
  });

  const activeFrameworks = frameworks.filter((f) => f.isActive);
  const [tab, setTab] = useState<string>("");
  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<ReportIndicator | null>(null);

  useEffect(() => {
    if (!tab && activeFrameworks.length) setTab(activeFrameworks[0]._id);
    if (
      tab &&
      !activeFrameworks.some((f) => f._id === tab) &&
      activeFrameworks.length
    ) {
      setTab(activeFrameworks[0]._id);
    }
  }, [activeFrameworks, tab]);

  const invalidateFrameworks = () => {
    queryClient.invalidateQueries({ queryKey: ["esgFrameworks"] });
    queryClient.invalidateQueries({ queryKey: ["esgFrameworkCoverage"] });
  };

  const { data: indicators = [] } = useQuery({
    queryKey: ["esgIndicators", tab],
    queryFn: () => fetchIndicators(tab),
    enabled: !!tab,
  });

  const indicatorMut = useMutation({
    mutationFn: (dto: { code: string; title: string; owner?: string }) =>
      addIndicator(tab, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esgIndicators", tab] });
      invalidateFrameworks();
      toast({ title: "Indicator added" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add indicator",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const responseMut = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      updateIndicatorResponse(id, response),
    onSuccess: (i) => {
      queryClient.invalidateQueries({ queryKey: ["esgIndicators", tab] });
      invalidateFrameworks();
      setSelected(i);
    },
  });
  const evidenceMut = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      addIndicatorEvidence(id, files),
    onSuccess: (i) => {
      queryClient.invalidateQueries({ queryKey: ["esgIndicators", tab] });
      setSelected(i);
      toast({ title: "Evidence attached" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to attach evidence",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const submitMut = useMutation({
    mutationFn: (id: string) => submitIndicatorForSignOff(id),
    onSuccess: (i) => {
      queryClient.invalidateQueries({ queryKey: ["esgIndicators", tab] });
      invalidateFrameworks();
      setSelected(i);
      toast({ title: "Submitted for sign-off" });
    },
    onError: (err: any) =>
      toast({
        title: err?.response?.data?.message ?? "Add a response first",
        variant: "destructive",
      }),
  });
  const signOffMut = useMutation({
    mutationFn: (id: string) => signOffIndicator(id),
    onSuccess: (i) => {
      queryClient.invalidateQueries({ queryKey: ["esgIndicators", tab] });
      invalidateFrameworks();
      setSelected(i);
      toast({ title: "Indicator signed off" });
    },
  });
  const compileMut = useMutation({
    mutationFn: (frameworkId: string) => compileReport(frameworkId),
    onSuccess: ({ pendingCount }) => {
      queryClient.invalidateQueries({ queryKey: ["esgReports"] });
      if (pendingCount) {
        toast({
          title: `${pendingCount} indicator${pendingCount !== 1 ? "s" : ""} not signed off`,
          description:
            "Compilation continues, but unsigned disclosures are flagged in the report.",
        });
      } else {
        toast({ title: "Report compiled" });
      }
    },
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => publishReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["esgReports"] });
      toast({
        title: "Report published",
        description: "Available for board pack and investor distribution.",
      });
    },
  });

  const currentFramework = frameworks.find((f) => f._id === tab);

  const contentIndex = (
    framework: EsgFramework,
    ind: ReportIndicator[],
  ): ReportDefinition => ({
    id: `esg-${framework.key}`,
    title: `${framework.label} Content Index`,
    subtitle: `ESG disclosure preparation · period ${new Date().getFullYear()}`,
    summary: [
      { label: "Framework", value: framework.label },
      { label: "Indicators", value: ind.length },
      { label: "Signed off", value: coverage[framework._id]?.signedOff ?? 0 },
      { label: "Coverage", value: `${coverage[framework._id]?.pct ?? 0}%` },
    ],
    sections: [
      {
        heading: `${framework.label} disclosures`,
        columns: [
          "Code",
          "Disclosure",
          "Owner",
          "Response",
          "Evidence",
          "Status",
          "Signed off by",
        ],
        rows: ind.map((i) => [
          i.code,
          i.title,
          i.owner,
          i.response || "—",
          i.evidence.map((e) => e.name).join("; ") || "None",
          i.status,
          i.signedOffBy ?? "—",
        ]),
      },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            ESG Reporting
          </h1>
          <p className="text-sm text-muted-foreground">
            Disclosure preparation with evidence and sign-off, against
            frameworks you control.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Manage frameworks
          </Button>
          <CustomReportDialog frameworks={activeFrameworks} />
        </div>
      </div>

      {!activeFrameworks.length ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No active frameworks. Use{" "}
            <span className="font-medium text-foreground">
              Manage frameworks
            </span>{" "}
            to reactivate a standard one or add your own.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {activeFrameworks.map((f) => {
              const c = coverage[f._id] ?? { signedOff: 0, total: 0, pct: 0 };
              return (
                <Card
                  key={f._id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setTab(f._id)}
                >
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground truncate">
                      {f.label}
                    </div>
                    <div className="text-2xl font-bold">{c.pct}%</div>
                    <div className="text-xs text-muted-foreground">
                      {c.signedOff}/{c.total} signed off
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              {activeFrameworks.map((f) => (
                <TabsTrigger key={f._id} value={f._id}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeFrameworks.map((f) => (
              <TabsContent key={f._id} value={f._id} className="mt-4">
                {tab === f._id && (
                  <FrameworkTab
                    framework={f}
                    indicators={indicators}
                    onAddIndicator={(dto, onDone) =>
                      indicatorMut.mutate(dto, { onSuccess: onDone })
                    }
                    addPending={indicatorMut.isPending}
                    onSelect={setSelected}
                    onExportPdf={() =>
                      exportReportPdf(contentIndex(f, indicators))
                    }
                    onExportExcel={() =>
                      exportReportExcel(contentIndex(f, indicators))
                    }
                    onCompile={() => compileMut.mutate(f._id)}
                    compilePending={compileMut.isPending}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Compiled &amp; published reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const fw = frameworks.find((f) => f._id === r.frameworkId);
                return (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.note}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fw?.label ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.period}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "Published"
                            ? "text-emerald-600 border-emerald-500/30"
                            : ""
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {r.status !== "Published" && (
                          <Button
                            size="sm"
                            disabled={publishMut.isPending}
                            onClick={() => publishMut.mutate(r._id)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!reports.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground py-8"
                  >
                    No reports compiled yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IndicatorSheet
        indicator={selected}
        framework={currentFramework}
        onClose={() => setSelected(null)}
        onSaveResponse={(response) =>
          selected && responseMut.mutate({ id: selected._id, response })
        }
        onAttach={(files) =>
          selected && evidenceMut.mutate({ id: selected._id, files })
        }
        onSubmit={() => selected && submitMut.mutate(selected._id)}
        onSignOff={() => selected && signOffMut.mutate(selected._id)}
      />

      <ManageFrameworksDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        frameworks={frameworks}
      />
    </div>
  );
}

// ───────────────────────────── Framework tab ──

function FrameworkTab({
  framework,
  indicators,
  onAddIndicator,
  addPending,
  onSelect,
  onExportPdf,
  onExportExcel,
  onCompile,
  compilePending,
}: {
  framework: EsgFramework;
  indicators: ReportIndicator[];
  onAddIndicator: (
    dto: { code: string; title: string; owner?: string },
    onDone: () => void,
  ) => void;
  addPending: boolean;
  onSelect: (i: ReportIndicator) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onCompile: () => void;
  compilePending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">
            {framework.label} content index
          </CardTitle>
          {framework.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {framework.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <IndicatorDialog
            framework={framework}
            pending={addPending}
            onSave={onAddIndicator}
          />
          <Button size="sm" variant="outline" onClick={onExportPdf}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={onExportExcel}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button size="sm" disabled={compilePending} onClick={onCompile}>
            <BookMarked className="h-4 w-4 mr-1" />
            {compilePending ? "Compiling…" : "Compile report"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Disclosure</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicators.map((i) => (
              <TableRow
                key={i._id}
                className="cursor-pointer"
                onClick={() => onSelect(i)}
              >
                <TableCell className="text-sm font-mono">{i.code}</TableCell>
                <TableCell className="text-sm font-medium">{i.title}</TableCell>
                <TableCell className="text-sm">{i.owner}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {i.evidence.length ? `${i.evidence.length} file(s)` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={indicatorTone(i.status)}>
                    {i.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {indicators.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-8"
                >
                  No indicators mapped for {framework.label} yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IndicatorDialog({
  framework,
  onSave,
  pending,
}: {
  framework: EsgFramework;
  onSave: (
    dto: { code: string; title: string; owner?: string },
    onDone: () => void,
  ) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: "", title: "", owner: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Indicator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {framework.label} indicator</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Code</Label>
            <Input
              value={f.code}
              onChange={(e) => setF({ ...f, code: e.target.value })}
            />
          </div>
          <div>
            <Label>Disclosure title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Input
              value={f.owner}
              onChange={(e) => setF({ ...f, owner: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() => {
              if (!f.code || !f.title)
                return toast({
                  title: "Code and title required",
                  variant: "destructive",
                });
              onSave(f, () => {
                setOpen(false);
                setF({ code: "", title: "", owner: "" });
              });
            }}
          >
            {pending ? "Adding…" : "Add indicator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Indicator detail sheet ──

function IndicatorSheet({
  indicator,
  framework,
  onClose,
  onSaveResponse,
  onAttach,
  onSubmit,
  onSignOff,
}: {
  indicator: ReportIndicator | null;
  framework: EsgFramework | undefined;
  onClose: () => void;
  onSaveResponse: (response: string) => void;
  onAttach: (files: File[]) => void;
  onSubmit: () => void;
  onSignOff: () => void;
}) {
  const [response, setResponse] = useState("");
  useEffect(() => {
    setResponse(indicator?.response ?? "");
  }, [indicator?._id]);

  return (
    <Sheet open={!!indicator} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {indicator && (
          <>
            <SheetHeader>
              <SheetTitle>
                {indicator.code} — {indicator.title}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{framework?.label}</Badge>
                <Badge
                  variant="outline"
                  className={indicatorTone(indicator.status)}
                >
                  {indicator.status}
                </Badge>
                <Badge variant="outline">Owner: {indicator.owner}</Badge>
              </div>

              <div>
                <Label>Disclosure response</Label>
                <Textarea
                  rows={6}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  onBlur={() =>
                    response !== indicator.response && onSaveResponse(response)
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Evidence</Label>
                  <label className="text-xs text-primary cursor-pointer flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach file
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        onAttach(files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  {indicator.evidence.map((ev, idx) => (
                    <div
                      key={ev._id ?? idx}
                      className="flex justify-between border rounded px-2 py-1 text-xs"
                    >
                      <span>{ev.name}</span>
                      {ev.fileUrl && (
                        <a
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                  {!indicator.evidence.length && (
                    <div className="text-xs text-muted-foreground">
                      No evidence attached.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-3 flex flex-wrap gap-2">
                {indicator.status !== "Awaiting sign-off" &&
                  indicator.status !== "Signed off" && (
                    <Button variant="outline" onClick={onSubmit}>
                      Submit for sign-off
                    </Button>
                  )}
                {indicator.status === "Awaiting sign-off" && (
                  <Button onClick={onSignOff}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Sign off
                  </Button>
                )}
                {indicator.status === "Signed off" && (
                  <div className="text-xs text-emerald-600">
                    Signed off by {indicator.signedOffBy} on{" "}
                    {indicator.signedOffAt
                      ? new Date(indicator.signedOffAt).toLocaleDateString()
                      : "—"}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ───────────────────────────── Manage frameworks ──

function ManageFrameworksDialog({
  open,
  onOpenChange,
  frameworks,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  frameworks: EsgFramework[];
}) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["esgFrameworks"] });
    queryClient.invalidateQueries({ queryKey: ["esgFrameworkCoverage"] });
  };
  const [editing, setEditing] = useState<EsgFramework | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createFramework({
        label: newLabel,
        description: newDescription || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setNewLabel("");
      setNewDescription("");
      toast({ title: "Framework added" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add framework",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const updateMut = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: { label?: string; description?: string };
    }) => updateFramework(id, dto),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast({ title: "Framework updated" });
    },
  });
  const activeMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setFrameworkActive(id, isActive),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFramework(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Framework deleted" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage ESG frameworks</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Standard frameworks are a starting point, not a fixed list — rename,
          deactivate, or delete any of them, and add your own for licensing-tied
          requirements (e.g. a Capital Markets Authority corporate governance
          code, or a central bank's licensing conditions).
        </p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {frameworks.map((f) => (
            <div key={f._id} className="border rounded-md p-3">
              {editing?._id === f._id ? (
                <div className="space-y-2">
                  <Input
                    value={editing.label}
                    onChange={(e) =>
                      setEditing({ ...editing, label: e.target.value })
                    }
                    placeholder="Label"
                  />
                  <Textarea
                    rows={2}
                    value={editing.description}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    placeholder="Description"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={updateMut.isPending}
                      onClick={() =>
                        updateMut.mutate({
                          id: f._id,
                          dto: {
                            label: editing.label,
                            description: editing.description,
                          },
                        })
                      }
                    >
                      {updateMut.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{f.label}</span>
                      {f.isStandard && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          Standard
                        </Badge>
                      )}
                      {!f.isActive && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-muted-foreground"
                        >
                          Hidden
                        </Badge>
                      )}
                    </div>
                    {f.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {f.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditing(f)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={f.isActive ? "Hide tab" : "Show tab"}
                      onClick={() =>
                        activeMut.mutate({ id: f._id, isActive: !f.isActive })
                      }
                    >
                      {f.isActive ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-600"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete "{f.label}"?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the framework and all its
                            indicators. This can't be undone — if you just want
                            to hide the tab, use the eye icon instead.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-rose-600 hover:bg-rose-700"
                            onClick={() => deleteMut.mutate(f._id)}
                          >
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!frameworks.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No frameworks yet.
            </p>
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label>Add a framework</Label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. CMA Corporate Governance Code"
          />
          <Textarea
            rows={2}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <Button
            size="sm"
            disabled={createMut.isPending}
            onClick={() => {
              if (!newLabel.trim())
                return toast({
                  title: "Label required",
                  variant: "destructive",
                });
              createMut.mutate();
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {createMut.isPending ? "Adding…" : "Add framework"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────── Custom report builder ──

function CustomReportDialog({ frameworks }: { frameworks: EsgFramework[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Custom ESG Report");
  const [frameworkIds, setFrameworkIds] = useState<string[]>([]);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeMateriality, setIncludeMateriality] = useState(true);

  const build = async (): Promise<ReportDefinition> => {
    const dash = await fetchDashboard();
    const indicatorSets = await Promise.all(
      frameworkIds.map(async (id) => ({
        framework: frameworks.find((f) => f._id === id),
        indicators: await fetchIndicators(id),
      })),
    );

    return {
      id: "esg-custom",
      title,
      subtitle: "Configurable ESG report",
      summary: [
        {
          label: "Frameworks",
          value:
            indicatorSets.map((s) => s.framework?.label).join(", ") || "None",
        },
        { label: "Environmental score", value: dash.environmental },
        { label: "Social score", value: dash.social },
        { label: "Material topics", value: dash.materialTopics },
      ],
      sections: [
        ...(includeMetrics
          ? [
              {
                heading: "Metrics furthest from target",
                columns: [
                  "Pillar",
                  "Category",
                  "Metric",
                  "Value",
                  "Unit",
                  "Target",
                  "Target year",
                ],
                rows: dash.furthestFromTarget.map((m) => [
                  m.pillar,
                  m.category,
                  m.name,
                  m.value,
                  m.unit,
                  m.target,
                  m.targetYear,
                ]),
              },
            ]
          : []),
        ...(includeMateriality
          ? [
              {
                heading: "Material topics",
                columns: ["Topic", "Pillar", "Financial", "Impact"],
                rows: dash.materialTopicsList.map((t) => [
                  t.topic,
                  t.pillar,
                  t.financial,
                  t.impact,
                ]),
              },
            ]
          : []),
        ...indicatorSets.map((s) => ({
          heading: `${s.framework?.label ?? "Framework"} disclosures`,
          columns: ["Code", "Disclosure", "Response", "Status"],
          rows: s.indicators.map((i) => [
            i.code,
            i.title,
            i.response || "—",
            i.status,
          ]),
        })),
      ],
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileBarChart className="h-4 w-4 mr-1" />
          Custom report builder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Build a custom ESG report</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Report title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Frameworks to include</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {frameworks.map((f) => (
                <label key={f._id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={frameworkIds.includes(f._id)}
                    onCheckedChange={(v) =>
                      setFrameworkIds((cur) =>
                        v ? [...cur, f._id] : cur.filter((x) => x !== f._id),
                      )
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeMetrics}
              onCheckedChange={(v) => setIncludeMetrics(Boolean(v))}
            />
            Include ESG metric data
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeMateriality}
              onCheckedChange={(v) => setIncludeMateriality(Boolean(v))}
            />
            Include materiality assessment
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => exportReportExcel(await build())}
          >
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button onClick={async () => exportReportPdf(await build())}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
