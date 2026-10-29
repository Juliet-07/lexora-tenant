import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CapTable, Convertible } from "@/lib/grc/ownership-api";
import {
  runSimulation,
  type SimFigure,
  type SimResult,
  type SimScenario,
} from "@/lib/grc/cap-simulation";
import { Field, SLICE_COLORS, fmtNum, fmtPct } from "../shared";

const TYPES: { value: SimScenario["type"]; label: string }[] = [
  { value: "newRound", label: "New investment round" },
  { value: "transfer", label: "Share transfer" },
  { value: "split", label: "Share split / consolidation" },
  { value: "buyback", label: "Share buyback" },
  { value: "esop", label: "ESOP / option pool" },
  { value: "convertConversion", label: "Convertible note conversion" },
  { value: "bonusIssue", label: "Bonus issue (capitalisation)" },
  { value: "rightsIssue", label: "Rights issue" },
  { value: "dilutionWaterfall", label: "Dilution waterfall (multi-round)" },
];

const ROUND_LABELS = ["Seed", "Series A", "Series B", "Series C"];
const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

function Figure({ f, money }: { f: SimFigure; money: (n: number) => string }) {
  const value =
    f.kind === "money"
      ? money(f.value)
      : f.kind === "num"
        ? fmtNum(f.value)
        : f.kind === "pct"
          ? fmtPct(f.value)
          : f.value;
  return (
    <div className="rounded-md border p-3">
      <p className="text-[11px] text-muted-foreground">{f.label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
      {f.sub && <p className="text-[11px] text-muted-foreground">{f.sub}</p>}
    </div>
  );
}

function Results({
  result,
  money,
}: {
  result: SimResult;
  money: (n: number) => string;
}) {
  if (result.error) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
        {result.error}
      </div>
    );
  }
  const wf = result.waterfall;
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Simulation results</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {result.figures.map((f) => (
          <Figure key={f.label} f={f} money={money} />
        ))}
      </div>

      {wf ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holder</TableHead>
                <TableHead className="text-right">Current</TableHead>
                {wf.labels.map((l) => (
                  <TableHead key={l} className="text-right">
                    After {l}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {wf.rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.current == null ? "—" : fmtPct(r.current)}
                  </TableCell>
                  {r.after.map((a, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {a == null ? "—" : fmtPct(a)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div
            className="mt-3 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${wf.rounds.length}, minmax(0, 1fr))`,
            }}
          >
            {wf.rounds.map((r) => (
              <div
                key={r.label}
                className="rounded-md bg-muted/50 p-3 text-xs space-y-0.5"
              >
                <p className="font-semibold text-sm">{r.label}</p>
                <p>Raised: {money(r.raised)}</p>
                <p>Pre-money: {money(r.preMoney)}</p>
                <p>Post-money: {money(r.postMoney)}</p>
                <p>Investor: {fmtPct(r.investorPct)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Ownership — before and after
          </p>
          {result.rows.map((r, i) => {
            const up = r.deltaPct >= 0;
            return (
              <div key={r.name} className="flex items-center gap-3">
                <div className="w-44 truncate text-sm">
                  {r.name}
                  {r.excluded ? " ✕" : ""}
                </div>
                <div className="relative flex-1 h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full flex items-center px-2 text-[11px] font-semibold text-white"
                    style={{
                      width: `${Math.max(Math.min(100, r.afterPct), 4)}%`,
                      background: r.isNew
                        ? "#16A34A"
                        : SLICE_COLORS[i % SLICE_COLORS.length],
                    }}
                  >
                    {fmtPct(r.afterPct)}
                  </div>
                  {!r.isNew && r.beforePct > 0 && (
                    <div
                      className="absolute top-0 h-full border-l-2 border-dashed border-foreground/60"
                      style={{ left: `${Math.min(100, r.beforePct)}%` }}
                      title={`Before: ${fmtPct(r.beforePct)}`}
                    />
                  )}
                </div>
                <div
                  className={`w-24 text-right text-xs font-semibold tabular-nums ${
                    Math.abs(r.deltaPct) < 0.05
                      ? "text-muted-foreground"
                      : up
                        ? "text-emerald-600"
                        : "text-red-600"
                  }`}
                >
                  {Math.abs(r.deltaPct) < 0.05
                    ? "no change"
                    : `${up ? "+" : "−"}${Math.abs(r.deltaPct).toFixed(1)} pts`}
                </div>
                <div className="hidden lg:block w-44 text-[11px] text-muted-foreground">
                  {r.detail ??
                    `${fmtNum(r.before)} → ${fmtNum(r.after)} shares`}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">
            The dashed line marks each holder's current stake. Total shares:{" "}
            {fmtNum(result.totalBefore)} → {fmtNum(result.totalAfter)}.
          </p>
        </div>
      )}

      {result.notes.map((t) => (
        <div
          key={t}
          className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"
        >
          {t}
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        This is a what-if only — nothing here changes the register. Record real
        changes as transactions.
      </p>
    </div>
  );
}

export function SimulationPanel({
  cap,
  convertibles,
  money,
  baseCurrency,
}: {
  cap: CapTable;
  convertibles: Convertible[];
  money: (n: number) => string;
  baseCurrency: string;
}) {
  const holders = useMemo(
    () =>
      cap.holders
        .filter((h) => h.totalShares > 0)
        .map((h) => ({ id: h.nodeId, name: h.name, shares: h.totalShares })),
    [cap.holders],
  );
  const outstanding = convertibles.filter((c) => c.status === "Outstanding");
  const pps = cap.pricePerShare;

  const [type, setType] = useState<SimScenario["type"]>("newRound");
  // newRound
  const [investor, setInvestor] = useState("");
  const [amount, setAmount] = useState("");
  const [preMoney, setPreMoney] = useState("");
  // transfer / buyback
  const [fromId, setFromId] = useState("");
  const [shares, setShares] = useState("");
  const [toName, setToName] = useState("");
  const [bbPrice, setBbPrice] = useState("");
  // split / bonus / rights
  const [splitRatio, setSplitRatio] = useState("2");
  const [bonusRatio, setBonusRatio] = useState("0.5");
  const [bonusSource, setBonusSource] = useState("Share Premium Reserve");
  const [rightsRatio, setRightsRatio] = useState("0.5");
  const [rightsPrice, setRightsPrice] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  // esop
  const [poolName, setPoolName] = useState("Employee Stock Option Pool");
  const [poolPct, setPoolPct] = useState("10");
  const [poolSource, setPoolSource] = useState<"new" | "existing">("new");
  const [vestYears, setVestYears] = useState("4");
  const [cliff, setCliff] = useState("12");
  // convertible
  const [convId, setConvId] = useState("");
  const [roundSize, setRoundSize] = useState("");
  const [convPre, setConvPre] = useState("");
  // waterfall
  const [roundCount, setRoundCount] = useState("2");
  const [wf, setWf] = useState(
    ROUND_LABELS.map(() => ({ amount: "", pre: "" })),
  );
  const [result, setResult] = useState<SimResult | null>(null);

  useEffect(() => {
    if (!fromId && holders[0]) setFromId(holders[0].id);
  }, [holders, fromId]);
  useEffect(() => {
    if (!convId && outstanding[0]) setConvId(outstanding[0]._id);
  }, [outstanding, convId]);

  const run = () => {
    let scenario: SimScenario;
    switch (type) {
      case "newRound":
        scenario = { type, investor, amount: n(amount), preMoney: n(preMoney) };
        break;
      case "transfer":
        scenario = { type, fromId, shares: n(shares), toName };
        break;
      case "split":
        scenario = { type, ratio: Number(splitRatio) };
        break;
      case "buyback":
        scenario = { type, fromId, shares: n(shares), price: n(bbPrice) };
        break;
      case "esop":
        scenario = {
          type,
          name: poolName,
          pct: n(poolPct),
          source: poolSource,
          vestYears: Number(vestYears),
          cliffMonths: Number(cliff),
        };
        break;
      case "convertConversion": {
        const c = outstanding.find((x) => x._id === convId);
        if (!c) {
          setResult({
            error:
              "Add an outstanding SAFE or convertible note first (Convertible Instruments tab).",
            figures: [],
            rows: [],
            notes: [],
            totalBefore: 0,
            totalAfter: 0,
          });
          return;
        }
        scenario = {
          type,
          instrument: {
            type: c.type,
            investor: c.investor,
            amount: c.amount,
            valuationCap: c.valuationCap,
            discount: c.discount,
          },
          roundSize: n(roundSize),
          preMoney: n(convPre),
        };
        break;
      }
      case "bonusIssue":
        scenario = { type, ratio: Number(bonusRatio), source: bonusSource };
        break;
      case "rightsIssue":
        scenario = {
          type,
          ratio: Number(rightsRatio),
          price: n(rightsPrice),
          excludedIds: excluded,
        };
        break;
      case "dilutionWaterfall":
        scenario = {
          type,
          rounds: wf.slice(0, Number(roundCount)).map((r, i) => ({
            label: ROUND_LABELS[i],
            amount: n(r.amount),
            preMoney: n(r.pre),
          })),
        };
        break;
    }
    setResult(runSimulation(holders, pps, scenario));
  };

  const holderSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a holder" />
      </SelectTrigger>
      <SelectContent>
        {holders.map((h) => (
          <SelectItem key={h.id} value={h.id}>
            {h.name} ({fmtNum(h.shares)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const ratioSelect = (
    value: string,
    onChange: (v: string) => void,
    options: [string, string][],
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const money$ = (label: string) => `${label} (${baseCurrency})`;

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div>
          <h3 className="font-semibold">Equity simulation engine</h3>
          <p className="text-sm text-muted-foreground">
            Model the impact of a new round, a transfer or a restructuring on
            ownership before making any change. Based on today's register
            {pps > 0 ? ` at ${money(pps)} a share` : ""}. Amounts are entered in{" "}
            {baseCurrency}.
          </p>
        </div>

        {holders.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Nothing to simulate yet — issue shares to at least one shareholder
            first.
          </div>
        ) : (
          <div className="max-w-xl space-y-4">
            <Field label="Scenario type">
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as SimScenario["type"]);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {type === "newRound" && (
              <>
                <Field label="Investor name">
                  <Input
                    value={investor}
                    placeholder="e.g. Catalyst Fund"
                    onChange={(e) => setInvestor(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={money$("Investment amount")}>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                  <Field label={money$("Pre-money valuation")}>
                    <Input
                      type="number"
                      value={preMoney}
                      onChange={(e) => setPreMoney(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            {type === "transfer" && (
              <>
                <Field label="From">{holderSelect(fromId, setFromId)}</Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Shares to transfer">
                    <Input
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                    />
                  </Field>
                  <Field label="To">
                    <Input
                      value={toName}
                      placeholder="e.g. Strategic Partner"
                      onChange={(e) => setToName(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            {type === "split" && (
              <Field label="Split ratio">
                {ratioSelect(splitRatio, setSplitRatio, [
                  ["2", "2:1"],
                  ["3", "3:1"],
                  ["5", "5:1"],
                  ["10", "10:1"],
                  ["0.5", "1:2 (reverse)"],
                ])}
              </Field>
            )}

            {type === "buyback" && (
              <>
                <Field label="Bought back from">
                  {holderSelect(fromId, setFromId)}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Shares to buy back">
                    <Input
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                    />
                  </Field>
                  <Field
                    label={money$("Price per share")}
                    hint={pps ? `Defaults to the current price` : undefined}
                  >
                    <Input
                      type="number"
                      value={bbPrice}
                      onChange={(e) => setBbPrice(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            {type === "esop" && (
              <>
                <Field label="Pool name">
                  <Input
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pool size (% of total)">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={poolPct}
                      onChange={(e) => setPoolPct(e.target.value)}
                    />
                  </Field>
                  <Field label="Source">
                    {ratioSelect(
                      poolSource,
                      (v) => setPoolSource(v as "new" | "existing"),
                      [
                        ["new", "Issue new shares (dilutes all)"],
                        ["existing", "Carve from existing"],
                      ],
                    )}
                  </Field>
                  <Field label="Vesting period">
                    {ratioSelect(vestYears, setVestYears, [
                      ["3", "3 years"],
                      ["4", "4 years"],
                      ["5", "5 years"],
                    ])}
                  </Field>
                  <Field label="Cliff">
                    {ratioSelect(cliff, setCliff, [
                      ["12", "12 months"],
                      ["6", "6 months"],
                      ["0", "None"],
                    ])}
                  </Field>
                </div>
              </>
            )}

            {type === "convertConversion" && (
              <>
                <Field label="Convertible instrument">
                  <Select value={convId} onValueChange={setConvId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          outstanding.length
                            ? "Choose an instrument"
                            : "No outstanding instruments"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {outstanding.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.type} — {c.investor} ({money(c.amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={money$("Qualifying round size")}>
                    <Input
                      type="number"
                      value={roundSize}
                      onChange={(e) => setRoundSize(e.target.value)}
                    />
                  </Field>
                  <Field label={money$("Pre-money valuation")}>
                    <Input
                      type="number"
                      value={convPre}
                      onChange={(e) => setConvPre(e.target.value)}
                    />
                  </Field>
                </div>
              </>
            )}

            {type === "bonusIssue" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bonus ratio">
                  {ratioSelect(bonusRatio, setBonusRatio, [
                    ["1", "1:1 (1 bonus for every 1 held)"],
                    ["0.5", "1:2 (1 bonus for every 2 held)"],
                    ["0.25", "1:4 (1 bonus for every 4 held)"],
                    ["2", "2:1 (2 bonus for every 1 held)"],
                  ])}
                </Field>
                <Field label="Funded from">
                  {ratioSelect(bonusSource, setBonusSource, [
                    ["Share Premium Reserve", "Share premium reserve"],
                    ["Retained Earnings", "Retained earnings"],
                    [
                      "Capital Redemption Reserve",
                      "Capital redemption reserve",
                    ],
                  ])}
                </Field>
              </div>
            )}

            {type === "rightsIssue" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rights ratio">
                    {ratioSelect(rightsRatio, setRightsRatio, [
                      ["1", "1:1 (1 new for every 1 held)"],
                      ["0.5", "1:2 (1 new for every 2 held)"],
                      ["0.25", "1:4 (1 new for every 4 held)"],
                      ["2", "2:1 (2 new for every 1 held)"],
                    ])}
                  </Field>
                  <Field label={money$("Issue price per share")}>
                    <Input
                      type="number"
                      value={rightsPrice}
                      onChange={(e) => setRightsPrice(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Shareholders not taking part">
                  <div className="space-y-1.5 rounded-md border p-2">
                    {holders.map((h) => (
                      <label
                        key={h.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={excluded.includes(h.id)}
                          onCheckedChange={(v) =>
                            setExcluded((e) =>
                              v ? [...e, h.id] : e.filter((x) => x !== h.id),
                            )
                          }
                        />
                        {h.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({fmtNum(h.shares)} shares)
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {type === "dilutionWaterfall" && (
              <>
                <Field label="Number of rounds">
                  {ratioSelect(roundCount, setRoundCount, [
                    ["2", "2 rounds"],
                    ["3", "3 rounds"],
                  ])}
                </Field>
                {wf.slice(0, Number(roundCount)).map((r, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3 space-y-3">
                    <p className="text-xs font-semibold">
                      Round {i + 1}: {ROUND_LABELS[i]}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={money$("Investment")}>
                        <Input
                          type="number"
                          value={r.amount}
                          onChange={(e) =>
                            setWf((w) =>
                              w.map((x, j) =>
                                j === i ? { ...x, amount: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label={money$("Pre-money valuation")}>
                        <Input
                          type="number"
                          value={r.pre}
                          onChange={(e) =>
                            setWf((w) =>
                              w.map((x, j) =>
                                j === i ? { ...x, pre: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </>
            )}

            <Button onClick={run} className="w-full">
              <Play className="h-4 w-4 mr-2" /> Run simulation
            </Button>
          </div>
        )}

        {result && <Results result={result} money={money} />}
      </CardContent>
    </Card>
  );
}
