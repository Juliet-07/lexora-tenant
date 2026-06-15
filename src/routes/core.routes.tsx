import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Dashboard from "@/pages/Dashboard";
import TeamMemberDashboard from "@/pages/TeamMemberDashboard";
import Clients from "@/pages/client/Clients";
import AssignedClients from "@/pages/AssignedClients";
import ClientProfile from "@/pages/client/ClientProfile";
import ClientOnboarding from "@/pages/kyc/ClientOnboarding";
import OnboardingDetail from "@/pages/kyc/OnboardingDetail";
import Team from "@/pages/Team";
import Settings from "@/pages/settings/Index";
import MySettings from "@/pages/team-member/MySettings";
import { ProjectsList, ProjectDetail } from "@/pages/Projects";
import { MyProjectsList, MyProjectDetail } from "@/pages/MyProjects";

/**
 * Core routes shared across modules: dashboard root, client management,
 * team, settings, and the generic projects fallback.
 */
export const coreRoutes = ({ isAdmin }: RouteContext) => {
  const HomeEl = isAdmin ? <Dashboard /> : <TeamMemberDashboard />;

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
      element={layout(isAdmin ? <ProjectsList /> : <MyProjectsList />)}
    />,
    <Route
      key="project-detail"
      path="/projects/:id"
      element={layout(isAdmin ? <ProjectDetail /> : <MyProjectDetail />)}
    />,
    <Route
      key="settings"
      path="/settings"
      element={layout(isAdmin ? <Settings /> : <MySettings />)}
    />,
    <Route key="grc" path="/grc/*" element={layout(<ModulePlaceholder />)} />,
  ];

  if (isAdmin) {
    routes.push(
      <Route key="client-profile" path="/clients/:id" element={layout(<ClientProfile />)} />,
      <Route key="onboarding" path="/clients/onboarding" element={layout(<ClientOnboarding />)} />,
      <Route key="onboarding-detail" path="/clients/onboarding/:id" element={layout(<OnboardingDetail />)} />,
      <Route key="team" path="/team" element={layout(<Team />)} />,
    );
  }

  return routes;
};
