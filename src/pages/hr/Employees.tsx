import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Search,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  TrendingUp,
  UserMinus,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEmployeesGrouped,
  fetchDepartments,
  fetchCorporateClients,
  fetchEmployeeById,
  createEmployee,
  terminateEmployee,
  type Employee,
  type CreateEmployeeDto,
  type EmployeeClientGroup,
} from "@/lib/hr-api";

// ─── Helpers ──────────────────────────────────────────────────

const statusColor = (s: string) =>
  s === "active"
    ? "bg-success/10 text-success border-success/20"
    : s === "on_leave"
      ? "bg-warning/10 text-warning border-warning/20"
      : s === "suspended"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : s === "terminated" || s === "resigned"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-info/10 text-info border-info/20"; // probation / other

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "Active",
    on_leave: "On Leave",
    suspended: "Suspended",
    terminated: "Terminated",
    resigned: "Resigned",
  };
  return map[s] ?? s;
};

const avatarColors = [
  "from-primary to-secondary",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-blue-500 to-indigo-500",
  "from-pink-500 to-rose-500",
];

const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

const emptyForm: CreateEmployeeDto = {
  clientId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  employmentType: "full_time",
  startDate: "",
  salary: undefined,
  salaryCurrency: "RWF",
  nationality: "",
};

// ─── Row helper for the detail sheet ─────────────────────────

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

