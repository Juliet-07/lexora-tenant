import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type AdrType =
  | "Mediation"
  | "Arbitration"
  | "Conciliation"
  | "Expert determination";
export const ADR_TYPES: AdrType[] = [
  "Mediation",
  "Arbitration",
  "Conciliation",
  "Expert determination",
];

export type AdrStage =
  | "Intake"
  | "Notice"
  | "Discovery"
  | "Preparation"
  | "Hearing"
  | "Resolution";
export const ADR_STAGES: AdrStage[] = [
  "Intake",
  "Notice",
  "Discovery",
  "Preparation",
  "Hearing",
  "Resolution",
];

// Real sub-tasks per stage — a static reference matching the
// product owner's spec exactly, not per-case data (every case
// shares the same real definition of what each stage covers).
export const ADR_STAGE_TASKS: Record<AdrStage, string> = {
  Intake: "Register, conflict check, assess, classify",
  Notice: "Serve ADR notice, response, mediator/arbitrator selection",
  Discovery: "Evidence gathering, expert reports, document exchange",
  Preparation: "Position paper, witness prep, settlement analysis, bundle",
  Hearing: "Session(s), opening statements, negotiation, adjournment",
  Resolution: "Settlement deed, award, enforcement, costs, close",
};

export type AdrCaseStatus =
  | "Active"
  | "Resolved"
  | "Escalated to litigation"
  | "Withdrawn";

export type SessionMode = "Physical" | "Virtual";
export type AdrSessionStatus = "Scheduled" | "Completed" | "Cancelled";

export type AdrPartyRole =
  | "Claimant"
  | "Respondent"
  | "Mediator"
  | "Arbitrator"
  | "Counsel"
  | "Expert"
  | "Other";
export const ADR_PARTY_ROLES: AdrPartyRole[] = [
  "Claimant",
  "Respondent",
  "Mediator",
  "Arbitrator",
  "Counsel",
  "Expert",
  "Other",
];

// Shared with litigation's own disbursements — one real cost
// vocabulary covers both phases so a combined total is honest.
export type DisbursementCategory =
  | "Filing fee"
  | "Mediator / arbitrator fee"
  | "Court fee"
  | "Bailiff / service"
  | "Expert"
  | "Venue"
  | "Other";
export const DISBURSEMENT_CATEGORIES: DisbursementCategory[] = [
  "Filing fee",
  "Mediator / arbitrator fee",
  "Court fee",
  "Bailiff / service",
  "Expert",
  "Venue",
  "Other",
];

export interface AdrParty {
  _id: string;
  name: string;
  role: AdrPartyRole;
  organisation: string;
  userId: string | null;
}
export interface AdrSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: SessionMode;
  venue: string;
  status: AdrSessionStatus;
  outcome: string;
}
export interface AdrSettlement {
  amount: number;
  date: string;
  terms: string;
}
export type AdrTimelineSource = "System" | "Manual";
export interface AdrTimelineEntry {
  _id: string;
  at: string;
  title: string;
  description: string;
  source: AdrTimelineSource;
}
export interface AdrChecklistItem {
  _id: string;
  label: string;
  done: boolean;
}
export interface AdrDisbursement {
  _id: string;
  label: string;
  category: DisbursementCategory;
  amount: number;
  currency: string;
  date: string;
}

// Real hours/fees for this dispute specifically — computed live on
// the backend from actual TimeEntry records, never a stored number.
export interface AdrCaseTotals {
  hours: number;
  fees: number;
  disbursed: number;
  total: number;
  ageDays: number;
}

export interface AdrCase {
  _id: string;
  ref: string;
  title: string;
  type: AdrType;
  mandateId: string | null;
  mandateName: string;
  parties: AdrParty[];
  neutralUserId: string | null;
  neutral: string;
  stage: AdrStage;
  status: AdrCaseStatus;
  claimValue: number;
  currency: string;
  filedOn: string;
  category: string;
  settlementTargetMin: number | null;
  settlementTargetMax: number | null;
  venue: string;
  governingLaw: string;
  adrClause: string;
  escalationPath: string;
  sessions: AdrSession[];
  settlement: AdrSettlement | null;
  outcome: string | null;
  timeline: AdrTimelineEntry[];
  checklist: AdrChecklistItem[];
  disbursements: AdrDisbursement[];
  litigationCaseId: string | null;
  createdAt: string;
  updatedAt: string;
  // Only present on the single-case detail fetch, not the list.
  totals?: AdrCaseTotals;
}

