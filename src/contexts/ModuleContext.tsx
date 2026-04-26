import { createContext, useContext, useState, ReactNode } from "react";
import { ShieldCheck, Scale, Briefcase, Users } from "lucide-react";

export type ModuleId = "aml" | "grc" | "crm" | "hr";

export interface ModuleDef {
  id: ModuleId;
  name: string;
  shortName: string;
  scope: string;
  icon: typeof ShieldCheck;
  color: string;
}

export const MODULES: ModuleDef[] = [
  {
    id: "aml",
    name: "AML/KYC Compliance",
    shortName: "AML/KYC",
    scope: "Regulatory cornerstone for BNR-licensed TCSPs",
    icon: ShieldCheck,
    color: "from-blue-600 to-blue-800",
  },
  {
    id: "grc",
    name: "Governance, Risk & Compliance",
    shortName: "GRC",
    scope: "Enterprise risk management aligned to ISO 31000 & COSO",
    icon: Scale,
    color: "from-purple-600 to-purple-800",
  },
  {
    id: "crm",
    name: "CRM & Project Management",
    shortName: "CRM & Projects",
    scope: "Complete client lifecycle management",
    icon: Briefcase,
    color: "from-indigo-600 to-indigo-800",
  },
  {
    id: "hr",
    name: "Human Resources & People",
    shortName: "HR & People",
    scope: "Full employee lifecycle with multi-jurisdiction payroll",
    icon: Users,
    color: "from-violet-600 to-violet-800",
  },
];

interface ModuleContextType {
  currentModule: ModuleDef;
  setModule: (id: ModuleId) => void;
  modules: ModuleDef[];
}

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [moduleId, setModuleId] = useState<ModuleId>("crm");
  const currentModule = MODULES.find((m) => m.id === moduleId)!;
  return (
    <ModuleContext.Provider
      value={{ currentModule, setModule: setModuleId, modules: MODULES }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModule must be within ModuleProvider");
  return ctx;
}
