import { Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import EmployeeOnboarding from "@/pages/EmployeeOnboarding";
import { fetchMyOnboardingStatus } from "@/lib/hr-api";
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

  // Checked on every mount — not just at login — so it also catches a
  // tenant adding onboarding documents after the employee's session is
  // already active, and re-evaluates correctly on tab reopen/refresh.
  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchMyOnboardingStatus,
    enabled: !!user && !isAdmin,
    staleTime: 60_000,
  });

  if (!user) return <Login />;

  // Non-admin employees must complete onboarding before accessing the app.
  if (!isAdmin) {
    if (onboardingLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      );
    }
    if (onboardingStatus && !onboardingStatus.completed) {
      return <EmployeeOnboarding />;
    }
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
