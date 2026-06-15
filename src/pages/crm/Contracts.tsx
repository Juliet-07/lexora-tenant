import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  PenLine,
  CheckCircle2,
  Clock,
  Search,
  Upload,
  Folder,
  Download,
  Share2,
} from "lucide-react";
import { contracts, crmDocuments, type Contract } from "@/data/crmMockData";

const statusColor: Record<Contract["status"], string> = {
  Draft: "bg-slate-500/10 text-slate-600",
  Sent: "bg-info/10 text-info",
  "Awaiting Signature": "bg-warning/10 text-warning",
  Signed: "bg-success/10 text-success",
  Expired: "bg-destructive/10 text-destructive",
};

export default function Contracts() {
  const [query, setQuery] = useState("");

  const filteredContracts = contracts.filter(c =>
    `${c.title} ${c.clientName} ${c.type}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredDocs = crmDocuments.filter(d =>
    `${d.name} ${d.clientName} ${d.folder}`.toLowerCase().includes(query.toLowerCase()),
  );

  const totalValue = contracts.reduce((s, c) => s + c.value, 0);
  const awaitingContracts = contracts.filter(c => c.status === "Awaiting Signature" || c.status === "Sent");
  const pendingDocs = crmDocuments.filter(d => d.eSignRequired && d.eSignStatus === "Pending");
  const awaitingCount = awaitingContracts.length + pendingDocs.length;
  const signed = contracts.filter(c => c.status === "Signed").length;
  const folders = Array.from(new Set(crmDocuments.map(d => d.folder)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts & Documents</h1>
          <p className="text-sm text-muted-foreground">
            MSAs, SOWs, NDAs, client documents & e-signing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button className="bg-gradient-to-r from-primary to-secondary">
            <Plus className="h-4 w-4 mr-2" /> New Contract
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Contracts</p><p className="text-xl font-bold">{contracts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Signed</p><p className="text-xl font-bold">{signed}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-sm text-muted-foreground">Awaiting Signature</p><p className="text-xl font-bold">{awaitingCount}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><FileText className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Total Value</p><p className="text-xl font-bold">${totalValue.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contracts and documents..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({crmDocuments.length})</TabsTrigger>
          <TabsTrigger value="esign">E-Sign Queue ({awaitingCount})</TabsTrigger>
        </TabsList>

        {/* Contracts tab */}
        <TabsContent value="contracts" className="mt-4">
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
                  {filteredContracts.map(c => (
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

        {/* Documents tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map(f => (
              <Card key={f} className="cursor-pointer hover:border-primary/50">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="p-3 rounded-xl bg-primary/10"><Folder className="h-5 w-5 text-primary" /></div>
                  <p className="text-sm font-medium">{f}</p>
                  <p className="text-xs text-muted-foreground">{crmDocuments.filter(d => d.folder === f).length} files</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>E-Sign</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{d.folder}</Badge></TableCell>
                      <TableCell className="text-sm">{d.clientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.uploadedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.uploadedAt}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.size}</TableCell>
                      <TableCell>
                        {d.eSignRequired ? (
                          <Badge className={`text-[10px] ${d.eSignStatus === "Signed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                            {d.eSignStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.eSignRequired && d.eSignStatus === "Pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"><PenLine className="h-3 w-3" /></Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7"><Share2 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7"><Download className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-Sign queue */}
        <TabsContent value="esign" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Pending Signer(s)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingContracts.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">Contract · {c.type}</Badge></TableCell>
                      <TableCell className="text-sm">{c.clientName}</TableCell>
                      <TableCell className="text-xs">
                        {c.signers.filter(s => !s.signed).map(s => s.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell><Button size="sm" variant="outline" className="h-7 text-xs"><PenLine className="h-3 w-3 mr-1" /> Remind</Button></TableCell>
                    </TableRow>
                  ))}
                  {pendingDocs.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">Document</Badge></TableCell>
                      <TableCell className="text-sm">{d.clientName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Awaiting client</TableCell>
                      <TableCell><Button size="sm" variant="outline" className="h-7 text-xs"><PenLine className="h-3 w-3 mr-1" /> Remind</Button></TableCell>
                    </TableRow>
                  ))}
                  {awaitingCount === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Nothing awaiting signature.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
