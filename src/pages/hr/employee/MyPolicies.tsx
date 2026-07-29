import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  acknowledgePolicy,
  useUploadedPolicies,
  type UploadedPolicy,
} from "@/lib/grc/policyAckStore";

export default function MyPolicies() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const all = useUploadedPolicies();
  const policies = useMemo(
    () => all.filter((p) => p.type === "organisation"),
    [all],
  );
  const [active, setActive] = useState<UploadedPolicy | null>(null);

  const isAcked = (p: UploadedPolicy) =>
    p.acknowledgments.some((a) => a.email.toLowerCase() === email.toLowerCase());

  const pending = policies.filter((p) => !isAcked(p));
  const done = policies.filter(isAcked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Policies</h1>
        <p className="text-sm text-muted-foreground">
          Read the policies published by your organisation and record your
          acknowledgement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Published" value={policies.length} icon={FileText} />
        <StatCard label="Pending" value={pending.length} icon={ShieldCheck} />
        <StatCard label="Acknowledged" value={done.length} icon={CheckCircle2} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="done">Acknowledged ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PolicyGrid
            list={pending}
            emptyText="Nothing pending — you're all caught up."
            onAck={setActive}
          />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          <PolicyGrid list={done} emptyText="No acknowledged policies yet." acked />
        </TabsContent>
      </Tabs>

      <AckDialog policy={active} onClose={() => setActive(null)} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyGrid({
  list,
  emptyText,
  onAck,
  acked,
}: {
  list: UploadedPolicy[];
  emptyText: string;
  onAck?: (p: UploadedPolicy) => void;
  acked?: boolean;
}) {
  if (list.length === 0)
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          {emptyText}
        </CardContent>
      </Card>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((p) => (
        <Card key={p.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="truncate">{p.title}</span>
              {acked ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">Acknowledged</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {p.category && <Badge variant="outline">{p.category}</Badge>}
              <span className="text-muted-foreground">
                Published {new Date(p.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{p.fileName}</span>
            </div>
            <div className="flex gap-2">
              {p.fileDataUrl && (
                <a href={p.fileDataUrl} download={p.fileName}>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </a>
              )}
              {onAck && (
                <Button size="sm" onClick={() => onAck(p)}>
                  Acknowledge
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AckDialog({
  policy,
  onClose,
}: {
  policy: UploadedPolicy | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState("");
  if (!policy) return null;

  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  const submit = () => {
    if (!confirmed || !signature.trim())
      return toast({ title: "Confirm and sign to continue", variant: "destructive" });
    acknowledgePolicy(policy.id, {
      name: fullName || signature.trim(),
      email: user?.email ?? "",
      signature: signature.trim(),
      source: "employee",
    });
    toast({ title: "Acknowledgement recorded" });
    setConfirmed(false);
    setSignature("");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acknowledge “{policy.title}”</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(Boolean(v))}
            />
            <Label className="text-sm font-normal leading-snug">
              I confirm I have read and understood this policy and agree to comply
              with it.
            </Label>
          </div>
          <div>
            <Label>Type your full name as signature</Label>
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit}>Submit acknowledgement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
