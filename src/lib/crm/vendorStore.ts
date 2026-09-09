import { useSyncExternalStore } from "react";

/**
 * Vendor management store — registry, due diligence, contracts and spend.
 * Prototype persistence: localStorage. No performance scoring by design.
 */

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

export interface DdItem {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  evidence: string | null;
}

export interface VendorContract {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  body: string;
  status: ContractStatus;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  sentAt: string | null;
  signedAt: string | null;
  signerName: string;
  signerEmail: string;
  history: { at: string; label: string }[];
}

export interface VendorNote {
  id: string;
  at: string;
  author: string;
  title: string;
  body: string;
}

export interface VendorActivity {
  id: string;
  at: string;
  text: string;
}

export interface SpendEntry {
  month: string; // "2026-01"
  amount: number;
}

export interface Vendor {
  id: string;
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
  onboardedAt: string;
  nextReview: string;
  justification: string;
  approver: string;
  ddItems: DdItem[];
  contracts: VendorContract[];
  notes: VendorNote[];
  activity: VendorActivity[];
  spend: SpendEntry[];
}

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

export const DD_CHECKLIST: { label: string; hint: string }[] = [
  {
    label: "Company registration verification",
    hint: "Verify legal existence and good standing",
  },
  {
    label: "Beneficial ownership / directors",
    hint: "Identify UBOs and check for PEP/sanctions matches",
  },
  {
    label: "Financial stability assessment",
    hint: "Review latest financials or credit reference",
  },
  {
    label: "Professional indemnity / insurance",
    hint: "Verify adequate coverage for services provided",
  },
  {
    label: "Data processing impact assessment",
    hint: "Will the vendor handle personal or client data?",
  },
  {
    label: "Reference checks (minimum 2)",
    hint: "Contact references from current or past clients",
  },
];

// ── Contract templates ─────────────────────────────────────────

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
  ctx: {
    value: number;
    currency: string;
    startDate: string;
    endDate: string;
  },
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

// ── Seed data ──────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const dd = (doneCount: number): DdItem[] =>
  DD_CHECKLIST.map((c, i) => ({
    id: `dd-${i}`,
    label: c.label,
    hint: c.hint,
    done: i < doneCount,
    evidence: i < doneCount ? `${c.label.split(" ")[0]}-evidence.pdf` : null,
  }));

const spendSeries = (amounts: number[]): SpendEntry[] =>
  amounts.map((amount, i) => ({
    month: `2026-${String(i + 1).padStart(2, "0")}`,
    amount,
  }));

