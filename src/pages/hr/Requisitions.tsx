import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  ClipboardList, CheckCircle2, XCircle, Clock, Laptop, Plane, DollarSign,
  UserPlus, GraduationCap, Search, Inbox,
} from "lucide-react";
import {
  useRequisitions, updateRequisition, type Requisition,
} from "@/lib/requisitionsStore";
import { useToast } from "@/hooks/use-toast";

const typeIcon: Record<Requisition["type"], any> = {
  Hiring: UserPlus, Equipment: Laptop, Budget: DollarSign, Travel: Plane, Training: GraduationCap,
};
const priorityTone = (p: Requisition["priority"]) =>
  p === "Urgent" ? "bg-destructive/10 text-destructive border-destructive/20"
  : p === "High" ? "bg-warning/10 text-warning border-warning/20"
  : p === "Medium" ? "bg-info/10 text-info border-info/20"
  : "bg-muted text-muted-foreground";
const statusTone = (s: Requisition["status"]) =>
  s === "Approved" || s === "Fulfilled" ? "bg-success/10 text-success border-success/20"
  : s === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
  : s === "Draft" ? "bg-muted text-muted-foreground"
  : "bg-warning/10 text-warning border-warning/20";

export default function HRRequisitions() {
  const items = useRequisitions();
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const approve = (r: Requisition) => {
    updateRequisition(r.id, {
      status: "Approved",
      approvalChain: r.approvalChain.map((a) => ({
        ...a, status: "Approved", date: new Date().toISOString().slice(0, 10),
      })),
    });
    setSelected(null);
    toast({ title: "Approved", description: `${r.title} approved.` });
  };
  const reject = (r: Requisition) => {
    updateRequisition(r.id, {
      status: "Rejected",
      approvalChain: r.approvalChain.map((a) =>
        a.status === "Pending"
          ? { ...a, status: "Rejected", date: new Date().toISOString().slice(0, 10) }
          : a,
      ),
    });
    setSelected(null);
    toast({ title: "Rejected", description: `${r.title} rejected.` });
  };
  const fulfill = (r: Requisition) => {
    updateRequisition(r.id, { status: "Fulfilled" });
    setSelected(null);
    toast({ title: "Marked fulfilled", description: `${r.title} fulfilled.` });
  };

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        const q = query.trim().toLowerCase();
        const matchesQ =
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        const matchesT = typeFilter === "all" || r.type === typeFilter;
        return matchesQ && matchesT;
      }),
    [items, query, typeFilter],
  );

  const pending = items.filter((r) => !["Approved","Rejected","Fulfilled"].includes(r.status));
  const approvedAll = items.filter((r) => r.status === "Approved" || r.status === "Fulfilled");
  const totalPendingSpend = pending.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve requests submitted by employees. Submissions originate from each employee's workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total" value={items.length} icon={ClipboardList} tone="from-primary to-secondary" />
        <Stat label="Awaiting Approval" value={pending.length} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Approved" value={approvedAll.length} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="Pending Spend" value={`$${totalPendingSpend.toLocaleString()}`} icon={DollarSign} tone="from-violet-500 to-purple-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, employee, department or ID"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["Hiring","Equipment","Budget","Travel","Training"].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending" className="space-y-2">
        <TabsList>
          <TabsTrigger value="pending">Awaiting Approval ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {(["pending","all","approved","rejected"] as const).map((tab) => {
          const list = filtered.filter((r) =>
            tab === "all" ? true
            : tab === "pending" ? !["Approved","Rejected","Fulfilled"].includes(r.status)
            : tab === "approved" ? r.status === "Approved" || r.status === "Fulfilled"
            : r.status === "Rejected",
          );
          return (
            <TabsContent key={tab} value={tab} className="space-y-2">
              {list.length === 0 && (
                <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
                  <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
                  No requisitions in this view.
                </CardContent></Card>
              )}
              {list.map((r) => {
                const Icon = typeIcon[r.type];
                return (
                  <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.id} · {r.type} · {r.department} · by {r.requestedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.amount && <span className="text-sm font-bold">{r.currency} {r.amount.toLocaleString()}</span>}
                        <Badge variant="outline" className={priorityTone(r.priority)}>{r.priority}</Badge>
                        <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.type} · {selected.department} · by {selected.requestedBy} · {selected.submittedDate}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={priorityTone(selected.priority)}>{selected.priority}</Badge>
                  <Badge variant="outline" className={statusTone(selected.status)}>{selected.status}</Badge>
                  {selected.amount && (
                    <Badge variant="outline" className="bg-muted">
                      {selected.currency} {selected.amount.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Justification</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.justification || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Approval Chain</p>
                  <div className="space-y-2">
                    {selected.approvalChain.map((a, i) => (
                      <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium">{a.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.name}{a.date ? ` · ${a.date}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            a.status === "Approved" ? "bg-success/10 text-success border-success/20"
                            : a.status === "Rejected" ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-warning/10 text-warning border-warning/20"
                          }
                        >
                          {a.status === "Approved" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                           : a.status === "Rejected" ? <XCircle className="h-3 w-3 mr-1 inline" />
                           : <Clock className="h-3 w-3 mr-1 inline" />}
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                {selected.status !== "Approved" && selected.status !== "Rejected" && selected.status !== "Fulfilled" && (
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-gradient-to-r from-primary to-secondary" onClick={() => approve(selected)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => reject(selected)}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
                {selected.status === "Approved" && (
                  <Button variant="outline" className="w-full" onClick={() => fulfill(selected)}>
                    Mark as Fulfilled
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </CardContent></Card>
  );
}
