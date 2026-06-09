// Mock data powering the HR & People Management module.
// Designed to feel realistic and let every page render meaningful content
// without a backend wired up yet.

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  manager: string | null;
  employmentType: "Full-time" | "Part-time" | "Contractor" | "Intern";
  status: "Active" | "On Leave" | "Probation" | "Terminated";
  location: string;
  startDate: string;
  birthDate: string;
  salary: number;
  currency: string;
  avatar: string;
  skills: string[];
  emergencyContact: { name: string; phone: string; relation: string };
}

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  status: "Draft" | "Open" | "On Hold" | "Closed";
  postedDate: string;
  applicants: number;
  hiringManager: string;
  description: string;
  pipeline: {
    sourced: number;
    screening: number;
    interview: number;
    offer: number;
    hired: number;
  };
}

export interface Applicant {
  id: string;
  jobId: string;
  name: string;
  email: string;
  stage: "Sourced" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
  rating: number;
  appliedDate: string;
  source: string;
  resumeUrl?: string;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "Annual" | "Sick" | "Maternity" | "Paternity" | "Unpaid" | "Compassionate" | "Study";
  startDate: string;
  endDate: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  reason: string;
  approver: string;
  submittedDate: string;
}

export interface LeaveBalance {
  employeeId: string;
  annual: { taken: number; remaining: number; total: number };
  sick: { taken: number; remaining: number; total: number };
  personal: { taken: number; remaining: number; total: number };
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  status: "Present" | "Late" | "Absent" | "Half-day" | "Remote" | "On Leave";
  location?: string;
}

export interface PayrollRun {
  id: string;
  period: string;
  payDate: string;
  status: "Draft" | "Approved" | "Paid" | "Processing";
  employees: number;
  gross: number;
  deductions: number;
  net: number;
  createdBy: string;
}

export interface Payslip {
  id: string;
  runId: string;
  employeeId: string;
  employeeName: string;
  gross: number;
  tax: number;
  pension: number;
  otherDeductions: number;
  net: number;
  bonuses: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  cycle: string;
  reviewer: string;
  status: "Not Started" | "Self Review" | "Manager Review" | "Calibration" | "Completed";
  overallRating: number | null;
  dueDate: string;
  goals: { title: string; progress: number; status: "On Track" | "At Risk" | "Completed" }[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  provider: string;
  durationHours: number;
  enrolled: number;
  completion: number;
  mandatory: boolean;
}

export interface Certification {
  employeeId: string;
  name: string;
  issuer: string;
  issued: string;
  expires: string;
  status: "Valid" | "Expiring Soon" | "Expired";
}

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "Permanent" | "Fixed-term" | "Probation" | "Contractor" | "NDA" | "Amendment";
  title: string;
  startDate: string;
  endDate: string | null;
  status: "Draft" | "Sent" | "Signed" | "Expired" | "Terminated";
  salary: number;
  currency: string;
  signedDate?: string;
  noticePeriod: string;
  documentUrl?: string;
}

export interface Requisition {
  id: string;
  type: "Hiring" | "Equipment" | "Budget" | "Travel" | "Training";
  title: string;
  requestedBy: string;
  department: string;
  amount: number | null;
  currency: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Draft" | "Submitted" | "Manager Approval" | "Finance Approval" | "Approved" | "Rejected" | "Fulfilled";
  submittedDate: string;
  justification: string;
  approvalChain: { role: string; name: string; status: "Pending" | "Approved" | "Rejected"; date?: string }[];
}

// ─────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────

