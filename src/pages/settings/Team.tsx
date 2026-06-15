import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Shield, CalendarDays, Clock, Layers } from "lucide-react";

type LeavePolicy = { id: string; type: string; days: number; carryOver: boolean; requiresApproval: boolean };
type Role = { id: string; name: string; description: string; members: number };

const MODULES = [
  { id: "kyc_aml", label: "KYC / AML" },
  { id: "hr_pm", label: "HR & People" },
  { id: "crm", label: "CRM" },
  { id: "grc", label: "GRC" },
];

const PERMISSIONS = [
  "Clients", "Projects", "Employees", "Payroll", "Leave", "Performance", "Billing", "Reports",
];

export default function TeamSettings() {
  const [policies, setPolicies] = useState<LeavePolicy[]>([
    { id: "1", type: "Annual Leave", days: 21, carryOver: true, requiresApproval: true },
    { id: "2", type: "Sick Leave", days: 14, carryOver: false, requiresApproval: false },
    { id: "3", type: "Maternity Leave", days: 90, carryOver: false, requiresApproval: true },
    { id: "4", type: "Paternity Leave", days: 14, carryOver: false, requiresApproval: true },
  ]);

  const [roles, setRoles] = useState<Role[]>([
    { id: "r1", name: "Manager", description: "Full access to assigned clients and projects", members: 4 },
    { id: "r2", name: "Analyst", description: "Read/write on assigned work items", members: 9 },
    { id: "r3", name: "Viewer", description: "Read-only access", members: 3 },
  ]);

  const [activeRole, setActiveRole] = useState<string>("r1");
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({
    kyc_aml: true, hr_pm: true, crm: false, grc: false,
  });
  const [perms, setPerms] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map((p) => [p, true]))
  );

  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [workdays, setWorkdays] = useState("mon_fri");
  const [requireClockIn, setRequireClockIn] = useState(true);

  const togglePolicy = (id: string, k: keyof LeavePolicy) =>
    setPolicies((p) => p.map((x) => (x.id === id ? { ...x, [k]: !x[k as keyof LeavePolicy] } : x)));
  const updatePolicyDays = (id: string, v: number) =>
    setPolicies((p) => p.map((x) => (x.id === id ? { ...x, days: v } : x)));

  return (
    <div className="space-y-6">
      {/* Leave Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Leave policy</CardTitle>
              <CardDescription>Annual entitlements applied to all team members.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {policies.map((p) => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-lg border p-3">
              <div className="md:col-span-4">
                <p className="text-sm font-medium">{p.type}</p>
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <Input
                  type="number"
                  value={p.days}
                  onChange={(e) => updatePolicyDays(p.id, Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">days/year</span>
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-2">
                <Label className="text-xs">Carry over</Label>
                <Switch checked={p.carryOver} onCheckedChange={() => togglePolicy(p.id, "carryOver")} />
              </div>
              <div className="md:col-span-3 flex items-center justify-between gap-2">
                <Label className="text-xs">Needs approval</Label>
                <Switch checked={p.requiresApproval} onCheckedChange={() => togglePolicy(p.id, "requiresApproval")} />
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "Leave policy saved" })}>Save policy</Button>
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
              <CardDescription>Default attendance and clock-in rules.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Working days</Label>
              <Select value={workdays} onValueChange={setWorkdays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <p className="text-sm font-medium">Require clock-in / clock-out</p>
              <p className="text-xs text-muted-foreground">Members must log time daily</p>
            </div>
            <Switch checked={requireClockIn} onCheckedChange={setRequireClockIn} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "Working hours saved" })}>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Roles & permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Roles & permissions</CardTitle>
              <CardDescription>Configure what each role can do.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRole(r.id)}
                className={`text-left rounded-lg border p-3 transition ${
                  activeRole === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="secondary">{r.members}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
              </button>
            ))}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Feature permissions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-md border p-2.5">
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
            <Button onClick={() => toast({ title: "Permissions saved", description: `Updated ${roles.find(r => r.id === activeRole)?.name} role.` })}>
              Save permissions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module access */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Module access</CardTitle>
              <CardDescription>Enable platform modules for your team.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULES.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAccess[m.id] ? "Available to team" : "Hidden from team"}
                </p>
              </div>
              <Switch
                checked={!!moduleAccess[m.id]}
                onCheckedChange={(v) => setModuleAccess((s) => ({ ...s, [m.id]: v }))}
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "Module access updated" })}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
