export interface Client {
  id: string;
  name: string;
  type: "Individual" | "Corporate";
  riskLevel: "Low" | "Medium" | "High";
  status: "Active" | "Invited" | "In Progress" | "Submitted" | "Approved" | "Rejected" | "Pending" | "Under Review";
  email: string;
  phone: string;
  dateAdded: string;
  assignedOfficer: string;
  industry?: string;
  country: string;
  kycStatus?: "Not Started" | "In Progress" | "Submitted" | "Approved" | "Rejected";
  documents?: { name: string; type: string; date: string; status: string }[];
  activityTimeline?: { action: string; date: string; user: string }[];
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: "Planning" | "In Progress" | "On Hold" | "Completed";
  progress: number;
  deadline: string;
  assignedTeam: string[];
  hoursLogged: number;
  hoursEstimated: number;
  description?: string;
  caseType?: string;
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  assignee: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  workload: number;
  activeProjects: number;
  email: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  date: string;
  dueDate: string;
  type: "Fixed" | "Hourly" | "Milestone";
}

export interface TimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  teamMemberId: string;
  teamMemberName: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number;
}

export interface ComplianceAlert {
  id: string;
  clientId: string;
  clientName: string;
  type: "KYC Review" | "Suspicious Activity" | "Document Expiry" | "PEP Alert";
  severity: "Low" | "Medium" | "High" | "Critical";
  date: string;
  description: string;
  status: "Open" | "In Review" | "Resolved";
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Overdue" | "Due Today" | "Upcoming";
  assignee: string;
}

export interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: "client" | "compliance" | "billing" | "project";
}

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
  date: string;
  read: boolean;
}

export const clients: Client[] = [
  { id: "CLT-001", name: "Meridian Holdings Ltd", type: "Corporate", riskLevel: "Low", status: "Active", email: "contact@meridianholdings.com", phone: "+44 20 7946 0958", dateAdded: "2025-11-15", assignedOfficer: "Sarah Chen", industry: "Financial Services", country: "United Kingdom", kycStatus: "Approved", documents: [{ name: "Certificate of Incorporation", type: "PDF", date: "2025-11-15", status: "Verified" }, { name: "Director ID", type: "PDF", date: "2025-11-16", status: "Verified" }], activityTimeline: [{ action: "Client approved", date: "2025-11-20", user: "Sarah Chen" }, { action: "KYC submitted", date: "2025-11-18", user: "System" }, { action: "Client created", date: "2025-11-15", user: "Sarah Chen" }] },
  { id: "CLT-002", name: "James Richardson", type: "Individual", riskLevel: "Medium", status: "Active", email: "j.richardson@email.com", phone: "+1 212 555 0134", dateAdded: "2025-12-03", assignedOfficer: "Michael Torres", country: "United States", kycStatus: "Approved", documents: [{ name: "Passport", type: "PDF", date: "2025-12-03", status: "Verified" }], activityTimeline: [{ action: "Client approved", date: "2025-12-10", user: "Michael Torres" }, { action: "KYC submitted", date: "2025-12-05", user: "System" }] },
  { id: "CLT-003", name: "Apex Ventures Group", type: "Corporate", riskLevel: "High", status: "Submitted", email: "legal@apexventures.io", phone: "+971 4 555 8842", dateAdded: "2026-01-22", assignedOfficer: "Sarah Chen", industry: "Investment Management", country: "UAE", kycStatus: "Submitted", documents: [{ name: "Trade License", type: "PDF", date: "2026-01-22", status: "Pending Review" }, { name: "UBO Declaration", type: "PDF", date: "2026-01-23", status: "Pending Review" }], activityTimeline: [{ action: "KYC documents submitted", date: "2026-01-25", user: "System" }, { action: "Onboarding link sent", date: "2026-01-22", user: "Sarah Chen" }] },
  { id: "CLT-004", name: "Elena Kowalski", type: "Individual", riskLevel: "Low", status: "Active", email: "elena.k@email.com", phone: "+49 30 555 7721", dateAdded: "2026-02-10", assignedOfficer: "David Park", country: "Germany", kycStatus: "Approved" },
  { id: "CLT-005", name: "Nordic Shipping AS", type: "Corporate", riskLevel: "Medium", status: "Invited", email: "ops@nordicshipping.no", phone: "+47 22 55 33 00", dateAdded: "2026-03-05", assignedOfficer: "Michael Torres", industry: "Logistics", country: "Norway", kycStatus: "Not Started" },
  { id: "CLT-006", name: "Tanaka Enterprises", type: "Corporate", riskLevel: "Low", status: "Active", email: "info@tanaka-ent.jp", phone: "+81 3 5555 0199", dateAdded: "2025-09-18", assignedOfficer: "David Park", industry: "Technology", country: "Japan", kycStatus: "Approved" },
  { id: "CLT-007", name: "Isabelle Moreau", type: "Individual", riskLevel: "High", status: "In Progress", email: "i.moreau@email.fr", phone: "+33 1 55 55 78 90", dateAdded: "2026-03-28", assignedOfficer: "Sarah Chen", country: "France", kycStatus: "In Progress" },
  { id: "CLT-008", name: "Greenfield Capital Partners", type: "Corporate", riskLevel: "Medium", status: "Active", email: "compliance@greenfieldcp.com", phone: "+1 415 555 2200", dateAdded: "2025-10-01", assignedOfficer: "Michael Torres", industry: "Private Equity", country: "United States", kycStatus: "Approved" },
];

