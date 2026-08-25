import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import CrmOverview from "@/pages/crm/Overview";
import Pipeline from "@/pages/crm/crm/Pipeline";
import Contacts from "@/pages/crm/crm/Contacts";
import CrmClients from "@/pages/crm/crm/Clients";
import Sla from "@/pages/crm/crm/Sla";
import Mandates from "@/pages/crm/projects/mandate";
import Tasks from "@/pages/crm/projects/Tasks";
import GanttPlanning from "@/pages/crm/projects/GanttPlanning";
import TimeTracking from "@/pages/crm/projects/time-tracking";
import ServiceDesk from "@/pages/crm/projects/ServiceDesk";
import Adr from "@/pages/crm/projects/Adr";
import Resources from "@/pages/crm/Resources";
import Invoicing from "@/pages/crm/finance/Invoicing";
import TrustAccounting from "@/pages/crm/finance/TrustAccounting";
import Sales from "@/pages/crm/finance/Sales";
import Purchases from "@/pages/crm/finance/Purchases";
import Banking from "@/pages/crm/finance/Banking";
import TaxPage from "@/pages/crm/finance/Tax";
import Accounting from "@/pages/crm/finance/Accounting";
import AssetRegister from "@/pages/crm/finance/AssetRegister";
import Financials from "@/pages/crm/finance/Financials";
import FundAccounting from "@/pages/crm/finance/FundAccounting";
import Contracts from "@/pages/crm/tools/Contracts";
import CrmCalendar from "@/pages/crm/tools/Calendar";
import Newsletter from "@/pages/crm/tools/Newsletter";

import Reports from "@/pages/crm/Reports";
import Pmo from "@/pages/crm/projects/Pmo";
import Billing from "@/pages/Billing";
import {
  MyProjectsList,
  MyProjectDetail,
} from "@/pages/crm/projects/employee-project";
import Litigation from "@/pages/crm/projects/Litigation";

/**
 * CRM & Project Management — Module 2.
 * Sections: Dashboard, CRM, Projects, Finance, Tools, plus the
 * cross-cutting Notifications centre. Delivery pages (mandates,
 * tasks, planning, timesheets, service desk) are open to team
 * members; CRM, Finance and Tools are admin-only.
 */
export const crmRoutes = ({ isAdmin, accessibleModules }: RouteContext) => {
  const routes: JSX.Element[] = [
    <Route
      key="crm-overview"
      path="/crm/overview"
      element={layout(<CrmOverview />)}
    />,
    // Delivery — accessible to both, with role-specific project views
    <Route
      key="crm-projects"
      path="/crm/projects"
      element={layout(isAdmin ? <ModulePlaceholder /> : <MyProjectsList />)}
    />,
    <Route
      key="crm-project-detail"
      path="/crm/projects/:id"
      element={layout(isAdmin ? <ModulePlaceholder /> : <MyProjectDetail />)}
    />,
    <Route
      key="crm-mandates"
      path="/crm/mandates"
      element={layout(<Mandates />)}
    />,
    <Route key="crm-tasks" path="/crm/tasks" element={layout(<Tasks />)} />,
    <Route
      key="crm-gantt"
      path="/crm/gantt"
      element={layout(<GanttPlanning />)}
    />,
    <Route
      key="crm-time"
      path="/crm/time"
      element={layout(<TimeTracking />)}
    />,
    <Route
      key="crm-service-desk"
      path="/crm/service-desk"
      element={layout(<ServiceDesk />)}
    />,
    <Route key="crm-adr" path="/crm/adr" element={layout(<Adr />)} />,
    <Route
      key="crm-litigation"
      path="/crm/litigation"
      element={layout(<Litigation />)}
    />,
    <Route
      key="crm-litigation-detail"
      path="/crm/litigation/:id"
      element={layout(<Litigation />)}
    />,
  ];

  if (isAdmin && accessibleModules?.includes("crm")) {
    routes.push(
      // ── CRM ──────────────────────────────────────────────
      <Route
        key="crm-pipeline"
        path="/crm/pipeline"
        element={layout(<Pipeline />)}
      />,
      <Route
        key="crm-contacts"
        path="/crm/contacts"
        element={layout(<Contacts />)}
      />,
      <Route
        key="crm-clients"
        path="/crm/clients"
        element={layout(<CrmClients />)}
      />,
      <Route key="crm-sla" path="/crm/sla" element={layout(<Sla />)} />,
      // ── Finance ──────────────────────────────────────────
      <Route
        key="crm-invoicing"
        path="/crm/invoicing"
        element={layout(<Invoicing />)}
      />,
      <Route key="crm-sales" path="/crm/sales" element={layout(<Sales />)} />,
      <Route
        key="crm-purchases"
        path="/crm/purchases"
        element={layout(<Purchases />)}
      />,
      <Route
        key="crm-banking"
        path="/crm/banking"
        element={layout(<Banking />)}
      />,
      <Route key="crm-tax" path="/crm/tax" element={layout(<TaxPage />)} />,
      <Route
        key="crm-accounting"
        path="/crm/accounting"
        element={layout(<Accounting />)}
      />,
      <Route
        key="crm-assets"
        path="/crm/assets"
        element={layout(<AssetRegister />)}
      />,
      <Route
        key="crm-financials"
        path="/crm/financials"
        element={layout(<Financials />)}
      />,
      <Route
        key="crm-funds"
        path="/crm/funds"
        element={layout(<FundAccounting />)}
      />,
      <Route
        key="crm-trust"
        path="/crm/trust"
        element={layout(<TrustAccounting />)}
      />,
      // ── Tools ────────────────────────────────────────────
      <Route
        key="crm-contracts"
        path="/crm/contracts"
        element={layout(<Contracts />)}
      />,
      <Route
        key="crm-newsletter"
        path="/crm/newsletter"
        element={layout(<Newsletter />)}
      />,
      <Route
        key="crm-calendar"
        path="/crm/calendar"
        element={layout(<CrmCalendar />)}
      />,

      <Route
        key="crm-reports"
        path="/crm/reports"
        element={layout(<Reports />)}
      />,
      <Route key="crm-pmo" path="/crm/pmo" element={layout(<Pmo />)} />,
      <Route
        key="crm-resources"
        path="/crm/resources"
        element={layout(<Resources />)}
      />,
      <Route key="billing" path="/billing" element={layout(<Billing />)} />,
    );
  }

  routes.push(
    <Route
      key="crm-fallback"
      path="/crm/*"
      element={layout(<ModulePlaceholder />)}
    />,
  );

  return routes;
};