export const employees: Employee[] = [
  { id: "EMP-001", employeeNumber: "LX-0001", firstName: "Amelia", lastName: "Okonkwo", email: "amelia.o@lexora.io", phone: "+234 802 555 0101", department: "Engineering", jobTitle: "VP of Engineering", manager: null, employmentType: "Full-time", status: "Active", location: "Lagos, NG", startDate: "2022-01-15", birthDate: "1986-04-12", salary: 145000, currency: "USD", avatar: "AO", skills: ["Leadership", "System Design", "Go", "AWS"], emergencyContact: { name: "Tunde Okonkwo", phone: "+234 802 555 0901", relation: "Spouse" } },
  { id: "EMP-002", employeeNumber: "LX-0002", firstName: "Marco", lastName: "Bianchi", email: "marco.b@lexora.io", phone: "+39 320 555 0202", department: "Engineering", jobTitle: "Staff Engineer", manager: "Amelia Okonkwo", employmentType: "Full-time", status: "Active", location: "Milan, IT", startDate: "2022-06-01", birthDate: "1989-09-30", salary: 118000, currency: "USD", avatar: "MB", skills: ["TypeScript", "React", "Node.js"], emergencyContact: { name: "Giulia Bianchi", phone: "+39 320 555 0902", relation: "Sister" } },
  { id: "EMP-003", employeeNumber: "LX-0003", firstName: "Priya", lastName: "Iyer", email: "priya.i@lexora.io", phone: "+91 98765 43210", department: "Product", jobTitle: "Head of Product", manager: null, employmentType: "Full-time", status: "Active", location: "Bangalore, IN", startDate: "2022-03-20", birthDate: "1988-11-05", salary: 132000, currency: "USD", avatar: "PI", skills: ["Strategy", "Roadmapping", "User Research"], emergencyContact: { name: "Arjun Iyer", phone: "+91 98765 11111", relation: "Spouse" } },
  { id: "EMP-004", employeeNumber: "LX-0004", firstName: "Chloe", lastName: "Sullivan", email: "chloe.s@lexora.io", phone: "+250 794 424 333", department: "Operations", jobTitle: "Operations Manager", manager: null, employmentType: "Full-time", status: "Active", location: "Kigali, RW", startDate: "2023-02-01", birthDate: "1991-07-19", salary: 92000, currency: "USD", avatar: "CS", skills: ["Process Design", "Vendor Mgmt"], emergencyContact: { name: "Marc Sullivan", phone: "+1 415 555 0904", relation: "Father" } },
  { id: "EMP-005", employeeNumber: "LX-0005", firstName: "Diego", lastName: "Hernandez", email: "diego.h@lexora.io", phone: "+52 55 5555 0505", department: "Sales", jobTitle: "Account Executive", manager: "Chloe Sullivan", employmentType: "Full-time", status: "Active", location: "Mexico City, MX", startDate: "2023-08-15", birthDate: "1993-02-28", salary: 78000, currency: "USD", avatar: "DH", skills: ["B2B Sales", "Spanish", "Salesforce"], emergencyContact: { name: "Luisa Hernandez", phone: "+52 55 5555 0905", relation: "Mother" } },
  { id: "EMP-006", employeeNumber: "LX-0006", firstName: "Hana", lastName: "Tanaka", email: "hana.t@lexora.io", phone: "+81 90 5555 0606", department: "Design", jobTitle: "Senior Designer", manager: "Priya Iyer", employmentType: "Full-time", status: "On Leave", location: "Tokyo, JP", startDate: "2022-11-01", birthDate: "1990-05-15", salary: 95000, currency: "USD", avatar: "HT", skills: ["Figma", "Brand Design", "Motion"], emergencyContact: { name: "Kenji Tanaka", phone: "+81 90 5555 0906", relation: "Spouse" } },
  { id: "EMP-007", employeeNumber: "LX-0007", firstName: "Liam", lastName: "Walsh", email: "liam.w@lexora.io", phone: "+353 87 555 0707", department: "Engineering", jobTitle: "Backend Engineer", manager: "Amelia Okonkwo", employmentType: "Full-time", status: "Probation", location: "Dublin, IE", startDate: "2026-04-01", birthDate: "1995-08-22", salary: 88000, currency: "USD", avatar: "LW", skills: ["Python", "Postgres"], emergencyContact: { name: "Sinead Walsh", phone: "+353 87 555 0907", relation: "Mother" } },
  { id: "EMP-008", employeeNumber: "LX-0008", firstName: "Zara", lastName: "Mensah", email: "zara.m@lexora.io", phone: "+233 24 555 0808", department: "People", jobTitle: "HR Business Partner", manager: null, employmentType: "Full-time", status: "Active", location: "Accra, GH", startDate: "2023-05-10", birthDate: "1992-12-04", salary: 84000, currency: "USD", avatar: "ZM", skills: ["Employee Relations", "Comp & Benefits"], emergencyContact: { name: "Kojo Mensah", phone: "+233 24 555 0908", relation: "Brother" } },
  { id: "EMP-009", employeeNumber: "LX-0009", firstName: "Noah", lastName: "Petrov", email: "noah.p@lexora.io", phone: "+7 916 555 0909", department: "Finance", jobTitle: "Financial Controller", manager: null, employmentType: "Full-time", status: "Active", location: "Remote", startDate: "2022-08-22", birthDate: "1985-06-11", salary: 110000, currency: "USD", avatar: "NP", skills: ["IFRS", "FP&A", "NetSuite"], emergencyContact: { name: "Anya Petrov", phone: "+7 916 555 0919", relation: "Spouse" } },
  { id: "EMP-010", employeeNumber: "LX-0010", firstName: "Sophie", lastName: "Laurent", email: "sophie.l@lexora.io", phone: "+33 6 55 55 10 10", department: "Marketing", jobTitle: "Content Lead", manager: "Chloe Sullivan", employmentType: "Contractor", status: "Active", location: "Paris, FR", startDate: "2025-01-15", birthDate: "1994-10-08", salary: 62000, currency: "USD", avatar: "SL", skills: ["Copywriting", "SEO"], emergencyContact: { name: "Jean Laurent", phone: "+33 6 55 55 11 11", relation: "Father" } },
];