export const projects: Project[] = [
  { id: "PRJ-001", name: "Annual Audit 2026", clientId: "CLT-001", clientName: "Meridian Holdings Ltd", status: "In Progress", progress: 65, deadline: "2026-05-15", assignedTeam: ["Sarah Chen", "David Park"], hoursLogged: 120, hoursEstimated: 200, caseType: "Audit", description: "Full annual audit for FY2026", tasks: [{ id: "T1", title: "Initial document review", done: true, assignee: "Sarah Chen" }, { id: "T2", title: "Stakeholder interviews", done: true, assignee: "David Park" }, { id: "T3", title: "Risk assessment report", done: false, assignee: "Sarah Chen" }, { id: "T4", title: "Final deliverable", done: false, assignee: "David Park" }] },
  { id: "PRJ-002", name: "Tax Advisory", clientId: "CLT-002", clientName: "James Richardson", status: "Planning", progress: 15, deadline: "2026-06-30", assignedTeam: ["Michael Torres"], hoursLogged: 12, hoursEstimated: 80, caseType: "Tax", description: "Personal tax advisory and filing", tasks: [{ id: "T5", title: "Gather financial documents", done: false, assignee: "Michael Torres" }, { id: "T6", title: "Tax analysis", done: false, assignee: "Michael Torres" }] },
  { id: "PRJ-003", name: "Due Diligence Review", clientId: "CLT-003", clientName: "Apex Ventures Group", status: "On Hold", progress: 40, deadline: "2026-04-30", assignedTeam: ["Sarah Chen", "Ana Rodriguez"], hoursLogged: 56, hoursEstimated: 150, caseType: "Due Diligence", description: "M&A due diligence review", tasks: [{ id: "T7", title: "Financial review", done: true, assignee: "Sarah Chen" }, { id: "T8", title: "Legal review", done: false, assignee: "Ana Rodriguez" }] },
  { id: "PRJ-004", name: "Regulatory Compliance", clientId: "CLT-006", clientName: "Tanaka Enterprises", status: "In Progress", progress: 80, deadline: "2026-04-20", assignedTeam: ["David Park"], hoursLogged: 95, hoursEstimated: 120, caseType: "Compliance", description: "Regulatory compliance assessment", tasks: [{ id: "T9", title: "Regulatory mapping", done: true, assignee: "David Park" }, { id: "T10", title: "Gap analysis", done: true, assignee: "David Park" }, { id: "T11", title: "Remediation plan", done: false, assignee: "David Park" }] },
  { id: "PRJ-005", name: "Corporate Restructuring", clientId: "CLT-008", clientName: "Greenfield Capital Partners", status: "In Progress", progress: 30, deadline: "2026-07-31", assignedTeam: ["Michael Torres", "Ana Rodriguez", "Sarah Chen"], hoursLogged: 45, hoursEstimated: 300, caseType: "Corporate", description: "Full corporate restructuring advisory", tasks: [{ id: "T12", title: "Stakeholder analysis", done: true, assignee: "Michael Torres" }, { id: "T13", title: "Structure proposal", done: false, assignee: "Ana Rodriguez" }, { id: "T14", title: "Legal documentation", done: false, assignee: "Sarah Chen" }] },
];

