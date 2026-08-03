import { api } from "../api";

export type ClauseCategory =
  | "Confidentiality"
  | "Consideration"
  | "Conditions Precedent"
  | "Warranties"
  | "Indemnities"
  | "Boilerplate"
  | "Dispute Resolution"
  | "Governance";

export const CLAUSE_CATEGORIES: ClauseCategory[] = [
  "Confidentiality",
  "Consideration",
  "Conditions Precedent",
  "Warranties",
  "Indemnities",
  "Boilerplate",
  "Dispute Resolution",
  "Governance",
];

export interface Clause {
  _id: string;
  title: string;
  category: ClauseCategory;
  jurisdiction: string;
  body: string;
  approved: boolean;
  version: number;
}

export type DealType =
  | "M&A"
  | "JV"
  | "Restructure"
  | "Capital Raise"
  | "Disposal"
  | "Spin-off";

export interface PrecedentSection {
  clauseId: string | null;
  title: string;
  body: string;
}

export interface Precedent {
  _id: string;
  name: string;
  type: DealType;
  jurisdiction: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  content: string;
}

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

export type DealStatus = "Active" | "Completed" | "Lost" | "On Hold";
export type DDWorkstream =
  | "Legal"
  | "Financial"
  | "Tax"
  | "Commercial"
  | "Operational"
  | "ESG";
export type DDStatus = "Not Started" | "In Progress" | "Complete" | "Red Flag";
export type Materiality = "Low" | "Medium" | "High";
export type CPKind = "Precedent" | "Subsequent";
export type CPStatus = "Satisfied" | "Pending" | "At Risk" | "Not Yet Due";
export type ChecklistStatus = "Pending" | "Done";

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

export function formatMoney(v: number, ccy = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 0,
  }).format(v);
}

export interface ReviewLoopToken {
  token: string;
  partyIndex: number;
  sentAt: string;
}

export interface ReviewLoopResponse {
  name: string;
  partyName?: string;
  decision: "Approved" | "Changes Requested";
  comment?: string;
  respondedAt: string;
}

export interface ReviewLoop {
  tokens: ReviewLoopToken[];
  responses: ReviewLoopResponse[];
}

export interface TermSheet {
  parties?: string;
  structure: string;
  consideration: string;
  conditions: string;
  exclusivity: string;
  confidentiality: string;
  timeline: string;
  updatedAt: string;
}

export interface ContractReviewSnapshot {
  dealName: string;
  pdfUrl: string | null;
  prefillName: string;
  alreadyResponded: boolean;
  previousDecision: string | null;
}

export interface DataRoomFile {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
  size: number;
  folder: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  views: number;
}
export interface DDItem {
  workstream: DDWorkstream;
  item: string;
  owner: string;
  status: DDStatus;
  finding: string;
  materiality: Materiality | null;
}
export interface ContractComment {
  author: string;
  text: string;
  resolved: boolean;
  createdAt: string;
}
export interface ContractSection {
  clauseId: string | null;
  title: string;
  body: string;
  comments: ContractComment[];
}
export interface CP {
  type: CPKind;
  description: string;
  responsible: string;
  deadline: string;
  evidence: string;
  status: CPStatus;
}
export interface SigningItem {
  item: string;
  owner: string;
  status: ChecklistStatus;
}
export interface Signatory {
  name: string;
  party: string;
  role: string;
  signed: boolean;
  signedAt: string | null;
}
export interface PostCompletionItem {
  item: string;
  dueDate: string;
  status: ChecklistStatus;
}

export type DealPartySide = "Buyer" | "Seller";

export interface DealPartyPermissions {
  dataRoom: boolean;
  contractReview: boolean;
  offerReview: boolean;
}

export interface DealParty {
  side: DealPartySide;
  title: string;
  name: string;
  email: string;
  phone: string;
  permissions: DealPartyPermissions;
}

export interface Deal {
  _id: string;
  name: string;
  client: string;
  parties: DealParty[];
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
  termSheet: TermSheet;
  dataRoom: { files: DataRoomFile[]; folders: { name: string }[] };
  dd: DDItem[];
  contract: { sections: ContractSection[]; variables: Record<string, string> };
  cps: CP[];
  signing: {
    checklist: SigningItem[];
    signatories: Signatory[];
    signingDate: string | null;
    venue: string;
  };
  postCompletion: PostCompletionItem[];
  offerReviewLoop?: ReviewLoop;
  contractReviewLoop?: ReviewLoop;
  conflictCheck: { cleared: boolean; note: string };
  ddProgress: number;
  cpsProgress: { done: number; total: number };
  createdAt: string;
}

