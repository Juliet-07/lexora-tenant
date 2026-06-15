import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import MyTime from "@/pages/team-member/MyTime";
import MyLeave from "@/pages/team-member/MyLeave";
import MyPerformance from "@/pages/team-member/MyPerformance";
import MyPayslips from "@/pages/team-member/MyPayslips";

/** Self-service routes available only to team members. */
export const teamMemberRoutes = ({ isAdmin }: RouteContext) => {
  if (isAdmin) return [];
  return [
    <Route key="my-time" path="/my/time" element={layout(<MyTime />)} />,
    <Route key="my-leave" path="/my/leave" element={layout(<MyLeave />)} />,
    <Route key="my-perf" path="/my/performance" element={layout(<MyPerformance />)} />,
    <Route key="my-pay" path="/my/payslips" element={layout(<MyPayslips />)} />,
  ];
};
