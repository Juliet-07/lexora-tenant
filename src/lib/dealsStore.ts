import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// Deals & Transactions prototype store — lifecycle-driven state
// for the GRC → Deals module. Local storage only; wire to
// backend later.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_deals_store_v1";
const EVT = "grc_deals_store_changed";

export const DEAL_STAGES = [
  "Origination",
  "Term Sheet",
  "Due Diligence",
  "Negotiation",
  "Signing",
  "CPs Tracking",
  "Completion",
  "Post-Completion",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export type DealType =
  | "M&A"
  | "JV"
  | "Restructure"
  | "Capital Raise"
  | "Disposal"
  | "Spin-off";

export type DealStatus = "Active" | "Completed" | "Lost" | "On Hold";

export interface DataRoomFile {
  id: string;
  name: string;
  folder: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  views: number;
}

export interface DataRoomParty {
  id: string;
  name: string;
  type: "Internal" | "Counterparty" | "Advisor" | "Regulator";
  permission: "Admin" | "Upload" | "View" | "Restricted";
  members: number;
}

export interface QAItem {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  status: "Open" | "Answered" | "Follow-up";
}

export interface DDItem {
  id: string;
  workstream: "Legal" | "Financial" | "Tax" | "Commercial" | "Operational" | "ESG";
  item: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Complete" | "Red Flag";
  finding?: string;
  materiality?: "Low" | "Medium" | "High";
}

export interface Clause {
  id: string;
  title: string;
  category: string;
  jurisdiction: string;
  body: string;
  approved: boolean;
  version: number;
}

export interface ContractSection {
  id: string;
  clauseId?: string;
  title: string;
  body: string;
  comments: { id: string; author: string; text: string; resolved: boolean }[];
}

export interface CP {
  id: string;
  type: "Precedent" | "Subsequent";
  description: string;
  responsible: string;
  deadline: string;
  evidence?: string;
  status: "Satisfied" | "Pending" | "At Risk" | "Not Yet Due";
}

export interface SigningItem {
  id: string;
  item: string;
  owner: string;
  status: "Pending" | "Done";
}

export interface Signatory {
  id: string;
  name: string;
  party: string;
  role: string;
  signed: boolean;
  signedAt?: string;
}

export interface TermSheet {
  parties: string;
  structure: string;
  consideration: string;
  conditions: string;
  exclusivity: string;
  confidentiality: string;
  timeline: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  name: string;
  client: string;
  counterparty: string;
  type: DealType;
  stage: DealStage;
  status: DealStatus;
  leadPartner: string;
  team: string[];
  value: number;
  currency: string;
  jurisdiction: string;
  startDate: string;
  targetClose: string;
  longstopDate: string;
  createdAt: string;
  updatedAt: string;
  termSheet: TermSheet;
  dataRoom: { files: DataRoomFile[]; parties: DataRoomParty[]; qa: QAItem[] };
  dd: DDItem[];
  contract: { sections: ContractSection[]; variables: Record<string, string> };
  cps: CP[];
  signing: { checklist: SigningItem[]; signatories: Signatory[]; signingDate?: string; venue?: string };
  postCompletion: { item: string; dueDate: string; status: "Pending" | "Done" }[];
  conflictCheck: { cleared: boolean; note: string };
}

export interface Precedent {
  id: string;
  name: string;
  type: DealType;
  jurisdiction: string;
  sections: ContractSection[];
}

export interface LegalDoc {
  id: string;
  category: "Statute" | "Regulation" | "Case Law" | "International" | "Commentary" | "Update";
  title: string;
  practiceArea: string;
  summary: string;
  urgency?: "Action Required" | "Review" | "Informational" | "Noted";
  /** Full body of the feed item published by the platform (superadmin) */
  content?: string;
  jurisdiction?: string;
  source?: string;
  reference?: string;
  link?: string;
  publishedAt?: string;
  updatedAt: string;
}

export interface DealsState {
  deals: Deal[];
  clauses: Clause[];
  precedents: Precedent[];
  legal: LegalDoc[];
}

const now = () => new Date().toISOString();
const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const dt = (n: number) => days(n).slice(0, 10);

export const gid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function seedClauses(): Clause[] {
  return [
    { id: "cl_1", title: "Standard Confidentiality", category: "Confidentiality", jurisdiction: "Rwanda", body: "Each party shall maintain the confidentiality of all Confidential Information disclosed by the other party…", approved: true, version: 3 },
    { id: "cl_2", title: "Lump Sum Consideration", category: "Consideration", jurisdiction: "Rwanda", body: "The Purchaser shall pay to the Seller the sum of [AMOUNT] [CURRENCY] on Completion.", approved: true, version: 2 },
    { id: "cl_3", title: "Deferred Consideration", category: "Consideration", jurisdiction: "Rwanda", body: "The Purchaser shall pay [AMOUNT] in three equal instalments…", approved: true, version: 1 },
    { id: "cl_4", title: "Earn-out Consideration", category: "Consideration", jurisdiction: "Rwanda", body: "Additional consideration payable subject to EBITDA milestones over 24 months…", approved: false, version: 1 },
    { id: "cl_5", title: "Regulatory Approval CP", category: "Conditions Precedent", jurisdiction: "Rwanda", body: "Completion is conditional on written approval from [REGULATOR] on or before [LONGSTOP_DATE].", approved: true, version: 4 },
    { id: "cl_6", title: "Standard Warranties (Corporate)", category: "Warranties", jurisdiction: "Rwanda", body: "The Seller warrants that the Company is duly incorporated and validly existing…", approved: true, version: 2 },
    { id: "cl_7", title: "Governing Law — Rwanda", category: "Boilerplate", jurisdiction: "Rwanda", body: "This Agreement shall be governed by and construed in accordance with the laws of Rwanda.", approved: true, version: 1 },
    { id: "cl_8", title: "Arbitration — KIAC", category: "Dispute Resolution", jurisdiction: "Rwanda", body: "Any dispute shall be finally resolved by arbitration under the KIAC Rules.", approved: true, version: 2 },
  ];
}

function seedPrecedents(clauses: Clause[]): Precedent[] {
  const pick = (ids: string[]): ContractSection[] =>
    ids.map((id, i) => {
      const c = clauses.find((x) => x.id === id)!;
      return { id: gid("sec"), clauseId: c.id, title: c.title, body: c.body, comments: [] };
    });
  return [
    { id: "pt_1", name: "Standard SPA — Rwanda", type: "M&A", jurisdiction: "Rwanda", sections: pick(["cl_2", "cl_5", "cl_6", "cl_1", "cl_7", "cl_8"]) },
    { id: "pt_2", name: "Joint Venture Agreement", type: "JV", jurisdiction: "Rwanda", sections: pick(["cl_1", "cl_5", "cl_6", "cl_7", "cl_8"]) },
    { id: "pt_3", name: "Capital Raise Subscription", type: "Capital Raise", jurisdiction: "Rwanda", sections: pick(["cl_2", "cl_5", "cl_1", "cl_7"]) },
  ];
}

function seedLegal(): LegalDoc[] {
  return [
    { id: "lg_1", category: "Statute", title: "Companies Act No. 17/2018", practiceArea: "Company Law", summary: "Governs incorporation, governance, and dissolution of companies in Rwanda.", updatedAt: now() },
    { id: "lg_2", category: "Regulation", title: "BNR Directive on Bank Mergers", practiceArea: "Banking/Financial", summary: "Prior approval requirements for bank M&A transactions.", updatedAt: now() },
    { id: "lg_3", category: "Case Law", title: "Kigali Holdings v. RIB [2023]", practiceArea: "Company Law", summary: "Directors' duties under s.170 — landmark ruling on business judgment rule.", updatedAt: now() },
    { id: "lg_4", category: "International", title: "OECD Transfer Pricing Guidelines", practiceArea: "Tax", summary: "Arm's length principle application across cross-border deals.", updatedAt: now() },
    { id: "lg_5", category: "Update", title: "CMA Rule Change — Disclosure Thresholds", practiceArea: "Capital Markets", summary: "Beneficial ownership disclosure lowered to 3% effective Q3 2026.", urgency: "Action Required", updatedAt: now() },
    { id: "lg_6", category: "Update", title: "FATF Recommendation 24 Refresh", practiceArea: "AML/CFT", summary: "Updated guidance on beneficial ownership transparency.", urgency: "Review", updatedAt: now() },
    { id: "lg_7", category: "Commentary", title: "Practice Note: Cross-Border M&A in EAC", practiceArea: "Company Law", summary: "Internal briefing on regional considerations.", updatedAt: now() },
  ];
}

function seedDeals(clauses: Clause[]): Deal[] {
  const secs = (ids: string[]) =>
    ids.map((id) => {
      const c = clauses.find((x) => x.id === id)!;
      return { id: gid("sec"), clauseId: c.id, title: c.title, body: c.body, comments: [] };
    });

  return [
    {
      id: "dl_1",
      name: "Project Kivu — Bank Acquisition",
      client: "Umoja Financial Group",
      counterparty: "Lakeside Bank Ltd.",
      type: "M&A",
      stage: "Due Diligence",
      status: "Active",
      leadPartner: "Dr. E. Rwigema",
      team: ["N. Uwase", "J. Mukamana", "P. Kagame"],
      value: 45_000_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-45),
      targetClose: dt(60),
      longstopDate: dt(120),
      createdAt: days(-45),
      updatedAt: now(),
      termSheet: {
        parties: "Umoja Financial Group (Purchaser); Lakeside Bank Ltd. (Target)",
        structure: "100% share acquisition",
        consideration: "USD 45m — 80% cash on Completion, 20% deferred over 24 months",
        conditions: "BNR approval; competition clearance; satisfactory DD",
        exclusivity: "90 days from signing of Term Sheet",
        confidentiality: "24 months post-termination",
        timeline: "Signing target: Q3 2026; Completion: Q4 2026",
        updatedAt: now(),
      },
      dataRoom: {
        parties: [
          { id: gid("pr"), name: "Umoja Deal Team", type: "Internal", permission: "Admin", members: 6 },
          { id: gid("pr"), name: "Lakeside Management", type: "Counterparty", permission: "Upload", members: 4 },
          { id: gid("pr"), name: "Deloitte (Financial DD)", type: "Advisor", permission: "View", members: 3 },
          { id: gid("pr"), name: "BNR Reviewer", type: "Regulator", permission: "Restricted", members: 1 },
        ],
        files: [
          { id: gid("f"), name: "Certificate_of_Incorporation.pdf", folder: "01 Corporate", size: "1.2 MB", uploadedAt: days(-30), uploadedBy: "Lakeside", version: 1, views: 12 },
          { id: gid("f"), name: "Audited_Financials_2023.xlsx", folder: "02 Financials", size: "3.8 MB", uploadedAt: days(-28), uploadedBy: "Lakeside", version: 2, views: 24 },
          { id: gid("f"), name: "Material_Contracts_Index.xlsx", folder: "03 Contracts", size: "0.6 MB", uploadedAt: days(-20), uploadedBy: "Lakeside", version: 1, views: 8 },
          { id: gid("f"), name: "Employee_Register.pdf", folder: "04 HR", size: "0.4 MB", uploadedAt: days(-14), uploadedBy: "Lakeside", version: 1, views: 5 },
          { id: gid("f"), name: "Regulatory_Correspondence.pdf", folder: "05 Regulatory", size: "2.1 MB", uploadedAt: days(-10), uploadedBy: "Lakeside", version: 1, views: 3 },
        ],
        qa: [
          { id: gid("qa"), question: "Please clarify treatment of legacy pension liabilities.", askedBy: "Deloitte", askedAt: days(-9), status: "Answered", answer: "Fully provisioned as per Note 14. Actuarial report shared.", answeredBy: "N. Uwase" },
          { id: gid("qa"), question: "Confirm status of pending BNR examination.", askedBy: "Deloitte", askedAt: days(-4), status: "Open" },
          { id: gid("qa"), question: "Provide detail on top 5 loan exposures.", askedBy: "Deloitte", askedAt: days(-2), status: "Follow-up" },
        ],
      },
      dd: [
        { id: gid("dd"), workstream: "Legal", item: "Corporate constitutional documents", owner: "J. Mukamana", status: "Complete" },
        { id: gid("dd"), workstream: "Legal", item: "Material contracts review", owner: "J. Mukamana", status: "In Progress" },
        { id: gid("dd"), workstream: "Financial", item: "Historical financial statements", owner: "Deloitte", status: "Complete" },
        { id: gid("dd"), workstream: "Financial", item: "Loan book quality review", owner: "Deloitte", status: "Red Flag", finding: "Concentration risk in top-5 exposures (38%).", materiality: "High" },
        { id: gid("dd"), workstream: "Tax", item: "Tax compliance certificate & disputes", owner: "P. Kagame", status: "In Progress" },
        { id: gid("dd"), workstream: "Commercial", item: "Customer concentration analysis", owner: "N. Uwase", status: "Not Started" },
        { id: gid("dd"), workstream: "Operational", item: "IT systems & core banking review", owner: "N. Uwase", status: "In Progress" },
        { id: gid("dd"), workstream: "ESG", item: "Environmental & social risk screen", owner: "P. Kagame", status: "Not Started" },
      ],
      contract: {
        sections: secs(["cl_2", "cl_5", "cl_6", "cl_1", "cl_7", "cl_8"]),
        variables: {
          TARGET_COMPANY: "Lakeside Bank Ltd.",
          CURRENCY: "USD",
          AMOUNT: "45,000,000",
          LONGSTOP_DATE: dt(120),
          REGULATOR: "National Bank of Rwanda",
        },
      },
      cps: [
        { id: gid("cp"), type: "Precedent", description: "BNR written approval", responsible: "J. Mukamana", deadline: dt(45), status: "Pending", evidence: "BNR letter" },
        { id: gid("cp"), type: "Precedent", description: "Competition Authority clearance", responsible: "J. Mukamana", deadline: dt(50), status: "Pending" },
        { id: gid("cp"), type: "Precedent", description: "Third-party consents (top 5 contracts)", responsible: "N. Uwase", deadline: dt(30), status: "At Risk" },
        { id: gid("cp"), type: "Precedent", description: "Restructuring of holdco", responsible: "Client CFO", deadline: dt(40), status: "Satisfied", evidence: "Board resolution" },
        { id: gid("cp"), type: "Precedent", description: "Escrow account opened", responsible: "P. Kagame", deadline: dt(20), status: "Satisfied" },
        { id: gid("cp"), type: "Precedent", description: "AML/KYC on ultimate beneficial owners", responsible: "N. Uwase", deadline: dt(25), status: "Pending" },
        { id: gid("cp"), type: "Precedent", description: "Discharge of existing security interests", responsible: "J. Mukamana", deadline: dt(55), status: "Not Yet Due" },
        { id: gid("cp"), type: "Subsequent", description: "Registrar filing post-completion", responsible: "CoSec", deadline: dt(75), status: "Not Yet Due" },
        { id: gid("cp"), type: "Subsequent", description: "Warranty period (24 months)", responsible: "Legal", deadline: dt(730), status: "Not Yet Due" },
      ],
      signing: {
        checklist: [
          { id: gid("sk"), item: "Board resolutions of all parties", owner: "CoSec", status: "Pending" },
          { id: gid("sk"), item: "Powers of attorney certified", owner: "CoSec", status: "Pending" },
          { id: gid("sk"), item: "Execution copies collated", owner: "J. Mukamana", status: "Pending" },
          { id: gid("sk"), item: "Signing pack circulated 48h before", owner: "CoSec", status: "Pending" },
          { id: gid("sk"), item: "Notary booked", owner: "CoSec", status: "Pending" },
        ],
        signatories: [
          { id: gid("sg"), name: "Dr. E. Rwigema", party: "Umoja Financial Group", role: "Chair", signed: false },
          { id: gid("sg"), name: "F. Habimana", party: "Umoja Financial Group", role: "CEO", signed: false },
          { id: gid("sg"), name: "M. Nsengimana", party: "Lakeside Bank Ltd.", role: "MD", signed: false },
        ],
        signingDate: dt(70),
        venue: "Kigali Convention Centre",
      },
      postCompletion: [
        { item: "Registrar-General filing", dueDate: dt(75), status: "Pending" },
        { item: "First earn-out measurement", dueDate: dt(365), status: "Pending" },
        { item: "Warranty period ends", dueDate: dt(730), status: "Pending" },
        { item: "Restrictive covenant review", dueDate: dt(180), status: "Pending" },
      ],
      conflictCheck: { cleared: true, note: "No adverse party conflicts identified against client database." },
    },
    {
      id: "dl_2",
      name: "Project Nyungwe — JV Formation",
      client: "GreenGrid Renewables",
      counterparty: "SolarWave EA",
      type: "JV",
      stage: "Negotiation",
      status: "Active",
      leadPartner: "N. Uwase",
      team: ["J. Mukamana"],
      value: 12_000_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-90),
      targetClose: dt(30),
      longstopDate: dt(90),
      createdAt: days(-90),
      updatedAt: now(),
      termSheet: { parties: "GreenGrid; SolarWave", structure: "50/50 JV Company", consideration: "USD 12m equity split", conditions: "Site permits", exclusivity: "60 days", confidentiality: "24 months", timeline: "Signing Q3 2026", updatedAt: now() },
      dataRoom: { parties: [], files: [], qa: [] },
      dd: [],
      contract: { sections: secs(["cl_1", "cl_5", "cl_6", "cl_7", "cl_8"]), variables: { TARGET_COMPANY: "NewCo (JV)", CURRENCY: "USD", AMOUNT: "12,000,000", LONGSTOP_DATE: dt(90) } },
      cps: [
        { id: gid("cp"), type: "Precedent", description: "Environmental permit issued", responsible: "GreenGrid", deadline: dt(30), status: "Pending" },
        { id: gid("cp"), type: "Precedent", description: "Land title consolidation", responsible: "SolarWave", deadline: dt(45), status: "At Risk" },
      ],
      signing: { checklist: [], signatories: [], signingDate: dt(30), venue: "TBD" },
      postCompletion: [],
      conflictCheck: { cleared: true, note: "Clean." },
    },
    {
      id: "dl_3",
      name: "Project Kagera — Capital Raise",
      client: "Kagera AgriTech",
      counterparty: "Series B Investors",
      type: "Capital Raise",
      stage: "Term Sheet",
      status: "Active",
      leadPartner: "P. Kagame",
      team: [],
      value: 8_000_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-14),
      targetClose: dt(90),
      longstopDate: dt(180),
      createdAt: days(-14),
      updatedAt: now(),
      termSheet: { parties: "Kagera AgriTech; New Investors", structure: "Series B preferred", consideration: "USD 8m for 22% fully diluted", conditions: "Board reconstitution", exclusivity: "45 days", confidentiality: "18 months", timeline: "Close Q4 2026", updatedAt: now() },
      dataRoom: { parties: [], files: [], qa: [] },
      dd: [],
      contract: { sections: secs(["cl_2", "cl_1", "cl_7"]), variables: {} },
      cps: [],
      signing: { checklist: [], signatories: [] },
      postCompletion: [],
      conflictCheck: { cleared: true, note: "Clean." },
    },
    {
      id: "dl_4",
      name: "Project Mukura — Disposal",
      client: "Highland Estates",
      counterparty: "Regional Buyer",
      type: "Disposal",
      stage: "Signing",
      status: "Active",
      leadPartner: "J. Mukamana",
      team: [],
      value: 5_500_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-120),
      targetClose: dt(10),
      longstopDate: dt(30),
      createdAt: days(-120),
      updatedAt: now(),
      termSheet: { parties: "Highland Estates; Buyer", structure: "Asset sale", consideration: "USD 5.5m cash", conditions: "Regulatory clearance", exclusivity: "30 days", confidentiality: "12 months", timeline: "Sign 1w", updatedAt: now() },
      dataRoom: { parties: [], files: [], qa: [] },
      dd: [],
      contract: { sections: secs(["cl_2", "cl_5", "cl_7"]), variables: {} },
      cps: [
        { id: gid("cp"), type: "Precedent", description: "Land Board consent", responsible: "J. Mukamana", deadline: dt(7), status: "Satisfied" },
      ],
      signing: {
        checklist: [
          { id: gid("sk"), item: "Board resolutions", owner: "CoSec", status: "Done" },
          { id: gid("sk"), item: "Execution copies", owner: "J. Mukamana", status: "Done" },
        ],
        signatories: [],
        signingDate: dt(10),
        venue: "Head Office",
      },
      postCompletion: [],
      conflictCheck: { cleared: true, note: "Clean." },
    },
    {
      id: "dl_5",
      name: "Project Muhazi — Group Restructure",
      client: "Muhazi Holdings",
      counterparty: "(Internal)",
      type: "Restructure",
      stage: "Completion",
      status: "Active",
      leadPartner: "Dr. E. Rwigema",
      team: [],
      value: 22_000_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-200),
      targetClose: dt(-5),
      longstopDate: dt(20),
      createdAt: days(-200),
      updatedAt: now(),
      termSheet: { parties: "Group entities", structure: "Intra-group transfer", consideration: "N/A", conditions: "Tax ruling", exclusivity: "—", confidentiality: "—", timeline: "Complete", updatedAt: now() },
      dataRoom: { parties: [], files: [], qa: [] },
      dd: [],
      contract: { sections: [], variables: {} },
      cps: [
        { id: gid("cp"), type: "Precedent", description: "RRA tax ruling", responsible: "P. Kagame", deadline: dt(-10), status: "Satisfied" },
        { id: gid("cp"), type: "Subsequent", description: "Registrar filings", responsible: "CoSec", deadline: dt(15), status: "Pending" },
      ],
      signing: { checklist: [], signatories: [] },
      postCompletion: [{ item: "Filing of amended articles", dueDate: dt(20), status: "Pending" }],
      conflictCheck: { cleared: true, note: "Internal." },
    },
    {
      id: "dl_6",
      name: "Project Rubavu — Spin-off (Lost)",
      client: "Coastal Holdings",
      counterparty: "N/A",
      type: "Spin-off",
      stage: "Origination",
      status: "Lost",
      leadPartner: "N. Uwase",
      team: [],
      value: 3_000_000,
      currency: "USD",
      jurisdiction: "Rwanda",
      startDate: dt(-60),
      targetClose: dt(0),
      longstopDate: dt(0),
      createdAt: days(-60),
      updatedAt: now(),
      termSheet: { parties: "", structure: "", consideration: "", conditions: "", exclusivity: "", confidentiality: "", timeline: "", updatedAt: now() },
      dataRoom: { parties: [], files: [], qa: [] },
      dd: [],
      contract: { sections: [], variables: {} },
      cps: [],
      signing: { checklist: [], signatories: [] },
      postCompletion: [],
      conflictCheck: { cleared: false, note: "Existing client conflict — declined." },
    },
  ];
}

