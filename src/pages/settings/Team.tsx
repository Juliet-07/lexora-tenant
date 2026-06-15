import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, CalendarDays, Clock, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

interface LeavePolicyEntry {
  type: string;
  days: number;
  carryOver: boolean;
  requiresApproval: boolean;
}

interface WorkingHours {
  startTime: string;
  endTime: string;
  workdays: string;
  requireClockIn: boolean;
}

interface TeamPolicy {
  leavePolicy: LeavePolicyEntry[];
  workingHours: WorkingHours;
}

// ─── Constants ────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  compassionate: "Compassionate Leave",
  study: "Study Leave",
  unpaid: "Unpaid Leave",
};

const DEFAULT_LEAVE_POLICY: LeavePolicyEntry[] = [
  { type: "annual", days: 21, carryOver: true, requiresApproval: true },
  { type: "sick", days: 10, carryOver: false, requiresApproval: false },
  { type: "maternity", days: 90, carryOver: false, requiresApproval: true },
  { type: "paternity", days: 14, carryOver: false, requiresApproval: true },
  { type: "compassionate", days: 5, carryOver: false, requiresApproval: true },
  { type: "study", days: 5, carryOver: false, requiresApproval: true },
  { type: "unpaid", days: 30, carryOver: false, requiresApproval: true },
];

const DEFAULT_WORKING_HOURS: WorkingHours = {
  startTime: "09:00",
  endTime: "17:00",
  workdays: "mon_fri",
  requireClockIn: true,
};

const MODULES = [
  { id: "kyc_aml", label: "KYC / AML" },
  { id: "hr_pm", label: "HR & People" },
  { id: "crm", label: "CRM" },
  { id: "grc", label: "GRC" },
];

const PERMISSIONS = [
  "Clients",
  "Projects",
  "Employees",
  "Payroll",
  "Leave",
  "Performance",
  "Billing",
  "Reports",
];

const ROLES = [
  {
    id: "r1",
    name: "Manager",
    description: "Full access to assigned clients and projects",
    members: 4,
  },
  {
    id: "r2",
    name: "Analyst",
    description: "Read/write on assigned work items",
    members: 9,
  },
  { id: "r3", name: "Viewer", description: "Read-only access", members: 3 },
];

// ─── Component ────────────────────────────────────────────────

