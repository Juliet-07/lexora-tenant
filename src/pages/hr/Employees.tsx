import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  Loader2,
  Pencil,
  ClipboardCheck,
  Calculator,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployees,
  fetchEmployeeStats,
  fetchTeams,
  fetchLocations,
  createEmployee,
  createTeam,
  createLocation,
  deleteTeam,
  deleteLocation,
  updateTeam,
  updateLocation,
  calculateGrossUp,
  type Employee,
  type HrTeam,
  type HrLocation,
  type CreateEmployeeDto,
  type EmploymentStatus,
  fetchEmployeesByHierarchyRole,
  promoteManagerToHeadOfDepartment,
  fetchDirectReportsOf,
} from "@/lib/hr-api";
import { EmployeeDetailSheet } from "@/components/hr/EmployeeDetailSheet";
import OnboardingDocumentsTab from "./OnboardingDocuments";

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  probation: "bg-info/10 text-info border-info/20",
  on_leave: "bg-warning/10 text-warning border-warning/20",
  suspended: "bg-orange-100 text-orange-700 border-orange-200",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
  resigned: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  probation: "Probation",
  on_leave: "On Leave",
  suspended: "Suspended",
  terminated: "Terminated",
  resigned: "Resigned",
};

const SALARY_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "RWF",
  "KES",
  "ZAR",
  "GHS",
  "INR",
  "JPY",
];

