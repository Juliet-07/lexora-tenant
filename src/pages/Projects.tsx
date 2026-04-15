import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, Users as UsersIcon, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { projects as initialProjects, clients, teamMembers, type Project, type ProjectTask } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusColor: Record<string, string> = {
  Planning: "bg-info/10 text-info",
  "In Progress": "bg-primary/10 text-primary",
  "On Hold": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
};

export function ProjectsList() {
  const [projectList, setProjectList] = useState<Project[]>(initialProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", clientId: "", description: "", caseType: "", deadline: "", assignedTeam: [] as string[], hoursEstimated: 0 });
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const displayProjects = isAdmin ? projectList : projectList.filter(p => p.assignedTeam.includes(user?.name || ""));

  const handleCreate = () => {
    if (!newProject.name || !newProject.clientId) return;
    const client = clients.find(c => c.id === newProject.clientId);
    const id = `PRJ-${String(projectList.length + 1).padStart(3, "0")}`;
    const project: Project = {
      id,
      name: newProject.name,
      clientId: newProject.clientId,
      clientName: client?.name || "",
      status: "Planning",
      progress: 0,
      deadline: newProject.deadline,
      assignedTeam: newProject.assignedTeam,
      hoursLogged: 0,
      hoursEstimated: newProject.hoursEstimated,
      description: newProject.description,
      caseType: newProject.caseType,
      tasks: [],
    };
    setProjectList([project, ...projectList]);
    setDialogOpen(false);
    setNewProject({ name: "", clientId: "", description: "", caseType: "", deadline: "", assignedTeam: [], hoursEstimated: 0 });
    toast({ title: "Project Created", description: `${newProject.name} has been created.` });
  };

  const toggleTeamMember = (name: string) => {
    setNewProject(prev => ({
      ...prev,
      assignedTeam: prev.assignedTeam.includes(name) ? prev.assignedTeam.filter(n => n !== name) : [...prev.assignedTeam, name],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? "Projects" : "My Projects"}</h1>
          <p className="text-sm text-muted-foreground">{displayProjects.length} projects</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> New Project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Project / Matter</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="e.g. Annual Audit 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={newProject.clientId} onValueChange={v => setNewProject({ ...newProject, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.filter(c => c.status === "Active" || c.status === "Approved").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Case Type</Label>
                  <Select value={newProject.caseType} onValueChange={v => setNewProject({ ...newProject, caseType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Litigation">Litigation</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Tax">Tax</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Audit">Audit</SelectItem>
                      <SelectItem value="Due Diligence">Due Diligence</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} placeholder="Brief description of the matter" />
                </div>
                <div className="space-y-2">
                  <Label>Assign Team Members</Label>
                  <div className="space-y-2">
                    {teamMembers.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input type="checkbox" checked={newProject.assignedTeam.includes(m.name)} onChange={() => toggleTeamMember(m.name)} className="rounded" />
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.role}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    <Input type="date" value={newProject.deadline} onChange={e => setNewProject({ ...newProject, deadline: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Hours</Label>
                    <Input type="number" value={newProject.hoursEstimated} onChange={e => setNewProject({ ...newProject, hoursEstimated: Number(e.target.value) })} />
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={handleCreate}>Create Project</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayProjects.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    <Link to={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}<span className="block text-xs text-muted-foreground">{p.id}</span></Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.clientName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.caseType || "General"}</Badge></TableCell>
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
  const project = initialProjects.find(p => p.id === id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ProjectTask[]>(project?.tasks || []);

  if (!project) return <div className="text-center py-12"><p>Project not found</p></div>;

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    toast({ title: "Task Updated" });
  };

  const milestones = [
    { title: "Kickoff", date: "2026-01-15", done: true },
    { title: "Phase 1 Complete", date: "2026-03-01", done: true },
    { title: "Draft Review", date: "2026-04-15", done: false },
    { title: "Final Delivery", date: project.deadline, done: false },
  ];

  const myTasks = user?.role === "team_member" ? tasks.filter(t => t.assignee === user.name) : tasks;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className={statusColor[project.status]}>{project.status}</Badge>
            {project.caseType && <Badge variant="outline">{project.caseType}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{project.clientName} · {project.id}</p>
        </div>
      </div>

      {project.description && (
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{project.description}</p></CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Progress</p><div className="flex items-center gap-2 mt-2"><Progress value={project.progress} className="h-2 flex-1" /><span className="font-bold">{project.progress}%</span></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><Clock className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Hours</p><p className="font-bold">{project.hoursLogged} / {project.hoursEstimated}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><UsersIcon className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Team</p><p className="font-bold">{project.assignedTeam.join(", ")}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">{user?.role === "team_member" ? "My Tasks" : "Tasks"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleTask(t.id)}>
                {t.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1">
                  <span className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  <span className="block text-xs text-muted-foreground">{t.assignee}</span>
                </div>
              </div>
            ))}
            {myTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned</p>}
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
