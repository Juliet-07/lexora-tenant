import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import MyTime from "@/pages/hr/employee/MyTime";
import MyLeave from "@/pages/hr/employee/MyLeave";
import MyPerformance from "@/pages/hr/employee/MyPerformance";
import MyPayslips from "@/pages/hr/employee/MyPayslips";
import MyProfile from "@/pages/hr/employee/MyProfile";

/** Self-service routes available only to employee. */
export const employeeRoutes = ({ isAdmin }: RouteContext) => {
  if (isAdmin) return [];
  return [
    <Route key="my-profile" path="/my/profile" element={layout(<MyProfile />)} />,
    <Route key="my-time" path="/my/time" element={layout(<MyTime />)} />,
    <Route key="my-leave" path="/my/leave" element={layout(<MyLeave />)} />,
    <Route
      key="my-perf"
      path="/my/performance"
      element={layout(<MyPerformance />)}
    />,
    <Route key="my-pay" path="/my/payslips" element={layout(<MyPayslips />)} />,
  ];
};
