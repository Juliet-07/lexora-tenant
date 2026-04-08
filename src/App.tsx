import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientOnboarding from "./pages/ClientOnboarding";
import ClientProfile from "./pages/ClientProfile";
import { ProjectsList, ProjectDetail } from "./pages/Projects";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import Compliance from "./pages/Compliance";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/clients" element={<AppLayout><Clients /></AppLayout>} />
          <Route path="/clients/new" element={<AppLayout><ClientOnboarding /></AppLayout>} />
          <Route path="/clients/:id" element={<AppLayout><ClientProfile /></AppLayout>} />
          <Route path="/projects" element={<AppLayout><ProjectsList /></AppLayout>} />
          <Route path="/projects/:id" element={<AppLayout><ProjectDetail /></AppLayout>} />
          <Route path="/team" element={<AppLayout><Team /></AppLayout>} />
          <Route path="/billing" element={<AppLayout><Billing /></AppLayout>} />
          <Route path="/compliance" element={<AppLayout><Compliance /></AppLayout>} />
          <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><div className="text-center py-12"><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Coming soon</p></div></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
