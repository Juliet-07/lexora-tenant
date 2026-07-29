import { useEffect, useState } from "react";

export type PolicyType = "organisation" | "board";

export interface PolicyAckRecord {
  name: string;
  email: string;
  signature: string;
  ackedAt: string;
  source: "employee" | "external";
}

export interface UploadedPolicy {
  id: string;
  token: string;
  title: string;
  category: string;
  type: PolicyType;
  fileName: string;
  fileDataUrl: string | null;
  mimeType: string | null;
  uploadedAt: string;
  acknowledgments: PolicyAckRecord[];
}

const KEY = "grc_uploaded_policies_v1";
const EVT = "grc_uploaded_policies_changed";

const rid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function readPolicies(): UploadedPolicy[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UploadedPolicy[];
  } catch {
    /* ignore */
  }
  return [];
}

function write(list: UploadedPolicy[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useUploadedPolicies() {
  const [list, setList] = useState<UploadedPolicy[]>(() => readPolicies());
  useEffect(() => {
    const h = () => setList(readPolicies());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return list;
}

export function addPolicy(input: {
  title: string;
  category: string;
  type: PolicyType;
  fileName: string;
  fileDataUrl: string | null;
  mimeType: string | null;
}): UploadedPolicy {
  const policy: UploadedPolicy = {
    id: rid("pol"),
    token: rid("tok"),
    uploadedAt: new Date().toISOString(),
    acknowledgments: [],
    ...input,
  };
  write([policy, ...readPolicies()]);
  return policy;
}

export function deletePolicy(id: string) {
  write(readPolicies().filter((p) => p.id !== id));
}

export function acknowledgePolicy(
  id: string,
  ack: Omit<PolicyAckRecord, "ackedAt">,
) {
  write(
    readPolicies().map((p) =>
      p.id === id
        ? {
            ...p,
            acknowledgments: [
              ...p.acknowledgments.filter(
                (a) => a.email.toLowerCase() !== ack.email.toLowerCase(),
              ),
              { ...ack, ackedAt: new Date().toISOString() },
            ],
          }
        : p,
    ),
  );
}

export function findPolicyByToken(token: string): UploadedPolicy | null {
  return readPolicies().find((p) => p.token === token) ?? null;
}

export function acknowledgePolicyByToken(
  token: string,
  ack: Omit<PolicyAckRecord, "ackedAt">,
) {
  const p = findPolicyByToken(token);
  if (p) acknowledgePolicy(p.id, ack);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
