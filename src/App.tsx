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
import Clients from "./pages/Clients";
import ClientOnboarding from "./pages/ClientOnboarding";
import ClientProfile from "./pages/ClientProfile";
import { ProjectsList, ProjectDetail } from "./pages/Projects";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Compliance from "./pages/Compliance";
import Reports from "./pages/Reports";
import RiskEngine from "./pages/aml/RiskEngine";
import TransactionMonitoring from "./pages/aml/TransactionMonitoring";
import STR from "./pages/aml/STR";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Modules with bespoke landing screens; everything else falls back to the
// shared Dashboard which is API-driven and works for any active plan.
const PLACEHOLDER_MODULES = new Set<string>([]);

function ModuleHome() {
  const { currentModule } = useModule();
  if (PLACEHOLDER_MODULES.has(currentModule.id)) return <ModulePlaceholder />;
  return <Dashboard />;
}

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  if (!user) return <Login />;

  return (
    <Routes>
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
          path="/clients/:id"
          element={
            <AppLayout>
              <ClientProfile />
            </AppLayout>
          }
        />
      )}
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
          path="/team"
          element={
            <AppLayout>
              <Team />
            </AppLayout>
          }
        />
      )}
      <Route
        path="/billing"
        element={
          <AppLayout>
            <Billing />
          </AppLayout>
        }
      />
      {isAdmin && (
        <Route
          path="/compliance"
          element={
            <AppLayout>
              <Compliance />
            </AppLayout>
          }
        />
      )}
      {isAdmin && (
        <Route
          path="/reports"
          element={
            <AppLayout>
              <Reports />
            </AppLayout>
          }
        />
      )}
      {/* AML/KYC module routes */}
      {isAdmin && (
        <Route
          path="/aml/risk"
          element={<AppLayout><RiskEngine /></AppLayout>}
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/transactions"
          element={<AppLayout><TransactionMonitoring /></AppLayout>}
        />
      )}
      {isAdmin && (
        <Route
          path="/aml/sar"
          element={<AppLayout><STR /></AppLayout>}
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
      <Route
        path="/grc/*"
        element={
          <AppLayout>
            <ModulePlaceholder />
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
        path="/settings"
        element={
          <AppLayout>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Coming soon</p>
            </div>
          </AppLayout>
        }
      />
      <Route path="*" element={<NotFound />} />
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
