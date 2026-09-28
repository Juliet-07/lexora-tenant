import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  addCommitteeMember,
  addCommitteeTask,
  createCommittee,
  deleteCommittee,
  fetchBoardMembers,
  fetchCommittees,
  fetchGovernanceCodes,
  fetchMeetings,
  removeCommitteeMember,
  updateCommitteeDetails,
  updateCommitteeTaskStatus,
  type BoardMember,
  type Committee,
  type CommitteeMemberRole,
  type CommitteeTaskStatus,
} from "@/lib/grc/governance-api";

// A small searchable "type to filter, click to pick" combobox shared by the
// member and charter pickers below — plain Select doesn't scale once a
// tenant has more than a handful of board members or governance codes.
function ComboPicker({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="scrollbar-hide">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      value === o.value ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div className="flex flex-col">
                    <span>{o.label}</span>
                    {o.sublabel && (
                      <span className="text-[11px] text-muted-foreground">
                        {o.sublabel}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const shortDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not scheduled";
const toDateInputValue = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const percentage = (c: Committee) =>
  c.tasks.length
    ? Math.round(
        (c.tasks.filter((t) => t.status === "Done").length / c.tasks.length) *
          100,
      )
    : 0;

export default function GrcCommittees() {
  const qc = useQueryClient();
  const { data: committees = [], isLoading } = useQuery({
    queryKey: ["grc-committees"],
    queryFn: fetchCommittees,
    retry: 1,
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ["grc-meetings"],
    queryFn: fetchMeetings,
    retry: 1,
  });
  const { data: codes = [] } = useQuery({
    queryKey: ["grc-gov-codes"],
    queryFn: fetchGovernanceCodes,
    retry: 1,
  });
  const { data: boardMembers = [] } = useQuery({
    queryKey: ["grc-board-members"],
    queryFn: fetchBoardMembers,
    retry: 1,
  });
  const publishedCodes = codes.filter((c) => c.status === "Published");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    purpose: "",
    cadence: "Quarterly",
    quorum: "Majority of voting members",
    charter: "",
  });
  const [member, setMember] = useState<{
    boardMemberId: string;
    role: CommitteeMemberRole;
  }>({ boardMemberId: "", role: "Member" });
  const [task, setTask] = useState({
    title: "",
    ownerBoardMemberId: "",
    dueDate: "",
  });
  const [editing, setEditing] = useState(false);
  const selected = committees.find((c) => c._id === selectedId);
  const relatedMeetings = useMemo(
    () =>
      selected
        ? meetings
            .filter((m) => m.committeeId === selected._id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [meetings, selected],
  );
  const nextDate = selected
    ? (relatedMeetings
        .filter((m) => new Date(m.date).getTime() >= Date.now())
        .sort((a, b) => a.date.localeCompare(b.date))[0]?.date ??
      selected.nextMeeting)
    : null;
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["grc-committees"] });
  const failure = (error: unknown) =>
    toast({
      title: "Could not save committee change",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });
  const create = useMutation({
    mutationFn: () =>
      createCommittee({
        name: createForm.name.trim(),
        purpose: createForm.purpose.trim(),
        cadence: createForm.cadence,
        quorum: createForm.quorum,
        charter: createForm.charter.trim(),
      }),
    onSuccess: (c) => {
      invalidate();
      setSelectedId(c._id);
      setNewOpen(false);
      setCreateForm({
        name: "",
        purpose: "",
        cadence: "Quarterly",
        quorum: "Majority of voting members",
        charter: "",
      });
      toast({ title: "Committee created" });
    },
    onError: failure,
  });
  const updateDetails = useMutation({
    mutationFn: (
      change: Partial<{
        cadence: string;
        quorum: string;
        charter: string;
        nextMeeting: string | null;
      }>,
    ) => updateCommitteeDetails(selected?._id ?? "", change),
    onSuccess: invalidate,
    onError: failure,
  });
  const addMember = useMutation({
    mutationFn: () => addCommitteeMember(selected?._id ?? "", member),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["grc-board-members"] });
      setMember({ boardMemberId: "", role: "Member" });
      toast({ title: "Member added" });
    },
    onError: failure,
  });
  const removeMember = useMutation({
    mutationFn: (index: number) =>
      removeCommitteeMember(selected?._id ?? "", index),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["grc-board-members"] });
    },
    onError: failure,
  });
  const addTask = useMutation({
    mutationFn: () =>
      addCommitteeTask(selected?._id ?? "", {
        title: task.title.trim(),
        ownerBoardMemberId: task.ownerBoardMemberId,
        dueDate: task.dueDate,
      }),
    onSuccess: () => {
      invalidate();
      setTask({ title: "", ownerBoardMemberId: "", dueDate: "" });
      toast({ title: "Task added" });
    },
    onError: failure,
  });
  const setStatus = useMutation({
    mutationFn: ({
      index,
      status,
    }: {
      index: number;
      status: CommitteeTaskStatus;
    }) => updateCommitteeTaskStatus(selected?._id ?? "", index, status),
    onSuccess: invalidate,
    onError: failure,
  });
  const removeCommittee = useMutation({
    mutationFn: () => deleteCommittee(selected?._id ?? ""),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      setEditing(false);
      toast({ title: "Committee deleted" });
    },
    onError: failure,
  });
  const submitMember = () => {
    if (!selected || !member.boardMemberId)
      return toast({
        title: "Select a board member",
        variant: "destructive",
      });
    addMember.mutate();
  };
  const submitTask = () => {
    if (
      !selected ||
      !task.title.trim() ||
      !task.ownerBoardMemberId ||
      !task.dueDate
    )
      return toast({
        title: "Task, owner and due date required",
        variant: "destructive",
      });
    addTask.mutate();
  };
  const submitCreate = () => {
    if (!createForm.name.trim())
      return toast({
        title: "Committee name required",
        variant: "destructive",
      });
    if (!boardMembers.length)
      return toast({
        title: "Add a board member first",
        description:
          "A committee can't be created until at least one board member exists.",
        variant: "destructive",
      });
    create.mutate();
  };
  const submitDelete = () => {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.name}? This cannot be undone.`))
      return;
    removeCommittee.mutate();
  };
  const meetingCount = (id: string) =>
    meetings.filter((m) => m.committeeId === id && m.status === "Held").length;
  const completed = committees.reduce(
    (n, c) => n + c.tasks.filter((t) => t.status === "Done").length,
    0,
  );
  const total = committees.reduce((n, c) => n + c.tasks.length, 0);

  if (isLoading)
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading committees…
      </div>
    );
  return (
    <div className="space-y-6">
      {selected ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedId(null);
              setEditing(false);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Committees
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant={selected.charter ? "secondary" : "outline"}>
                {selected.charter ? "On track" : "Charter pending"}
              </Badge>
              <h1 className="text-2xl font-bold">{selected.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selected.purpose || "No mandate description yet."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/grc/governance/codes">
                  <FileText className="mr-2 h-4 w-4" />
                  Governance codes
                </Link>
              </Button>
              <Button
                onClick={() =>
                  document.getElementById("committee-task-title")?.focus()
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={removeCommittee.isPending}
                onClick={submitDelete}
                aria-label="Delete committee"
                title="Delete committee"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3">
              <h2 className="font-semibold">
                Members{" "}
                <span className="text-muted-foreground font-normal">
                  ({selected.members.length})
                </span>
              </h2>
              <div className="rounded-md border bg-card divide-y">
                {selected.members.map((m, i) => (
                  <div
                    key={m.boardMemberId ?? `${m.email}-${i}`}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                      {m.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{m.name}</span>
                        <Badge variant="outline">{m.role}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${m.name}`}
                      title="Remove member"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {!selected.members.length && (
                  <p className="p-4 text-sm text-muted-foreground">
                    No members yet.
                  </p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <ComboPicker
                  value={member.boardMemberId}
                  onChange={(v) => setMember({ ...member, boardMemberId: v })}
                  options={boardMembers
                    .filter(
                      (bm) =>
                        !selected.members.some(
                          (m) => m.boardMemberId === bm._id,
                        ),
                    )
                    .map((bm) => ({
                      value: bm._id,
                      label: bm.name,
                      sublabel: bm.role,
                    }))}
                  placeholder="Select a board member…"
                  searchPlaceholder="Search board members…"
                  emptyText="No board members available to add."
                />
                <Select
                  value={member.role}
                  onValueChange={(v) =>
                    setMember({ ...member, role: v as CommitteeMemberRole })
                  }
                >
                  <SelectTrigger aria-label="Member role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Chair", "Secretary", "Member"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={addMember.isPending || !member.boardMemberId}
                  onClick={submitMember}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </section>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Committee details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing((v) => !v)}
                >
                  {editing ? "Done" : "Edit details"}
                </Button>
              </div>
              <div className="rounded-md border bg-card p-4 space-y-3 text-sm">
                {editing ? (
                  <>
                    <div>
                      <Label>Mandate / linked charter</Label>
                      <ComboPicker
                        value={
                          publishedCodes.find(
                            (c) => c.title === selected.charter,
                          )?._id ?? ""
                        }
                        onChange={(id) => {
                          const code = publishedCodes.find((c) => c._id === id);
                          updateDetails.mutate({
                            charter: code?.title ?? "",
                          });
                        }}
                        options={publishedCodes.map((c) => ({
                          value: c._id,
                          label: c.title,
                          sublabel: c.category,
                        }))}
                        placeholder="Select a governance code…"
                        searchPlaceholder="Search published codes…"
                        emptyText="No published governance codes yet."
                      />
                    </div>
                    <div>
                      <Label>Meeting cadence</Label>
                      <Select
                        value={selected.cadence}
                        onValueChange={(v) =>
                          updateDetails.mutate({ cadence: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Monthly",
                            "Quarterly",
                            "Bi-annually",
                            "Annually",
                            "Bi-annually & as needed",
                            "As needed",
                          ].map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quorum</Label>
                      <Input
                        value={selected.quorum}
                        onChange={(e) =>
                          updateDetails.mutate({ quorum: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Next meeting (if not linked)</Label>
                      <Input
                        type="date"
                        value={toDateInputValue(selected.nextMeeting)}
                        onChange={(e) =>
                          updateDetails.mutate({
                            nextMeeting: e.target.value || null,
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Detail
                      label="Mandate"
                      value={selected.charter || "Charter not linked"}
                    />
                    <Detail label="Cadence" value={selected.cadence} />
                    <Detail label="Quorum" value={selected.quorum} />
                    <Detail label="Next meeting" value={shortDate(nextDate)} />
                    <Detail
                      label="Meetings held YTD"
                      value={String(meetingCount(selected._id))}
                    />
                  </>
                )}
              </div>
            </section>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold">Tasks & responsibilities</h2>
            <div className="overflow-x-auto rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.tasks.map((t, i) => (
                    <TableRow key={`${t.title}-${i}`}>
                      <TableCell
                        className={
                          t.status === "Done"
                            ? "line-through text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {t.title}
                      </TableCell>
                      <TableCell>{t.owner}</TableCell>
                      <TableCell>{shortDate(t.dueDate)}</TableCell>
                      <TableCell>
                        <Select
                          value={t.status}
                          onValueChange={(v) =>
                            setStatus.mutate({
                              index: i,
                              status: v as CommitteeTaskStatus,
                            })
                          }
                        >
                          <SelectTrigger
                            className="w-32 h-8"
                            aria-label={`Status for ${t.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Open", "In Progress", "Done"].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!selected.tasks.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No tasks yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_150px_auto]">
              <Input
                id="committee-task-title"
                placeholder="Task title"
                aria-label="Task title"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
              />
              <Select
                value={task.ownerBoardMemberId}
                onValueChange={(v) =>
                  setTask({ ...task, ownerBoardMemberId: v })
                }
              >
                <SelectTrigger aria-label="Task owner">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  {selected.members.map((m) => (
                    <SelectItem
                      key={m.boardMemberId ?? m.email}
                      value={m.boardMemberId ?? "_legacy"}
                      disabled={!m.boardMemberId}
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                  {!selected.members.length && (
                    <SelectItem value="_none" disabled>
                      Add a member first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="Due date"
                value={task.dueDate}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
              />
              <Button
                variant="outline"
                disabled={addTask.isPending}
                onClick={submitTask}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent meetings</h2>
              <Button variant="link" asChild>
                <Link to="/grc/governance/meetings">View meetings</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {relatedMeetings.length ? (
                relatedMeetings.slice(0, 5).map((m) => (
                  <div
                    key={m._id}
                    className="flex flex-wrap items-center gap-4 border-b py-3"
                  >
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {shortDate(m.date)} ·{" "}
                        {m.location || m.venue || "Location not set"}
                      </p>
                    </div>
                    <Badge variant="outline">{m.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No linked meetings yet. Schedule one in Meetings and select
                  this committee.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Committees</h1>
              <p className="text-sm text-muted-foreground">
                Mandates, membership, meeting cadence, and open tasks for each
                board committee.
              </p>
            </div>
            <Button
              onClick={() => setNewOpen(true)}
              disabled={!boardMembers.length}
              title={
                boardMembers.length
                  ? undefined
                  : "Add a board member before creating a committee"
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New committee
            </Button>
          </div>
          {!boardMembers.length && (
            <p className="rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              You need at least one board member before you can create a
              committee.{" "}
              <Link
                to="/grc/governance/board"
                className="font-medium text-primary underline underline-offset-2"
              >
                Add a board member
              </Link>
              .
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={Users2}
              label="Active committees"
              value={committees.length}
            />
            <Metric
              icon={ClipboardList}
              label="Total open tasks"
              value={total - completed}
            />
            <Metric
              icon={CheckCircle2}
              label="Task completion"
              value={`${total ? Math.round((completed / total) * 100) : 0}%`}
            />
            <Metric
              icon={FileText}
              label="Charters missing"
              value={committees.filter((c) => !c.charter).length}
            />
          </div>
          <div className="space-y-3">
            {committees.map((c) => {
              const linked = meetings
                .filter(
                  (m) =>
                    m.committeeId === c._id &&
                    new Date(m.date).getTime() >= Date.now(),
                )
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              return (
                <Button
                  key={c._id}
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal px-5 py-4 text-left font-normal transition-colors hover:border-primary"
                  onClick={() => setSelectedId(c._id)}
                >
                  <div className="w-full min-w-0 space-y-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {c.name}
                      </span>
                      <Badge variant={c.charter ? "secondary" : "outline"}>
                        {c.charter ? "On track" : "Charter pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chair: {c.chair || "Not assigned"} · {c.members.length}{" "}
                      members · {c.cadence} · Next:{" "}
                      {shortDate(linked?.date ?? c.nextMeeting)} · Mandate:{" "}
                      {c.charter || "Not linked"}
                    </p>
                    <Progress value={percentage(c)} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {c.tasks.filter((t) => t.status === "Done").length}/
                      {c.tasks.length} tasks complete
                    </p>
                  </div>
                </Button>
              );
            })}
            {!committees.length && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No committees yet. Create one to get started.
              </p>
            )}
          </div>
        </>
      )}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New committee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="committee-name">Committee name</Label>
              <Input
                id="committee-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="committee-purpose">Mandate / purpose</Label>
              <Textarea
                id="committee-purpose"
                value={createForm.purpose}
                onChange={(e) =>
                  setCreateForm({ ...createForm, purpose: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Meeting cadence</Label>
              <Select
                value={createForm.cadence}
                onValueChange={(v) =>
                  setCreateForm({ ...createForm, cadence: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Monthly",
                    "Quarterly",
                    "Bi-annually",
                    "Annually",
                    "Bi-annually & as needed",
                    "As needed",
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="committee-quorum">Quorum</Label>
              <Input
                id="committee-quorum"
                value={createForm.quorum}
                onChange={(e) =>
                  setCreateForm({ ...createForm, quorum: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="committee-charter">
                Linked charter or governance code
              </Label>
              <ComboPicker
                value={
                  publishedCodes.find((c) => c.title === createForm.charter)
                    ?._id ?? ""
                }
                onChange={(id) => {
                  const code = publishedCodes.find((c) => c._id === id);
                  setCreateForm({ ...createForm, charter: code?.title ?? "" });
                }}
                options={publishedCodes.map((c) => ({
                  value: c._id,
                  label: c.title,
                  sublabel: c.category,
                }))}
                placeholder="Select a governance code…"
                searchPlaceholder="Search published codes…"
                emptyText="No published governance codes yet."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add members and tasks after creating the committee.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={submitCreate}>
              {create.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create committee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users2;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-accent p-2 text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
