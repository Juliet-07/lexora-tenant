import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { coreRoutes } from "./core.routes";
import { amlRoutes } from "./aml.routes";
import { hrRoutes } from "./hr.routes";
import { crmRoutes } from "./crm.routes";
import { grcRoutes } from "./grc.routes";
import { financeRoutes } from "./finance.routes";
import { employeeRoutes } from "./employee.routes";
import SignContractPage from "@/pages/public/SigninContractPage";
import MeetingAckPage from "@/pages/grc/governance/MeetingAck";
import MinutesReviewPage from "@/pages/grc/governance/MinutesReview";
import PolicyAckPage from "@/pages/grc/compliance/PolicyAck";
import DealContractReviewPage from "@/pages/grc/deals/DealContractReview";
import DealOfferReviewPage from "@/pages/grc/deals/DealOfferReview";
import SignToolContractPage from "@/pages/public/SignToolContractPage";

/**
 * Top-level router. Module-specific routes live in their own files so
 * App.tsx stays a thin entry point.
 */

const PUBLIC_ROUTE_PATTERNS = [
  /^\/sign-contract\/[^/]+$/,
  /^\/sign-tool-contract\/[^/]+$/,
  /^\/meeting-ack\/[^/]+$/,
  /^\/minutes-review\/[^/]+$/,
  /^\/policy-ack\/[^/]+$/,
  /^\/deal-review\/contract\/[^/]+$/,
  /^\/deal-review\/offer\/[^/]+$/,
];

export function AppRoutes() {
  const { user, isAdmin } = useAuth();

  const path = window.location.pathname;
  const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(path),
  );

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/sign-contract/:token" element={<SignContractPage />} />
        <Route
          path="/sign-tool-contract/:token"
          element={<SignToolContractPage />}
        />
        <Route path="/meeting-ack/:token" element={<MeetingAckPage />} />
        <Route path="/minutes-review/:token" element={<MinutesReviewPage />} />
        <Route path="/policy-ack/:token" element={<PolicyAckPage />} />
        <Route
          path="/deal-review/contract/:token"
          element={<DealContractReviewPage />}
        />
        <Route
          path="/deal-review/offer/:token"
          element={<DealOfferReviewPage />}
        />
      </Routes>
    );
  }

  if (!user) return <Login />;

  const ctx = {
    isAdmin,
    hierarchyRole: user?.hierarchyRole ?? null,
    accessibleModules: user?.accessibleModules ?? [],
  };

  return (
    <Routes>
      {coreRoutes(ctx)}
      {amlRoutes(ctx)}
      {hrRoutes(ctx)}
      {crmRoutes(ctx)}
      {grcRoutes(ctx)}
      {employeeRoutes(ctx)}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
