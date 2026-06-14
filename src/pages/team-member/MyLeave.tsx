import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  Plane,
  Heart,
  Baby,
  Sun,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeaveType = "Annual" | "Sick" | "Parental" | "Compassionate" | "Unpaid";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

interface LeaveRequest {
  id: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approver: string;
  submittedAt: string;
  comment?: string;
}

const balances: { type: LeaveType; entitled: number; taken: number; tone: string; icon: any }[] = [
  { type: "Annual", entitled: 21, taken: 8, tone: "from-blue-500 to-cyan-500", icon: Sun },
  { type: "Sick", entitled: 10, taken: 2, tone: "from-rose-500 to-red-500", icon: Heart },
  { type: "Parental", entitled: 90, taken: 0, tone: "from-pink-500 to-fuchsia-500", icon: Baby },
  { type: "Compassionate", entitled: 5, taken: 1, tone: "from-violet-500 to-purple-600", icon: Plane },
];

const initial: LeaveRequest[] = [
  { id: "lr1", type: "Annual", from: "2026-07-06", to: "2026-07-10", days: 5, reason: "Family vacation", status: "Approved", approver: "Sarah Lee (Manager)", submittedAt: "2026-06-01" },
  { id: "lr2", type: "Sick", from: "2026-05-22", to: "2026-05-22", days: 1, reason: "Flu", status: "Approved", approver: "Sarah Lee (Manager)", submittedAt: "2026-05-22" },
  { id: "lr3", type: "Annual", from: "2026-08-15", to: "2026-08-19", days: 5, reason: "Personal", status: "Pending", approver: "Sarah Lee (Manager)", submittedAt: "2026-06-10" },
  { id: "lr4", type: "Compassionate", from: "2026-04-18", to: "2026-04-18", days: 1, reason: "Family funeral", status: "Approved", approver: "Sarah Lee (Manager)", submittedAt: "2026-04-17" },
];

const teamCalendar = [
  { name: "Marco Bianchi", type: "Annual", dates: "Jun 16 – Jun 20" },
  { name: "Amelia Okonkwo", type: "Sick", dates: "Jun 14" },
  { name: "Noah Petrov", type: "Annual", dates: "Jun 23 – Jul 2" },
];

const statusBadge = (s: LeaveStatus) =>
  s === "Approved" ? "bg-success/10 text-success border-success/20"
  : s === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
  : s === "Cancelled" ? "bg-muted text-muted-foreground border-border"
  : "bg-warning/10 text-warning border-warning/20";

const statusIcon = (s: LeaveStatus) =>
  s === "Approved" ? CheckCircle2 : s === "Rejected" ? XCircle : s === "Cancelled" ? XCircle : Clock;

export default function MyLeave() {
  const [requests, setRequests] = useState<LeaveRequest[]>(initial);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ type: "Annual" as LeaveType, from: "", to: "", reason: "" });
  const { toast } = useToast();

  const days = (a: string, b: string) =>
    a && b ? Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1) : 0;

  const submit = () => {
    if (!draft.from || !draft.to || !draft.reason.trim()) return;
    const r: LeaveRequest = {
      id: `lr-${Date.now()}`,
      type: draft.type,
      from: draft.from,
      to: draft.to,
      days: days(draft.from, draft.to),
      reason: draft.reason,
      status: "Pending",
      approver: "Sarah Lee (Manager)",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    setRequests([r, ...requests]);
    setOpen(false);
    setDraft({ type: "Annual", from: "", to: "", reason: "" });
    toast({ title: "Leave request submitted", description: "Your manager will be notified." });
  };

  const cancel = (id: string) => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: "Cancelled" as const } : r)));
    toast({ title: "Request cancelled" });
  };

  const upcoming = requests.filter((r) => r.status === "Approved" && new Date(r.from) >= new Date());
  const pending = requests.filter((r) => r.status === "Pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Leave</h1>
          <p className="text-sm text-muted-foreground">Request time off, view balances, and track your team's calendar.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Request Leave
        </Button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => {
          const remaining = b.entitled - b.taken;
          const pct = (b.taken / b.entitled) * 100;
          return (
            <Card key={b.type}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{b.type}</p>
                    <p className="text-2xl font-bold mt-1">{remaining}<span className="text-sm font-normal text-muted-foreground"> / {b.entitled} days</span></p>
                  </div>
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${b.tone} flex items-center justify-center`}>
                    <b.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-2">{b.taken} taken this year</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="team">Team Calendar</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> All Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pending.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg text-sm mb-3">
                  <AlertCircle className="h-4 w-4" />
                  {pending.length} request{pending.length !== 1 ? "s" : ""} awaiting manager approval.
                </div>
              )}
              {requests.map((r) => {
                const Icon = statusIcon(r.status);
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 py-3 border-b last:border-b-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`h-4 w-4 mt-1 ${r.status === "Approved" ? "text-success" : r.status === "Rejected" ? "text-destructive" : r.status === "Cancelled" ? "text-muted-foreground" : "text-warning"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{r.type} — {r.days} day{r.days !== 1 ? "s" : ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(r.to).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-foreground/80 italic mt-1 truncate">"{r.reason}"</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Approver: {r.approver}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge>
                      {r.status === "Pending" && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(r.id)} className="h-7 text-xs">Cancel</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader><CardTitle className="text-base">Approved Upcoming Leave</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No upcoming approved leave.</p>
              ) : upcoming.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{r.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.from).toLocaleDateString()} – {new Date(r.to).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">{r.days}d</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader><CardTitle className="text-base">Who's Out</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {teamCalendar.map((t) => (
                <div key={t.name} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.dates}</p>
                  </div>
                  <Badge variant="outline">{t.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy">
          <Card>
            <CardHeader><CardTitle className="text-base">Leave Policy Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Annual leave accrues at 1.75 days per month (21 days/year).</p>
              <p>• Sick leave: up to 10 paid days/year. Medical certificate required after 2 consecutive days.</p>
              <p>• Parental leave: 90 days paid for primary caregivers, 14 days for secondary.</p>
              <p>• Requests should be submitted at least 7 days in advance where possible.</p>
              <p>• Carry-over: up to 5 unused annual days into next year.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit to your manager for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as LeaveType })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Annual","Sick","Parental","Compassionate","Unpaid"] as LeaveType[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From</Label><Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="mt-1.5" /></div>
              <div><Label>To</Label><Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="mt-1.5" /></div>
            </div>
            {draft.from && draft.to && (
              <p className="text-xs text-muted-foreground">Duration: <span className="font-medium text-foreground">{days(draft.from, draft.to)} day(s)</span></p>
            )}
            <div><Label>Reason</Label><Textarea value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} className="mt-1.5" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-gradient-to-r from-primary to-secondary">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
