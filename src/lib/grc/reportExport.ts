import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  REPORT_COLORS,
  REPORT_MARGIN,
  REPORT_TOP,
  drawReportFooters,
  drawReportHeader,
  tenantCompanyName,
} from "@/lib/reportPdf";

// ─────────────────────────────────────────────────────────────
// Shared report export helpers for the GRC module.
// A report is a set of tabular sections; the same definition
// renders to either PDF (jsPDF + autotable) or Excel (SheetJS).
// ─────────────────────────────────────────────────────────────

export interface ReportSection {
  heading: string;
  columns: string[];
  rows: (string | number)[][];
  /** Optional short note printed under the heading. */
  note?: string;
}

export interface ReportDefinition {
  id: string;
  title: string;
  subtitle?: string;
  /** Small key/value summary printed at the top of the PDF. */
  summary?: { label: string; value: string | number }[];
  sections: ReportSection[];
}

const stamp = () => new Date().toLocaleString();
const fileStamp = () => new Date().toISOString().slice(0, 10);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function exportReportPdf(def: ReportDefinition) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const subtitle = def.subtitle ?? "Governance, Risk & Compliance";
  const generatedAt = stamp();
  const company = tenantCompanyName();
  // The same band is painted on every page, so a page torn out of the
  // middle of a long report still says whose report it is.
  const header = () =>
    drawReportHeader(doc, { company, title: def.title, subtitle, generatedAt });
  const margin = {
    top: REPORT_TOP,
    left: REPORT_MARGIN,
    right: REPORT_MARGIN,
    bottom: 50,
  };

  header();
  let cursor = REPORT_TOP;

  if (def.summary?.length) {
    autoTable(doc, {
      startY: cursor,
      head: [def.summary.map((s) => s.label)],
      body: [def.summary.map((s) => String(s.value))],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: REPORT_COLORS.summaryHead, textColor: 255 },
      margin,
      didDrawPage: header,
    });
    cursor = (doc as any).lastAutoTable.finalY + 24;
  }

  def.sections.forEach((section) => {
    if (cursor > pageHeight - 120) {
      doc.addPage();
      header();
      cursor = REPORT_TOP;
    }
    doc.setFontSize(11);
    doc.setTextColor(...REPORT_COLORS.body);
    doc.text(section.heading, REPORT_MARGIN, cursor);
    if (section.note) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(section.note, REPORT_MARGIN, cursor + 12);
      doc.setTextColor(...REPORT_COLORS.body);
      cursor += 10;
    }
    autoTable(doc, {
      startY: cursor + 10,
      head: [section.columns],
      body: section.rows.length
        ? section.rows.map((r) => r.map((c) => String(c)))
        : [section.columns.map((_, i) => (i === 0 ? "No records" : ""))],
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: REPORT_COLORS.sectionHead, textColor: 255 },
      margin,
      didDrawPage: header,
    });
    cursor = (doc as any).lastAutoTable.finalY + 28;
  });

  drawReportFooters(doc);

  doc.save(`${slug(def.title)}-${fileStamp()}.pdf`);
}

export function exportReportExcel(def: ReportDefinition) {
  const wb = XLSX.utils.book_new();

  const company = tenantCompanyName();
  const cover: (string | number)[][] = [
    ...(company ? [[company]] : []),
    [def.title],
    [def.subtitle ?? "Governance, Risk & Compliance"],
    [`Generated ${stamp()}`],
    [],
    ...(def.summary ?? []).map((s) => [s.label, s.value]),
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(cover);
  coverSheet["!cols"] = [{ wch: 42 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, coverSheet, "Summary");

  const used = new Set<string>(["Summary"]);
  def.sections.forEach((section, idx) => {
    let name =
      section.heading.replace(/[\\/?*[\]:]/g, "").slice(0, 28) ||
      `Sheet ${idx + 1}`;
    while (used.has(name)) name = `${name.slice(0, 26)}_${idx}`;
    used.add(name);

    const aoa = [section.columns, ...section.rows];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet["!cols"] = section.columns.map((c, i) => ({
      wch: Math.min(
        48,
        Math.max(
          c.length + 4,
          ...section.rows.map((r) => String(r[i] ?? "").length + 2),
        ),
      ),
    }));
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  XLSX.writeFile(wb, `${slug(def.title)}-${fileStamp()}.xlsx`);
}
