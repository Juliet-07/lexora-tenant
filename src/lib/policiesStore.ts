import { useEffect, useState } from "react";

export interface PerformancePolicy {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

const KEY = "perf_policies_v1";
const EVT = "perf_policies_changed";

function read(): PerformancePolicy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: PerformancePolicy[] = [
    {
      id: "pol_seed_1",
      title: "Annual Performance Review Policy",
      category: "Reviews",
      description:
        "Defines how annual reviews are conducted, including scoring scales and timelines.",
      content:
        "All employees are subject to an annual performance review conducted within Q4. Reviews use a 1–5 scoring scale across KPIs, competencies and values. Self-assessment is required before the manager review.",
      effectiveDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pol_seed_2",
      title: "Performance Improvement Plan (PIP)",
      category: "Improvement",
      description:
        "Process for placing underperforming employees on a structured improvement plan.",
      content:
        "Employees scoring below 60% in two consecutive reviews will be placed on a 90-day PIP with defined milestones and weekly manager check-ins.",
      effectiveDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function write(list: PerformancePolicy[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function usePolicies() {
  const [list, setList] = useState<PerformancePolicy[]>(() => read());
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

export function createPolicy(
  p: Omit<PerformancePolicy, "id" | "createdAt" | "updatedAt">,
) {
  const list = read();
  const now = new Date().toISOString();
  const next: PerformancePolicy = {
    ...p,
    id: `pol_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  write([next, ...list]);
  return next;
}

export function updatePolicy(id: string, patch: Partial<PerformancePolicy>) {
  const list = read().map((p) =>
    p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
  );
  write(list);
}

export function deletePolicy(id: string) {
  write(read().filter((p) => p.id !== id));
}
