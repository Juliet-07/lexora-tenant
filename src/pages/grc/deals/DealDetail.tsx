import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  DEAL_STAGES,
  type DealStage,
  stageColor,
  formatMoney,
  fetchDeal,
  setDealStage,
  setDealStatus,
} from "@/lib/grc/deals-api";
import OverviewTab from "./tabs/OverviewTab";
import TermSheetTab from "./tabs/TermSheetTab";
import DataRoomTab from "./tabs/DataRoomTab";
import DDTab from "./tabs/DDTab";
import ContractTab from "./tabs/ContractTab";
import CPsTab from "./tabs/CPsTab";
import SigningTab from "./tabs/SigningTab";
import PostTab from "./tabs/PostTab";

export default function DealDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetchDeal(id!),
    enabled: !!id,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", id] });
  const stageMut = useMutation({
    mutationFn: (stage: DealStage) => setDealStage(id!, stage),
    onSuccess: invalidate,
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update stage"),
  });
  const statusMut = useMutation({
    mutationFn: (status: any) => setDealStatus(id!, status),
    onSuccess: invalidate,
  });

  if (isLoading)
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading deal…
      </div>
    );

  if (!deal)
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => nav("/grc/deals/pipeline")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="mt-6 text-muted-foreground">Deal not found.</div>
      </div>
    );

  const stageIdx = DEAL_STAGES.indexOf(deal.stage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/grc/deals/pipeline" className="hover:underline">
          Deal Pipeline
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{deal.name}</span>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{deal.name}</h1>
                <Badge variant="outline">{deal.type}</Badge>
                <Badge variant="outline" className={stageColor(deal.stage)}>
                  {deal.stage}
                </Badge>
                <Badge variant="outline">{deal.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {deal.client} <span className="mx-1">↔</span>{" "}
                {deal.counterparty} · Lead: {deal.leadPartner} ·{" "}
                {deal.jurisdiction}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={deal.stage}
                onValueChange={(v) => stageMut.mutate(v as DealStage)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={deal.status}
                onValueChange={(v) => statusMut.mutate(v)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Active", "Completed", "Lost", "On Hold"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-1">
            {DEAL_STAGES.map((st, i) => (
              <button
                key={st}
                onClick={() => stageMut.mutate(st)}
                className={`text-[10px] py-2 px-1 rounded border transition text-center ${
                  i < stageIdx
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                    : i === stageIdx
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i + 1}. {st}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Value</div>
              <div className="font-semibold">
                {formatMoney(deal.value, deal.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Start</div>
              <div className="font-semibold">{deal.startDate.slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Target close</div>
              <div className="font-semibold">
                {deal.targetClose.slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Longstop</div>
              <div
                className={`font-semibold ${deal.longstopDate.slice(0, 10) < new Date().toISOString().slice(0, 10) ? "text-rose-600" : ""}`}
              >
                {deal.longstopDate.slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">DD / CPs</div>
              <div className="font-semibold">
                {deal.ddProgress}% · {deal.cpsProgress.done}/
                {deal.cpsProgress.total}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="termsheet">Term Sheet</TabsTrigger>
          <TabsTrigger value="dataroom">Data Room</TabsTrigger>
          <TabsTrigger value="dd">Due Diligence</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="cps">CPs Tracker</TabsTrigger>
          <TabsTrigger value="signing">Signing</TabsTrigger>
          <TabsTrigger value="post">Post-Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab deal={deal} />
        </TabsContent>
        <TabsContent value="termsheet">
          <TermSheetTab deal={deal} />
        </TabsContent>
        <TabsContent value="dataroom">
          <DataRoomTab deal={deal} />
        </TabsContent>
        <TabsContent value="dd">
          <DDTab deal={deal} />
        </TabsContent>
        <TabsContent value="contract">
          <ContractTab deal={deal} />
        </TabsContent>
        <TabsContent value="cps">
          <CPsTab deal={deal} />
        </TabsContent>
        <TabsContent value="signing">
          <SigningTab deal={deal} />
        </TabsContent>
        <TabsContent value="post">
          <PostTab deal={deal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
