import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Phone, MapPin, Briefcase, CalendarDays, Download, Shield, FileText, Gavel, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Employee, HrTeam, HrLocation } from "@/lib/hr-api";
import { downloadEmployeeReport } from "@/lib/employeeReport";

interface Dispute {
  id: string;
  type: "Grievance" | "Disciplinary" | "Harassment" | "Performance" | "Other";
  title: string;
  filedOn: string;
  status: "Open" | "Investigating" | "Mediation" | "Resolved" | "Escalated";
  note?: string;
}

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null ? (e.teamId as HrTeam).name : "—";
const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? `${(e.locationId as HrLocation).name}`
    : "—";

const statusTone: Record<Dispute["status"], string> = {
  Open: "bg-warning/10 text-warning border-warning/20",
  Investigating: "bg-info/10 text-info border-info/20",
  Mediation: "bg-primary/10 text-primary border-primary/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Escalated: "bg-destructive/10 text-destructive border-destructive/20",
};

export function EmployeeDetailSheet({ employee, onClose }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [openDispute, setOpenDispute] = useState(false);
  const [dForm, setDForm] = useState<Omit<Dispute, "id" | "filedOn" | "status">>({
    type: "Grievance",
    title: "",
    note: "",
  });

  if (!employee) return null;
  const initials = `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();

  const addDispute = () => {
    if (!dForm.title) return toast.error("Add a short title.");
    setDisputes([
      {
        id: `DSP-${disputes.length + 1}`,
        ...dForm,
        filedOn: new Date().toISOString().slice(0, 10),
        status: "Open",
      },
      ...disputes,
    ]);
    setDForm({ type: "Grievance", title: "", note: "" });
    setOpenDispute(false);
    toast.success("Dispute logged.");
  };

  const cycle = (d: Dispute) => {
    const order: Dispute["status"][] = ["Open", "Investigating", "Mediation", "Resolved"];
    const next = order[(order.indexOf(d.status) + 1) % order.length];
    setDisputes(disputes.map((x) => (x.id === d.id ? { ...x, status: next } : x)));
  };

  return (
    <Sheet open={!!employee} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="bg-gradient-to-br from-primary to-secondary text-white p-6">
          <SheetHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white/20">
                <AvatarFallback className="bg-white/10 text-white text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <SheetTitle className="text-white text-xl">
                  {employee.firstName} {employee.lastName}
                </SheetTitle>
                <SheetDescription className="text-white/80">
                  {employee.jobTitle} · {teamName(employee)}
                </SheetDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 capitalize">
                    {employee.employmentStatus?.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/30 capitalize">
                    {employee.employmentType?.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
              onClick={() => {
                downloadEmployeeReport(employee);
                toast.success("Employee report downloaded.");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Download Report
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="disputes">
                Disputes
                {disputes.filter((d) => d.status !== "Resolved").length > 0 && (
                  <span className="ml-1.5 h-4 w-4 rounded-full bg-warning text-white text-[9px] flex items-center justify-center">
                    {disputes.filter((d) => d.status !== "Resolved").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row icon={Mail} label="Email" value={employee.email} />
                  {employee.phone && <Row icon={Phone} label="Phone" value={employee.phone} />}
                  <Row icon={MapPin} label="Location" value={locName(employee)} />
                  <Row icon={Briefcase} label="Team" value={teamName(employee)} />
                  <Row
                    icon={CalendarDays}
                    label="Joined"
                    value={new Date(employee.createdAt ?? Date.now()).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Row icon={Briefcase} label="Job title" value={employee.jobTitle ?? "—"} />
                  <Row icon={Shield} label="Type" value={(employee.employmentType ?? "").replace("_", " ")} />
                  <Row icon={Shield} label="Status" value={(employee.employmentStatus ?? "").replace("_", " ")} />
                  <Row
                    icon={CalendarDays}
                    label="Start date"
                    value={(employee as any).startDate ?? "—"}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes" className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Track grievances, disciplinary cases and mediation outcomes for this employee.
                </p>
                <Button size="sm" onClick={() => setOpenDispute(true)} className="bg-gradient-to-r from-primary to-secondary">
                  <Plus className="h-4 w-4 mr-1" /> Log
                </Button>
              </div>
              {disputes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No disputes on record.
                  </CardContent>
                </Card>
              ) : (
                disputes.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate">{d.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {d.type} · filed {d.filedOn}
                          </p>
                          {d.note && <p className="text-xs mt-2">{d.note}</p>}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${statusTone[d.status]} cursor-pointer`}
                          onClick={() => cycle(d)}
                        >
                          {d.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="docs" className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  {["Employment Contract", "NDA", "ID Verification", "Right to Work"].map((n) => (
                    <div key={n} className="flex items-center justify-between border-b last:border-b-0 py-2">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {n}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3 mr-1" /> View
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={openDispute} onOpenChange={setOpenDispute}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Dispute</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={dForm.type} onValueChange={(v: any) => setDForm({ ...dForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Grievance", "Disciplinary", "Harassment", "Performance", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={dForm.title} onChange={(e) => setDForm({ ...dForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={3} value={dForm.note} onChange={(e) => setDForm({ ...dForm, note: e.target.value })} />
              </div>
              <div className="rounded-md bg-warning/10 border border-warning/20 text-warning text-xs p-2 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This case will be visible to HR admins only.
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addDispute} className="bg-gradient-to-r from-primary to-secondary">Log Dispute</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
