import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export function downloadReportPdf(hs: HealthScore, c: ReportCommentary) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 56;

  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("GRC Health Score Report", M, y);
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(100);
  doc.text(`${hs.periodLabel} · assessed ${dateOf(hs.assessedAt)}`, M, y);
  y += 28;

  doc.setTextColor(20).setFont("helvetica", "bold").setFontSize(34);
  doc.text(fmtScore(hs.composite), M, y);
  doc.setFontSize(12).setFont("helvetica", "normal");
  doc.text(
    `/ 100   Grade ${hs.grade ?? "—"}${hs.gradeLabel ? ` · ${hs.gradeLabel}` : ""}`,
    M + 66,
    y,
  );
  y += 18;
  doc.setFontSize(10).setTextColor(90);
  const sum = doc.splitTextToSize(
    `${readScore(hs.composite)} ${hs.coverage.measured} of ${hs.coverage.total} indicators were measured.${hs.change !== null ? ` Change since ${hs.previous?.label}: ${hs.change > 0 ? "+" : ""}${hs.change}.` : ""}`,
    W - M * 2,
  );
  doc.text(sum, M, y);
  y += sum.length * 13 + 8;

  if (c.ceoNote.trim()) {
    doc.setTextColor(20).setFont("helvetica", "bold").setFontSize(11);
    doc.text("Message from the MD / CEO", M, y);
    y += 14;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
    const t = doc.splitTextToSize(c.ceoNote.trim(), W - M * 2);
    doc.text(t, M, y);
    y += t.length * 13 + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [["Area", "Weight", "Score", "Grade", "Measured"]],
    body: hs.modules.map((m) => [
      m.name,
      `${m.weight}%`,
      m.score === null ? "—" : fmtScore(m.score),
      m.grade ?? "—",
      `${m.measuredCount}/${m.totalCount}`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: M, right: M },
  });

  hs.modules.forEach((m) => {
    doc.addPage();
    let yy = 56;
    doc.setTextColor(20).setFont("helvetica", "bold").setFontSize(14);
    doc.text(
      `${m.name} — ${m.score === null ? "not measured" : `${fmtScore(m.score)} (${m.grade})`}`,
      M,
      yy,
    );
    yy += 14;
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100);
    doc.text(`${m.fullName} · weight ${m.weight}%`, M, yy);
    yy += 8;
    autoTable(doc, {
      startY: yy,
      head: [["Indicator", "Value", "Target", "Score", "What was counted"]],
      body: m.indicators.map((i) => [
        i.label,
        i.isMeasured ? fmtValue(i.value, i.unit) : "Not measured",
        fmtValue(i.target, i.unit),
        i.isMeasured ? fmtScore(i.normalised) : "—",
        i.isMeasured ? i.basis : "Nothing recorded yet",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 130 }, 4: { cellWidth: 170 } },
      margin: { left: M, right: M },
    });
    const note = (c.moduleComments[m.key] ?? "").trim();
    if (note) {
      let ny = (doc as any).lastAutoTable.finalY + 18;
      doc.setTextColor(20).setFont("helvetica", "bold").setFontSize(10);
      doc.text("Commentary", M, ny);
      ny += 13;
      doc.setFont("helvetica", "normal").setTextColor(60);
      doc.text(doc.splitTextToSize(note, W - M * 2), M, ny);
    }
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8).setTextColor(130);
    doc.text(
      `Generated by Lexora · page ${p} of ${pages}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: "center" },
    );
  }
  doc.save(`grc-health-score-${hs.period}.pdf`);
}
