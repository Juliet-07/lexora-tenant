import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import GrcOverview from "@/pages/grc/Overview";
import GrcAppetite from "@/pages/grc/risk/Appetite";
import GrcRisks from "@/pages/grc/risk/Risks";
import GrcControls from "@/pages/grc/risk/Controls";
import GrcTreatment from "@/pages/grc/risk/Treatment";
import GrcIncidents from "@/pages/grc/risk/Incidents";
import GrcHeatmap from "@/pages/grc/risk/Heatmap";
import GrcEmergingRisks from "@/pages/grc/risk/EmergingRisks";
import GrcTestingProgramme from "@/pages/grc/risk/Testing";
import GrcDeficiencies from "@/pages/grc/risk/Deficiencies";
import GrcCompliance from "@/pages/grc/Compliance";
import GrcPolicies from "@/pages/grc/compliance/Policies";
import GrcAudits from "@/pages/grc/compliance/Audits";
import GrcVendors from "@/pages/grc/risk/Vendors";
import GrcBcp from "@/pages/grc/risk/Bcp";
import GrcMeetings from "@/pages/grc/governance/Meetings";
import GrcCommittees from "@/pages/grc/governance/Committees";
import GrcBoardMgt from "@/pages/grc/governance/BoardMgt";
import GrcCodes from "@/pages/grc/governance/Codes";
import GrcResolutions from "@/pages/grc/governance/Resolutions";
import GrcReporting from "@/pages/grc/Reporting";
import DealPipeline from "@/pages/grc/deals/Pipeline";
import DealDetail from "@/pages/grc/deals/DealDetail";
import ClauseLibrary from "@/pages/grc/deals/ClauseLibrary";
import PrecedentTemplates from "@/pages/grc/deals/PrecedentTemplates";
import LegalKnowledge from "@/pages/grc/deals/LegalKnowledge";
import ComplianceObligations from "@/pages/grc/compliance/Obligations";
import ComplianceCalendar from "@/pages/grc/compliance/Calendar";
import ComplianceCertifications from "@/pages/grc/compliance/Certifications";
import ComplianceRegulatoryChange from "@/pages/grc/compliance/RegulatoryChange";
import InvestorReadiness from "@/pages/grc/intelligence/InvestorReadiness";
import CompanyValuation from "@/pages/grc/intelligence/CompanyValuation";
import PortfolioAnalysis from "@/pages/grc/intelligence/PortfolioAnalysis";
import EsgDashboard from "@/pages/grc/esg/Dashboard";
import EsgEnvironmental from "@/pages/grc/esg/Environmental";
import EsgSocial from "@/pages/grc/esg/Social";
import EsgMateriality from "@/pages/grc/esg/Materiality";
import EsgReporting from "@/pages/grc/esg/Reporting";

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
      <Route
        key="grc-reporting"
        path="/grc/reporting"
        element={layout(<GrcReporting />)}
      />,
      // Deals & Transactions
      <Route
        key="grc-deals-pipeline"
        path="/grc/deals/pipeline"
        element={layout(<DealPipeline />)}
      />,
      <Route
        key="grc-deals-clauses"
        path="/grc/deals/clauses"
        element={layout(<ClauseLibrary />)}
      />,
      <Route
        key="grc-deals-precedents"
        path="/grc/deals/precedents"
        element={layout(<PrecedentTemplates />)}
      />,
      <Route
        key="grc-deals-legal"
        path="/grc/deals/legal"
        element={layout(<LegalKnowledge />)}
      />,
      <Route
        key="grc-deals-detail"
        path="/grc/deals/:id"
        element={layout(<DealDetail />)}
      />,

      // Deal Intelligence
      <Route
        key="grc-intel-readiness"
        path="/grc/intelligence/investor-readiness"
        element={layout(<InvestorReadiness />)}
      />,
      <Route
        key="grc-intel-valuation"
        path="/grc/intelligence/valuation"
        element={layout(<CompanyValuation />)}
      />,
      <Route
        key="grc-intel-portfolio"
        path="/grc/intelligence/portfolio"
        element={layout(<PortfolioAnalysis />)}
      />,

      // Governance
      // ESG
      <Route
        key="grc-esg-dashboard"
        path="/grc/esg/dashboard"
        element={layout(<EsgDashboard />)}
      />,
      <Route
        key="grc-esg-environmental"
        path="/grc/esg/environmental"
        element={layout(<EsgEnvironmental />)}
      />,
      <Route
        key="grc-esg-social"
        path="/grc/esg/social"
        element={layout(<EsgSocial />)}
      />,
      <Route
        key="grc-esg-materiality"
        path="/grc/esg/materiality"
        element={layout(<EsgMateriality />)}
      />,
      <Route
        key="grc-esg-reporting"
        path="/grc/esg/reporting"
        element={layout(<EsgReporting />)}
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
      <Route
        key="grc-gov-resolutions"
        path="/grc/governance/resolutions"
        element={layout(<GrcResolutions />)}
      />,

      // Risk
      <Route
        key="grc-risk-register"
        path="/grc/risk/register"
        element={layout(<GrcRisks />)}
      />,
      <Route
        key="grc-risk-heatmap"
        path="/grc/risk/heatmap"
        element={layout(<GrcHeatmap />)}
      />,
      <Route
        key="grc-risk-emerging"
        path="/grc/risk/emerging"
        element={layout(<GrcEmergingRisks />)}
      />,
      <Route
        key="grc-risk-testing"
        path="/grc/risk/testing"
        element={layout(<GrcTestingProgramme />)}
      />,
      <Route
        key="grc-risk-deficiencies"
        path="/grc/risk/deficiencies"
        element={layout(<GrcDeficiencies />)}
      />,
      <Route
        key="grc-risk-appetite"
        path="/grc/risk/appetite"
        element={layout(<GrcAppetite />)}
      />,
      <Route
        key="grc-risk-incidents"
        path="/grc/risk/incidents"
        element={layout(<GrcIncidents />)}
      />,
      <Route
        key="grc-vendors"
        path="/grc/risk/vendors"
        element={layout(<GrcVendors />)}
      />,
      <Route key="grc-bcp" path="/grc/risk/bcp" element={layout(<GrcBcp />)} />,
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
        key="grc-compliance-obligations"
        path="/grc/compliance/obligations"
        element={layout(<ComplianceObligations />)}
      />,
      <Route
        key="grc-compliance-calendar"
        path="/grc/compliance/calendar"
        element={layout(<ComplianceCalendar />)}
      />,
      <Route
        key="grc-compliance-certifications"
        path="/grc/compliance/certifications"
        element={layout(<ComplianceCertifications />)}
      />,
      <Route
        key="grc-compliance-change"
        path="/grc/compliance/regulatory-change"
        element={layout(<ComplianceRegulatoryChange />)}
      />,
      <Route
        key="grc-compliance-policies"
        path="/grc/compliance/policies"
        element={layout(<GrcPolicies />)}
      />,
      <Route
        key="grc-compliance-audits"
        path="/grc/compliance/audits"
        element={layout(<GrcAudits />)}
      />,
      <Route
        key="grc-compliance"
        path="/grc/compliance"
        element={layout(<GrcCompliance />)}
      />,

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