const initials = (f: string, l: string) =>
  `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase();

const getTeamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : null;

const getLocationName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : null;

// ─── Component ────────────────────────────────────────────────

export default function HREmployees() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [locFilter, setLocFilter] = useState("all");

  // Dialog state
  const [empOpen, setEmpOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  // Delete confirmation state
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<HrTeam | null>(null);
  const [deleteLocTarget, setDeleteLocTarget] = useState<HrLocation | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  // Forms
  const EMPTY_EMP: CreateEmployeeDto = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    teamId: "",
    locationId: "",
    employmentType: "full_time",
    roleLevel: "regular",
    startDate: new Date().toISOString().slice(0, 10),
    salary: undefined,
    salaryCurrency: "USD",
    taxId: undefined,
    allowances: [],
    reportsToManagerId: undefined,
    hierarchyRole: "regular",
  };
  const [empForm, setEmpForm] = useState<CreateEmployeeDto>(EMPTY_EMP);
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
  });
  const [locForm, setLocForm] = useState({ name: "", country: "", city: "" });

  const [salaryEntryMode, setSalaryEntryMode] = useState<
    "basic" | "net_target"
  >("basic");
  const [netTargetInput, setNetTargetInput] = useState("");
  const [replacingHodForTeam, setReplacingHodForTeam] = useState<HrTeam | null>(
    null,
  );

  // ── Queries ───────────────────────────────────────────────

  const { data: statsData } = useQuery({
    queryKey: ["hr-stats"],
    queryFn: fetchEmployeeStats,
    staleTime: 60_000,
  });

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["hr-employees", teamFilter, locFilter, search],
    queryFn: () =>
      fetchEmployees({
        limit: 200,
        teamId: teamFilter !== "all" ? teamFilter : undefined,
        locationId: locFilter !== "all" ? locFilter : undefined,
        search: search || undefined,
      }),
    staleTime: 30_000,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    staleTime: 60_000,
  });

  const { data: locations = [], isLoading: locsLoading } = useQuery({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
    staleTime: 60_000,
  });

  const employees = empData?.items ?? [];

  const pickerTargetRole =
    empForm.hierarchyRole === "manager" ? "head_of_department" : "manager";

  const { data: managerOptions = [], isLoading: managerOptionsLoading } =
    useQuery({
      queryKey: ["hr-employees-by-role", pickerTargetRole],
      queryFn: () => fetchEmployeesByHierarchyRole(pickerTargetRole),
      enabled: empOpen && empForm.hierarchyRole !== "head_of_department",
      staleTime: 30_000,
    });

  const managerOptionsForSelectedTeam = useMemo(
    () =>
      managerOptions.filter((e) => {
        const empTeamId =
          typeof e.teamId === "object" && e.teamId !== null
            ? e.teamId._id
            : e.teamId;
        return empTeamId === empForm.teamId;
      }),
    [managerOptions, empForm.teamId],
  );

  // ── Mutations ─────────────────────────────────────────────
  const createEmpMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setEmpOpen(false);
      setEmpForm(EMPTY_EMP);
      setSalaryEntryMode("basic");
      setNetTargetInput("");
      toast.success("Employee added. Login credentials sent to their email.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add employee"),
  });

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-teams"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setTeamOpen(false);
      setTeamForm({ name: "", description: "" });
      toast.success("Team created.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create team"),
  });

  const createLocMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-locations"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setLocOpen(false);
      setLocForm({ name: "", country: "", city: "" });
      toast.success("Location added.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add location"),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-teams"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setDeleteTeamTarget(null);
      toast.success("Team removed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to remove team"),
  });

  const deleteLocMutation = useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-locations"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      setDeleteLocTarget(null);
      toast.success("Location removed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to remove location"),
  });

  const grossUpMutation = useMutation({
    mutationFn: calculateGrossUp,
    onSuccess: (result) => {
      setEmpForm((f) => ({
        ...f,
        salary: result.grossSalary,
        salaryCurrency: result.currency,
      }));
      toast.success(
        `Basic salary set to ${result.grossSalary.toLocaleString()} ${result.currency} to achieve that net target.`,
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ??
          "Could not calculate gross salary — make sure a payroll policy exists for this location.",
      ),
  });

  const promoteMutation = useMutation({
    mutationFn: promoteManagerToHeadOfDepartment,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hr-teams"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setReplacingHodForTeam(null);
      toast.success(
        `${result.newHod.firstName} ${result.newHod.lastName} is now Head of Department.` +
          (result.reassignedRegulars > 0
            ? ` ${result.reassignedRegulars} employee(s) reassigned.`
            : ""),
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to promote"),
  });

  // ── Stats ─────────────────────────────────────────────────
  const headcount = statsData?.total ?? employees.length;
  const teamCount = statsData?.teamCount ?? teams.length;
  const locationCount = statsData?.locationCount ?? locations.length;
  const activeCount = statsData?.active ?? 0;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {headcount} people across {teamCount} team
            {teamCount !== 1 ? "s" : ""} and {locationCount} location
            {locationCount !== 1 ? "s" : ""}.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Headcount",
            value: headcount,
            icon: Users,
            tone: "from-primary to-secondary",
          },
          {
            label: "Teams",
            value: teamCount,
            icon: UsersRound,
            tone: "from-violet-500 to-purple-500",
          },
          {
            label: "Locations",
            value: locationCount,
            icon: Globe,
            tone: "from-emerald-500 to-teal-500",
          },
          {
            label: "Active",
            value: activeCount,
            icon: Briefcase,
            tone: "from-amber-500 to-orange-500",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.tone} flex items-center justify-center`}
              >
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
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locFilter} onValueChange={setLocFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-gradient-to-r from-primary to-secondary"
                onClick={() => {
                  if (teams.length === 0)
                    return toast.error("Create a team first.");
                  if (locations.length === 0)
                    return toast.error("Create a location first.");
                  setEmpOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </CardContent>
          </Card>

          {empLoading ? (
            <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading employees…</span>
            </div>
          ) : employees.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                {search || teamFilter !== "all" || locFilter !== "all"
                  ? "No employees match your filters."
                  : "No employees yet. Add your first employee."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {employees.map((emp) => {
                const teamName = getTeamName(emp);
                const locName = getLocationName(emp);
                return (
                  <Card
                    key={emp._id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:shadow-md transition-shadow border-l-4 border-l-primary/40 cursor-pointer"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                            {initials(emp.firstName, emp.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">
                              {emp.firstName} {emp.lastName}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${STATUS_COLOR[emp.employmentStatus] ?? ""}`}
                            >
                              {STATUS_LABEL[emp.employmentStatus] ??
                                emp.employmentStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {emp.jobTitle}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {teamName && (
                              <span className="inline-flex items-center gap-1">
                                <UsersRound className="h-3 w-3" /> {teamName}
                              </span>
                            )}
                            {locName && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {locName}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {emp.email}
                            </span>
                            {emp.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {emp.phone}
                              </span>
                            )}
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
            <p className="text-sm text-muted-foreground">
              Teams are equivalent to departments. Employees must be assigned to
              a team.
            </p>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setTeamOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New Team
            </Button>
          </div>

          {teamsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading teams…
            </div>
          ) : teams.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No teams yet. Create your first team before adding employees.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teams.map((t) => (
                <Card key={t._id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <UsersRound className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">{t.name}</h3>
                          <Badge variant="secondary">{t.memberCount}</Badge>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.description}
                          </p>
                        )}
                        {t.headOfDepartment ? (
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Head of Department:
                              </span>{" "}
                              <span className="font-medium">
                                {t.headOfDepartment.firstName}{" "}
                                {t.headOfDepartment.lastName}
                              </span>
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setReplacingHodForTeam(t)}
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1" />{" "}
                              Replace
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs mt-2 text-warning">
                            No Head of Department assigned yet.
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setDeleteTeamTarget(t)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Locations tab ── */}
        <TabsContent value="locations" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Locations support businesses that operate across multiple
              countries.
            </p>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setLocOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New Location
            </Button>
          </div>

          {locsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading locations…
            </div>
          ) : locations.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No locations yet. Create your first location before adding
                employees.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {locations.map((l) => (
                <Card key={l._id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold">{l.name}</h3>
                          <Badge variant="secondary">{l.memberCount}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {[l.city, l.country].filter(Boolean).join(", ")}
                        </p>
                        {l.timezone && (
                          <p className="text-xs text-muted-foreground">
                            {l.timezone}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setDeleteLocTarget(l)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Onboarding tab ── */}
        <TabsContent value="onboarding" className="space-y-4 mt-4">
          <OnboardingDocumentsTab />
        </TabsContent>
      </Tabs>

      {/* ── Add Employee Dialog ── */}
      <Dialog
        open={empOpen}
        onOpenChange={(o) => {
          setEmpOpen(o);
          if (!o) {
            setSalaryEntryMode("basic");
            setNetTargetInput("");
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Assign the employee to a team and location. Login credentials will
              be emailed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label>
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={empForm.firstName}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={empForm.lastName}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={empForm.email}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={empForm.phone ?? ""}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={empForm.jobTitle}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, jobTitle: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                Team <span className="text-destructive">*</span>
              </Label>
              <Select
                value={empForm.teamId ?? ""}
                onValueChange={(v) => setEmpForm((f) => ({ ...f, teamId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={empForm.locationId ?? ""}
                onValueChange={(v) =>
                  setEmpForm((f) => ({ ...f, locationId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Employment Type</Label>
              <Select
                value={empForm.employmentType ?? "full_time"}
                onValueChange={(v: any) =>
                  setEmpForm((f) => ({ ...f, employmentType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contractor</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {empForm.employmentType === "full_time" && (
              <div className="space-y-1">
                <Label>Role Level</Label>
                <Select
                  value={empForm.hierarchyRole ?? "regular"}
                  onValueChange={(v: any) =>
                    setEmpForm((f) => ({
                      ...f,
                      hierarchyRole: v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="head_of_department">
                      Head of Department
                    </SelectItem>
                    <SelectItem value="manager">
                      Manager / Supervisor
                    </SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {empForm.employmentType === "full_time" &&
              (empForm.hierarchyRole === "regular" ||
                empForm.hierarchyRole === "manager") && (
                <div className="space-y-1">
                  <Label>
                    Reports To <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={empForm.reportsToManagerId ?? ""}
                    onValueChange={(v) =>
                      setEmpForm((f) => ({ ...f, reportsToManagerId: v }))
                    }
                    disabled={!empForm.teamId || managerOptionsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !empForm.teamId
                            ? "Select a team first"
                            : empForm.hierarchyRole === "manager"
                              ? "Select Head of Department..."
                              : "Select Manager..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {managerOptionsForSelectedTeam.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          {empForm.hierarchyRole === "manager"
                            ? "No Head of Department in this team yet."
                            : "No Managers in this team yet."}
                        </div>
                      ) : (
                        managerOptionsForSelectedTeam.map((e) => (
                          <SelectItem key={e._id} value={e._id}>
                            {e.firstName} {e.lastName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only showing{" "}
                    {empForm.hierarchyRole === "manager"
                      ? "Heads of Department"
                      : "Managers"}{" "}
                    in the selected team.
                  </p>
                </div>
              )}
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={empForm.startDate}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Probation End Date</Label>
              <Input
                type="date"
                value={empForm.probationEndDate ?? ""}
                onChange={(e) =>
                  setEmpForm((f) => ({
                    ...f,
                    probationEndDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* ── Pay entry mode toggle ── */}
            <div className="space-y-1 col-span-2">
              <div className="flex items-center gap-4">
                <Label className="shrink-0">Pay entry mode</Label>
                <div className="flex gap-1 bg-muted rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setSalaryEntryMode("basic")}
                    className={`px-3 py-1 text-xs rounded-sm transition ${
                      salaryEntryMode === "basic"
                        ? "bg-background shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    Enter basic salary
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryEntryMode("net_target")}
                    className={`px-3 py-1 text-xs rounded-sm transition ${
                      salaryEntryMode === "net_target"
                        ? "bg-background shadow-sm font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    Enter target net pay
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {salaryEntryMode === "basic"
                  ? "The basic salary before any deductions."
                  : "What you want this person to actually receive after deductions — we'll calculate the basic salary needed, using the policy for their selected location."}
              </p>
            </div>

            {salaryEntryMode === "basic" ? (
              <>
                <div className="space-y-1">
                  <Label>Salary Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={empForm.salary ?? ""}
                    onChange={(e) =>
                      setEmpForm((f) => ({
                        ...f,
                        salary:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select
                    value={empForm.salaryCurrency ?? "USD"}
                    onValueChange={(v) =>
                      setEmpForm((f) => ({ ...f, salaryCurrency: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALARY_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Target net pay</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 1600"
                    value={netTargetInput}
                    onChange={(e) => setNetTargetInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={
                      !netTargetInput ||
                      !empForm.locationId ||
                      grossUpMutation.isPending
                    }
                    onClick={() =>
                      grossUpMutation.mutate({
                        targetNet: Number(netTargetInput),
                        locationId: empForm.locationId,
                      })
                    }
                  >
                    {grossUpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    Calculate basic salary
                  </Button>
                </div>

                {!empForm.locationId && (
                  <p className="col-span-2 text-xs text-warning">
                    Select a location first — the gross-up calculation needs
                    that location's payroll policy.
                  </p>
                )}

                {empForm.salary != null && (
                  <>
                    <div className="col-span-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
                      Basic salary set to{" "}
                      <span className="font-medium">
                        {empForm.salary.toLocaleString()}{" "}
                        {empForm.salaryCurrency}
                      </span>{" "}
                      — you can still adjust it manually below if needed.
                    </div>
                    <div className="space-y-1">
                      <Label>Basic Salary (calculated, editable)</Label>
                      <Input
                        type="number"
                        value={empForm.salary}
                        onChange={(e) =>
                          setEmpForm((f) => ({
                            ...f,
                            salary: Number(e.target.value) || undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Currency</Label>
                      <Select
                        value={empForm.salaryCurrency ?? "USD"}
                        onValueChange={(v) =>
                          setEmpForm((f) => ({ ...f, salaryCurrency: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SALARY_CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-1">
              <Label>Tax ID</Label>
              <Input
                value={empForm.taxId ?? ""}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, taxId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <div className="flex items-center justify-between">
                <Label>Allowances (optional)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEmpForm((f) => ({
                      ...f,
                      allowances: [
                        ...(f.allowances ?? []),
                        {
                          key: `allowance_${Date.now()}`,
                          label: "",
                          amount: 0,
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Allowance
                </Button>
              </div>
              {(empForm.allowances ?? []).map((a, i) => (
                <div
                  key={a.key}
                  className="grid grid-cols-[1fr_auto_auto] gap-2 items-center"
                >
                  <Input
                    placeholder="e.g. Transport Allowance"
                    value={a.label}
                    onChange={(e) =>
                      setEmpForm((f) => ({
                        ...f,
                        allowances: f.allowances!.map((x, idx) =>
                          idx === i ? { ...x, label: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    className="w-28"
                    value={a.amount}
                    onChange={(e) =>
                      setEmpForm((f) => ({
                        ...f,
                        allowances: f.allowances!.map((x, idx) =>
                          idx === i
                            ? { ...x, amount: Number(e.target.value) || 0 }
                            : x,
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setEmpForm((f) => ({
                        ...f,
                        allowances: f.allowances!.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {(empForm.allowances ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Not standard practice in Rwanda — leave empty unless this
                  employee receives a fixed allowance (transport, housing, etc).
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={
                !empForm.firstName ||
                !empForm.lastName ||
                !empForm.email ||
                !empForm.jobTitle ||
                !empForm.teamId ||
                !empForm.locationId ||
                ((empForm.hierarchyRole === "regular" ||
                  empForm.hierarchyRole === "manager") &&
                  !empForm.reportsToManagerId) ||
                createEmpMutation.isPending
              }
              onClick={() => createEmpMutation.mutate(empForm)}
            >
              {createEmpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
                </>
              ) : (
                "Add Employee"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Team Dialog ── */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Team</DialogTitle>
            <DialogDescription>
              Teams are equivalent to departments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={teamForm.description}
                onChange={(e) =>
                  setTeamForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!teamForm.name || createTeamMutation.isPending}
              onClick={() => createTeamMutation.mutate(teamForm)}
            >
              {createTeamMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Location Dialog ── */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Location</DialogTitle>
            <DialogDescription>
              Add an office or country where your business operates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Lagos HQ"
                value={locForm.name}
                onChange={(e) =>
                  setLocForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                value={locForm.country}
                onChange={(e) =>
                  setLocForm((f) => ({ ...f, country: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={locForm.city}
                onChange={(e) =>
                  setLocForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !locForm.name || !locForm.country || createLocMutation.isPending
              }
              onClick={() => createLocMutation.mutate(locForm)}
            >
              {createLocMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…
                </>
              ) : (
                "Add Location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Team confirm ── */}
      <AlertDialog
        open={!!deleteTeamTarget}
        onOpenChange={(v) => !v && setDeleteTeamTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove team "{deleteTeamTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTeamTarget?.memberCount
                ? `This team has ${deleteTeamTarget.memberCount} active employee(s). Reassign them before deleting.`
                : "This will permanently remove the team."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={
                (deleteTeamTarget?.memberCount ?? 0) > 0 ||
                deleteTeamMutation.isPending
              }
              onClick={() =>
                deleteTeamTarget &&
                deleteTeamMutation.mutate(deleteTeamTarget._id)
              }
            >
              {deleteTeamMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Location confirm ── */}
      <AlertDialog
        open={!!deleteLocTarget}
        onOpenChange={(v) => !v && setDeleteLocTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove location "{deleteLocTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLocTarget?.memberCount
                ? `This location has ${deleteLocTarget.memberCount} active employee(s). Reassign them before deleting.`
                : "This will permanently remove the location."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={
                (deleteLocTarget?.memberCount ?? 0) > 0 ||
                deleteLocMutation.isPending
              }
              onClick={() =>
                deleteLocTarget && deleteLocMutation.mutate(deleteLocTarget._id)
              }
            >
              {deleteLocMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {replacingHodForTeam && (
        <ReplaceHodDialog
          team={replacingHodForTeam}
          onClose={() => setReplacingHodForTeam(null)}
          onPromote={(dto) => promoteMutation.mutate(dto)}
          promoting={promoteMutation.isPending}
        />
      )}

      <EmployeeDetailSheet
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}

function ReplaceHodDialog({
  team,
  onClose,
  onPromote,
  promoting,
}: {
  team: HrTeam;
  onClose: () => void;
  onPromote: (dto: {
    teamId: string;
    promotedManagerId: string;
    regularsReassignToManagerId?: string;
  }) => void;
  promoting: boolean;
}) {
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [regularsTarget, setRegularsTarget] = useState("");

  // All Managers in THIS team — the only valid promotion candidates.
  const { data: allManagers = [], isLoading: managersLoading } = useQuery({
    queryKey: ["hr-employees-by-role", "manager"],
    queryFn: () => fetchEmployeesByHierarchyRole("manager"),
  });
  const managersInTeam = useMemo(
    () =>
      allManagers.filter((m) => {
        const mTeamId =
          typeof m.teamId === "object" && m.teamId !== null
            ? m.teamId._id
            : m.teamId;
        return mTeamId === team._id;
      }),
    [allManagers, team._id],
  );

  // Once a Manager is selected, check if THEY have Regular reports
  // that need reassigning as part of this same promotion.
  const { data: theirReports = [] } = useQuery({
    queryKey: ["employee-direct-reports", selectedManagerId],
    queryFn: () => fetchDirectReportsOf(selectedManagerId),
    enabled: !!selectedManagerId,
  });

  // Valid targets for the Regular reassignment: any OTHER Manager
  // in this same team (not the one being promoted).
  const otherManagersInTeam = useMemo(
    () => managersInTeam.filter((m) => m._id !== selectedManagerId),
    [managersInTeam, selectedManagerId],
  );

  const needsRegularsTarget = theirReports.length > 0;
  const canSubmit =
    !!selectedManagerId && (!needsRegularsTarget || !!regularsTarget);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Replace Head of Department</DialogTitle>
          <DialogDescription>
            Promote a Manager in {team.name} to Head of Department. The current
            HoD steps down to Manager, reporting to the new HoD.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Promote which Manager?</Label>
            <Select
              value={selectedManagerId}
              onValueChange={(v) => {
                setSelectedManagerId(v);
                setRegularsTarget("");
              }}
              disabled={managersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Manager…" />
              </SelectTrigger>
              <SelectContent>
                {managersInTeam.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No other Managers in this team yet.
                  </div>
                ) : (
                  managersInTeam.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedManagerId && needsRegularsTarget && (
            <div className="space-y-1">
              <Label>
                {theirReports.length} employee(s) report to this Manager. Move
                them to <span className="text-destructive">*</span>
              </Label>
              <Select value={regularsTarget} onValueChange={setRegularsTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select another Manager…" />
                </SelectTrigger>
                <SelectContent>
                  {otherManagersInTeam.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No other Manager available — promote/add one first.
                    </div>
                  ) : (
                    otherManagersInTeam.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {theirReports
                  .map((r) => `${r.firstName} ${r.lastName}`)
                  .join(", ")}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || promoting}
            onClick={() =>
              onPromote({
                teamId: team._id,
                promotedManagerId: selectedManagerId,
                regularsReassignToManagerId: regularsTarget || undefined,
              })
            }
          >
            {promoting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm Promotion"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
