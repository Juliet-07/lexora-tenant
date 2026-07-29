import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPolicyAckSnapshot,
  submitPolicyAck,
  resolvePolicyFileUrl,
} from "@/lib/grc/policy-api";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const PDF_LOAD_OPTIONS = { disableRange: true, disableStream: true };

export default function PolicyAckPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["policy-ack", token],
    queryFn: () => fetchPolicyAckSnapshot(token!),
    enabled: !!token,
    retry: false,
  });

  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (snap) setName(snap.prefillName);
  }, [snap]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitPolicyAck(token!, {
        name: name.trim(),
        signature: signature.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Acknowledgement recorded" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to submit",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );

  if (isError || !snap) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto">
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
      </Shell>
    );
  }

  if (snap.alreadyAcknowledged && !submitted) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto border-emerald-200">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div className="text-lg font-semibold">Already acknowledged</div>
            <p className="text-sm text-muted-foreground">
              You have already acknowledged "{snap.title}".
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <Card className="max-w-md mx-auto border-emerald-200">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div className="text-lg font-semibold">
              Acknowledgement recorded
            </div>
            <p className="text-sm text-muted-foreground">
              Thank you. Your acknowledgement of "{snap.title}" has been logged.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const isPdf = snap.mimeType === "application/pdf";
  const canSubmit = reviewed && confirmed && name.trim() && signature.trim();

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" /> Board policy acknowledgement
            </div>
            <h1 className="text-2xl font-bold mt-2">{snap.title}</h1>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              {snap.category && (
                <Badge variant="secondary">{snap.category}</Badge>
              )}
              <Badge variant="secondary">
                Issued {new Date(snap.uploadedAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium mb-2">
                1. Review the document
              </div>
              {isPdf && snap.fileUrl ? (
                <PolicyPdfViewer
                  url={resolvePolicyFileUrl(snap.fileUrl)}
                  onScrolledToEnd={() => setReviewed(true)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{snap.fileName}</span>
                  </div>
                  {snap.fileUrl ? (
                    <a
                      href={resolvePolicyFileUrl(snap.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setReviewed(true)}
                    >
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewed(true)}
                    >
                      Mark as reviewed
                    </Button>
                  )}
                </div>
              )}
              {!reviewed && (
                <p className="text-xs text-muted-foreground mt-2">
                  {isPdf
                    ? "Scroll to the last page to continue."
                    : "Download the document to continue."}
                </p>
              )}
            </div>

            <div className={reviewed ? "" : "opacity-50 pointer-events-none"}>
              <div className="text-sm font-medium mb-2">
                2. Confirm and sign
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  />
                  <Label className="text-sm font-normal leading-snug">
                    I confirm I have received, read and understood this policy
                    and agree to be bound by it.
                  </Label>
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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

            <Button
              className="w-full"
              disabled={!canSubmit || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending
                ? "Submitting…"
                : "Record my acknowledgement"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function PolicyPdfViewer({
  url,
  onScrolledToEnd,
}: {
  url: string;
  onScrolledToEnd: () => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const firedRef = useState({ fired: false })[0];

  return (
    <div
      onScroll={(e) => {
        const el = e.currentTarget;
        if (
          !firedRef.fired &&
          el.scrollTop + el.clientHeight >= el.scrollHeight - 20
        ) {
          firedRef.fired = true;
          onScrolledToEnd();
        }
      }}
      className="border rounded-md overflow-y-auto bg-muted/10"
      style={{ maxHeight: 420 }}
    >
      <Document
        file={url}
        options={PDF_LOAD_OPTIONS}
        onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
        loading={
          <p className="text-center text-sm text-muted-foreground py-8">
            Loading document…
          </p>
        }
        error={
          <p className="text-center text-sm text-red-600 py-8">
            Failed to load PDF.
          </p>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page key={i} pageNumber={i + 1} width={560} />
        ))}
      </Document>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30 py-10 px-4">{children}</div>;
}
