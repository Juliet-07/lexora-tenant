import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  ShieldAlert,
  GraduationCap,
  ArrowRightLeft,
  Loader2,
  Award,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  UserMinus,
  FileText,
  Upload,
  Users,
  ClipboardList,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchBoardMembers,
  createBoardMember,
  updateBoardMember,
  deleteBoardMember,
  recordConflict,
  resolveConflict,
  logTraining,
  setSuccessor,
  addSkill,
  removeSkill,
  updateRemuneration,
  setCommittees,
  updateAttendance,
  addOtherDirectorship,
  removeOtherDirectorship,
  addBoardMemberDocument,
  removeBoardMemberDocument,
  toggleOnboardingItem,
  initiateSuccession,
  updateSuccessionStage,
  updateRiskAssessment,
  addSuccessionCandidate,
  removeSuccessionCandidate,
  toggleKnowledgeTransferItem,
  initiateOffboarding,
  toggleOffboardingItem,
  resolveGrcFileUrl,
  type BoardMember,
  type BoardMemberRole,
  type BoardMemberTermStatus,
  type ConflictType,
  type TrainingType,
  type BoardDocumentCategory,
  type SuccessionStageName,
  type SuccessionStageStatus,
  BoardSkill,
} from "@/lib/grc/governance-api";
import { SkillLevel } from "@/lib/grcGovernanceLocal";

const ROLES: BoardMemberRole[] = [
  "Chair",
  "Vice-Chair",
  "Executive Director",
  "Non-Executive Director",
  "Independent Director",
  "Alternate Director",
  "Company Secretary (Non-voting)",
];

const STAGE_ORDER: SuccessionStageName[] = [
  "Trigger",
  "NomCo review",
  "Evaluation",
  "Recommendation",
  "AGM approval",
  "Confirmed",
];

const STAGE_DESCRIPTIONS: Record<SuccessionStageName, string> = {
  Trigger:
    "Term expiry within 12 months, resignation, removal, skills gap, or emergency identified and logged.",
  "NomCo review":
    "Nomination Committee reviews the director's performance, attendance, independence, and contribution.",
  Evaluation:
    "Board evaluation results reviewed; independence confirmed; candidates assessed where applicable.",
  Recommendation:
    "Board considers the NomCo recommendation and resolves to recommend re-election or appointment.",
  "AGM approval":
    "Re-election or appointment is put to shareholders for approval at the AGM (or by written resolution).",
  Confirmed:
    "Appointment confirmed; register of directors, RDB and BNR notified; onboarding triggered for a new director.",
};

function termStatusTone(status: BoardMemberTermStatus): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "Onboarding":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "Term expiring":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "Term expired":
      return "bg-rose-500/15 text-rose-700 border-rose-500/30";
    case "Offboarded":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "";
  }
}

