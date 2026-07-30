import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search,
  Upload,
  Lock,
  Unlock,
  History,
  PenTool,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentThread } from "@/components/crm/CommentThread";
import {
  pmDocuments as seed,
  PmDocument,
  docTemplates,
} from "@/data/crmPmMockData";

export default function Documents() {
  const [list, setList] = useState<PmDocument[]>(seed);
  const [q, setQ] = useState("");
  const [access, setAccess] = useState("all");
  const [selected, setSelected] = useState<PmDocument | null>(null);
  const { toast } = useToast();

  const filtered = list.filter(
    (d) =>
      (access === "all" || d.access === access) &&
      (d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.folder.toLowerCase().includes(q.toLowerCase()) ||
        d.tags.some((t) => t.includes(q.toLowerCase()))),
  );

  const patch = (id: string, p: Partial<PmDocument>) => {
    setList((l) => l.map((d) => (d.id === id ? { ...d, ...p } : d)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  };

  const folders = Array.from(new Set(list.map((d) => d.folder)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Repository with version control, templates and digital signatures
          </p>
        </div>
        <Button onClick={() => toast({ title: "Upload", description: "Select files to add to the repository." })}>
          <Upload className="mr-2 h-4 w-4" /> Upload document
        </Button>
      </div>

      <Tabs defaultValue="repository">
        <TabsList>
          <TabsTrigger value="repository">Repository</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="signatures">Digital signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="repository" className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Full-text search — name, folder, tag…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={access} onValueChange={setAccess}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All access levels</SelectItem>
                {["Team", "Client-shared", "Restricted"].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Folder hierarchy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {folders.map((f) => (
                  <button
                    key={f}
                    onClick={() => setQ(f)}
                    className="block w-full truncate rounded px-2 py-1 text-left hover:bg-muted"
                  >
                    {f}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Retention</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(d)}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.folder} · {d.size}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.version}</Badge>
                          {d.checkedOutBy && (
                            <Badge className="ml-1 bg-warning/10 text-[10px] text-warning">
                              <Lock className="mr-1 h-3 w-3" />
                              {d.checkedOutBy}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{d.access}</TableCell>
                        <TableCell className="text-sm">{d.retention}</TableCell>
                        <TableCell className="text-sm">{d.updatedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {docTemplates.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {t.variables.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-[10px]">
                        {v}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast({
                        title: "Document generated",
                        description: `${t.name} mail-merged with client and mandate data.`,
                      })
                    }
                  >
                    Generate from template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signatures" className="pt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Signer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list
                    .filter((d) => d.signature)
                    .map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.name}</TableCell>
                        <TableCell className="text-sm">
                          {d.signature?.signer}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              d.signature?.status === "Signed"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }
                          >
                            {d.signature?.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {d.signature?.certificateId ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.signature?.status === "Pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                patch(d.id, {
                                  signature: {
                                    status: "Signed",
                                    signer: d.signature!.signer,
                                    signedAt: new Date().toISOString().slice(0, 10),
                                    certificateId: `SIG-${Math.floor(Math.random() * 9000) + 1000}-BB`,
                                  },
                                });
                                toast({
                                  title: "Signature captured",
                                  description:
                                    "Certificate issued with signer, timestamp, IP and unique ID.",
                                });
                              }}
                            >
                              <PenTool className="mr-2 h-4 w-4" /> Capture
                              signature
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.folder} · {selected.mandateName}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selected.checkedOutBy ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const next = `v${Number(selected.version.slice(1)) + 1}`;
                        patch(selected.id, {
                          checkedOutBy: undefined,
                          version: next,
                        });
                        toast({
                          title: "Checked in",
                          description: `New version ${next} created automatically.`,
                        });
                      }}
                    >
                      <Unlock className="mr-2 h-4 w-4" /> Check in
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch(selected.id, { checkedOutBy: "Sarah Chen" })
                      }
                    >
                      <Lock className="mr-2 h-4 w-4" /> Check out
                    </Button>
                  )}
                  <Select
                    value={selected.access}
                    onValueChange={(v) =>
                      patch(selected.id, { access: v as PmDocument["access"] })
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Team", "Client-shared", "Restricted"].map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <History className="h-4 w-4" /> Version history
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Array.from(
                      { length: Number(selected.version.slice(1)) },
                      (_, i) => Number(selected.version.slice(1)) - i,
                    ).map((v) => (
                      <div key={v} className="flex justify-between rounded border p-2">
                        <span>v{v}</span>
                        <span className="text-xs text-muted-foreground">
                          {v === Number(selected.version.slice(1))
                            ? `${selected.updatedAt} · current`
                            : "earlier revision"}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {selected.signature && (
                  <Card>
                    <CardContent className="space-y-1 p-4 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        <ShieldCheck className="h-4 w-4 text-success" /> Signing
                        certificate
                      </p>
                      <p>Signer: {selected.signature.signer}</p>
                      <p>Status: {selected.signature.status}</p>
                      <p>Signed: {selected.signature.signedAt ?? "—"}</p>
                      <p className="font-mono text-xs">
                        {selected.signature.certificateId ?? "Pending issue"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <Label className="text-xs">Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <CommentThread subject={selected.id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
