// Route table for the public marketing site. Each entry maps a URL to one of
// the static HTML views in ./views (ported from the PO's reference site).

export interface SiteView {
  /** id of the view's root element (the PO's section ids; CSS targets them) */
  id: string;
  /** file name (without extension) in ./views, or null for React pages */
  file: string | null;
  path: string;
  title: string;
  /** extra classes on the view wrapper ("sector", "svcp", ...) */
  classes?: string;
  /** heading and sub-line of the closing call-to-action band */
  cta?: string;
  sub?: string;
  noCta?: boolean;
}

const DEFAULT_CTA = "Start building your governance infrastructure";
const DEFAULT_SUB =
  "Whether you are exploring the platform, need advisory support, or want a personalised walkthrough, we are here.";
const ADVISORY_SUB = "Talk to our advisory team about your organisation.";

export const homeView: SiteView = {
  id: "view-home",
  file: "view-home",
  path: "/",
  title: "Governance, Risk and Compliance Platform",
  cta: "Ready to lead with governance?",
  sub: "See how Lexora fits your organisation.",
};

const platformView: SiteView = {
  id: "platform",
  file: "platform",
  path: "/platform",
  title: "Platform",
  cta: "Ready to be Lexora certified?",
  sub: "See how Lexora fits your organisation.",
};

const pricingView: SiteView = {
  id: "pricing",
  file: "pricing",
  path: "/pricing",
  title: "Pricing",
  cta: "Not sure which plan fits?",
  sub: "Talk to our team and we will help you find the right size.",
};

const industriesView: SiteView = {
  id: "industries",
  file: "industries",
  path: "/industries",
  title: "Industries",
  cta: "Ready to see Lexora in your sector?",
  sub: "See how Lexora fits your organisation.",
};

// [url slug, view id, display name, closing call-to-action]
const sectorRows: [string, string, string, string][] = [
  [
    "professional-services",
    "sec-ps",
    "Professional Services",
    "Ready to run your practice on Lexora?",
  ],
  [
    "project-companies",
    "sec-proj",
    "Project Companies",
    "Ready to deliver projects with precision?",
  ],
  ["epcm", "sec-epcm", "EPCM", "Build with confidence. Manage with precision."],
  ["real-estate", "sec-re", "Real Estate", "Ready to govern your portfolio?"],
  [
    "manufacturing",
    "sec-mfg",
    "Manufacturing",
    "Ready to govern your operations?",
  ],
  [
    "natural-resources",
    "sec-nr",
    "Natural Resources",
    "Ready to build governance into your operations?",
  ],
  [
    "trade-distribution",
    "sec-trade",
    "Trade & Logistics",
    "Ready to govern your trade operations?",
  ],
  [
    "service-businesses",
    "sec-svc",
    "Service-Focused Teams",
    "Ready to deliver service excellence?",
  ],
  [
    "financial-services",
    "sec-fs",
    "Financial Services",
    "Ready to professionalise your compliance?",
  ],
  [
    "smes",
    "sec-sme",
    "SMEs & Growth-Stage Companies",
    "Ready to scale with structure?",
  ],
  [
    "investment-advisory",
    "sec-inv",
    "Investment & Transaction Teams",
    "Ready to close deals with confidence?",
  ],
  [
    "fund-managers",
    "sec-fund",
    "Fund Managers & Private Equity",
    "Ready to professionalise your fund operations?",
  ],
  [
    "technology",
    "sec-tech",
    "Technology Teams",
    "Ready to outgrow your project board?",
  ],
];

const advisoryRows: [string, string, string, string][] = [
  [
    "governance-advisory",
    "svc-gov",
    "Governance advisory",
    "Ready to build your governance framework?",
  ],
  [
    "risk-compliance",
    "svc-risk",
    "Risk and compliance",
    "Ready to professionalise your risk management?",
  ],
  [
    "corporate-structuring",
    "svc-struct",
    "Corporate structuring",
    "Ready to structure your next vehicle?",
  ],
  [
    "transaction-support",
    "svc-deal",
    "Transaction support",
    "Ready to close your next transaction?",
  ],
  [
    "good-governance-academy",
    "trn-gga",
    "Good Governance Academy",
    "Learn more about the Good Governance Academy",
  ],
  [
    "board-director-training",
    "trn-board",
    "Board and director training",
    "Ready to elevate your board?",
  ],
  [
    "risk-compliance-training",
    "trn-risk",
    "Risk & compliance training",
    "Ready to upskill your risk and compliance team?",
  ],
];

