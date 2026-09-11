import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type VendorCategory =
  | "Technology"
  | "Professional services"
  | "Financial services"
  | "Facilities & operations"
  | "Marketing & communications"
  | "Other";

export type VendorRisk = "Low" | "Medium" | "High";
export type VendorStatus =
  | "Pending DD"
  | "Pending approval"
  | "Active"
  | "Suspended"
  | "Offboarded";

export type ContractStatus =
  | "draft"
  | "sent"
  | "signed"
  | "active"
  | "expired"
  | "terminated";

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

export interface VendorContractHistoryEntry {
  at: string;
  label: string;
}

export interface VendorContract {
  _id: string;
  title: string;
  templateId: string;
  templateName: string;
  body: string;
  status: ContractStatus;
  value: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signerName: string;
  signerEmail: string;
  history: VendorContractHistoryEntry[];
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
  contracts: VendorContract[];
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

// ── Contract templates — same merge-field approach as before, now
// just a static reference set rather than mock persistence. ──
export interface VendorContractTemplate {
  id: string;
  name: string;
  description: string;
  body: string;
}

const SIGN_BLOCK = `<p><br></p><p><strong>Signed for and on behalf of Lexora</strong></p><p>Name: ______________________  Date: ____________</p><p><br></p><p><strong>Signed for and on behalf of {{vendor_legal_name}}</strong></p><p>Name: {{vendor_contact_name}}  Date: ____________</p>`;

export const VENDOR_CONTRACT_TEMPLATES: VendorContractTemplate[] = [
  {
    id: "tpl-msa",
    name: "Master Services Agreement",
    description: "General framework agreement for ongoing vendor services.",
    body: `<h2>Master Services Agreement</h2><p>This Master Services Agreement ("Agreement") is made on {{start_date}} between <strong>Lexora</strong> ("the Company") and <strong>{{vendor_legal_name}}</strong>, registered in {{jurisdiction}} ("the Vendor").</p><h3>1. Services</h3><p>The Vendor shall provide the following services: {{services}}.</p><h3>2. Term</h3><p>This Agreement commences on {{start_date}} and continues until {{end_date}} unless terminated earlier in accordance with clause 6.</p><h3>3. Fees and payment</h3><p>The Company shall pay the Vendor {{currency}} {{contract_value}} per annum, invoiced {{payment_terms}}.</p><h3>4. Confidentiality</h3><p>Each party shall keep confidential all information disclosed by the other and shall not use it other than for the purposes of this Agreement.</p><h3>5. Data protection</h3><p>Where the Vendor processes personal data on behalf of the Company, it shall do so only on documented instructions and shall maintain appropriate technical and organisational measures.</p><h3>6. Termination</h3><p>Either party may terminate this Agreement on thirty (30) days' written notice, or immediately for material breach.</p><h3>7. Governing law</h3><p>This Agreement is governed by the laws of {{jurisdiction}}.</p>${SIGN_BLOCK}`,
  },
  {
    id: "tpl-sow",
    name: "Statement of Work",
    description: "Scoped project engagement under an existing MSA.",
    body: `<h2>Statement of Work</h2><p>This Statement of Work is issued under the Master Services Agreement between <strong>Lexora</strong> and <strong>{{vendor_legal_name}}</strong>.</p><h3>1. Scope</h3><p>{{services}}</p><h3>2. Deliverables and milestones</h3><p>Deliverables shall be agreed in writing and accepted by the Company's project sponsor.</p><h3>3. Timeline</h3><p>Work commences {{start_date}} and concludes {{end_date}}.</p><h3>4. Charges</h3><p>Total charges: {{currency}} {{contract_value}}, payable {{payment_terms}}.</p><h3>5. Acceptance</h3><p>The Company shall have ten (10) business days to accept or reject each deliverable.</p>${SIGN_BLOCK}`,
  },
  {
    id: "tpl-sla",
    name: "Service Level Agreement",
    description: "Availability, response and remedy commitments.",
    body: `<h2>Service Level Agreement</h2><p>Between <strong>Lexora</strong> and <strong>{{vendor_legal_name}}</strong>, effective {{start_date}}.</p><h3>1. Covered services</h3><p>{{services}}</p><h3>2. Availability</h3><p>The Vendor shall maintain a minimum service availability of 99.5% measured monthly.</p><h3>3. Response times</h3><p>Critical: 1 hour. High: 4 hours. Normal: 1 business day.</p><h3>4. Reporting</h3><p>The Vendor shall provide monthly service reports to the Company.</p><h3>5. Service credits</h3><p>Failure to meet the committed levels entitles the Company to service credits against the fees of {{currency}} {{contract_value}} per annum.</p>${SIGN_BLOCK}`,
  },
  {
    id: "tpl-nda",
    name: "Non-Disclosure Agreement",
    description: "Mutual confidentiality ahead of engagement.",
    body: `<h2>Mutual Non-Disclosure Agreement</h2><p>Entered into on {{start_date}} between <strong>Lexora</strong> and <strong>{{vendor_legal_name}}</strong>.</p><h3>1. Confidential information</h3><p>All non-public information disclosed by either party, in any form.</p><h3>2. Obligations</h3><p>Each party shall protect the other's confidential information with no less than reasonable care and shall not disclose it to third parties without prior written consent.</p><h3>3. Duration</h3><p>Obligations survive for three (3) years from {{end_date}}.</p>${SIGN_BLOCK}`,
  },
  {
    id: "tpl-dpa",
    name: "Data Processing Agreement",
    description: "Required where the vendor handles personal or client data.",
    body: `<h2>Data Processing Agreement</h2><p>Annex to the agreement between <strong>Lexora</strong> (Controller) and <strong>{{vendor_legal_name}}</strong> (Processor), effective {{start_date}}.</p><h3>1. Subject matter</h3><p>Processing carried out in connection with: {{services}}.</p><h3>2. Processor obligations</h3><p>The Processor shall process personal data only on documented instructions, ensure personnel confidentiality, and assist the Controller with data subject requests.</p><h3>3. Sub-processors</h3><p>No sub-processor may be engaged without prior written authorisation.</p><h3>4. Security and breach notification</h3><p>The Processor shall notify the Controller without undue delay and in any case within 24 hours of becoming aware of a personal data breach.</p><h3>5. Return and deletion</h3><p>On expiry ({{end_date}}) the Processor shall return or delete all personal data.</p>${SIGN_BLOCK}`,
  },
  {
    id: "tpl-renewal",
    name: "Contract Renewal Letter",
    description: "Extends an existing vendor contract term.",
    body: `<h2>Contract Renewal</h2><p>Dear {{vendor_contact_name}},</p><p>We are pleased to confirm the renewal of our agreement with <strong>{{vendor_legal_name}}</strong> for the provision of {{services}}.</p><p>The renewed term runs from {{start_date}} to {{end_date}} at an annual value of {{currency}} {{contract_value}}, on {{payment_terms}} payment terms. All other terms of the existing agreement remain unchanged.</p><p>Please countersign below to confirm your acceptance.</p>${SIGN_BLOCK}`,
  },
];

export const MERGE_FIELDS = [
  "{{vendor_legal_name}}",
  "{{vendor_contact_name}}",
  "{{jurisdiction}}",
  "{{services}}",
  "{{contract_value}}",
  "{{currency}}",
  "{{payment_terms}}",
  "{{start_date}}",
  "{{end_date}}",
];

export function renderTemplate(
  body: string,
  vendor: Vendor,
  ctx: { value: number; currency: string; startDate: string; endDate: string },
): string {
  const map: Record<string, string> = {
    "{{vendor_legal_name}}": vendor.legalName,
    "{{vendor_contact_name}}": vendor.contactName,
    "{{jurisdiction}}": vendor.jurisdiction,
    "{{services}}": vendor.serviceSummary,
    "{{contract_value}}": ctx.value.toLocaleString(),
    "{{currency}}": ctx.currency,
    "{{payment_terms}}": vendor.paymentTerms.toLowerCase(),
    "{{start_date}}": ctx.startDate,
    "{{end_date}}": ctx.endDate,
  };
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    body,
  );
}

