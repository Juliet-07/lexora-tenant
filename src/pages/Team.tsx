import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mail, FolderKanban } from "lucide-react";
import { teamMembers } from "@/data/mockData";

export default function Team() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">{teamMembers.length} team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
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
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Workload</span><span className="font-medium">{member.workload}%</span></div>
                  <Progress value={member.workload} className={`h-2 ${member.workload > 80 ? "[&>div]:bg-destructive" : member.workload > 60 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`} />
                </div>
                <div className="flex items-center gap-2 text-sm"><FolderKanban className="h-3 w-3 text-muted-foreground" /><span>{member.activeProjects} active projects</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
