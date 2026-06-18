// Tenant-wide onboarding documents + per-employee submissions.
// Stored in localStorage so this prototype works without a backend.

export type OnboardingDocKind = "text" | "link" | "pdf";

export interface OnboardingDoc {
  id: string;
  title: string;
  kind: OnboardingDocKind;
  /** For "text": pasted body. For "link": URL. For "pdf": data URL (base64). */
  content: string;
  /** Original filename when kind === "pdf". */
  fileName?: string;
  active: boolean;
  createdAt: string;
}

export interface OnboardingSubmissionDoc {
  id: string;
  title: string;
  kind: OnboardingDocKind;
  checked: boolean;
}

export interface OnboardingSubmission {
  signature: string;
  submittedAt: string;
  docs: OnboardingSubmissionDoc[];
}

const DOCS_KEY = "tenant.onboarding.docs.v1";
const SUB_PREFIX = "tenant.onboarding.submission.v1:";

// ── Documents ────────────────────────────────────────────────

export function getOnboardingDocs(): OnboardingDoc[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? (JSON.parse(raw) as OnboardingDoc[]) : [];
  } catch {
    return [];
  }
}

export function saveOnboardingDocs(docs: OnboardingDoc[]) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function upsertOnboardingDoc(doc: OnboardingDoc) {
  const docs = getOnboardingDocs();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.unshift(doc);
  saveOnboardingDocs(docs);
}

export function removeOnboardingDoc(id: string) {
  saveOnboardingDocs(getOnboardingDocs().filter((d) => d.id !== id));
}

// ── Submissions (per employee, keyed by email) ───────────────

const subKey = (email: string) => `${SUB_PREFIX}${email.toLowerCase()}`;

export function getSubmission(email: string): OnboardingSubmission | null {
  try {
    const raw = localStorage.getItem(subKey(email));
    return raw ? (JSON.parse(raw) as OnboardingSubmission) : null;
  } catch {
    return null;
  }
}

export function saveSubmission(email: string, sub: OnboardingSubmission) {
  localStorage.setItem(subKey(email), JSON.stringify(sub));
}

export function hasCompletedOnboarding(email: string): boolean {
  // Only blocks if there are active docs AND no submission yet.
  const active = getOnboardingDocs().filter((d) => d.active);
  if (active.length === 0) return true;
  return !!getSubmission(email);
}
