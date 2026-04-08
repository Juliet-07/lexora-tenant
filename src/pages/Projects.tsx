import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Clock, Users as UsersIcon, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { projects } from "@/data/mockData";

const statusColor: Record<string, string> = {
  Planning: "bg-info/10 text-info",
  "In Progress": "bg-primary/10 text-primary",
  "On Hold": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
};

export function ProjectsList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} total projects</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> New Project</Button>
      </div>
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    <Link to={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}<span className="block text-xs text-muted-foreground">{p.id}</span></Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.clientName}</TableCell>
                  <TableCell><Badge className={`text-xs ${statusColor[p.status]}`}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-24"><Progress value={p.progress} className="h-2 flex-1" /><span className="text-xs text-muted-foreground">{p.progress}%</span></div>
                  </TableCell>
                  <TableCell className="text-sm">{p.assignedTeam.length} members</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.deadline}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const project = projects.find(p => p.id === id);
  if (!project) return <div className="text-center py-12"><p>Project not found</p></div>;

  const mockTasks = [
    { title: "Initial document review", done: true },
    { title: "Stakeholder interviews", done: true },
    { title: "Risk assessment report", done: false },
    { title: "Final deliverable preparation", done: false },
    { title: "Client presentation", done: false },
  ];

  const milestones = [
    { title: "Kickoff", date: "2026-01-15", done: true },
    { title: "Phase 1 Complete", date: "2026-03-01", done: true },
    { title: "Draft Review", date: "2026-04-15", done: false },
    { title: "Final Delivery", date: project.deadline, done: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className={statusColor[project.status]}>{project.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{project.clientName} · {project.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Progress</p><div className="flex items-center gap-2 mt-2"><Progress value={project.progress} className="h-2 flex-1" /><span className="font-bold">{project.progress}%</span></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><Clock className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Hours</p><p className="font-bold">{project.hoursLogged} / {project.hoursEstimated}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><UsersIcon className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Team</p><p className="font-bold">{project.assignedTeam.join(", ")}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mockTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                {t.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <span className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${m.done ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm ${m.done ? "font-medium" : "text-muted-foreground"}`}>{m.title}</span>
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