// ── Derived helpers ────────────────────────────────────────────
export const vendorSpendYtd = (v: Vendor) =>
  v.spend.reduce((s, e) => s + e.amount, 0);

export const activeContract = (v: Vendor) =>
  v.contracts.find((c) => c.status === "active" || c.status === "signed") ??
  null;

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

// ── Contracts ──────────────────────────────────────────────────
export interface SaveContractPayload {
  contractId?: string;
  title: string;
  templateId?: string;
  templateName?: string;
  body?: string;
  value?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  signerName?: string;
  signerEmail?: string;
}

export const saveVendorContract = async (
  vendorId: string,
  dto: SaveContractPayload,
): Promise<Vendor> =>
  unwrap(await api.post(`/crm/vendors/${vendorId}/contracts`, dto));

export const advanceVendorContract = async (
  vendorId: string,
  contractId: string,
  status: ContractStatus,
  label?: string,
): Promise<Vendor> =>
  unwrap(
    await api.patch(`/crm/vendors/${vendorId}/contracts/${contractId}/status`, {
      status,
      label,
    }),
  );

export const deleteVendorContract = async (
  vendorId: string,
  contractId: string,
): Promise<Vendor> =>
  unwrap(await api.delete(`/crm/vendors/${vendorId}/contracts/${contractId}`));

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
