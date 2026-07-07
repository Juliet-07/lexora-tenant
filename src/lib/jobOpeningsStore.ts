import { useEffect, useState } from "react";
import { jobOpenings as seed, type JobOpening } from "@/data/hrMockData";

const KEY = "lexora.jobOpenings.v1";

function load(): JobOpening[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as JobOpening[];
  } catch {
    return seed;
  }
}

function save(items: JobOpening[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("jobOpenings:changed"));
}

export function getJobOpenings(): JobOpening[] {
  return load();
}

export function addJobOpening(j: JobOpening) {
  save([j, ...load()]);
}

export function updateJobOpening(id: string, patch: Partial<JobOpening>) {
  save(load().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

export function deleteJobOpening(id: string) {
  save(load().filter((x) => x.id !== id));
}

export function nextJobOpeningId(): string {
  const items = load();
  const nums = items
    .map((i) => parseInt(i.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `JOB-${String(next).padStart(3, "0")}`;
}

export function useJobOpenings() {
  const [items, setItems] = useState<JobOpening[]>(() => load());
  useEffect(() => {
    const sync = () => setItems(load());
    window.addEventListener("jobOpenings:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("jobOpenings:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}

export type { JobOpening };
