import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Reactivate from "@/pages/Reactivate";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import { coreRoutes } from "./core.routes";
import { amlRoutes } from "./aml.routes";
import { hrRoutes } from "./hr.routes";
import { crmRoutes } from "./crm.routes";
import { grcRoutes } from "./grc.routes";
import { financeRoutes } from "./finance.routes";
import { employeeRoutes } from "./employee.routes";
import SignContractPage from "@/pages/public/SigninContractPage";
import MeetingAckPage from "@/pages/grc/governance/Meeting/MeetingAck";
import MinutesReviewPage from "@/pages/grc/governance/Meeting/MinutesReview";
import MinutesChairReviewPage from "@/pages/grc/governance/Meeting/MinutesChairReview";
import MeetingNoticeRsvpPage from "@/pages/grc/governance/Meeting/MeetingNoticeRsvp";
import PolicyAckPage from "@/pages/grc/compliance/PolicyAck";
import PolicyApprovalPage from "@/pages/grc/compliance/PolicyApproval";
import EsgChairApprovalPage from "@/pages/grc/esg/EsgChairApproval";
import DealContractReviewPage from "@/pages/grc/deals/DealContractReview";
import DealOfferReviewPage from "@/pages/grc/deals/DealOfferReview";
import SignToolContractPage from "@/pages/public/SignToolContractPage";
import Intro from "@/pages/Intro";
import Platform from "@/pages/marketing/Platform";
import Pricing from "@/pages/marketing/Pricing";
import Industries from "@/pages/marketing/Industries";
import Advisory from "@/pages/marketing/Advisory";
import MarketingInsights from "@/pages/marketing/Insights";
import AboutPage from "@/pages/marketing/About";
import ContactPage from "@/pages/marketing/Contact";

/**
 * Top-level router. Module-specific routes live in their own files so
 * App.tsx stays a thin entry point.
 */

const PUBLIC_ROUTE_PATTERNS = [
  /^\/sign-contract\/[^/]+$/,
  /^\/sign-tool-contract\/[^/]+$/,
  /^\/meeting-ack\/[^/]+$/,
  /^\/minutes-review\/[^/]+$/,
  /^\/minutes-chair-review\/[^/]+$/,
  /^\/policy-ack\/[^/]+$/,
  /^\/policy-approval\/[^/]+$/,
  /^\/esg-approve\/[^/]+$/,
  /^\/deal-review\/contract\/[^/]+$/,
  /^\/deal-review\/offer\/[^/]+$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/reactivate$/,
];

// Every one of the token-in-path public links above is built server-side
// off TENANT_APP_URL (see lexora-engine's meeting/policy/esg/deal/contract
// services) — none of them are meant to need a login, and none of this
// app's own code ever points one at /login/... But a misconfigured
// TENANT_APP_URL (set to the site's /login URL instead of its bare
// origin) silently prefixes every one of these emailed links with
// /login/ before this app ever sees the request, and since no route
// here matched /login/meeting-ack/:token (or any of its siblings), the
// visitor got a blank page instead of the page the link promised —
// react-router renders nothing for a path with no matching <Route> and
// no catch-all in this public branch. Rather than only patch the two
// reported links, every token-in-path pattern above also matches with
// that prefix stripped, and the route list below carries a matching
// /login/... alias for each one, so an already-sent (or still
// misconfigured) link keeps working regardless. The real fix is still
// to correct TENANT_APP_URL in the deployment's environment config so
// new links are generated right in the first place — this is a safety
// net under that, not a replacement for it.
const stripLoginPrefix = (path: string) =>
  path.startsWith("/login/") ? path.slice("/login".length) : path;

export function AppRoutes() {
  const { user, isAdmin } = useAuth();

  const path = window.location.pathname;
  const canonicalPath = stripLoginPrefix(path);
  const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some(
    (pattern) => pattern.test(path) || pattern.test(canonicalPath),
  );

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/sign-contract/:token" element={<SignContractPage />} />
        <Route
          path="/login/sign-contract/:token"
          element={<SignContractPage />}
        />
        <Route
          path="/sign-tool-contract/:token"
          element={<SignToolContractPage />}
        />
        <Route
          path="/login/sign-tool-contract/:token"
          element={<SignToolContractPage />}
        />
        <Route path="/meeting-ack/:token" element={<MeetingAckPage />} />
        <Route path="/login/meeting-ack/:token" element={<MeetingAckPage />} />
        <Route path="/minutes-review/:token" element={<MinutesReviewPage />} />
        <Route
          path="/login/minutes-review/:token"
          element={<MinutesReviewPage />}
        />
        <Route
          path="/minutes-chair-review/:token"
          element={<MinutesChairReviewPage />}
        />
        <Route
          path="/login/minutes-chair-review/:token"
          element={<MinutesChairReviewPage />}
        />
        <Route
          path="/meeting-notice/:token"
          element={<MeetingNoticeRsvpPage />}
        />
        <Route
          path="/login/meeting-notice/:token"
          element={<MeetingNoticeRsvpPage />}
        />
        <Route path="/policy-ack/:token" element={<PolicyAckPage />} />
        <Route path="/login/policy-ack/:token" element={<PolicyAckPage />} />
        <Route
          path="/policy-approval/:token"
          element={<PolicyApprovalPage />}
        />
        <Route
          path="/login/policy-approval/:token"
          element={<PolicyApprovalPage />}
        />
        <Route path="/esg-approve/:token" element={<EsgChairApprovalPage />} />
        <Route
          path="/login/esg-approve/:token"
          element={<EsgChairApprovalPage />}
        />
        <Route
          path="/deal-review/contract/:token"
          element={<DealContractReviewPage />}
        />
        <Route
          path="/login/deal-review/contract/:token"
          element={<DealContractReviewPage />}
        />
        <Route
          path="/deal-review/offer/:token"
          element={<DealOfferReviewPage />}
        />
        <Route
          path="/login/deal-review/offer/:token"
          element={<DealOfferReviewPage />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reactivate" element={<Reactivate />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/platform" element={<Platform />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/industries/:industryId" element={<Industries />} />
        <Route path="/advisory" element={<Advisory />} />
        <Route path="/advisory/:serviceId" element={<Advisory />} />
        <Route path="/insights" element={<MarketingInsights />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    );
  }

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
      {financeRoutes(ctx)}
      {employeeRoutes(ctx)}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