export const jobOpenings: JobOpening[] = [
  { id: "JOB-001", title: "Senior Frontend Engineer", department: "Engineering", location: "Remote (EMEA)", type: "Full-time", status: "Open", postedDate: "2026-05-12", applicants: 47, hiringManager: "Amelia Okonkwo", description: "Build delightful experiences in our React/TypeScript codebase.", pipeline: { sourced: 47, screening: 18, interview: 9, offer: 2, hired: 0 } },
  { id: "JOB-002", title: "Product Designer", department: "Design", location: "Lagos, NG", type: "Full-time", status: "Open", postedDate: "2026-05-20", applicants: 23, hiringManager: "Priya Iyer", description: "Own end-to-end design for our compliance suite.", pipeline: { sourced: 23, screening: 11, interview: 4, offer: 1, hired: 0 } },
  { id: "JOB-003", title: "Customer Success Manager", department: "Operations", location: "Mexico City, MX", type: "Full-time", status: "Open", postedDate: "2026-05-25", applicants: 31, hiringManager: "Chloe Sullivan", description: "Be the trusted advisor for our LATAM customers.", pipeline: { sourced: 31, screening: 14, interview: 6, offer: 0, hired: 0 } },
  { id: "JOB-004", title: "Compliance Analyst", department: "Operations", location: "Kigali, RW", type: "Full-time", status: "On Hold", postedDate: "2026-04-15", applicants: 19, hiringManager: "Chloe Sullivan", description: "Support AML reviews and policy implementation.", pipeline: { sourced: 19, screening: 7, interview: 2, offer: 0, hired: 0 } },
  { id: "JOB-005", title: "DevOps Engineer", department: "Engineering", location: "Remote", type: "Contract", status: "Draft", postedDate: "2026-06-02", applicants: 0, hiringManager: "Amelia Okonkwo", description: "Hardening our deployment pipelines.", pipeline: { sourced: 0, screening: 0, interview: 0, offer: 0, hired: 0 } },
];