function seed(): Vendor[] {
  return [
    {
      id: "v1",
      legalName: "Smile Identity Ltd",
      tradingName: "Smile ID",
      category: "Technology",
      serviceSummary:
        "KYC screening and identity verification API used across client onboarding.",
      jurisdiction: "Nigeria",
      registrationNumber: "RC-994412",
      taxId: "TIN-88231",
      contactName: "Mark Fagbemi",
      contactTitle: "Account Manager",
      contactEmail: "mark@smileidentity.com",
      contactPhone: "+234 802 111 2233",
      website: "https://smileidentity.com",
      engagementType: "Subscription / SaaS",
      annualValue: 14400,
      currency: "USD",
      paymentTerms: "Monthly in arrears",
      budgetCode: "TECH-001",
      usedByModules: ["AML/KYC", "Technology / Platform"],
      risk: "Low",
      reviewFrequency: "Annual",
      status: "Active",
      onboardedAt: "2026-01-15",
      nextReview: "2027-01-15",
      justification:
        "Only provider with pan-African document coverage and live PEP screening.",
      approver: "Rudo Barbra Sibanda",
      ddItems: dd(6),
      contracts: [
        {
          id: "c1",
          title: "Master Services Agreement 2026",
          templateId: "tpl-msa",
          templateName: "Master Services Agreement",
          body: "<h2>Master Services Agreement</h2><p>Executed agreement covering identity verification services.</p>",
          status: "active",
          value: 14400,
          currency: "USD",
          startDate: "2026-03-15",
          endDate: "2027-03-15",
          sentAt: "2026-03-01T09:00:00.000Z",
          signedAt: "2026-03-10T11:20:00.000Z",
          signerName: "Mark Fagbemi",
          signerEmail: "mark@smileidentity.com",
          history: [
            { at: "2026-03-01T09:00:00.000Z", label: "Sent to vendor" },
            { at: "2026-03-10T11:20:00.000Z", label: "Signed by vendor" },
            { at: "2026-03-15T08:00:00.000Z", label: "Contract activated" },
          ],
        },
      ],
      notes: [
        {
          id: uid(),
          at: "2026-04-02T10:00:00.000Z",
          author: "Rudo Barbra Sibanda",
          title: "Rate negotiation",
          body: "Agreed volume discount above 5,000 verifications per month.",
        },
      ],
      activity: [
        { id: uid(), at: "2026-03-15T08:00:00.000Z", text: "Contract activated" },
        { id: uid(), at: "2026-01-15T08:00:00.000Z", text: "Vendor onboarded" },
      ],
      spend: spendSeries([1200, 1200, 1400, 1200, 1500, 1200, 1400, 1400]),
    },
    {
      id: "v2",
      legalName: "Kigali Law Partners",
      tradingName: "KLP",
      category: "Professional services",
      serviceSummary: "External legal counsel for corporate and dispute matters.",
      jurisdiction: "Rwanda",
      registrationNumber: "RW-114520",
      taxId: "TIN-40021",
      contactName: "Alice Mukamana",
      contactTitle: "Managing Partner",
      contactEmail: "alice@kigalilaw.rw",
      contactPhone: "+250 788 220 110",
      website: "https://kigalilaw.rw",
      engagementType: "Ongoing retainer",
      annualValue: 24000,
      currency: "USD",
      paymentTerms: "Monthly in arrears",
      budgetCode: "LEG-002",
      usedByModules: ["GRC / Compliance", "Operations"],
      risk: "Medium",
      reviewFrequency: "Annual",
      status: "Active",
      onboardedAt: "2025-12-01",
      nextReview: "2026-12-01",
      justification: "Local counsel required for regulatory filings.",
      approver: "Rudo Barbra Sibanda",
      ddItems: dd(5),
      contracts: [
        {
          id: "c2",
          title: "Legal retainer 2026",
          templateId: "tpl-msa",
          templateName: "Master Services Agreement",
          body: "<h2>Master Services Agreement</h2><p>Retainer for legal advisory services.</p>",
          status: "active",
          value: 24000,
          currency: "USD",
          startDate: "2025-12-30",
          endDate: "2026-12-30",
          sentAt: "2025-12-10T09:00:00.000Z",
          signedAt: "2025-12-18T14:00:00.000Z",
          signerName: "Alice Mukamana",
          signerEmail: "alice@kigalilaw.rw",
          history: [
            { at: "2025-12-10T09:00:00.000Z", label: "Sent to vendor" },
            { at: "2025-12-18T14:00:00.000Z", label: "Signed by vendor" },
          ],
        },
      ],
      notes: [],
      activity: [
        { id: uid(), at: "2025-12-18T14:00:00.000Z", text: "Retainer signed" },
      ],
      spend: spendSeries([2000, 1500, 3000, 2000, 2500, 2000, 3000, 2500]),
    },
    {
      id: "v3",
      legalName: "CloudHost Rwanda Ltd",
      tradingName: "CloudHost",
      category: "Technology",
      serviceSummary: "Cloud infrastructure hosting and managed backups.",
      jurisdiction: "Rwanda",
      registrationNumber: "RW-220118",
      taxId: "TIN-55210",
      contactName: "Eric Habimana",
      contactTitle: "Customer Success Lead",
      contactEmail: "eric@cloudhost.rw",
      contactPhone: "+250 788 445 332",
      website: "https://cloudhost.rw",
      engagementType: "Subscription / SaaS",
      annualValue: 12000,
      currency: "USD",
      paymentTerms: "Monthly in advance",
      budgetCode: "TECH-004",
      usedByModules: ["Technology / Platform"],
      risk: "Low",
      reviewFrequency: "Annual",
      status: "Active",
      onboardedAt: "2025-06-01",
      nextReview: "2027-06-01",
      justification: "In-country data residency requirement.",
      approver: "Rudo Barbra Sibanda",
      ddItems: dd(6),
      contracts: [
        {
          id: "c3",
          title: "Hosting SLA 2026/27",
          templateId: "tpl-sla",
          templateName: "Service Level Agreement",
          body: "<h2>Service Level Agreement</h2><p>99.9% availability commitment.</p>",
          status: "active",
          value: 12000,
          currency: "USD",
          startDate: "2026-06-01",
          endDate: "2027-06-01",
          sentAt: "2026-05-10T09:00:00.000Z",
          signedAt: "2026-05-20T09:00:00.000Z",
          signerName: "Eric Habimana",
          signerEmail: "eric@cloudhost.rw",
          history: [
            { at: "2026-05-20T09:00:00.000Z", label: "Signed by vendor" },
          ],
        },
      ],
      notes: [],
      activity: [],
      spend: spendSeries([1000, 1000, 1000, 1000, 1100, 1000, 1100, 1000]),
    },
    {
      id: "v4",
      legalName: "Grant Thornton Rwanda",
      tradingName: "Grant Thornton",
      category: "Financial services",
      serviceSummary: "Statutory external audit and assurance services.",
      jurisdiction: "Rwanda",
      registrationNumber: "RW-778120",
      taxId: "TIN-77120",
      contactName: "Josiane Karake",
      contactTitle: "Audit Partner",
      contactEmail: "josiane@gt.rw",
      contactPhone: "+250 788 900 411",
      website: "https://grantthornton.rw",
      engagementType: "One-off project",
      annualValue: 6000,
      currency: "USD",
      paymentTerms: "On completion",
      budgetCode: "FIN-010",
      usedByModules: ["Finance", "GRC / Compliance"],
      risk: "Medium",
      reviewFrequency: "Annual",
      status: "Active",
      onboardedAt: "2026-01-31",
      nextReview: "2027-01-31",
      justification: "Regulator requires an independent audit firm.",
      approver: "Rudo Barbra Sibanda",
      ddItems: dd(4),
      contracts: [
        {
          id: "c4",
          title: "FY2026 audit engagement",
          templateId: "tpl-sow",
          templateName: "Statement of Work",
          body: "<h2>Statement of Work</h2><p>Audit of the financial statements for FY2026.</p>",
          status: "active",
          value: 6000,
          currency: "USD",
          startDate: "2026-01-31",
          endDate: "2027-01-31",
          sentAt: "2026-01-15T09:00:00.000Z",
          signedAt: "2026-01-25T09:00:00.000Z",
          signerName: "Josiane Karake",
          signerEmail: "josiane@gt.rw",
          history: [],
        },
      ],
      notes: [],
      activity: [],
      spend: spendSeries([0, 3000, 0, 0, 0, 0, 0, 3000]),
    },
    {
      id: "v5",
      legalName: "NameScan Pty Ltd",
      tradingName: "NameScan",
      category: "Technology",
      serviceSummary: "PEP and sanctions screening data feeds.",
      jurisdiction: "Other",
      registrationNumber: "AU-552118",
      taxId: "ABN-99112",
      contactName: "Daniel Choi",
      contactTitle: "Sales Lead",
      contactEmail: "daniel@namescan.io",
      contactPhone: "+61 2 8000 1122",
      website: "https://namescan.io",
      engagementType: "Subscription / SaaS",
      annualValue: 4800,
      currency: "USD",
      paymentTerms: "Annual prepaid",
      budgetCode: "TECH-009",
      usedByModules: ["AML/KYC"],
      risk: "Low",
      reviewFrequency: "Annual",
      status: "Pending DD",
      onboardedAt: "",
      nextReview: "",
      justification: "Secondary screening source for sanctions coverage.",
      approver: "",
      ddItems: dd(2),
      contracts: [],
      notes: [],
      activity: [
        { id: uid(), at: "2026-08-20T09:00:00.000Z", text: "Vendor registered" },
      ],
      spend: [],
    },
    {
      id: "v6",
      legalName: "CleanSpace Facilities Ltd",
      tradingName: "CleanSpace",
      category: "Facilities & operations",
      serviceSummary: "Office cleaning and general maintenance.",
      jurisdiction: "Rwanda",
      registrationNumber: "RW-330219",
      taxId: "TIN-33021",
      contactName: "Jean Bosco",
      contactTitle: "Operations Manager",
      contactEmail: "jean@cleanspace.rw",
      contactPhone: "+250 788 664 220",
      website: "",
      engagementType: "Ongoing retainer",
      annualValue: 4800,
      currency: "USD",
      paymentTerms: "Monthly in arrears",
      budgetCode: "OPS-003",
      usedByModules: ["Operations"],
      risk: "Low",
      reviewFrequency: "Annual",
      status: "Active",
      onboardedAt: "2025-09-30",
      nextReview: "2026-09-30",
      justification: "Lowest cost compliant provider in Kigali.",
      approver: "Rudo Barbra Sibanda",
      ddItems: dd(5),
      contracts: [
        {
          id: "c6",
          title: "Facilities retainer 2025/26",
          templateId: "tpl-msa",
          templateName: "Master Services Agreement",
          body: "<h2>Master Services Agreement</h2><p>Office cleaning and maintenance services.</p>",
          status: "active",
          value: 4800,
          currency: "USD",
          startDate: "2025-09-30",
          endDate: "2026-09-30",
          sentAt: "2025-09-10T09:00:00.000Z",
          signedAt: "2025-09-20T09:00:00.000Z",
          signerName: "Jean Bosco",
          signerEmail: "jean@cleanspace.rw",
          history: [],
        },
      ],
      notes: [],
      activity: [],
      spend: spendSeries([400, 400, 400, 400, 400, 400, 400, 400]),
    },
  ];
}

