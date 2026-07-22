import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────
// GRC Governance prototype store — meetings, committees, board,
// governance codes. Separate from grcStore to keep concerns tight.
// ─────────────────────────────────────────────────────────────

const KEY = "grc_gov_store_v1";
const EVT = "grc_gov_store_changed";

export interface MeetingAttendee {
  name: string;
  email: string;
  role?: string;
}

export interface BoardPackDoc {
  name: string;
  size?: string;
  uploadedAt: string;
}

export interface AgendaItem {
  title: string;
  presenter?: string;
  minutes?: number;
}

export type MeetingMode = "Physical" | "Online";
export type MeetingPlatform = "Zoom" | "Google Meet" | "Microsoft Teams";

export interface Meeting {
  id: string;
  title: string;
  type: "Board" | "Committee" | "Executive" | "Ad-hoc";
  committeeId?: string;
  date: string; // ISO
  mode: MeetingMode;
  venue?: string; // when Physical
  meetingLink?: string; // when Online
  platform?: MeetingPlatform; // when Online
  location: string; // legacy summary string (kept for display)
  chair: string;
  attendees: MeetingAttendee[];
  agenda: AgendaItem[];
  boardPack: BoardPackDoc[];
  notes: string;
  status: "Draft" | "Sent" | "Held" | "Cancelled";
  sentAt?: string;
  minutes?: string;
}

export interface CommitteeMember {
  name: string;
  email: string;
  role: "Chair" | "Secretary" | "Member";
}

export interface CommitteeTask {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Done";
}

export interface Committee {
  id: string;
  name: string;
  purpose: string;
  chair: string;
  members: CommitteeMember[];
  tasks: CommitteeTask[];
  createdAt: string;
}

export interface BoardMember {
  id: string;
  name: string;
  role: "Chair" | "Vice-Chair" | "Executive Director" | "Non-Executive Director" | "Independent Director";
  email: string;
  appointedAt: string;
  termEnds: string;
  bio: string;
  conflicts: { note: string; disclosedAt: string }[];
  training: { title: string; completedAt: string }[];
  successorNote?: string;
}

export interface GovernanceCode {
  id: string;
  title: string;
  category: "Code of Conduct" | "Governance Charter" | "Board Charter" | "Ethics" | "Other";
  version: number;
  body: string;
  documents: { name: string; uploadedAt: string }[];
  updatedAt: string;
  status: "Draft" | "Published";
}

export interface GovState {
  meetings: Meeting[];
  committees: Committee[];
  boardMembers: BoardMember[];
  codes: GovernanceCode[];
}

const now = () => new Date().toISOString();
const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

function seed(): GovState {
  const committees: Committee[] = [
    {
      id: "cm_1",
      name: "Audit & Risk Committee",
      purpose: "Oversee financial reporting integrity, audit process, and enterprise risk.",
      chair: "N. Uwase",
      members: [
        { name: "N. Uwase", email: "nuwase@example.com", role: "Chair" },
        { name: "J. Mukamana", email: "jm@example.com", role: "Secretary" },
        { name: "P. Kagame", email: "pk@example.com", role: "Member" },
      ],
      tasks: [
        { id: "tk_1", title: "Review Q3 external audit plan", owner: "J. Mukamana", dueDate: days(14).slice(0, 10), status: "In Progress" },
      ],
      createdAt: now(),
    },
    {
      id: "cm_2",
      name: "Nominations & Remuneration Committee",
      purpose: "Board composition, succession planning, executive remuneration.",
      chair: "A. Habimana",
      members: [
        { name: "A. Habimana", email: "ah@example.com", role: "Chair" },
        { name: "S. Ndayisenga", email: "sn@example.com", role: "Member" },
      ],
      tasks: [],
      createdAt: now(),
    },
  ];

  const boardMembers: BoardMember[] = [
    {
      id: "bm_1",
      name: "Dr. E. Rwigema",
      role: "Chair",
      email: "erwigema@example.com",
      appointedAt: days(-800).slice(0, 10),
      termEnds: days(400).slice(0, 10),
      bio: "20+ years in financial services governance.",
      conflicts: [],
      training: [{ title: "Corporate Governance Refresher", completedAt: days(-120).slice(0, 10) }],
    },
    {
      id: "bm_2",
      name: "N. Uwase",
      role: "Non-Executive Director",
      email: "nuwase@example.com",
      appointedAt: days(-400).slice(0, 10),
      termEnds: days(700).slice(0, 10),
      bio: "Former CFO, chartered accountant.",
      conflicts: [{ note: "Sits on board of a client bank.", disclosedAt: days(-200) }],
      training: [],
      successorNote: "Being groomed for Audit Chair.",
    },
  ];

  const codes: GovernanceCode[] = [
    {
      id: "gc_1",
      title: "Code of Business Conduct",
      category: "Code of Conduct",
      version: 2,
      body: "All directors, officers, and employees must act with integrity, honesty, and in the best interests of the company and its stakeholders.",
      documents: [{ name: "CodeOfConduct_v2.pdf", uploadedAt: now() }],
      updatedAt: now(),
      status: "Published",
    },
  ];

  const meetings: Meeting[] = [
    {
      id: "mt_1",
      title: "Q4 Board Meeting",
      type: "Board",
      date: days(21),
      mode: "Physical",
      venue: "Head Office Boardroom",
      location: "Head Office Boardroom",
      chair: "Dr. E. Rwigema",
      attendees: [
        { name: "Dr. E. Rwigema", email: "erwigema@example.com", role: "Chair" },
        { name: "N. Uwase", email: "nuwase@example.com", role: "NED" },
      ],
      agenda: [
        { title: "Apologies & Quorum", minutes: 5 },
        { title: "Minutes of previous meeting", minutes: 10 },
        { title: "CEO Report", presenter: "CEO", minutes: 20 },
        { title: "Audit & Risk update", presenter: "Committee Chair", minutes: 20 },
      ],
      boardPack: [
        { name: "CEO_Report_Q4.pdf", uploadedAt: now() },
        { name: "Financials_Q4.xlsx", uploadedAt: now() },
      ],
      notes: "Please review the full pack in advance.",
      status: "Draft",
    },
  ];

  return { meetings, committees, boardMembers, codes };
}

function read(): GovState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function write(next: GovState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useGov() {
  const [state, setState] = useState<GovState>(() => read());
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

export function mutateGov(fn: (s: GovState) => GovState) {
  write(fn(read()));
}

export const gid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