export const applicants: Applicant[] = [
  { id: "APP-001", jobId: "JOB-001", name: "Olusegun Adebayo", email: "olu.a@example.com", stage: "Interview", rating: 4.5, appliedDate: "2026-05-15", source: "LinkedIn", notes: "Strong React, good system design" },
  { id: "APP-002", jobId: "JOB-001", name: "Elena Volkov", email: "elena.v@example.com", stage: "Offer", rating: 4.8, appliedDate: "2026-05-13", source: "Referral", notes: "Top candidate — extending offer" },
  { id: "APP-003", jobId: "JOB-001", name: "Rahim Khan", email: "rahim.k@example.com", stage: "Screening", rating: 3.5, appliedDate: "2026-05-28", source: "Job Board" },
  { id: "APP-004", jobId: "JOB-002", name: "Maya Adeleke", email: "maya.a@example.com", stage: "Interview", rating: 4.2, appliedDate: "2026-05-22", source: "Portfolio Site" },
  { id: "APP-005", jobId: "JOB-002", name: "Tomás Reyes", email: "tomas.r@example.com", stage: "Offer", rating: 4.6, appliedDate: "2026-05-21", source: "Referral" },
  { id: "APP-006", jobId: "JOB-003", name: "Camila Soto", email: "camila.s@example.com", stage: "Interview", rating: 4.1, appliedDate: "2026-05-26", source: "Indeed" },
  { id: "APP-007", jobId: "JOB-003", name: "Diego Vargas", email: "diego.v@example.com", stage: "Screening", rating: 3.8, appliedDate: "2026-05-30", source: "LinkedIn" },
  { id: "APP-008", jobId: "JOB-004", name: "Ines Mukamana", email: "ines.m@example.com", stage: "Sourced", rating: 0, appliedDate: "2026-04-18", source: "Sourced" },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "LV-001", employeeId: "EMP-002", employeeName: "Marco Bianchi", type: "Annual", startDate: "2026-06-15", endDate: "2026-06-25", days: 8, status: "Pending", reason: "Family holiday", approver: "Amelia Okonkwo", submittedDate: "2026-06-01" },
  { id: "LV-002", employeeId: "EMP-006", employeeName: "Hana Tanaka", type: "Maternity", startDate: "2026-05-15", endDate: "2026-11-15", days: 130, status: "Approved", reason: "Maternity leave", approver: "Priya Iyer", submittedDate: "2026-04-01" },
  { id: "LV-003", employeeId: "EMP-005", employeeName: "Diego Hernandez", type: "Sick", startDate: "2026-06-08", endDate: "2026-06-09", days: 2, status: "Approved", reason: "Flu", approver: "Chloe Sullivan", submittedDate: "2026-06-08" },
  { id: "LV-004", employeeId: "EMP-010", employeeName: "Sophie Laurent", type: "Annual", startDate: "2026-07-01", endDate: "2026-07-12", days: 9, status: "Pending", reason: "Summer break", approver: "Chloe Sullivan", submittedDate: "2026-06-05" },
  { id: "LV-005", employeeId: "EMP-007", employeeName: "Liam Walsh", type: "Compassionate", startDate: "2026-06-02", endDate: "2026-06-04", days: 3, status: "Approved", reason: "Bereavement", approver: "Amelia Okonkwo", submittedDate: "2026-06-01" },
  { id: "LV-006", employeeId: "EMP-008", employeeName: "Zara Mensah", type: "Study", startDate: "2026-08-10", endDate: "2026-08-14", days: 5, status: "Pending", reason: "SHRM certification exam", approver: "Chloe Sullivan", submittedDate: "2026-06-07" },
];

export const leaveBalances: LeaveBalance[] = employees.map((e, i) => ({
  employeeId: e.id,
  annual: { total: 25, taken: [4, 8, 12, 2, 6, 15, 0, 7, 9, 3][i] ?? 5, remaining: 25 - ([4, 8, 12, 2, 6, 15, 0, 7, 9, 3][i] ?? 5) },
  sick: { total: 10, taken: [1, 0, 3, 1, 2, 0, 0, 2, 1, 0][i] ?? 1, remaining: 10 - ([1, 0, 3, 1, 2, 0, 0, 2, 1, 0][i] ?? 1) },
  personal: { total: 5, taken: [1, 0, 1, 0, 1, 0, 0, 1, 0, 0][i] ?? 0, remaining: 5 - ([1, 0, 1, 0, 1, 0, 0, 1, 0, 0][i] ?? 0) },
}));

