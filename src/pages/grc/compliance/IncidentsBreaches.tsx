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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  ShieldAlert,
  Upload,
  Download,
  Lock,
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fmtDate } from "@/lib/grc/usePersistentState";
import {
  fetchIncidents,
  createIncident,
  updateIncidentFields,
  addIncidentFinding,
  addIncidentAction,
  updateIncidentActionStatus,
  addIncidentLesson,
  addIncidentFiles,
  resolveComplianceFileUrl,
  todayStr,
  type Incident,
  type IncidentStatus,
  type IncidentSeverity,
} from "@/lib/grc/compliance-api";
import { fetchEmployees, type Employee } from "@/lib/hr/hr-api";
import { fetchClients, type ApiClient } from "@/lib/client/clients-api";
import { fetchPolicies } from "@/lib/grc/policy-api";

const CATEGORIES = [
  "Policy breach",
  "Data incident",
  "Near-miss",
  "Complaint (client)",
  "Complaint (staff)",
  "Fraud / financial irregularity",
  "Conflict of interest",
  "Regulatory non-compliance",
  "Health and safety",
  "IT / cybersecurity",
  "Third-party / outsourcing",
  "Other",
];
const ROOT = [
  "Process failure",
  "People / resourcing",
  "System / technology",
  "External / third-party",
  "Policy gap",
  "Training gap",
];
const LESSON_CATS = [
  "Process",
  "Control design",
  "People / training",
  "Technology",
  "Policy gap",
  "Communication",
];
const SEVERITIES: IncidentSeverity[] = ["Critical", "High", "Medium", "Low"];

const sevV = (s: string) =>
  (s === "Critical" || s === "High"
    ? "destructive"
    : s === "Medium"
      ? "secondary"
      : "outline") as any;
const stV = (s: IncidentStatus) =>
  (s === "Closed"
    ? "default"
    : s === "Investigating"
      ? "secondary"
      : "outline") as any;
const onErr = (title: string) => (err: any) =>
  toast({
    title,
    description: err?.response?.data?.message,
    variant: "destructive",
  });

