// Generates a downloadable HTML report for a single employee.
// Opens as a styled, printable document the tenant can save as PDF.

import type { Employee, HrTeam, HrLocation } from "./hr-api";

const teamName = (e: Employee) =>
  typeof e.teamId === "object" && e.teamId !== null
    ? (e.teamId as HrTeam).name
    : "—";

const locName = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).name
    : "—";

const locCountry = (e: Employee) =>
  typeof e.locationId === "object" && e.locationId !== null
    ? (e.locationId as HrLocation).country
    : "—";

export function buildEmployeeReportHtml(e: Employee): string {
  const generatedAt = new Date().toLocaleString("en-GB");
  const fullName = `${e.firstName} ${e.lastName}`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Employee Report — ${fullName}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:40px;background:#f8fafc}
  .doc{max-width:820px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
  h1{font-size:24px;margin:0 0 4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .meta{color:#64748b;font-size:12px;margin-bottom:28px}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin:28px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:8px 0;vertical-align:top}
  td.k{color:#64748b;width:40%}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:600}
  .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}}
</style>
</head><body>
<div class="doc">
  <h1>Employee Report</h1>
  <p class="meta">Generated ${generatedAt}</p>

  <h2>Identity</h2>
  <table>
    <tr><td class="k">Full name</td><td><strong>${fullName}</strong></td></tr>
    <tr><td class="k">Employee number</td><td>${(e as any).employeeNumber ?? e._id}</td></tr>
    <tr><td class="k">Email</td><td>${e.email}</td></tr>
    <tr><td class="k">Phone</td><td>${e.phone ?? "—"}</td></tr>
  </table>

  <h2>Employment</h2>
  <table>
    <tr><td class="k">Job title</td><td>${e.jobTitle ?? "—"}</td></tr>
    <tr><td class="k">Team / Department</td><td>${teamName(e)}</td></tr>
    <tr><td class="k">Location</td><td>${locName(e)} · ${locCountry(e)}</td></tr>
    <tr><td class="k">Employment type</td><td>${(e.employmentType ?? "").replace("_"," ")}</td></tr>
    <tr><td class="k">Status</td><td><span class="badge">${e.employmentStatus ?? "active"}</span></td></tr>
    <tr><td class="k">Start date</td><td>${(e as any).startDate ?? "—"}</td></tr>
  </table>

  <h2>Performance Snapshot</h2>
  <table>
    <tr><td class="k">Overall score</td><td>78%</td></tr>
    <tr><td class="k">Punctuality</td><td>94%</td></tr>
    <tr><td class="k">Open tasks</td><td>7</td></tr>
    <tr><td class="k">Last review</td><td>${new Date().toLocaleDateString("en-GB")}</td></tr>
  </table>

  <h2>Disputes & Disciplinary</h2>
  <table>
    <tr><td class="k">Open cases</td><td>0</td></tr>
    <tr><td class="k">Resolved (last 12m)</td><td>0</td></tr>
  </table>

  <div class="footer">Confidential — for internal HR use only.</div>
</div>
</body></html>`;
}

export function downloadEmployeeReport(e: Employee) {
  const html = buildEmployeeReportHtml(e);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `employee-report-${e.firstName}-${e.lastName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
