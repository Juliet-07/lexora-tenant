import { describe, expect, it } from "vitest";
import { runSimulation, type SimHolder } from "./cap-simulation";

const holders: SimHolder[] = [
  { id: "a", name: "Ann", shares: 6000 },
  { id: "b", name: "Bob", shares: 3000 },
  { id: "c", name: "Cy", shares: 1000 },
];
const sum = (r: ReturnType<typeof runSimulation>) =>
  r.rows.reduce((a, x) => a + x.afterPct, 0);

describe("cap simulation", () => {
  it("new round: post-money, new shares and dilution add up", () => {
    const r = runSimulation(holders, 100, {
      type: "newRound",
      investor: "Fund",
      amount: 100,
      preMoney: 400,
    });
    // 10,000 * (100/400) = 2,500 new shares; investor owns 2,500/12,500 = 20%
    expect(r.totalAfter).toBe(12500);
    expect(r.rows.find((x) => x.isNew)!.afterPct).toBeCloseTo(20);
    expect(r.rows[0].afterPct).toBeCloseTo(48);
    expect(sum(r)).toBeCloseTo(100);
  });
  it("transfer cannot exceed holdings; total unchanged", () => {
    expect(
      runSimulation(holders, 1, {
        type: "transfer",
        fromId: "c",
        shares: 5000,
        toName: "X",
      }).error,
    ).toMatch(/only holds 1,000/);
    const r = runSimulation(holders, 1, {
      type: "transfer",
      fromId: "a",
      shares: 1000,
      toName: "Zed",
    });
    expect(r.totalAfter).toBe(10000);
    expect(r.rows.find((x) => x.name.startsWith("Zed"))!.afterPct).toBeCloseTo(
      10,
    );
    expect(sum(r)).toBeCloseTo(100);
  });
  it("transfer to an existing holder merges instead of adding a row", () => {
    const r = runSimulation(holders, 1, {
      type: "transfer",
      fromId: "a",
      shares: 1000,
      toName: "bob",
    });
    expect(r.rows).toHaveLength(3);
    expect(r.rows.find((x) => x.name === "Bob")!.after).toBe(4000);
  });
  it("split keeps percentages and divides the price", () => {
    const r = runSimulation(holders, 100, { type: "split", ratio: 2 });
    expect(r.totalAfter).toBe(20000);
    expect(r.rows[0].deltaPct).toBeCloseTo(0);
    expect(r.figures.find((f) => f.label === "New price / share")!.value).toBe(
      50,
    );
  });
  it("buyback shrinks the total and grows everyone else", () => {
    const r = runSimulation(holders, 100, {
      type: "buyback",
      fromId: "a",
      shares: 1000,
      price: 0,
    });
    expect(r.totalAfter).toBe(9000);
    expect(r.figures.find((f) => f.label === "Cost")!.value).toBe(100000); // falls back to current price
    expect(r.rows.find((x) => x.name === "Bob")!.deltaPct).toBeGreaterThan(0);
    expect(sum(r)).toBeCloseTo(100);
  });
  it("esop from new shares leaves the pool at exactly the requested %", () => {
    const r = runSimulation(holders, 1, {
      type: "esop",
      name: "Pool",
      pct: 10,
      source: "new",
      vestYears: 4,
      cliffMonths: 12,
    });
    expect(r.rows.find((x) => x.isNew)!.afterPct).toBeCloseTo(10, 1);
    expect(sum(r)).toBeCloseTo(100, 1);
  });
  it("esop carved from existing keeps the total", () => {
    const r = runSimulation(holders, 1, {
      type: "esop",
      name: "Pool",
      pct: 10,
      source: "existing",
      vestYears: 4,
      cliffMonths: 0,
    });
    expect(r.totalAfter).toBe(10000);
    expect(r.rows.find((x) => x.isNew)!.after).toBe(1000);
    expect(sum(r)).toBeCloseTo(100, 1);
  });
  it("convertible converts at the better of discount and cap", () => {
    const base = { type: "SAFE", investor: "Seed Co", amount: 1000 };
    // round pps = 1000 (preMoney 10M / 10k). 20% discount -> 800. cap 5M -> 500 => cap wins
    const r = runSimulation(holders, 1, {
      type: "convertConversion",
      roundSize: 0,
      preMoney: 10_000_000,
      instrument: { ...base, valuationCap: 5_000_000, discount: 20 },
    });
    expect(r.figures.find((f) => f.label === "Effective price")!.value).toBe(
      500,
    );
    expect(r.figures.find((f) => f.label === "Shares issued")!.value).toBe(2);
    const noCap = runSimulation(holders, 1, {
      type: "convertConversion",
      roundSize: 0,
      preMoney: 10_000_000,
      instrument: { ...base, valuationCap: 0, discount: 20 },
    });
    expect(
      noCap.figures.find((f) => f.label === "Effective price")!.value,
    ).toBe(800);
  });
  it("bonus issue leaves percentages unchanged", () => {
    const r = runSimulation(holders, 100, {
      type: "bonusIssue",
      ratio: 0.5,
      source: "Retained Earnings",
    });
    expect(r.totalAfter).toBe(15000);
    r.rows.forEach((x) => expect(x.deltaPct).toBeCloseTo(0));
  });
  it("rights issue dilutes non-participants", () => {
    const r = runSimulation(holders, 100, {
      type: "rightsIssue",
      ratio: 1,
      price: 10,
      excludedIds: ["c"],
    });
    expect(r.rows.find((x) => x.name === "Cy")!.deltaPct).toBeLessThan(0);
    expect(r.rows.find((x) => x.name === "Ann")!.excluded).toBe(false);
    expect(r.figures.find((f) => f.label === "Capital raised")!.value).toBe(
      90000,
    );
    expect(sum(r)).toBeCloseTo(100);
  });
  it("waterfall dilutes cumulatively", () => {
    const r = runSimulation(holders, 1, {
      type: "dilutionWaterfall",
      rounds: [
        { label: "Seed", amount: 50, preMoney: 150 },
        { label: "Series A", amount: 100, preMoney: 400 },
      ],
    });
    const ann = r.waterfall!.rows.find((x) => x.name === "Ann")!;
    expect(ann.current).toBeCloseTo(60);
    expect(ann.after[1]!).toBeLessThan(ann.after[0]!);
    expect(
      r.waterfall!.rows.find((x) => x.name === "Seed investor")!.current,
    ).toBeNull();
    // every column sums to 100
    [0, 1].forEach((i) =>
      expect(
        r.waterfall!.rows.reduce((a, x) => a + (x.after[i] ?? 0), 0),
      ).toBeCloseTo(100, 1),
    );
  });
  it("refuses to model an empty cap table", () => {
    expect(runSimulation([], 1, { type: "split", ratio: 2 }).error).toMatch(
      /no issued shares/,
    );
  });
});
