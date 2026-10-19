import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Gavel,
  Award,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchMyNotices,
  acknowledgeMyNotice as acknowledgeMyNoticeApi,
  fileMyNoticeAppeal,
  submitMyResignationNotice,
  type OffboardingRecord,
  type AppealOutcomeDecision,
} from "@/lib/hr/hr-recruitment-api";

const appealBadge: Record<AppealOutcomeDecision, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  hearing_scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  upheld: "bg-destructive/10 text-destructive border-destructive/30",
  overturned: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  modified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  adjourned: "bg-muted text-muted-foreground border-border",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

const appealLabel: Record<AppealOutcomeDecision, string> = {
  pending: "Under review",
  hearing_scheduled: "Hearing scheduled",
  upheld: "Termination upheld",
  overturned: "Termination reversed",
  modified: "Outcome modified",
  adjourned: "Adjourned",
  withdrawn: "Withdrawn",
};

// A notice is appealable once it's been served and, per Art. 29, only
// within the 5-working-day window the backend stamps as appeal.deadline.
function appealWindowOpen(n: OffboardingRecord): boolean {
  if (!n.noticeServed || n.appeal?.filed) return false;
  if (!n.appeal?.deadline) return true;
  return new Date() <= new Date(n.appeal.deadline);
}

export default function MyNotice() {
  const queryClient = useQueryClient();
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["my-offboarding-notices"],
    queryFn: fetchMyNotices,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["my-offboarding-notices"] });

  const [appealing, setAppealing] = useState<OffboardingRecord | null>(null);
  const [grounds, setGrounds] = useState("");
  const [resignOpen, setResignOpen] = useState(false);
  const [resignContent, setResignContent] = useState("");
  const [resignLastDay, setResignLastDay] = useState("");

  const acknowledgeMutation = useMutation({
    mutationFn: (recordId: string) => acknowledgeMyNoticeApi(recordId),
    onSuccess: () => {
      invalidate();
      toast.success("Notice acknowledged.");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to acknowledge notice"),
  });

  const appealMutation = useMutation({
    mutationFn: () => fileMyNoticeAppeal(appealing!._id, grounds.trim()),
    onSuccess: () => {
      invalidate();
      toast.success("Appeal submitted — HR will review it and respond.");
      setAppealing(null);
      setGrounds("");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to submit appeal"),
  });

  const resignMutation = useMutation({
    mutationFn: () =>
      submitMyResignationNotice({
        content: resignContent,
        lastWorkingDay: resignLastDay,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Resignation submitted.");
      setResignOpen(false);
      setResignContent("");
      setResignLastDay("");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "Failed to submit resignation"),
  });

  const active = useMemo(
    () => notices.filter((n) => n.status !== "reversed"),
    [notices],
  );
  const awaitingResponse = notices.filter(
    (n) => n.noticeServed && !n.noticeAcknowledgedAt,
  ).length;
  const appealsLodged = notices.filter((n) => n.appeal?.filed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notices</h1>
          <p className="text-sm text-muted-foreground">
            Official notices issued to you, such as a notice of termination. You
            can acknowledge a notice or lodge an appeal within 5 working days of
            receiving it.
          </p>
        </div>
        <Button variant="outline" onClick={() => setResignOpen(true)}>
          <LogOut className="h-4 w-4 mr-1.5" /> Submit my resignation
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Notices"
          value={active.length}
          icon={FileWarning}
        />
        <StatCard
          label="Awaiting Your Response"
          value={awaitingResponse}
          icon={Clock}
        />
        <StatCard label="Appeals Lodged" value={appealsLodged} icon={Gavel} />
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </CardContent>
        </Card>
      )}

      {!isLoading && notices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You have no notices.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notices.map((n) => {
          const canAppeal = appealWindowOpen(n);
          return (
            <Card key={n._id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {n.type === "termination"
                      ? "Notice of Termination"
                      : "Resignation"}
                    <span className="text-muted-foreground font-normal text-xs">
                      · {n._id.slice(-6).toUpperCase()}
                    </span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.noticeServedAt
                      ? `Served ${n.noticeServedAt.slice(0, 10)}`
                      : "Not yet served"}{" "}
                    · Effective {n.endDate?.slice(0, 10) ?? "—"}
                  </p>
                </div>
                <Badge variant="outline">
                  {n.noticeServed && !n.noticeAcknowledgedAt
                    ? "Awaiting your response"
                    : n.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {n.noticeContent ? (
                  <div
                    className="prose prose-sm max-w-none rounded-md border bg-muted/20 p-3 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: n.noticeContent }}
                  />
                ) : n.reason ? (
                  <p className="text-sm">{n.reason}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    The notice has not been drafted yet.
                  </p>
                )}

                {n.appeal?.filed && (
                  <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {n.appeal.filedBy === "employee"
                          ? "Your appeal"
                          : "Appeal on file"}
                      </span>
                      <Badge
                        variant="outline"
                        className={appealBadge[n.appeal.status]}
                      >
                        {appealLabel[n.appeal.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {n.appeal.grounds}
                    </p>
                    {n.appeal.filedAt && (
                      <p className="text-xs text-muted-foreground">
                        Filed {n.appeal.filedAt.slice(0, 10)}
                      </p>
                    )}
                    {n.appeal.hearingNotes && (
                      <p className="text-sm">
                        <span className="font-medium">Outcome notes: </span>
                        {n.appeal.hearingNotes}
                      </p>
                    )}
                  </div>
                )}

                {n.certificateContent && (
                  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-primary" /> Certificate
                      of Service
                    </p>
                    <div
                      className="prose prose-sm max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: n.certificateContent,
                      }}
                    />
                  </div>
                )}

                {n.noticeServed && (
                  <div className="flex flex-wrap gap-2">
                    {!n.noticeAcknowledgedAt && (
                      <Button
                        size="sm"
                        disabled={acknowledgeMutation.isPending}
                        onClick={() => acknowledgeMutation.mutate(n._id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge
                      </Button>
                    )}
                    {!n.appeal?.filed && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canAppeal}
                        onClick={() => {
                          setAppealing(n);
                          setGrounds("");
                        }}
                        title={
                          !canAppeal
                            ? "The 5 working day appeal window has closed"
                            : undefined
                        }
                      >
                        <Gavel className="h-4 w-4 mr-1" /> Appeal
                      </Button>
                    )}
                    {!canAppeal && !n.appeal?.filed && (
                      <p className="text-xs text-muted-foreground self-center">
                        The appeal window has closed.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!appealing} onOpenChange={() => setAppealing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File an appeal</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="grounds">Grounds for appeal</Label>
            <Textarea
              id="grounds"
              rows={5}
              placeholder="Explain why you believe this notice should be reconsidered…"
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your appeal will be sent to HR for review and will suspend the
              notice period until it's resolved. You will be notified of the
              outcome.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppealing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!grounds.trim() || appealMutation.isPending}
              onClick={() => appealMutation.mutate()}
            >
              {appealMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit appeal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resignOpen} onOpenChange={setResignOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Submit my resignation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <Label>Last working day</Label>
              <Input
                type="date"
                value={resignLastDay}
                onChange={(e) => setResignLastDay(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Your resignation letter</Label>
              <RichTextEditor
                value={resignContent}
                onChange={setResignContent}
                placeholder="Type your resignation letter here…"
                minHeight={240}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be sent to HR and starts your offboarding process.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !resignContent.trim() ||
                !resignLastDay ||
                resignMutation.isPending
              }
              onClick={() => resignMutation.mutate()}
            >
              {resignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit resignation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
