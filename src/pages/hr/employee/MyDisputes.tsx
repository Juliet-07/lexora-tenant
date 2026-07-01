import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShieldAlert, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDisputes,
  addDispute,
  updateDispute,
  nextDisputeId,
  STAGE_LABEL,
  STAGE_TONE,
  SEVERITY_TONE,
  type Dispute,
  type CaseType,
  type Severity,
  type Hierarchy,
} from "@/lib/disputesStore";

// Directory of possible respondents (dummy).
const RESPONDENTS: {
  name: string;
  role: Hierarchy;
  department: string;
  manager: string;
}[] = [
  { name: "Samuel Nkurunziza", role: "regular", department: "Operations", manager: "Joel Kagabo" },
  { name: "Tariq Hassan", role: "regular", department: "Sales", manager: "Joel Kagabo" },
  { name: "Grace Mutoni", role: "regular", department: "Finance", manager: "Aline Mukamana" },
  { name: "Joel Kagabo", role: "manager", department: "Operations", manager: "Aline Mukamana" },
  { name: "Aline Mukamana", role: "head_of_department", department: "Finance", manager: "CEO" },
];

export default function MyDisputes() {
  const { user } = useAuth();
  const all = useDisputes();
  const [open, setOpen] = useState(false);
  const [appealFor, setAppealFor] = useState<Dispute | null>(null);

  const me = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "Me";
  const meRole: Hierarchy = (user?.hierarchyRole as Hierarchy) ?? "regular";

  const mine = useMemo(
    () => all.filter((d) => d.reporterId === (user?.id ?? "") || d.reporterName === me),
    [all, user, me],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Disputes</h1>
          <p className="text-sm text-muted-foreground">
            Report a grievance or disciplinary concern. HR will acknowledge
            within 2 working days.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary">
              <Plus className="h-4 w-4 mr-2" /> Report a case
            </Button>
          </DialogTrigger>
          <ReportDialog
            onClose={() => setOpen(false)}
            reporterId={user?.id ?? "self"}
            reporterName={me}
            reporterRole={meRole}
          />
        </Dialog>
      </div>

      {mine.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You haven't reported any cases yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mine.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.id} · filed {d.filedOn} · against {d.againstName} (
                      {d.againstRole})
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={STAGE_TONE[d.stage]}>
                      {STAGE_LABEL[d.stage]}
                    </Badge>
                    <Badge variant="outline" className={SEVERITY_TONE[d.severity]}>
                      {d.severity}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm">{d.description}</p>

                {d.acknowledgement && (
                  <p className="text-xs text-muted-foreground">
                    <ShieldAlert className="h-3 w-3 inline mr-1" />
                    Acknowledged {d.acknowledgement.at} by {d.acknowledgement.by}
                    : {d.acknowledgement.note}
                  </p>
                )}
                {d.outcome && (
                  <div className="text-xs border-t pt-2">
                    <p className="font-medium">Outcome: {d.outcome.decision}</p>
                    <p className="text-muted-foreground">{d.outcome.rationale}</p>
                  </div>
                )}
                {d.outcome && d.stage === "outcome" && (
                  <Button size="sm" variant="outline" onClick={() => setAppealFor(d)}>
                    <Gavel className="h-3 w-3 mr-1" /> File appeal
                  </Button>
                )}
                {d.appeal?.decision && (
                  <p className="text-xs">
                    Appeal <strong>{d.appeal.decision}</strong> ·{" "}
                    {d.appeal.decidedAt}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {appealFor && (
        <AppealDialog dispute={appealFor} onClose={() => setAppealFor(null)} />
      )}
    </div>
  );
}

function ReportDialog({
  onClose,
  reporterId,
  reporterName,
  reporterRole,
}: {
  onClose: () => void;
  reporterId: string;
  reporterName: string;
  reporterRole: Hierarchy;
}) {
  const [form, setForm] = useState({
    againstName: RESPONDENTS[0].name,
    type: "Grievance" as CaseType,
    title: "",
    description: "",
    severity: "Medium" as Severity,
    witnesses: "",
    outcomeSought: "",
  });

  const respondent =
    RESPONDENTS.find((r) => r.name === form.againstName) ?? RESPONDENTS[0];
  const managerLooped = respondent.role === "regular";

  const submit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error("Title and description are required.");
    }
    const d: Dispute = {
      id: nextDisputeId(),
      reporterId,
      reporterName,
      reporterRole,
      reporterManagerName: "Joel Kagabo",
      againstName: respondent.name,
      againstRole: respondent.role,
      againstDepartment: respondent.department,
      type: form.type,
      title: form.title,
      description: form.description,
      severity: form.severity,
      witnesses: form.witnesses,
      outcomeSought: form.outcomeSought,
      stage: "reported",
      filedOn: new Date().toISOString().slice(0, 10),
      investigators: managerLooped ? ["HR", `Manager: ${respondent.manager}`] : ["HR"],
      managerLooped,
      loopedManagerName: managerLooped ? respondent.manager : undefined,
      investigationNotes: [],
      escalation: [],
    };
    addDispute(d);
    toast.success("Case submitted to HR.");
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Report a case</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Against</Label>
            <Select
              value={form.againstName}
              onValueChange={(v) => setForm({ ...form, againstName: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONDENTS.map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {r.name} — {r.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.type} onValueChange={(v: CaseType) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Grievance", "Disciplinary", "Harassment", "Performance", "Other"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Severity</Label>
            <Select value={form.severity} onValueChange={(v: Severity) => setForm({ ...form, severity: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Witnesses</Label>
            <Input
              value={form.witnesses}
              onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
              placeholder="Names, if any"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Outcome sought</Label>
          <Input
            value={form.outcomeSought}
            onChange={(e) => setForm({ ...form, outcomeSought: e.target.value })}
            placeholder="What resolution would you like?"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {managerLooped
            ? `Because the respondent is a regular employee, HR will loop in ${respondent.manager} to co-investigate.`
            : "Because the respondent is a manager or head of department, HR will investigate alone."}
        </p>
      </div>
      <DialogFooter>
        <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">
          Submit to HR
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AppealDialog({
  dispute,
  onClose,
}: {
  dispute: Dispute;
  onClose: () => void;
}) {
  const [grounds, setGrounds] = useState("");
  const [remedy, setRemedy] = useState("");

  const submit = () => {
    if (!grounds.trim()) return toast.error("Grounds required.");
    updateDispute(dispute.id, {
      stage: "appeal",
      appeal: {
        filedAt: new Date().toISOString().slice(0, 10),
        grounds,
        remedySought: remedy,
      },
    });
    toast.success("Appeal filed.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File appeal — {dispute.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Grounds for appeal</Label>
            <Textarea rows={3} value={grounds} onChange={(e) => setGrounds(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Remedy sought</Label>
            <Input value={remedy} onChange={(e) => setRemedy(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Appeals must be filed within 5 working days of outcome.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Submit appeal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
