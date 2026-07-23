import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  CalendarClock,
  MapPin,
  Users2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getSharedMeeting,
  saveMeetingAck,
  type SharedMeetingSnapshot,
  type SharedMeetingDoc,
  type DocAck,
} from "@/lib/grcGovernanceLocal";
import { resolveGrcFileUrl } from "@/lib/grc/governance-api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function isPdf(d: SharedMeetingDoc) {
  const url = d.fileUrl?.toLowerCase() ?? "";
  const mt = d.mimeType?.toLowerCase() ?? "";
  return mt.includes("pdf") || url.endsWith(".pdf") || d.name.toLowerCase().endsWith(".pdf");
}
function isImage(d: SharedMeetingDoc) {
  const url = d.fileUrl?.toLowerCase() ?? "";
  const mt = d.mimeType?.toLowerCase() ?? "";
  return (
    mt.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].some(
      (ext) => url.endsWith(ext) || d.name.toLowerCase().endsWith(ext),
    )
  );
}

export default function MeetingAckPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [search] = useSearchParams();
  const emailParam = search.get("email") ?? "";
  const nameParam = search.get("name") ?? "";

  const snap = useMemo<SharedMeetingSnapshot | null>(
    () => (meetingId ? getSharedMeeting(meetingId) : null),
    [meetingId],
  );

  const [name, setName] = useState(nameParam);
  const [email, setEmail] = useState(emailParam);
  const [signature, setSignature] = useState("");
  const [agendaConfirmed, setAgendaConfirmed] = useState(false);
  const [docAcks, setDocAcks] = useState<Record<number, DocAck>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!snap) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-lg font-semibold">Acknowledgement link invalid</div>
            <p className="text-sm text-muted-foreground">
              This acknowledgement link could not be found on this device. Please
              open the original link sent to your email from the same browser it
              was shared to, or contact the meeting organiser.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDocsAcked = snap.boardPack.every((_, i) => docAcks[i]);
  const canSubmit =
    !!name.trim() &&
    !!email.trim() &&
    !!signature.trim() &&
    agendaConfirmed &&
    allDocsAcked;

  const submit = () => {
    if (!canSubmit) return;
    saveMeetingAck({
      meetingId: snap.meetingId,
      attendeeName: name.trim(),
      attendeeEmail: email.trim(),
      agendaConfirmed,
      documents: Object.values(docAcks),
      confirmedAt: new Date().toISOString(),
      signature: signature.trim(),
    });
    setSubmitted(true);
    toast({ title: "Receipt recorded", description: "Thank you." });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <div className="text-lg font-semibold">Acknowledgement recorded</div>
            <p className="text-sm text-muted-foreground">
              Thank you, {name}. The organiser has been notified that you
              received and reviewed the board pack for “{snap.title}”.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Board Pack Acknowledgement</h1>
          <p className="text-sm text-muted-foreground">
            Please confirm you have received the meeting materials and reviewed
            them.
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="font-semibold">{snap.title}</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{snap.type}</Badge>
              <Badge variant="outline" className="gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(snap.date).toLocaleString()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {snap.mode === "Online"
                  ? `${snap.platform ?? "Online"}`
                  : snap.venue || "Physical"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users2 className="h-3 w-3" />
                {snap.attendees.length} attendees
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Chair:</span> {snap.chair}
            </div>
            {snap.notes && (
              <p className="text-sm text-muted-foreground border-l-2 pl-2">
                {snap.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-semibold text-sm">Agenda</div>
            <ol className="text-sm space-y-1 list-decimal pl-5">
              {snap.agenda.map((a, i) => (
                <li key={i}>
                  {a.title}
                  {a.presenter && (
                    <span className="text-muted-foreground"> — {a.presenter}</span>
                  )}
                  {a.durationMinutes ? (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({a.durationMinutes}m)
                    </span>
                  ) : null}
                </li>
              ))}
              {snap.agenda.length === 0 && (
                <li className="list-none text-muted-foreground">No agenda items.</li>
              )}
            </ol>
            <label className="flex items-center gap-2 text-sm pt-2 border-t">
              <Checkbox
                checked={agendaConfirmed}
                onCheckedChange={(v) => setAgendaConfirmed(!!v)}
              />
              I have read and understood the agenda above.
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="font-semibold text-sm">
              Board pack documents ({snap.boardPack.length})
            </div>
            {snap.boardPack.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No documents were attached to this meeting.
              </p>
            )}
            {snap.boardPack.map((doc, i) => (
              <DocumentAckBlock
                key={i}
                doc={doc}
                acked={docAcks[i] ?? null}
                onAck={(ack) => setDocAcks((prev) => ({ ...prev, [i]: ack }))}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-semibold text-sm">Your details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="e.g. Jane Doe"
                className="font-serif italic"
              />
            </div>
            <Button className="w-full" disabled={!canSubmit} onClick={submit}>
              Confirm receipt & review
            </Button>
            {!canSubmit && (
              <p className="text-xs text-muted-foreground text-center">
                Complete your details, review every document, and sign to enable
                submission.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocumentAckBlock({
  doc,
  acked,
  onAck,
}: {
  doc: SharedMeetingDoc;
  acked: DocAck | null;
  onAck: (ack: DocAck) => void;
}) {
  const fileUrl = doc.fileUrl ? resolveGrcFileUrl(doc.fileUrl) : null;
  const pdf = isPdf(doc);
  const img = isImage(doc);

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2">
        {pdf ? (
          <FileText className="h-4 w-4 text-red-600" />
        ) : img ? (
          <ImageIcon className="h-4 w-4 text-blue-600" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium flex-1 truncate">{doc.name}</span>
        {acked && (
          <Badge variant="outline" className="gap-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Reviewed
          </Badge>
        )}
      </div>

      {!fileUrl && (
        <p className="text-xs text-muted-foreground">
          Document file is not accessible from this link.
        </p>
      )}

      {fileUrl && pdf && (
        <PdfViewer
          url={fileUrl}
          onScrolledToEnd={() =>
            !acked &&
            onAck({
              name: doc.name,
              fileUrl: doc.fileUrl,
              ackedAt: new Date().toISOString(),
              method: "pdf-scroll",
            })
          }
          acked={!!acked}
        />
      )}

      {fileUrl && img && (
        <ImageAckBlock
          url={fileUrl}
          name={doc.name}
          acked={!!acked}
          onDownloaded={() =>
            !acked &&
            onAck({
              name: doc.name,
              fileUrl: doc.fileUrl,
              ackedAt: new Date().toISOString(),
              method: "image-download",
            })
          }
        />
      )}

      {fileUrl && !pdf && !img && (
        <div className="space-y-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline"
          >
            Open document
          </a>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={!!acked}
              onCheckedChange={(v) =>
                v &&
                onAck({
                  name: doc.name,
                  fileUrl: doc.fileUrl,
                  ackedAt: new Date().toISOString(),
                  method: "other",
                })
              }
            />
            I confirm I have opened and reviewed this document.
          </label>
        </div>
      )}
    </div>
  );
}

function PdfViewer({
  url,
  onScrolledToEnd,
  acked,
}: {
  url: string;
  onScrolledToEnd: () => void;
  acked: boolean;
}) {
  const [numPages, setNumPages] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      if (!reachedEnd) {
        setReachedEnd(true);
        onScrolledToEnd();
      }
    }
  };

  // Very short PDFs may fit without scrolling — enable ack after a moment.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) return;
    if (el.scrollHeight <= el.clientHeight + 8) {
      const t = setTimeout(() => {
        if (!reachedEnd) {
          setReachedEnd(true);
          onScrolledToEnd();
        }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [numPages, reachedEnd, onScrolledToEnd]);

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="border rounded bg-white h-[420px] overflow-y-auto"
      >
        <Document
          file={url}
          onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
          loading={
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading document…
            </div>
          }
          error={
            <div className="p-6 text-center text-sm text-red-600">
              Failed to load PDF.
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={600}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="mx-auto my-2 shadow-sm"
            />
          ))}
        </Document>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {acked || reachedEnd
          ? "Scrolled to end — review confirmed."
          : `Scroll to the last page (${numPages || "…"} pages) to confirm you have read the full document.`}
      </p>
    </div>
  );
}

function ImageAckBlock({
  url,
  name,
  acked,
  onDownloaded,
}: {
  url: string;
  name: string;
  acked: boolean;
  onDownloaded: () => void;
}) {
  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      onDownloaded();
    } catch {
      // Fallback for CORS-restricted downloads: opening the image and
      // treating that as a review action.
      window.open(url, "_blank");
      onDownloaded();
    }
  };

  return (
    <div className="space-y-2">
      <img
        src={url}
        alt={name}
        className="max-h-72 w-auto mx-auto border rounded bg-white"
      />
      <div className="flex justify-center">
        <Button size="sm" variant={acked ? "outline" : "default"} onClick={download}>
          <Download className="h-4 w-4 mr-1" />
          {acked ? "Downloaded" : "Download image to confirm review"}
        </Button>
      </div>
    </div>
  );
}
