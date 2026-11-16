import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckSquare,
  History,
  Landmark,
  Lock,
  Palette,
  Receipt,
  Settings2,
  Percent,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceSettings } from "./settings/shared";
import GeneralTab from "./settings/GeneralTab";
import TaxTab from "./settings/TaxTab";
import InvoicingTab from "./settings/InvoicingTab";
import ApprovalsTab from "./settings/ApprovalsTab";
import BankAccountsTab from "./settings/BankAccountsTab";
import BrandingTab from "./settings/BrandingTab";
import ChangeLogTab from "./settings/ChangeLogTab";

const TABS = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "tax", label: "Tax", icon: Percent },
  { value: "invoicing", label: "Invoicing", icon: Receipt },
  { value: "approvals", label: "Approvals", icon: CheckSquare },
  { value: "bank-accounts", label: "Bank Accounts", icon: Landmark },
  { value: "branding", label: "Document Branding", icon: Palette },
  { value: "log", label: "Change Log", icon: History },
] as const;

/**
 * Finance → Settings. Owner-only: these defaults drive every invoice,
 * receipt, quote, purchase order and payslip the firm issues, so they are
 * not something a finance employee changes.
 */
export default function FinanceSettings() {
  const { user } = useAuth();
  const isOwner = user?.userType === "tenant";
  const [params, setParams] = useSearchParams();
  const valid = useMemo(() => new Set<string>(TABS.map((t) => t.value)), []);
  const requested = params.get("tab") ?? "general";
  const active = valid.has(requested) ? requested : "general";
  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };
  // Prime the cache once so every tab opens with data.
  const { isLoading, isError } = useFinanceSettings(isOwner);

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Finance settings</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Only the account owner can view and change finance settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Settings</h1>
        <p className="text-sm text-muted-foreground">
          Defaults for tax, invoicing, approvals, bank accounts and how every
          financial document looks.
        </p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          Could not load finance settings. Refresh and try again.
        </p>
      )}

      <Tabs value={active} onValueChange={setTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                <t.icon className="mr-2 h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <TabsContent value="general"><GeneralTab /></TabsContent>
            <TabsContent value="tax"><TaxTab /></TabsContent>
            <TabsContent value="invoicing"><InvoicingTab /></TabsContent>
            <TabsContent value="approvals"><ApprovalsTab /></TabsContent>
            <TabsContent value="bank-accounts"><BankAccountsTab /></TabsContent>
            <TabsContent value="branding"><BrandingTab /></TabsContent>
            <TabsContent value="log"><ChangeLogTab /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
