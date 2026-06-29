import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import MyTime from "@/pages/hr/employee/MyTime";
import MyLeave from "@/pages/hr/employee/MyLeave";
import MyPerformance from "@/pages/hr/employee/MyPerformance";
import MyPayslips from "@/pages/hr/employee/MyPayslips";
import MyProfile from "@/pages/hr/employee/MyProfile";
import MyRequisitions from "@/pages/hr/employee/MyRequisitions";
import MyTeam from "@/pages/hr/employee/MyTeam";
import MyDepartment from "@/pages/hr/employee/MyDepartment";
import EmployeeOnboarding from "@/pages/EmployeeOnboarding";

/** Self-service routes available only to employee. */
export const employeeRoutes = ({ isAdmin, hierarchyRole }: RouteContext) => {
  if (isAdmin) return [];
  const routes = [
    <Route
      key="my-profile"
      path="/my/profile"
      element={layout(<MyProfile />)}
    />,
    <Route key="my-time" path="/my/time" element={layout(<MyTime />)} />,
    <Route key="my-leave" path="/my/leave" element={layout(<MyLeave />)} />,
    <Route
      key="my-perf"
      path="/my/performance"
      element={layout(<MyPerformance />)}
    />,
    <Route key="my-pay" path="/my/payslips" element={layout(<MyPayslips />)} />,
    <Route
      key="my-req"
      path="/my/requisitions"
      element={layout(<MyRequisitions />)}
    />,

    // Onboarding is no longer a gate — it's a dedicated page employees
    // are nudged toward via the in-app reminder/popup.
    <Route
      key="onboarding"
      path="/onboarding"
      element={<EmployeeOnboarding />}
    />,
  ];

  if (hierarchyRole === "manager") {
    routes.push(
      <Route key="my-team" path="/my/team" element={layout(<MyTeam />)} />,
    );
  }

  if (hierarchyRole === "head_of_department") {
    routes.push(
      <Route
        key="my-department"
        path="/my/department"
        element={layout(<MyDepartment />)}
      />,
    );
  }

  return routes;
};
