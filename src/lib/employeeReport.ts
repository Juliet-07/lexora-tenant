// Generates a downloadable HTML report for a single employee.
// Opens as a styled, printable document the tenant can save as PDF.

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

export function buildEmployeeReportHtml(
  e: Employee,
  detail?: EmployeeDetailResponse,
): string {
  const generatedAt = new Date().toLocaleString("en-GB");
  const fullName = `${e.firstName} ${e.lastName}`;

  const balances = detail?.leave.balances ?? [];
  const leaveHistory = detail?.leave.history ?? [];
  const attRecent = detail?.attendance.recent ?? [];
  const attStats = detail?.attendance.stats;

  const balanceRows = balances
    .filter((b) => b.daysAllowed > 0)
    .map(
      (b) =>
        `<tr><td class="k">${b.label}</td><td>${b.daysLeft} / ${b.daysAllowed} days remaining${b.carryOver ? ' <span class="tag">carries over</span>' : ""}</td></tr>`,
    )
    .join("");

  const leaveHistoryRows = leaveHistory.length
    ? leaveHistory
        .slice(0, 8)
        .map(
          (r) =>
            `<tr><td class="k">${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}</td><td><span class="badge badge-${r.status}">${r.status}</span> · ${r.days}d ${r.type}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="empty">No leave requests on record.</td></tr>`;

  const attendanceRows = attRecent.length
    ? attRecent
        .map(
          (r) =>
            `<tr><td class="k">${fmtDate(r.date)}</td><td>${r.hoursWorked?.toFixed(1) ?? "—"}h · <span class="badge badge-${r.status}">${r.status}</span></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="empty">No attendance records yet.</td></tr>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Employee Report — ${fullName}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:40px;background:#f8fafc}
  .doc{max-width:820px;margin:0 auto;background:#fff;border-radius:12px;padding:0;box-shadow:0 4px 24px rgba(0,0,0,.06);overflow:hidden}
  .brandbar{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 40px;color:#fff}
  .brandbar .logo{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:10px}
  .brandbar h1{font-size:24px;margin:0 0 4px;color:#fff}
  .brandbar .meta{color:rgba(255,255,255,.75);font-size:12px}
  .content{padding:32px 40px 40px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin:28px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  h2:first-child{margin-top:0}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:8px 0;vertical-align:top}
  td.k{color:#64748b;width:42%}
  td.empty{color:#94a3b8;font-style:italic;padding:10px 0}
  .badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600}
  .badge-active,.badge-approved,.badge-present{background:#dcfce7;color:#15803d}
  .badge-pending,.badge-late{background:#fef3c7;color:#b45309}
  .badge-rejected,.badge-absent,.badge-cancelled{background:#fee2e2;color:#b91c1c}
  .badge-remote,.badge-on_leave{background:#e0f2fe;color:#0369a1}
  .badge-probation{background:#e0e7ff;color:#4338ca}
  .tag{font-size:10px;color:#6366f1;font-weight:600}
  .placeholder-note{font-size:11px;color:#94a3b8;font-style:italic;margin:-2px 0 8px}
  .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
  .footer .brand{font-weight:700;color:#6366f1}
  @media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}}
</style>
</head><body>
<div class="doc">
  <div class="brandbar">
    <div class="logo">Lexora</div>
    <h1>${fullName} — Employee Report</h1>
    <p class="meta">Generated ${generatedAt} · Confidential, for internal HR use only</p>
  </div>

  <div class="content">
    <h2>Identity</h2>
    <table>
      <tr><td class="k">Full name</td><td><strong>${fullName}</strong></td></tr>
      <tr><td class="k">Employee number</td><td>${e.employeeNumber ?? e._id}</td></tr>
      <tr><td class="k">Email</td><td>${e.email}</td></tr>
      <tr><td class="k">Phone</td><td>${e.phone ?? "—"}</td></tr>
    </table>

    <h2>Employment</h2>
    <table>
      <tr><td class="k">Job title</td><td>${e.jobTitle ?? "—"}</td></tr>
      <tr><td class="k">Team / Department</td><td>${teamName(e)}</td></tr>
      <tr><td class="k">Reports to</td><td>${teamLead(e)}</td></tr>
      <tr><td class="k">Location</td><td>${locName(e)} · ${locCountry(e)}</td></tr>
      <tr><td class="k">Employment type</td><td style="text-transform:capitalize">${(e.employmentType ?? "").replace("_", " ")}</td></tr>
      <tr><td class="k">Status</td><td><span class="badge badge-${e.employmentStatus}">${(e.employmentStatus ?? "active").replace("_", " ")}</span></td></tr>
      <tr><td class="k">Start date</td><td>${fmtDate(e.startDate)}</td></tr>
    </table>

    <h2>Leave Balance</h2>
    <table>
      ${balanceRows || `<tr><td colspan="2" class="empty">No leave policy configured for this employee's location.</td></tr>`}
    </table>

    <h2>Leave History</h2>
    <table>${leaveHistoryRows}</table>

    <h2>Recent Attendance</h2>
    <table>
      <tr><td class="k">This month</td><td>${attStats?.monthHours ?? 0}h logged · ${attStats?.daysPresent ?? 0} day(s) present</td></tr>
    </table>
    <table>${attendanceRows}</table>

    <h2>Performance Snapshot</h2>
    <p class="placeholder-note">Performance module not yet active — figures below are illustrative.</p>
    <table>
      <tr><td class="k">Overall score</td><td>78%</td></tr>
      <tr><td class="k">Last review</td><td>${new Date().toLocaleDateString("en-GB")}</td></tr>
    </table>

    <h2>Disputes & Disciplinary</h2>
    <table>
      <tr><td class="k">Open cases</td><td>0</td></tr>
      <tr><td class="k">Resolved (last 12m)</td><td>0</td></tr>
    </table>

    <div class="footer">Powered by <span class="brand">Lexora</span></div>
  </div>
</div>
</body></html>`;
}

export function downloadEmployeeReport(
  e: Employee,
  detail?: EmployeeDetailResponse,
) {
  const html = buildEmployeeReportHtml(e, detail);
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