export const attendanceRecords: AttendanceRecord[] = [
  { id: "AT-001", employeeId: "EMP-001", employeeName: "Amelia Okonkwo", date: "2026-06-09", clockIn: "08:45", clockOut: "18:10", hoursWorked: 9.0, status: "Present", location: "Office — Lagos" },
  { id: "AT-002", employeeId: "EMP-002", employeeName: "Marco Bianchi", date: "2026-06-09", clockIn: "09:20", clockOut: "18:00", hoursWorked: 8.3, status: "Late", location: "Remote" },
  { id: "AT-003", employeeId: "EMP-003", employeeName: "Priya Iyer", date: "2026-06-09", clockIn: "09:00", clockOut: "17:45", hoursWorked: 8.5, status: "Present", location: "Office — Bangalore" },
  { id: "AT-004", employeeId: "EMP-004", employeeName: "Chloe Sullivan", date: "2026-06-09", clockIn: "08:30", clockOut: "17:30", hoursWorked: 8.5, status: "Present", location: "Office — Kigali" },
  { id: "AT-005", employeeId: "EMP-005", employeeName: "Diego Hernandez", date: "2026-06-09", clockIn: null, clockOut: null, hoursWorked: 0, status: "On Leave" },
  { id: "AT-006", employeeId: "EMP-006", employeeName: "Hana Tanaka", date: "2026-06-09", clockIn: null, clockOut: null, hoursWorked: 0, status: "On Leave" },
  { id: "AT-007", employeeId: "EMP-007", employeeName: "Liam Walsh", date: "2026-06-09", clockIn: "09:10", clockOut: null, hoursWorked: 5.2, status: "Present", location: "Office — Dublin" },
  { id: "AT-008", employeeId: "EMP-008", employeeName: "Zara Mensah", date: "2026-06-09", clockIn: "08:55", clockOut: "17:50", hoursWorked: 8.4, status: "Present", location: "Office — Accra" },
  { id: "AT-009", employeeId: "EMP-009", employeeName: "Noah Petrov", date: "2026-06-09", clockIn: "10:00", clockOut: "19:00", hoursWorked: 8.5, status: "Remote", location: "Remote" },
  { id: "AT-010", employeeId: "EMP-010", employeeName: "Sophie Laurent", date: "2026-06-09", clockIn: null, clockOut: null, hoursWorked: 0, status: "Absent" },
];

export const payrollRuns: PayrollRun[] = [
  { id: "PR-2026-05", period: "May 2026", payDate: "2026-05-28", status: "Paid", employees: 10, gross: 92400, deductions: 21850, net: 70550, createdBy: "Noah Petrov" },
  { id: "PR-2026-04", period: "April 2026", payDate: "2026-04-28", status: "Paid", employees: 9, gross: 84700, deductions: 19980, net: 64720, createdBy: "Noah Petrov" },
  { id: "PR-2026-06", period: "June 2026", payDate: "2026-06-28", status: "Draft", employees: 10, gross: 92400, deductions: 21850, net: 70550, createdBy: "Noah Petrov" },
];

export const payslips: Payslip[] = employees.map((e) => ({
  id: `PS-${e.id}`,
  runId: "PR-2026-05",
  employeeId: e.id,
  employeeName: `${e.firstName} ${e.lastName}`,
  gross: Math.round(e.salary / 12),
  tax: Math.round((e.salary / 12) * 0.18),
  pension: Math.round((e.salary / 12) * 0.05),
  otherDeductions: 120,
  bonuses: e.id === "EMP-005" ? 1500 : 0,
  net: Math.round((e.salary / 12) * 0.77) + (e.id === "EMP-005" ? 1500 : 0),
}));

export const performanceReviews: PerformanceReview[] = [
  { id: "PRV-001", employeeId: "EMP-002", employeeName: "Marco Bianchi", cycle: "H1 2026", reviewer: "Amelia Okonkwo", status: "Manager Review", overallRating: null, dueDate: "2026-07-15", goals: [{ title: "Migrate billing to event-driven architecture", progress: 75, status: "On Track" }, { title: "Mentor 2 junior engineers", progress: 60, status: "On Track" }] },
  { id: "PRV-002", employeeId: "EMP-005", employeeName: "Diego Hernandez", cycle: "H1 2026", reviewer: "Chloe Sullivan", status: "Completed", overallRating: 4.4, dueDate: "2026-06-30", goals: [{ title: "$450k new ARR", progress: 100, status: "Completed" }, { title: "Salesforce certification", progress: 100, status: "Completed" }] },
  { id: "PRV-003", employeeId: "EMP-010", employeeName: "Sophie Laurent", cycle: "H1 2026", reviewer: "Chloe Sullivan", status: "Self Review", overallRating: null, dueDate: "2026-07-20", goals: [{ title: "Publish 12 long-form articles", progress: 50, status: "On Track" }, { title: "Grow blog traffic 40%", progress: 30, status: "At Risk" }] },
  { id: "PRV-004", employeeId: "EMP-007", employeeName: "Liam Walsh", cycle: "Probation", reviewer: "Amelia Okonkwo", status: "Not Started", overallRating: null, dueDate: "2026-09-01", goals: [{ title: "Complete onboarding plan", progress: 40, status: "On Track" }] },
];