export const fetchClauses = async (): Promise<Clause[]> => {
  const res = await api.get("/deals/clauses");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const createClause = async (dto: {
  title: string;
  category: ClauseCategory;
  jurisdiction?: string;
  body: string;
}): Promise<Clause> => {
  const res = await api.post("/deals/clauses", dto);
  return res.data?.data ?? res.data;
};

export const addParty = async (
  dealId: string,
  dto: {
    side: DealPartySide;
    title: string;
    name: string;
    email: string;
    phone?: string;
    permissions?: Partial<DealPartyPermissions>;
  },
): Promise<Deal> => {
  const res = await api.post(`/deals/${dealId}/parties`, dto);
  return res.data?.data ?? res.data;
};

export const updateParty = async (
  dealId: string,
  index: number,
  dto: Partial<{
    side: DealPartySide;
    title: string;
    name: string;
    email: string;
    phone: string;
    permissions: Partial<DealPartyPermissions>;
  }>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${dealId}/parties/${index}`, dto);
  return res.data?.data ?? res.data;
};

export const removeParty = async (
  dealId: string,
  index: number,
): Promise<Deal> => {
  const res = await api.delete(`/deals/${dealId}/parties/${index}`);
  return res.data?.data ?? res.data;
};

export const updateClause = async (
  id: string,
  dto: Partial<{
    title: string;
    category: ClauseCategory;
    jurisdiction: string;
    body: string;
  }>,
): Promise<Clause> => {
  const res = await api.patch(`/deals/clauses/${id}`, dto);
  return res.data?.data ?? res.data;
};

export const toggleClauseApproved = async (id: string): Promise<Clause> => {
  const res = await api.patch(`/deals/clauses/${id}/toggle-approved`, {});
  return res.data?.data ?? res.data;
};

export const newClauseVersion = async (id: string): Promise<Clause> => {
  const res = await api.post(`/deals/clauses/${id}/new-version`, {});
  return res.data?.data ?? res.data;
};

export const deleteClause = async (id: string): Promise<void> => {
  await api.delete(`/deals/clauses/${id}`);
};

export const fetchPrecedents = async (): Promise<Precedent[]> => {
  const res = await api.get("/deals/precedents");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchPrecedent = async (id: string): Promise<Precedent> => {
  const res = await api.get(`/deals/precedents/${id}`);
  return res.data?.data ?? res.data;
};

export const createPrecedent = async (dto: {
  name: string;
  type: DealType;
  jurisdiction?: string;
  file: File;
}): Promise<Precedent> => {
  const form = new FormData();
  form.append("name", dto.name);
  form.append("type", dto.type);
  if (dto.jurisdiction) form.append("jurisdiction", dto.jurisdiction);
  form.append("file", dto.file);
  const res = await api.post("/deals/precedents", form);
  return res.data?.data ?? res.data;
};

export const updatePrecedentContent = async (
  id: string,
  content: string,
): Promise<Precedent> => {
  const res = await api.patch(`/deals/precedents/${id}/content`, { content });
  return res.data?.data ?? res.data;
};

export const replacePrecedentDocument = async (
  id: string,
  file: File,
): Promise<Precedent> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/deals/precedents/${id}/replace-document`, form);
  return res.data?.data ?? res.data;
};

export const deletePrecedent = async (id: string): Promise<void> => {
  await api.delete(`/deals/precedents/${id}`);
};

