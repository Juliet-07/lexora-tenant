import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Users, UserPlus, Search, Briefcase, MapPin, Mail, Phone, Calendar, ShieldCheck, TrendingUp, UserMinus, Building2 } from "lucide-react";
import { employees as initial, type Employee } from "@/data/hrMockData";
import { clients } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const statusColor = (s: Employee["status"]) =>
  s === "Active" ? "bg-success/10 text-success border-success/20"
  : s === "On Leave" ? "bg-warning/10 text-warning border-warning/20"
  : s === "Probation" ? "bg-info/10 text-info border-info/20"
  : "bg-destructive/10 text-destructive border-destructive/20";

export default function HREmployees() {
  const [employees, setEmployees] = useState<Employee[]>(initial);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState({ clientId: "", firstName: "", lastName: "", email: "", department: "Engineering", jobTitle: "", employmentType: "Full-time" as Employee["employmentType"] });
  const { toast } = useToast();

  const departments = useMemo(() => Array.from(new Set(employees.map(e => e.department))), [employees]);
  const clientList = useMemo(() => clients.map(c => ({ id: c.id, name: c.name })), []);

  const filtered = employees.filter(e =>
    (clientFilter === "all" || e.clientId === clientFilter) &&
    (dept === "all" || e.department === dept) &&
    (status === "all" || e.status === status) &&
    (`${e.firstName} ${e.lastName} ${e.email} ${e.jobTitle} ${e.clientName}`.toLowerCase().includes(search.toLowerCase()))
  );

  const clientsServed = useMemo(() => new Set(employees.map(e => e.clientId)).size, [employees]);

  const stats = [
    { label: "Total Headcount", value: employees.length, icon: Users, tone: "from-primary to-secondary" },
    { label: "Clients Served", value: clientsServed, icon: Building2, tone: "from-violet-500 to-purple-500" },
    { label: "Active", value: employees.filter(e => e.status === "Active").length, icon: ShieldCheck, tone: "from-emerald-500 to-teal-500" },
    { label: "On Leave", value: employees.filter(e => e.status === "On Leave").length, icon: Calendar, tone: "from-amber-500 to-orange-500" },
  ];

  const handleAdd = () => {
    if (!form.clientId || !form.firstName || !form.lastName || !form.email) {
      toast({ title: "Missing fields", description: "Select a client and fill required fields.", variant: "destructive" });
      return;
    }
    const client = clientList.find(c => c.id === form.clientId)!;
    const nextNum = String(employees.length + 1).padStart(4, "0");
    const e: Employee = {
      id: `EMP-${String(employees.length + 1).padStart(3, "0")}`,
      employeeNumber: `${client.id.replace("CLT-", "C")}-${nextNum}`,
      clientId: client.id, clientName: client.name,
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      phone: "—", department: form.department, jobTitle: form.jobTitle,
      manager: null, employmentType: form.employmentType, status: "Probation",
      location: "Remote", startDate: new Date().toISOString().slice(0, 10),
      birthDate: "—", salary: 0, currency: "USD",
      avatar: (form.firstName[0] + form.lastName[0]).toUpperCase(),
      skills: [], emergencyContact: { name: "—", phone: "—", relation: "—" },
    };
    setEmployees([e, ...employees]);
    setOpen(false);
    setForm({ clientId: "", firstName: "", lastName: "", email: "", department: "Engineering", jobTitle: "", employmentType: "Full-time" });
    toast({ title: "Employee added", description: `${e.firstName} ${e.lastName} added to ${client.name}.` });
  };

  const handleTerminate = (e: Employee) => {
    setEmployees(employees.map(x => x.id === e.id ? { ...x, status: "Terminated" } : x));
    setSelected(null);
    toast({ title: "Employment ended", description: `${e.firstName} ${e.lastName} marked as terminated.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage workforce data on behalf of {clientsServed} client {clientsServed === 1 ? "company" : "companies"} — {employees.length} people across {departments.length} departments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary"><UserPlus className="h-4 w-4 mr-2" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <p className="text-xs text-muted-foreground pt-1">Select the client this employee belongs to. They will be onboarded into that client's HR records.</p>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Client <span className="text-destructive">*</span></Label>
                <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a client…" /></SelectTrigger>
                  <SelectContent>{clientList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>First name</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-1"><Label>Last name</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Work email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Engineering","Product","Design","Sales","Marketing","Operations","Finance","People"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Job title</Label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Employment type</Label>
                <Select value={form.employmentType} onValueChange={(v: any) => setForm({ ...form, employmentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Full-time","Part-time","Contractor","Intern"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={handleAdd} className="bg-gradient-to-r from-primary to-secondary">Create employee</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.tone} flex items-center justify-center`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, email, role, client…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All clients</SelectItem>{clientList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{["all","Active","On Leave","Probation","Terminated"].map(s => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {(() => {
        const groups = filtered.reduce<Record<string, Employee[]>>((acc, e) => {
          (acc[e.clientName] ||= []).push(e);
          return acc;
        }, {});
        const clientNames = Object.keys(groups).sort();
        if (clientNames.length === 0) {
          return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No employees match your filters.</CardContent></Card>;
        }
        return (
          <div className="space-y-6">
            {clientNames.map(cn => (
              <div key={cn} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide">{cn}</h2>
                  <Badge variant="secondary" className="ml-1">{groups[cn].length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groups[cn].map(e => (
                    <Card key={e.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/40" onClick={() => setSelected(e)}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">{e.avatar}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{e.firstName} {e.lastName}</h3><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></div>
                            <p className="text-sm text-muted-foreground truncate">{e.jobTitle}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{e.clientName}</span>
                              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{e.department}</span>
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}


      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg">{selected.avatar}</AvatarFallback></Avatar>
                  <div>
                    <SheetTitle>{selected.firstName} {selected.lastName}</SheetTitle>
                    <SheetDescription>{selected.jobTitle} · {selected.employeeNumber}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <Tabs defaultValue="profile" className="mt-6">
                <TabsList className="grid grid-cols-3 w-full"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="employment">Employment</TabsTrigger><TabsTrigger value="emergency">Emergency</TabsTrigger></TabsList>
                <TabsContent value="profile" className="space-y-3 pt-4">
                  <Row icon={Mail} label="Email" value={selected.email} />
                  <Row icon={Phone} label="Phone" value={selected.phone} />
                  <Row icon={MapPin} label="Location" value={selected.location} />
                  <Row icon={Calendar} label="Birthday" value={selected.birthDate} />
                  <div className="pt-2"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">{selected.skills.length ? selected.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-sm text-muted-foreground">No skills tagged.</span>}</div>
                  </div>
                </TabsContent>
                <TabsContent value="employment" className="space-y-3 pt-4">
                  <Row icon={Briefcase} label="Department" value={selected.department} />
                  <Row icon={Users} label="Manager" value={selected.manager ?? "—"} />
                  <Row icon={Calendar} label="Start date" value={selected.startDate} />
                  <Row icon={ShieldCheck} label="Employment type" value={selected.employmentType} />
                  <Row icon={TrendingUp} label="Salary" value={`${selected.currency} ${selected.salary.toLocaleString()}`} />
                </TabsContent>
                <TabsContent value="emergency" className="space-y-3 pt-4">
                  <Row icon={Users} label="Contact name" value={selected.emergencyContact.name} />
                  <Row icon={Phone} label="Contact phone" value={selected.emergencyContact.phone} />
                  <Row icon={UserPlus} label="Relationship" value={selected.emergencyContact.relation} />
                </TabsContent>
              </Tabs>
              <div className="mt-6 flex justify-between gap-2">
                <Button variant="outline" asChild><Link to={`/hr/payroll?employee=${selected.id}`}>View payslips</Link></Button>
                {selected.status !== "Terminated" && (
                  <Button variant="destructive" onClick={() => handleTerminate(selected)}><UserMinus className="h-4 w-4 mr-2" /> Offboard</Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="flex-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  );
}
