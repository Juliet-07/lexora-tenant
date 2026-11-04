import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Download, Save } from "lucide-react";
import {
  TONE_TEXT,
  fmtScore,
  fmtValue,
  readScore,
  scoreTone,
  updateHealthScoreCommentary,
  type HealthScore,
} from "@/lib/grc/health-score-api";
import { downloadReportPdf, reportText } from "./report";
import { GradeBadge } from "./DashboardTab";

// A board-ready report: summary, the MD/CEO's note, and a section per
// area with its indicators and the commentary people have written.
export default function ReportTab({ hs }: { hs: HealthScore }) {
  const qc = useQueryClient();
  const [ceoNote, setCeoNote] = useState(hs.commentary.ceoNote);
  const [notes, setNotes] = useState<Record<string, string>>(
    hs.commentary.moduleComments,
  );
  const dirty =
    ceoNote !== hs.commentary.ceoNote ||
    hs.modules.some(
      (m) =>
        (notes[m.key] ?? "") !== (hs.commentary.moduleComments[m.key] ?? ""),
    );
  const draft = { ceoNote, moduleComments: notes };

  const save = useMutation({
    mutationFn: () => updateHealthScoreCommentary(draft),
    onSuccess: () => {
      toast.success("Commentary saved.");
      qc.invalidateQueries({ queryKey: ["grcHealthScore"] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.status === 403
          ? "You do not have permission to edit the commentary."
          : (err?.response?.data?.message ?? "Could not save the commentary."),
      ),
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText(hs, draft));
      toast.success("Report copied.");
    } catch {
      toast.error("Could not copy — use Download PDF instead.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Add the MD/CEO’s message and a short commentary for each area, save
            it, then download the report or copy it into a board pack.
            {hs.commentary.updatedAt && (
              <>
                {" "}
                Last saved{" "}
                {new Date(hs.commentary.updatedAt).toLocaleDateString("en-GB")}
                {hs.commentary.updatedBy
                  ? ` by ${hs.commentary.updatedBy}`
                  : ""}
                .
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy className="mr-1 h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReportPdf(hs, draft)}
            >
              <Download className="mr-1 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="mr-1 h-4 w-4" />
              {save.isPending ? "Saving…" : "Save commentary"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Executive summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={`text-4xl font-bold ${TONE_TEXT[scoreTone(hs.composite)]}`}
            >
              {fmtScore(hs.composite)}
            </span>
            <span className="text-muted-foreground">/ 100</span>
            <GradeBadge grade={hs.grade} score={hs.composite} />
            <span className="text-sm text-muted-foreground">
              {hs.periodLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {readScore(hs.composite)} {hs.coverage.measured} of{" "}
            {hs.coverage.total} indicators were measured.
            {hs.change !== null &&
              ` Change since ${hs.previous?.label}: ${hs.change > 0 ? "+" : ""}${hs.change}.`}
          </p>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Message from the MD / CEO</span>
            <Textarea
              rows={4}
              value={ceoNote}
              onChange={(e) => setCeoNote(e.target.value)}
              placeholder="A short note to the board on the company’s position and priorities…"
            />
          </label>
        </CardContent>
      </Card>

      {hs.modules.map((m) => (
        <Card key={m.key}>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              {m.name}
              <span className={TONE_TEXT[scoreTone(m.score)]}>
                {m.score === null ? "Not measured" : fmtScore(m.score)}
              </span>
              <GradeBadge grade={m.grade} score={m.score} />
              <span className="text-xs font-normal text-muted-foreground">
                weight {m.weight}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicator</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>What was counted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.indicators.map((i) => (
                    <TableRow
                      key={i.key}
                      className={i.isMeasured ? "" : "text-muted-foreground"}
                    >
                      <TableCell className="text-sm">{i.label}</TableCell>
                      <TableCell className="text-right">
                        {i.isMeasured ? fmtValue(i.value, i.unit) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtValue(i.target, i.unit)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${TONE_TEXT[scoreTone(i.normalised)]}`}
                      >
                        {i.isMeasured ? fmtScore(i.normalised) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.isMeasured ? i.basis : "Not measured yet"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{m.name} commentary</span>
              <Textarea
                rows={3}
                value={notes[m.key] ?? ""}
                onChange={(e) =>
                  setNotes((p) => ({ ...p, [m.key]: e.target.value }))
                }
                placeholder={`What explains the ${m.name} score, and what is being done about it?`}
              />
            </label>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
