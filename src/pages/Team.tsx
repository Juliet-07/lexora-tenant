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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Mail,
  Plus,
  UserPlus,
  MoreHorizontal,
  UserX,
  UserCheck,
  Loader2,
  Shield,
  Search,
  Users,
  UserCheck2,
  Clock,
  Plane,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { TeamMemberDetailSheet } from "@/components/team/TeamMemberDetailSheet";

// ─── Types ────────────────────────────────────────────────────

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  status: string;
  createdAt: string;
}

interface InviteForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
}

// ─── Role config ──────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "tenant_admin", label: "Administrator" },
  { value: "tenant_manager", label: "Manager" },
  { value: "tenant_compliance", label: "Compliance Officer" },
  { value: "tenant_finance", label: "Finance Officer" },
  { value: "tenant_support", label: "Support" },
];

const roleLabel = (role: string) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

const roleColor = (role: string) => {
  switch (role) {
    case "tenant_owner":
      return "bg-purple-100 text-purple-700";
    case "tenant_admin":
      return "bg-blue-100 text-blue-700";
    case "tenant_manager":
      return "bg-indigo-100 text-indigo-700";
    case "tenant_compliance":
      return "bg-green-100 text-green-700";
    case "tenant_finance":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "inactive":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const getInitials = (firstName: string, lastName: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

const emptyForm: InviteForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "tenant_support",
};

// ─── Component ────────────────────────────────────────────────

export default function Team() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [detailTarget, setDetailTarget] = useState<TeamMember | null>(null);

  // ── Fetch team members ────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await api.get("/tenant/team", { params: { limit: 100 } });
      const d = res.data?.data ?? res.data;
      return (d?.items ?? d ?? []) as TeamMember[];
    },
    staleTime: 30_000,
  });

  const members = (data ?? []).filter((m) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(s) ||
      m.lastName.toLowerCase().includes(s) ||
      m.email.toLowerCase().includes(s)
    );
  });

  const { data: teamLeaveCount = 0 } = useQuery({
    queryKey: ["team-leave-pending-count"],
    queryFn: async () => {
      const res = await api.get("/tenant/team/leave", {
        params: { status: "pending" },
      });
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d.length : 0;
    },
    staleTime: 30_000,
  });

  // ── Invite mutation ───────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: () => api.post("/tenant/team", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setInviteOpen(false);
      setForm(emptyForm);
      toast.success(
        "Team member invited. Login credentials sent to their email.",
      );
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to invite team member",
      ),
  });

  // ── Status mutation ───────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tenant/team/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team member status updated.");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Remove mutation ───────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenant/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setRemoveTarget(null);
      toast.success("Team member deactivated.");
    },
    onError: () => toast.error("Failed to remove team member"),
  });

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.role &&
    !inviteMutation.isPending;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${members.length} team member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isAdmin && (
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => {
              setForm(emptyForm);
              setInviteOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Members",
            value: members.length,
            icon: Users,
            color: "from-blue-500 to-cyan-500",
          },
          {
            label: "Active",
            value: members.filter((m) => m.status === "active").length,
            icon: UserCheck2,
            color: "from-emerald-500 to-green-500",
          },
          {
            label: "Pending Invites",
            value: members.filter((m) => m.status === "pending").length,
            icon: Clock,
            color: "from-amber-500 to-orange-500",
          },
          {
            label: "Leave Requests",
            value: teamLeaveCount,
            icon: Plane,
            color: "from-violet-500 to-purple-500",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}
                >
                  <s.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Team grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading team…</span>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground border rounded-xl">
          <UserPlus className="h-8 w-8" />
          <p className="text-sm">
            {search
              ? "No members match your search."
              : "No team members yet. Add your first member."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card
              key={member._id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setDetailTarget(member)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-sm">
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {member.roles.map((r) => (
                        <span
                          key={r}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColor(r)}`}
                        >
                          {r === "tenant_owner" ? "Owner" : roleLabel(r)}
                        </span>
                      ))}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(member.status)}`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin && !member.roles.includes("tenant_owner") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === "inactive" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              statusMutation.mutate({
                                id: member._id,
                                status: "active",
                              })
                            }
                          >
                            <UserCheck className="h-4 w-4 mr-2 text-success" />
                            Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              statusMutation.mutate({
                                id: member._id,
                                status: "inactive",
                              })
                            }
                          >
                            <UserX className="h-4 w-4 mr-2 text-muted-foreground" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setRemoveTarget(member)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Added{" "}
                  {new Date(member.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Invite dialog ── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(v) => {
          setInviteOpen(v);
          if (!v) setForm(emptyForm);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              They will receive an email with login credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Phone (optional)</Label>
              <Input
                className="mt-1.5"
                placeholder="+250700000000"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                You can only assign roles below your own access level.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              disabled={!canSubmit}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Inviting…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove confirm ── */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <strong>
                {removeTarget?.firstName} {removeTarget?.lastName}
              </strong>
              . They will no longer be able to log in. This can be undone by
              reactivating their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                removeTarget && removeMutation.mutate(removeTarget._id)
              }
            >
              {removeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TeamMemberDetailSheet
        member={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
