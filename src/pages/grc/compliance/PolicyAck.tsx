import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  acknowledgePolicyByToken,
  findPolicyByToken,
} from "@/lib/grc/policyAckStore";

export default function PolicyAckPage() {
  const { token } = useParams<{ token: string }>();
  const policy = useMemo(() => findPolicyByToken(token ?? ""), [token]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!policy || policy.type !== "board") {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-lg font-semibold">
              Acknowledgement link invalid
            </div>
            <p className="text-sm text-muted-foreground">
              This policy link is no longer valid. Please contact the company
              secretary for a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div className="text-lg font-semibold">Acknowledgement recorded</div>
            <p className="text-sm text-muted-foreground">
              Thank you. Your acknowledgement of “{policy.title}” has been logged.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit =
    opened && confirmed && name.trim() && email.trim() && signature.trim();

  const submit = () => {
    if (!canSubmit)
      return toast({
        title: "Complete all steps first",
        variant: "destructive",
      });
    acknowledgePolicyByToken(policy.token, {
      name: name.trim(),
      email: email.trim(),
      signature: signature.trim(),
      source: "external",
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" /> Board policy acknowledgement
            </div>
            <h1 className="text-2xl font-bold mt-2">{policy.title}</h1>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {policy.category && (
                <Badge variant="secondary">{policy.category}</Badge>
              )}
              <Badge variant="secondary">
                Issued {new Date(policy.uploadedAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium mb-2">1. Review the document</div>
              <div className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{policy.fileName}</span>
                </div>
                {policy.fileDataUrl ? (
                  <a
                    href={policy.fileDataUrl}
                    download={policy.fileName}
                    onClick={() => setOpened(true)}
                  >
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setOpened(true)}>
                    Mark as reviewed
                  </Button>
                )}
              </div>
              {!opened && (
                <p className="text-xs text-muted-foreground mt-2">
                  Download and read the document to continue.
                </p>
              )}
            </div>

            <div className={opened ? "" : "opacity-50 pointer-events-none"}>
              <div className="text-sm font-medium mb-2">2. Confirm and sign</div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  />
                  <Label className="text-sm font-normal leading-snug">
                    I confirm I have received, read and understood this policy and
                    agree to be bound by it.
                  </Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Full name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Signature (type your full name)</Label>
                  <Input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button className="w-full" disabled={!canSubmit} onClick={submit}>
              Record my acknowledgement
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