export default function HREmployees() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<CreateEmployeeDto>(emptyForm);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateForm, setTerminateForm] = useState({
    reason: "",
    status: "terminated" as "terminated" | "resigned",
  });

  // ── Queries ───────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["hr-employees", search, clientFilter, deptFilter, statusFilter],
    queryFn: () =>
      fetchEmployeesGrouped({
        search: search || undefined,
        clientId: clientFilter !== "all" ? clientFilter : undefined,
        department: deptFilter !== "all" ? deptFilter : undefined,
        employmentStatus: statusFilter !== "all" ? statusFilter : undefined,
      }),
    staleTime: 30_000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments"],
    queryFn: fetchDepartments,
    staleTime: 5 * 60_000,
  });

  const { data: corporateClients = [] } = useQuery({
    queryKey: ["hr-corporate-clients"],
    queryFn: fetchCorporateClients,
    staleTime: 5 * 60_000,
  });

  // ── Create mutation ───────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => createEmployee(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-departments"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast.success("Employee added. Login credentials sent to their email.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add employee"),
  });

  // ── Terminate mutation ────────────────────────────────────
  const terminateMutation = useMutation({
    mutationFn: () =>
      terminateEmployee(selected!._id, {
        endDate: new Date().toISOString().slice(0, 10),
        reason: terminateForm.reason,
        status: terminateForm.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setSelected(null);
      setTerminateOpen(false);
      toast.success("Employment ended successfully.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to terminate employee",
      ),
  });

  const stats = data?.stats;
  const groups = data?.groups ?? [];

  const clientOptions = groups.map((g) => g.client);

  const canSubmit =
    !!form.clientId &&
    !!form.firstName &&
    !!form.lastName &&
    !!form.email &&
    !!form.jobTitle &&
    !!form.startDate &&
    !createMutation.isPending;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `Manage workforce data on behalf of ${stats?.clientsServed ?? 0} client ${
                  stats?.clientsServed === 1 ? "company" : "companies"
                } — ${stats?.totalHeadcount ?? 0} ${
                  stats?.totalHeadcount === 1 ? "person" : "people"
                } across ${departments.length} department${departments.length !== 1 ? "s" : ""}.`}
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Headcount",
            value: stats?.totalHeadcount ?? 0,
            icon: Users,
            tone: "from-primary to-secondary",
          },
          {
            label: "Clients Served",
            value: stats?.clientsServed ?? 0,
            icon: Building2,
            tone: "from-violet-500 to-purple-500",
          },
          {
            label: "Active",
            value: stats?.active ?? 0,
            icon: ShieldCheck,
            tone: "from-emerald-500 to-teal-500",
          },
          {
            label: "On Leave",
            value: stats?.onLeave ?? 0,
            icon: Calendar,
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, role, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
              <SelectItem value="resigned">Resigned</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Grouped employee list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading employees…</span>
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {search ||
            clientFilter !== "all" ||
            deptFilter !== "all" ||
            statusFilter !== "all"
              ? "No employees match your filters."
              : "No employees yet. Add your first employee."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.client._id} className="space-y-3">
              {/* Client group header */}
              <div className="flex items-center gap-2 px-1">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {group.client.businessName}
                </h2>
                <Badge variant="secondary" className="ml-1">
                  {group.employees.length}
                </Badge>
              </div>

              {/* Employee cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.employees.map((emp) => {
                  const initials = getInitials(emp.firstName, emp.lastName);
                  const color = getAvatarColor(emp.firstName + emp.lastName);
                  const location = [emp.address?.city, emp.address?.country]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <Card
                      key={emp._id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/40"
                      onClick={() => setSelected(emp)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback
                              className={`bg-gradient-to-br ${color} text-white font-semibold`}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm truncate">
                                {emp.firstName} {emp.lastName}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${statusColor(emp.employmentStatus)}`}
                              >
                                {statusLabel(emp.employmentStatus)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {emp.jobTitle}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {group.client.businessName}
                              </span>
                              {emp.department && (
                                <span className="inline-flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {emp.department}
                                </span>
                              )}
                              {location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {location}
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
            </div>
          ))}
        </div>
      )}

      {/* ── Add Employee Dialog ── */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setForm(emptyForm);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Select the client this employee belongs to. They will be onboarded
              into that client's HR records and receive login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Client */}
            <div className="col-span-2 space-y-1">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {corporateClients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No corporate clients found
                    </SelectItem>
                  ) : (
                    corporateClients.map((c: any) => {
                      const profileId = c.profile?._id ?? c._id;
                      const name =
                        c.profile?.businessName ?? c.fullName ?? c.email;
                      return (
                        <SelectItem key={profileId} value={profileId}>
                          {name}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>
                First name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.firstName}
                placeholder="John"
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                Last name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.lastName}
                placeholder="Doe"
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>

            {/* Email + Phone */}
            <div className="col-span-2 space-y-1">
              <Label>
                Work email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                placeholder="john@company.com"
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone ?? ""}
                placeholder="+250700000000"
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>

            {/* Job title + Department */}
            <div className="space-y-1">
              <Label>
                Job title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.jobTitle}
                placeholder="Software Engineer"
                onChange={(e) =>
                  setForm((f) => ({ ...f, jobTitle: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select
                value={form.department ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Engineering",
                    "Product",
                    "Design",
                    "Sales",
                    "Marketing",
                    "Operations",
                    "Finance",
                    "People",
                    "Legal",
                    "Other",
                  ].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment type + Start date */}
            <div className="space-y-1">
              <Label>Employment type</Label>
              <Select
                value={form.employmentType ?? "full_time"}
                onValueChange={(v: any) =>
                  setForm((f) => ({ ...f, employmentType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Start date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>

            {/* Salary + Currency */}
            <div className="space-y-1">
              <Label>Salary (optional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="500000"
                value={form.salary ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    salary: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select
                value={form.salaryCurrency ?? "RWF"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, salaryCurrency: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RWF">RWF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!canSubmit}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                "Create employee"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Employee Detail Sheet ── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback
                      className={`bg-gradient-to-br ${getAvatarColor(selected.firstName + selected.lastName)} text-white font-bold text-lg`}
                    >
                      {getInitials(selected.firstName, selected.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>
                      {selected.firstName} {selected.lastName}
                    </SheetTitle>
                    <SheetDescription>
                      {selected.jobTitle} · {selected.employeeNumber}
                    </SheetDescription>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                      <Building2 className="h-3 w-3" />
                      {/* Client name comes from the group — look it up */}
                      {groups.find((g) =>
                        g.employees.some((e) => e._id === selected._id),
                      )?.client.businessName ?? "—"}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="profile" className="mt-6">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-1 pt-4">
                  <Row icon={Mail} label="Email" value={selected.email} />
                  <Row icon={Phone} label="Phone" value={selected.phone} />
                  <Row
                    icon={MapPin}
                    label="Location"
                    value={[selected.address?.city, selected.address?.country]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <Row
                    icon={Calendar}
                    label="Date of birth"
                    value={
                      selected.dateOfBirth
                        ? new Date(selected.dateOfBirth).toLocaleDateString(
                            "en-GB",
                          )
                        : null
                    }
                  />
                  <Row
                    icon={ShieldCheck}
                    label="Nationality"
                    value={selected.nationality}
                  />
                  <Row
                    icon={Users}
                    label="National ID"
                    value={selected.nationalId}
                  />
                </TabsContent>

                <TabsContent value="employment" className="space-y-1 pt-4">
                  <Row
                    icon={Briefcase}
                    label="Department"
                    value={selected.department}
                  />
                  <Row
                    icon={Users}
                    label="Reports to"
                    value={selected.reportsTo}
                  />
                  <Row
                    icon={Calendar}
                    label="Start date"
                    value={new Date(selected.startDate).toLocaleDateString(
                      "en-GB",
                    )}
                  />
                  <Row
                    icon={Calendar}
                    label="Probation ends"
                    value={
                      selected.probationEndDate
                        ? new Date(
                            selected.probationEndDate,
                          ).toLocaleDateString("en-GB")
                        : null
                    }
                  />
                  <Row
                    icon={ShieldCheck}
                    label="Employment type"
                    value={selected.employmentType?.replace("_", " ")}
                  />
                  <Row
                    icon={TrendingUp}
                    label="Salary"
                    value={
                      selected.salary != null
                        ? `${selected.salaryCurrency} ${selected.salary.toLocaleString()}`
                        : null
                    }
                  />
                  <Row
                    icon={Building2}
                    label="Bank"
                    value={selected.bankName}
                  />
                  <Row
                    icon={Briefcase}
                    label="Bank account"
                    value={selected.bankAccountNumber}
                  />
                  <Row
                    icon={ShieldCheck}
                    label="Tax ID"
                    value={selected.taxId}
                  />
                </TabsContent>

                <TabsContent value="emergency" className="space-y-1 pt-4">
                  <Row
                    icon={Users}
                    label="Contact name"
                    value={selected.emergencyContactName}
                  />
                  <Row
                    icon={Phone}
                    label="Contact phone"
                    value={selected.emergencyContactPhone}
                  />
                </TabsContent>
              </Tabs>

              <div className="mt-6 flex justify-end gap-2">
                {selected.employmentStatus !== "terminated" &&
                  selected.employmentStatus !== "resigned" && (
                    <Button
                      variant="destructive"
                      onClick={() => setTerminateOpen(true)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" /> Offboard
                    </Button>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Terminate / Offboard Dialog ── */}
      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Offboard Employee</DialogTitle>
            <DialogDescription>
              End employment for{" "}
              <strong>
                {selected?.firstName} {selected?.lastName}
              </strong>
              . Their portal access will be revoked immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select
                value={terminateForm.status}
                onValueChange={(v: any) =>
                  setTerminateForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminated">Termination</SelectItem>
                  <SelectItem value="resigned">Resignation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5"
                placeholder="Reason for offboarding…"
                value={terminateForm.reason}
                onChange={(e) =>
                  setTerminateForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !terminateForm.reason.trim() || terminateMutation.isPending
              }
              onClick={() => terminateMutation.mutate()}
            >
              {terminateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
                </>
              ) : (
                "Confirm Offboard"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
