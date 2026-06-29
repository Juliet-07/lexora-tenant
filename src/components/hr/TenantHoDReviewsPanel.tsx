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
import { Send, Star, Crown, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface HoD {
  _id: string;
  firstName: string;
  lastName: string;
  department: string;
}

interface HoDReview {
  _id: string;
  hodId: string;
  hodName: string;
  department: string;
  cycleName: string;
  periodStart: string;
  periodEnd: string;
  status: "sent" | "hod_self_assessing" | "awaiting_tenant" | "completed";
  hodSelfScore?: number;
  tenantScore?: number;
}

const MOCK_HODS: HoD[] = [
  { _id: "h1", firstName: "Adaeze", lastName: "Nwosu", department: "Compliance" },
  { _id: "h2", firstName: "Tunde", lastName: "Bakare", department: "Risk" },
  { _id: "h3", firstName: "Fatima", lastName: "Diallo", department: "Operations" },
];

const INITIAL_REVIEWS: HoDReview[] = [
  {
    _id: "hr1",
    hodId: "h1",
    hodName: "Adaeze Nwosu",
    department: "Compliance",
    cycleName: "Q2 2026 HoD Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "awaiting_tenant",
    hodSelfScore: 89,
  },
  {
    _id: "hr2",
    hodId: "h2",
    hodName: "Tunde Bakare",
    department: "Risk",
    cycleName: "Q2 2026 HoD Review",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    status: "hod_self_assessing",
  },
  {
    _id: "hr3",
    hodId: "h3",
    hodName: "Fatima Diallo",
    department: "Operations",
    cycleName: "Q1 2026 HoD Review",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    status: "completed",
    hodSelfScore: 85,
    tenantScore: 90,
  },
];

const STATUS_TONE: Record<HoDReview["status"], string> = {
  sent: "bg-info/10 text-info border-info/20",
  hod_self_assessing: "bg-warning/10 text-warning border-warning/20",
  awaiting_tenant: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  completed: "bg-success/10 text-success border-success/20",
};

const STATUS_LABEL: Record<HoDReview["status"], string> = {
  sent: "Sent",
  hod_self_assessing: "HoD self-assessing",
  awaiting_tenant: "Awaiting your review",
  completed: "Completed",
};

export function TenantHoDReviewsPanel() {
  const [reviews, setReviews] = useState<HoDReview[]>(INITIAL_REVIEWS);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    hodId: "",
    cycleName: "",
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  const [reviewing, setReviewing] = useState<HoDReview | null>(null);
  const [scoreForm, setScoreForm] = useState({ score: "", comments: "" });

  const handleSend = () => {
    if (!form.hodId || !form.cycleName || !form.periodStart || !form.periodEnd) {
      toast.error("Fill out HoD, cycle name and period.");
      return;
    }
    const h = MOCK_HODS.find((x) => x._id === form.hodId);
    if (!h) return;
    setReviews((p) => [
      {
        _id: `hr${Date.now()}`,
        hodId: h._id,
        hodName: `${h.firstName} ${h.lastName}`,
        department: h.department,
        cycleName: form.cycleName,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        status: "sent",
      },
      ...p,
    ]);
    toast.success(`Review sent to ${h.firstName} ${h.lastName}.`);
    setOpen(false);
    setForm({ hodId: "", cycleName: "", periodStart: "", periodEnd: "", notes: "" });
  };

  const submitScore = () => {
    if (!reviewing) return;
    const n = Number(scoreForm.score);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      toast.error("Enter a score between 0 and 100.");
      return;
    }
    setReviews((p) =>
      p.map((r) =>
        r._id === reviewing._id ? { ...r, status: "completed", tenantScore: n } : r,
      ),
    );
    toast.success(`Review for ${reviewing.hodName} submitted.`);
    setReviewing(null);
    setScoreForm({ score: "", comments: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">Heads of Department Reviews</h3>
          <p className="text-xs text-muted-foreground">
            Send and review performance for {MOCK_HODS.length} heads of department.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="bg-gradient-to-r from-primary to-secondary">
          <Send className="h-4 w-4 mr-1.5" /> New HoD Review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No HoD reviews yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r._id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.hodName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.department} · {r.cycleName}
                      {r.hodSelfScore != null && (
                        <> · Self {r.hodSelfScore}/100</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.tenantScore != null && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs">
                      <Star className="h-3 w-3 fill-white" />
                      <span className="font-bold">{r.tenantScore}</span>
                      <span className="opacity-80">/100</span>
                    </div>
                  )}
                  <Badge variant="outline" className={STATUS_TONE[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  {r.status === "awaiting_tenant" && (
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
            <Crown className="h-4 w-4" /> Heads of Department
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="divide-y">
            {MOCK_HODS.map((m) => (
              <li key={m._id} className="flex justify-between py-2">
                <span className="font-medium">
                  {m.firstName} {m.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{m.department}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send HoD Review</DialogTitle>
            <DialogDescription>
              The Head of Department will complete a self-assessment before it returns to you for sign-off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Head of Department</Label>
              <Select
                value={form.hodId}
                onValueChange={(v) => setForm((f) => ({ ...f, hodId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select HoD" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_HODS.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.firstName} {m.lastName} · {m.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cycle name</Label>
              <Input
                placeholder="e.g. Q3 2026 HoD Review"
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

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {reviewing?.hodName}</DialogTitle>
            <DialogDescription>
              HoD self-score: <strong>{reviewing?.hodSelfScore ?? "—"}/100</strong>. Submit your final score
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
                value={scoreForm.score}
                onChange={(e) => setScoreForm((f) => ({ ...f, score: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Comments</Label>
              <Textarea
                rows={4}
                value={scoreForm.comments}
                onChange={(e) => setScoreForm((f) => ({ ...f, comments: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button onClick={submitScore}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
