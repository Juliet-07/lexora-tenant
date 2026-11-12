import { api } from "../api";
import type {
  ContractClause,
  ContractVariation,
  VariationInput,
  VariationStatus,
  VariationType,
} from "../crm/tools-api";

// Deal/data-room files carry a relative /uploads/... fileUrl, same as
// every other module — resolve it against the API's own origin before
// using it in an href/src, same pattern as resolveGrcFileUrl etc.
const DEALS_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveDealFileUrl = (
  url: string | null | undefined,
): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${new URL(DEALS_API_BASE).origin}${url}`;
};

export type DealType =
  | "M&A"
  | "JV"
  | "Restructure"
  | "Capital Raise"
  | "Disposal"
  | "Spin-off";

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
  partyIndex?: number;
  partyEmail?: string;
  partyName?: string;
  sentAt: string;
}

export interface ReviewLoopResponse {
  name?: string;
  partyEmail?: string;
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
  contractName?: string;
  pdfUrl: string | null;
  prefillName: string;
  alreadyResponded: boolean;
  previousDecision: string | null;
  sections?: ContractReviewSection[];
  /** A term sheet is reviewed with different wording from a contract. */
  kind?: DealDocKind;
  /** The document as the tenant sees it — cover, contents and body. */
  preview?: DealDocumentPreviewData;
}

/** A document as a reader sees it (review and signing pages). */
export interface DealDocumentPreviewData {
  name: string;
  cover: string;
  toc: {
    enabled: boolean;
    title: string;
    entries: { title: string; level: number; page?: number }[];
  };
  sections: { title: string; html: string }[];
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
/** One line of a contract's table of contents. */
export interface ContractTocEntry {
  level: number;
  title: string;
}
export interface ContractSection {
  /** Heading depth (1–3) in the template — indents the contents page. */
  level?: number;
  title: string;
  /** The stored text — merge fields are still {{token}} here. */
  body: string;
  /** The text with merge fields resolved (what readers and the PDF see). */
  renderedBody?: string;
  comments: ContractComment[];
  /** Resolved body split into paragraphs — what a redline anchors to. */
  lines?: string[];
  redlines?: Redline[];
  /** The stored text split into lines ({{fields}} unresolved) — what a tracked change anchors to. */
  rawLines?: string[];
  /** The lines before any proposed change was accepted. */
  originalLines?: string[];
  /** Variation that added this section (an executed addendum), if any. */
  variationRef?: string | null;
  changes?: TrackedChange[];
}

/** A proposed edit to one line, made by one side in a negotiation round. */
export interface TrackedChange {
  id: string;
  lineIndex: number;
  before: string;
  after: string;
  /** Only what differs: text removed, where it started in `before`, text added. */
  del: string;
  ins: string;
  offset: number;
  addedLines: string[];
  kind: "replace" | "add";
  party: DealPartySide;
  round: number;
  status: "pending" | "accepted";
  authorName: string;
  createdAt: string;
  decidedBy?: string;
  decidedAt?: string | null;
}

/** One merge field a contract's text uses, with its current value. */
export interface ContractField {
  token: string;
  label: string;
  group: string;
  /** One of the fields every module shares (title, Party A/B, dates…). */
  common: boolean;
  input: "text" | "textarea" | "date" | "currency" | "number" | string;
  /** Plain text; a list is one item per line. */
  value: string;
  filled: boolean;
  editable: boolean;
  /** A custom token that isn't in the field registry. */
  unknown: boolean;
}
export type ReviewToken = ReviewLoopToken;
export type ReviewResponse = ReviewLoopResponse;

/** Everything in a deal's documents is a contract or a term sheet. */
export type DealDocKind = "contract" | "term_sheet";

export interface DealDocReview {
  /** draft → in_review → changes_requested / approved */
  status: "draft" | "in_review" | "changes_requested" | "approved";
  sent: number;
  approved: number;
  changesRequested: number;
  lastSentAt: string | null;
  approvedAt: string | null;
}

export interface Contract {
  _id: string;
  /** Absent on documents created before term sheets existed (= contract). */
  kind?: DealDocKind;
  /** Where the document stands with the parties it was sent to. */
  review?: DealDocReview;
  name: string;
  /** The template this contract was generated from (none on older ones). */
  templateId?: string | null;
  templateName?: string;
  reference?: string;
  sections: ContractSection[];
  /** The cover page, merge fields filled in (empty = no cover page). */
  cover?: string;
  /** The contents page, built from the sections as they now stand. */
  toc?: { enabled: boolean; title: string; entries: ContractTocEntry[] };
  /** Merge fields the text uses, with their values — see ContractField. */
  fields?: ContractField[];
  variables: Record<string, string>;
  reviewLoop: ReviewLoop;
  pdfUrl: string | null;
  createdAt: string;
  /** True once every signatory has signed (or the deal is past Signing). */
  executed?: boolean;
  /** Amendments, addenda, side letters, waivers and extensions. */
  variations?: ContractVariation[];
  /** Negotiation: the current round, and the side holding the pen. */
  round?: number;
  penParty?: DealPartySide;
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
  title?: string;
  email?: string;
  signed: boolean;
  signedAt: string | null;
  status?: "pending" | "sent" | "signed";
  sentAt?: string | null;
  lastRemindedAt?: string | null;
  viewedAt?: string | null;
  signatureMethod?: "typed" | "drawn" | null;
  signatureData?: string | null;
  ip?: string | null;
  device?: string | null;
}
export interface SigningAuditEntry {
  at: string;
  type: string;
  text: string;
  ip: string | null;
}
export interface SigningDocument {
  contractId: string;
  name: string;
  reference: string;
  hash: string;
  sentAt: string | null;
  sentBy: string;
  completedAt: string | null;
  signedPdfUrl: string | null;
  archivedToDataRoom: boolean;
}
export interface PostCompletionItem {
  item: string;
  dueDate: string;
  status: ChecklistStatus;
}

export type DealPartySide = "Party A" | "Party B";

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
  /** The person who signs for this side. One per side. */
  authorizedSignatory?: boolean;
  permissions: DealPartyPermissions;
}

export interface Deal {
  _id: string;
  name: string;
  client: string;
  clientId: string | null;
  parties: DealParty[];
  counterparty: string;
  type: DealType;
  stage: DealStage;
  status: DealStatus;
  leadPartner: string;
  team: string[];
  value: number;
  currency: string;
  feeRate: number | null;
  feeRecovered: number;
  jurisdiction: string;
  startDate: string;
  targetClose: string;
  longstopDate: string;
  termSheet: TermSheet;
  dataRoom: { files: DataRoomFile[]; folders: { name: string }[] };
  dd: DDItem[];
  contract: { sections: ContractSection[]; variables: Record<string, string> };
  /** Multi-contract deals; the singular `contract` remains the primary one. */
  contracts?: Contract[];
  cps: CP[];
  signing: {
    checklist: SigningItem[];
    signatories: Signatory[];
    signingDate: string | null;
    venue: string;
    document?: SigningDocument | null;
    audit?: SigningAuditEntry[];
  };
  postCompletion: PostCompletionItem[];
  offerReviewLoop?: ReviewLoop;
  contractReviewLoop?: ReviewLoop;
  conflictCheck: { cleared: boolean; note: string };
  ddProgress: number;
  cpsProgress: { done: number; total: number };
  createdAt: string;
}

export const addParty = async (
  dealId: string,
  dto: {
    side: DealPartySide;
    title: string;
    name: string;
    email: string;
    phone?: string;
    authorizedSignatory?: boolean;
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
    authorizedSignatory: boolean;
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
  clientId: string;
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

// export const downloadContractPdf = (dealId: string): void => {
//   const token = localStorage.getItem("tenantToken");
//   const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
//     /\/api\/?$/,
//     "",
//   );
//   fetch(`${base}/api/deals/${dealId}/contract/pdf`, {
//     headers: { Authorization: `Bearer ${token}` },
//   })
//     .then((r) => r.blob())
//     .then((blob) => {
//       const a = document.createElement("a");
//       a.href = URL.createObjectURL(blob);
//       a.download = "Contract.pdf";
//       a.click();
//       URL.revokeObjectURL(a.href);
//     });
// };

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
export const sendForSigning = async (
  id: string,
  dto: { contractId: string; message?: string },
): Promise<{ sent: number; failed: string[] }> => {
  const res = await api.post(`/deals/${id}/signing/send`, dto);
  return res.data?.data ?? res.data;
};
export const remindSignatories = async (
  id: string,
  index?: number,
): Promise<{ reminded: number; failed: string[] }> => {
  const res = await api.post(`/deals/${id}/signing/remind`, { index });
  return res.data?.data ?? res.data;
};
export const resetSigning = async (id: string): Promise<{ ok: boolean }> => {
  const res = await api.post(`/deals/${id}/signing/reset`, {});
  return res.data?.data ?? res.data;
};
export const sendExecutedCopies = async (
  id: string,
  dto: { message?: string; includeCertificate?: boolean } = {},
): Promise<{ sent: number; failed: string[] }> => {
  const res = await api.post(`/deals/${id}/signing/executed-copies`, dto);
  return res.data?.data ?? res.data;
};
export const advanceFromSigning = async (
  id: string,
): Promise<{ ok: boolean; stage: string }> => {
  const res = await api.post(`/deals/${id}/signing/advance`, {});
  return res.data?.data ?? res.data;
};
/** The signed PDF / certificate need the login, so they are fetched as blobs. */
export const downloadSigningFile = async (
  id: string,
  kind: "signed" | "certificate",
): Promise<Blob> => {
  const res = await api.get(
    `/deals/${id}/signing/${kind === "signed" ? "signed.pdf" : "certificate.pdf"}`,
    { responseType: "blob" },
  );
  return res.data;
};

// ── Signing by link (no login) ──
export interface SigningPageData {
  businessName: string;
  dealName: string;
  documentName: string;
  state: "ready" | "signed" | "changed";
  signatory: { name: string; email: string; title: string; side: string };
  signedAt: string | null;
  signatureMethod: "typed" | "drawn" | null;
  signatureData: string | null;
  completed: boolean;
  others: { name: string; side: string; signed: boolean }[];
  preview: DealDocumentPreviewData;
}
export const fetchSigningPage = async (
  token: string,
): Promise<SigningPageData> => {
  const res = await api.get(`/deals/sign/${token}`);
  return res.data?.data ?? res.data;
};
export const submitSignature = async (
  token: string,
  dto: {
    name: string;
    method: "typed" | "drawn";
    signatureData?: string;
    consent: boolean;
  },
): Promise<{ success: boolean; completed: boolean }> => {
  const res = await api.post(`/deals/sign/${token}`, dto);
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

export const renameContract = async (
  dealId: string,
  contractId: string,
  name: string,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${dealId}/contracts/${contractId}`, {
    name,
  });
  return res.data?.data ?? res.data;
};
export const deleteContract = async (
  dealId: string,
  contractId: string,
): Promise<Deal> => {
  const res = await api.delete(`/deals/${dealId}/contracts/${contractId}`);
  return res.data?.data ?? res.data;
};
export const removeContractSection = async (
  dealId: string,
  contractId: string,
  index: number,
): Promise<Deal> => {
  const res = await api.delete(
    `/deals/${dealId}/contracts/${contractId}/sections/${index}`,
  );
  return res.data?.data ?? res.data;
};
export const updateContractSectionBody = async (
  dealId: string,
  contractId: string,
  index: number,
  body: string,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${dealId}/contracts/${contractId}/sections/${index}`,
    { body },
  );
  return res.data?.data ?? res.data;
};
export const addContractComment = async (
  dealId: string,
  contractId: string,
  index: number,
  author: string,
  text: string,
): Promise<Deal> => {
  const res = await api.post(
    `/deals/${dealId}/contracts/${contractId}/sections/${index}/comments`,
    { author, text },
  );
  return res.data?.data ?? res.data;
};
export const toggleContractComment = async (
  dealId: string,
  contractId: string,
  sectionIndex: number,
  commentIndex: number,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${dealId}/contracts/${contractId}/sections/${sectionIndex}/comments/${commentIndex}/toggle`,
    {},
  );
  return res.data?.data ?? res.data;
};
export const setContractVariable = async (
  dealId: string,
  contractId: string,
  key: string,
  value: string,
): Promise<Deal> => {
  const res = await api.patch(
    `/deals/${dealId}/contracts/${contractId}/variables`,
    { key, value },
  );
  return res.data?.data ?? res.data;
};
export const downloadContractPdf = (
  dealId: string,
  contractId: string,
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  fetch(`${base}/api/deals/${dealId}/contracts/${contractId}/pdf`, {
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
export const sendContractForReview = async (
  dealId: string,
  contractId: string,
): Promise<{ sent: string[] }> => {
  const res = await api.post(
    `/deals/${dealId}/contracts/${contractId}/review/send`,
    {},
  );
  return res.data?.data ?? res.data;
};
export const sendOfferForReview = async (
  dealId: string,
): Promise<{ sent: string[] }> => {
  const res = await api.post(`/deals/${dealId}/review/offer/send`, {});
  return res.data?.data ?? res.data;
};

export interface OfferReviewSnapshot {
  dealName: string;
  termSheet: TermSheet;
  prefillName: string;
  alreadyResponded: boolean;
  previousDecision: string | null;
}
export const fetchOfferReviewSnapshot = async (
  token: string,
): Promise<OfferReviewSnapshot> => {
  const res = await api.get(`/deals/review/offer/${token}`);
  return res.data?.data ?? res.data;
};
export const submitOfferReview = async (
  token: string,
  dto: {
    name: string;
    decision: "Approved" | "Changes Requested";
    comment?: string;
  },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/deals/review/offer/${token}`, dto);
  return res.data?.data ?? res.data;
};
export const fetchContractReviewSnapshot = async (
  token: string,
): Promise<ContractReviewSnapshot> => {
  const res = await api.get(`/deals/review/contract/${token}`);
  return res.data?.data ?? res.data;
};
export const submitContractReview = async (
  token: string,
  dto: {
    name: string;
    decision: "Approved" | "Changes Requested";
    comment?: string;
  },
): Promise<{ success: boolean }> => {
  const res = await api.post(`/deals/review/contract/${token}`, dto);
  return res.data?.data ?? res.data;
};
export const fetchContractPdfBlob = async (
  dealId: string,
  contractId: string,
): Promise<Blob> => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  const res = await fetch(
    `${base}/api/deals/${dealId}/contracts/${contractId}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error("Failed to load preview");
  return res.blob();
};

export interface Redline {
  lineIndex: number;
  quotedText: string;
  comment: string;
  authorName: string;
  authorEmail: string;
  source: "internal" | "external";
  createdAt: string;
}

// Add `lines: string[]` and `redlines: Redline[]` to the ContractSection interface.

export const addRedline = async (
  dealId: string,
  contractId: string,
  sectionIndex: number,
  lineIndex: number,
  comment: string,
): Promise<Deal> => {
  const res = await api.post(
    `/deals/${dealId}/contracts/${contractId}/sections/${sectionIndex}/redlines`,
    { lineIndex, comment },
  );
  return res.data?.data ?? res.data;
};
export const addExternalRedline = async (
  token: string,
  sectionIndex: number,
  lineIndex: number,
  comment: string,
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/deals/review/contract/${token}/sections/${sectionIndex}/redlines`,
    { lineIndex, comment },
  );
  return res.data?.data ?? res.data;
};
export const downloadRedlinedContractPdf = (
  dealId: string,
  contractId: string,
): void => {
  const token = localStorage.getItem("tenantToken");
  const base = (import.meta.env.VITE_REACT_APP_BASE_URL ?? "").replace(
    /\/api\/?$/,
    "",
  );
  fetch(`${base}/api/deals/${dealId}/contracts/${contractId}/pdf/redlined`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Contract - Redlined.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    });
};

export interface ContractReviewSection {
  index: number;
  title: string;
  lines: string[];
  redlines: Redline[];
}
// Add `sections: ContractReviewSection[]` to ContractReviewSnapshot.

export const updateCommercialTerms = async (
  dealId: string,
  dto: Partial<{ feeRate: number; feeRecovered: number }>,
): Promise<Deal> => {
  const res = await api.patch(`/deals/${dealId}/commercial-terms`, dto);
  return res.data?.data ?? res.data;
};

// ── Negotiation: tracked changes, accept / reject, rounds ───────────

const body = <T>(res: any): T => res.data?.data ?? res.data;

export const proposeChange = async (
  dealId: string,
  contractId: string,
  sectionIndex: number,
  dto: { lineIndex: number; text: string; party?: DealPartySide },
) =>
  body<{ ok: boolean }>(
    await api.post(
      `/deals/${dealId}/contracts/${contractId}/sections/${sectionIndex}/changes`,
      dto,
    ),
  );
export const decideChange = async (
  dealId: string,
  contractId: string,
  sectionIndex: number,
  changeId: string,
  decision: "accept" | "reject",
) =>
  body<{ ok: boolean }>(
    await api.post(
      `/deals/${dealId}/contracts/${contractId}/sections/${sectionIndex}/changes/${changeId}/${decision}`,
    ),
  );
export const decideAllChanges = async (
  dealId: string,
  contractId: string,
  decision: "accept" | "reject",
) =>
  body<{ ok: boolean; count: number }>(
    await api.post(
      `/deals/${dealId}/contracts/${contractId}/changes/${decision}`,
    ),
  );
export const advanceRound = async (dealId: string, contractId: string) =>
  body<{ round: number; penParty: DealPartySide }>(
    await api.post(`/deals/${dealId}/contracts/${contractId}/rounds/advance`),
  );

// ── Variations on an executed contract ──────────────────────────────

const vBase = (dealId: string, contractId: string) =>
  `/deals/${dealId}/contracts/${contractId}`;

export const dealVariationApi = (dealId: string, contractId: string) => ({
  clauses: async () =>
    body<{ clauses: ContractClause[]; canVary: boolean }>(
      await api.get(`${vBase(dealId, contractId)}/clauses`),
    ),
  create: async (
    dto: VariationInput & { type: VariationType; submit?: boolean },
  ) =>
    body<ContractVariation>(
      await api.post(`${vBase(dealId, contractId)}/variations`, dto),
    ),
  update: async (ref: string, dto: Partial<VariationInput>) =>
    body<ContractVariation>(
      await api.patch(`${vBase(dealId, contractId)}/variations/${ref}`, dto),
    ),
  advance: async (ref: string, to: VariationStatus) =>
    body<ContractVariation>(
      await api.post(`${vBase(dealId, contractId)}/variations/${ref}/advance`, {
        to,
      }),
    ),
  remove: async (ref: string) =>
    body<unknown>(
      await api.delete(`${vBase(dealId, contractId)}/variations/${ref}`),
    ),
  document: async (mode: "current" | "original" | "redline") =>
    body<{ mode: string; html: string; executedCount: number }>(
      await api.get(`${vBase(dealId, contractId)}/variations/document`, {
        params: { mode },
      }),
    ),
});