export const fetchAdrCases = async (): Promise<AdrCase[]> => {
  const res = await api.get("/crm/adr-cases");
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};
export const fetchAdrCase = async (id: string): Promise<AdrCase> =>
  unwrap(await api.get(`/crm/adr-cases/${id}`));

export const createAdrCase = async (dto: {
  title: string;
  type: AdrType;
  parties?: {
    name: string;
    role: AdrPartyRole;
    organisation?: string;
    userId?: string;
  }[];
  mandateId?: string;
  neutralUserId?: string;
  neutral?: string;
  claimValue?: number;
  currency?: string;
  category?: string;
  settlementTargetMin?: number;
  settlementTargetMax?: number;
  venue?: string;
  governingLaw?: string;
  adrClause?: string;
  escalationPath?: string;
}): Promise<AdrCase> => unwrap(await api.post("/crm/adr-cases", dto));

export const updateAdrCaseDetails = async (
  id: string,
  dto: Partial<{
    category: string;
    settlementTargetMin: number;
    settlementTargetMax: number;
    venue: string;
    governingLaw: string;
    adrClause: string;
    escalationPath: string;
    claimValue: number;
    parties: {
      name: string;
      role: AdrPartyRole;
      organisation?: string;
      userId?: string;
    }[];
  }>,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/details`, dto));

export const setAdrStage = async (
  id: string,
  stage: AdrStage,
  note?: string,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/stage`, { stage, note }));

export const addAdrSession = async (
  id: string,
  dto: {
    date: string;
    startTime?: string;
    endTime?: string;
    mode: SessionMode;
    venue?: string;
  },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/sessions`, dto));

export const updateAdrSession = async (
  id: string,
  sessionId: string,
  dto: { status?: AdrSessionStatus; outcome?: string },
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/sessions/${sessionId}`, dto));

export const recordAdrSettlement = async (
  id: string,
  amount: number,
  terms?: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/settlement`, { amount, terms }));

export const recordAdrOutcome = async (
  id: string,
  outcome: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/outcome`, { outcome }));

// The real workflow transition matching "if mediation fails,
// restart as arbitration" — resets to Notice stage on the backend.
export const restartAdrAsType = async (
  id: string,
  newType: AdrType,
  reason: string,
): Promise<AdrCase> =>
  unwrap(
    await api.post(`/crm/adr-cases/${id}/restart-as`, { newType, reason }),
  );

export const withdrawAdrCase = async (
  id: string,
  reason?: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/withdraw`, { reason }));

export const addAdrTimelineEntry = async (
  id: string,
  dto: { title: string; description?: string; at?: string },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/timeline`, dto));

export const addAdrChecklistItem = async (
  id: string,
  label: string,
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/checklist`, { label }));

export const setAdrChecklistItemDone = async (
  id: string,
  itemId: string,
  done: boolean,
): Promise<AdrCase> =>
  unwrap(await api.patch(`/crm/adr-cases/${id}/checklist/${itemId}`, { done }));

export const addAdrDisbursement = async (
  id: string,
  dto: {
    label: string;
    category?: DisbursementCategory;
    amount: number;
    currency?: string;
    date?: string;
  },
): Promise<AdrCase> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/disbursements`, dto));

// The real dependency mechanism between ADR and litigation — a
// reasoned action that creates the linked litigation case and
// preserves the full ADR history.
export const escalateAdrToLitigation = async (
  id: string,
  dto: {
    reason: string;
    court?: string;
    courtDivision?: string;
    registry?: string;
    filedOn?: string;
  },
): Promise<{ adrCase: AdrCase; litigationCase: any }> =>
  unwrap(await api.post(`/crm/adr-cases/${id}/escalate`, dto));
