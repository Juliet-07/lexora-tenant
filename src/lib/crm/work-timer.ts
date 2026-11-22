import { useSyncExternalStore } from "react";

// One work timer for the whole app. The header control and the Timesheets
// page both read and drive this same state, so there is only ever one timer
// and one way to stop it. State survives a refresh (localStorage) and is
// shared between browser tabs.
//
// Time is tracked as `accumulatedMs` (work already banked) plus, while the
// timer is running, the time since `runningSince`. Pausing banks the running
// stretch and clears `runningSince`, so a break adds nothing.

const KEY = "lexora.crm.work-timer.v2";
// v1 keys (floating timer + timesheet-page timer) — picked up once so a
// timer left running across the update isn't lost.
const LEGACY_KEYS = [
  "lexora.crm.floating-timer.v1",
  "lexora.timesheet.timer.v1",
];

export interface WorkTimerState {
  active: boolean;
  accumulatedMs: number;
  runningSince: number | null;
  // Elapsed work time at the last "still working?" confirmation, so the
  // hourly check-in only counts time actually spent running.
  confirmedAtMs: number;
}

const IDLE: WorkTimerState = {
  active: false,
  accumulatedMs: 0,
  runningSince: null,
  confirmedAtMs: 0,
};

const read = (): WorkTimerState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...IDLE, ...JSON.parse(raw) };
    for (const k of LEGACY_KEYS) {
      const legacy = localStorage.getItem(k);
      if (legacy && Number(legacy)) {
        return {
          active: true,
          accumulatedMs: 0,
          runningSince: Number(legacy),
          confirmedAtMs: 0,
        };
      }
    }
  } catch {
    /* storage unavailable — fall through to idle */
  }
  return IDLE;
};

let state: WorkTimerState = read();
const listeners = new Set<() => void>();

const commit = (next: WorkTimerState) => {
  state = next;
  try {
    if (next.active) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const elapsedMsOf = (s: WorkTimerState, now: number) =>
  s.accumulatedMs + (s.runningSince ? Math.max(0, now - s.runningSince) : 0);

export const workTimer = {
  getState: () => state,
  start() {
    commit({
      active: true,
      accumulatedMs: 0,
      runningSince: Date.now(),
      confirmedAtMs: 0,
    });
  },
  pause() {
    if (!state.active || !state.runningSince) return;
    commit({
      ...state,
      accumulatedMs: elapsedMsOf(state, Date.now()),
      runningSince: null,
    });
  },
  resume() {
    if (!state.active || state.runningSince) return;
    commit({ ...state, runningSince: Date.now() });
  },
  confirmStillWorking() {
    if (!state.active) return;
    commit({ ...state, confirmedAtMs: elapsedMsOf(state, Date.now()) });
  },
  reset() {
    commit(IDLE);
  },
};

export function useWorkTimer() {
  const s = useSyncExternalStore(subscribe, () => state);
  return { ...s, running: s.active && s.runningSince !== null };
}

export const formatClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

// Hours to log: at least a quarter hour, to two decimals.
export const hoursFromMs = (ms: number) =>
  Math.max(0.25, Number((ms / 3600000).toFixed(2)));
