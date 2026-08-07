import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// Read-only client for the tenant-facing Legal Knowledge Base.
// Entries are entirely authored by Super Admin — this is the first
// genuinely global (non-tenant-scoped) resource in the app. Backed
// by GET /grc/legal-knowledge, which only ever returns Published
// entries — there is no draft visibility here by design.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Statute",
  "Regulation",
  "Case Law",
  "International",
  "Commentary",
  "Update",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface LegalKnowledgeEntry {
  _id: string;
  title: string;
  category: Category;
  practiceArea: string;
  jurisdiction: string;
  summary: string;
  content: string; // HTML
  reference: string;
  source: string;
  externalLink: string;
  publishedAt: string | null;
  updatedAt: string;
}

export const fetchLegalKnowledge = async (): Promise<LegalKnowledgeEntry[]> => {
  const res = await api.get("/grc/legal-knowledge");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};
