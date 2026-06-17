import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Search,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Plus,
  Globe,
  UsersRound,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  description?: string;
  lead?: string;
}

interface Location {
  id: string;
  name: string;
  country: string;
  city?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  teamId: string;
  locationId: string;
  employmentType: "Full-time" | "Part-time" | "Contractor" | "Intern";
  status: "Active" | "On Leave" | "Probation" | "Terminated";
  startDate: string;
}

// ─── Seed data ────────────────────────────────────────────────

const seedTeams: Team[] = [
  { id: "T1", name: "Engineering", description: "Product engineering", lead: "Amelia Okonkwo" },
  { id: "T2", name: "Product", description: "Product management & design", lead: "Priya Iyer" },
  { id: "T3", name: "Operations", description: "Internal operations", lead: "Chloe Sullivan" },
  { id: "T4", name: "Finance", description: "Finance & accounting", lead: "Noah Petrov" },
];

const seedLocations: Location[] = [
  { id: "L1", name: "Lagos HQ", country: "Nigeria", city: "Lagos" },
  { id: "L2", name: "Kigali Office", country: "Rwanda", city: "Kigali" },
  { id: "L3", name: "Remote — EMEA", country: "Remote" },
  { id: "L4", name: "London", country: "United Kingdom", city: "London" },
];

const seedEmployees: Employee[] = [
  { id: "E1", firstName: "Amelia", lastName: "Okonkwo", email: "amelia@lexora.io", phone: "+234 802 555 0101", jobTitle: "VP of Engineering", teamId: "T1", locationId: "L1", employmentType: "Full-time", status: "Active", startDate: "2022-01-15" },
  { id: "E2", firstName: "Marco", lastName: "Bianchi", email: "marco@lexora.io", phone: "+39 320 555 0202", jobTitle: "Staff Engineer", teamId: "T1", locationId: "L3", employmentType: "Full-time", status: "Active", startDate: "2022-06-01" },
  { id: "E3", firstName: "Priya", lastName: "Iyer", email: "priya@lexora.io", phone: "+91 98765 43210", jobTitle: "Head of Product", teamId: "T2", locationId: "L4", employmentType: "Full-time", status: "Active", startDate: "2022-03-20" },
  { id: "E4", firstName: "Chloe", lastName: "Sullivan", email: "chloe@lexora.io", jobTitle: "Operations Manager", teamId: "T3", locationId: "L2", employmentType: "Full-time", status: "Active", startDate: "2023-02-01" },
  { id: "E5", firstName: "Noah", lastName: "Petrov", email: "noah@lexora.io", jobTitle: "Financial Controller", teamId: "T4", locationId: "L3", employmentType: "Full-time", status: "Active", startDate: "2022-08-22" },
  { id: "E6", firstName: "Liam", lastName: "Walsh", email: "liam@lexora.io", jobTitle: "Backend Engineer", teamId: "T1", locationId: "L4", employmentType: "Full-time", status: "Probation", startDate: "2026-04-01" },
];

// ─── Helpers ──────────────────────────────────────────────────

const statusColor = (s: Employee["status"]) =>
  s === "Active"
    ? "bg-success/10 text-success border-success/20"
    : s === "On Leave"
      ? "bg-warning/10 text-warning border-warning/20"
      : s === "Probation"
        ? "bg-info/10 text-info border-info/20"
        : "bg-destructive/10 text-destructive border-destructive/20";

