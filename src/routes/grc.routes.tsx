import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import GrcOverview from "@/pages/grc/Overview";
import GrcAppetite from "@/pages/grc/Appetite";
import GrcRisks from "@/pages/grc/Risks";
import GrcControls from "@/pages/grc/Controls";
import GrcTreatment from "@/pages/grc/Treatment";
import GrcIncidents from "@/pages/grc/Incidents";
import GrcCompliance from "@/pages/grc/Compliance";
import GrcPolicies from "@/pages/grc/Policies";
import GrcAudits from "@/pages/grc/Audits";
import GrcVendors from "@/pages/grc/Vendors";
import GrcBcp from "@/pages/grc/Bcp";

/** GRC — Governance, Risk & Compliance. Tenant-admin only for now. */
export const grcRoutes = ({ isAdmin }: RouteContext) => {
  const routes: JSX.Element[] = [];

  if (isAdmin) {
    routes.push(
      <Route key="grc-overview" path="/grc/overview" element={layout(<GrcOverview />)} />,
      <Route key="grc-appetite" path="/grc/appetite" element={layout(<GrcAppetite />)} />,
      <Route key="grc-risks" path="/grc/risks" element={layout(<GrcRisks />)} />,
      <Route key="grc-controls" path="/grc/controls" element={layout(<GrcControls />)} />,
      <Route key="grc-treatment" path="/grc/treatment" element={layout(<GrcTreatment />)} />,
      <Route key="grc-incidents" path="/grc/incidents" element={layout(<GrcIncidents />)} />,
      <Route key="grc-compliance" path="/grc/compliance" element={layout(<GrcCompliance />)} />,
      <Route key="grc-policies" path="/grc/policies" element={layout(<GrcPolicies />)} />,
      <Route key="grc-audits" path="/grc/audits" element={layout(<GrcAudits />)} />,
      <Route key="grc-vendors" path="/grc/vendors" element={layout(<GrcVendors />)} />,
      <Route key="grc-bcp" path="/grc/bcp" element={layout(<GrcBcp />)} />,
    );
  }

  routes.push(
    <Route key="grc-fallback" path="/grc/*" element={layout(<ModulePlaceholder />)} />,
  );

  return routes;
};