const advisoryView: SiteView = {
  id: "advisory",
  file: "advisory",
  path: "/advisory",
  title: "Advisory & Training",
  classes: "sector",
  cta: "Ready to build governance capacity?",
  sub: "See how Lexora fits your organisation.",
};

const profileRows: [string, string, string][] = [
  ["rudo", "prof-rudo", "Rudo Barbra Sibanda"],
  ["juliet", "prof-juliet", "Juliet Kelechi"],
  ["ivy", "prof-ivy", "Ivy Kibaara"],
];

export const sectorViews: Record<string, SiteView> = Object.fromEntries(
  sectorRows.map(([slug, id, name, cta]) => [
    slug,
    {
      id,
      file: id,
      path: `/industries/${slug}`,
      title: name,
      classes: "sector",
      cta,
    },
  ]),
);

export const advisoryViews: Record<string, SiteView> = Object.fromEntries(
  advisoryRows.map(([slug, id, name, cta]) => [
    slug,
    {
      id,
      file: id,
      path: `/advisory/${slug}`,
      title: name,
      classes: "sector svcp",
      cta,
      sub: ADVISORY_SUB,
    },
  ]),
);

export const profileViews: Record<string, SiteView> = Object.fromEntries(
  profileRows.map(([slug, id, name]) => [
    slug,
    {
      id,
      file: id,
      path: `/about/${slug}`,
      title: name,
      classes: "sector profv",
      cta: DEFAULT_CTA,
      sub: "Explore the platform, seek advisory support, or request a tailored walkthrough.",
    },
  ]),
);

export const staticViews: Record<string, SiteView> = {
  platform: platformView,
  pricing: pricingView,
  industries: industriesView,
  advisory: advisoryView,
  events: {
    id: "events",
    file: "events",
    path: "/events",
    title: "Events",
    classes: "sector",
    cta: "Join the GRC conversation",
    sub: "Register your interest in upcoming Lexora Africa events, or talk to us about hosting a session for your board or team.",
  },
  about: {
    id: "about",
    file: "about",
    path: "/about",
    title: "About",
    classes: "sector",
    cta: DEFAULT_CTA,
    sub: DEFAULT_SUB,
  },
};

// React pages (no static view file)
export const insightsView: SiteView = {
  id: "insights",
  file: null,
  path: "/insights",
  title: "Insights",
  classes: "sector",
  cta: DEFAULT_CTA,
  sub: DEFAULT_SUB,
};
export const contactView: SiteView = {
  id: "getintouch",
  file: null,
  path: "/contact",
  title: "Get in touch",
  classes: "sector gt-view",
  noCta: true,
};

export const sectorNames = sectorRows.map(([slug, , name]) => ({ slug, name }));

// Old URLs (from the previous marketing site) -> new slugs, so shared links
// keep working.
export const legacyIndustrySlugs: Record<string, string> = {
  proserv: "professional-services",
  projects: "project-companies",
  realestate: "real-estate",
  natural: "natural-resources",
  trade: "trade-distribution",
  serviceteams: "service-businesses",
  tech: "technology",
  finance: "financial-services",
  sme: "smes",
  investment: "investment-advisory",
  funds: "fund-managers",
};
export const legacyAdvisorySlugs: Record<string, string> = {
  governance: "governance-advisory",
  risk: "risk-compliance",
  structuring: "corporate-structuring",
  transactions: "transaction-support",
  academy: "good-governance-academy",
  amltraining: "risk-compliance-training",
  boardtraining: "board-director-training",
};

/** Look up the view for a pathname (used by the layout for title + CTA). */
export function viewForPath(pathname: string): SiteView | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return homeView;
  if (p === "/insights" || p.startsWith("/insights/")) return insightsView;
  if (p === "/contact") return contactView;
  const seg = p.split("/").filter(Boolean);
  if (seg[0] === "industries" && seg[1])
    return sectorViews[seg[1]] ?? industriesView;
  if (seg[0] === "advisory" && seg[1])
    return advisoryViews[seg[1]] ?? advisoryView;
  if (seg[0] === "about" && seg[1])
    return profileViews[seg[1]] ?? staticViews.about;
  return staticViews[seg[0]] ?? null;
}
