import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Plus,
  Upload,
  BadgeCheck,
  AlertTriangle,
  Clock,
  Award,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchCertifications,
  createCertification,
  updateCertStage,
  recordCertRenewal,
  addCertEvidence,
  deleteCertification,
  resolveComplianceFileUrl,
  daysUntil,
  todayStr,
  RENEWAL_STAGES,
  type Certification,
  type RenewalStage,
} from "@/lib/grc/compliance-api";

export default function ComplianceCertifications() {
  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ["compliance-certifications"],
    queryFn: fetchCertifications,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const current = certifications.find((c) => c._id === sel) ?? null;

  const expired = certifications.filter(
    (c) => daysUntil(c.expiryDate.slice(0, 10)) < 0,
  ).length;
  const dueSoon = certifications.filter((c) => {
    const d = daysUntil(c.expiryDate.slice(0, 10));
    return d >= 0 && d <= c.leadTimeDays;
  }).length;
  const ok = certifications.length - expired - dueSoon;

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading certifications…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Certifications</h1>
          <p className="text-sm text-muted-foreground">
            Licences, accreditations and memberships — with calendar-driven
            renewal management.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add certification
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="In good standing"
          value={ok}
          icon={BadgeCheck}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Renewal window open"
          value={dueSoon}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
        <Stat
          label="Expired"
          value={expired}
          icon={AlertTriangle}
          tone="from-rose-500 to-red-500"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {certifications.map((c) => {
          const d = daysUntil(c.expiryDate.slice(0, 10));
          const tone =
            d < 0
              ? "text-rose-600 border-rose-500/30"
              : d <= c.leadTimeDays
                ? "text-amber-600 border-amber-500/30"
                : "text-emerald-600 border-emerald-500/30";
          const pct = Math.max(
            0,
            Math.min(100, ((c.leadTimeDays - d) / c.leadTimeDays) * 100),
          );
          return (
            <Card
              key={c._id}
              className="cursor-pointer hover:shadow-md transition"
              onClick={() => setSel(c._id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.issuingBody} · {c.certificateNumber}
                    </div>
                  </div>
                  <Badge variant="outline" className={tone}>
                    {d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d}d to expiry`}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Responsible: {c.responsiblePerson}
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between items-center pt-1">
                  <Badge variant="outline" className="text-xs">
                    {c.renewalStage}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Renewal cost {c.cost.toLocaleString()} {c.currency}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {certifications.length === 0 && (
          <div className="col-span-2 text-center text-sm text-muted-foreground py-10">
            No certifications registered yet.
          </div>
        )}
      </div>

      <NewCertDialog open={newOpen} onOpenChange={setNewOpen} />
      {current && <CertSheet cert={current} onClose={() => setSel(null)} />}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center shadow-sm`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewCertDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    name: "",
    issuingBody: "",
    certificateNumber: "",
    issueDate: todayStr(),
    expiryDate: todayStr(),
    renewalRequirements: "",
    cost: 0,
    currency: "RWF",
    responsiblePerson: "",
    leadTimeDays: 60,
  });

  const mutation = useMutation({
    mutationFn: () => createCertification(f),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["compliance-certifications"],
      });
      toast({ title: "Certification registered" });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to register",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!f.name)
      return toast({ title: "Name required", variant: "destructive" });
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add certification</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Issuing body</Label>
              <Input
                value={f.issuingBody}
                onChange={(e) => setF({ ...f, issuingBody: e.target.value })}
              />
            </div>
            <div>
              <Label>Certificate number</Label>
              <Input
                value={f.certificateNumber}
                onChange={(e) =>
                  setF({ ...f, certificateNumber: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Issue date</Label>
              <Input
                type="date"
                value={f.issueDate}
                onChange={(e) => setF({ ...f, issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={f.expiryDate}
                onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Alert lead (days)</Label>
              <Input
                type="number"
                value={f.leadTimeDays}
                onChange={(e) =>
                  setF({ ...f, leadTimeDays: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Renewal requirements</Label>
            <Textarea
              rows={2}
              value={f.renewalRequirements}
              onChange={(e) =>
                setF({ ...f, renewalRequirements: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                value={f.cost}
                onChange={(e) => setF({ ...f, cost: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={f.currency}
                onChange={(e) => setF({ ...f, currency: e.target.value })}
              />
            </div>
            <div>
              <Label>Responsible</Label>
              <Input
                value={f.responsiblePerson}
                onChange={(e) =>
                  setF({ ...f, responsiblePerson: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CertSheet({
  cert,
  onClose,
}: {
  cert: Certification;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["compliance-certifications"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const [files, setFiles] = useState<File[]>([]);
  const [newExpiry, setNewExpiry] = useState("");

  const stageMut = useMutation({
    mutationFn: (stage: RenewalStage) => updateCertStage(cert._id, stage),
    onSuccess: invalidate,
    onError: onErr("Failed to update stage"),
  });
  const renewMut = useMutation({
    mutationFn: () => recordCertRenewal(cert._id, newExpiry),
    onSuccess: () => {
      invalidate();
      setNewExpiry("");
      toast({
        title: "Register updated",
        description: "Renewal recorded and calendar rescheduled.",
      });
    },
    onError: onErr("Failed to record renewal"),
  });
  const evidenceMut = useMutation({
    mutationFn: () => addCertEvidence(cert._id, files),
    onSuccess: () => {
      invalidate();
      setFiles([]);
    },
    onError: onErr("Failed to upload evidence"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteCertification(cert._id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: onErr("Failed to delete"),
  });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{cert.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{cert.issuingBody}</Badge>
            <Badge variant="outline">{cert.certificateNumber}</Badge>
            <Badge variant="outline">{cert.renewalStage}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Issued</div>
              {cert.issueDate.slice(0, 10)}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expires</div>
              {cert.expiryDate.slice(0, 10)}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Alert lead time
              </div>
              {cert.leadTimeDays} days
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Renewal cost</div>
              {cert.cost.toLocaleString()} {cert.currency}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Renewal requirements
            </div>
            <div className="text-sm">{cert.renewalRequirements}</div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="font-medium text-sm flex items-center gap-2">
              <Award className="h-4 w-4" />
              Renewal workflow
            </div>
            <Select
              value={cert.renewalStage}
              onValueChange={(v) => stageMut.mutate(v as RenewalStage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RENEWAL_STAGES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">New expiry on approval</Label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={renewMut.isPending}
                onClick={() => {
                  if (!newExpiry)
                    return toast({
                      title: "Pick the new expiry date",
                      variant: "destructive",
                    });
                  renewMut.mutate();
                }}
              >
                Record renewal
              </Button>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="font-medium text-sm">Renewal evidence</div>
            {cert.evidence.map((e, i) => (
              <div
                key={i}
                className="text-xs flex justify-between border rounded px-2 py-1"
              >
                {e.fileUrl ? (
                  <a
                    href={resolveComplianceFileUrl(e.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {e.name}
                  </a>
                ) : (
                  <span>{e.name}</span>
                )}
                <span className="text-muted-foreground">
                  {e.uploadedBy} · {new Date(e.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {cert.evidence.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No documents attached.
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="file"
                multiple
                onChange={(e) =>
                  setFiles(e.target.files ? Array.from(e.target.files) : [])
                }
              />
              <Button
                size="sm"
                variant="outline"
                disabled={files.length === 0 || evidenceMut.isPending}
                onClick={() => evidenceMut.mutate()}
              >
                <Upload className="h-4 w-4 mr-1" />
                {evidenceMut.isPending ? "Uploading…" : "Add"}
              </Button>
            </div>
          </div>

          <Button
            variant="destructive"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete certification
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
