import { useSyncExternalStore } from "react";

/**
 * Tenant Service Desk knowledge base. Feeds both the tenant-facing
 * Service Desk KB tab and the employee "My Service Desk" KB browser.
 *
 * Prototype persistence: in-memory module state (module-level mutable
 * state + seed), following the pattern of other src/lib/**\/*Store.ts files.
 */

export type KbAudience = "Internal" | "Client-facing";
export type KbStatus = "Draft" | "Published";

export interface KbArticle {
  id: string;
  title: string;
  category: string;
  audience: KbAudience;
  status: KbStatus;
  tags: string[];
  body: string; // HTML
  author: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  helpful: number;
  notHelpful: number;
  linkedTicketId?: string;
}

export const KB_DEFAULT_CATEGORIES = [
  "Portal access",
  "Billing",
  "Advisory",
  "Process",
  "New work",
  "Other",
];

let categories: string[] = [...KB_DEFAULT_CATEGORIES];

let articles: KbArticle[] = [
  {
    id: "KB-01",
    title: "How to reset client portal access",
    category: "Portal access",
    audience: "Client-facing",
    status: "Published",
    tags: ["portal", "login", "access"],
    body: "<p>If a client cannot log in to the portal:</p><ol><li>Confirm the email address on file matches the invite.</li><li>Use the <b>Forgot password</b> link on the login screen.</li><li>If the reset email doesn't arrive within 5 minutes, resend it from Client &gt; Portal users.</li></ol><p>Escalate to IT if the account shows as locked after 3 attempts.</p>",
    author: "Chris Evans",
    createdAt: "2026-06-02T09:00:00Z",
    updatedAt: "2026-07-10T09:00:00Z",
    views: 214,
    helpful: 41,
    notHelpful: 3,
  },
  {
    id: "KB-02",
    title: "Requesting withholding tax certificates",
    category: "Billing",
    audience: "Client-facing",
    status: "Published",
    tags: ["billing", "tax", "certificates"],
    body: "<p>Withholding tax (WHT) certificates can be requested for any settled invoice.</p><p>Please provide the invoice number(s) and the tax year. Certificates are issued within 3 business days via the client portal.</p>",
    author: "Ana Rodriguez",
    createdAt: "2026-05-14T09:00:00Z",
    updatedAt: "2026-05-14T09:00:00Z",
    views: 132,
    helpful: 27,
    notHelpful: 1,
  },
  {
    id: "KB-03",
    title: "SLA escalation matrix (internal)",
    category: "Process",
    audience: "Internal",
    status: "Published",
    tags: ["sla", "escalation", "process"],
    body: "<p>SLA breach handling:</p><ul><li><b>75% elapsed</b> — warning banner shown on the ticket, agent notified.</li><li><b>90% elapsed</b> — automatic escalation email to the team lead.</li><li><b>100% elapsed</b> — breach logged against the client health score; PMO notified for Tier 1 clients.</li></ul>",
    author: "Sarah Chen",
    createdAt: "2026-04-20T09:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z",
    views: 88,
    helpful: 19,
    notHelpful: 0,
  },
  {
    id: "KB-04",
    title: "Converting a ticket into a mandate",
    category: "Process",
    audience: "Internal",
    status: "Published",
    tags: ["mandate", "conversion", "new work"],
    body: "<p>When a ticket turns into billable new work:</p><ol><li>Use <b>Convert to mandate</b> on the ticket.</li><li>Confirm the fee structure and assign a manager.</li><li>Logged ticket time transfers automatically into the mandate's time entries.</li></ol>",
    author: "Michael Torres",
    createdAt: "2026-03-11T09:00:00Z",
    updatedAt: "2026-03-11T09:00:00Z",
    views: 61,
    helpful: 12,
    notHelpful: 2,
  },
  {
    id: "KB-05",
    title: "Handling WhatsApp channel tickets",
    category: "Process",
    audience: "Internal",
    status: "Published",
    tags: ["whatsapp", "channel", "response"],
    body: "<p>WhatsApp tickets default to a 4h SLA regardless of priority tag, since clients expect near real-time response on this channel.</p><p>Always confirm receipt within 15 minutes, even if the full resolution will take longer.</p>",
    author: "David Park",
    createdAt: "2026-06-22T09:00:00Z",
    updatedAt: "2026-06-22T09:00:00Z",
    views: 47,
    helpful: 9,
    notHelpful: 1,
  },
  {
    id: "KB-06",
    title: "Explaining trust account drawdowns to clients",
    category: "Billing",
    audience: "Client-facing",
    status: "Draft",
    tags: ["trust", "billing", "drawdown"],
    body: "<p>Trust drawdowns are processed against approved invoices only. A drawdown notice is sent via the portal at the same time as the invoice, showing the remaining trust balance.</p>",
    author: "Ana Rodriguez",
    createdAt: "2026-07-25T09:00:00Z",
    updatedAt: "2026-07-25T09:00:00Z",
    views: 3,
    helpful: 0,
    notHelpful: 0,
  },
];

const listeners = new Set<() => void>();

function persist() {
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getArticles(): KbArticle[] {
  return articles;
}

export function getCategories(): string[] {
  return categories;
}

export function useKbArticles(): KbArticle[] {
  return useSyncExternalStore(subscribe, getArticles, getArticles);
}

export function useKbCategories(): string[] {
  return useSyncExternalStore(subscribe, getCategories, getCategories);
}

export function addCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed || categories.includes(trimmed)) return;
  categories = [...categories, trimmed];
  persist();
}

export function saveArticle(article: KbArticle) {
  const exists = articles.some((a) => a.id === article.id);
  articles = exists
    ? articles.map((a) =>
        a.id === article.id
          ? { ...article, updatedAt: new Date().toISOString() }
          : a,
      )
    : [{ ...article, updatedAt: new Date().toISOString() }, ...articles];
  if (!categories.includes(article.category)) {
    categories = [...categories, article.category];
  }
  persist();
}

export function deleteArticle(id: string) {
  articles = articles.filter((a) => a.id !== id);
  persist();
}

export function setArticleStatus(id: string, status: KbStatus) {
  articles = articles.map((a) =>
    a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a,
  );
  persist();
}

export function recordView(id: string) {
  articles = articles.map((a) =>
    a.id === id ? { ...a, views: a.views + 1 } : a,
  );
  persist();
}

export function voteArticle(id: string, helpful: boolean) {
  articles = articles.map((a) =>
    a.id === id
      ? helpful
        ? { ...a, helpful: a.helpful + 1 }
        : { ...a, notHelpful: a.notHelpful + 1 }
      : a,
  );
  persist();
}

export function newArticleId(): string {
  const nums = articles
    .map((a) => Number(a.id.replace("KB-", "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `KB-${String(next).padStart(2, "0")}`;
}

export function suggestArticles(query: string, audience?: KbAudience, limit = 3): KbArticle[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  return articles
    .filter((a) => a.status === "Published" && (!audience || a.audience === audience))
    .map((a) => {
      const hay = `${a.title} ${a.category} ${a.tags.join(" ")}`.toLowerCase();
      const score = words.reduce((s, w) => (hay.includes(w) ? s + 1 : s), 0);
      return { a, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
}
