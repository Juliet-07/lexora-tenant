import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ShieldCheck,
  Activity,
} from "lucide-react";

interface AuditEntry {
  action:      string;
  performedBy?: string;
  reason?:     string;
  timestamp:   string;
}

interface InfoRequest {
  message:           string;
  requiredDocuments?: string[];
  requestedAt:       string;
}

interface Props {
  auditTrail:   AuditEntry[];
  infoRequests: InfoRequest[];
  submittedAt?: string | null;
  lastSavedAt?: string | null;
}

const ACTION_ICON: Record<string, typeof ShieldCheck> = {
  approved:              CheckCircle2,
  rejected:              XCircle,
  onboarding_submitted:  ShieldCheck,
};

const ACTION_COLOR: Record<string, string> = {
  approved:              "text-success",
  rejected:              "text-destructive",
  onboarding_submitted:  "text-primary",
};

export function KycActivityView({
  auditTrail,
  infoRequests,
  submittedAt,
  lastSavedAt,
}: Props) {
  const hasActivity = auditTrail.length > 0 || infoRequests.length > 0;

  return (
    <div className="space-y-4">
      {/* Onboarding timestamps */}
      {(submittedAt || lastSavedAt) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Onboarding Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {lastSavedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Last Saved</p>
                <p className="font-medium">
                  {new Date(lastSavedAt).toLocaleString()}
                </p>
              </div>
            )}
            {submittedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Submitted At</p>
                <p className="font-medium text-success">
                  {new Date(submittedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info requests sent to client */}
      {infoRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Information Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {infoRequests.map((req, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(req.requestedAt).toLocaleString()}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Info Requested
                  </Badge>
                </div>
                <p className="text-sm">{req.message}</p>
                {req.requiredDocuments && req.requiredDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {req.requiredDocuments.map((doc) => (
                      <Badge key={doc} variant="secondary" className="text-xs">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audit trail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditTrail.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No compliance actions recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {[...auditTrail].reverse().map((entry, i) => {
                const Icon  = ACTION_ICON[entry.action]  ?? Activity;
                const color = ACTION_COLOR[entry.action] ?? "text-muted-foreground";

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium capitalize">
                          {entry.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {entry.performedBy && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          By: {entry.performedBy}
                        </p>
                      )}
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          Reason: {entry.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!hasActivity && !submittedAt && !lastSavedAt && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
