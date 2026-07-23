import { useEffect, useState } from "react";

// Prototype localStorage-backed store for GRC Resolutions.
// Covers Board, Written, and Shareholder resolutions.

const KEY = "grc_resolutions_v1";
const EVT = "grc_resolutions_changed";

export type ResolutionType = "Board" | "Written" | "Shareholder";
export type ResolutionStatus =
  | "Draft"
  | "Voting open"
  | "Circulating"
  | "Closed";
export type ResolutionOutcome = "Passed" | "Failed" | null;
export type ShareholderSubType = "Ordinary" | "Special";

export type BoardVote = "Approve" | "Oppose" | "Abstain" | null;
export interface BoardVoteRow {
  directorId: string;
  directorName: string;
  recused: boolean;
  vote: BoardVote;
}

export type WrittenStatus = "Not sent" | "Sent" | "Reminded" | "Responded";
export interface WrittenRow {
  directorId: string;
  directorName: string;
  recused: boolean;
  status: WrittenStatus;
  response: BoardVote; // Approve/Oppose/Abstain when responded
  respondedAt?: string;
  manualEntry?: boolean; // logged outside the platform
}

export interface NotificationEvent {
  id: string;
  at: string;
  kind: "Sent" | "Reminder" | "Response" | "System";
  message: string;
}

export interface Proxy {
  id: string;
  proxyName: string;
  representing: string;
  shares: number;
  vote: BoardVote;
}

export interface Resolution {
  id: string;
  reference: string;
  type: ResolutionType;
  subject: string;
  fullText: string;
  linkedMeetingId?: string | null;
  proposer?: string;
  seconder?: string;
  effectiveDate: string;
  status: ResolutionStatus;
  outcome: ResolutionOutcome;
  createdAt: string;
  closedAt?: string;

  // Board-specific
  boardVotes?: BoardVoteRow[];

  // Written-specific
  writtenRows?: WrittenRow[];
  deadline?: string;
  majorityRule?: "Simple" | "Unanimous";
  notifications?: NotificationEvent[];
  forceClosedBy?: string;
  forceClosedAt?: string;

  // Shareholder-specific
  subType?: ShareholderSubType;
  quorumRequired?: number;
  quorumPresent?: number;
  proxies?: Proxy[];
  pollFor?: number;
  pollAgainst?: number;
  pollAbstain?: number;
}

const now = () => new Date().toISOString();
const uid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function seed(): Resolution[] {
  return [
    {
      id: "res_seed_1",
      reference: "RES-2026-001",
      type: "Board",
      subject: "Approval of Q4 audited financial statements",
      fullText:
        "RESOLVED THAT the audited financial statements for the year ended 31 December 2025 be and are hereby approved.",
      effectiveDate: new Date().toISOString().slice(0, 10),
      status: "Closed",
      outcome: "Passed",
      createdAt: now(),
      closedAt: now(),
      proposer: "Dr. E. Rwigema",
      seconder: "N. Uwase",
      boardVotes: [
        { directorId: "bm_1", directorName: "Dr. E. Rwigema", recused: false, vote: "Approve" },
        { directorId: "bm_2", directorName: "N. Uwase", recused: false, vote: "Approve" },
      ],
    },
    {
      id: "res_seed_2",
      reference: "RES-2026-002",
      type: "Written",
      subject: "Approval of interim dividend",
      fullText:
        "RESOLVED that an interim dividend of RWF 250 per share be declared, payable on 30 September 2026.",
      effectiveDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
      majorityRule: "Simple",
      status: "Circulating",
      outcome: null,
      createdAt: now(),
      writtenRows: [
        { directorId: "bm_1", directorName: "Dr. E. Rwigema", recused: false, status: "Responded", response: "Approve", respondedAt: now() },
        { directorId: "bm_2", directorName: "N. Uwase", recused: false, status: "Sent", response: null },
      ],
      notifications: [
        { id: uid("ev"), at: now(), kind: "Sent", message: "Circulated to all directors" },
        { id: uid("ev"), at: now(), kind: "Response", message: "Dr. E. Rwigema responded: Approve" },
      ],
    },
  ];
}

function read(): Resolution[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}
function write(next: Resolution[]) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useResolutions() {
  const [list, setList] = useState<Resolution[]>(() => read());
  useEffect(() => {
    const h = () => setList(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return list;
}

export function mutate(fn: (list: Resolution[]) => Resolution[]) {
  write(fn(read()));
}

export function nextReference(list: Resolution[]) {
  const year = new Date().getFullYear();
  const nums = list
    .map((r) => r.reference.match(new RegExp(`^RES-${year}-(\\d+)$`)))
    .filter(Boolean)
    .map((m) => parseInt(m![1], 10));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `RES-${year}-${String(n).padStart(3, "0")}`;
}

export function tallyBoard(rows: BoardVoteRow[]) {
  const eligible = rows.filter((r) => !r.recused);
  const approve = eligible.filter((r) => r.vote === "Approve").length;
  const oppose = eligible.filter((r) => r.vote === "Oppose").length;
  const abstain = eligible.filter((r) => r.vote === "Abstain").length;
  const awaiting = eligible.filter((r) => !r.vote).length;
  return { approve, oppose, abstain, awaiting, total: eligible.length };
}

export function tallyWritten(rows: WrittenRow[]) {
  const eligible = rows.filter((r) => !r.recused);
  const approve = eligible.filter((r) => r.response === "Approve").length;
  const oppose = eligible.filter((r) => r.response === "Oppose").length;
  const abstain = eligible.filter((r) => r.response === "Abstain").length;
  const awaiting = eligible.filter((r) => r.status !== "Responded").length;
  return { approve, oppose, abstain, awaiting, total: eligible.length };
}

export function computeOutcome(
  approve: number,
  total: number,
  threshold: "Simple" | "Special" | "Unanimous" = "Simple",
): ResolutionOutcome {
  if (total === 0) return null;
  const pct = approve / total;
  if (threshold === "Unanimous") return approve === total ? "Passed" : "Failed";
  if (threshold === "Special") return pct >= 0.75 ? "Passed" : "Failed";
  return pct > 0.5 ? "Passed" : "Failed";
}

export { uid as resUid };