export const courses: Course[] = [
  { id: "CRS-001", title: "Anti-Money Laundering Fundamentals", category: "Compliance", provider: "Lexora Academy", durationHours: 4, enrolled: 10, completion: 80, mandatory: true },
  { id: "CRS-002", title: "Information Security Awareness", category: "Security", provider: "KnowBe4", durationHours: 2, enrolled: 10, completion: 100, mandatory: true },
  { id: "CRS-003", title: "Inclusive Leadership", category: "Leadership", provider: "Coursera", durationHours: 8, enrolled: 6, completion: 50, mandatory: false },
  { id: "CRS-004", title: "Advanced TypeScript Patterns", category: "Engineering", provider: "Frontend Masters", durationHours: 12, enrolled: 4, completion: 35, mandatory: false },
  { id: "CRS-005", title: "Workplace Wellness", category: "Wellbeing", provider: "Lexora Academy", durationHours: 1, enrolled: 10, completion: 70, mandatory: false },
];

export const certifications: Certification[] = [
  { employeeId: "EMP-001", name: "AWS Solutions Architect — Pro", issuer: "Amazon", issued: "2024-03-15", expires: "2027-03-15", status: "Valid" },
  { employeeId: "EMP-005", name: "Salesforce Administrator", issuer: "Salesforce", issued: "2025-09-01", expires: "2026-09-01", status: "Expiring Soon" },
  { employeeId: "EMP-008", name: "SHRM-CP", issuer: "SHRM", issued: "2024-01-12", expires: "2027-01-12", status: "Valid" },
  { employeeId: "EMP-009", name: "ACCA", issuer: "ACCA", issued: "2018-06-20", expires: "2026-06-20", status: "Expiring Soon" },
  { employeeId: "EMP-002", name: "CKAD", issuer: "CNCF", issued: "2023-02-10", expires: "2026-02-10", status: "Expired" },
];

export const contracts: Contract[] = [
  { id: "CT-001", employeeId: "EMP-001", employeeName: "Amelia Okonkwo", type: "Permanent", title: "Employment Agreement — VP Engineering", startDate: "2022-01-15", endDate: null, status: "Signed", salary: 145000, currency: "USD", signedDate: "2022-01-10", noticePeriod: "90 days" },
  { id: "CT-002", employeeId: "EMP-007", employeeName: "Liam Walsh", type: "Probation", title: "6-month Probation Agreement", startDate: "2026-04-01", endDate: "2026-10-01", status: "Signed", salary: 88000, currency: "USD", signedDate: "2026-03-25", noticePeriod: "14 days" },
  { id: "CT-003", employeeId: "EMP-010", employeeName: "Sophie Laurent", type: "Contractor", title: "Independent Contractor Agreement", startDate: "2025-01-15", endDate: "2026-12-31", status: "Signed", salary: 62000, currency: "USD", signedDate: "2025-01-10", noticePeriod: "30 days" },
  { id: "CT-004", employeeId: "EMP-006", employeeName: "Hana Tanaka", type: "Amendment", title: "Maternity Leave Amendment", startDate: "2026-05-15", endDate: "2026-11-15", status: "Signed", salary: 95000, currency: "USD", signedDate: "2026-04-10", noticePeriod: "—" },
  { id: "CT-005", employeeId: "EMP-005", employeeName: "Diego Hernandez", type: "Amendment", title: "Compensation Adjustment 2026", startDate: "2026-07-01", endDate: null, status: "Sent", salary: 86000, currency: "USD", noticePeriod: "60 days" },
  { id: "CT-006", employeeId: "EMP-002", employeeName: "Marco Bianchi", type: "NDA", title: "Project Atlas — Confidentiality", startDate: "2026-03-01", endDate: "2029-03-01", status: "Signed", salary: 0, currency: "USD", signedDate: "2026-02-28", noticePeriod: "—" },
  { id: "CT-007", employeeId: "EMP-009", employeeName: "Noah Petrov", type: "Fixed-term", title: "Interim Controller Agreement", startDate: "2022-08-22", endDate: "2026-08-22", status: "Signed", salary: 110000, currency: "USD", signedDate: "2022-08-15", noticePeriod: "60 days" },
];

