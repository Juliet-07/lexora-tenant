import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Crown,
  Loader2,
  RotateCcw,
  Send,
  Settings2,
  SkipForward,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ApprovalWorkflowDialog } from "./ApprovalWorkflowDialog";
import {
  currentRunStep,
  type ApprovalArea,
  type ApprovalRun,
  type ApprovalWorkflow,
  type RunStatus,
  type RunStepStatus,
} from "@/lib/approvals-api";

const when = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const runTone: Record<RunStatus, string> = {
  "Not submitted": "bg-muted text-muted-foreground hover:bg-muted",
  "In approval": "bg-primary/10 text-primary hover:bg-primary/10",
  Approved: "bg-success/10 text-success hover:bg-success/10",
  "Sent back": "bg-warning/10 text-warning hover:bg-warning/10",
};

const stepIcon: Record<RunStepStatus, React.ReactNode> = {
  Waiting: <Circle className="h-4 w-4 text-muted-foreground" />,
  "In review": <Clock className="h-4 w-4 text-primary" />,
  Approved: <CheckCircle2 className="h-4 w-4 text-success" />,
  "Sent back": <Undo2 className="h-4 w-4 text-warning" />,
  Skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
};

/** Small status chip for lists. */
export function ApprovalBadge({
  run,
  className = "",
}: {
  run: ApprovalRun;
  className?: string;
}) {
  return (
    <Badge className={`${runTone[run.status]} ${className}`}>
      {run.status === "In approval"
        ? `With ${currentRunStep(run)?.name ?? "approvers"}`
        : run.status}
    </Badge>
  );
}

