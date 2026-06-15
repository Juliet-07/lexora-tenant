import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import HREmployees from "@/pages/hr/Employees";
import HRRecruitment from "@/pages/hr/Recruitment";
import HRAttendance from "@/pages/hr/Attendance";
import HRLeave from "@/pages/hr/Leave";
import HRPerformance from "@/pages/hr/Performance";
import HRPayroll from "@/pages/hr/Payroll";
import HRLearning from "@/pages/hr/Learning";
import HRContracts from "@/pages/hr/Contracts";
import HRRequisitions from "@/pages/hr/Requisitions";

/** HR & People Management — most admin-gated, attendance/leave/learning open. */
export const hrRoutes = ({ isAdmin }: RouteContext) => {
  const routes: JSX.Element[] = [
    <Route key="attendance" path="/hr/attendance" element={layout(<HRAttendance />)} />,
    <Route key="leave" path="/hr/leave" element={layout(<HRLeave />)} />,
    <Route key="learning" path="/hr/learning" element={layout(<HRLearning />)} />,
    <Route key="requisitions" path="/hr/requisitions" element={layout(<HRRequisitions />)} />,
  ];

  if (isAdmin) {
    routes.push(
      <Route key="employees" path="/hr/employees" element={layout(<HREmployees />)} />,
      <Route key="recruitment" path="/hr/recruitment" element={layout(<HRRecruitment />)} />,
      <Route key="performance" path="/hr/performance" element={layout(<HRPerformance />)} />,
      <Route key="payroll" path="/hr/payroll" element={layout(<HRPayroll />)} />,
      <Route key="contracts" path="/hr/contracts" element={layout(<HRContracts />)} />,
    );
  }

  routes.push(<Route key="hr-fallback" path="/hr/*" element={layout(<ModulePlaceholder />)} />);

  return routes;
};
