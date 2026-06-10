import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
} from "lucide-react";
import {
  leaveRequests as initial,
  leaveBalances,
  employees,
  type LeaveRequest,
} from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const typeTone: Record<LeaveRequest["type"], string> = {
  Annual: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Sick: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Maternity: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  Paternity: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  Unpaid: "bg-muted text-muted-foreground",
  Compassionate: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  Study: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function HRLeave() {
  const [requests, setRequests] = useState<LeaveRequest[]>(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "Annual" as LeaveRequest["type"],
    startDate: "",
    endDate: "",
    reason: "",
  });
  const { toast } = useToast();

  // Use first employee as the current user's balance for the dashboard
  const myBalance = leaveBalances[0];

  const approve = (r: LeaveRequest) => {
    setRequests(
      requests.map((x) => (x.id === r.id ? { ...x, status: "Approved" } : x)),
    );
    toast({
      title: "Leave approved",
      description: `${r.employeeName}'s ${r.type.toLowerCase()} leave approved.`,
    });
  };
  const reject = (r: LeaveRequest) => {
    setRequests(
      requests.map((x) => (x.id === r.id ? { ...x, status: "Rejected" } : x)),
    );
    toast({
      title: "Leave rejected",
      description: `${r.employeeName}'s request rejected.`,
    });
  };

  const submit = () => {
    if (!form.startDate || !form.endDate) return;
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(form.endDate).getTime() -
          new Date(form.startDate).getTime()) /
          86400000,
      ) + 1,
    );
    const me = employees[0];
    const r: LeaveRequest = {
      id: `LV-${String(requests.length + 1).padStart(3, "0")}`,
      employeeId: me.id,
      employeeName: `${me.firstName} ${me.lastName}`,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      status: "Pending",
      reason: form.reason,
      approver: me.manager ?? "Zara Mensah",
      submittedDate: new Date().toISOString().slice(0, 10),
    };
    setRequests([r, ...requests]);
    setOpen(false);
    setForm({ type: "Annual", startDate: "", endDate: "", reason: "" });
    toast({
      title: "Request submitted",
      description: `${days}-day leave request awaiting approval.`,
    });
  };

  const pending = requests.filter((r) => r.status === "Pending");
  const upcoming = requests.filter(
    (r) => r.status === "Approved" && new Date(r.startDate) > new Date(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            Balances, requests and team calendar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(
          [
            {
              k: "annual",
              label: "Annual",
              color: "from-blue-500 to-cyan-500",
            },
            { k: "sick", label: "Sick", color: "from-rose-500 to-red-500" },
            {
              k: "personal",
              label: "Personal",
              color: "from-violet-500 to-purple-600",
            },
          ] as const
        ).map((b) => {
          const bal = (myBalance as any)[b.k];
          const pct = (bal.taken / bal.total) * 100;
          return (
            <Card key={b.k}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {b.label} Leave
                    </p>
                    <p className="text-2xl font-bold">
                      {bal.remaining}{" "}
                      <span className="text-sm text-muted-foreground font-normal">
                        of {bal.total} days
                      </span>
                    </p>
                  </div>
                  <div
                    className={`h-10 w-10 rounded-lg bg-gradient-to-br ${b.color} flex items-center justify-center`}
                  >
                    <Plane className="h-5 w-5 text-white" />
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {bal.taken} days taken this year
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            <Badge variant="secondary" className="ml-2">
              {pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2">
          {pending.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                All caught up — no pending leave requests.
              </CardContent>
            </Card>
          )}
          {pending.map((r) => (
            <RequestRow
              key={r.id}
              r={r}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-2">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              r={r}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Who's Out — Next 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nobody else is scheduled to be out.
                </p>
              )}
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b pb-2 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                        {r.employeeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.startDate} → {r.endDate} ({r.days}d)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={typeTone[r.type]}>
                    {r.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestRow({
  r,
  onApprove,
  onReject,
}: {
  r: LeaveRequest;
  onApprove: (r: LeaveRequest) => void;
  onReject: (r: LeaveRequest) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">
              {r.employeeName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {r.employeeName}{" "}
              <Badge
                variant="outline"
                className={typeTone[r.type] + " ml-1 text-[10px]"}
              >
                {r.type}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              {r.startDate} → {r.endDate} · {r.days}d ·{" "}
              {r.reason || "No reason given"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              r.status === "Approved"
                ? "bg-success/10 text-success border-success/20"
                : r.status === "Rejected"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : r.status === "Cancelled"
                    ? "bg-muted text-muted-foreground"
                    : "bg-warning/10 text-warning border-warning/20"
            }
          >
            <Clock className="h-3 w-3 mr-1 inline" />
            {r.status}
          </Badge>
          {r.status === "Pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-success"
                onClick={() => onApprove(r)}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => onReject(r)}
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
