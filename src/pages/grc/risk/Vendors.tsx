import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchVendors,
  createVendor,
  updateVendorRating,
  terminateVendor,
  bandTone,
  type Vendor,
  type DueDiligence,
  type RiskBand,
} from "@/lib/grc/risk-api";

export default function GrcVendors() {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["grc-vendors"],
    queryFn: fetchVendors,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming90 = new Date(Date.now() + 90 * 86400000)
    .toISOString()
    .slice(0, 10);

  const selectedLive = selectedId
    ? (vendors.find((v) => v._id === selectedId) ?? null)
    : null;
  const renewals = vendors.filter(
    (v) =>
      v.status === "Active" &&
      v.contractEnd.slice(0, 10) <= upcoming90 &&
      v.contractEnd.slice(0, 10) >= today,
  );

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading vendor register…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Third-Party Risk</h1>
          <p className="text-sm text-muted-foreground">
            Vendor register, due diligence, and renewal calendar.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New vendor
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium mb-2">
            Contract renewals (next 90 days)
          </div>
          <div className="space-y-1">
            {renewals.map((v) => (
              <div
                key={v._id}
                className="flex justify-between text-sm border rounded px-2 py-1"
              >
                <span>{v.name}</span>
                <span className="text-muted-foreground">
                  Renew by {v.contractEnd.slice(0, 10)}
                </span>
              </div>
            ))}
            {renewals.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No renewals due in 90 days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Next review</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow
                  key={v._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(v._id)}
                >
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={bandTone(v.riskRating)}>
                      {v.riskRating}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.contractStart.slice(0, 10)} →{" "}
                    {v.contractEnd.slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.nextReviewDate.slice(0, 10)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {vendors.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No vendors yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewVendorDialog open={newOpen} onOpenChange={setNewOpen} />
      {selectedLive && (
        <VendorSheet
          vendor={selectedLive}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function NewVendorDialog({ open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const [f, setF] = useState<{
    name: string;
    category: string;
    services: string;
    contractStart: string;
    contractEnd: string;
    riskRating: RiskBand;
    dueDiligence: DueDiligence;
    nextReviewDate: string;
  }>({
    name: "",
    category: "",
    services: "",
    contractStart: new Date().toISOString().slice(0, 10),
    contractEnd: new Date(Date.now() + 365 * 86400000)
      .toISOString()
      .slice(0, 10),
    riskRating: "Medium",
    dueDiligence: {
      financialStability: "Adequate",
      cybersecurityPosture: "Adequate",
      bcp: "Partial",
      complianceStatus: "Compliant",
      reputation: "Neutral",
    },
    nextReviewDate: new Date(Date.now() + 180 * 86400000)
      .toISOString()
      .slice(0, 10),
  });

  const mutation = useMutation({
    mutationFn: () => createVendor(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grc-vendors"] });
      toast({ title: "Vendor registered" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to register vendor",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name.trim())
      return toast({ title: "Name required", variant: "destructive" });
    mutation.mutate();
  };

  const dd = f.dueDiligence;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Name</Label>
              <Input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Services</Label>
            <Textarea
              rows={2}
              value={f.services}
              onChange={(e) => setF({ ...f, services: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Contract start</Label>
              <Input
                type="date"
                value={f.contractStart}
                onChange={(e) => setF({ ...f, contractStart: e.target.value })}
              />
            </div>
            <div>
              <Label>Contract end</Label>
              <Input
                type="date"
                value={f.contractEnd}
                onChange={(e) => setF({ ...f, contractEnd: e.target.value })}
              />
            </div>
            <div>
              <Label>Risk rating</Label>
              <Select
                value={f.riskRating}
                onValueChange={(v) => setF({ ...f, riskRating: v as RiskBand })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Extreme"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Due diligence</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["financialStability", ["Strong", "Adequate", "Weak"]],
                  ["cybersecurityPosture", ["Strong", "Adequate", "Weak"]],
                  ["bcp", ["Documented", "Partial", "None"]],
                  ["complianceStatus", ["Compliant", "Issues", "Unknown"]],
                  ["reputation", ["Good", "Neutral", "Concerns"]],
                ] as const
              ).map(([k, opts]) => (
                <div key={k}>
                  <Label className="capitalize text-xs">
                    {k.replace(/([A-Z])/g, " $1")}
                  </Label>
                  <Select
                    value={(dd as any)[k]}
                    onValueChange={(v) =>
                      setF({ ...f, dueDiligence: { ...dd, [k]: v } as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Registering…" : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorSheet({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["grc-vendors"] });
  const [rating, setRating] = useState<RiskBand>(vendor.riskRating);
  const [note, setNote] = useState("");
  const [termination, setTermination] = useState("");

  const ratingMut = useMutation({
    mutationFn: () => updateVendorRating(vendor._id, rating, note),
    onSuccess: () => {
      invalidate();
      setNote("");
      toast({ title: "Rating updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update rating",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });
  const terminateMut = useMutation({
    mutationFn: () => terminateVendor(vendor._id, termination),
    onSuccess: () => {
      invalidate();
      toast({ title: "Vendor terminated" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to terminate",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{vendor.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{vendor.category}</Badge>
            <Badge variant="outline" className={bandTone(vendor.riskRating)}>
              {vendor.riskRating}
            </Badge>
            <Badge variant="outline">{vendor.status}</Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Services</div>
            <div className="text-sm">{vendor.services || "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(vendor.dueDiligence).map(([k, v]) => (
              <div key={k} className="border rounded p-2">
                <div className="text-xs text-muted-foreground capitalize">
                  {k.replace(/([A-Z])/g, " $1")}
                </div>
                <div>{v}</div>
              </div>
            ))}
          </div>

          {vendor.status === "Active" && (
            <div className="border-t pt-3">
              <div className="font-medium text-sm mb-2">Update risk rating</div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-xs">Rating</Label>
                  <Select
                    value={rating}
                    onValueChange={(v) => setRating(v as RiskBand)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High", "Extreme"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Note</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="mt-2"
                disabled={ratingMut.isPending}
                onClick={() => ratingMut.mutate()}
              >
                Save rating
              </Button>
            </div>
          )}

          <div className="border-t pt-3">
            <div className="font-medium text-sm mb-2">Rating history</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {vendor.ratingHistory.map((h, i) => (
                <li key={i}>
                  {new Date(h.at).toLocaleDateString()} —{" "}
                  <Badge variant="outline" className={bandTone(h.rating)}>
                    {h.rating}
                  </Badge>{" "}
                  {h.note}
                </li>
              ))}
            </ul>
          </div>

          {vendor.status === "Active" ? (
            <div className="border-t pt-3">
              <div className="font-medium text-sm mb-2">Terminate</div>
              <Textarea
                rows={2}
                value={termination}
                onChange={(e) => setTermination(e.target.value)}
                placeholder="Reason for termination"
              />
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                disabled={terminateMut.isPending}
                onClick={() => {
                  if (!termination.trim())
                    return toast({
                      title: "Reason required",
                      variant: "destructive",
                    });
                  terminateMut.mutate();
                }}
              >
                Terminate vendor
              </Button>
            </div>
          ) : (
            <div className="border-t pt-3 text-sm">
              <div className="font-medium">Terminated</div>
              <div className="text-muted-foreground text-xs mt-1">
                {vendor.terminatedAt &&
                  new Date(vendor.terminatedAt).toLocaleString()}{" "}
                — {vendor.terminationReason}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
