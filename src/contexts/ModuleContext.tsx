// import {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   ReactNode,
// } from "react";
// import {
//   Shield,
//   Database,
//   Globe,
//   Zap,
//   Briefcase,
//   BarChart3,
//   Boxes,
//   LucideIcon,
// } from "lucide-react";
// import { api } from "@/lib/api";
// import { useAuth } from "./AuthContext";

// // ─── Master module registry ───────────────────────────────────
// // Keys must match what the backend stores in activeModules[]
// export interface ModuleDefinition {
//   id: string; // matches backend key exactly e.g. "kyc/aml"
//   name: string;
//   shortName: string;
//   scope: string;
//   icon: LucideIcon;
//   color: string; // tailwind gradient classes
// }

// export const MODULE_REGISTRY: ModuleDefinition[] = [
//   {
//     id: "kyc/aml",
//     name: "AML / KYC Compliance",
//     shortName: "AML/KYC",
//     scope:
//       "Client onboarding, screening, risk scoring and regulatory reporting",
//     icon: Shield,
//     color: "from-rose-500 to-orange-500",
//   },
//   {
//     id: "grc",
//     name: "Governance, Risk & Compliance",
//     shortName: "GRC",
//     scope:
//       "Risk register, controls library, policies, audits and incident management",
//     icon: Database,
//     color: "from-violet-500 to-purple-600",
//   },
//   {
//     id: "crm",
//     name: "Client Relationship Management",
//     shortName: "CRM",
//     scope: "Client lifecycle, projects, billing, contracts and e-signatures",
//     icon: Globe,
//     color: "from-blue-500 to-cyan-500",
//   },
//   {
//     id: "hr",
//     name: "Human Resources",
//     shortName: "HR",
//     scope: "HRIS, payroll, leave, performance and recruitment",
//     icon: Briefcase,
//     color: "from-emerald-500 to-teal-500",
//   },
//   {
//     id: "billing",
//     name: "Billing & Finance",
//     shortName: "Billing",
//     scope: "Invoices, payments and financial reporting",
//     icon: BarChart3,
//     color: "from-amber-500 to-yellow-500",
//   },
//   {
//     id: "documents",
//     name: "Document Management",
//     shortName: "Docs",
//     scope: "Document storage, versioning and e-signatures",
//     icon: Zap,
//     color: "from-indigo-500 to-blue-600",
//   },
// ];

// // ─── Subscription info from dashboard API ────────────────────
// export interface SubscriptionInfo {
//   plan: string;
//   status: string;
//   activeModules: string[];
//   trialEndsAt: string | null;
//   currentPeriodEnd: string | null;
// }

// interface ModuleContextType {
//   // available modules — filtered to what the tenant has access to
//   modules: ModuleDefinition[];
//   currentModule: ModuleDefinition;
//   setModule: (id: string) => void;
//   subscription: SubscriptionInfo | null;
//   dashboardData: any | null;
//   isLoadingDashboard: boolean;
//   refetchDashboard: () => void;
// }

// const FALLBACK_MODULE: ModuleDefinition = {
//   id: "kyc/aml",
//   name: "AML / KYC Compliance",
//   shortName: "AML/KYC",
//   scope: "Client onboarding and compliance",
//   icon: Shield,
//   color: "from-rose-500 to-orange-500",
// };

// const ModuleContext = createContext<ModuleContextType | null>(null);

// export function ModuleProvider({ children }: { children: ReactNode }) {
//   const { user } = useAuth();

//   const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
//     null,
//   );
//   const [dashboardData, setDashboardData] = useState<any | null>(null);
//   const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
//   const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

//   // ── Derive available modules from subscription ────────────
//   const modules: ModuleDefinition[] = subscription?.activeModules.length
//     ? MODULE_REGISTRY.filter((m) => subscription.activeModules.includes(m.id))
//     : [];

//   const currentModule: ModuleDefinition =
//     modules.find((m) => m.id === currentModuleId) ??
//     modules[0] ??
//     FALLBACK_MODULE;

//   // ── Fetch dashboard ───────────────────────────────────────
//   const fetchDashboard = async () => {
//     if (!user) return;
//     setIsLoadingDashboard(true);
//     try {
//       const res = await api.get("/tenant/dashboard");
//       const data = res.data.data;
//       setDashboardData(data);
//       setSubscription(data.subscription);

//       // Auto-select first available module if none selected
//       if (!currentModuleId && data.subscription?.activeModules?.length) {
//         setCurrentModuleId(data.subscription.activeModules[0]);
//       }
//     } catch (err) {
//       console.error("Failed to fetch dashboard:", err);
//     } finally {
//       setIsLoadingDashboard(false);
//     }
//   };

//   useEffect(() => {
//     if (user) fetchDashboard();
//     else {
//       setSubscription(null);
//       setDashboardData(null);
//     }
//   }, [user]);

//   const setModule = (id: string) => {
//     if (modules.some((m) => m.id === id)) setCurrentModuleId(id);
//   };

