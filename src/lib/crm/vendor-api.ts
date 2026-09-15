import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

// Free text — the backend accepts any string. These are just the
// frontend's suggested quick-picks (see VENDOR_CATEGORIES below);
// picking "Other" opens a field to type a custom category, which
// becomes the real stored value.
export type VendorCategory = string;

export type VendorRisk = "Low" | "Medium" | "High";
export type VendorStatus =
  | "Pending DD"
  | "Pending approval"
  | "Approved"
  | "Active"
  | "Suspended"
  | "Offboarded";

export type VendorApprovalStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected";

export interface DdChecklistItem {
  _id: string;
  label: string;
  hint: string;
  done: boolean;
  documentName: string;
  documentUrl: string;
  uploadedAt: string | null;
  uploadedBy: string;
}

export interface VendorNote {
  _id: string;
  at: string;
  author: string;
  title: string;
  body: string;
}

export interface VendorActivity {
  _id: string;
  at: string;
  text: string;
}

export interface VendorSpendEntry {
  month: string; // "2026-01"
  amount: number;
}

export interface Vendor {
  _id: string;
  legalName: string;
  tradingName: string;
  category: VendorCategory;
  serviceSummary: string;
  jurisdiction: string;
  registrationNumber: string;
  taxId: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  engagementType: string;
  annualValue: number;
  currency: string;
  paymentTerms: string;
  budgetCode: string;
  usedByModules: string[];
  risk: VendorRisk;
  reviewFrequency: string;
  status: VendorStatus;
  onboardedAt: string | null;
  nextReview: string | null;
  justification: string;
  approverEmployeeId: string | null;
  approverName: string;
  approvalStatus: VendorApprovalStatus;
  approvalRequestedAt: string | null;
  approvalDecidedAt: string | null;
  approvalDecisionNote: string;
  ddItems: DdChecklistItem[];
  notes: VendorNote[];
  activity: VendorActivity[];
  spend: VendorSpendEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface EligibleApprover {
  employeeId: string;
  name: string;
  jobTitle: string;
  hierarchyRole: string;
}

// ── Display-only constants — pure UI concerns, no backend storage
// needed for these. ──
export const VENDOR_CATEGORIES: VendorCategory[] = [
  "Technology",
  "Professional services",
  "Financial services",
  "Facilities & operations",
  "Marketing & communications",
  "Other",
];

export const JURISDICTIONS = [
  "Rwanda",
  "Kenya",
  "Uganda",
  "Tanzania",
  "South Africa",
  "Nigeria",
  "Other",
];

export const ENGAGEMENT_TYPES = [
  "One-off project",
  "Ongoing retainer",
  "Subscription / SaaS",
  "Ad hoc / as needed",
];

export const PAYMENT_TERMS = [
  "Monthly in arrears",
  "Monthly in advance",
  "Quarterly",
  "Annual prepaid",
  "Per transaction",
  "On completion",
];

export const MODULE_OPTIONS = [
  "AML/KYC",
  "Technology / Platform",
  "Finance",
  "HR",
  "GRC / Compliance",
  "Operations",
];

export const SPEND_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Mirrors the backend's fixed DD_CHECKLIST labels exactly — used
// only for table headers before any vendor data has loaded. The
// real, authoritative list per vendor always comes from that
// vendor's own ddItems.
export const DD_CHECKLIST_LABELS = [
  "Company registration verification",
  "Beneficial ownership / directors",
  "Financial stability assessment",
  "Professional indemnity / insurance",
  "Data processing impact assessment",
  "Reference checks (minimum 2)",
];

// ── Derived helpers ────────────────────────────────────────────
export const vendorSpendYtd = (v: Vendor) =>
  v.spend.reduce((s, e) => s + e.amount, 0);

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr).getTime();
  return Math.ceil((d - Date.now()) / 86400000);
}

