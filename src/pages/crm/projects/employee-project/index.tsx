import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FolderKanban,
  Calendar,
  Timer,
  Search,
} from "lucide-react";
import {
  fetchMyMandates,
  fetchMyMandate,
  fetchMyTasks,
  fetchMandateBoardTasks,
} from "@/lib/crm/mandates-api";
import { ragClass, type MandateStage } from "@/lib/crm/mandates-api";

import { MyTasksTab } from "./MyTasksTab";
import { BoardTab } from "./BoardTab";
import { MilestonesTab } from "./MilestonesTab";
import { TimeTab } from "./TimeTab";
import { FilesTab } from "./FilesTab";
import { ActivityTab } from "./ActivityTab";

const stageColor: Record<MandateStage, string> = {
  Create: "bg-info/10 text-info",
  Setup: "bg-info/10 text-info",
  Deliver: "bg-primary/10 text-primary",
  Review: "bg-warning/10 text-warning",
  Bill: "bg-warning/10 text-warning",
  Close: "bg-success/10 text-success",
};

// ──────────────────────────────────────────────────────────────
// List page
// ──────────────────────────────────────────────────────────────

export function MyProjectsList() {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const { data: mandates = [], isLoading } = useQuery({
    queryKey: ["myMandates"],
    queryFn: fetchMyMandates,
  });
  const { data: myTasks = [] } = useQuery({
    queryKey: ["myTasks", "all"],
    queryFn: () => fetchMyTasks(),
  });

  const filtered = useMemo(
    () =>
      mandates.filter((m) => {
        if (stageFilter !== "all" && m.stage !== stageFilter) return false;
        if (
          query &&
          !`${m.name} ${m.clientName}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        return true;
      }),
    [mandates, query, stageFilter],
  );

  const myOpenTasks = myTasks.filter((t) => t.status !== "Done").length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const dueThisMonth = mandates.filter((m) =>
    m.targetDate?.startsWith(thisMonth),
  ).length;

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading your mandates…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Projects</h1>
        <p className="text-sm text-muted-foreground">
          Mandates your team is assigned to — track tasks, and stay on top of
          deadlines.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active mandates"
          value={mandates.length}
          icon={FolderKanban}
          tone="text-primary"
        />
        <StatCard
          label="My open tasks"
          value={myOpenTasks}
          icon={CheckCircle2}
          tone="text-warning"
        />
        <StatCard
          label="Due this month"
          value={dueThisMonth}
          icon={Calendar}
          tone="text-secondary"
        />
        <StatCard
          label="Total tasks"
          value={myTasks.length}
          icon={Timer}
          tone="text-info"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <CardTitle className="text-base">Mandates</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mandates"
                  className="pl-9 w-64 h-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {[
                    "Create",
                    "Setup",
                    "Deliver",
                    "Review",
                    "Bill",
                    "Close",
                  ].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const mine = myTasks.filter(
              (t) => t.mandateId === m._id && t.status !== "Done",
            ).length;
            return (
              <Link
                key={m._id}
                to={`/projects/${m._id}`}
                className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm">{m.name}</p>
                  <Badge className={`text-[10px] ${stageColor[m.stage]}`}>
                    {m.stage}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {m.clientName} · {m.ref}
                </p>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Progress value={m.progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {m.progress}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {m.targetDate?.slice(0, 10)}
                    </span>
                    <Badge variant="outline" className={ragClass[m.rag]}>
                      {m.rag}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {m.team.slice(0, 3).map((t) => (
                      <Avatar key={t} className="h-6 w-6 border-2 border-card">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-secondary text-white">
                          {t
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {mine > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {mine} of yours open
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">
              No mandates match your filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-accent ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Detail page
// ──────────────────────────────────────────────────────────────

export function MyProjectDetail() {
  const { id } = useParams();

  const {
    data: mandate,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["myMandate", id],
    queryFn: () => fetchMyMandate(id as string),
    enabled: !!id,
    retry: false,
  });
  const { data: boardTasks = [] } = useQuery({
    queryKey: ["mandateBoardTasks", id],
    queryFn: () => fetchMandateBoardTasks(id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading mandate…
      </div>
    );
  }

  if (isError || !mandate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          This mandate isn't available to you — either it doesn't exist, or your
          team isn't assigned to it.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const totalEstimate = boardTasks.reduce((s, t) => s + t.estimateHrs, 0);
  const totalLogged = boardTasks.reduce((s, t) => s + t.loggedHrs, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{mandate.name}</h1>
            <Badge className={stageColor[mandate.stage]}>{mandate.stage}</Badge>
            <Badge variant="outline">{mandate.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {mandate.clientName} · {mandate.ref}
          </p>
        </div>
      </div>

      {mandate.description && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              {mandate.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={mandate.progress} className="h-2 flex-1" />
              <span className="font-bold text-sm">{mandate.progress}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Target date</p>
            <p className="font-bold mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {mandate.targetDate?.slice(0, 10)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Task hours</p>
            <p className="font-bold mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {totalLogged} / {totalEstimate}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Team</p>
            <div className="flex -space-x-2 mt-2">
              {mandate.team.map((t) => (
                <Avatar key={t} className="h-7 w-7 border-2 border-card">
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-secondary text-white">
                    {t
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {!mandate.team.length && (
                <span className="text-xs text-muted-foreground">
                  No team listed
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="my-tasks">
        <TabsList>
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          <MyTasksTab mandateId={mandate._id} />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <BoardTab mandateId={mandate._id} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <MilestonesTab mandate={mandate} />
        </TabsContent>
        <TabsContent value="time" className="mt-4">
          <TimeTab />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <FilesTab mandateId={mandate._id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab mandateId={mandate._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
