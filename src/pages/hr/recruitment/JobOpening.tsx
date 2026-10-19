import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
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
  DialogTrigger,
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
import { Plus, MapPin, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchTeams, fetchLocations } from "@/lib/hr/hr-api";
import {
  fetchJobOpenings,
  createJobOpening,
  updateJobOpening as updateJobOpeningApi,
  deleteJobOpening as deleteJobOpeningApi,
  type JobOpening,
  type JobOpeningType,
  type JobOpeningStatus,
} from "@/lib/hr/hr-recruitment-api";
import { fmtDate, LoadingRow, EmptyCard } from "./shared";

const JOB_TYPES: JobOpeningType[] = ["Full-time", "Part-time", "Contract"];
const JOB_STATUSES: JobOpeningStatus[] = ["Open", "Interviewing", "Filled"];

const jobStatusTone = (s: JobOpeningStatus) =>
  s === "Open"
    ? "bg-success/10 text-success border-success/20"
    : s === "Interviewing"
      ? "bg-info/10 text-info border-info/20"
      : "bg-muted text-muted-foreground border-border";

const teamDisplayName = (j: JobOpening) =>
  typeof j.teamId === "object" && j.teamId !== null ? j.teamId.name : "—";
const locationDisplayName = (j: JobOpening) =>
  typeof j.locationId === "object" && j.locationId !== null
    ? j.locationId.name
    : "—";
const teamIdOf = (j: JobOpening) =>
  typeof j.teamId === "object" && j.teamId !== null
    ? j.teamId._id
    : ((j.teamId as string | null) ?? "");
const locationIdOf = (j: JobOpening) =>
  typeof j.locationId === "object" && j.locationId !== null
    ? j.locationId._id
    : ((j.locationId as string | null) ?? "");

// ─── Job Openings tab content ──────────────────────────────────

export function JobOpeningTab({
  jobs,
  jobsLoading,
}: {
  jobs: JobOpening[];
  jobsLoading: boolean;
}) {
  return (
    <TabsContent value="openings" className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Keep a record of all open, on-hold, draft and closed roles across your
          organization. All employees are emailed when a new opening is posted,
          and again once it's filled.
        </p>
        <JobOpeningDialog
          trigger={
            <Button
              size="sm"
              variant="outline"
              className="bg-gradient-to-r from-primary to-secondary text-white"
            >
              <Plus className="h-4 w-4" /> New Opening
            </Button>
          }
        />
      </div>
      {jobsLoading ? (
        <LoadingRow label="Loading job openings…" />
      ) : jobs.length === 0 ? (
        <EmptyCard text="No job openings yet. Create one to get started." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <JobOpeningCard key={j._id} job={j} />
          ))}
        </div>
      )}
    </TabsContent>
  );
}

function JobOpeningCard({ job }: { job: JobOpening }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: JobOpeningStatus) =>
      updateJobOpeningApi(job._id, { status }),
    onSuccess: (_updated, status) => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      toast.success(
        status === "Filled"
          ? "Marked as filled — all employees have been notified."
          : `Status set to ${status}.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJobOpeningApi(job._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      toast.success("Opening deleted.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to delete opening"),
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{job.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationDisplayName(job)} · {job.type} · {teamDisplayName(job)}
            </p>
          </div>
          <Select
            value={job.status}
            onValueChange={(v) => statusMutation.mutate(v as JobOpeningStatus)}
          >
            <SelectTrigger
              className={`h-7 w-[130px] text-xs px-2 ${jobStatusTone(job.status)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground line-clamp-2">
          {job.description}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {job.status === "Filled" && job.filledAt
              ? `Filled ${fmtDate(job.filledAt)}`
              : ""}
          </span>
          <span>Posted {fmtDate(job.postedDate)}</span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 border-t">
          <JobOpeningDialog
            job={job}
            trigger={
              <Button variant="ghost" size="sm">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this opening?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{job.title}" from your job
                openings record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function JobOpeningDialog({
  job,
  trigger,
}: {
  job?: JobOpening;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ["hr-teams"],
    queryFn: fetchTeams,
    enabled: open,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["hr-locations"],
    queryFn: fetchLocations,
    enabled: open,
  });

  const [form, setForm] = useState(() => ({
    title: job?.title ?? "",
    teamId: job ? teamIdOf(job) : "",
    locationId: job ? locationIdOf(job) : "",
    type: (job?.type ?? "Full-time") as JobOpeningType,
    description: job?.description ?? "",
  }));

  useEffect(() => {
    if (open && job) {
      setForm({
        title: job.title,
        teamId: teamIdOf(job),
        locationId: locationIdOf(job),
        type: job.type,
        description: job.description ?? "",
      });
    } else if (open && !job) {
      setForm({
        title: "",
        teamId: "",
        locationId: "",
        type: "Full-time",
        description: "",
      });
    }
  }, [open, job]);

  const isEdit = Boolean(job);
  const canSave = form.title.trim().length > 0;

  const createMutation = useMutation({
    mutationFn: () =>
      createJobOpening({
        title: form.title.trim(),
        teamId: form.teamId || undefined,
        locationId: form.locationId || undefined,
        type: form.type,
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      setOpen(false);
      toast.success("Opening created — all employees have been notified.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create opening"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateJobOpeningApi(job!._id, {
        title: form.title.trim(),
        teamId: form.teamId || undefined,
        locationId: form.locationId || undefined,
        type: form.type,
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-openings"] });
      setOpen(false);
      toast.success("Opening updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update opening"),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Opening" : "New Job Opening"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the role details."
              : "New openings start as Open. All employees are emailed as soon as this is created."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Job Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Department (Team)</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) => setForm({ ...form, teamId: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      teams.length === 0 ? "No teams yet" : "Select team"
                    }
                  />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) => setForm({ ...form, locationId: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      locations.length === 0
                        ? "No locations yet"
                        : "Select location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                      {l.city ? ` · ${l.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as JobOpeningType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Short summary of the role…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave || isSubmitting} onClick={handleSave}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isEdit ? "Save Changes" : "Create Opening"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