export default function GrcBoardMgt() {
  const [newOpen, setNewOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: boardMembers = [], isLoading } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
  });

  const viewing = viewingId
    ? (boardMembers.find((b) => b._id === viewingId) ?? null)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading board members…</span>
      </div>
    );
  }

  if (viewing) {
    return (
      <DirectorDetail
        member={viewing}
        allMembers={boardMembers}
        onBack={() => setViewingId(null)}
      />
    );
  }

  return (
    <BoardList
      boardMembers={boardMembers}
      onOpen={setViewingId}
      newOpen={newOpen}
      setNewOpen={setNewOpen}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────────

function BoardList({
  boardMembers,
  onOpen,
  newOpen,
  setNewOpen,
}: {
  boardMembers: BoardMember[];
  onOpen: (id: string) => void;
  newOpen: boolean;
  setNewOpen: (v: boolean) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const termsSoon = boardMembers.filter(
    (b) => b.termStatus === "Term expiring" || b.termStatus === "Term expired",
  );
  const onboardingCount = boardMembers.filter(
    (b) => b.lifecycleStatus === "Onboarding",
  ).length;
  const openConflicts = boardMembers.reduce(
    (a, b) => a + (b.conflicts ?? []).filter((c) => !c.resolved).length,
    0,
  );
  const withPlans = boardMembers.filter((b) => b.successionPlan);

  const skillCategories = [
    "Finance",
    "Legal",
    "Risk",
    "Strategy",
    "Technology",
    "Governance",
    "Industry",
    "Other",
  ] as const;
  const skillCoverage = skillCategories.map((cat) => ({
    category: cat,
    count: boardMembers.filter((b) =>
      b.skills?.some((s) => s.category === cat && s.qualified),
    ).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Board Management</h1>
          <p className="text-sm text-muted-foreground">
            Directors, succession planning, conflict-of-interest register,
            training and onboarding/offboarding.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New director
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          label="Board members"
          value={boardMembers.length}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          tone="from-primary/15 to-primary/5"
        />
        <StatCard
          label="Onboarding pending"
          value={onboardingCount}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="from-blue-500/15 to-blue-500/5"
        />
        <StatCard
          label="Terms ending / expired"
          value={termsSoon.length}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="from-amber-500/15 to-amber-500/5"
        />
        <StatCard
          label="Open conflicts"
          value={openConflicts}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="from-rose-500/15 to-rose-500/5"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Board composition</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Director</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Committees</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Term ends</TableHead>
                <TableHead>Conflicts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boardMembers.map((b) => (
                <TableRow
                  key={b._id}
                  className="cursor-pointer"
                  onClick={() => onOpen(b._id)}
                >
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{b.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={termStatusTone(b.termStatus)}
                    >
                      {b.termStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {(b.committees ?? []).length === 0
                      ? "—"
                      : (b.committees ?? [])
                          .map((c) => c.name + (c.isChair ? " (Chair)" : ""))
                          .join(", ")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {b.attendancePercentage ?? 100}%
                  </TableCell>
                  <TableCell
                    className={
                      b.termEnds < today ? "text-rose-600 text-xs" : "text-xs"
                    }
                  >
                    {new Date(b.termEnds).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(b.conflicts ?? []).filter((c) => !c.resolved).length}
                  </TableCell>
                </TableRow>
              ))}
              {boardMembers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No board members yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Board skills matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skillCoverage.map((s) => (
              <div key={s.category} className="flex items-center gap-2">
                <span className="text-xs w-20 shrink-0">{s.category}</span>
                <Progress
                  value={
                    boardMembers.length
                      ? (s.count / boardMembers.length) * 100
                      : 0
                  }
                  className="h-2"
                />
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {s.count}/{boardMembers.length}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Succession planning overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Director</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withPlans.map((b) => {
                  const current =
                    b.successionPlan!.stages.find(
                      (s) => s.status === "In progress",
                    ) ??
                    [...b.successionPlan!.stages]
                      .reverse()
                      .find((s) => s.status === "Done");
                  return (
                    <TableRow
                      key={b._id}
                      className="cursor-pointer"
                      onClick={() => onOpen(b._id)}
                    >
                      <TableCell className="text-sm">{b.name}</TableCell>
                      <TableCell className="text-xs">
                        {b.successionPlan!.reference}
                      </TableCell>
                      <TableCell className="text-xs">
                        {current?.name ?? "Not started"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {withPlans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      No succession plans in progress.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <NewDirectorDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function StatCard({ label, value, icon, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center text-primary`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewDirectorDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    name: "",
    role: "Non-Executive Director" as BoardMemberRole,
    email: "",
    appointedAt: new Date().toISOString().slice(0, 10),
    termEnds: new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10),
    bio: "",
    nationality: "",
    idNumber: "",
    taxResidency: "",
    otherDirectorships: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createBoardMember({
        ...f,
        otherDirectorships: f.otherDirectorships
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({
        title: "Director added",
        description:
          "Onboarding checklist created and a Lexora account has been provisioned for them.",
      });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add director",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name)
      return toast({ title: "Name required", variant: "destructive" });
    if (!f.email)
      return toast({ title: "Email required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New director</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Name</Label>
              <Input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Role</Label>
            <Select
              value={f.role}
              onValueChange={(v) => setF({ ...f, role: v as BoardMemberRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Appointed</Label>
              <Input
                type="date"
                value={f.appointedAt}
                onChange={(e) => setF({ ...f, appointedAt: e.target.value })}
              />
            </div>
            <div>
              <Label>Term ends</Label>
              <Input
                type="date"
                value={f.termEnds}
                onChange={(e) => setF({ ...f, termEnds: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nationality</Label>
              <Input
                value={f.nationality}
                onChange={(e) => setF({ ...f, nationality: e.target.value })}
              />
            </div>
            <div>
              <Label>National ID / Passport</Label>
              <Input
                value={f.idNumber}
                onChange={(e) => setF({ ...f, idNumber: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Tax residency</Label>
            <Input
              value={f.taxResidency}
              onChange={(e) => setF({ ...f, taxResidency: e.target.value })}
            />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              rows={2}
              value={f.bio}
              onChange={(e) => setF({ ...f, bio: e.target.value })}
            />
          </div>
          <div>
            <Label>Other directorships (one per line)</Label>
            <Textarea
              rows={2}
              value={f.otherDirectorships}
              onChange={(e) =>
                setF({ ...f, otherDirectorships: e.target.value })
              }
            />
          </div>
          <div className="bg-muted/50 border rounded-md p-3 text-xs text-muted-foreground leading-relaxed">
            On save: an onboarding checklist is created, and a Lexora account is
            provisioned for this director (temp password emailed to them —
            sign-in via the dedicated board portal is coming separately).
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save and start onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// DIRECTOR DETAIL VIEW
// ─────────────────────────────────────────────────────────────────

function DirectorDetail({
  member,
  allMembers,
  onBack,
}: {
  member: BoardMember;
  allMembers: BoardMember[];
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [offboardOpen, setOffboardOpen] = useState(false);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBoardMember(member._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Director removed" });
      onBack();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to remove director",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to board
      </Button>

      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{member.name}</h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline">{member.role}</Badge>
            <Badge
              variant="outline"
              className={termStatusTone(member.termStatus)}
            >
              {member.termStatus}
            </Badge>
            <Badge variant="outline">
              Appointed {new Date(member.appointedAt).toLocaleDateString()}
            </Badge>
            <Badge variant="outline">
              Term ends {new Date(member.termEnds).toLocaleDateString()}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {member.lifecycleStatus !== "Offboarded" && (
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => setOffboardOpen(true)}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Offboard
            </Button>
          )}
          <Button
            variant="outline"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Permanently delete ${member.name}'s record?`))
                deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training &amp; CPD</TabsTrigger>
          <TabsTrigger value="conflicts">Conflict register</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="succession">Succession</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding / Offboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab member={member} allMembers={allMembers} />
        </TabsContent>
        <TabsContent value="training" className="mt-4">
          <TrainingTab member={member} />
        </TabsContent>
        <TabsContent value="conflicts" className="mt-4">
          <ConflictsTab member={member} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab member={member} />
        </TabsContent>
        <TabsContent value="succession" className="mt-4">
          <SuccessionTab member={member} allMembers={allMembers} />
        </TabsContent>
        <TabsContent value="onboarding" className="mt-4">
          <OnboardingOffboardingTab member={member} />
        </TabsContent>
      </Tabs>

      <OffboardDialog
        member={member}
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
      />
    </div>
  );
}

function OffboardDialog({
  member,
  open,
  onOpenChange,
}: {
  member: BoardMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    reason: "Term expiry (not renewed)",
    effectiveDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () => initiateOffboarding(member._id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({ title: "Offboarding initiated" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to initiate offboarding",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Offboard {member.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason for departure</Label>
            <Select
              value={f.reason}
              onValueChange={(v) => setF({ ...f, reason: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Term expiry (not renewed)",
                  "Resignation",
                  "Removal by board resolution",
                  "Removal by shareholders",
                  "Disqualification",
                  "Death",
                  "Other",
                ].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Effective date</Label>
            <Input
              type="date"
              value={f.effectiveDate}
              onChange={(e) => setF({ ...f, effectiveDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-md p-3 text-xs text-rose-800 leading-relaxed">
            On confirm: an offboarding checklist is created, this director's
            status changes to Offboarded, and committee memberships are flagged
            for replacement. Lexora account access should be revoked as part of
            working through the checklist.
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirm offboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Overview tab ────────────────────────────────────────────────

function OverviewTab({
  member,
  allMembers,
}: {
  member: BoardMember;
  allMembers: BoardMember[];
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });

  const successorMutation = useMutation({
    mutationFn: (successorId: string | null) =>
      setSuccessor(member._id, successorId),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast({
        title: "Failed to set successor",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Personal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <KV k="Email" v={member.email} />
            <KV k="Nationality" v={member.nationality || "—"} />
            <KV k="National ID / Passport" v={member.idNumber || "—"} />
            <KV k="Tax residency" v={member.taxResidency || "—"} />
            <KV k="Bio" v={member.bio || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Other directorships</CardTitle>
          </CardHeader>
          <CardContent>
            <OtherDirectorshipsEditor member={member} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Committees</CardTitle>
          </CardHeader>
          <CardContent>
            <CommitteesEditor member={member} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceEditor member={member} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Remuneration</CardTitle>
        </CardHeader>
        <CardContent>
          <RemunerationEditor member={member} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs text-muted-foreground">
            Succession plan (immediate successor)
          </Label>
          <Select
            value={
              typeof member.successorId === "object" && member.successorId
                ? member.successorId._id
                : ((member.successorId as string | null) ?? "none")
            }
            onValueChange={(v) =>
              successorMutation.mutate(v === "none" ? null : v)
            }
            disabled={successorMutation.isPending}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="No successor designated" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {allMembers
                .filter((m) => m._id !== member._id)
                .map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name} ({m.role})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Skills matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsMatrixSection
            memberId={member._id}
            role={member.role}
            skills={member.skills}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b last:border-0 pb-1.5 last:pb-0">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function OtherDirectorshipsEditor({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page — a board member from
  // before this field existed has it absent, not [], on the object.
  const otherDirectorships = member.otherDirectorships ?? [];
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
  const addMut = useMutation({
    mutationFn: () => addOtherDirectorship(member._id, value),
    onSuccess: () => {
      invalidate();
      setValue("");
    },
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeOtherDirectorship(member._id, index),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-2">
      {otherDirectorships.map((d, i) => (
        <div
          key={i}
          className="text-xs border rounded px-2 py-1 flex justify-between items-center"
        >
          <span>{d}</span>
          <button onClick={() => removeMut.mutate(i)}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ))}
      {otherDirectorships.length === 0 && (
        <div className="text-xs text-muted-foreground">None recorded.</div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Company — role"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!value || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function CommitteesEditor({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page.
  const committees = member.committees ?? [];
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isChair, setIsChair] = useState(false);
  const mutation = useMutation({
    mutationFn: (committees: { name: string; isChair: boolean }[]) =>
      setCommittees(member._id, committees),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] }),
  });

  const add = () => {
    if (!name.trim()) return;
    mutation.mutate([...committees, { name: name.trim(), isChair }]);
    setName("");
    setIsChair(false);
  };
  const remove = (i: number) => {
    mutation.mutate(committees.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {committees.map((c, i) => (
          <Badge key={i} variant="outline" className="flex items-center gap-1">
            {c.name}
            {c.isChair && " (Chair)"}
            <button onClick={() => remove(i)}>
              <XCircle className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {committees.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No committee assignments.
          </span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Committee name"
        />
        <label className="text-xs flex items-center gap-1.5 shrink-0">
          <Checkbox
            checked={isChair}
            onCheckedChange={(v) => setIsChair(!!v)}
          />
          Chair
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={!name || mutation.isPending}
          onClick={add}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function AttendanceEditor({ member }: { member: BoardMember }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(member.attendancePercentage ?? 100);
  const mutation = useMutation({
    mutationFn: () => updateAttendance(member._id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({ title: "Attendance updated" });
    },
  });

  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-24"
      />
      <span className="text-sm text-muted-foreground">%</span>
      <Button
        size="sm"
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Save
      </Button>
    </div>
  );
}

function RemunerationEditor({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page — a board member from
  // before this field existed has `remuneration` absent, not a zeroed
  // object, on the object returned by the API.
  const remuneration = member.remuneration ?? {
    annualRetainer: 0,
    committeeChairFee: 0,
    meetingAttendanceFee: 0,
    lastReviewedAt: null as string | null,
  };
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    annualRetainer: remuneration.annualRetainer,
    committeeChairFee: remuneration.committeeChairFee,
    meetingAttendanceFee: remuneration.meetingAttendanceFee,
  });
  const mutation = useMutation({
    mutationFn: () => updateRemuneration(member._id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({ title: "Remuneration updated" });
    },
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <Label className="text-xs">Annual retainer</Label>
        <Input
          type="number"
          value={f.annualRetainer}
          onChange={(e) =>
            setF({ ...f, annualRetainer: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label className="text-xs">Committee chair fee</Label>
        <Input
          type="number"
          value={f.committeeChairFee}
          onChange={(e) =>
            setF({ ...f, committeeChairFee: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label className="text-xs">Meeting attendance fee</Label>
        <Input
          type="number"
          value={f.meetingAttendanceFee}
          onChange={(e) =>
            setF({ ...f, meetingAttendanceFee: Number(e.target.value) })
          }
        />
      </div>
      <div className="sm:col-span-3 flex items-center justify-between">
        {remuneration.lastReviewedAt && (
          <span className="text-xs text-muted-foreground">
            Last reviewed{" "}
            {new Date(remuneration.lastReviewedAt).toLocaleDateString()}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

const SKILL_CATEGORIES: BoardSkill["category"][] = [
  "Finance",
  "Legal",
  "Risk",
  "Strategy",
  "Technology",
  "Governance",
  "Industry",
  "Other",
];
const SKILL_LEVELS: SkillLevel[] = ["Basic", "Intermediate", "Expert"];

function SkillsMatrixSection({
  memberId,
  role,
  skills: skillsProp,
}: {
  memberId: string;
  role: BoardMemberRole;
  skills: BoardSkill[];
}) {
  const skills = skillsProp ?? [];
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
  const addMut = useMutation({
    mutationFn: (dto: Parameters<typeof addSkill>[1]) =>
      addSkill(memberId, dto),
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Failed to add credential", variant: "destructive" }),
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeSkill(memberId, index),
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Failed to remove credential", variant: "destructive" }),
  });

  const [f, setF] = useState<{
    name: string;
    category: BoardSkill["category"];
    level: SkillLevel;
    yearsExperience: number;
    qualified: boolean;
    notes: string;
  }>({
    name: "",
    category: "Finance",
    level: "Intermediate",
    yearsExperience: 1,
    qualified: true,
    notes: "",
  });

  const qualifiedCount = skills.filter((s) => s.qualified).length;

  const submit = () => {
    if (!f.name.trim()) {
      toast({ title: "Credential name required", variant: "destructive" });
      return;
    }
    addMut.mutate({ ...f, name: f.name.trim(), notes: f.notes.trim() });
    setF({
      name: "",
      category: "Finance",
      level: "Intermediate",
      yearsExperience: 1,
      qualified: true,
      notes: "",
    });
    toast({ title: "Credential added" });
  };

  return (
    <section>
      <div className="font-medium text-sm mb-2 flex items-center gap-2">
        <Award className="h-4 w-4" />
        Credentials
        <Badge variant="outline" className="ml-auto text-[10px]">
          {qualifiedCount}/{skills.length} qualifying for {role}
        </Badge>
      </div>

      <div className="space-y-1 mb-3">
        {skills.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className="border rounded px-2 py-1.5 flex items-start justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium flex items-center gap-1">
                {s.qualified ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                )}
                <span className="truncate">{s.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex gap-2 flex-wrap mt-0.5">
                <span>{s.category}</span>
                <span>·</span>
                <span>{s.level}</span>
                <span>·</span>
                <span>{s.yearsExperience} yr(s)</span>
              </div>
              {s.notes && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {s.notes}
                </div>
              )}
            </div>
            <button onClick={() => removeMut.mutate(i)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        {skills.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No credentials recorded.
          </div>
        )}
      </div>

      <div className="space-y-2 border rounded p-2 bg-muted/30">
        <Input
          placeholder="Credential (e.g. MBA Finance, CPA, LLB)"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={f.category}
            onValueChange={(v) =>
              setF({ ...f, category: v as BoardSkill["category"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={f.level}
            onValueChange={(v) => setF({ ...f, level: v as SkillLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            placeholder="Years"
            value={f.yearsExperience}
            onChange={(e) =>
              setF({ ...f, yearsExperience: Number(e.target.value) })
            }
          />
        </div>
        <Textarea
          rows={2}
          placeholder="Notes (institution, year, remarks)…"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />
        <div className="flex items-center justify-between">
          <label className="text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.qualified}
              onChange={(e) => setF({ ...f, qualified: e.target.checked })}
            />
            Qualifies for {role} position
          </label>
          <Button size="sm" variant="outline" onClick={submit}>
            Add credential
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Training tab ────────────────────────────────────────────────

function TrainingTab({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page.
  const training = member.training ?? [];
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    title: "",
    type: "Mandatory" as TrainingType,
    provider: "",
    hours: 0,
  });
  const mutation = useMutation({
    mutationFn: () => logTraining(member._id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      setF({ title: "", type: "Mandatory", provider: "", hours: 0 });
      toast({ title: "Training logged" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to log training",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Mandatory training, certifications &amp; CPD log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {training.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{t.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {t.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{t.provider || "—"}</TableCell>
                <TableCell className="text-xs">{t.hours || "—"}</TableCell>
                <TableCell className="text-xs">
                  {new Date(t.completedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs">
                  {t.expiresAt
                    ? new Date(t.expiresAt).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {training.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No training recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Training / certification / CPD activity"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <Select
            value={f.type}
            onValueChange={(v) => setF({ ...f, type: v as TrainingType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["Mandatory", "Certification", "CPD"] as TrainingType[]).map(
                (t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Input
            placeholder="Provider"
            value={f.provider}
            onChange={(e) => setF({ ...f, provider: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Hours (for CPD)"
            value={f.hours}
            onChange={(e) => setF({ ...f, hours: Number(e.target.value) })}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!f.title || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Log
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Conflicts tab ────────────────────────────────────────────────

function ConflictsTab({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page.
  const conflicts = member.conflicts ?? [];
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [type, setType] = useState<ConflictType>("Standing");
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });

  const conflictMutation = useMutation({
    mutationFn: () => recordConflict(member._id, note, type),
    onSuccess: () => {
      invalidate();
      setNote("");
    },
    onError: (err: any) =>
      toast({
        title: "Failed to record disclosure",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const resolveMutation = useMutation({
    mutationFn: (index: number) => resolveConflict(member._id, index),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Conflict-of-interest register
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {conflicts.map((c, i) => (
            <div
              key={i}
              className="text-xs border rounded px-2 py-1.5 flex justify-between items-center gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {c.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      c.resolved
                        ? "text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                        : "text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30"
                    }
                  >
                    {c.resolved ? "Resolved" : "Active"}
                  </Badge>
                  <span className="truncate">{c.note}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">
                  {new Date(c.disclosedAt).toLocaleDateString()}
                </span>
                {!c.resolved && (
                  <button
                    className="text-primary underline"
                    onClick={() => resolveMutation.mutate(i)}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {conflicts.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No disclosures on file.
            </div>
          )}
        </div>
        <Separator />
        <div className="flex gap-2">
          <Select
            value={type}
            onValueChange={(v) => setType(v as ConflictType)}
          >
            <SelectTrigger className="w-40 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standing">Standing</SelectItem>
              <SelectItem value="Meeting-specific">Meeting-specific</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Disclose conflict…"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!note || conflictMutation.isPending}
            onClick={() => conflictMutation.mutate()}
          >
            {conflictMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Record"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Documents tab ────────────────────────────────────────────────

function DocumentsTab({ member }: { member: BoardMember }) {
  // Same lean-read gap as elsewhere on this page.
  const documents = member.documents ?? [];
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<BoardDocumentCategory>(
    "Governance Document",
  );
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      addBoardMemberDocument(member._id, file, category),
    onSuccess: () => {
      invalidate();
      toast({ title: "Document uploaded" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to upload document",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const removeMutation = useMutation({
    mutationFn: (index: number) => removeBoardMemberDocument(member._id, index),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Signed governance documents &amp; regulatory filings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((d, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">
                  {d.fileUrl ? (
                    <a
                      href={resolveGrcFileUrl(d.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {d.name}
                    </a>
                  ) : (
                    d.name
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {d.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{d.uploadedBy}</TableCell>
                <TableCell className="text-xs">
                  {new Date(d.uploadedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <button onClick={() => removeMutation.mutate(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {documents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No documents uploaded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as BoardDocumentCategory)}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Governance Document">
                Governance Document
              </SelectItem>
              <SelectItem value="Regulatory Filing">
                Regulatory Filing
              </SelectItem>
            </SelectContent>
          </Select>
          <label>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <span className="inline-flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 cursor-pointer hover:bg-muted/50">
              {uploadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload document
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Succession tab ──────────────────────────────────────────────

function SuccessionTab({
  member,
  allMembers,
}: {
  member: BoardMember;
  allMembers: BoardMember[];
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });

  const startMutation = useMutation({
    mutationFn: () => initiateSuccession(member._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Succession plan started" });
    },
  });

  if (!member.successionPlan) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <Users className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No succession plan exists yet for {member.name}. Starting one seeds
            the 6-stage workflow (Trigger → NomCo review → Evaluation →
            Recommendation → AGM approval → Confirmed), a risk assessment
            template, and a knowledge-transfer checklist.
          </p>
          <Button
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Start succession plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = member.successionPlan;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {plan.reference} · triggered{" "}
            {new Date(plan.triggeredAt).toLocaleDateString()}
            {plan.triggerType ? ` · ${plan.triggerType}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SuccessionStepper member={member} />
        </CardContent>
      </Card>

      <RiskAssessmentCard member={member} allMembers={allMembers} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Successor candidate pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CandidatesEditor member={member} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Knowledge transfer checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistEditor
            items={plan.knowledgeTransferChecklist}
            onToggle={(i) => toggleKnowledgeTransferItem(member._id, i)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessionStepper({ member }: { member: BoardMember }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<SuccessionStageName | null>(null);
  const [notes, setNotes] = useState("");
  const plan = member.successionPlan!;

  const mutation = useMutation({
    mutationFn: (dto: {
      stageName: SuccessionStageName;
      status: SuccessionStageStatus;
      notes?: string;
    }) => updateSuccessionStage(member._id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
    },
  });

  const toneFor = (status: SuccessionStageStatus) =>
    status === "Done"
      ? "bg-emerald-500 text-white border-emerald-500"
      : status === "In progress"
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted text-muted-foreground border-border";

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {STAGE_ORDER.map((name, i) => {
          const stage = plan.stages.find((s) => s.name === name)!;
          return (
            <button
              key={name}
              className={`flex-1 text-[11px] rounded px-2 py-2 border text-center ${toneFor(stage.status)}`}
              onClick={() => {
                setExpanded(expanded === name ? null : name);
                setNotes(stage.notes);
              }}
            >
              <div className="font-bold">{i + 1}</div>
              {name}
            </button>
          );
        })}
      </div>

      {expanded && (
        <div className="border rounded-md p-3 bg-muted/30 space-y-2">
          <div className="text-sm font-medium">{expanded}</div>
          <p className="text-xs text-muted-foreground">
            {STAGE_DESCRIPTIONS[expanded]}
          </p>
          <Textarea
            rows={2}
            placeholder="Notes for this stage…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Select
              value={plan.stages.find((s) => s.name === expanded)!.status}
              onValueChange={(v) =>
                mutation.mutate({
                  stageName: expanded,
                  status: v as SuccessionStageStatus,
                  notes,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  stageName: expanded,
                  status: plan.stages.find((s) => s.name === expanded)!.status,
                  notes,
                })
              }
            >
              Save notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskAssessmentCard({
  member,
  allMembers,
}: {
  member: BoardMember;
  allMembers: BoardMember[];
}) {
  const queryClient = useQueryClient();
  const ra = member.successionPlan!.riskAssessment;
  const [f, setF] = useState({
    criticality: ra.criticality,
    skillsAtRisk: ra.skillsAtRisk.join(", "),
    committeeRolesAtRisk: ra.committeeRolesAtRisk.join(", "),
    regulatoryImpact: ra.regulatoryImpact,
    diversityImpact: ra.diversityImpact,
    institutionalKnowledgeRating: ra.institutionalKnowledgeRating,
    internalCandidates: ra.internalCandidates,
    externalCandidates: ra.externalCandidates,
    timeToReplaceEstimate: ra.timeToReplaceEstimate,
    interimSuccessorId:
      typeof ra.interimSuccessorId === "object" && ra.interimSuccessorId
        ? ra.interimSuccessorId._id
        : ((ra.interimSuccessorId as string | null) ?? "none"),
    interimNotes: ra.interimNotes,
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateRiskAssessment(member._id, {
        ...f,
        skillsAtRisk: f.skillsAtRisk
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        committeeRolesAtRisk: f.committeeRolesAtRisk
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        interimSuccessorId:
          f.interimSuccessorId === "none" ? null : f.interimSuccessorId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
      toast({ title: "Risk assessment saved" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Succession risk assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Criticality</Label>
            <Select
              value={f.criticality || "Medium"}
              onValueChange={(v) => setF({ ...f, criticality: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Internal candidates</Label>
            <Input
              type="number"
              value={f.internalCandidates}
              onChange={(e) =>
                setF({ ...f, internalCandidates: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label className="text-xs">External candidates</Label>
            <Input
              type="number"
              value={f.externalCandidates}
              onChange={(e) =>
                setF({ ...f, externalCandidates: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Skills at risk (comma separated)</Label>
            <Input
              value={f.skillsAtRisk}
              onChange={(e) => setF({ ...f, skillsAtRisk: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">
              Committee roles at risk (comma separated)
            </Label>
            <Input
              value={f.committeeRolesAtRisk}
              onChange={(e) =>
                setF({ ...f, committeeRolesAtRisk: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Regulatory impact</Label>
            <Textarea
              rows={2}
              value={f.regulatoryImpact}
              onChange={(e) => setF({ ...f, regulatoryImpact: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Diversity impact</Label>
            <Textarea
              rows={2}
              value={f.diversityImpact}
              onChange={(e) => setF({ ...f, diversityImpact: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Institutional knowledge rating</Label>
            <Input
              value={f.institutionalKnowledgeRating}
              onChange={(e) =>
                setF({ ...f, institutionalKnowledgeRating: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Time to replace (estimate)</Label>
            <Input
              value={f.timeToReplaceEstimate}
              onChange={(e) =>
                setF({ ...f, timeToReplaceEstimate: e.target.value })
              }
            />
          </div>
        </div>

        <Separator />

        <div className="text-xs font-medium">
          Emergency succession — interim cover
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Interim successor</Label>
            <Select
              value={f.interimSuccessorId}
              onValueChange={(v) => setF({ ...f, interimSuccessorId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {allMembers
                  .filter((m) => m._id !== member._id)
                  .map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Interim notes</Label>
            <Input
              value={f.interimNotes}
              onChange={(e) => setF({ ...f, interimNotes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Save assessment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CandidatesEditor({ member }: { member: BoardMember }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({ name: "", source: "", availability: "" });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
  const addMut = useMutation({
    mutationFn: () => addSuccessionCandidate(member._id, f),
    onSuccess: () => {
      invalidate();
      setF({ name: "", source: "", availability: "" });
    },
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeSuccessionCandidate(member._id, index),
    onSuccess: invalidate,
  });

  const candidates = member.successionPlan!.candidates;

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>BNR pre-cleared</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((c, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{c.name}</TableCell>
              <TableCell className="text-xs">{c.source || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  {c.bnrPreCleared ? "Yes" : "Not started"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{c.availability || "—"}</TableCell>
              <TableCell className="text-xs">{c.assessmentStatus}</TableCell>
              <TableCell>
                <button onClick={() => removeMut.mutate(i)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </TableCell>
            </TableRow>
          ))}
          {candidates.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-xs text-muted-foreground py-6"
              >
                No candidates identified yet — pipeline maintained as
                contingency.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          placeholder="Candidate name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Input
          placeholder="Source (NomCo referral, board network…)"
          value={f.source}
          onChange={(e) => setF({ ...f, source: e.target.value })}
        />
        <Input
          placeholder="Availability"
          value={f.availability}
          onChange={(e) => setF({ ...f, availability: e.target.value })}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!f.name || addMut.isPending}
        onClick={() => addMut.mutate()}
      >
        Add candidate
      </Button>
    </div>
  );
}

function ChecklistEditor({
  items: itemsProp,
  onToggle,
}: {
  items: { label: string; done: boolean; completedAt: string | null }[];
  onToggle: (index: number) => Promise<any>;
}) {
  // Pre-existing board members created before onboarding/offboarding
  // checklists existed on the schema come back from the backend's
  // .lean() read with these fields absent rather than [] — guard here
  // rather than trusting every caller to do it.
  const items = itemsProp ?? [];
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: onToggle,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["grc-board-members"] }),
  });
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      <Progress
        value={items.length ? (doneCount / items.length) * 100 : 0}
        className="h-2"
      />
      <div className="text-xs text-muted-foreground">
        {doneCount}/{items.length} complete
      </div>
      {items.map((item, i) => (
        <label
          key={i}
          className="flex items-start gap-2 text-sm border-b last:border-0 py-1.5 cursor-pointer"
        >
          <Checkbox
            checked={item.done}
            disabled={mutation.isPending}
            onCheckedChange={() => mutation.mutate(i)}
            className="mt-0.5"
          />
          <span
            className={item.done ? "line-through text-muted-foreground" : ""}
          >
            {item.label}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Onboarding / Offboarding tab ────────────────────────────────

function OnboardingOffboardingTab({ member }: { member: BoardMember }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Director onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistEditor
            items={member.onboardingChecklist}
            onToggle={(i) => toggleOnboardingItem(member._id, i)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Director offboarding</CardTitle>
        </CardHeader>
        <CardContent>
          {member.offboarding ? (
            <div className="space-y-3">
              <div className="text-xs space-y-1">
                <KV k="Reason" v={member.offboarding.reason} />
                <KV
                  k="Effective date"
                  v={
                    member.offboarding.effectiveDate
                      ? new Date(
                          member.offboarding.effectiveDate,
                        ).toLocaleDateString()
                      : "—"
                  }
                />
                {member.offboarding.notes && (
                  <KV k="Notes" v={member.offboarding.notes} />
                )}
              </div>
              <Separator />
              <ChecklistEditor
                items={member.offboarding.checklist}
                onToggle={(i) => toggleOffboardingItem(member._id, i)}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No offboarding process has been initiated. Use the Offboard button
              above when this director departs — it will seed the offboarding
              checklist here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
