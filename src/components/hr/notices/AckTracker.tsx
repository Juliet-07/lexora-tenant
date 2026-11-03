import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  Building2,
  Download,
  Ellipsis,
  PartyPopper,
  Search,
  Timer,
  TriangleAlert,
  Users,
  X,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/hooks/use-toast";
import {
  NOTICE_ACK_METHODS,
  downloadCsv,
  errMessage,
  fetchNoticeMeta,
  fetchNoticeTracker,
  fetchNoticeTrackerCsv,
  trackerEscalate,
  trackerRemind,
  type EmployeeBrief,
  type TrackerFilters,
} from "@/lib/hr/hr-notices-api";
import { NOTICE_KEY, useConfirm } from "./noticeActions";
import { OfflineDialog } from "./NoticeDrawer";
import {
  Bar,
  Chip,
  Empty,
  Person,
  RECIPIENT_TONE,
  ackColor,
  dayWord,
  daysUntil,
  fmtD,
  rel,
} from "./noticeUi";

const keyOf = (noticeId: string, employeeId: string) =>
  `${noticeId}|${employeeId}`;

export function AckTracker({
  onOpen,
}: {
  onOpen: (id: string, tab?: string) => void;
}) {
  const qc = useQueryClient();
  const [noticeId, setNoticeId] = useState("all");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [offline, setOffline] = useState<{
    noticeId: string;
    ref: string;
    employee: EmployeeBrief;
  } | null>(null);
  const [confirmNode, confirm] = useConfirm();

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filters: TrackerFilters = {
    noticeId,
    dept,
    status,
    search: q || undefined,
  };
  const { data, isLoading } = useQuery({
    queryKey: [NOTICE_KEY, "tracker", filters],
    queryFn: () => fetchNoticeTracker(filters),
    placeholderData: (p) => p,
  });
  const { data: meta } = useQuery({
    queryKey: [NOTICE_KEY, "meta"],
    queryFn: fetchNoticeMeta,
  });

  const rows = data?.rows ?? [];
  const selected = sel.filter((k) =>
    rows.some((r) => keyOf(r.noticeId, r.employee.id) === k),
  );
  const pairs = (keys: string[]) =>
    keys.map((k) => {
      const [n, e] = k.split("|");
      return { noticeId: n, employeeId: e };
    });
  const refresh = () => qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
  const fail = (e: unknown) =>
    toast({ title: errMessage(e), variant: "destructive" });

  const remind = useMutation({
    mutationFn: (keys: string[]) => trackerRemind(pairs(keys)),
    onSuccess: (r) => {
      refresh();
      toast({
        title: `Reminder sent to ${r.reminded} ${r.reminded === 1 ? "person" : "people"}`,
      });
      setSel([]);
    },
    onError: fail,
  });
  const escalate = useMutation({
    mutationFn: (keys: string[]) => trackerEscalate(pairs(keys)),
    onSuccess: (r) => {
      refresh();
      toast({
        title: r.escalated
          ? `Escalated ${r.escalated} to ${r.managers} ${r.managers === 1 ? "manager" : "managers"}`
          : "Nobody to escalate",
      });
      setSel([]);
    },
    onError: fail,
  });

  const csv = async () => {
    try {
      downloadCsv(await fetchNoticeTrackerCsv(filters));
    } catch (e) {
      fail(e);
    }
  };

  const filtered =
    dept !== "all" || status !== "all" || !!q || noticeId !== "all";
  const k = data?.kpis;
  const avg = k?.avgHoursToAcknowledge ?? 0;
  const mcol = (p: number) =>
    p >= 90
      ? "text-emerald-700"
      : p >= 70
        ? "text-amber-700"
        : "text-destructive";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={csv}>
          <Download className="mr-2 h-4 w-4" />
          Download outstanding as CSV
        </Button>
        <Button
          disabled={!rows.length}
          onClick={() =>
            confirm({
              title: "Remind everyone outstanding?",
              text: `A reminder goes to ${rows.length} ${rows.length === 1 ? "person" : "people"} in this view, in the portal and by email where the notice uses email.`,
              label: "Send reminders",
              run: () =>
                remind.mutate(
                  rows.map((r) => keyOf(r.noticeId, r.employee.id)),
                ),
            })
          }
        >
          <BellRing className="mr-2 h-4 w-4" />
          Remind everyone outstanding
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setNoticeId("all")}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] ${noticeId === "all" ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted/60"}`}
        >
          All active notices
          <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
            {data?.notices.length ?? 0}
          </span>
        </button>
        {(data?.notices ?? []).map((n) => (
          <button
            key={n.id}
            title={n.title}
            onClick={() => setNoticeId(n.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] ${noticeId === n.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted/60"}`}
          >
            {n.title.length > 34 ? `${n.title.slice(0, 34)}...` : n.title}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
              {n.ackRate}%
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            i: Users,
            l: "Required",
            v: k?.required ?? 0,
            d: `Acknowledgements across ${k?.noticesInScope ?? 0} ${k?.noticesInScope === 1 ? "notice" : "notices"}`,
            c: "#3b36db",
          },
          {
            i: BadgeCheck,
            l: "Received",
            v: k?.received ?? 0,
            d: `${k?.completion ?? 0}% complete`,
            c: "#b8860b",
          },
          {
            i: TriangleAlert,
            l: "Overdue",
            v: k?.overdue ?? 0,
            d: `${k?.withinDeadline ?? 0} outstanding within deadline`,
            c: "#c62828",
            red: !!k?.overdue,
          },
          {
            i: Timer,
            l: "Average time to acknowledge",
            v:
              avg < 24
                ? `${avg.toFixed(1)} hrs`
                : `${(avg / 24).toFixed(1)} days`,
            d: "From delivery to confirmation",
            c: "#6d28d9",
          },
        ].map((x) => (
          <div
            key={x.l}
            className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: x.c }}
            />
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <x.i className="h-4 w-4" style={{ color: x.c }} />
              {x.l}
            </span>
            <span
              className={`mt-2 block text-3xl font-bold tabular-nums ${x.red ? "text-destructive" : ""}`}
            >
              {x.v}
            </span>
            <span className="text-xs text-muted-foreground">{x.d}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            By department
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Select a department to filter the list
          </span>
        </CardHeader>
        <CardContent>
          {(data?.byDepartment ?? []).map((d) => {
            const id = d.deptId ?? "none";
            const on = dept === d.deptId;
            return (
              <button
                key={id}
                onClick={() => setDept(on || !d.deptId ? "all" : d.deptId)}
                className={`flex w-full items-center gap-4 rounded-lg px-2 py-2 text-left ${on ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <span
                  className={`w-44 truncate text-sm ${on ? "font-semibold" : ""}`}
                >
                  {d.name}
                </span>
                <Bar
                  value={d.rate}
                  color={ackColor(d.rate)}
                  className="flex-1"
                />
                <span
                  className={`w-14 text-right text-xs tabular-nums ${mcol(d.rate)}`}
                >
                  {d.acknowledged}/{d.total}
                </span>
              </button>
            );
          })}
          {!data?.byDepartment.length && (
            <Empty
              icon={Building2}
              title="No active notices need acknowledgement"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <h3 className="mr-2 text-[15px] font-semibold">Outstanding</h3>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search employee or notice"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search outstanding"
            />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[190px]" aria-label="Department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(meta?.departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[210px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outstanding</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="unread">Not opened</SelectItem>
              <SelectItem value="pending">Read, not acknowledged</SelectItem>
            </SelectContent>
          </Select>
          {filtered && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNoticeId("all");
                setDept("all");
                setStatus("all");
                setSearch("");
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-sm">
            <b>{selected.length} selected</b>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => remind.mutate(selected)}
            >
              <BellRing className="mr-1.5 h-3.5 w-3.5" />
              Send reminder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                confirm({
                  title: "Escalate to line managers?",
                  text: "Each person's line manager is told that they have not acknowledged the notice.",
                  label: "Escalate",
                  run: () => escalate.mutate(selected),
                })
              }
            >
              <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
              Escalate to managers
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSel([])}>
              Clear
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-9">
                <Checkbox
                  checked={rows.length > 0 && selected.length === rows.length}
                  onCheckedChange={(c) =>
                    setSel(
                      c
                        ? rows.map((r) => keyOf(r.noticeId, r.employee.id))
                        : [],
                    )
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Line manager</TableHead>
              <TableHead>Notice</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Reminders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const key = keyOf(r.noticeId, r.employee.id);
              const dl = daysUntil(r.deadline);
              const tone = RECIPIENT_TONE[r.status];
              return (
                <TableRow
                  key={key}
                  data-state={selected.includes(key) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(key)}
                      onCheckedChange={(c) =>
                        setSel((cur) =>
                          c ? [...cur, key] : cur.filter((x) => x !== key),
                        )
                      }
                      aria-label={`Select ${r.employee.name}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[230px]">
                    <Person
                      name={r.employee.name}
                      sub={`${r.employee.role}${r.employee.dept ? `, ${r.employee.dept}` : ""}`}
                      size={28}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.managerName ?? "None"}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <button
                      className="block max-w-full truncate text-left text-[13px] font-medium hover:underline"
                      onClick={() => onOpen(r.noticeId, "recipients")}
                    >
                      {r.noticeTitle}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {r.noticeRef} · {NOTICE_ACK_METHODS[r.ackMethod].label}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    <div>{fmtD(r.deadline)}</div>
                    <div
                      className={
                        dl < 0
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {dl < 0
                        ? `${dayWord(-dl)} overdue`
                        : dl === 0
                          ? "Due today"
                          : `In ${dayWord(dl)}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {r.reminders}
                    {r.lastReminderAt && (
                      <div className="text-muted-foreground">
                        Last {rel(r.lastReminderAt)}
                      </div>
                    )}
                    {r.escalatedAt && (
                      <div className="text-destructive">
                        Escalated {rel(r.escalatedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip tone={tone.tone} dot>
                      {tone.label}
                    </Chip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remind.mutate([key])}
                    >
                      <BellRing className="mr-1.5 h-3.5 w-3.5" />
                      Remind
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="More">
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => escalate.mutate([key])}
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Escalate to line manager
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setOffline({
                              noticeId: r.noticeId,
                              ref: r.noticeRef,
                              employee: r.employee,
                            })
                          }
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Record acknowledgement offline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={8}>
                  {isLoading ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </p>
                  ) : (
                    <Empty icon={PartyPopper} title="No one is outstanding">
                      Everyone in this view has acknowledged.
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <OfflineDialog
        n={{ id: offline?.noticeId ?? "", ref: offline?.ref ?? "" }}
        employee={offline?.employee ?? null}
        onClose={() => setOffline(null)}
        onDone={refresh}
      />
      {confirmNode}
    </div>
  );
}
