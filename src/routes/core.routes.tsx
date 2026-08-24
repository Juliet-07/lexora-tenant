import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Dashboard from "@/pages/Dashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import Clients from "@/pages/client/Clients";
import AssignedClients from "@/pages/hr/employee/AssignedClients";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientOnboarding from "@/pages/kyc/ClientOnboarding";
import OnboardingDetail from "@/pages/kyc/OnboardingDetail";
import Settings from "@/pages/settings/Index";
import MySettings from "@/pages/hr/employee/MySettings";
import Notifications from "@/pages/Notifications";
import { MyProjectsList, MyProjectDetail } from "@/pages/crm/projects/employee-project";

/**
 * Core routes shared across modules: dashboard root, client management,
 * team, settings, and the generic projects fallback.
 */
export const coreRoutes = ({ isAdmin }: RouteContext) => {
  const HomeEl = isAdmin ? <Dashboard /> : <EmployeeDashboard />;

  const routes = [
    <Route key="home" path="/" element={layout(HomeEl)} />,
    <Route
      key="clients"
      path="/clients"
      element={layout(isAdmin ? <Clients /> : <AssignedClients />)}
    />,
    <Route
      key="projects"
      path="/projects"
      element={layout(isAdmin ? <ModulePlaceholder /> : <MyProjectsList />)}
    />,
    <Route
      key="project-detail"
      path="/projects/:id"
      element={layout(isAdmin ? <ModulePlaceholder /> : <MyProjectDetail />)}
    />,
    <Route
      key="settings"
      path="/settings"
      element={layout(isAdmin ? <Settings /> : <MySettings />)}
    />,
    // Notification centre — standalone, shared across every module
    <Route
      key="notifications"
      path="/notifications"
      element={layout(<Notifications />)}
    />,
  ];

  if (isAdmin) {
    routes.push(
      <Route
        key="client-profile"
        path="/clients/:id"
        element={layout(<ClientProfile />)}
      />,
      <Route
        key="onboarding"
        path="/clients/onboarding"
        element={layout(<ClientOnboarding />)}
      />,
      <Route
        key="onboarding-detail"
        path="/clients/onboarding/:id"
        element={layout(<OnboardingDetail />)}
      />,
    );
  }

  return routes;
};
