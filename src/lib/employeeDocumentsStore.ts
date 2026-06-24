import { useEffect, useState } from "react";

export interface EmployeeDocument {
  id: string;
  name: string;
  category: string;
  uploadedBy: "employee" | "tenant";
  uploadedByName: string;
  uploadedAt: string;
  size: number; // bytes
  mimeType: string;
  dataUrl: string; // base64 for preview/download (mock)
  notes?: string;
}

const KEY = "employee_documents_v1";
const EVT = "employee_documents_changed";

function read(): EmployeeDocument[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: EmployeeDocument[] = [
    {
      id: "doc_seed_1",
      name: "Employment Contract.pdf",
      category: "Contract",
      uploadedBy: "tenant",
      uploadedByName: "HR Admin",
      uploadedAt: new Date().toISOString(),
      size: 248_500,
      mimeType: "application/pdf",
      dataUrl: "",
      notes: "Signed employment contract.",
    },
    {
      id: "doc_seed_2",
      name: "Employee Handbook 2026.pdf",
      category: "Policy",
      uploadedBy: "tenant",
      uploadedByName: "HR Admin",
      uploadedAt: new Date().toISOString(),
      size: 1_240_000,
      mimeType: "application/pdf",
      dataUrl: "",
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

function write(list: EmployeeDocument[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useEmployeeDocuments() {
  const [list, setList] = useState<EmployeeDocument[]>(() => read());
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

export async function addEmployeeDocument(
  file: File,
  meta: { category: string; notes?: string; uploadedBy: "employee" | "tenant"; uploadedByName: string },
) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const doc: EmployeeDocument = {
    id: `doc_${Date.now()}`,
    name: file.name,
    category: meta.category,
    uploadedBy: meta.uploadedBy,
    uploadedByName: meta.uploadedByName,
    uploadedAt: new Date().toISOString(),
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    dataUrl,
    notes: meta.notes,
  };
  write([doc, ...read()]);
  return doc;
}

export function deleteEmployeeDocument(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
