import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchHealthScore, type HealthScore } from "@/lib/grc/health-score-api";
import DashboardTab from "./DashboardTab";
import AlgorithmTab from "./AlgorithmTab";
import TrendTab from "./TrendTab";
import SettingsTab from "./SettingsTab";
import ReportTab from "./ReportTab";

export const useHealthScore = () =>
  useQuery<HealthScore>({
    queryKey: ["grcHealthScore"],
    queryFn: fetchHealthScore,
  });

export default function HealthScorePanel({ hs }: { hs: HealthScore }) {
  return (
    <Tabs defaultValue="dashboard" className="space-y-5">
      <TabsList className="flex h-auto flex-wrap justify-start">
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        {/* <TabsTrigger value="how">How it’s calculated</TabsTrigger> */}
        <TabsTrigger value="trend">Trend</TabsTrigger>
        <TabsTrigger value="report">Report</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">
        <DashboardTab hs={hs} />
      </TabsContent>
      {/* <TabsContent value="how">
        <AlgorithmTab hs={hs} />
      </TabsContent> */}
      <TabsContent value="trend">
        <TrendTab hs={hs} />
      </TabsContent>
      <TabsContent value="report">
        <ReportTab hs={hs} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab hs={hs} />
      </TabsContent>
    </Tabs>
  );
}