export const teamMembers: TeamMember[] = [
  { id: "TM-001", name: "Sarah Chen", role: "Senior Partner", avatar: "SC", workload: 85, activeProjects: 3, email: "s.chen@firm.com" },
  { id: "TM-002", name: "Michael Torres", role: "Tax Advisor", avatar: "MT", workload: 70, activeProjects: 3, email: "m.torres@firm.com" },
  { id: "TM-003", name: "David Park", role: "Audit Manager", avatar: "DP", workload: 60, activeProjects: 2, email: "d.park@firm.com" },
  { id: "TM-004", name: "Ana Rodriguez", role: "Legal Analyst", avatar: "AR", workload: 45, activeProjects: 2, email: "a.rodriguez@firm.com" },
  { id: "TM-005", name: "Chris Evans", role: "Junior Associate", avatar: "CE", workload: 30, activeProjects: 1, email: "c.evans@firm.com" },
];

export const invoices: Invoice[] = [
  { id: "INV-001", clientId: "CLT-001", clientName: "Meridian Holdings Ltd", amount: 45000, status: "Paid", date: "2026-03-01", dueDate: "2026-03-31", type: "Fixed" },
  { id: "INV-002", clientId: "CLT-002", clientName: "James Richardson", amount: 8500, status: "Pending", date: "2026-03-15", dueDate: "2026-04-15", type: "Hourly" },
  { id: "INV-003", clientId: "CLT-006", clientName: "Tanaka Enterprises", amount: 22000, status: "Paid", date: "2026-02-20", dueDate: "2026-03-20", type: "Milestone" },
  { id: "INV-004", clientId: "CLT-008", clientName: "Greenfield Capital Partners", amount: 67500, status: "Overdue", date: "2026-02-01", dueDate: "2026-03-01", type: "Fixed" },
  { id: "INV-005", clientId: "CLT-004", clientName: "Elena Kowalski", amount: 3200, status: "Pending", date: "2026-03-28", dueDate: "2026-04-28", type: "Hourly" },
  { id: "INV-006", clientId: "CLT-005", clientName: "Nordic Shipping AS", amount: 18750, status: "Paid", date: "2026-01-10", dueDate: "2026-02-10", type: "Fixed" },
];

export const timeEntries: TimeEntry[] = [
  { id: "TE-001", projectId: "PRJ-001", projectName: "Annual Audit 2026", teamMemberId: "TM-001", teamMemberName: "Sarah Chen", date: "2026-04-14", hours: 3.5, description: "Document review and analysis", billable: true, rate: 350 },
  { id: "TE-002", projectId: "PRJ-001", projectName: "Annual Audit 2026", teamMemberId: "TM-003", teamMemberName: "David Park", date: "2026-04-14", hours: 5, description: "Stakeholder meeting preparation", billable: true, rate: 280 },
  { id: "TE-003", projectId: "PRJ-005", projectName: "Corporate Restructuring", teamMemberId: "TM-002", teamMemberName: "Michael Torres", date: "2026-04-13", hours: 2, description: "Tax implications research", billable: true, rate: 300 },
  { id: "TE-004", projectId: "PRJ-002", projectName: "Tax Advisory", teamMemberId: "TM-002", teamMemberName: "Michael Torres", date: "2026-04-13", hours: 4, description: "Financial document analysis", billable: true, rate: 300 },
  { id: "TE-005", projectId: "PRJ-004", projectName: "Regulatory Compliance", teamMemberId: "TM-003", teamMemberName: "David Park", date: "2026-04-12", hours: 6, description: "Compliance gap analysis", billable: true, rate: 280 },
  { id: "TE-006", projectId: "PRJ-003", projectName: "Due Diligence Review", teamMemberId: "TM-004", teamMemberName: "Ana Rodriguez", date: "2026-04-12", hours: 3, description: "Legal document review", billable: true, rate: 220 },
  { id: "TE-007", projectId: "PRJ-005", projectName: "Corporate Restructuring", teamMemberId: "TM-004", teamMemberName: "Ana Rodriguez", date: "2026-04-11", hours: 4.5, description: "Structure proposal drafting", billable: true, rate: 220 },
];

