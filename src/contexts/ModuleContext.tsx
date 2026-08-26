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

const moduleIdKey = (userId: string) => `activeModuleId:${userId}`;

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
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const currentModule =
    modules.find((m) => m.id === currentModuleId) ?? modules[0] ?? null;

  const fetchDashboard = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoadingDashboard(true);
    try {
      const res = await api.get("/tenant/dashboard");
      const data = res.data?.data ?? res.data;

      setDashboardData(data);
      setSubscription(data.subscription ?? null);

      const subscribedKeys: string[] = data.subscription?.activeModules ?? [];
      const grantedKeys: string[] = user.accessibleModules ?? [];
      const activeKeys = subscribedKeys.filter((key) =>
        grantedKeys.includes(key),
      );
      const built = activeKeys.map((key) => toModuleDefinition(key));

      setModules(built);

      const persisted = localStorage.getItem(moduleIdKey(user.id));
      const restored =
        persisted && built.some((m) => m.id === persisted)
          ? persisted
          : (built[0]?.id ?? null);
      if (restored) {
        setCurrentModuleId(restored);
        localStorage.setItem(moduleIdKey(user.id), restored);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      if (!silent) setIsLoadingDashboard(false);
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

  // Real-time refresh — re-pulls the dashboard silently every 45s so
  // counts and the attention feed reflect what's actually happening
  // elsewhere in the app without the user reloading. Silent means no
  // loading spinner and no module-list flicker on every tick.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 45_000);
    return () => clearInterval(interval);
  }, [user]);

  const setModule = (id: string) => {
    if (modules.some((m) => m.id === id)) {
      setCurrentModuleId(id);
      if (user) localStorage.setItem(moduleIdKey(user.id), id);
    }
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
