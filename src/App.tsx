import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModuleProvider, useModule } from "@/contexts/ModuleContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TeamMemberDashboard from "./pages/TeamMemberDashboard";
import Clients from "./pages/client/Clients";
import ClientOnboarding from "./pages/kyc/ClientOnboarding";
import OnboardingDetail from "./pages/kyc/OnboardingDetail";
import ClientProfile from "./pages/client/ClientProfile";
import { ProjectsList, ProjectDetail } from "./pages/Projects";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Compliance from "./pages/aml/Compliance";
import AmlReports from "./pages/aml/Reports";
import RiskEngine from "./pages/aml/RiskEngine";
import TransactionMonitoring from "./pages/aml/TransactionMonitoring";
import STR from "./pages/aml/STR";
import WatchlistManagement from "./pages/aml/WatchlistManagement";
import HREmployees from "./pages/hr/Employees";
import HRRecruitment from "./pages/hr/Recruitment";
import HRAttendance from "./pages/hr/Attendance";
import HRLeave from "./pages/hr/Leave";
import HRPerformance from "./pages/hr/Performance";
import HRPayroll from "./pages/hr/Payroll";
import HRLearning from "./pages/hr/Learning";
import HRContracts from "./pages/hr/Contracts";
import HRRequisitions from "./pages/hr/Requisitions";
import Settings from "./pages/settings/Index";

import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Modules with bespoke landing screens; everything else falls back to the
// shared Dashboard which is API-driven and works for any active plan.
const PLACEHOLDER_MODULES = new Set<string>([]);

function ModuleHome() {
  const { currentModule } = useModule();
  const { isAdmin } = useAuth();

  // Team members get their own focused dashboard regardless of module
  if (!isAdmin) return <TeamMemberDashboard />;

  // ✅ Guard
  if (!currentModule)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Loading workspace…</span>
      </div>
    );

  if (PLACEHOLDER_MODULES.has(currentModule.id)) return <ModulePlaceholder />;
  return <Dashboard />;
}

//   if (PLACEHOLDER_MODULES.has(currentModule.id)) return <ModulePlaceholder />;
//   return <Dashboard />;
// }

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  if (!user) return <Login />;

  return (
    <Routes>
      {/* ROUTES ACCESSIBLE ACROSS ALL MODULES */}
      <Route
        path="/"
        element={
          <AppLayout>
            <ModuleHome />
          </AppLayout>
        }
      />
      {isAdmin && (
        <Route
          path="/clients"
          element={
            <AppLayout>
              <Clients />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/clients/:id"
          element={
            <AppLayout>
              <ClientProfile />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/clients/onboarding"
          element={
            <AppLayout>
              <ClientOnboarding />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/clients/onboarding/:id"
          element={
            <AppLayout>
              <OnboardingDetail />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/team"
          element={
            <AppLayout>
              <Team />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/settings"
          element={
            <AppLayout>
              <Settings />
            </AppLayout>
          }
        />
      )}
      <Route path="*" element={<NotFound />} />
      
      {/* AML/KYC module routes */}
      {isAdmin && (
        <Route
          path="/aml/risk"
          element={
            <AppLayout>
              <RiskEngine />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/transactions"
          element={
            <AppLayout>
              <TransactionMonitoring />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/sar"
          element={
            <AppLayout>
              <STR />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/watchlist"
          element={
            <AppLayout>
              <WatchlistManagement />
            </AppLayout>
          }
        />
      )}
      <Route
        path="/aml/*"
        element={
          <AppLayout>
            <ModulePlaceholder />
          </AppLayout>
        }
      />
      {/* HR module routes */}
      {isAdmin && (
        <Route
          path="/hr/employees"
          element={
            <AppLayout>
              <HREmployees />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/hr/recruitment"
          element={
            <AppLayout>
              <HRRecruitment />
            </AppLayout>
          }
        />
      )}
      <Route
        path="/hr/attendance"
        element={
          <AppLayout>
            <HRAttendance />
          </AppLayout>
        }
      />
      <Route
        path="/hr/leave"
        element={
          <AppLayout>
            <HRLeave />
          </AppLayout>
        }
      />
      {isAdmin && (
        <Route
          path="/hr/performance"
          element={
            <AppLayout>
              <HRPerformance />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/hr/payroll"
          element={
            <AppLayout>
              <HRPayroll />
            </AppLayout>
          }
        />
      )}
      <Route
        path="/hr/learning"
        element={
          <AppLayout>
            <HRLearning />
          </AppLayout>
        }
      />
      {isAdmin && (
        <Route
          path="/hr/contracts"
          element={
            <AppLayout>
              <HRContracts />
            </AppLayout>
          }
        />
      )}
      <Route
        path="/hr/requisitions"
        element={
          <AppLayout>
            <HRRequisitions />
          </AppLayout>
        }
      />
      <Route
        path="/hr/*"
        element={
          <AppLayout>
            <ModulePlaceholder />
          </AppLayout>
        }
      />

      <Route
        path="/projects"
        element={
          <AppLayout>
            <ProjectsList />
          </AppLayout>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <AppLayout>
            <ProjectDetail />
          </AppLayout>
        }
      />
      {isAdmin && (
        <Route
          path="/billing"
          element={
            <AppLayout>
              <Billing />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/compliance"
          element={
            <AppLayout>
              <Compliance />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/reports"
          element={
            <AppLayout>
              <AmlReports />
            </AppLayout>
          }
        />
      )}

      <Route
        path="/grc/*"
        element={
          <AppLayout>
            <ModulePlaceholder />
          </AppLayout>
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ModuleProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ModuleProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
