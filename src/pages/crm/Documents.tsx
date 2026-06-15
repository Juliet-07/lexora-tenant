import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, Upload, Search, FileText, Download, PenLine, Share2 } from "lucide-react";
import { crmDocuments } from "@/data/crmMockData";

export default function Documents() {
  const [query, setQuery] = useState("");
  const folders = Array.from(new Set(crmDocuments.map(d => d.folder)));

  const filtered = crmDocuments.filter(d =>
    `${d.name} ${d.clientName} ${d.folder}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-muted-foreground">Centralized document repository with e-signing</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary"><Upload className="h-4 w-4 mr-2" /> Upload</Button>
      </div>

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

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search documents..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="esign">E-Sign Queue</TabsTrigger>
          <TabsTrigger value="shared">Shared with Clients</TabsTrigger>
        </TabsList>

        {[
          { v: "all", data: filtered },
          { v: "esign", data: filtered.filter(d => d.eSignRequired) },
          { v: "shared", data: filtered.filter(d => d.shared) },
        ].map(t => (
          <TabsContent key={t.v} value={t.v} className="mt-4">
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
                    {t.data.map(d => (
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
        ))}
      </Tabs>
    </div>
  );
}
