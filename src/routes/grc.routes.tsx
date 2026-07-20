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
import GrcMeetings from "@/pages/grc/governance/Meetings";
import GrcCommittees from "@/pages/grc/governance/Committees";
import GrcBoardMgt from "@/pages/grc/governance/BoardMgt";
import GrcCodes from "@/pages/grc/governance/Codes";
import GrcReporting from "@/pages/grc/operations/Reporting";

/** GRC — Governance, Risk & Compliance. Tenant-admin only for now. */
export const grcRoutes = ({ isAdmin, accessibleModules }: RouteContext) => {
  const routes: JSX.Element[] = [];

  if (isAdmin && accessibleModules?.includes("grc")) {
    routes.push(
      <Route
        key="grc-overview"
        path="/grc/overview"
        element={layout(<GrcOverview />)}
      />,

      // Governance
      <Route
        key="grc-gov-meetings"
        path="/grc/governance/meetings"
        element={layout(<GrcMeetings />)}
      />,
      <Route
        key="grc-gov-committees"
        path="/grc/governance/committees"
        element={layout(<GrcCommittees />)}
      />,
      <Route
        key="grc-gov-board"
        path="/grc/governance/board"
        element={layout(<GrcBoardMgt />)}
      />,
      <Route
        key="grc-gov-codes"
        path="/grc/governance/codes"
        element={layout(<GrcCodes />)}
      />,

      // Risk
      <Route
        key="grc-risk-register"
        path="/grc/risk/register"
        element={layout(<GrcRisks />)}
      />,
      <Route
        key="grc-risk-appetite"
        path="/grc/risk/appetite"
        element={layout(<GrcAppetite />)}
      />,
      <Route
        key="grc-risk-heatmap"
        path="/grc/risk/heatmap"
        element={layout(<GrcOverview />)}
      />,
      <Route
        key="grc-risk-treatment"
        path="/grc/risk/treatment"
        element={layout(<GrcTreatment />)}
      />,
      <Route
        key="grc-risk-controls"
        path="/grc/risk/controls"
        element={layout(<GrcControls />)}
      />,

      // Compliance
      <Route
        key="grc-compliance"
        path="/grc/compliance"
        element={layout(<GrcCompliance />)}
      />,

      // Operations
      <Route
        key="grc-ops-incidents"
        path="/grc/operations/incidents"
        element={layout(<GrcIncidents />)}
      />,
      <Route
        key="grc-ops-policies"
        path="/grc/operations/policies"
        element={layout(<GrcPolicies />)}
      />,
      <Route
        key="grc-ops-audits"
        path="/grc/operations/audits"
        element={layout(<GrcAudits />)}
      />,
      <Route
        key="grc-ops-reporting"
        path="/grc/operations/reporting"
        element={layout(<GrcReporting />)}
      />,

      // Third-party & BCP
      <Route
        key="grc-vendors"
        path="/grc/vendors"
        element={layout(<GrcVendors />)}
      />,
      <Route key="grc-bcp" path="/grc/bcp" element={layout(<GrcBcp />)} />,

      // Legacy aliases (keep prior deep links working)
      <Route
        key="grc-appetite-legacy"
        path="/grc/appetite"
        element={layout(<GrcAppetite />)}
      />,
      <Route
        key="grc-risks-legacy"
        path="/grc/risks"
        element={layout(<GrcRisks />)}
      />,
      <Route
        key="grc-controls-legacy"
        path="/grc/controls"
        element={layout(<GrcControls />)}
      />,
      <Route
        key="grc-treatment-legacy"
        path="/grc/treatment"
        element={layout(<GrcTreatment />)}
      />,
      <Route
        key="grc-incidents-legacy"
        path="/grc/incidents"
        element={layout(<GrcIncidents />)}
      />,
      <Route
        key="grc-policies-legacy"
        path="/grc/policies"
        element={layout(<GrcPolicies />)}
      />,
      <Route
        key="grc-audits-legacy"
        path="/grc/audits"
        element={layout(<GrcAudits />)}
      />,
    );
  }

  routes.push(
    <Route
      key="grc-fallback"
      path="/grc/*"
      element={layout(<ModulePlaceholder />)}
    />,
  );

  return routes;
};
