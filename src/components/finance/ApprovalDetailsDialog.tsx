import { CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApprovalDetails, StepState } from "@/lib/crm/approval-details";

const STEP_STYLE: Record<StepState, { icon: any; cls: string; word: string }> =
  {
    done: { icon: CheckCircle2, cls: "text-emerald-600", word: "Done" },
    pending: { icon: Clock, cls: "text-amber-600", word: "Pending" },
    rejected: { icon: XCircle, cls: "text-destructive", word: "Sent back" },
    info: { icon: Info, cls: "text-muted-foreground", word: "" },
  };

const when = (iso?: string | null) => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * One "details" view for everything that goes through an approval: what it
 * is, where it stands, and who has approved it (and when).
 */
export function ApprovalDetailsDialog({
  details,
  onClose,
}: {
  details: ApprovalDetails | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!details} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        data-testid="approval-details"
      >
        {details && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {details.title}
                <Badge variant="outline" className="text-xs font-normal">
                  {details.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>{details.summary}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
              {details.fields.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium break-words">{f.value || "—"}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Approval trail
              </p>
              {details.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing has been recorded for this item yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {details.steps.map((s, i) => {
                    const st = STEP_STYLE[s.state];
                    const Icon = st.icon;
                    return (
                      <li key={i} className="flex gap-3">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${st.cls}`} />
                        <div className="text-sm min-w-0">
                          <p>
                            <span className="text-muted-foreground">
                              {s.label}
                              {s.name && s.name !== "—" ? " · " : ""}
                            </span>
                            <span className="font-medium">
                              {s.name && s.name !== "—" ? s.name : ""}
                            </span>
                            {s.tag && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[10px]"
                              >
                                {s.tag}
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.state === "pending"
                              ? "Not decided yet"
                              : when(s.at) ||
                                (s.state === "info" ? "" : "Date not recorded")}
                          </p>
                          {s.note && (
                            <p
                              className={`text-xs mt-0.5 ${s.state === "rejected" ? "text-destructive" : "text-muted-foreground"}`}
                            >
                              {s.state === "rejected" ? "Reason: " : ""}
                              {s.note}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {details.rule && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                {details.rule}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
