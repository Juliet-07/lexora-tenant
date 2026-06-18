import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import EmployeeOnboarding from "@/pages/EmployeeOnboarding";
import { hasCompletedOnboarding } from "@/lib/onboardingStore";
import { coreRoutes } from "./core.routes";
import { amlRoutes } from "./aml.routes";
import { hrRoutes } from "./hr.routes";
import { crmRoutes } from "./crm.routes";
import { employeeRoutes } from "./employee.routes";

/**
 * Top-level router. Module-specific routes live in their own files so
 * App.tsx stays a thin entry point.
 */
export function AppRoutes() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Login />;

  // Non-admin employees must complete onboarding before accessing the app.
  if (!isAdmin && !hasCompletedOnboarding(user.email)) {
    return <EmployeeOnboarding />;
  }

  const ctx = { isAdmin };

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
