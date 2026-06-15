import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, PenLine, CheckCircle2, Clock, Search } from "lucide-react";
import { contracts, type Contract } from "@/data/crmMockData";

const statusColor: Record<Contract["status"], string> = {
  Draft: "bg-slate-500/10 text-slate-600",
  Sent: "bg-info/10 text-info",
  "Awaiting Signature": "bg-warning/10 text-warning",
  Signed: "bg-success/10 text-success",
  Expired: "bg-destructive/10 text-destructive",
};

export default function Contracts() {
  const [query, setQuery] = useState("");
  const filtered = contracts.filter(c =>
    `${c.title} ${c.clientName} ${c.type}`.toLowerCase().includes(query.toLowerCase()),
  );

  const totalValue = contracts.reduce((s, c) => s + c.value, 0);
  const awaiting = contracts.filter(c => c.status === "Awaiting Signature" || c.status === "Sent").length;
  const signed = contracts.filter(c => c.status === "Signed").length;
  const drafts = contracts.filter(c => c.status === "Draft").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contract Management</h1>
          <p className="text-sm text-muted-foreground">MSAs, SOWs, NDAs, engagement letters & e-signing</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary"><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Active Contracts</p><p className="text-xl font-bold">{contracts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Signed</p><p className="text-xl font-bold">{signed}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Awaiting Signature</p><p className="text-xl font-bold">{awaiting}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><FileText className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Total Value</p><p className="text-xl font-bold">${totalValue.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contracts..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
          <TabsTrigger value="awaiting">Awaiting Signature ({awaiting})</TabsTrigger>
          <TabsTrigger value="signed">Signed ({signed})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts})</TabsTrigger>
        </TabsList>

        {[
          { v: "all", data: filtered },
          { v: "awaiting", data: filtered.filter(c => c.status === "Awaiting Signature" || c.status === "Sent") },
          { v: "signed", data: filtered.filter(c => c.status === "Signed") },
          { v: "drafts", data: filtered.filter(c => c.status === "Draft") },
        ].map(t => (
          <TabsContent key={t.v} value={t.v} className="mt-4">
            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Signers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.data.map(c => (
                      <TableRow key={c.id}>
                        <TableCell><p className="font-medium text-sm">{c.title}</p><p className="text-xs text-muted-foreground">{c.id}</p></TableCell>
                        <TableCell className="text-sm">{c.clientName}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.type}</Badge></TableCell>
                        <TableCell className="font-semibold">${c.value.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.startDate} → {c.endDate}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {c.signers.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                {s.signed ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Clock className="h-3 w-3 text-warning" />}
                                <span className={s.signed ? "text-muted-foreground" : "font-medium"}>{s.name}</span>
                              </div>
                            ))}
                            {c.signers.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell><Badge className={`text-xs ${statusColor[c.status]}`}>{c.status}</Badge></TableCell>
                        <TableCell>
                          {(c.status === "Awaiting Signature" || c.status === "Sent") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"><PenLine className="h-3 w-3 mr-1" /> Remind</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
