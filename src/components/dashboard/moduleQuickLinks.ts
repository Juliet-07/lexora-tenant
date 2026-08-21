import {
  Users,
  Briefcase,
  ListChecks,
  FileText,
  Mail,
  Gauge,
  Shield,
  ShieldAlert,
  Scale,
  Landmark,
  ClipboardCheck,
  CalendarDays,
  Wallet,
  UserPlus,
  Target,
  Handshake,
  Leaf,
  Activity,
  LucideIcon,
} from "lucide-react";

export interface QuickLink {
  label: string;
  to: string;
  icon: LucideIcon;
}

const CRM_LINKS: QuickLink[] = [
  { label: "Clients", to: "/crm/clients", icon: Users },
  { label: "Mandates", to: "/crm/mandates", icon: Briefcase },
  { label: "Tasks", to: "/crm/tasks", icon: ListChecks },
  { label: "Invoicing", to: "/crm/invoicing", icon: FileText },
  { label: "Newsletter", to: "/crm/newsletter", icon: Mail },
  { label: "Reports", to: "/crm/reports", icon: Gauge },
];

const HR_LINKS: QuickLink[] = [
  { label: "HR Overview", to: "/hr/overview", icon: Gauge },
  { label: "Employees", to: "/hr/employees", icon: Users },
  { label: "Payroll", to: "/hr/payroll", icon: Wallet },
  { label: "Leave", to: "/hr/leave", icon: CalendarDays },
  { label: "Performance", to: "/hr/performance", icon: Target },
  { label: "Recruitment", to: "/hr/recruitment", icon: UserPlus },
];

const GRC_LINKS: QuickLink[] = [
  { label: "GRC Overview", to: "/grc/overview", icon: Gauge },
  { label: "Risk register", to: "/grc/risk/register", icon: ShieldAlert },
  { label: "Obligations", to: "/grc/compliance/obligations", icon: Scale },
  { label: "Board", to: "/grc/governance/board", icon: Landmark },
  { label: "Deals", to: "/grc/deals/pipeline", icon: Handshake },
  { label: "ESG", to: "/grc/esg/dashboard", icon: Leaf },
];

const AML_LINKS: QuickLink[] = [
  { label: "Onboarding", to: "/kyc/onboarding", icon: ClipboardCheck },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Risk engine", to: "/aml/risk", icon: Shield },
  { label: "Transactions", to: "/aml/transactions", icon: Activity },
  { label: "Watchlist", to: "/aml/watchlist", icon: ShieldAlert },
  { label: "Reports", to: "/aml/reports", icon: Gauge },
];

/** Quick links resolved from the active module key. */
export function quickLinksFor(moduleId?: string | null): QuickLink[] {
  switch (moduleId) {
    case "hr_pm":
    case "hr":
      return HR_LINKS;
    case "grc":
      return GRC_LINKS;
    case "kyc_aml":
    case "kyc/aml":
      return AML_LINKS;
    case "crm":
      return CRM_LINKS;
    default:
      return CRM_LINKS;
  }
}
