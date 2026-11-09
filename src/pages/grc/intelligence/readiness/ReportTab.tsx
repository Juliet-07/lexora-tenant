import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  FileDown,
  FileText,
  Send,
  Wand2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import {
  REPORT_STATUSES,
  downloadReadinessReport,
  downloadReadinessReportDocx,
  redraftReportSection,
  updateReportMeta,
  updateReportSection,
  type ReadinessAssessment,
  type ReportSectionFlag,
  type ReportSectionState,
  type ReportStatus,
} from "@/lib/grc/readiness-api";
import { NeedsAssessment, fail, fmtDate, type TabProps } from "./shared";
import { SendReportDialog } from "./SendDialogs";

const STATE_STYLE: Record<ReportSectionState, string> = {
  Auto: "text-sky-600 border-sky-500/40 bg-sky-500/10",
  Review: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  Incomplete: "text-rose-600 border-rose-500/40 bg-rose-500/10",
  Approved: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
};

// Sections only a person can write (the engine has nothing to draft
// them from).
const HAND_WRITTEN = new Set(["Business model and traction"]);

const CONFIDENTIALITY = [
  "Strictly confidential",
  "Confidential",
  "Internal only",
];

function words(a: ReadinessAssessment): number {
  return a.reportSections.reduce(
    (n, s) => n + (s.content.trim() ? s.content.trim().split(/\s+/).length : 0),
    0,
  );
}

export function ReportTab({
  current,
  ws,
  onAssessment,
  onWorkspace,
  onNew,
}: TabProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const [notes, setNotes] = useState(current?.versionNotes ?? "");
  useEffect(
    () => setNotes(current?.versionNotes ?? ""),
    [current?._id, current?.versionNotes],
  );

  const meta = useMutation({
    mutationFn: (dto: Parameters<typeof updateReportMeta>[1]) =>
      updateReportMeta(current!._id, dto),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not save", e),
  });
  const pdf = useMutation({
    mutationFn: () => downloadReadinessReport(current!._id),
    onError: (e) => fail("Could not export the PDF", e),
  });
  const docx = useMutation({
    mutationFn: () => downloadReadinessReportDocx(current!._id),
    onError: (e) => fail("Could not export the Word file", e),
  });

  if (!current) return <NeedsAssessment onNew={onNew} />;

  const counts = (st: ReportSectionState) =>
    current.reportSections.filter((s) => s.state === st).length;
  const incomplete = counts("Incomplete");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <span className="block text-[11px] text-muted-foreground">
              Report status
            </span>
            <Select
              value={current.reportStatus}
              onValueChange={(v) =>
                meta.mutate({ reportStatus: v as ReportStatus })
              }
            >
              <SelectTrigger
                className="h-9 w-[160px]"
                aria-label="Report status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="block text-[11px] text-muted-foreground">
              Confidentiality
            </span>
            <Select
              value={current.confidentiality}
              onValueChange={(v) => meta.mutate({ confidentiality: v })}
            >
              <SelectTrigger
                className="h-9 w-[190px]"
                aria-label="Confidentiality"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENTIALITY.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Word count
            </span>
            <span className="text-lg font-semibold">
              {words(current).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => pdf.mutate()}
            disabled={pdf.isPending}
          >
            <FileDown className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => docx.mutate()}
            disabled={docx.isPending}
          >
            <FileText className="mr-2 h-4 w-4" /> Export Word
          </Button>
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Send report
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ver-notes" className="text-sm font-medium">
          Version notes
        </label>
        <Textarea
          id="ver-notes"
          className="min-h-[60px]"
          placeholder="What changed in this version of the report"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() =>
            notes !== current.versionNotes &&
            meta.mutate({ versionNotes: notes })
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          ["Approved", "Auto", "Review", "Incomplete"] as ReportSectionState[]
        ).map((st) => (
          <Badge key={st} variant="outline" className={STATE_STYLE[st]}>
            {counts(st)} {st}
          </Badge>
        ))}
        {incomplete ? (
          <span className="self-center text-xs text-muted-foreground">
            {incomplete} section{incomplete === 1 ? "" : "s"} still to write
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {current.reportSections.map((s) => (
          <SectionCard
            key={s.name}
            section={s}
            assessment={current}
            onAssessment={onAssessment}
          />
        ))}
      </div>

      <SendReportDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        ws={ws}
        assessment={current}
        onDone={onWorkspace}
      />
    </div>
  );
}

function SectionCard({
  section,
  assessment,
  onAssessment,
}: {
  section: ReportSectionFlag;
  assessment: ReadinessAssessment;
  onAssessment: (a: ReadinessAssessment) => void;
}) {
  const [content, setContent] = useState(section.content);
  const [owner, setOwner] = useState(section.owner);
  useEffect(() => {
    setContent(section.content);
    setOwner(section.owner);
  }, [section.content, section.owner]);

  const dirty = content !== section.content;

  const patch = useMutation({
    mutationFn: (
      dto: Omit<Parameters<typeof updateReportSection>[1], "name">,
    ) => updateReportSection(assessment._id, { name: section.name, ...dto }),
    onSuccess: onAssessment,
    onError: (e) => fail("Could not save the section", e),
  });
  const redraft = useMutation({
    mutationFn: () => redraftReportSection(assessment._id, section.name),
    onSuccess: (a) => {
      onAssessment(a);
      toast({
        title: "Section re-drafted",
        description: "Rewritten from this version's current numbers.",
      });
    },
    onError: (e) => fail("Could not re-draft", e),
  });

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{section.name}</h4>
          <Badge variant="outline" className={STATE_STYLE[section.state]}>
            {section.state}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-36"
            placeholder="Owner"
            aria-label={`${section.name} owner`}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onBlur={() => owner !== section.owner && patch.mutate({ owner })}
          />
          {!HAND_WRITTEN.has(section.name) ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => redraft.mutate()}
              disabled={redraft.isPending}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Re-draft
            </Button>
          ) : null}
          {section.state !== "Review" && section.content.trim() ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => patch.mutate({ state: "Review" })}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Mark for review
            </Button>
          ) : null}
          {section.state !== "Approved" ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={!section.content.trim() || dirty}
              onClick={() => patch.mutate({ state: "Approved" })}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
            </Button>
          ) : null}
        </div>
      </div>
      <Textarea
        className="min-h-[110px] text-sm"
        aria-label={`${section.name} text`}
        value={content}
        placeholder={
          HAND_WRITTEN.has(section.name)
            ? "Write this section."
            : "Empty — re-draft it from the assessment, or write it yourself."
        }
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {section.updatedAt
            ? `Last edited ${fmtDate(section.updatedAt)}`
            : "Not edited yet"}
        </span>
        {dirty ? (
          <Button
            size="sm"
            onClick={() => patch.mutate({ content })}
            disabled={patch.isPending}
          >
            Save section
          </Button>
        ) : null}
      </div>
    </div>
  );
}
