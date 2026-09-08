import {
  BriefcaseBusiness,
  Landmark,
  Scale,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface ModuleEntry {
  number: string;
  name: string;
  short: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export const modules: ModuleEntry[] = [
  {
    number: "01",
    name: "Lexora AML/KYC",
    short: "Client onboarding, screening, risk scoring, regulatory reporting",
    description:
      "Client onboarding, customer due diligence, enhanced due diligence, risk scoring, sanctions screening, PEP checks, suspicious transaction reporting, watchlist management, compliance alerts, and regulatory reporting.",
    icon: ShieldCheck,
    features: [
      "Onboarding & CDD",
      "Enhanced due diligence",
      "Risk engine & scoring",
      "Transaction monitoring",
      "SAR / STR filing",
      "Watchlist management",
      "Sanctions screening",
      "PEP checks",
      "Compliance alerts",
      "Reporting & analytics",
    ],
  },
  {
    number: "02",
    name: "Lexora Projects (CRM)",
    short: "CRM, project management, ADR, contract lifecycle management",
    description:
      "Client relationship management, project delivery, case management and ADR, contract lifecycle management with a full document builder, and integrated calendar and task management.",
    icon: BriefcaseBusiness,
    features: [
      "CRM & client management",
      "Mandates & projects",
      "Tasks & Gantt planning",
      "Timesheets",
      "Service desk",
      "ADR & litigation",
      "PMO",
      "Contract lifecycle (CLM)",
      "Clause library & templates",
      "Tools & calendar",
    ],
  },
  {
    number: "03",
    name: "Lexora Finance",
    short: "Accounting, billing, trust and fund accounting, management reporting",
    description:
      "Sales, billing and invoicing, purchases, banking, tax, accounting with general ledger, trust accounting with ring-fenced client accounts, fund accounting with capital calls, distributions, NAV, and LP reporting.",
    icon: Landmark,
    features: [
      "Financials dashboard",
      "Management reporting",
      "Sales & billing",
      "Invoicing",
      "Purchases",
      "Banking & reconciliation",
      "Tax management",
      "Accounting & GL",
      "Asset register",
      "Budgeting & forecasting",
      "Trust accounting",
      "Fund accounting & LP portal",
    ],
  },
  {
    number: "04",
    name: "Lexora GRC",
    short: "Governance, risk, compliance, ESG, board management, deal management",
    description:
      "Governance codes with a built-in drafting editor and clause library, board and committee management, risk register with heat map, policy and procedure management, ESG framework alignment, deal and transaction management, and the GRC Health Score.",
    icon: Scale,
    features: [
      "Compliance management",
      "Policies & certifications",
      "Audit & regulatory change",
      "Governance codes & editor",
      "Board & committee mgt",
      "Meetings & resolutions",
      "Deals & transactions",
      "Deal room & data room",
      "Risk register & heat map",
      "Risk appetite & emerging risks",
      "Controls, testing & BCP",
      "Third-party & incidents",
      "Deal intelligence",
      "Company valuation",
      "Investor readiness",
      "Portfolio analysis",
      "ESG dashboard",
      "Materiality & reporting",
      "Legal knowledge base",
    ],
  },
  {
    number: "05",
    name: "Lexora HR",
    short: "HRIS, payroll, leave, performance, recruitment, people analytics",
    description:
      "Human resource information system, payroll management, leave and attendance, performance reviews, recruitment pipeline, onboarding workflows, organisational structure, and people analytics.",
    icon: UsersRound,
    features: [
      "HR overview & analytics",
      "Employee management",
      "Probation tracking",
      "Recruitment & hiring",
      "Contracts & letters",
      "Time & attendance",
      "Leave management",
      "Performance reviews",
      "Payroll & benefits",
      "Learning & development",
      "Disputes & grievances",
      "Requisitions & offboarding",
    ],
  },
];

export const pillars = [
  {
    title: "People",
    copy: "Clients, directors, investors, shareholders, regulators, and management at the centre of every workflow.",
  },
  {
    title: "Projects",
    copy: "End-to-end mandates with defined scopes, timelines, and deliverables that eliminate handoff gaps.",
  },
  {
    title: "Processes",
    copy: "Institutional knowledge codified into repeatable, auditable workflows that ensure operational continuity.",
  },
  {
    title: "Performance",
    copy: "Actionable metrics including the proprietary GRC Health Score that quantifies organisational health.",
  },
];

export const testimonials = [
  {
    quote:
      "Lexora gave us the structure we needed to go from informal processes to a governance framework that our investors actually trust.",
    name: "Amara K.",
    role: "Managing Director, East Africa Fund",
  },
  {
    quote:
      "Having compliance, finance, and board management in one system changed how our board operates entirely.",
    name: "David M.",
    role: "Board Chair, Kigali Microfinance",
  },
  {
    quote:
      "The GRC Health Score is something we now report to our board quarterly. It turns abstract governance into a number.",
    name: "Grace N.",
    role: "Company Secretary",
  },
];

export const plans = [
  {
    name: "Lexora Lite",
    blurb: "For small teams laying the governance foundation.",
    price: 150,
    seats: "Up to 5 users",
    cta: "Get started",
    highlight: false,
    perks: [
      "All 5 modules",
      "Every feature included",
      "GRC Health Score",
      "Client & LP portals",
      "Email support",
      "Standard onboarding",
    ],
  },
  {
    name: "Lexora Grow",
    blurb: "For growing organisations building operational maturity.",
    price: 250,
    seats: "Up to 10 users",
    cta: "Get started",
    highlight: true,
    perks: [
      "All 5 modules",
      "Every feature included",
      "GRC Health Score",
      "Client & LP portals",
      "Priority support",
      "Guided onboarding",
    ],
  },
  {
    name: "Lexora Enterprise",
    blurb: "For established organisations and regulated entities.",
    price: 400,
    seats: "Up to 20 users",
    cta: "Get started",
    highlight: false,
    perks: [
      "All 5 modules",
      "Every feature included",
      "GRC Health Score",
      "Client & LP portals",
      "Dedicated account manager",
      "White-glove onboarding",
    ],
  },
  {
    name: "Custom",
    blurb: "For institutions, funds, and large-scale deployments.",
    price: null,
    seats: "20+ users · tailored terms",
    cta: "Contact sales",
    highlight: false,
    perks: [
      "All 5 modules",
      "Unlimited users",
      "Custom integrations",
      "SLA with 99.9% uptime",
      "Advisory & training included",
      "White-label option",
    ],
  },
];

export const pricingFaq = [
  {
    q: "Why is pricing based on team size, not features?",
    a: "Because feature gates create friction. A five-person team needs the same governance tools as a fifty-person team. Pricing by team size keeps the platform accessible while scaling fairly as your organisation grows.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade at any time. Changes take effect immediately on upgrade and at the end of the billing cycle on downgrade.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan comes with a 7-day free trial with full access to all modules and features. No credit card required to start.",
  },
  {
    q: "Where is my data hosted?",
    a: "Secure, encrypted cloud infrastructure with 256-bit AES encryption at rest and in transit. Enterprise and Custom clients can request dedicated hosting or region-specific data residency.",
  },
];

export const solutions = [
  {
    title: "For boards and directors",
    copy: "Board management, governance code builder, committee mandates, meeting packs, resolution tracking, skills matrix, independence monitoring, and ESG framework alignment.",
  },
  {
    title: "For regulated entities",
    copy: "AML/KYC compliance, policy management, regulatory filing calendar, risk register, compliance monitoring, incident reporting, and full audit trail.",
  },
  {
    title: "For fund administrators",
    copy: "Capital accounts, capital call workflows, distribution waterfalls, NAV and valuation, multi-currency FX engine, LP portal, compliance dashboards, and scenario modelling.",
  },
  {
    title: "For professional services",
    copy: "Client lifecycle management, project delivery, time tracking, billing, trust accounting, contract management, case management and ADR, and utilisation dashboards.",
  },
  {
    title: "For SMEs scaling up",
    copy: "Operational structure, compliance foundation, deal room and data room, valuation management, ESG management, governance frameworks, finance, HR, and project management in a single platform that grows with the organisation.",
  },
  {
    title: "For parastatals and public entities",
    copy: "Corporate governance framework implementation, board effectiveness, risk governance, compliance reporting, and stakeholder transparency.",
  },
];

export const advisoryServices = [
  {
    title: "Governance framework design",
    copy: "Board charters, governance codes, delegation of authority frameworks, and committee mandates aligned to international best practice and local regulatory requirements.",
  },
  {
    title: "Compliance programme build",
    copy: "AML/KYC programmes, policy frameworks, regulatory filing calendars, and compliance monitoring structures designed for your regulatory environment.",
  },
  {
    title: "Organisational health assessment",
    copy: "A structured diagnostic across governance, risk, compliance, operations, and finance that produces a baseline GRC Health Score and a prioritised action plan.",
  },
  {
    title: "Deal and transaction advisory",
    copy: "M&A structuring, cross-border transactions, term sheet negotiation, due diligence coordination, and post-completion integration support.",
  },
];

export const trainingProgrammes = [
  {
    title: "Board effectiveness programmes",
    copy: "Structured workshops for directors covering fiduciary duties, governance best practice, risk oversight, and effective board dynamics.",
  },
  {
    title: "Regulatory reform briefings",
    copy: "Targeted sessions on new and evolving regulatory requirements. Quarterly cadence available with jurisdiction-specific content.",
  },
  {
    title: "Compliance training",
    copy: "AML/KYC, data protection, anti-bribery, and whistleblower awareness training for staff at all levels. Tracked in the Lexora platform.",
  },
  {
    title: "GGA webinar series",
    copy: "Governing for Growth: Board Excellence in partnership with the Good Governance Academy. A quarterly programme for directors and governance professionals.",
  },
];

export interface Article {
  category: string;
  title: string;
  excerpt: string;
  read: string;
  date: string;
  featured?: boolean;
}

export const articles: Article[] = [
  {
    category: "Governance",
    title: "Why African businesses need native governance infrastructure",
    excerpt:
      "The case for building compliance platforms designed around how African organisations actually operate, rather than adapting tools built for other markets.",
    read: "8 min read",
    date: "August 2026",
    featured: true,
  },
  {
    category: "Governance",
    title: "The GRC Health Score: quantifying organisational governance",
    excerpt:
      "How a single composite metric can transform board conversations from abstract governance discussions into data-driven decisions.",
    read: "6 min read",
    date: "July 2026",
    featured: true,
  },
  {
    category: "Compliance",
    title: "AML compliance in East Africa: building programmes that survive regulatory change",
    excerpt:
      "A practical guide to designing AML/KYC frameworks that are robust enough to adapt as regulations evolve across Rwanda, Kenya, Uganda, and Tanzania.",
    read: "5 min read",
    date: "August 2026",
  },
  {
    category: "Fund Administration",
    title: "Capital call default management: protecting the fund when an LP fails to pay",
    excerpt:
      "The mechanics of default notices, cure periods, interest calculations, and forfeiture provisions that every fund administrator needs to understand.",
    read: "7 min read",
    date: "July 2026",
  },
  {
    category: "Governance",
    title: "Board composition in African enterprises: independence, skills gaps, and succession",
    excerpt:
      "Why independence percentages alone do not make a board effective, and how skills matrices and term tracking create genuinely effective boards.",
    read: "6 min read",
    date: "July 2026",
  },
  {
    category: "ESG",
    title: "ESG frameworks for African markets: moving beyond checkbox compliance",
    excerpt:
      "How to connect ESG reporting to your governance infrastructure so the framework score reflects reality, not a parallel data entry exercise.",
    read: "5 min read",
    date: "June 2026",
  },
  {
    category: "Risk",
    title: "Risk appetite statements that actually mean something",
    excerpt:
      "Most risk appetite statements are too vague to enforce. Here is how to write thresholds that your board can monitor and your management can act on.",
    read: "4 min read",
    date: "June 2026",
  },
  {
    category: "Technology",
    title: "From spreadsheets to systems: the case for unified business platforms in Africa",
    excerpt:
      "Why fragmented tools create operational fragility, and how a unified platform changes the economics of compliance for growing businesses.",
    read: "5 min read",
    date: "May 2026",
  },
];

export const articleCategories = [
  "All",
  "Governance",
  "Compliance",
  "Risk",
  "Fund Administration",
  "ESG",
  "Technology",
];