//   return (
//     <ModuleContext.Provider
//       value={{
//         modules,
//         currentModule,
//         setModule,
//         subscription,
//         dashboardData,
//         isLoadingDashboard,
//         refetchDashboard: fetchDashboard,
//       }}
//     >
//       {children}
//     </ModuleContext.Provider>
//   );
// }

// export function useModule() {
//   const ctx = useContext(ModuleContext);
//   if (!ctx) throw new Error("useModule must be used within ModuleProvider");
//   return ctx;
// }

// // Keep MODULES export for any legacy references
// export const MODULES = MODULE_REGISTRY;

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  Shield,
  Database,
  Globe,
  Briefcase,
  Box,
  LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ModuleDefinition {
  id: string;
  name: string;
  shortName: string;
  scope: string;
  icon: LucideIcon;
  color: string;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  activeModules: string[];
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface ModuleContextType {
  modules: ModuleDefinition[];
  currentModule: ModuleDefinition | null;
  setModule: (id: string) => void;
  subscription: SubscriptionInfo | null;
  dashboardData: any | null;
  isLoadingDashboard: boolean;
  refetchDashboard: () => void;
}

// ─────────────────────────────────────────────────────────────
// VISUALS MAP
// Maps backend module keys to icon + color + display info.
// Keys MUST match exactly what SuperAdmin saves in the DB.
// Unknown keys get a generic fallback — never silently hidden.
// ─────────────────────────────────────────────────────────────

const MODULE_VISUALS: Record<
  string,
  {
    icon: LucideIcon;
    color: string;
    shortName: string;
    name: string;
    scope: string;
  }
> = {
  kyc_aml: {
    icon: Shield,
    color: "from-rose-500 to-orange-500",
    shortName: "AML/KYC",
    name: "AML / KYC Compliance",
    scope:
      "Client onboarding, screening, risk scoring and regulatory reporting",
  },
  grc: {
    icon: Database,
    color: "from-violet-500 to-purple-600",
    shortName: "GRC",
    name: "Governance, Risk & Compliance",
    scope:
      "Risk register, controls library, policies, audits and incident management",
  },
  crm: {
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
    shortName: "CRM",
    name: "Client Relationship Management",
    scope: "Client lifecycle, projects, billing, contracts and e-signatures",
  },
  hr_pm: {
    icon: Briefcase,
    color: "from-emerald-500 to-teal-500",
    shortName: "HR",
    name: "Human Resources & People Management",
    scope: "HRIS, payroll, leave, performance and recruitment",
  },
  // Legacy key variants
  "kyc/aml": {
    icon: Shield,
    color: "from-rose-500 to-orange-500",
    shortName: "AML/KYC",
    name: "AML / KYC Compliance",
    scope:
      "Client onboarding, screening, risk scoring and regulatory reporting",
  },
  hr: {
    icon: Briefcase,
    color: "from-emerald-500 to-teal-500",
    shortName: "HR",
    name: "Human Resources",
    scope: "HRIS, payroll, leave, performance and recruitment",
  },
};

const FALLBACK_VISUALS = {
  icon: Box,
  color: "from-slate-500 to-gray-600",
  shortName: "Module",
  name: "Platform Module",
  scope: "Platform module",
};

function toModuleDefinition(key: string, dbName?: string): ModuleDefinition {
  const visuals = MODULE_VISUALS[key] ?? FALLBACK_VISUALS;
  return {
    id: key,
    name: dbName || visuals.name,
    shortName: visuals.shortName,
    scope: visuals.scope,
    icon: visuals.icon,
    color: visuals.color,
  };
}

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const currentModule =
    modules.find((m) => m.id === currentModuleId) ?? modules[0] ?? null;

  const fetchDashboard = async () => {
    if (!user) return;
    setIsLoadingDashboard(true);
    try {
      const res = await api.get("/tenant/dashboard");
      const data = res.data?.data ?? res.data;

      setDashboardData(data);
      setSubscription(data.subscription ?? null);

      // Build modules from whatever keys the DB returns — no filtering
      const activeKeys: string[] = data.subscription?.activeModules ?? [];
      const built = activeKeys.map((key) => toModuleDefinition(key));

      setModules(built);

      if (!currentModuleId && built.length > 0) {
        setCurrentModuleId(built[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
    } else {
      setModules([]);
      setSubscription(null);
      setDashboardData(null);
      setCurrentModuleId(null);
    }
  }, [user]);

  const setModule = (id: string) => {
    if (modules.some((m) => m.id === id)) setCurrentModuleId(id);
  };

  return (
    <ModuleContext.Provider
      value={{
        modules,
        currentModule,
        setModule,
        subscription,
        dashboardData,
        isLoadingDashboard,
        refetchDashboard: fetchDashboard,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModule must be used within ModuleProvider");
  return ctx;
}

// Legacy exports — kept so existing imports don't break
export const MODULE_REGISTRY: ModuleDefinition[] = [];
export const MODULES: ModuleDefinition[] = [];
