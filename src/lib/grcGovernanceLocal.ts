// Local-only prototype storage for governance details that aren't yet
// wired to the backend: board-member skills matrix and meeting attendance
// registration. Persisted to localStorage so it survives refresh.

import { useEffect, useState } from "react";

const SKILLS_KEY = "grc_gov_skills_v1";
const ATTEND_KEY = "grc_gov_attendance_v1";
const SHARE_KEY = "grc_gov_meeting_share_v1";
const ACK_KEY = "grc_gov_meeting_ack_v1";
const MIN_SHARE_KEY = "grc_gov_minutes_share_v1";
const MIN_REVIEW_KEY = "grc_gov_minutes_review_v1";
const EVT = "grc_gov_local_changed";

export type SkillLevel = "Basic" | "Intermediate" | "Expert";

export interface BoardSkill {
  id: string;
  name: string;           // e.g. "Chartered Accountant (CPA)"
  category:
    | "Finance"
    | "Legal"
    | "Risk"
    | "Strategy"
    | "Technology"
    | "Governance"
    | "Industry"
    | "Other";
  level: SkillLevel;
  yearsExperience: number;
  qualified: boolean;     // meets requirement for their board position
  notes?: string;
  addedAt: string;
}

export interface MeetingAttendance {
  allAttended: boolean | null;   // null = not recorded yet
  presentIndices: number[];      // indices into meeting.attendees when !allAttended
  recordedAt: string | null;
}

type SkillsMap = Record<string, BoardSkill[]>;      // key: board member _id
type AttendMap = Record<string, MeetingAttendance>; // key: meeting _id

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}
function writeJSON<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new CustomEvent(EVT));
}

// ── Seed a bit of dummy content so the UI has something to show ──
function seedSkillsIfEmpty() {
  const cur = readJSON<SkillsMap>(SKILLS_KEY, {});
  if (Object.keys(cur).length > 0) return cur;
  const seeded: SkillsMap = {
    bm_1: [
      {
        id: "sk_seed_1a",
        name: "MBA — Finance",
        category: "Finance",
        level: "Expert",
        yearsExperience: 22,
        qualified: true,
        notes: "Harvard Business School, 2003.",
        addedAt: new Date().toISOString(),
      },
      {
        id: "sk_seed_1b",
        name: "Corporate Governance Certification (IoD)",
        category: "Governance",
        level: "Expert",
        yearsExperience: 15,
        qualified: true,
        addedAt: new Date().toISOString(),
      },
    ],
    bm_2: [
      {
        id: "sk_seed_2a",
        name: "Chartered Accountant (CPA)",
        category: "Finance",
        level: "Expert",
        yearsExperience: 18,
        qualified: true,
        notes: "Big-4 audit background.",
        addedAt: new Date().toISOString(),
      },
      {
        id: "sk_seed_2b",
        name: "Enterprise Risk Management",
        category: "Risk",
        level: "Intermediate",
        yearsExperience: 6,
        qualified: true,
        addedAt: new Date().toISOString(),
      },
    ],
  };
  writeJSON(SKILLS_KEY, seeded);
  return seeded;
}

export function useSkills(memberId: string | null | undefined) {
  const [map, setMap] = useState<SkillsMap>(() => seedSkillsIfEmpty());
  useEffect(() => {
    const h = () => setMap(readJSON<SkillsMap>(SKILLS_KEY, {}));
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return memberId ? (map[memberId] ?? []) : [];
}

export function addSkill(memberId: string, skill: Omit<BoardSkill, "id" | "addedAt">) {
  const map = readJSON<SkillsMap>(SKILLS_KEY, {});
  const list = map[memberId] ?? [];
  const next: BoardSkill = {
    ...skill,
    id: `sk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    addedAt: new Date().toISOString(),
  };
  map[memberId] = [...list, next];
  writeJSON(SKILLS_KEY, map);
}

export function removeSkill(memberId: string, skillId: string) {
  const map = readJSON<SkillsMap>(SKILLS_KEY, {});
  map[memberId] = (map[memberId] ?? []).filter((s) => s.id !== skillId);
  writeJSON(SKILLS_KEY, map);
}

// ── Attendance ────────────────────────────────────────────────
export function useAttendance(meetingId: string | null | undefined) {
  const [map, setMap] = useState<AttendMap>(() => readJSON<AttendMap>(ATTEND_KEY, {}));
  useEffect(() => {
    const h = () => setMap(readJSON<AttendMap>(ATTEND_KEY, {}));
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  if (!meetingId) return null;
  return map[meetingId] ?? { allAttended: null, presentIndices: [], recordedAt: null };
}

export function saveAttendance(
  meetingId: string,
  data: { allAttended: boolean; presentIndices: number[] },
) {
  const map = readJSON<AttendMap>(ATTEND_KEY, {});
  map[meetingId] = {
    allAttended: data.allAttended,
    presentIndices: data.allAttended ? [] : data.presentIndices,
    recordedAt: new Date().toISOString(),
  };
  writeJSON(ATTEND_KEY, map);
}

// ── Meeting share snapshots (for external acknowledgement links) ──
export interface SharedMeetingAttendee {
  name: string;
  email: string;
  role?: string;
}
export interface SharedMeetingDoc {
  name: string;
  fileUrl: string | null;
  mimeType: string | null;
}
export interface SharedMeetingAgendaItem {
  title: string;
  presenter?: string;
  durationMinutes?: number;
}
export interface SharedMeetingSnapshot {
  meetingId: string;
  title: string;
  type: string;
  date: string;
  mode: string;
  venue?: string | null;
  meetingLink?: string | null;
  platform?: string | null;
  chair: string;
  notes: string;
  attendees: SharedMeetingAttendee[];
  agenda: SharedMeetingAgendaItem[];
  boardPack: SharedMeetingDoc[];
  sharedAt: string;
}

type ShareMap = Record<string, SharedMeetingSnapshot>;

export function shareMeetingSnapshot(snap: SharedMeetingSnapshot) {
  const map = readJSON<ShareMap>(SHARE_KEY, {});
  map[snap.meetingId] = snap;
  writeJSON(SHARE_KEY, map);
}

export function getSharedMeeting(meetingId: string): SharedMeetingSnapshot | null {
  const map = readJSON<ShareMap>(SHARE_KEY, {});
  return map[meetingId] ?? null;
}

// ── Acknowledgements ──────────────────────────────────────────
export interface DocAck {
  name: string;
  fileUrl: string | null;
  ackedAt: string;
  method: "pdf-scroll" | "image-download" | "other";
}
export interface MeetingAck {
  meetingId: string;
  attendeeEmail: string;
  attendeeName: string;
  agendaConfirmed: boolean;
  documents: DocAck[];
  confirmedAt: string;
  signature: string;
}

type AckMap = Record<string, MeetingAck[]>; // key: meetingId

export function saveMeetingAck(ack: MeetingAck) {
  const map = readJSON<AckMap>(ACK_KEY, {});
  const list = map[ack.meetingId] ?? [];
  const filtered = list.filter((a) => a.attendeeEmail !== ack.attendeeEmail);
  map[ack.meetingId] = [...filtered, ack];
  writeJSON(ACK_KEY, map);
}

export function useMeetingAcks(meetingId: string | null | undefined) {
  const [map, setMap] = useState<AckMap>(() => readJSON<AckMap>(ACK_KEY, {}));
  useEffect(() => {
    const h = () => setMap(readJSON<AckMap>(ACK_KEY, {}));
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  if (!meetingId) return [];
  return map[meetingId] ?? [];
}
