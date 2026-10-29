import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchCapTable,
  fetchConvertibles,
  fetchShareTransactions,
  fetchVesting,
} from "@/lib/grc/ownership-api";
import { exportReportPdf } from "@/lib/grc/reportExport";
import {
  CurrencySwitcher,
  EmptyState,
  StatCards,
  fmtDate,
  fmtNum,
  fmtPct,
  useMoney,
} from "./shared";
import { RegisterPanel } from "./cap/RegisterPanel";
import { ClassesPanel } from "./cap/ClassesPanel";
import { SimulationPanel } from "./cap/SimulationPanel";
import { TransactionsPanel } from "./cap/TransactionsPanel";
import { VestingPanel } from "./cap/VestingPanel";
import { ConvertiblesPanel } from "./cap/ConvertiblesPanel";
import { ShareholderDocsPanel } from "./cap/ShareholderDocsPanel";
import {
  AddShareholderDialog,
  IssueSharesDialog,
  TransferDialog,
} from "./cap/dialogs";

export function CapTableTab({
  displayCurrency,
  onDisplayCurrencyChange,
}: {
  displayCurrency: string;
  onDisplayCurrencyChange: (c: string) => void;
}) {
  const [sub, setSub] = useState("register");
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [issue, setIssue] = useState<{
    open: boolean;
    nodeId?: string;
  }>({ open: false });

  const {
    data: cap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cap-table"],
    queryFn: fetchCapTable,
  });
  const { data: convertibles = [] } = useQuery({
    queryKey: ["cap-convertibles"],
    queryFn: fetchConvertibles,
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["cap-transactions"],
    queryFn: fetchShareTransactions,
  });
  const { data: vesting = [] } = useQuery({
    queryKey: ["cap-vesting"],
    queryFn: fetchVesting,
  });
  const fx = useMoney(cap?.baseCurrency, displayCurrency);
  const { money } = fx;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !cap) {
    return (
      <EmptyState
        title="Couldn't load the cap table"
        hint="Refresh the page and try again."
      />
    );
  }

  const outstanding = convertibles.filter((c) => c.status === "Outstanding");

  const downloadReport = () =>
    exportReportPdf({
      id: "cap-table-report",
      title: "Cap Table & Share Register Report",
      subtitle: `Organisation Structure — values in ${fx.currency}`,
      summary: [
        { label: "Issued shares", value: fmtNum(cap.stats.issued) },
        { label: "Authorised", value: fmtNum(cap.stats.authorised) },
        { label: "Shareholders", value: cap.stats.shareholders },
        { label: "Price per share", value: money(cap.pricePerShare) },
        { label: "Company valuation", value: money(cap.stats.valuation) },
      ],
      sections: [
        {
          heading: "Share register",
          columns: [
            "Shareholder",
            "Roles",
            "Shares",
            "Ownership",
            "Voting power",
            "Value",
          ],
          rows: cap.holders.map((h) => [
            h.name,
            h.types.join(", "),
            fmtNum(h.totalShares),
            fmtPct(h.pct),
            fmtPct(h.votingPct),
            money(h.value),
          ]),
        },
        {
          heading: "Share classes",
          columns: [
            "Class",
            "Authorised",
            "Issued",
            "Holders",
            "Par value",
            "Voting",
            "Dividend",
            "Liquidation",
          ],
          rows: cap.classes.map((c) => [
            c.name,
            fmtNum(c.authorised),
            fmtNum(c.issued),
            c.holders,
            money(c.parValue),
            c.voting,
            c.dividendType +
              (c.dividendRate != null ? ` (${c.dividendRate}%)` : ""),
            c.liquidation || "—",
          ]),
        },
        {
          heading: "Convertible instruments",
          columns: [
            "Type",
            "Investor",
            "Amount",
            "Cap",
            "Discount",
            "Issued",
            "Status",
          ],
          rows: convertibles.map((c) => [
            c.type,
            c.investor,
            money(c.amount),
            c.valuationCap ? money(c.valuationCap) : "—",
            c.discount ? `${c.discount}%` : "—",
            fmtDate(c.dateIssued),
            c.status,
          ]),
        },
        {
          heading: "Vesting schedules",
          columns: [
            "Holder",
            "Class",
            "Granted",
            "Total",
            "Vested",
            "Unvested",
            "Vested %",
          ],
          rows: vesting.map((v) => [
            v.holder,
            v.className ?? "—",
            fmtDate(v.grantDate),
            fmtNum(v.totalShares),
            fmtNum(v.vested),
            fmtNum(v.unvested),
            fmtPct(v.vestedPct),
          ]),
        },
        {
          heading: "Share ledger",
          columns: [
            "Date",
            "Type",
            "From",
            "To",
            "Class",
            "Shares",
            "Price",
            "Value",
            "Reference",
          ],
          rows: transactions.map((t) => [
            fmtDate(t.date),
            t.type,
            t.from ?? "—",
            t.to ?? "—",
            t.className ?? "—",
            t.type === "Valuation" ? "—" : fmtNum(t.shares),
            money(t.pricePerShare),
            t.type === "Valuation" ? "—" : money(t.value),
            t.reference || "—",
          ]),
        },
      ],
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CurrencySwitcher
          baseCurrency={cap.baseCurrency}
          value={displayCurrency}
          onChange={onDisplayCurrencyChange}
          status={fx}
        />
        <Button size="sm" variant="outline" onClick={downloadReport}>
          <Download className="h-4 w-4 mr-1.5" /> Download Cap Table Report
        </Button>
      </div>

      <StatCards
        items={[
          {
            label: "Total shares issued",
            value: fmtNum(cap.stats.issued),
            sub: `of ${fmtNum(cap.stats.authorised)} authorised`,
          },
          { label: "Shareholders", value: cap.stats.shareholders },
          { label: "Share classes", value: cap.classes.length },
          {
            label: "Company valuation",
            value: money(cap.stats.valuation),
            sub: `${money(cap.pricePerShare)} a share`,
          },
          {
            label: "Convertibles",
            value: outstanding.length,
            sub: "outstanding instruments",
          },
        ]}
      />

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="register">Share Register</TabsTrigger>
          <TabsTrigger value="classes">Share Classes</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="vesting">Vesting</TabsTrigger>
          <TabsTrigger value="convertibles">
            Convertible Instruments
          </TabsTrigger>
          <TabsTrigger value="documents">Shareholders Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <RegisterPanel
            cap={cap}
            money={money}
            onAddShareholder={() => setAddOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onIssue={(nodeId) => setIssue({ open: true, nodeId })}
          />
        </TabsContent>
        <TabsContent value="classes" className="mt-4">
          <ClassesPanel
            cap={cap}
            money={money}
            onIssue={() => setIssue({ open: true })}
          />
        </TabsContent>
        <TabsContent value="simulation" className="mt-4">
          <SimulationPanel
            cap={cap}
            convertibles={convertibles}
            money={money}
            baseCurrency={cap.baseCurrency}
          />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <TransactionsPanel cap={cap} money={money} />
        </TabsContent>
        <TabsContent value="vesting" className="mt-4">
          <VestingPanel cap={cap} money={money} />
        </TabsContent>
        <TabsContent value="convertibles" className="mt-4">
          <ConvertiblesPanel cap={cap} money={money} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <ShareholderDocsPanel cap={cap} />
        </TabsContent>
      </Tabs>

      <AddShareholderDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        cap={cap}
        baseCurrency={cap.baseCurrency}
      />
      <IssueSharesDialog
        open={issue.open}
        onOpenChange={(o) => setIssue((s) => ({ ...s, open: o }))}
        cap={cap}
        baseCurrency={cap.baseCurrency}
        presetNodeId={issue.nodeId}
      />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        cap={cap}
        baseCurrency={cap.baseCurrency}
      />
    </div>
  );
}
