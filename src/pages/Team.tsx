import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, FolderKanban, Plus, Trash2, UserPlus } from "lucide-react";
import { teamMembers as initialTeam, projects, type TeamMember } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>(initialTeam);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({ name: "", role: "", email: "" });
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleAddMember = () => {
    if (!newMember.name || !newMember.email) return;
    const id = `TM-${String(members.length + 1).padStart(3, "0")}`;
    const avatar = newMember.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const member: TeamMember = { id, name: newMember.name, role: newMember.role, email: newMember.email, avatar, workload: 0, activeProjects: 0 };
    setMembers([...members, member]);
    setDialogOpen(false);
    setNewMember({ name: "", role: "", email: "" });
    toast({ title: "Team Member Added", description: `${newMember.name} has been added to the team.` });
  };

  const handleDelete = (member: TeamMember) => {
    setMembers(members.filter(m => m.id !== member.id));
    toast({ title: "Member Removed", description: `${member.name} has been removed.` });
  };

  const memberProjects = (memberName: string) => projects.filter(p => p.assignedTeam.includes(memberName));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">{members.length} team members</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newMember.role} onValueChange={v => setNewMember({ ...newMember, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Senior Partner">Senior Partner</SelectItem>
                      <SelectItem value="Associate">Associate</SelectItem>
                      <SelectItem value="Tax Advisor">Tax Advisor</SelectItem>
                      <SelectItem value="Audit Manager">Audit Manager</SelectItem>
                      <SelectItem value="Legal Analyst">Legal Analyst</SelectItem>
                      <SelectItem value="Junior Associate">Junior Associate</SelectItem>
                      <SelectItem value="Paralegal">Paralegal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="john@firm.com" />
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-secondary" onClick={handleAddMember}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">{member.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Mail className="h-3 w-3" />{member.email}</div>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(member)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Workload</span><span className="font-medium">{member.workload}%</span></div>
                  <Progress value={member.workload} className={`h-2 ${member.workload > 80 ? "[&>div]:bg-destructive" : member.workload > 60 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} />
                </div>
                <div className="flex items-center gap-2 text-sm"><FolderKanban className="h-3 w-3 text-muted-foreground" /><span>{memberProjects(member.name).length} active projects</span></div>
                {memberProjects(member.name).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {memberProjects(member.name).map(p => (
                      <Badge key={p.id} variant="outline" className="text-[10px]">{p.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
