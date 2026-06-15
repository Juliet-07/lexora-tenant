import { Route } from "react-router-dom";
import { layout, RouteContext } from "./_helpers";
import { ModulePlaceholder } from "@/components/layout/ModulePlaceholder";
import Compliance from "@/pages/aml/Compliance";
import AmlReports from "@/pages/aml/Reports";
import RiskEngine from "@/pages/aml/RiskEngine";
import TransactionMonitoring from "@/pages/aml/TransactionMonitoring";
import STR from "@/pages/aml/STR";
import WatchlistManagement from "@/pages/aml/WatchlistManagement";

/** AML / KYC module — admin only for sensitive screens. */
export const amlRoutes = ({ isAdmin }: RouteContext) => {
  const routes: JSX.Element[] = [];

  if (isAdmin) {
    routes.push(
      <Route key="risk" path="/aml/risk" element={layout(<RiskEngine />)} />,
      <Route key="tx" path="/aml/transactions" element={layout(<TransactionMonitoring />)} />,
      <Route key="sar" path="/aml/sar" element={layout(<STR />)} />,
      <Route key="watchlist" path="/aml/watchlist" element={layout(<WatchlistManagement />)} />,
      <Route key="compliance" path="/aml/compliance" element={layout(<Compliance />)} />,
      <Route key="reports" path="/aml/reports" element={layout(<AmlReports />)} />,
    );
  }

  routes.push(
    <Route key="aml-fallback" path="/aml/*" element={layout(<ModulePlaceholder />)} />,
  );

  return routes;
};
