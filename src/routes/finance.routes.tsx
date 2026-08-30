import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Invoicing from "@/pages/finance/Invoicing";
import TrustAccounting from "@/pages/finance/TrustAccounting";
import Sales from "@/pages/finance/Sales";
import Purchases from "@/pages/finance/Purchases";
import Banking from "@/pages/finance/Banking";
import TaxPage from "@/pages/finance/Tax";
import Accounting from "@/pages/finance/Accounting";
import AssetRegister from "@/pages/finance/AssetRegister";
import Financials from "@/pages/finance/Financials";
import FundAccounting from "@/pages/finance/FundAccounting";
import ManagementReporting from "@/pages/finance/ManagementReporting";

/**
 * Finance — Module 5.
 * Everything that used to live in the CRM "Finance" dropdown, now a
 * module in its own right, plus Management Reporting (dummy data —
 * no API yet). Pages are shared with the legacy /crm/* routes so
 * existing links keep working.
 */
export const financeRoutes = ({ isAdmin, accessibleModules }: RouteContext) => {
  const canAccess =
    isAdmin &&
    (accessibleModules?.includes("finance") ||
      accessibleModules?.includes("crm"));

  if (!canAccess) return [] as JSX.Element[];

  return [
    <Route
      key="fin-financials"
      path="/finance/financials"
      element={layout(<Financials />)}
    />,
    <Route
      key="fin-reporting"
      path="/finance/reporting"
      element={layout(<ManagementReporting />)}
    />,
    <Route key="fin-sales" path="/finance/sales" element={layout(<Sales />)} />,
    <Route
      key="fin-invoicing"
      path="/finance/invoicing"
      element={layout(<Invoicing />)}
    />,
    <Route
      key="fin-purchases"
      path="/finance/purchases"
      element={layout(<Purchases />)}
    />,
    <Route
      key="fin-banking"
      path="/finance/banking"
      element={layout(<Banking />)}
    />,
    <Route key="fin-tax" path="/finance/tax" element={layout(<TaxPage />)} />,
    <Route
      key="fin-accounting"
      path="/finance/accounting"
      element={layout(<Accounting />)}
    />,
    <Route
      key="fin-assets"
      path="/finance/assets"
      element={layout(<AssetRegister />)}
    />,
    <Route
      key="fin-trust"
      path="/finance/trust"
      element={layout(<TrustAccounting />)}
    />,
    <Route
      key="fin-funds"
      path="/finance/funds"
      element={layout(<FundAccounting />)}
    />,
    <Route
      key="fin-fallback"
      path="/finance/*"
      element={layout(<ModulePlaceholder />)}
    />,
  ];
};