export const complianceAlerts: ComplianceAlert[] = [
  { id: "CA-001", clientId: "CLT-003", clientName: "Apex Ventures Group", type: "Suspicious Activity", severity: "Critical", date: "2026-04-05", description: "Unusual transaction pattern detected in Q1 reporting", status: "Open" },
  { id: "CA-002", clientId: "CLT-007", clientName: "Isabelle Moreau", type: "PEP Alert", severity: "High", date: "2026-04-03", description: "Client flagged as Politically Exposed Person — requires enhanced due diligence", status: "In Review" },
  { id: "CA-003", clientId: "CLT-002", clientName: "James Richardson", type: "Document Expiry", severity: "Medium", date: "2026-04-01", description: "Passport copy expires in 30 days — renewal required", status: "Open" },
  { id: "CA-004", clientId: "CLT-005", clientName: "Nordic Shipping AS", type: "KYC Review", severity: "Low", date: "2026-03-28", description: "Annual KYC review due — last reviewed 11 months ago", status: "Open" },
  { id: "CA-005", clientId: "CLT-001", clientName: "Meridian Holdings Ltd", type: "KYC Review", severity: "Low", date: "2026-03-20", description: "Periodic review scheduled — no issues anticipated", status: "Resolved" },
];

export const tasks: Task[] = [
  { id: "TSK-001", title: "Review Apex Ventures EDD report", dueDate: "2026-04-06", priority: "High", status: "Overdue", assignee: "Sarah Chen" },
  { id: "TSK-002", title: "Submit Meridian audit findings", dueDate: "2026-04-08", priority: "High", status: "Due Today", assignee: "David Park" },
  { id: "TSK-003", title: "Follow up on Richardson documents", dueDate: "2026-04-10", priority: "Medium", status: "Upcoming", assignee: "Michael Torres" },
  { id: "TSK-004", title: "Prepare Nordic Shipping KYC pack", dueDate: "2026-04-12", priority: "Medium", status: "Upcoming", assignee: "Ana Rodriguez" },
  { id: "TSK-005", title: "Greenfield invoice reconciliation", dueDate: "2026-04-15", priority: "Low", status: "Upcoming", assignee: "Chris Evans" },
];

export const recentActivity: Activity[] = [
  { id: "ACT-001", action: "Client onboarding completed for Elena Kowalski", user: "David Park", timestamp: "2 hours ago", type: "client" },
  { id: "ACT-002", action: "KYC review flagged for Apex Ventures Group", user: "System", timestamp: "4 hours ago", type: "compliance" },
  { id: "ACT-003", action: "Invoice INV-004 marked as overdue", user: "System", timestamp: "6 hours ago", type: "billing" },
  { id: "ACT-004", action: "Project milestone completed: Tanaka Regulatory Compliance Phase 2", user: "David Park", timestamp: "1 day ago", type: "project" },
  { id: "ACT-005", action: "New compliance alert raised for Isabelle Moreau", user: "System", timestamp: "1 day ago", type: "compliance" },
  { id: "ACT-006", action: "Engagement letter signed by Meridian Holdings Ltd", user: "Sarah Chen", timestamp: "2 days ago", type: "client" },
];

export const notifications: Notification[] = [
  { id: "N-001", message: "Apex Ventures Group completed onboarding", type: "success", date: "2026-04-15", read: false },
  { id: "N-002", message: "New document uploaded by James Richardson", type: "info", date: "2026-04-14", read: false },
  { id: "N-003", message: "KYC info updated for Isabelle Moreau", type: "warning", date: "2026-04-13", read: true },
];

export const revenueData = [
  { month: "Nov", revenue: 125000 },
  { month: "Dec", revenue: 98000 },
  { month: "Jan", revenue: 142000 },
  { month: "Feb", revenue: 118000 },
  { month: "Mar", revenue: 156000 },
  { month: "Apr", revenue: 89000 },
];
