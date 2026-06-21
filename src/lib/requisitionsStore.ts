import { useEffect, useState } from "react";
import { requisitions as seed, type Requisition } from "@/data/hrMockData";

const KEY = "lexora.requisitions.v1";

function load(): Requisition[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Requisition[];
  } catch {
    return seed;
  }
}

function save(items: Requisition[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("requisitions:changed"));
}

export function getRequisitions(): Requisition[] {
  return load();
}

export function addRequisition(r: Requisition) {
  const items = [r, ...load()];
  save(items);
  return items;
}

export function updateRequisition(id: string, patch: Partial<Requisition>) {
  const items = load().map((x) => (x.id === id ? { ...x, ...patch } : x));
  save(items);
  return items;
}

export function nextRequisitionId(): string {
  const items = load();
  return `REQ-${String(items.length + 1).padStart(3, "0")}`;
}

export function useRequisitions() {
  const [items, setItems] = useState<Requisition[]>(() => load());
  useEffect(() => {
    const sync = () => setItems(load());
    window.addEventListener("requisitions:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("requisitions:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}

export type { Requisition };
