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
import { ReviewedByMeHistoryTable } from "./ReviewedByMeHistoryTable";

// ── Dummy data: managers reporting to this HoD ─────────────────
interface ManagerReport {
  _id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
}

interface ManagerReview {
  _id: string;
  managerId: string;
  managerName: string;
  cycleName: string;
  periodStart: string;
  periodEnd: string;
  status: "sent" | "manager_self_assessing" | "awaiting_hod" | "completed";
  managerSelfScore?: number;
  hodScore?: number;
}

const MOCK_MANAGERS: ManagerReport[] = [
  { _id: "m1", firstName: "Adaeze", lastName: "Nwosu", jobTitle: "Compliance Manager", team: "Compliance" },
  { _id: "m2", firstName: "Tunde", lastName: "Bakare", jobTitle: "Risk Manager", team: "Risk" },
  { _id: "m3", firstName: "Fatima", lastName: "Diallo", jobTitle: "Operations Manager", team: "Operations" },
];

const INITIAL_REVIEWS: ManagerReview[] = [
  {
    _id: "mr1",
    managerId: "m1",
    managerName: "Adaeze Nwosu",
    cycleName: "Q2 2026 Manager Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "awaiting_hod",
    managerSelfScore: 86,
  },
  {
    _id: "mr2",
    managerId: "m2",
    managerName: "Tunde Bakare",
    cycleName: "Q2 2026 Manager Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "manager_self_assessing",
  },
  {
    _id: "mr3",
    managerId: "m3",
    managerName: "Fatima Diallo",
    cycleName: "Q1 2026 Manager Review",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    status: "completed",
    managerSelfScore: 84,
    hodScore: 88,
  },
];

const STATUS_TONE: Record<ManagerReview["status"], string> = {
  sent: "bg-info/10 text-info border-info/20",
  manager_self_assessing: "bg-warning/10 text-warning border-warning/20",
  awaiting_hod: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  completed: "bg-success/10 text-success border-success/20",
};

const STATUS_LABEL: Record<ManagerReview["status"], string> = {
  sent: "Sent",
  manager_self_assessing: "Manager self-assessing",
  awaiting_hod: "Your turn — review",
  completed: "Completed",
};

export function HoDManagerReviewsPanel() {
  const [reviews, setReviews] = useState<ManagerReview[]>(INITIAL_REVIEWS);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    managerId: "",
    cycleName: "",
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  const [reviewing, setReviewing] = useState<ManagerReview | null>(null);
  const [hodForm, setHodForm] = useState({ score: "", comments: "" });

  const handleSend = () => {
    if (!form.managerId || !form.cycleName || !form.periodStart || !form.periodEnd) {
      toast.error("Fill out manager, cycle name and period.");
      return;
    }
    const mgr = MOCK_MANAGERS.find((m) => m._id === form.managerId);
    if (!mgr) return;
    const r: ManagerReview = {
      _id: `mr${Date.now()}`,
      managerId: mgr._id,
      managerName: `${mgr.firstName} ${mgr.lastName}`,
      cycleName: form.cycleName,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      status: "sent",
    };
    setReviews((p) => [r, ...p]);
    toast.success(`Review sent to ${mgr.firstName} ${mgr.lastName}.`);
    setOpen(false);
    setForm({ managerId: "", cycleName: "", periodStart: "", periodEnd: "", notes: "" });
  };

  const submitHodReview = () => {
    if (!reviewing) return;
    const n = Number(hodForm.score);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      toast.error("Enter a score between 0 and 100.");
      return;
    }
    setReviews((p) =>
      p.map((r) =>
        r._id === reviewing._id ? { ...r, status: "completed", hodScore: n } : r,
      ),
    );
    toast.success(`Review for ${reviewing.managerName} submitted.`);
    setReviewing(null);
    setHodForm({ score: "", comments: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">Manager Performance Reviews</h3>
          <p className="text-xs text-muted-foreground">
            Send and review performance for {MOCK_MANAGERS.length} managers in your department.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Send className="h-4 w-4 mr-1.5" /> New Review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No manager reviews yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.managerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.cycleName} · {new Date(r.periodStart).toLocaleDateString()} –{" "}
                    {new Date(r.periodEnd).toLocaleDateString()}
                    {r.managerSelfScore != null && (
                      <> · Self {r.managerSelfScore}/100</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.hodScore != null && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs">
                      <Star className="h-3 w-3 fill-white" />
                      <span className="font-bold">{r.hodScore}</span>
                      <span className="opacity-80">/100</span>
                    </div>
                  )}
                  <Badge variant="outline" className={STATUS_TONE[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  {r.status === "awaiting_hod" && (
                    <Button size="sm" onClick={() => setReviewing(r)}>
                      Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Managers in your department
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="divide-y">
            {MOCK_MANAGERS.map((m) => (
              <li key={m._id} className="flex justify-between py-2">
                <span className="font-medium">
                  {m.firstName} {m.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.jobTitle} · {m.team}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ReviewedByMeHistoryTable />

      {/* Send-review dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Manager Review</DialogTitle>
            <DialogDescription>
              The manager will complete a self-assessment before it returns to you for sign-off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm((f) => ({ ...f, managerId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_MANAGERS.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.firstName} {m.lastName} · {m.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cycle name</Label>
              <Input
                placeholder="e.g. Q3 2026 Manager Review"
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

      {/* HoD scoring dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {reviewing?.managerName}</DialogTitle>
            <DialogDescription>
              Manager self-score:{" "}
              <strong>{reviewing?.managerSelfScore ?? "—"}/100</strong>. Submit your final score
              and comments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Final score (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={hodForm.score}
                onChange={(e) => setHodForm((f) => ({ ...f, score: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Comments</Label>
              <Textarea
                rows={4}
                value={hodForm.comments}
                onChange={(e) => setHodForm((f) => ({ ...f, comments: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button onClick={submitHodReview}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
