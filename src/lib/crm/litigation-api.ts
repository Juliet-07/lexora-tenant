import { api } from "../api";
import type { DisbursementCategory, AdrDisbursement } from "./adr-api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type LitigationStage =
  | "Filing"
  | "Service"
  | "Pleadings"
  | "Discovery"
  | "Pre-trial"
  | "Trial"
  | "Judgment"
  | "Enforce";
export const LITIGATION_STAGES: LitigationStage[] = [
  "Filing",
  "Service",
  "Pleadings",
  "Discovery",
  "Pre-trial",
  "Trial",
  "Judgment",
  "Enforce",
];

// Real sub-tasks per stage — static reference matching the product
// owner's spec exactly.
export const LITIGATION_STAGE_TASKS: Record<LitigationStage, string> = {
  Filing: "Draft claim, file at court, pay fees, obtain case number",
  Service: "Serve summons, proof of service, response deadline",
  Pleadings: "Claim, defence, counterclaim, reply, joinder, amendments",
  Discovery: "Document requests, production, interrogatories, inspections",
  "Pre-trial": "Conference, agreed facts, issues, witness lists, scheduling",
  Trial: "Opening, evidence, cross-exam, submissions, closing",
  Judgment: "Decision, costs order, interest, appeal window",
  Enforce: "Execution, garnishment, attachment, appeal",
};

export type LitigationCaseStatus =
  | "Active"
  | "Judgment issued"
  | "Settled"
  | "Withdrawn"
  | "Enforced";

export type LitigationPartyRole =
  | "Plaintiff"
  | "Defendant"
  | "Judge"
  | "Plaintiff counsel"
  | "Defendant counsel"
  | "Other";
export const LITIGATION_PARTY_ROLES: LitigationPartyRole[] = [
  "Plaintiff",
  "Defendant",
  "Judge",
  "Plaintiff counsel",
  "Defendant counsel",
  "Other",
];

export type PleadingType =
  | "Statement of claim"
  | "Statement of defence"
  | "Counterclaim"
  | "Reply"
  | "Defence to counterclaim"
  | "Discovery documents"
  | "Pre-trial memorandum"
  | "Interlocutory application"
  | "Other";
export const PLEADING_TYPES: PleadingType[] = [
  "Statement of claim",
  "Statement of defence",
  "Counterclaim",
  "Reply",
  "Defence to counterclaim",
  "Discovery documents",
  "Pre-trial memorandum",
  "Interlocutory application",
  "Other",
];
export type PleadingStatus = "Pending" | "Due" | "Filed";

export interface LitigationParty {
  _id: string;
  name: string;
  role: LitigationPartyRole;
  organisation: string;
  userId: string | null;
}
export type LitigationTimelineSource = "System" | "Manual";
export interface LitigationTimelineEntry {
  _id: string;
  at: string;
  title: string;
  description: string;
  source: LitigationTimelineSource;
}
export interface LitigationPleading {
  _id: string;
  type: PleadingType;
  label: string;
  status: PleadingStatus;
  dueOn: string | null;
  filedOn: string | null;
  note: string;
}
export interface LitigationCourtDate {
  _id: string;
  date: string;
  title: string;
  time: string;
  location: string;
  note: string;
}

// Real combined ADR + litigation totals, computed live on the
// backend from actual TimeEntry records and the linked ADR case —
// never stored, never stale.
export interface LitigationCombinedTotals {
  litigationHours: number;
  litigationFees: number;
  litigationDisbursed: number;
  adrHours: number;
  adrFees: number;
  adrDisbursed: number;
  combinedFees: number;
  combinedDisbursed: number;
  combinedTotal: number;
  litigationAgeDays: number;
  totalAgeDays: number;
}

