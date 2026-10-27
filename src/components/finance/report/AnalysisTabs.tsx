import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchClientProfitability,
  fetchServiceLineReport,
  fetchWriteOffs,
  type WriteOffStage,
} from "@/lib/crm/finance-api";
import { makeFormatters, useReport } from "./shared";

// The three views that lived on the old Financials page and have no
// counterpart in the PO's ten-tab layout, kept as trailing tabs so
// nothing that was reachable before is lost. They read the ledger-side
// endpoints directly, so they are always in the tenant's own currency,
// whatever display currency the rest of the page is showing.

const COLORS = ["#4B0082", "#10b981", "#f59e0b", "#3b82f6", "#c62828", "#8b5cf6"];

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const day = (iso: string) => iso.slice(0, 10);

function useBase() {
  const { pack } = useReport();
  const f = makeFormatters(pack.meta.baseCurrency);
  return { pack, ...f };
}

type ContributionRow = {
  revenue: number;
  directExpenses: number;
  contribution: number;
  contributionMargin: number;
  [k: string]: any;
};

function ContributionTable({
  rows,
  labelKey,
  labelHeader,
}: {
  rows: ContributionRow[];
  labelKey: string;
  labelHeader: string;
}) {
  const { money } = useBase();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Direct expenses</TableHead>
          <TableHead className="text-right">Contribution</TableHead>
          <TableHead className="text-right">Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r[labelKey]}>
            <TableCell className="text-sm font-medium">{r[labelKey]}</TableCell>
            <TableCell className="text-right text-sm">{money(r.revenue)}</TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {r.directExpenses ? money(r.directExpenses) : "—"}
            </TableCell>
            <TableCell className={`text-right text-sm font-semibold ${r.contribution < 0 ? "text-destructive" : ""}`}>
              {money(r.contribution)}
            </TableCell>
            <TableCell className="text-right text-sm">
              <Badge
                variant="outline"
                className={
                  r.contributionMargin < 0 ? "text-destructive" : r.contributionMargin < 0.2 ? "text-warning" : "text-success"
                }
              >
                {(r.contributionMargin * 100).toFixed(1)}%
              </Badge>
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
              No invoiced revenue in this period yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ContributionChart({ data, angled }: { data: { name: string; value: number }[]; angled?: boolean }) {
  const { money } = useBase();
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="name"
          fontSize={angled ? 11 : 12}
          {...(angled ? { interval: 0, angle: -20, textAnchor: "end" as const, height: 60 } : {})}
        />
        <YAxis fontSize={12} />
        <Tooltip formatter={(v: number) => money(v)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((r, i) => (
            <Cell key={i} fill={r.value < 0 ? "#c62828" : COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const Note = ({ text }: { text?: string }) =>
  text ? (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {text}
    </p>
  ) : null;

export function ServiceLineTab() {
  const { pack } = useBase();
  const from = day(pack.meta.from);
  const to = day(pack.meta.to);
  const { data } = useQuery({
    queryKey: ["serviceLine", from, to],
    queryFn: () => fetchServiceLineReport(from, to),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Contribution by service line
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {pack.meta.periodLabel} · {pack.meta.baseCurrency}
          </span>
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={!data?.rows.length}
          onClick={() =>
            data &&
            downloadCsv(
              `service_line_pl_${from}_${to}.csv`,
              ["Service line", "Revenue", "Direct expenses", "Contribution", "Margin"],
              data.rows.map((r) => [r.serviceLine, r.revenue, r.directExpenses, r.contribution, r.contributionMargin]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data && (
          <>
            <ContributionChart data={data.rows.map((r) => ({ name: r.serviceLine, value: r.contribution }))} />
            <ContributionTable rows={data.rows} labelKey="serviceLine" labelHeader="Service line" />
            <Note text={data.note} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientProfitabilityTab() {
  const { pack } = useBase();
  const from = day(pack.meta.from);
  const to = day(pack.meta.to);
  const { data } = useQuery({
    queryKey: ["clientProfitability", from, to],
    queryFn: () => fetchClientProfitability(from, to),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Contribution by client
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {pack.meta.periodLabel} · {pack.meta.baseCurrency}
          </span>
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled={!data?.rows.length}
          onClick={() =>
            data &&
            downloadCsv(
              `client_profitability_${from}_${to}.csv`,
              ["Client", "Revenue", "Direct expenses", "Contribution", "Margin"],
              data.rows.map((r) => [r.clientName, r.revenue, r.directExpenses, r.contribution, r.contributionMargin]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data && (
          <>
            <ContributionChart
              angled
              data={data.rows.slice(0, 12).map((r) => ({ name: r.clientName, value: r.contribution }))}
            />
            <ContributionTable rows={data.rows} labelKey="clientName" labelHeader="Client" />
            <Note text={data.note} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

const STAGES: WriteOffStage[] = ["WIP write-down", "Credit note", "Bad debt write-off"];

export function WriteOffsTab() {
  const { money } = useBase();
  const [stage, setStage] = useState<WriteOffStage | "All">("All");
  const { data: rows = [] } = useQuery({
    queryKey: ["writeOffs", stage],
    queryFn: () => fetchWriteOffs(stage === "All" ? undefined : stage),
  });
  const total = rows.reduce((s, w) => s + w.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Write-downs & write-offs — single audit trail</CardTitle>
        <p className="text-sm text-muted-foreground">
          One lifecycle, three checkpoints: unbilled WIP, issued invoice (credit note), and uncollectible receivable (bad debt).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["All", ...STAGES] as const).map((s) => (
            <Button key={s} size="sm" variant={stage === s ? "default" : "outline"} onClick={() => setStage(s)}>
              {s}
            </Button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            Total value <span className="font-semibold text-foreground">{money(total)}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                `write_offs_${stage === "All" ? "all" : stage.replace(/\s+/g, "_")}.csv`,
                ["Ref", "Stage", "Reference", "Client", "Mandate", "Amount", "Reason", "Approved by", "Date", "Status"],
                rows.map((w) => [
                  w.ref,
                  w.stage,
                  w.reference,
                  w.clientName,
                  w.mandateName,
                  w.amount,
                  w.reason,
                  w.approvedBy,
                  w.createdAt?.slice(0, 10) ?? "",
                  w.status,
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Client / mandate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Approved by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w._id}>
                  <TableCell className="text-sm font-medium">{w.ref}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {w.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{w.reference}</TableCell>
                  <TableCell className="text-sm">
                    {w.clientName}
                    <span className="block text-xs text-muted-foreground">{w.mandateName}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">{money(w.amount)}</TableCell>
                  <TableCell className="max-w-[240px] text-sm">{w.reason}</TableCell>
                  <TableCell className="text-sm">{w.approvedBy}</TableCell>
                  <TableCell className="text-sm">{w.createdAt?.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${w.status === "Pending approval" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {w.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No write-offs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
