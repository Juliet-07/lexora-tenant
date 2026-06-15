import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Pipeline from "@/pages/crm/Pipeline";
import Contacts from "@/pages/crm/Contacts";
import TimeTracking from "@/pages/crm/TimeTracking";
import Resources from "@/pages/crm/Resources";
import Invoicing from "@/pages/crm/Invoicing";
import Contracts from "@/pages/crm/Contracts";
import Documents from "@/pages/crm/Documents";
import ClientPortal from "@/pages/crm/ClientPortal";
import Billing from "@/pages/Billing";
import { ProjectsList, ProjectDetail } from "@/pages/Projects";
import { MyProjectsList, MyProjectDetail } from "@/pages/MyProjects";

/**
 * CRM & Project Management — full client lifecycle. Time tracking and
 * project views are open to team members; everything billing / pipeline
 * / contract related is admin-only.
 */
export const crmRoutes = ({ isAdmin }: RouteContext) => {
  const routes: JSX.Element[] = [
    // Project management — accessible to both, with role-specific views
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
    <Route key="crm-time" path="/crm/time" element={layout(<TimeTracking />)} />,
  ];

  if (isAdmin) {
    routes.push(
      <Route key="crm-pipeline" path="/crm/pipeline" element={layout(<Pipeline />)} />,
      <Route key="crm-contacts" path="/crm/contacts" element={layout(<Contacts />)} />,
      <Route key="crm-resources" path="/crm/resources" element={layout(<Resources />)} />,
      <Route key="crm-invoicing" path="/crm/invoicing" element={layout(<Invoicing />)} />,
      <Route key="crm-contracts" path="/crm/contracts" element={layout(<Contracts />)} />,
      <Route key="crm-documents" path="/crm/documents" element={layout(<Documents />)} />,
      <Route key="crm-portal" path="/crm/portal" element={layout(<ClientPortal />)} />,
      <Route key="billing" path="/billing" element={layout(<Billing />)} />,
    );
  }

  routes.push(<Route key="crm-fallback" path="/crm/*" element={layout(<ModulePlaceholder />)} />);

  return routes;
};