export interface LitigationCase {
  _id: string;
  ref: string;
  title: string;
  adrCaseId: string | null;
  mandateId: string | null;
  mandateName: string;
  parties: LitigationParty[];
  stage: LitigationStage;
  status: LitigationCaseStatus;
  claimValue: number;
  currency: string;
  filedOn: string;
  court: string;
  courtDivision: string;
  courtCaseNumber: string | null;
  judge: string;
  registry: string;
  courtFeesPaid: number;
  courtFeesCurrency: string;
  timeline: LitigationTimelineEntry[];
  pleadings: LitigationPleading[];
  courtDates: LitigationCourtDate[];
  disbursements: AdrDisbursement[];
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-case detail fetch, not the list.
  totals?: LitigationCombinedTotals;
}

export const fetchLitigationCases = async (): Promise<LitigationCase[]> => {
  const res = await api.get("/crm/litigation-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchLitigationCase = async (
  id: string,
): Promise<LitigationCase> =>
  unwrap(await api.get(`/crm/litigation-cases/${id}`));

// Direct filing, no prior ADR phase. The far more common path —
// escalating a real ADR case — uses escalateAdrToLitigation instead.
export const createLitigationCase = async (dto: {
  title: string;
  mandateId?: string;
  parties?: {
    name: string;
    role: LitigationPartyRole;
    organisation?: string;
    userId?: string;
  }[];
  claimValue?: number;
  currency?: string;
  court?: string;
  courtDivision?: string;
  registry?: string;
}): Promise<LitigationCase> =>
  unwrap(await api.post("/crm/litigation-cases", dto));

export const updateLitigationDetails = async (
  id: string,
  dto: Partial<{
    court: string;
    courtDivision: string;
    courtCaseNumber: string;
    judge: string;
    registry: string;
    courtFeesPaid: number;
    courtFeesCurrency: string;
    claimValue: number;
    parties: {
      name: string;
      role: LitigationPartyRole;
      organisation?: string;
      userId?: string;
    }[];
  }>,
): Promise<LitigationCase> =>
  unwrap(await api.patch(`/crm/litigation-cases/${id}/details`, dto));

export const setLitigationStage = async (
  id: string,
  stage: LitigationStage,
  note?: string,
): Promise<LitigationCase> =>
  unwrap(await api.patch(`/crm/litigation-cases/${id}/stage`, { stage, note }));

export const addLitigationPleading = async (
  id: string,
  dto: { type: PleadingType; label?: string; dueOn?: string; note?: string },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/pleadings`, dto));

export const updateLitigationPleading = async (
  id: string,
  pleadingId: string,
  dto: { status?: PleadingStatus; filedOn?: string; note?: string },
): Promise<LitigationCase> =>
  unwrap(
    await api.patch(`/crm/litigation-cases/${id}/pleadings/${pleadingId}`, dto),
  );

export const addLitigationCourtDate = async (
  id: string,
  dto: {
    date: string;
    title: string;
    time?: string;
    location?: string;
    note?: string;
  },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/court-dates`, dto));

export const addLitigationDisbursement = async (
  id: string,
  dto: {
    label: string;
    category?: DisbursementCategory;
    amount: number;
    currency?: string;
    date?: string;
  },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/disbursements`, dto));

export const addLitigationTimelineEntry = async (
  id: string,
  dto: { title: string; description?: string; at?: string },
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/timeline`, dto));

export const recordLitigationOutcome = async (
  id: string,
  outcome: string,
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/outcome`, { outcome }));

// Settlement reached mid-litigation — a consent judgment, per the
// product owner's spec ("settlement remains possible at any stage").
export const recordConsentJudgment = async (
  id: string,
  terms: string,
): Promise<LitigationCase> =>
  unwrap(
    await api.post(`/crm/litigation-cases/${id}/consent-judgment`, { terms }),
  );

export const withdrawLitigationCase = async (
  id: string,
  reason?: string,
): Promise<LitigationCase> =>
  unwrap(await api.post(`/crm/litigation-cases/${id}/withdraw`, { reason }));