// ── Real API ─────────────────────────────────────────────────────
export const fetchVendors = async (): Promise<Vendor[]> => {
  const res = await api.get("/crm/vendors");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const fetchVendor = async (id: string): Promise<Vendor> =>
  unwrap(await api.get(`/crm/vendors/${id}`));

export const fetchEligibleApprovers = async (): Promise<EligibleApprover[]> => {
  const res = await api.get("/crm/vendors/eligible-approvers");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export interface CreateVendorPayload {
  legalName: string;
  tradingName?: string;
  category: VendorCategory;
  serviceSummary?: string;
  jurisdiction?: string;
  registrationNumber?: string;
  taxId?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  engagementType?: string;
  annualValue?: number;
  currency?: string;
  paymentTerms?: string;
  budgetCode?: string;
  usedByModules?: string[];
  risk?: VendorRisk;
  reviewFrequency?: string;
  justification?: string;
}

export const createVendor = async (dto: CreateVendorPayload): Promise<Vendor> =>
  unwrap(await api.post("/crm/vendors", dto));

export const updateVendor = async (
  id: string,
  dto: Partial<CreateVendorPayload> & { nextReview?: string },
): Promise<Vendor> => unwrap(await api.patch(`/crm/vendors/${id}`, dto));

export const setVendorStatus = async (
  id: string,
  status: VendorStatus,
): Promise<Vendor> =>
  unwrap(await api.patch(`/crm/vendors/${id}/status`, { status }));

// ── Due diligence ──────────────────────────────────────────────
export const uploadDdEvidence = async (
  vendorId: string,
  itemId: string,
  file: File,
): Promise<Vendor> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(
    `/crm/vendors/${vendorId}/dd-items/${itemId}/evidence`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return unwrap(res);
};

export const removeDdEvidence = async (
  vendorId: string,
  itemId: string,
): Promise<Vendor> =>
  unwrap(
    await api.delete(`/crm/vendors/${vendorId}/dd-items/${itemId}/evidence`),
  );

// ── Notes ────────────────────────────────────────────────────────
export const addVendorNote = async (
  vendorId: string,
  title: string,
  body: string,
): Promise<Vendor> =>
  unwrap(await api.post(`/crm/vendors/${vendorId}/notes`, { title, body }));

// ── Approval ─────────────────────────────────────────────────────
export const requestVendorApproval = async (
  vendorId: string,
  approverEmployeeId: string,
): Promise<Vendor> =>
  unwrap(
    await api.post(`/crm/vendors/${vendorId}/approval/request`, {
      approverEmployeeId,
    }),
  );

export const decideVendorApproval = async (
  vendorId: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<Vendor> =>
  unwrap(
    await api.post(`/crm/vendors/${vendorId}/approval/decide`, {
      decision,
      note,
    }),
  );

// ── Spend ────────────────────────────────────────────────────────
export const addVendorSpend = async (
  vendorId: string,
  month: string,
  amount: number,
): Promise<Vendor> =>
  unwrap(await api.post(`/crm/vendors/${vendorId}/spend`, { month, amount }));

// ── Employee-side — vendors this HOD/Manager needs to approve, and
// ones they've already approved. Never the full registry. ────────
export interface MyVendorApprovals {
  pending: Vendor[];
  approved: Vendor[];
}

export const fetchMyVendorApprovals = async (): Promise<MyVendorApprovals> => {
  const res = await api.get("/crm/my-vendor-approvals");
  const d = unwrap(res);
  return d && typeof d === "object" ? d : { pending: [], approved: [] };
};

export const fetchMyVendorApproval = async (id: string): Promise<Vendor> =>
  unwrap(await api.get(`/crm/my-vendor-approvals/${id}`));

export const decideMyVendorApproval = async (
  id: string,
  decision: "approved" | "rejected",
  note?: string,
): Promise<Vendor> =>
  unwrap(
    await api.post(`/crm/my-vendor-approvals/${id}/decide`, {
      decision,
      note,
    }),
  );
