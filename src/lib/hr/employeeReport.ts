// Generates a downloadable PDF report for a single employee, branded
// with the TENANT's own company name (never the platform's) in the
// header — matches the convention used for contracts/certificates
// elsewhere in HR (see contract-pdf.service.ts / certificate.ts).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Employee,
  HrTeam,
  HrLocation,
  EmployeeDetailResponse,
} from "./hr-api";

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : "—";

const teamLead = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).lead || "Unassigned"
    : "—";

const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : "—";

const locCountry = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).country
    : "—";

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const HEADER_FILL: [number, number, number] = [67, 56, 202]; // indigo-700
const ROW_HEAD_FILL: [number, number, number] = [99, 102, 241]; // indigo-500

export function downloadEmployeeReport(
  e: Employee,
  detail: EmployeeDetailResponse | undefined,
  tenantName: string,
) {
  const fullName = `${e.firstName} ${e.lastName}`;
  const generatedAt = new Date().toLocaleString("en-GB");

  const balances = detail?.leave.balances ?? [];
  const leaveHistory = detail?.leave.history ?? [];
  const attRecent = detail?.attendance.recent ?? [];
  const attStats = detail?.attendance.stats;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Header bar ──
  doc.setFillColor(...HEADER_FILL);
  doc.rect(0, 0, pageWidth, 86, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(tenantName.toUpperCase(), margin, 28);
  doc.setFontSize(18);
  doc.text(`${fullName} — Employee Report`, margin, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated ${generatedAt} · Confidential, for internal HR use only`,
    margin,
    70,
  );

  let cursor = 112;
  doc.setTextColor(15, 23, 42);

  const section = (
    heading: string,
    rows: (string | number)[][],
    columns: [string, string] = ["Field", "Value"],
  ) => {
    if (cursor > pageHeight - 140) {
      doc.addPage();
      cursor = 50;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(heading, margin, cursor);
    autoTable(doc, {
      startY: cursor + 8,
      head: [columns],
      body: rows.length
        ? rows.map((r) => r.map((c) => String(c)))
        : [["—", "No records"]],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: ROW_HEAD_FILL, textColor: 255 },
      columnStyles: { 0: { cellWidth: 170, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    });
    cursor = (doc as any).lastAutoTable.finalY + 24;
  };

  section("Identity", [
    ["Full name", fullName],
    ["Employee number", e.employeeNumber ?? e._id],
    ["Email", e.email],
    ["Phone", e.phone ?? "—"],
  ]);

  section("Employment", [
    ["Job title", e.jobTitle ?? "—"],
    ["Team / Department", teamName(e)],
    ["Reports to", teamLead(e)],
    ["Location", `${locName(e)} · ${locCountry(e)}`],
    ["Employment type", (e.employmentType ?? "").replace(/_/g, " ") || "—"],
    ["Status", (e.employmentStatus ?? "active").replace(/_/g, " ")],
    ["Start date", fmtDate(e.startDate)],
  ]);

  section(
    "Leave Balance",
    balances
      .filter((b) => b.daysAllowed > 0)
      .map((b) => [
        b.label,
        `${b.daysLeft} / ${b.daysAllowed} days remaining${b.carryOver ? " (carries over)" : ""}`,
      ]),
  );

  section(
    "Leave History",
    leaveHistory
      .slice(0, 8)
      .map((r) => [
        `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`,
        `${r.status} · ${r.days}d ${r.type}`,
      ]),
  );

  section("Attendance Summary", [
    [
      "This month",
      `${attStats?.monthHours ?? 0}h logged · ${attStats?.daysPresent ?? 0} day(s) present`,
    ],
  ]);

  section(
    "Recent Attendance",
    attRecent.map((r) => [
      fmtDate(r.date),
      `${r.hoursWorked?.toFixed(1) ?? "—"}h · ${r.status}`,
    ]),
  );

  // Footer — platform attribution + page numbers. The header above
  // carries the tenant's own name; this is just the small "made with"
  // line, same convention as the aggregated employee list report.
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Lexora", margin, pageHeight - 20);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 20,
      { align: "right" },
    );
  }

  doc.save(`employee-report-${e.firstName}-${e.lastName}.pdf`);
}