// Shows how approval works for this one item and lets the right person act:
// a drafter submits, each reviewer / approver decides in turn, and the
// account owner is always the last step. Everything is enforced on the
// server; this only reflects it.
export function ApprovalTracker({
  area,
  noun,
  run,
  workflow,
  canSubmitNow = true,
  cannotSubmitReason,
  busy,
  onSubmit,
  onDecide,
}: {
  area: ApprovalArea;
  noun: string;
  run: ApprovalRun;
  workflow: ApprovalWorkflow | undefined;
  /** False when there is nothing to submit yet (e.g. no text). */
  canSubmitNow?: boolean;
  cannotSubmitReason?: string;
  busy: boolean;
  onSubmit: (note: string) => Promise<unknown>;
  onDecide: (
    decision: "Approved" | "Sent back",
    note: string,
  ) => Promise<unknown>;
}) {
  const { user } = useAuth();
  const me = workflow?.me;
  const isOwner = !!me?.isOwner;
  const [setupOpen, setSetupOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "submit" | "approve" | "back">(
    null,
  );
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const step = currentRunStep(run);
  const iAmOnStep =
    !!step &&
    (isOwner ||
      (step.kind !== "Owner" && step.userIds.includes(user?.id ?? "")));
  const canSubmit =
    (run.status === "Not submitted" || run.status === "Sent back") &&
    !!me?.canDraft &&
    (workflow?.configured || isOwner);
  const started = run.status !== "Not submitted";

  const closeDialog = () => {
    setDialog(null);
    setNote("");
  };
  const confirm = async () => {
    try {
      if (dialog === "submit") await onSubmit(note.trim());
      else if (dialog === "approve") await onDecide("Approved", note.trim());
      else if (dialog === "back") await onDecide("Sent back", note.trim());
      closeDialog();
    } catch {
      // the caller shows the server's reason; keep the dialog open
    }
  };

  // The route as configured, shown before anything is submitted.
  const route = [
    {
      label: "Drafter",
      sub: workflow?.drafters.map((d) => d.name).join(", ") || "—",
    },
    ...(workflow?.steps ?? []).map((s) => ({
      label: `${s.name} · ${s.kind}`,
      sub: s.people.map((p) => p.name).join(", "),
    })),
    { label: "Tenant owner · final", sub: "Always last", owner: true },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              Approval
              <Badge className={runTone[run.status]}>
                {run.status === "Sent back"
                  ? "Sent back for changes"
                  : run.status}
              </Badge>
              {run.round > 1 && (
                <Badge variant="outline" className="font-normal">
                  Round {run.round}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              A drafter submits this {noun}; each reviewer / approver decides in
              turn; the account owner gives the final approval.
            </p>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSetupOpen(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {workflow?.configured ? "Edit chain" : "Set up chain"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow && !workflow.configured && (
            <div className="rounded-lg border border-dashed p-4 text-sm">
              <p className="font-medium">No approval chain is set up yet.</p>
              <p className="mt-1 text-muted-foreground">
                {isOwner
                  ? `Until you choose who drafts and who reviews, ${noun}s are not held back for approval and only you can work on them.`
                  : `The account owner has not set up who drafts and reviews ${noun}s yet.`}
              </p>
            </div>
          )}

          {run.status === "Sent back" && run.sentBackReason && (
            <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium">
                  Sent back
                  {run.history.length
                    ? ` by ${[...run.history].reverse().find((h) => h.action === "Sent back")?.byName ?? "a reviewer"}`
                    : ""}
                </p>
                <p className="text-muted-foreground">{run.sentBackReason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Make the changes, then resubmit — the chain starts again from
                  the first step.
                </p>
              </div>
            </div>
          )}

          {run.status === "Approved" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-success/40 bg-success/5 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <p>
                Approved. This {noun} can now go to the other side and be sent
                for signature. Editing it again withdraws this approval.
              </p>
            </div>
          )}

          {/* The route */}
          {!started && workflow?.configured && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                How it will be approved
              </Label>
              <ol className="flex flex-wrap items-stretch gap-2">
                {route.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        "owner" in r && r.owner
                          ? "border-primary/40 bg-primary/5"
                          : ""
                      }`}
                    >
                      <p className="flex items-center gap-1.5 font-medium">
                        {"owner" in r && r.owner && (
                          <Crown className="h-3.5 w-3.5 text-primary" />
                        )}
                        {r.label}
                      </p>
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {r.sub}
                      </p>
                    </div>
                    {i < route.length - 1 && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* This item's progress */}
          {started && (
            <ol className="space-y-0">
              <li className="flex gap-3 pb-3">
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <div className="mt-1 w-px flex-1 bg-border" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    Submitted by {run.submittedByName || "a drafter"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {when(run.submittedAt)}
                  </p>
                </div>
              </li>
              {run.steps.map((s, i) => (
                <li key={s._id ?? i} className="flex gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    {s.kind === "Owner" && s.status !== "Approved" ? (
                      <Crown
                        className={`h-4 w-4 ${s.status === "In review" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    ) : (
                      stepIcon[s.status]
                    )}
                    {i < run.steps.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {s.kind === "Owner"
                          ? "Tenant owner — final approval"
                          : s.name}
                      </p>
                      {s.kind !== "Owner" && (
                        <Badge variant="outline" className="font-normal">
                          {s.kind}
                        </Badge>
                      )}
                      <Badge
                        className={
                          s.status === "Approved"
                            ? "bg-success/10 text-success hover:bg-success/10"
                            : s.status === "In review"
                              ? "bg-primary/10 text-primary hover:bg-primary/10"
                              : s.status === "Sent back"
                                ? "bg-warning/10 text-warning hover:bg-warning/10"
                                : "bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {s.status === "In review" ? "Up now" : s.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.decidedByName
                        ? `${s.status === "Sent back" ? "Sent back" : "Decided"} by ${s.decidedByName}${s.decidedAt ? ` · ${when(s.decidedAt)}` : ""}`
                        : s.userNames.length
                          ? `Any one of: ${s.userNames.join(", ")}`
                          : s.status === "Skipped"
                            ? ""
                            : "Account owner"}
                    </p>
                    {s.note && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">
                        “{s.note}”
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {canSubmit && (
              <Button
                disabled={busy || !canSubmitNow}
                onClick={() => setDialog("submit")}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : run.status === "Sent back" ? (
                  <RotateCcw className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {run.status === "Sent back"
                  ? "Resubmit for approval"
                  : isOwner
                    ? "Approve as owner"
                    : "Submit for approval"}
              </Button>
            )}
            {canSubmit && !canSubmitNow && cannotSubmitReason && (
              <span className="text-xs text-muted-foreground">
                {cannotSubmitReason}
              </span>
            )}
            {run.status === "In approval" && iAmOnStep && (
              <>
                <Button disabled={busy} onClick={() => setDialog("approve")}>
                  <Check className="mr-2 h-4 w-4" />
                  {step?.kind === "Owner" ? "Give final approval" : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDialog("back")}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Send back
                </Button>
              </>
            )}
            {run.status === "In approval" && !iAmOnStep && step && (
              <p className="text-sm text-muted-foreground">
                Waiting for{" "}
                <span className="font-medium text-foreground">
                  {step.kind === "Owner"
                    ? "the account owner"
                    : step.userNames.join(" or ")}
                </span>{" "}
                ({step.name}).
              </p>
            )}
            {!canSubmit &&
              !(run.status === "In approval") &&
              run.status !== "Approved" &&
              workflow?.configured &&
              !me?.canDraft && (
                <p className="text-sm text-muted-foreground">
                  You can follow this {noun}, but only a drafter can submit it.
                </p>
              )}
            {run.history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory ? "Hide history" : "History"}
              </Button>
            )}
          </div>

          {showHistory && (
            <ul className="space-y-1.5 text-xs">
              {[...run.history].reverse().map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-28 shrink-0 text-muted-foreground">
                    {when(h.at)}
                  </span>
                  <span>
                    <span className="font-medium">{h.byName}</span> · {h.action}
                    {h.detail ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {h.detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === "submit"
                ? run.status === "Sent back"
                  ? "Resubmit for approval"
                  : isOwner
                    ? "Approve as owner"
                    : "Submit for approval"
                : dialog === "approve"
                  ? step?.kind === "Owner"
                    ? "Give final approval"
                    : `Approve — ${step?.name ?? ""}`
                  : "Send back for changes"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "submit"
                ? isOwner
                  ? `As the owner, your approval settles this ${noun} straight away.`
                  : `It goes to ${workflow?.steps[0]?.people.map((p) => p.name).join(" or ") ?? "the owner"} first, then up the chain to the account owner. You will not be able to edit it while it is with them.`
                : dialog === "approve"
                  ? step?.kind === "Owner"
                    ? `This settles the ${noun}. It can then go out for review and signature.`
                    : "It moves on to the next step."
                  : `It returns to the drafter, who changes it and submits again from the start. Say what needs to change.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>
              {dialog === "back" ? "Reason (required)" : "Note (optional)"}
            </Label>
            <Textarea
              rows={3}
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                dialog === "back" ? "What needs to change?" : "Add a note…"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={busy || (dialog === "back" && !note.trim())}
              onClick={confirm}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialog === "back"
                ? "Send back"
                : dialog === "submit"
                  ? "Submit"
                  : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isOwner && (
        <ApprovalWorkflowDialog
          area={area}
          open={setupOpen}
          onOpenChange={setSetupOpen}
        />
      )}
    </>
  );
}
