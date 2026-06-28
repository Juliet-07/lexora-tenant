import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import { coreRoutes } from "./core.routes";
import { amlRoutes } from "./aml.routes";
import { hrRoutes } from "./hr.routes";
import { crmRoutes } from "./crm.routes";
import { employeeRoutes } from "./employee.routes";
import SignContractPage from "@/pages/SigninContractPage";

/**
 * Top-level router. Module-specific routes live in their own files so
 * App.tsx stays a thin entry point.
 *
 * Employee onboarding is no longer a hard gate — employees land on their
 * dashboard normally. A reminder popup + header progress indicator
 * (see OnboardingReminder) nudge them to /onboarding when incomplete.
 */

const PUBLIC_ROUTE_PATTERNS = [/^\/sign-contract\/[^/]+$/];

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
      </Routes>
    );
  }

  if (!user) return <Login />;

  const ctx = { isAdmin, hierarchyRole: user?.hierarchyRole ?? null };

  return (
    <Routes>
      {coreRoutes(ctx)}
      {amlRoutes(ctx)}
      {hrRoutes(ctx)}
      {crmRoutes(ctx)}
      {employeeRoutes(ctx)}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
