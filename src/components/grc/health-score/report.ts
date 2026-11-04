import {
  exportReportPdf,
  type ReportDefinition,
  type ReportSection,
} from "@/lib/grc/reportExport";
import {
  fmtScore,
  fmtValue,
  readScore,
  type HealthScore,
} from "@/lib/grc/health-score-api";

export interface ReportCommentary {
  ceoNote: string;
  moduleComments: Record<string, string>;
}

const dateOf = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** The report as plain text, for copying into an email or board pack. */
export function reportText(hs: HealthScore, c: ReportCommentary): string {
  const L: string[] = [];
  L.push(`GRC HEALTH SCORE REPORT — ${hs.periodLabel}`);
  L.push(`Assessed ${dateOf(hs.assessedAt)}`);
  L.push("");
  L.push(
    `Overall: ${fmtScore(hs.composite)}/100 · Grade ${hs.grade ?? "—"} (${hs.gradeLabel ?? "not enough data"})`,
  );
  L.push(readScore(hs.composite));
  if (hs.change !== null)
    L.push(
      `Change since ${hs.previous?.label}: ${hs.change > 0 ? "+" : ""}${hs.change}`,
    );
  L.push(
    `Coverage: ${hs.coverage.measured} of ${hs.coverage.total} indicators measured.`,
  );
  if (c.ceoNote.trim()) {
    L.push("", "MESSAGE FROM THE MD / CEO", c.ceoNote.trim());
  }
  hs.modules.forEach((m) => {
    L.push(
      "",
      `${m.name.toUpperCase()} — ${m.score === null ? "not measured" : `${fmtScore(m.score)} (${m.grade})`} · weight ${m.weight}%`,
    );
    m.indicators.forEach((i) =>
      L.push(
        `  • ${i.label}: ${i.isMeasured ? `${fmtValue(i.value, i.unit)} (target ${fmtValue(i.target, i.unit)}) — ${i.basis}` : "not measured yet"}`,
      ),
    );
    const note = (c.moduleComments[m.key] ?? "").trim();
    if (note) L.push(`  Commentary: ${note}`);
  });
  return L.join("\n");
}

/** The report in the shared report layout (see lib/reportPdf.ts). */
export function healthScoreReportDefinition(
  hs: HealthScore,
  c: ReportCommentary,
): ReportDefinition {
  const sections: ReportSection[] = [];
  const ceo = c.ceoNote.trim();
  if (ceo)
    sections.push({
      heading: "Message from the MD / CEO",
      columns: ["Message"],
      rows: [[ceo]],
    });
  sections.push({
    heading: "Areas",
    note: "Each area is scored 0–100 from your own records and counts toward the company score by its weight.",
    columns: ["Area", "Weight", "Score", "Grade", "Indicators measured"],
    rows: hs.modules.map((m) => [
      m.name,
      `${m.weight}%`,
      m.score === null ? "Not measured" : fmtScore(m.score),
      m.grade ?? "—",
      `${m.measuredCount} of ${m.totalCount}`,
    ]),
  });
  hs.modules.forEach((m) => {
    sections.push({
      heading: `${m.name} — ${m.score === null ? "not measured" : `${fmtScore(m.score)} (${m.grade})`}`,
      note: `${m.fullName} · weight ${m.weight}%`,
      columns: ["Indicator", "Value", "Target", "Score", "What was counted"],
      rows: m.indicators.map((i) => [
        i.label,
        i.isMeasured ? fmtValue(i.value, i.unit) : "Not measured",
        fmtValue(i.target, i.unit),
        i.isMeasured ? fmtScore(i.normalised) : "—",
        i.isMeasured ? i.basis : "Nothing recorded yet",
      ]),
    });
    const note = (c.moduleComments[m.key] ?? "").trim();
    if (note)
      sections.push({
        heading: `${m.name} commentary`,
        columns: ["Commentary"],
        rows: [[note]],
      });
  });
  return {
    id: `grc-health-score-${hs.period}`,
    title: "GRC Health Score Report",
    subtitle: `${hs.periodLabel} · assessed ${dateOf(hs.assessedAt)}`,
    summary: [
      { label: "Health score", value: `${fmtScore(hs.composite)} / 100` },
      {
        label: "Grade",
        value: hs.grade ? `${hs.grade} · ${hs.gradeLabel}` : "—",
      },
      {
        label: "Change since last month",
        value:
          hs.change === null
            ? "—"
            : `${hs.change > 0 ? "+" : ""}${hs.change} vs ${hs.previous?.label}`,
      },
      {
        label: "Indicators measured",
        value: `${hs.coverage.measured} of ${hs.coverage.total}`,
      },
    ],
    sections,
  };
}

export function downloadReportPdf(hs: HealthScore, c: ReportCommentary) {
  exportReportPdf(healthScoreReportDefinition(hs, c));
}
