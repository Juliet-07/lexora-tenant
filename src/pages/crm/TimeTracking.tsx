import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Timer, DollarSign, Clock, TrendingUp } from "lucide-react";
import { projects, timeEntries as initialEntries, type TimeEntry } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function TimeTracking() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [activeProject, setActiveProject] = useState("");
  const [activeNote, setActiveNote] = useState("");
  const intervalRef = useRef<number | null>(null);

  // manual entry
  const [manual, setManual] = useState({ projectId: "", hours: 0, description: "", rate: 250 });

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const myProjects = isAdmin ? projects : projects.filter(p => p.assignedTeam.includes(fullName));
  const visible = isAdmin ? entries : entries.filter(e => e.teamMemberName === fullName);

  const totalHours = visible.reduce((s, e) => s + e.hours, 0);
  const billableHours = visible.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
  const totalAmount = visible.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);
  const utilization = Math.min(100, Math.round((billableHours / Math.max(totalHours, 1)) * 100));

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const stopTimer = () => {
    if (!activeProject || seconds < 5) {
      setRunning(false);
      setSeconds(0);
      return;
    }
    const project = projects.find(p => p.id === activeProject);
    const hours = Math.round((seconds / 3600) * 100) / 100;
    const entry: TimeEntry = {
      id: `TE-${String(entries.length + 1).padStart(3, "0")}`,
      projectId: activeProject,
      projectName: project?.name || "",
      teamMemberId: user?.id || "",
      teamMemberName: fullName,
      date: new Date().toISOString().split("T")[0],
      hours,
      description: activeNote || "Timer entry",
      billable: true,
      rate: 250,
    };
    setEntries([entry, ...entries]);
    setRunning(false);
    setSeconds(0);
    setActiveNote("");
    toast({ title: "Time logged", description: `${hours}h on ${project?.name}` });
  };

  const logManual = () => {
    if (!manual.projectId || !manual.hours) return;
    const project = projects.find(p => p.id === manual.projectId);
    const entry: TimeEntry = {
      id: `TE-${String(entries.length + 1).padStart(3, "0")}`,
      projectId: manual.projectId,
      projectName: project?.name || "",
      teamMemberId: user?.id || "",
      teamMemberName: fullName,
      date: new Date().toISOString().split("T")[0],
      hours: manual.hours,
      description: manual.description,
      billable: true,
      rate: manual.rate,
    };
    setEntries([entry, ...entries]);
    setManual({ projectId: "", hours: 0, description: "", rate: 250 });
    toast({ title: "Entry added" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Capture billable time across projects</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Hours</p><p className="text-xl font-bold">{totalHours.toFixed(1)}h</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><Timer className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Billable</p><p className="text-xl font-bold">{billableHours.toFixed(1)}h</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-xl font-bold">${totalAmount.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><TrendingUp className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Utilization</p><p className="text-xl font-bold">{utilization}%</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Live Timer</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Project / Matter</Label>
              <Select value={activeProject} onValueChange={setActiveProject} disabled={running}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {myProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.clientName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Note</Label>
              <Input value={activeNote} onChange={e => setActiveNote(e.target.value)} placeholder="What are you working on?" />
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums px-4">{fmt(seconds)}</div>
            {!running ? (
              <Button onClick={() => activeProject && setRunning(true)} className="bg-gradient-to-r from-primary to-secondary">
                <Play className="h-4 w-4 mr-2" /> Start
              </Button>
            ) : (
              <Button onClick={stopTimer} variant="destructive">
                <Square className="h-4 w-4 mr-2" /> Stop & Log
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="byproject">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead>Member</TableHead>}
                    <TableHead>Project</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.date}</TableCell>
                      {isAdmin && <TableCell className="text-sm">{e.teamMemberName}</TableCell>}
                      <TableCell className="text-sm font-medium">{e.projectName}</TableCell>
                      <TableCell className="font-semibold">{e.hours}h</TableCell>
                      <TableCell className="text-sm">${e.rate}/hr</TableCell>
                      <TableCell className="font-semibold">${(e.hours * e.rate).toLocaleString()}</TableCell>
                      <TableCell>{e.billable ? <Badge className="text-[10px] bg-success/10 text-success">Billable</Badge> : <Badge variant="outline" className="text-[10px]">Non-billable</Badge>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={manual.projectId} onValueChange={v => setManual({ ...manual, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {myProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.clientName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Hours</Label><Input type="number" step="0.25" value={manual.hours || ""} onChange={e => setManual({ ...manual, hours: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Rate ($/hr)</Label><Input type="number" value={manual.rate} onChange={e => setManual({ ...manual, rate: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={manual.description} onChange={e => setManual({ ...manual, description: e.target.value })} placeholder="Describe the work performed..." /></div>
              <Button onClick={logManual} className="bg-gradient-to-r from-primary to-secondary">Add Entry</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byproject" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Hours</TableHead><TableHead>Billable Amount</TableHead><TableHead>Entries</TableHead></TableRow></TableHeader>
                <TableBody>
                  {projects.map(p => {
                    const pe = visible.filter(e => e.projectId === p.id);
                    const h = pe.reduce((s, e) => s + e.hours, 0);
                    const a = pe.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.name}<span className="block text-xs text-muted-foreground">{p.clientName}</span></TableCell>
                        <TableCell className="font-semibold">{h.toFixed(1)}h</TableCell>
                        <TableCell className="font-semibold">${a.toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{pe.length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
