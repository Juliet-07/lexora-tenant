import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGrc, mutateGrc, id, Vendor, bandTone } from "@/lib/grcStore";

export default function GrcVendors() {
  const s = useGrc();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Third-Party Risk</h1>
          <p className="text-sm text-muted-foreground">Vendor register, due diligence, and renewal calendar.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />New vendor</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-2">Contract renewals (next 90 days)</div>
          <div className="space-y-1">
            {s.vendors.filter((v) => v.status === "Active" && v.contractEnd <= upcoming90 && v.contractEnd >= today).map((v) => (
              <div key={v.id} className="flex justify-between text-sm border rounded px-2 py-1">
                <span>{v.name}</span>
                <span className="text-muted-foreground">Renew by {v.contractEnd}</span>
              </div>
            ))}
            {!s.vendors.some((v) => v.status === "Active" && v.contractEnd <= upcoming90 && v.contractEnd >= today) && (
              <div className="text-xs text-muted-foreground">No renewals due in 90 days.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow>
          <TableHead>Vendor</TableHead><TableHead>Category</TableHead><TableHead>Risk</TableHead><TableHead>Contract</TableHead><TableHead>Next review</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {s.vendors.map((v) => (
            <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelected(v)}>
              <TableCell className="font-medium">{v.name}</TableCell>
              <TableCell>{v.category}</TableCell>
              <TableCell><Badge variant="outline" className={bandTone(v.riskRating)}>{v.riskRating}</Badge></TableCell>
              <TableCell className="text-xs">{v.contractStart} → {v.contractEnd}</TableCell>
              <TableCell className="text-xs">{v.nextReviewDate}</TableCell>
              <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <NewVendorDialog open={newOpen} onOpenChange={setNewOpen} />
      <VendorSheet vendor={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NewVendorDialog({ open, onOpenChange }: any) {
  const [f, setF] = useState<Omit<Vendor, "id" | "ratingHistory" | "status">>({
    name: "", category: "", services: "",
    contractStart: new Date().toISOString().slice(0, 10),
    contractEnd: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    riskRating: "Medium",
    dueDiligence: { financialStability: "Adequate", cybersecurityPosture: "Adequate", bcp: "Partial", complianceStatus: "Compliant", reputation: "Neutral" },
    nextReviewDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
  });
  const submit = () => {
    if (!f.name) return toast({ title: "Name required", variant: "destructive" });
    mutateGrc((s) => ({ ...s, vendors: [{ id: id("ven"), ...f, status: "Active", ratingHistory: [{ at: new Date().toISOString(), rating: f.riskRating, note: "Initial assessment" }] }, ...s.vendors] }));
    toast({ title: "Vendor registered" }); onOpenChange(false);
  };
  const dd = f.dueDiligence;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          </div>
          <div><Label>Services</Label><Textarea rows={2} value={f.services} onChange={(e) => setF({ ...f, services: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Contract start</Label><Input type="date" value={f.contractStart} onChange={(e) => setF({ ...f, contractStart: e.target.value })} /></div>
            <div><Label>Contract end</Label><Input type="date" value={f.contractEnd} onChange={(e) => setF({ ...f, contractEnd: e.target.value })} /></div>
            <div><Label>Risk rating</Label>
              <Select value={f.riskRating} onValueChange={(v) => setF({ ...f, riskRating: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Low","Medium","High","Extreme"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Due diligence</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["financialStability", ["Strong","Adequate","Weak"]],
                ["cybersecurityPosture", ["Strong","Adequate","Weak"]],
                ["bcp", ["Documented","Partial","None"]],
                ["complianceStatus", ["Compliant","Issues","Unknown"]],
                ["reputation", ["Good","Neutral","Concerns"]],
              ] as const).map(([k, opts]) => (
                <div key={k}><Label className="capitalize text-xs">{k.replace(/([A-Z])/g, " $1")}</Label>
                  <Select value={(dd as any)[k]} onValueChange={(v) => setF({ ...f, dueDiligence: { ...dd, [k]: v } as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Register</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorSheet({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const [rating, setRating] = useState(vendor?.riskRating ?? "Medium");
  const [note, setNote] = useState("");
  const [termination, setTermination] = useState("");
  if (!vendor) return null;
  const patch = (p: Partial<Vendor>) => mutateGrc((s) => ({ ...s, vendors: s.vendors.map((v) => v.id === vendor.id ? { ...v, ...p } : v) }));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{vendor.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{vendor.category}</Badge>
            <Badge variant="outline" className={bandTone(vendor.riskRating)}>{vendor.riskRating}</Badge>
            <Badge variant="outline">{vendor.status}</Badge>
          </div>
          <div><div className="text-xs text-muted-foreground">Services</div><div className="text-sm">{vendor.services}</div></div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(vendor.dueDiligence).map(([k, v]) => (
              <div key={k} className="border rounded p-2">
                <div className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Update risk rating</div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div><Label className="text-xs">Rating</Label>
                <Select value={rating} onValueChange={(v) => setRating(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Medium","High","Extreme"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            <Button size="sm" className="mt-2" onClick={() => {
              patch({ riskRating: rating, ratingHistory: [{ at: new Date().toISOString(), rating: rating as any, note }, ...vendor.ratingHistory] });
              setNote("");
              toast({ title: "Rating updated" });
            }}>Save rating</Button>
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Rating history</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {vendor.ratingHistory.map((h, i) => (
                <li key={i}>{new Date(h.at).toLocaleDateString()} — <Badge variant="outline" className={bandTone(h.rating)}>{h.rating}</Badge> {h.note}</li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Terminate</div>
            <Textarea rows={2} value={termination} onChange={(e) => setTermination(e.target.value)} placeholder="Reason for termination" />
            <Button size="sm" variant="destructive" className="mt-2" onClick={() => {
              if (!termination) return toast({ title: "Reason required", variant: "destructive" });
              patch({ status: "Terminated", terminationReason: termination, terminatedAt: new Date().toISOString() });
              toast({ title: "Vendor terminated" });
            }}>Terminate vendor</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
