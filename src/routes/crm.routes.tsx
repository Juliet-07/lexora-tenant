import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import CrmOverview from "@/pages/crm/Overview";
import Pipeline from "@/pages/crm/Pipeline";
import Contacts from "@/pages/crm/Contacts";
import CrmClients from "@/pages/crm/Clients";
import Communications from "@/pages/crm/Communications";
import Sla from "@/pages/crm/Sla";
import Mandates from "@/pages/crm/Mandates";
import Tasks from "@/pages/crm/Tasks";
import GanttPlanning from "@/pages/crm/GanttPlanning";
import TimeTracking from "@/pages/crm/TimeTracking";
import ServiceDesk from "@/pages/crm/ServiceDesk";
import Adr from "@/pages/crm/Adr";
import Resources from "@/pages/crm/Resources";
import Invoicing from "@/pages/crm/Invoicing";
import TrustAccounting from "@/pages/crm/TrustAccounting";
import Documents from "@/pages/crm/Documents";
import Contracts from "@/pages/crm/Contracts";
import Forms from "@/pages/crm/Forms";
import CrmCalendar from "@/pages/crm/Calendar";
import Reports from "@/pages/crm/Reports";
import Pmo from "@/pages/crm/Pmo";
import Notifications from "@/pages/crm/Notifications";
import ClientPortal from "@/pages/crm/ClientPortal";
import Billing from "@/pages/Billing";
import { ProjectsList, ProjectDetail } from "@/pages/Projects";
import { MyProjectsList, MyProjectDetail } from "@/pages/MyProjects";

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
      element={layout(isAdmin ? <ProjectsList /> : <MyProjectsList />)}
    />,
    <Route
      key="crm-project-detail"
      path="/crm/projects/:id"
      element={layout(isAdmin ? <ProjectDetail /> : <MyProjectDetail />)}
    />,
    <Route key="crm-mandates" path="/crm/mandates" element={layout(<Mandates />)} />,
    <Route key="crm-tasks" path="/crm/tasks" element={layout(<Tasks />)} />,
    <Route key="crm-gantt" path="/crm/gantt" element={layout(<GanttPlanning />)} />,
    <Route key="crm-time" path="/crm/time" element={layout(<TimeTracking />)} />,
    <Route
      key="crm-service-desk"
      path="/crm/service-desk"
      element={layout(<ServiceDesk />)}
    />,
    <Route key="crm-adr" path="/crm/adr" element={layout(<Adr />)} />,
    <Route
      key="crm-notifications"
      path="/crm/notifications"
      element={layout(<Notifications />)}
    />,
  ];

  if (isAdmin && accessibleModules?.includes("crm")) {
    routes.push(
      // ── CRM ──────────────────────────────────────────────
      <Route key="crm-pipeline" path="/crm/pipeline" element={layout(<Pipeline />)} />,
      <Route key="crm-contacts" path="/crm/contacts" element={layout(<Contacts />)} />,
      <Route key="crm-clients" path="/crm/clients" element={layout(<CrmClients />)} />,
      <Route
        key="crm-communications"
        path="/crm/communications"
        element={layout(<Communications />)}
      />,
      <Route key="crm-sla" path="/crm/sla" element={layout(<Sla />)} />,
      // ── Finance ──────────────────────────────────────────
      <Route key="crm-invoicing" path="/crm/invoicing" element={layout(<Invoicing />)} />,
      <Route key="crm-trust" path="/crm/trust" element={layout(<TrustAccounting />)} />,
      // ── Tools ────────────────────────────────────────────
      <Route key="crm-documents" path="/crm/documents" element={layout(<Documents />)} />,
      <Route key="crm-contracts" path="/crm/contracts" element={layout(<Contracts />)} />,
      <Route key="crm-forms" path="/crm/forms" element={layout(<Forms />)} />,
      <Route key="crm-calendar" path="/crm/calendar" element={layout(<CrmCalendar />)} />,
      <Route key="crm-reports" path="/crm/reports" element={layout(<Reports />)} />,
      <Route key="crm-pmo" path="/crm/pmo" element={layout(<Pmo />)} />,
      <Route key="crm-resources" path="/crm/resources" element={layout(<Resources />)} />,
      <Route key="crm-portal" path="/crm/portal" element={layout(<ClientPortal />)} />,
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
