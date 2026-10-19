import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ─── Prototype storage ────────────────────────────────────────
// No HR notice API exists yet, so notices and appeals persist in
// browser-local storage keyed by tenant + employee email.
type NoticeStatus = "issued" | "acknowledged" | "appealed" | "closed";
type AppealStatus = "submitted" | "under_review" | "upheld" | "overturned";

interface Notice {
  id: string;
  employeeEmail: string;
  type: string;
  reason: string;
  effectiveDate: string;
  issuedDate: string;
  issuedBy: string;
  status: NoticeStatus;
  appeal?: {
    grounds: string;
    submittedDate: string;
    status: AppealStatus;
    outcomeNote?: string;
  };
}

const storeKey = (tenant: string, email: string) =>
  `hr_employee_notices_v1:${tenant}:${email}`;

function loadNotices(tenant: string, email: string): Notice[] {
  try {
    const raw = localStorage.getItem(storeKey(tenant, email));
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  // Seed a sample notice so the workflow is visible in the prototype.
  const seed: Notice[] = [
    {
      id: "NTC-001",
      employeeEmail: email,
      type: "Termination of Employment",
      reason:
        "Following a review of departmental requirements, your position has been identified for redundancy as part of an organisational restructuring.",
      effectiveDate: "2026-11-18",
      issuedDate: "2026-10-19",
      issuedBy: "HR Department",
      status: "issued",
    },
  ];
  localStorage.setItem(storeKey(tenant, email), JSON.stringify(seed));
  return seed;
}

const statusBadge: Record<NoticeStatus, string> = {
  issued: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  acknowledged: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  appealed: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

const appealBadge: Record<AppealStatus, string> = {
  submitted: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  under_review: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  upheld: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  overturned: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function MyNotice() {
  const { user } = useAuth();
  const tenant = user?.tenantId ?? "demo";
  const email = (user?.email ?? "employee@lexora.africa").toLowerCase();

  const [notices, setNotices] = useState<Notice[]>(() =>
    loadNotices(tenant, email),
  );
  const [appealing, setAppealing] = useState<Notice | null>(null);
  const [grounds, setGrounds] = useState("");

  const save = (next: Notice[]) => {
    setNotices(next);
    localStorage.setItem(storeKey(tenant, email), JSON.stringify(next));
  };

  const acknowledge = (id: string) => {
    save(
      notices.map((n) =>
        n.id === id ? { ...n, status: "acknowledged" as const } : n,
      ),
    );
    toast({ title: "Notice acknowledged" });
  };

  const submitAppeal = () => {
    if (!appealing) return;
    if (!grounds.trim()) {
      toast({ title: "Please state your grounds for appeal", variant: "destructive" });
      return;
    }
    save(
      notices.map((n) =>
        n.id === appealing.id
          ? {
              ...n,
              status: "appealed" as const,
              appeal: {
                grounds: grounds.trim(),
                submittedDate: new Date().toISOString().slice(0, 10),
                status: "submitted" as const,
              },
            }
          : n,
      ),
    );
    toast({ title: "Appeal submitted", description: "HR will review your appeal and respond." });
    setAppealing(null);
    setGrounds("");
  };

  const active = useMemo(() => notices.filter((n) => n.status !== "closed"), [notices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notices</h1>
        <p className="text-sm text-muted-foreground">
          Official notices issued to you, such as a notice of termination. You
          can acknowledge a notice or lodge an appeal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Notices" value={active.length} icon={FileWarning} />
        <StatCard
          label="Awaiting Your Response"
          value={notices.filter((n) => n.status === "issued").length}
          icon={Clock}
        />
        <StatCard
          label="Appeals Lodged"
          value={notices.filter((n) => n.appeal).length}
          icon={Gavel}
        />
      </div>

      {notices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You have no notices.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notices.map((n) => (
          <Card key={n.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {n.type} <span className="text-muted-foreground font-normal">· {n.id}</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Issued {n.issuedDate} by {n.issuedBy} · Effective {n.effectiveDate}
                </p>
              </div>
              <Badge variant="outline" className={statusBadge[n.status]}>
                {n.status === "issued"
                  ? "Awaiting response"
                  : n.status.charAt(0).toUpperCase() + n.status.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{n.reason}</p>

              {n.appeal && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your appeal</span>
                    <Badge variant="outline" className={appealBadge[n.appeal.status]}>
                      {n.appeal.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.appeal.grounds}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {n.appeal.submittedDate}
                  </p>
                  {n.appeal.outcomeNote && (
                    <p className="text-sm">
                      <span className="font-medium">Outcome: </span>
                      {n.appeal.outcomeNote}
                    </p>
                  )}
                </div>
              )}

              {n.status === "issued" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => acknowledge(n.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAppealing(n);
                      setGrounds("");
                    }}
                  >
                    <Gavel className="h-4 w-4 mr-1" /> Appeal
                  </Button>
                </div>
              )}
              {n.status === "acknowledged" && !n.appeal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAppealing(n);
                    setGrounds("");
                  }}
                >
                  <Gavel className="h-4 w-4 mr-1" /> Lodge an appeal
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!appealing} onOpenChange={() => setAppealing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appeal {appealing?.id}</DialogTitle>
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
              Your appeal will be sent to HR for review. You will be notified of
              the outcome.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppealing(null)}>
              Cancel
            </Button>
            <Button onClick={submitAppeal}>Submit appeal</Button>
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