export default function TeamSettings() {
  const queryClient = useQueryClient();

  // ── Local state ───────────────────────────────────────────
  const [leavePolicy, setLeavePolicy] =
    useState<LeavePolicyEntry[]>(DEFAULT_LEAVE_POLICY);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    DEFAULT_WORKING_HOURS,
  );
  const [activeRole, setActiveRole] = useState("r1");
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({
    kyc_aml: true,
    hr_pm: true,
    crm: false,
    grc: false,
  });
  const [perms, setPerms] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
  );

  // ── Fetch existing policy ─────────────────────────────────
  const { data: policy, isLoading } = useQuery<TeamPolicy>({
    queryKey: ["team-policy"],
    queryFn: async () => {
      const res = await api.get("/tenant/team/policy");
      return res.data?.data ?? res.data;
    },
    staleTime: 5 * 60_000,
  });

  // Populate local state when policy loads
  useEffect(() => {
    if (policy?.leavePolicy?.length) {
      setLeavePolicy(policy.leavePolicy);
    }
    if (policy?.workingHours) {
      setWorkingHours(policy.workingHours);
    }
  }, [policy]);

  // ── Save leave policy mutation ────────────────────────────
  const saveLeaveMutation = useMutation({
    mutationFn: () => api.patch("/tenant/team/policy/leave", { leavePolicy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-policy"] });
      // Also invalidate team member leave balances so they update immediately
      queryClient.invalidateQueries({ queryKey: ["team-leave-balance"] });
      toast.success("Leave policy saved. Team balances updated.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to save leave policy",
      ),
  });

  // ── Save working hours mutation ───────────────────────────
  const saveHoursMutation = useMutation({
    mutationFn: () =>
      api.patch("/tenant/team/policy/working-hours", workingHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-policy"] });
      toast.success("Working hours saved.");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to save working hours",
      ),
  });

  // ── Helpers ───────────────────────────────────────────────
  const updatePolicy = (
    type: string,
    field: keyof LeavePolicyEntry,
    value: any,
  ) =>
    setLeavePolicy((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [field]: value } : p)),
    );

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Leave Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Leave policy</CardTitle>
              <CardDescription>
                Annual entitlements applied to all team members.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading policy…
            </div>
          ) : (
            leavePolicy.map((p) => (
              <div
                key={p.type}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-lg border p-3"
              >
                {/* Label */}
                <div className="md:col-span-4">
                  <p className="text-sm font-medium">
                    {LEAVE_TYPE_LABELS[p.type] ?? p.type}
                  </p>
                </div>

                {/* Days input */}
                <div className="md:col-span-3 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={p.days}
                    onChange={(e) =>
                      updatePolicy(p.type, "days", Number(e.target.value))
                    }
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    days/year
                  </span>
                </div>

                {/* Carry over */}
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                  <Label className="text-xs">Carry over</Label>
                  <Switch
                    checked={p.carryOver}
                    onCheckedChange={(v) =>
                      updatePolicy(p.type, "carryOver", v)
                    }
                  />
                </div>

                {/* Needs approval */}
                <div className="md:col-span-3 flex items-center justify-between gap-2">
                  <Label className="text-xs">Needs approval</Label>
                  <Switch
                    checked={p.requiresApproval}
                    onCheckedChange={(v) =>
                      updatePolicy(p.type, "requiresApproval", v)
                    }
                  />
                </div>
              </div>
            ))
          )}

          <div className="flex justify-end">
            <Button
              disabled={saveLeaveMutation.isPending}
              onClick={() => saveLeaveMutation.mutate()}
            >
              {saveLeaveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Save policy"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Working hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Working hours</CardTitle>
              <CardDescription>
                Default attendance and clock-in rules.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input
                type="time"
                value={workingHours.startTime}
                onChange={(e) =>
                  setWorkingHours((w) => ({ ...w, startTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input
                type="time"
                value={workingHours.endTime}
                onChange={(e) =>
                  setWorkingHours((w) => ({ ...w, endTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Working days</Label>
              <Select
                value={workingHours.workdays}
                onValueChange={(v) =>
                  setWorkingHours((w) => ({ ...w, workdays: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mon_fri">Mon – Fri</SelectItem>
                  <SelectItem value="mon_sat">Mon – Sat</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">
                Require clock-in / clock-out
              </p>
              <p className="text-xs text-muted-foreground">
                Members must log time daily
              </p>
            </div>
            <Switch
              checked={workingHours.requireClockIn}
              onCheckedChange={(v) =>
                setWorkingHours((w) => ({ ...w, requireClockIn: v }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              disabled={saveHoursMutation.isPending}
              onClick={() => saveHoursMutation.mutate()}
            >
              {saveHoursMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roles & permissions — static for now */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Roles & permissions</CardTitle>
              <CardDescription>
                Configure what each role can do.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`text-left rounded-lg border p-3 transition ${
                  activeRole === r.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="secondary">{r.members}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.description}
                </p>
              </button>
            ))}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Feature permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-md border p-2.5"
                >
                  <span className="text-sm">{p}</span>
                  <Switch
                    checked={!!perms[p]}
                    onCheckedChange={(v) => setPerms((s) => ({ ...s, [p]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                toast.success(
                  `Permissions saved for ${ROLES.find((r) => r.id === activeRole)?.name}.`,
                )
              }
            >
              Save permissions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module access — static for now */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Module access</CardTitle>
              <CardDescription>
                Enable platform modules for your team.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAccess[m.id]
                    ? "Available to team"
                    : "Hidden from team"}
                </p>
              </div>
              <Switch
                checked={!!moduleAccess[m.id]}
                onCheckedChange={(v) =>
                  setModuleAccess((s) => ({ ...s, [m.id]: v }))
                }
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => toast.success("Module access updated.")}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