function seed(): DealsState {
  const clauses = seedClauses();
  return {
    clauses,
    precedents: seedPrecedents(clauses),
    legal: seedLegal(),
    deals: seedDeals(clauses),
  };
}

function read(): DealsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(next: DealsState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useDeals() {
  const [state, setState] = useState<DealsState>(() => read());
  useEffect(() => {
    const h = () => setState(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return state;
}

export function mutateDeals(fn: (s: DealsState) => DealsState) {
  write(fn(read()));
}

export function updateDeal(id: string, patch: Partial<Deal> | ((d: Deal) => Deal)) {
  mutateDeals((s) => ({
    ...s,
    deals: s.deals.map((d) => {
      if (d.id !== id) return d;
      const next = typeof patch === "function" ? patch(d) : { ...d, ...patch };
      return { ...next, updatedAt: now() };
    }),
  }));
}

export function stageColor(stage: DealStage): string {
  const map: Record<DealStage, string> = {
    Origination: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    "Term Sheet": "bg-sky-500/15 text-sky-700 border-sky-500/30",
    "Due Diligence": "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
    Negotiation: "bg-violet-500/15 text-violet-700 border-violet-500/30",
    Signing: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    "CPs Tracking": "bg-orange-500/15 text-orange-700 border-orange-500/30",
    Completion: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    "Post-Completion": "bg-teal-500/15 text-teal-700 border-teal-500/30",
  };
  return map[stage];
}

export function ddProgress(d: Deal): number {
  if (d.dd.length === 0) return 0;
  const done = d.dd.filter((x) => x.status === "Complete").length;
  return Math.round((done / d.dd.length) * 100);
}

export function cpsProgress(d: Deal): { done: number; total: number } {
  const preced = d.cps.filter((c) => c.type === "Precedent");
  return { done: preced.filter((c) => c.status === "Satisfied").length, total: preced.length };
}

export function formatMoney(v: number, ccy = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(v);
}
