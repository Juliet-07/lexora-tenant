import jsPDF from "jspdf";
import type { Certificate } from "./learningStore";

// Generate and download a certificate of completion PDF.
export function downloadCertificate(cert: Certificate, tenantName = "Lexora") {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Outer border
  doc.setDrawColor(30, 39, 97);
  doc.setLineWidth(6);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setLineWidth(1);
  doc.rect(40, 40, W - 80, H - 80);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 39, 97);
  doc.setFontSize(14);
  doc.text(tenantName.toUpperCase(), W / 2, 90, { align: "center" });

  doc.setFontSize(42);
  doc.text("Certificate of Completion", W / 2, 160, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(80);
  doc.text("This certifies that", W / 2, 210, { align: "center" });

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(20);
  doc.text(cert.employeeName, W / 2, 265, { align: "center" });

  // Underline
  doc.setDrawColor(200);
  doc.line(W / 2 - 180, 280, W / 2 + 180, 280);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(80);
  doc.text("has successfully completed the course", W / 2, 320, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(30, 39, 97);
  doc.text(cert.courseTitle, W / 2, 365, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(80);
  doc.text(
    `with an assessment score of ${cert.score}%`,
    W / 2,
    400,
    { align: "center" },
  );

  // Footer
  const dateStr = new Date(cert.issuedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFontSize(12);
  doc.text(`Issued on ${dateStr}`, W / 2, H - 120, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Certificate ID: ${cert.id}`, W / 2, H - 90, { align: "center" });

  const filename = `certificate-${cert.courseTitle.replace(/\s+/g, "_")}-${cert.employeeName.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