// ── Store plumbing ─────────────────────────────────────────────

const KEY = "lexora.crm.vendors.v1";

let state: Vendor[] = load();
const listeners = new Set<() => void>();

function load(): Vendor[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Vendor[];
    return Array.isArray(parsed) && parsed.length ? parsed : seed();
  } catch {
    return seed();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const snapshot = () => state;

export function useVendors(): Vendor[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

function update(id: string, fn: (v: Vendor) => Vendor) {
  state = state.map((v) => (v.id === id ? fn(v) : v));
  persist();
}

function logActivity(v: Vendor, text: string): Vendor {
  return {
    ...v,
    activity: [{ id: uid(), at: now(), text }, ...v.activity],
  };
}

export type NewVendorInput = Omit<
  Vendor,
  | "id"
  | "ddItems"
  | "contracts"
  | "notes"
  | "activity"
  | "spend"
  | "onboardedAt"
  | "nextReview"
> & { ddDone: boolean[] };

export function addVendor(input: NewVendorInput) {
  const vendor: Vendor = {
    ...input,
    id: uid(),
    onboardedAt: new Date().toISOString().slice(0, 10),
    nextReview: "",
    ddItems: DD_CHECKLIST.map((c, i) => ({
      id: `dd-${i}`,
      label: c.label,
      hint: c.hint,
      done: !!input.ddDone[i],
      evidence: null,
    })),
    contracts: [],
    notes: [],
    activity: [{ id: uid(), at: now(), text: "Vendor registered" }],
    spend: [],
  };
  delete (vendor as any).ddDone;
  state = [vendor, ...state];
  persist();
  return vendor;
}

export function setVendorStatus(id: string, status: VendorStatus) {
  update(id, (v) => logActivity({ ...v, status }, `Status changed to ${status}`));
}

export function toggleDdItem(vendorId: string, itemId: string) {
  update(vendorId, (v) => ({
    ...v,
    ddItems: v.ddItems.map((d) =>
      d.id === itemId ? { ...d, done: !d.done } : d,
    ),
  }));
}

export function attachDdEvidence(
  vendorId: string,
  itemId: string,
  filename: string,
) {
  update(vendorId, (v) => ({
    ...v,
    ddItems: v.ddItems.map((d) =>
      d.id === itemId ? { ...d, evidence: filename, done: true } : d,
    ),
  }));
}

export function addVendorNote(vendorId: string, title: string, body: string) {
  update(vendorId, (v) => ({
    ...v,
    notes: [
      { id: uid(), at: now(), author: "You", title, body },
      ...v.notes,
    ],
  }));
}

export function saveContract(
  vendorId: string,
  contract: Omit<VendorContract, "id" | "history"> & { id?: string },
) {
  update(vendorId, (v) => {
    const existing = contract.id
      ? v.contracts.find((c) => c.id === contract.id)
      : undefined;
    if (existing) {
      return logActivity(
        {
          ...v,
          contracts: v.contracts.map((c) =>
            c.id === existing.id ? { ...c, ...contract } as VendorContract : c,
          ),
        },
        `Contract "${contract.title}" updated`,
      );
    }
    const created: VendorContract = {
      ...contract,
      id: uid(),
      history: [{ at: now(), label: "Draft created from template" }],
    };
    return logActivity(
      { ...v, contracts: [created, ...v.contracts] },
      `Contract "${created.title}" drafted from ${created.templateName}`,
    );
  });
}

export function advanceContract(
  vendorId: string,
  contractId: string,
  status: ContractStatus,
  label: string,
) {
  update(vendorId, (v) =>
    logActivity(
      {
        ...v,
        contracts: v.contracts.map((c) =>
          c.id === contractId
            ? {
                ...c,
                status,
                sentAt: status === "sent" ? now() : c.sentAt,
                signedAt: status === "signed" ? now() : c.signedAt,
                history: [...c.history, { at: now(), label }],
              }
            : c,
        ),
      },
      label,
    ),
  );
}

export function deleteContract(vendorId: string, contractId: string) {
  update(vendorId, (v) => ({
    ...v,
    contracts: v.contracts.filter((c) => c.id !== contractId),
  }));
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
