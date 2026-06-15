import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, MessageSquare, FileText, Eye, Link as LinkIcon } from "lucide-react";
import { accounts } from "@/data/crmMockData";

const portalAccess = accounts
  .filter(a => a.status === "Customer")
  .map((a, i) => ({
    ...a,
    portalEnabled: i % 2 === 0,
    lastLogin: ["2026-06-13", "2026-06-10", "2026-06-08", "2026-05-22"][i % 4],
    activeUsers: (i % 4) + 1,
    openTickets: i,
  }));

export default function ClientPortal() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Portal</h1>
          <p className="text-sm text-muted-foreground">Self-service workspace for your clients</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary"><LinkIcon className="h-4 w-4 mr-2" /> Portal Settings</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Globe className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Enabled Clients</p><p className="text-xl font-bold">{portalAccess.filter(a => a.portalEnabled).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><Eye className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Active Sessions (24h)</p><p className="text-xl font-bold">14</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><MessageSquare className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Open Messages</p><p className="text-xl font-bold">7</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><FileText className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Documents Shared</p><p className="text-xl font-bold">42</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Portal Access</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalAccess.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.portalEnabled ? <Badge className="text-xs bg-success/10 text-success">Enabled</Badge> : <Badge variant="outline" className="text-xs">Disabled</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{p.activeUsers}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.portalEnabled ? p.lastLogin : "—"}</TableCell>
                    <TableCell className="text-sm">{p.openTickets}</TableCell>
                    <TableCell><Button size="sm" variant="outline" className="h-7 text-xs">Manage</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { user: "Eleanor Pritchard", action: "downloaded Meridian MSA 2026", time: "2h ago" },
              { user: "Yuki Tanaka", action: "sent a message about SOW Q3", time: "5h ago" },
              { user: "Marcus Greenfield", action: "viewed Restructuring Memo", time: "1d ago" },
              { user: "Hassan Al-Mansoori", action: "signed Engagement Letter", time: "2d ago" },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm"><span className="font-medium">{a.user}</span> {a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