const initials = (f: string, l: string) =>
  `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// ─── Component ────────────────────────────────────────────────

export default function HREmployees() {
  const [teams, setTeams] = useState<Team[]>(seedTeams);
  const [locations, setLocations] = useState<Location[]>(seedLocations);
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);

  const [tab, setTab] = useState("employees");

  // Filters / search for employees
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [locFilter, setLocFilter] = useState("all");

  // Dialog state
  const [empOpen, setEmpOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  const [empForm, setEmpForm] = useState<Omit<Employee, "id">>({
    firstName: "", lastName: "", email: "", phone: "",
    jobTitle: "", teamId: "", locationId: "",
    employmentType: "Full-time", status: "Active",
    startDate: new Date().toISOString().slice(0, 10),
  });
  const [teamForm, setTeamForm] = useState<Omit<Team, "id">>({ name: "", description: "", lead: "" });
  const [locForm, setLocForm] = useState<Omit<Location, "id">>({ name: "", country: "", city: "" });

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (teamFilter !== "all" && e.teamId !== teamFilter) return false;
      if (locFilter !== "all" && e.locationId !== locFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        e.firstName.toLowerCase().includes(s) ||
        e.lastName.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        e.jobTitle.toLowerCase().includes(s)
      );
    });
  }, [employees, teamFilter, locFilter, search]);

  const teamById = (id: string) => teams.find((t) => t.id === id);
  const locById = (id: string) => locations.find((l) => l.id === id);

  const countByTeam = (id: string) => employees.filter((e) => e.teamId === id).length;
  const countByLocation = (id: string) => employees.filter((e) => e.locationId === id).length;

  // ── Submit handlers ───────────────────────────────────────
  const submitEmployee = () => {
    if (!empForm.firstName || !empForm.lastName || !empForm.email || !empForm.jobTitle || !empForm.teamId || !empForm.locationId) {
      toast.error("Please fill all required fields.");
      return;
    }
    setEmployees((prev) => [...prev, { ...empForm, id: uid("E") }]);
    setEmpOpen(false);
    setEmpForm({
      firstName: "", lastName: "", email: "", phone: "",
      jobTitle: "", teamId: "", locationId: "",
      employmentType: "Full-time", status: "Active",
      startDate: new Date().toISOString().slice(0, 10),
    });
    toast.success("Employee added.");
  };

  const submitTeam = () => {
    if (!teamForm.name) return toast.error("Team name is required.");
    setTeams((prev) => [...prev, { ...teamForm, id: uid("T") }]);
    setTeamOpen(false);
    setTeamForm({ name: "", description: "", lead: "" });
    toast.success("Team created.");
  };

  const submitLocation = () => {
    if (!locForm.name || !locForm.country) return toast.error("Name and country are required.");
    setLocations((prev) => [...prev, { ...locForm, id: uid("L") }]);
    setLocOpen(false);
    setLocForm({ name: "", country: "", city: "" });
    toast.success("Location added.");
  };

  const removeTeam = (id: string) => {
    if (countByTeam(id) > 0) return toast.error("Reassign employees before deleting this team.");
    setTeams((prev) => prev.filter((t) => t.id !== id));
    toast.success("Team removed.");
  };
  const removeLocation = (id: string) => {
    if (countByLocation(id) > 0) return toast.error("Reassign employees before deleting this location.");
    setLocations((prev) => prev.filter((l) => l.id !== id));
    toast.success("Location removed.");
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} people across {teams.length} teams and {locations.length} locations.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Headcount", value: employees.length, icon: Users, tone: "from-primary to-secondary" },
          { label: "Teams", value: teams.length, icon: UsersRound, tone: "from-violet-500 to-purple-500" },
          { label: "Locations", value: locations.length, icon: Globe, tone: "from-emerald-500 to-teal-500" },
          { label: "Active", value: employees.filter((e) => e.status === "Active").length, icon: Briefcase, tone: "from-amber-500 to-orange-500" },
        ].map((s) => (
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        {/* ── Employees tab ── */}
        <TabsContent value="employees" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, email, role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All teams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={locFilter} onValueChange={setLocFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                className="bg-gradient-to-r from-primary to-secondary"
                onClick={() => {
                  if (teams.length === 0) return toast.error("Create a team first.");
                  if (locations.length === 0) return toast.error("Create a location first.");
                  setEmpOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No employees match your filters.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((emp) => {
                const team = teamById(emp.teamId);
                const loc = locById(emp.locationId);
                return (
                  <Card key={emp.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/40">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                            {initials(emp.firstName, emp.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{emp.firstName} {emp.lastName}</h3>
                            <Badge variant="outline" className={`text-[10px] ${statusColor(emp.status)}`}>{emp.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{emp.jobTitle}</p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {team && <span className="inline-flex items-center gap-1"><UsersRound className="h-3 w-3" />{team.name}</span>}
                            {loc && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.name}</span>}
                            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{emp.email}</span>
                            {emp.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{emp.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Teams tab ── */}
        <TabsContent value="teams" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Teams are equivalent to departments. Employees must be assigned to a team.</p>
            <Button className="bg-gradient-to-r from-primary to-secondary" onClick={() => setTeamOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Team
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teams.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{t.name}</h3>
                        <Badge variant="secondary">{countByTeam(t.id)}</Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                      {t.lead && <p className="text-xs mt-2"><span className="text-muted-foreground">Lead:</span> <span className="font-medium">{t.lead}</span></p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTeam(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Locations tab ── */}
        <TabsContent value="locations" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Locations support businesses that operate across multiple countries.</p>
            <Button className="bg-gradient-to-r from-primary to-secondary" onClick={() => setLocOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Location
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {locations.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{l.name}</h3>
                        <Badge variant="secondary">{countByLocation(l.id)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[l.city, l.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLocation(l.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Employee Dialog ── */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Assign the employee to a team and location.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={empForm.firstName} onChange={(e) => setEmpForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={empForm.lastName} onChange={(e) => setEmpForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Email *</Label>
              <Input type="email" value={empForm.email} onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={empForm.phone} onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Job Title *</Label>
              <Input value={empForm.jobTitle} onChange={(e) => setEmpForm((f) => ({ ...f, jobTitle: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Team *</Label>
              <Select value={empForm.teamId} onValueChange={(v) => setEmpForm((f) => ({ ...f, teamId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location *</Label>
              <Select value={empForm.locationId} onValueChange={(v) => setEmpForm((f) => ({ ...f, locationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Employment Type</Label>
              <Select value={empForm.employmentType} onValueChange={(v: any) => setEmpForm((f) => ({ ...f, employmentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={empForm.startDate} onChange={(e) => setEmpForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpOpen(false)}>Cancel</Button>
            <Button onClick={submitEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Team Dialog ── */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Team</DialogTitle>
            <DialogDescription>Teams are the same as departments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={teamForm.description} onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Team Lead</Label>
              <Input value={teamForm.lead} onChange={(e) => setTeamForm((f) => ({ ...f, lead: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>Cancel</Button>
            <Button onClick={submitTeam}>Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Location Dialog ── */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Location</DialogTitle>
            <DialogDescription>Add an office or country where your business operates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input placeholder="e.g. Lagos HQ" value={locForm.name} onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Country *</Label>
              <Input value={locForm.country} onChange={(e) => setLocForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={locForm.city} onChange={(e) => setLocForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocOpen(false)}>Cancel</Button>
            <Button onClick={submitLocation}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
