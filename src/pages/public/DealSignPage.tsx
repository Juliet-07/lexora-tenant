import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eraser, FileSignature, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSigningPage,
  submitSignature,
  type SigningPageData,
} from "@/lib/grc/deals-api";
import { DealDocumentViewer } from "@/components/grc/DealDocumentPreview";

// The page an authorised signatory opens from their emailed link: read the
// document, sign it (typed or drawn), done. No account needed.
export default function DealSignPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["deal-sign", token],
    queryFn: () => fetchSigningPage(token!),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [name, setName] = useState("");
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [drawn, setDrawn] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (data) setName(data.signatory.name);
  }, [data?.signatory.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: () =>
      submitSignature(token!, {
        name: name.trim(),
        method,
        signatureData: method === "drawn" ? (drawn ?? undefined) : undefined,
        consent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-sign", token] });
      toast.success("Signed");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Could not record your signature",
      ),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  if (isError || !data)
    return (
      <Shell>
        <Message
          title="Signing link not valid"
          body="This link is no longer valid. Please ask the sender for a new one."
        />
      </Shell>
    );

  if (data.state === "signed")
    return (
      <Shell>
        <SignedView data={data} />
      </Shell>
    );

  const canSign =
    consent &&
    name.trim().length > 0 &&
    (method === "typed" || !!drawn) &&
    data.state === "ready";

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 p-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" />
              {data.businessName} · Signing
            </div>
            <h1 className="mt-2 text-2xl font-bold">{data.documentName}</h1>
            <p className="mt-1 text-sm opacity-90">{data.dealName}</p>
          </div>
        </Card>

        {data.state === "changed" ? (
          <Message
            title="This document has changed"
            body="It was edited after it was sent to you, so it can't be signed from this link. Please ask the sender to send it again."
          />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-2 p-5">
                <div className="text-sm font-medium">1. Read the document</div>
                <DealDocumentViewer
                  preview={data.preview}
                  title={data.documentName}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="text-sm font-medium">
                  2. Sign as {data.signatory.side}
                  {data.signatory.title ? ` (${data.signatory.title})` : ""}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sign-name">Full name</Label>
                  <Input
                    id="sign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex rounded-md border p-0.5 text-sm">
                    {(["typed", "drawn"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`rounded px-3 py-1 ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                      >
                        {m === "typed" ? "Type" : "Draw"}
                      </button>
                    ))}
                  </div>
                  {method === "typed" ? (
                    <div
                      className="flex h-24 items-center justify-center rounded-md border bg-white px-4 font-serif text-3xl italic text-slate-800"
                      data-testid="typed-signature"
                    >
                      {name.trim() || (
                        <span className="text-base not-italic text-slate-400">
                          Your name appears here
                        </span>
                      )}
                    </div>
                  ) : (
                    <SignaturePad onChange={setDrawn} />
                  )}
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I have read this document and agree to sign it
                    electronically on behalf of {data.signatory.side}. I
                    understand this is legally binding.
                  </span>
                </label>

                <Button
                  className="w-full"
                  disabled={!canSign || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  <FileSignature className="mr-1.5 h-4 w-4" />
                  {mutation.isPending ? "Signing…" : "Sign document"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}

function SignedView({ data }: { data: SigningPageData }) {
  const waiting = data.others.filter((o) => !o.signed);
  return (
    <Card className="mx-auto max-w-md border-emerald-200">
      <CardContent className="space-y-3 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <div className="text-lg font-semibold">You have signed</div>
        <p className="text-sm text-muted-foreground">
          {data.documentName} · {data.dealName}
        </p>
        {data.signatureData &&
          (data.signatureMethod === "drawn" ? (
            <img
              src={data.signatureData}
              alt="Your signature"
              className="mx-auto h-16 rounded border bg-white p-1"
            />
          ) : (
            <div className="font-serif text-2xl italic">
              {data.signatureData}
            </div>
          ))}
        <p className="text-sm text-muted-foreground">
          {data.completed
            ? "Everyone has signed. The sender will share the executed copy."
            : waiting.length > 0
              ? `Waiting for ${waiting.map((w) => `${w.name} (${w.side})`).join(" and ")} to sign.`
              : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function SignaturePad({
  onChange,
}: {
  onChange: (png: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ref.current!.getContext("2d")!;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={ref}
        width={600}
        height={160}
        data-testid="signature-pad"
        aria-label="Draw your signature"
        className="h-40 w-full touch-none rounded-md border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{empty ? "Draw with your mouse or finger" : "Looks good?"}</span>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-2 p-6 text-center">
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30 px-4 py-10">{children}</div>;
}