export const fetchDeals = async (): Promise<Deal[]> => {
  const res = await api.get("/deals");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
export const fetchDeal = async (id: string): Promise<Deal> => {
  const res = await api.get(`/deals/${id}`);
  return res.data?.data ?? res.data;
};
export const createDeal = async (dto: {
  name: string;
  client: string;
  counterparty?: string;
  type: DealType;
  leadPartner?: string;
  value: number;
  currency?: string;
  targetClose?: string;
  longstopDate?: string;
}): Promise<Deal> => {
  const res = await api.post("/deals", dto);
  return res.data?.data ?? res.data;
};
export const setDealStage = async (
  id: string,
  stage: DealStage,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/stage`, { stage });
  return res.data?.data ?? res.data;
};
export const setDealStatus = async (
  id: string,
  status: DealStatus,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/status`, { status });
  return res.data?.data ?? res.data;
};
export const updateTermSheet = async (
  id: string,
  dto: Partial<Omit<TermSheet, "updatedAt">>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/term-sheet`, dto);
  return res.data?.data ?? res.data;
};

export const downloadContractPdf = (dealId: string): void => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  fetch(`${base}/api/deals/${dealId}/contract/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Contract.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

export const addDataRoomFile = async (
  id: string,
  file: File,
  folder: string,
): Promise<Deal> => {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await api.post(`/deals/${id}/data-room/files`, form);
  return res.data?.data ?? res.data;
};

export const addDataRoomFolder = async (
  id: string,
  name: string,
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/data-room/folders`, { name });
  return res.data?.data ?? res.data;
};

export const removeDataRoomFolder = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.delete(`/deals/${id}/data-room/folders/${index}`);
  return res.data?.data ?? res.data;
};

export const removeDataRoomFile = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.delete(`/deals/${id}/data-room/files/${index}`);
  return res.data?.data ?? res.data;
};

export const addDDItem = async (
  id: string,
  dto: { workstream: DDWorkstream; item: string; owner?: string },
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/dd`, dto);
  return res.data?.data ?? res.data;
};
export const updateDDItem = async (
  id: string,
  index: number,
  dto: Partial<{ status: DDStatus; finding: string; materiality: Materiality }>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/dd/${index}`, dto);
  return res.data?.data ?? res.data;
};
export const addContractSection = async (
  id: string,
  clauseId: string,
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/contract/sections`, { clauseId });
  return res.data?.data ?? res.data;
};
export const removeContractSection = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.delete(`/deals/${id}/contract/sections/${index}`);
  return res.data?.data ?? res.data;
};
export const updateContractSectionBody = async (
  id: string,
  index: number,
  body: string,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/contract/sections/${index}`, {
    body,
  });
  return res.data?.data ?? res.data;
};
export const addContractComment = async (
  id: string,
  index: number,
  author: string,
  text: string,
): Promise<Deal> => {
  const res = await api.post(
    `/deals/${id}/contract/sections/${index}/comments`,
    { author, text },
  );
  return res.data?.data ?? res.data;
};
export const toggleContractComment = async (
  id: string,
  sectionIndex: number,
  commentIndex: number,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${id}/contract/sections/${sectionIndex}/comments/${commentIndex}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};
export const setContractVariable = async (
  id: string,
  key: string,
  value: string,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/contract/variables`, {
    key,
    value,
  });
  return res.data?.data ?? res.data;
};
export const addCP = async (
  id: string,
  dto: {
    type: CPKind;
    description: string;
    responsible?: string;
    deadline: string;
  },
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/cps`, dto);
  return res.data?.data ?? res.data;
};
export const updateCP = async (
  id: string,
  index: number,
  dto: Partial<{ status: CPStatus; evidence: string }>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/cps/${index}`, dto);
  return res.data?.data ?? res.data;
};
export const addSigningChecklistItem = async (
  id: string,
  item: string,
  owner?: string,
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/signing/checklist`, { item, owner });
  return res.data?.data ?? res.data;
};
export const toggleSigningChecklistItem = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${id}/signing/checklist/${index}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};
export const addSignatory = async (
  id: string,
  name: string,
  party: string,
  role?: string,
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/signing/signatories`, {
    name,
    party,
    role,
  });
  return res.data?.data ?? res.data;
};
export const markSignatorySigned = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${id}/signing/signatories/${index}/sign`,
    {},
  );
  return res.data?.data ?? res.data;
};
export const updateSigningDetails = async (
  id: string,
  dto: Partial<{ signingDate: string; venue: string }>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${id}/signing/details`, dto);
  return res.data?.data ?? res.data;
};
export const addPostCompletion = async (
  id: string,
  item: string,
  dueDate: string,
): Promise<Deal> => {
  const res = await api.post(`/deals/${id}/post-completion`, { item, dueDate });
  return res.data?.data ?? res.data;
};
export const togglePostCompletion = async (
  id: string,
  index: number,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${id}/post-completion/${index}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const sendDataRoomEmail = async (
  dealId: string,
  partyIndex: number,
): Promise<{ success: boolean; sentTo: string }> => {
  const res = await api.post(
    `/deals/${dealId}/data-room/send/${partyIndex}`,
    {},
  );
  return res.data?.data ?? res.data;
};

export const sendForReview = async (
  dealId: string,
  kind: "contract" | "offer",
): Promise<{ sent: string[] }> => {
  const res = await api.post(`/deals/${dealId}/review/${kind}/send`, {});
  return res.data?.data ?? res.data;
};

export interface OfferReviewSnapshot {
  dealName: string;
  termSheet: TermSheet;
  prefillName: string;
  alreadyResponded: boolean;
  previousDecision: string | null;
}

export const fetchReviewSnapshot = async (
  kind: "contract" | "offer",
  token: string,
): Promise<ContractReviewSnapshot | OfferReviewSnapshot> => {
  const res = await api.get(`/deals/review/${kind}/${token}`);
  return res.data?.data ?? res.data;
};

export const submitReview = async (
  kind: "contract" | "offer",
  token: string,
  dto: {
    name: string;
    decision: "Approved" | "Changes Requested";
    comment?: string;
  },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/deals/review/${kind}/${token}`, dto);
  return res.data?.data ?? res.data;
};