export const requisitions: Requisition[] = [
  { id: "REQ-001", type: "Hiring", title: "Hire — Senior Frontend Engineer", requestedBy: "Amelia Okonkwo", department: "Engineering", amount: 130000, currency: "USD", priority: "High", status: "Finance Approval", submittedDate: "2026-05-10", justification: "Backfill following resignation; critical to Q3 roadmap.", approvalChain: [{ role: "Manager", name: "Amelia Okonkwo", status: "Approved", date: "2026-05-11" }, { role: "HR", name: "Zara Mensah", status: "Approved", date: "2026-05-12" }, { role: "Finance", name: "Noah Petrov", status: "Pending" }] },
  { id: "REQ-002", type: "Equipment", title: "10x MacBook Pro M4 (Engineering)", requestedBy: "Amelia Okonkwo", department: "Engineering", amount: 32000, currency: "USD", priority: "Medium", status: "Manager Approval", submittedDate: "2026-06-01", justification: "Refresh 3-year-old hardware for engineering team.", approvalChain: [{ role: "Manager", name: "Noah Petrov", status: "Pending" }, { role: "Finance", name: "Noah Petrov", status: "Pending" }] },
  { id: "REQ-003", type: "Travel", title: "Off-site — Product team, Lisbon", requestedBy: "Priya Iyer", department: "Product", amount: 18500, currency: "USD", priority: "Medium", status: "Approved", submittedDate: "2026-05-20", justification: "Annual product offsite for roadmap alignment.", approvalChain: [{ role: "Manager", name: "Priya Iyer", status: "Approved", date: "2026-05-21" }, { role: "Finance", name: "Noah Petrov", status: "Approved", date: "2026-05-23" }] },
  { id: "REQ-004", type: "Training", title: "Coursera Enterprise Licenses (20 seats)", requestedBy: "Zara Mensah", department: "People", amount: 8400, currency: "USD", priority: "Low", status: "Submitted", submittedDate: "2026-06-05", justification: "L&D budget — supports IDP commitments.", approvalChain: [{ role: "Manager", name: "Chloe Sullivan", status: "Pending" }, { role: "Finance", name: "Noah Petrov", status: "Pending" }] },
  { id: "REQ-005", type: "Budget", title: "Marketing — Q3 Paid Campaigns", requestedBy: "Sophie Laurent", department: "Marketing", amount: 45000, currency: "USD", priority: "High", status: "Rejected", submittedDate: "2026-05-28", justification: "Brand awareness push.", approvalChain: [{ role: "Manager", name: "Chloe Sullivan", status: "Approved", date: "2026-05-29" }, { role: "Finance", name: "Noah Petrov", status: "Rejected", date: "2026-06-02" }] },
  { id: "REQ-006", type: "Hiring", title: "Hire — Compliance Analyst (Kigali)", requestedBy: "Chloe Sullivan", department: "Operations", amount: 65000, currency: "USD", priority: "Urgent", status: "Approved", submittedDate: "2026-04-12", justification: "Regulatory requirement — local presence needed.", approvalChain: [{ role: "Manager", name: "Chloe Sullivan", status: "Approved", date: "2026-04-12" }, { role: "HR", name: "Zara Mensah", status: "Approved", date: "2026-04-14" }, { role: "Finance", name: "Noah Petrov", status: "Approved", date: "2026-04-15" }] },
];

export const hrStats = {
  headcount: employees.length,
  active: employees.filter((e) => e.status === "Active").length,
  onLeave: employees.filter((e) => e.status === "On Leave").length,
  probation: employees.filter((e) => e.status === "Probation").length,
  openRoles: jobOpenings.filter((j) => j.status === "Open").length,
  pendingLeave: leaveRequests.filter((l) => l.status === "Pending").length,
  pendingReqs: requisitions.filter((r) => !["Approved", "Rejected", "Fulfilled"].includes(r.status)).length,
  contractsExpiringSoon: 2,
  attritionYtd: 4.2,
};
