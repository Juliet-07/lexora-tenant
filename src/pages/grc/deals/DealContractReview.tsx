import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  addExternalRedline,
  fetchReviewSnapshot,
  submitReview,
  type ContractReviewSnapshot,
} from "@/lib/grc/deals-api";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const PDF_LOAD_OPTIONS = { disableRange: true, disableStream: true };

const resolveFileUrl = (url: string | null): string | null => {
  if (!url) return null;
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  return `${base}${url}`;
};

export default function DealContractReviewPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["contract-review", token],
    queryFn: () =>
      fetchReviewSnapshot(
        "contract",
        token!,
      ) as Promise<ContractReviewSnapshot>,
    enabled: !!token,
    retry: false,
  });

  const [name, setName] = useState("");
  const [decision, setDecision] = useState<
    "Approved" | "Changes Requested" | ""
  >("");
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (snap) setName(snap.prefillName);
  }, [snap]);

  const mutation = useMutation({
    mutationFn: () =>
      submitReview("contract", token!, {
        name: name.trim(),
        decision: decision as any,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Response recorded");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit"),
  });

  if (isLoading)
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  if (isError || !snap)
    return (
      <Shell>
        <InvalidCard />
      </Shell>
    );
  if (
    snap.alreadyResponded &&
    snap.previousDecision === "Approved" &&
    !submitted
  ) {
    return (
      <Shell>
        <DoneCard
          title="Already approved"
          body={`You have already approved the contract for "${snap.dealName}".`}
        />
      </Shell>
    );
  }
  if (submitted) {
    return (
      <Shell>
        <DoneCard
          title="Response recorded"
          body={`Thank you, ${name}. Your response for "${snap.dealName}" has been logged.`}
        />
      </Shell>
    );
  }

  const canSubmit =
    reviewed &&
    name.trim() &&
    decision &&
    (decision !== "Changes Requested" || comment.trim());

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-5">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-90">
              <ShieldCheck className="h-4 w-4" />
              Contract review
            </div>
            <h1 className="text-2xl font-bold mt-2">{snap.dealName}</h1>
          </div>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="text-sm font-medium">1. Review the document</div>
            {snap.pdfUrl ? (
              <ReviewPdfViewer
                url={resolveFileUrl(snap.pdfUrl)!}
                onScrolledToEnd={() => setReviewed(true)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No document available yet.
              </p>
            )}
            {!reviewed && (
              <p className="text-xs text-muted-foreground">
                Scroll to the last page to continue.
              </p>
            )}
          </CardContent>
        </Card>

        <ExternalRedlineCard token={token!} sections={snap.sections ?? []} />

        <Card className={reviewed ? "" : "opacity-50 pointer-events-none"}>
          <CardContent className="p-5 space-y-3">
            <div className="text-sm font-medium">2. Confirm and sign</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDecision("Approved")}
                className={`text-left border rounded-lg p-4 transition ${decision === "Approved" ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "hover:border-emerald-300"}`}
              >
                <div className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approve
                </div>
              </button>
              <button
                onClick={() => setDecision("Changes Requested")}
                className={`text-left border rounded-lg p-4 transition ${decision === "Changes Requested" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "hover:border-amber-300"}`}
              >
                <div className="font-medium">Request changes</div>
              </button>
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>
                Comment{" "}
                {decision === "Approved" && (
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </Label>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  decision === "Changes Requested"
                    ? "Describe the requested changes…"
                    : ""
                }
              />
            </div>
            <Button
              className="w-full"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting…" : "Submit response"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function ReviewPdfViewer({
  url,
  onScrolledToEnd,
}: {
  url: string;
  onScrolledToEnd: () => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [fired, setFired] = useState(false);

  return (
    <div
      onScroll={(e) => {
        const el = e.currentTarget;
        if (!fired && el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
          setFired(true);
          onScrolledToEnd();
        }
      }}
      className="border rounded-md overflow-y-auto bg-muted/10"
      style={{ maxHeight: 480 }}
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

function ExternalRedlineCard({
  token,
  sections,
}: {
  token: string;
  sections: ContractReviewSnapshot["sections"];
}) {
  const queryClient = useQueryClient();
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [draftLine, setDraftLine] = useState<number | null>(null);
  const [text, setText] = useState("");

  const mutation = useMutation({
    mutationFn: ({
      sectionIndex,
      lineIndex,
      comment,
    }: {
      sectionIndex: number;
      lineIndex: number;
      comment: string;
    }) => addExternalRedline(token, sectionIndex, lineIndex, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-review", token] });
      setText("");
      setDraftLine(null);
      toast.success("Redline added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add redline"),
  });

  if (!sections || sections.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="text-sm font-medium">
          Redline (optional) — comment on any specific line
        </div>
        {sections.map((s) => (
          <div key={s.index} className="border rounded-md">
            <button
              className="w-full text-left p-2 text-sm font-medium flex items-center justify-between"
              onClick={() =>
                setOpenSection(openSection === s.index ? null : s.index)
              }
            >
              {s.title}
              <span className="text-xs text-muted-foreground">
                {s.redlines.length} redline{s.redlines.length === 1 ? "" : "s"}
              </span>
            </button>
            {openSection === s.index && (
              <div className="p-2 pt-0 space-y-1.5">
                {s.lines.map((line, lineIdx) => {
                  const lineRedlines = s.redlines.filter(
                    (r) => r.lineIndex === lineIdx,
                  );
                  return (
                    <div key={lineIdx} className="border rounded p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex-1">{line}</span>
                        <button
                          className="text-rose-600 hover:text-rose-700 shrink-0"
                          onClick={() => {
                            setDraftLine(
                              draftLine === lineIdx ? null : lineIdx,
                            );
                            setText("");
                          }}
                        >
                          +
                        </button>
                      </div>
                      {lineRedlines.map((r, ri) => (
                        <div
                          key={ri}
                          className="mt-1.5 pl-2 border-l-2 border-rose-300 text-[11px]"
                        >
                          <span className="font-medium">{r.authorName}</span>{" "}
                          <span className="text-muted-foreground">
                            ({new Date(r.createdAt).toLocaleDateString()})
                          </span>
                          <div>{r.comment}</div>
                        </div>
                      ))}
                      {draftLine === lineIdx && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Your comment…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            disabled={!text.trim() || mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                sectionIndex: s.index,
                                lineIndex: lineIdx,
                                comment: text,
                              })
                            }
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InvalidCard() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6 text-center space-y-2">
        <div className="text-lg font-semibold">Review link invalid</div>
        <p className="text-sm text-muted-foreground">
          This link is no longer valid. Please contact the deal team for a new
          one.
        </p>
      </CardContent>
    </Card>
  );
}

function DoneCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="max-w-md mx-auto border-emerald-200">
      <CardContent className="p-8 text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30 py-10 px-4">{children}</div>;
}