export default function IncidentsBreaches() {
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["compliance-incidents"],
    queryFn: fetchIncidents,
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | IncidentStatus>("All");
  const [reportOpen, setReportOpen] = useState(false);

  const open = list.find((i) => i._id === openId);
  if (open)
    return <Detail key={open._id} inc={open} onBack={() => setOpenId(null)} />;

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading incidents…
      </div>
    );

  const closed = list.filter((i) => i.status === "Closed");
  const resolutionDays = closed
    .map((i) =>
      Math.round(
        (new Date(i.updatedAt).getTime() - new Date(i.reported).getTime()) /
          86400000,
      ),
    )
    .filter((d) => Number.isFinite(d) && d >= 0);
  const avg = resolutionDays.length
    ? Math.round(
        resolutionDays.reduce((a, d) => a + d, 0) / resolutionDays.length,
      )
    : 0;
  const shown = list.filter((i) => filter === "All" || i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Incidents & Breaches</h1>
          <p className="text-sm text-muted-foreground">
            Report, investigate, and remediate compliance incidents,
            near-misses, and policy breaches.
          </p>
        </div>
        <Button onClick={() => setReportOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Report incident
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total incidents YTD", list.length],
          ["Open / Investigating", list.length - closed.length],
          ["Closed", closed.length],
          ["Avg resolution", `${avg || "—"} days`],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{l}</div>
              <div className="text-2xl font-bold mt-1">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(["All", "Open", "Investigating", "Closed"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s} (
            {s === "All"
              ? list.length
              : list.filter((i) => i.status === s).length}
            )
          </Button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => (
                <TableRow
                  key={i._id}
                  className="cursor-pointer"
                  onClick={() => setOpenId(i._id)}
                >
                  <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                  <TableCell className="font-medium">{i.title}</TableCell>
                  <TableCell>{i.category}</TableCell>
                  <TableCell>
                    <Badge variant={sevV(i.severity)}>{i.severity}</Badge>
                  </TableCell>
                  <TableCell>{fmtDate(i.reported)}</TableCell>
                  <TableCell>
                    <Badge variant={stV(i.status)}>{i.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!shown.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No incidents.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}

function Detail({ inc, onBack }: { inc: Incident; onBack: () => void }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-incidents"] });

  const [notes, setNotes] = useState(inc.investigationNotes);
  const [rootNarrative, setRootNarrative] = useState(inc.rootNarrative);
  const [assignedTo, setAssignedTo] = useState(inc.assignedTo);
  const [impact, setImpact] = useState(inc.impact);
  useEffect(() => {
    setNotes(inc.investigationNotes);
    setRootNarrative(inc.rootNarrative);
    setAssignedTo(inc.assignedTo);
    setImpact(inc.impact);
  }, [inc.investigationNotes, inc.rootNarrative, inc.assignedTo, inc.impact]);

  const [act, setAct] = useState({ action: "", owner: "", due: "" });
  const [fnd, setFnd] = useState({
    finding: "",
    severity: "Medium" as IncidentSeverity,
    action: "",
  });
  const [lesson, setLesson] = useState({
    title: "",
    category: "Process",
    detail: "",
  });

  const fieldsMut = useMutation({
    mutationFn: (dto: Parameters<typeof updateIncidentFields>[1]) =>
      updateIncidentFields(inc._id, dto),
    onSuccess: invalidate,
    onError: onErr("Failed to update incident"),
  });
  const set = (
    patch: Parameters<typeof updateIncidentFields>[1],
    event?: string,
  ) => fieldsMut.mutate(event ? { ...patch, timelineEvent: event } : patch);

  const findingMut = useMutation({
    mutationFn: () => addIncidentFinding(inc._id, fnd),
    onSuccess: () => {
      invalidate();
      setFnd({ finding: "", severity: "Medium", action: "" });
    },
    onError: onErr("Failed to add finding"),
  });
  const actionMut = useMutation({
    mutationFn: () => addIncidentAction(inc._id, act),
    onSuccess: () => {
      invalidate();
      setAct({ action: "", owner: "", due: "" });
    },
    onError: onErr("Failed to add action"),
  });
  const actionStatusMut = useMutation({
    mutationFn: ({
      index,
      status,
    }: {
      index: number;
      status: "Pending" | "In progress" | "Done";
    }) => updateIncidentActionStatus(inc._id, index, status),
    onSuccess: invalidate,
    onError: onErr("Failed to update action"),
  });
  const lessonMut = useMutation({
    mutationFn: () => addIncidentLesson(inc._id, lesson),
    onSuccess: () => {
      invalidate();
      setLesson({ title: "", category: "Process", detail: "" });
      toast({ title: "Lesson saved" });
    },
    onError: onErr("Failed to save lesson"),
  });
  const filesMut = useMutation({
    mutationFn: (files: File[]) => addIncidentFiles(inc._id, files),
    onSuccess: invalidate,
    onError: onErr("Failed to upload files"),
  });

  const startInvestigation = () =>
    set({ status: "Investigating" }, "Status changed to Under investigation");
  const closeIncident = () => {
    if (inc.actions.some((a) => a.status !== "Done"))
      return toast({
        title: "Open remediation actions",
        description: "Complete all actions before closing.",
        variant: "destructive",
      });
    set({ status: "Closed" }, "Incident closed");
  };
  const reopen = () => set({ status: "Investigating" }, "Incident reopened");

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Incidents & Breaches
      </Button>
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex gap-2 mb-1">
            <Badge variant="outline">{inc.category}</Badge>
            <Badge variant={sevV(inc.severity)}>{inc.severity}</Badge>
            <Badge variant={stV(inc.status)}>
              {inc.status === "Investigating"
                ? "Under investigation"
                : inc.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {inc.ref} · {inc.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Reported by: {inc.anonymous ? "Anonymous" : inc.reportedBy} ·{" "}
            {fmtDate(inc.reported)} · Assigned to: {inc.assignedTo} · Escalated:{" "}
            {inc.escalatedTo === "—" ? "No" : inc.escalatedTo}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {inc.escalatedTo === "—" && (
            <Button
              variant="outline"
              onClick={() =>
                set(
                  { escalatedTo: "Managing Partner" },
                  "Escalated to Managing Partner",
                )
              }
            >
              <ShieldAlert className="h-4 w-4 mr-1" />
              Escalate
            </Button>
          )}
          {inc.status === "Open" && (
            <Button onClick={startInvestigation}>Start investigation</Button>
          )}
          {inc.status === "Investigating" && (
            <Button onClick={closeIncident}>Close incident</Button>
          )}
          {inc.status === "Closed" && (
            <Button variant="outline" onClick={reopen}>
              Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            {[
              "Overview",
              "Investigation",
              "Documents",
              "Lessons learned",
              "Activity",
            ].map((t) => (
              <TabsTrigger key={t} value={t.toLowerCase().split(" ")[0]}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>{inc.description || "—"}</p>
                {inc.immediateActions && (
                  <div>
                    <div className="font-semibold text-xs mb-1">
                      Immediate actions taken
                    </div>
                    <p>{inc.immediateActions}</p>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-xs mb-1">
                    Investigation notes
                  </div>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() =>
                      notes !== inc.investigationNotes &&
                      set({ investigationNotes: notes })
                    }
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Remediation actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inc.actions.map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {a.action}
                        </TableCell>
                        <TableCell>{a.owner}</TableCell>
                        <TableCell>{fmtDate(a.due)}</TableCell>
                        <TableCell>
                          <Select
                            value={a.status}
                            onValueChange={(v: any) =>
                              actionStatusMut.mutate({ index: idx, status: v })
                            }
                          >
                            <SelectTrigger className="h-7 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Pending", "In progress", "Done"].map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!inc.actions.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-4"
                        >
                          No actions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    className="flex-1 min-w-[180px]"
                    placeholder="Action"
                    value={act.action}
                    onChange={(e) => setAct({ ...act, action: e.target.value })}
                  />
                  <Input
                    className="w-36"
                    placeholder="Owner"
                    value={act.owner}
                    onChange={(e) => setAct({ ...act, owner: e.target.value })}
                  />
                  <Input
                    className="w-36"
                    type="date"
                    value={act.due}
                    onChange={(e) => setAct({ ...act, due: e.target.value })}
                  />
                  <Button
                    disabled={actionMut.isPending}
                    onClick={() => {
                      if (!act.action) return;
                      actionMut.mutate();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investigation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Impact assessment</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {(
                  ["financial", "regulatory", "client", "reputational"] as const
                ).map((k) => (
                  <div key={k}>
                    <Label className="text-xs capitalize">{k} impact</Label>
                    <Input
                      value={impact[k]}
                      onChange={(e) =>
                        setImpact({ ...impact, [k]: e.target.value })
                      }
                      onBlur={() => set({ impact: { [k]: impact[k] } })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Root cause analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Root cause category</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ROOT.map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={
                          inc.rootCauses.includes(r) ? "default" : "outline"
                        }
                        onClick={() =>
                          set({
                            rootCauses: inc.rootCauses.includes(r)
                              ? inc.rootCauses.filter((x) => x !== r)
                              : [...inc.rootCauses, r],
                          })
                        }
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">
                    Detailed root cause narrative
                  </Label>
                  <Textarea
                    rows={5}
                    value={rootNarrative}
                    onChange={(e) => setRootNarrative(e.target.value)}
                    onBlur={() =>
                      rootNarrative !== inc.rootNarrative &&
                      set({ rootNarrative })
                    }
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Investigation findings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Finding</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Linked action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inc.findings.map((f) => (
                      <TableRow key={f.ref}>
                        <TableCell>{f.ref}</TableCell>
                        <TableCell className="font-medium">
                          {f.finding}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sevV(f.severity)}>{f.severity}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{f.action}</TableCell>
                      </TableRow>
                    ))}
                    {!inc.findings.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-4"
                        >
                          No findings yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    className="flex-1 min-w-[200px]"
                    placeholder="Finding"
                    value={fnd.finding}
                    onChange={(e) =>
                      setFnd({ ...fnd, finding: e.target.value })
                    }
                  />
                  <Select
                    value={fnd.severity}
                    onValueChange={(v: IncidentSeverity) =>
                      setFnd({ ...fnd, severity: v })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-48"
                    placeholder="Linked action"
                    value={fnd.action}
                    onChange={(e) => setFnd({ ...fnd, action: e.target.value })}
                  />
                  <Button
                    disabled={findingMut.isPending}
                    onClick={() => {
                      if (!fnd.finding) return;
                      findingMut.mutate();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add finding
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Policies and controls affected
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {inc.policies.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
                {!inc.policies.length && (
                  <span className="text-sm text-muted-foreground">
                    None identified.
                  </span>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex-row justify-between items-center space-y-0">
                <CardTitle className="text-base">Attached documents</CardTitle>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    disabled={filesMut.isPending}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      filesMut.mutate(files);
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-flex items-center text-sm border rounded-md px-3 h-9">
                    <Upload className="h-4 w-4 mr-1" />
                    {filesMut.isPending ? "Uploading…" : "Upload file"}
                  </span>
                </label>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded by</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inc.files.map((f, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell>{f.type}</TableCell>
                        <TableCell>{f.by}</TableCell>
                        <TableCell>{fmtDate(f.date)}</TableCell>
                        <TableCell>{f.size}</TableCell>
                        <TableCell>
                          <a
                            href={resolveComplianceFileUrl(f.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button size="icon" variant="ghost" type="button">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!inc.files.length && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-4"
                        >
                          No documents attached.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inc.links.map((l, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 text-sm border rounded-lg p-2.5"
                  >
                    <Badge variant="outline">{l.type}</Badge>
                    {l.label}
                  </div>
                ))}
                {!inc.links.length && (
                  <span className="text-sm text-muted-foreground">
                    No linked records.
                  </span>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lessons" className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <b>Why capture lessons?</b> Lessons feed back into policy updates,
              training and control improvements. They are reviewed quarterly by
              the Compliance Committee and annually by the Board.
            </div>
            {inc.lessons.map((l, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold">{l.title}</span>
                    <Badge variant="secondary">{l.category}</Badge>
                  </div>
                  <p className="text-sm">{l.detail}</p>
                  <div className="text-xs text-muted-foreground">
                    Added by {l.by} · {fmtDate(l.date)}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add a lesson</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[1fr_200px] gap-2">
                  <div>
                    <Label className="text-xs">Lesson title</Label>
                    <Input
                      value={lesson.title}
                      onChange={(e) =>
                        setLesson({ ...lesson, title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={lesson.category}
                      onValueChange={(v) =>
                        setLesson({ ...lesson, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LESSON_CATS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Detail</Label>
                  <Textarea
                    rows={3}
                    value={lesson.detail}
                    onChange={(e) =>
                      setLesson({ ...lesson, detail: e.target.value })
                    }
                  />
                </div>
                <Button
                  disabled={lessonMut.isPending}
                  onClick={() => {
                    if (!lesson.title) return;
                    lessonMut.mutate();
                  }}
                >
                  Save lesson
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inc.timeline.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 border-l-2 border-primary pl-3"
                  >
                    <div className="text-xs text-muted-foreground w-36 shrink-0">
                      {fmtDate(t.at)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.event}</div>
                      {t.detail && (
                        <div className="text-xs text-muted-foreground">
                          {t.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!inc.timeline.length && (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    No activity yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Incident properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              ["Reference", inc.ref],
              ["Date occurred", fmtDate(inc.occurred)],
              ["Date reported", fmtDate(inc.reported)],
              ["Reported by", inc.anonymous ? "Anonymous" : inc.reportedBy],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={inc.category}
                onValueChange={(v) => set({ category: v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select
                value={inc.severity}
                onValueChange={(v: IncidentSeverity) =>
                  set({ severity: v }, `Severity changed to ${v}`)
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned to</Label>
              <Input
                className="h-8"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                onBlur={() =>
                  assignedTo !== inc.assignedTo &&
                  set({ assignedTo }, `Assigned to ${assignedTo}`)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Regulatory report</Label>
              <Select
                value={inc.regulatoryReport}
                onValueChange={(v) =>
                  set({ regulatoryReport: v }, `Regulatory report: ${v}`)
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Not required",
                    "Required — pending",
                    "Filed with regulator",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Escalated to</span>
              <span className="font-medium">{inc.escalatedTo}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Linked audit</span>
              <span className="font-medium text-right">{inc.linkedAudit}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Searchable, checkbox-style multi-select used for "Persons involved" and
// "Clients affected" — a Popover+Command combo (same pattern as the
// single-select employee picker in hr/Contracts.tsx), extended to toggle
// membership in an id array instead of replacing a single value, with
// selections shown as removable chips.
function MultiSelectPicker({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  options: { id: string; label: string; sublabel?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  const selectedOptions = options.filter((o) => selected.includes(o.id));

  return (
    <div>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {selectedOptions.length
                ? `${selectedOptions.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.label}
                    onSelect={() => toggle(o.id)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selected.includes(o.id) ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="flex flex-col">
                      <span>{o.label}</span>
                      {o.sublabel && (
                        <span className="text-[11px] text-muted-foreground">
                          {o.sublabel}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedOptions.map((o) => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const empty = {
    title: "",
    category: "",
    severity: "" as IncidentSeverity | "",
    occurred: "",
    reported: todayStr(),
    description: "",
    personIds: [] as string[],
    clientIds: [] as string[],
    policy: "",
    immediateActions: "",
    files: [] as File[],
  };
  const [f, setF] = useState(empty);

  // Persons involved / clients affected / policy potentially breached are
  // now picked from the tenant's real employee/client directory and its
  // published policies, rather than typed as free text.
  const { data: employeesPage } = useQuery({
    queryKey: ["hr-employees-for-incident-picker"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    enabled: open,
  });
  const employees = employeesPage?.items ?? [];

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-incident-picker"],
    queryFn: fetchClients,
    enabled: open,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["grc-policies-for-incident-picker"],
    queryFn: fetchPolicies,
    enabled: open,
  });
  const publishedPolicies = policies.filter((p) => p.status === "Published");

  const employeeName = (e: Employee) => `${e.firstName} ${e.lastName}`.trim();
  const clientName = (c: ApiClient) =>
    c.businessName ||
    `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
    c.email;

  const mutation = useMutation({
    mutationFn: async () => {
      const persons = f.personIds
        .map((id) => employees.find((e) => e._id === id))
        .filter((e): e is Employee => !!e)
        .map(employeeName)
        .join(", ");
      const clientsInvolved = f.clientIds
        .map((id) => clients.find((c) => c._id === id))
        .filter((c): c is ApiClient => !!c)
        .map(clientName)
        .join(", ");
      const created = await createIncident({
        title: f.title,
        category: f.category,
        severity: f.severity as IncidentSeverity,
        occurred: f.occurred || undefined,
        reported: f.reported,
        description: f.description,
        persons: persons || undefined,
        clients: clientsInvolved || undefined,
        policy: f.policy || undefined,
        immediateActions: f.immediateActions || undefined,
      });
      if (f.files.length) await addIncidentFiles(created._id, f.files);
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["compliance-incidents"] });
      setF(empty);
      onOpenChange(false);
      toast({
        title: "Incident reported",
        description: `${created.ref} logged and assigned for investigation.`,
      });
    },
    onError: onErr("Failed to report incident"),
  });

  const submit = () => {
    if (!f.title || !f.category || !f.severity || !f.description)
      return toast({
        title: "Title, category, severity and description are required",
        variant: "destructive",
      });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
        </DialogHeader>
        <div className="hidden rounded-lg border bg-muted/30 p-3 text-xs flex gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <div>
            <b>Confidential reporting.</b> Only the assigned investigator and
            the Managing Partner have access to incident details unless
            escalated.
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Incident title</Label>
            <Input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={f.category}
                onValueChange={(v) => setF({ ...f, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={f.severity}
                onValueChange={(v: IncidentSeverity) =>
                  setF({ ...f, severity: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assess severity…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">
                    Critical — regulatory action or material loss likely
                  </SelectItem>
                  <SelectItem value="High">
                    High — significant impact, senior attention
                  </SelectItem>
                  <SelectItem value="Medium">
                    Medium — moderate impact, process correction
                  </SelectItem>
                  <SelectItem value="Low">
                    Low — minor issue, no material impact
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date incident occurred</Label>
              <Input
                type="date"
                value={f.occurred}
                onChange={(e) => setF({ ...f, occurred: e.target.value })}
              />
            </div>
            <div>
              <Label>Date discovered / reported</Label>
              <Input
                type="date"
                value={f.reported}
                onChange={(e) => setF({ ...f, reported: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Detailed description</Label>
            <Textarea
              rows={4}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MultiSelectPicker
              label="Persons involved"
              placeholder="Select employees…"
              searchPlaceholder="Search employees…"
              emptyText="No employees found."
              options={employees.map((e) => ({
                id: e._id,
                label: employeeName(e),
                sublabel: e.jobTitle,
              }))}
              selected={f.personIds}
              onChange={(ids) => setF({ ...f, personIds: ids })}
            />
            <MultiSelectPicker
              label="Clients affected (if any)"
              placeholder="Select clients…"
              searchPlaceholder="Search clients…"
              emptyText="No clients found."
              options={clients.map((c) => ({
                id: c._id,
                label: clientName(c),
              }))}
              selected={f.clientIds}
              onChange={(ids) => setF({ ...f, clientIds: ids })}
            />
          </div>
          <div>
            <Label>Policy potentially breached</Label>
            <Select
              value={f.policy}
              onValueChange={(v) => setF({ ...f, policy: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select if applicable…" />
              </SelectTrigger>
              <SelectContent>
                {publishedPolicies.map((p) => (
                  <SelectItem key={p._id} value={p.title}>
                    {p.title}
                  </SelectItem>
                ))}
                <SelectItem value="Other (specify in description)">
                  Other (specify in description)
                </SelectItem>
              </SelectContent>
            </Select>
            {publishedPolicies.length === 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                No published policies yet — pick "Other" and describe it above.
              </p>
            )}
          </div>
          <div>
            <Label>Immediate actions taken</Label>
            <Textarea
              rows={2}
              value={f.immediateActions}
              onChange={(e) => setF({ ...f, immediateActions: e.target.value })}
            />
          </div>
          <div>
            <Label>Attachments</Label>
            <Input
              type="file"
              multiple
              onChange={(e) =>
                setF({ ...f, files: Array.from(e.target.files ?? []) })
              }
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              PDF, Word, Excel, images. Max 10 MB per file.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? "Submitting…" : "Submit incident report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
