import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Star, Users, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

// ── Dummy data ─────────────────────────────────────────────────
interface Report {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

interface SentReview {
  _id: string;
  employeeId: string;
  employeeName: string;
  cycleName: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "sent" | "employee_in_progress" | "completed";
  managerScore?: number;
}

const MOCK_REPORTS: Report[] = [
  { _id: "1", firstName: "Amara", lastName: "Okafor", jobTitle: "Senior Compliance Analyst" },
  { _id: "2", firstName: "David", lastName: "Mensah", jobTitle: "KYC Specialist" },
  { _id: "3", firstName: "Priya", lastName: "Sharma", jobTitle: "AML Investigator" },
  { _id: "4", firstName: "Jonas", lastName: "Becker", jobTitle: "Onboarding Associate" },
  { _id: "5", firstName: "Chiamaka", lastName: "Eze", jobTitle: "Junior Analyst" },
  { _id: "6", firstName: "Liam", lastName: "O'Connor", jobTitle: "Risk Analyst" },
];

const INITIAL_SENT: SentReview[] = [
  {
    _id: "rv1",
    employeeId: "1",
    employeeName: "Amara Okafor",
    cycleName: "Q2 2026 Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "completed",
    managerScore: 88,
  },
  {
    _id: "rv2",
    employeeId: "3",
    employeeName: "Priya Sharma",
    cycleName: "Q2 2026 Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "employee_in_progress",
  },
];

const STATUS_TONE: Record<SentReview["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info border-info/20",
  employee_in_progress: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-success/10 text-success border-success/20",
};

const STATUS_LABEL: Record<SentReview["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  employee_in_progress: "Employee self-assessing",
  completed: "Completed",
};

export function ManagerTeamReviewsPanel() {
  const [sent, setSent] = useState<SentReview[]>(INITIAL_SENT);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    cycleName: "",
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  const handleSend = () => {
    if (!form.employeeId || !form.cycleName || !form.periodStart || !form.periodEnd) {
      toast.error("Fill out employee, cycle name and period.");
      return;
    }
    const emp = MOCK_REPORTS.find((r) => r._id === form.employeeId);
    if (!emp) return;
    const newReview: SentReview = {
      _id: `rv${Date.now()}`,
      employeeId: emp._id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      cycleName: form.cycleName,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      status: "sent",
    };
    setSent((prev) => [newReview, ...prev]);
    toast.success(`Review sent to ${emp.firstName} ${emp.lastName}.`);
    setOpen(false);
    setForm({ employeeId: "", cycleName: "", periodStart: "", periodEnd: "", notes: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">Team Performance Reviews</h3>
          <p className="text-xs text-muted-foreground">
            Send and track reviews for {MOCK_REPORTS.length} direct reports.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Send className="h-4 w-4 mr-1.5" /> New Review
        </Button>
      </div>

      {sent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No reviews sent yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sent.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.cycleName} · {new Date(r.periodStart).toLocaleDateString()} –{" "}
                    {new Date(r.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.managerScore != null && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs">
                      <Star className="h-3 w-3 fill-white" />
                      <span className="font-bold">{r.managerScore}</span>
                      <span className="opacity-80">/100</span>
                    </div>
                  )}
                  <Badge variant="outline" className={STATUS_TONE[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Direct reports
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="divide-y">
            {MOCK_REPORTS.map((r) => (
              <li key={r._id} className="flex justify-between py-2">
                <span className="font-medium">
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{r.jobTitle}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Performance Review</DialogTitle>
            <DialogDescription>
              The employee will be notified to complete their self-assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_REPORTS.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.firstName} {r.lastName} · {r.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cycle name</Label>
              <Input
                placeholder="e.g. Q3 2026 Review"
                value={form.cycleName}
                onChange={(e) => setForm((f) => ({ ...f, cycleName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Period start</Label>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Period end</Label>
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-1.5" /> Send Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
