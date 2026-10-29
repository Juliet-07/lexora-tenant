// ─────────────────────────────────────────────────────────────
// Equity simulation engine (Cap Table → Simulation). Pure functions:
// given today's holdings and a scenario, work out what ownership would
// look like afterwards. Nothing is saved or changed — it is a "what if"
// the tenant runs before making a real change.
//
// All money is in the tenant's base currency (the UI converts for
// display). Percentages are 0–100 numbers, unrounded.
// ─────────────────────────────────────────────────────────────

export interface SimHolder {
  id: string;
  name: string;
  shares: number;
}

export type SimScenario =
  | { type: "newRound"; investor: string; amount: number; preMoney: number }
  | { type: "transfer"; fromId: string; shares: number; toName: string }
  | { type: "split"; ratio: number }
  | { type: "buyback"; fromId: string; shares: number; price: number }
  | {
      type: "esop";
      name: string;
      pct: number;
      source: "new" | "existing";
      vestYears: number;
      cliffMonths: number;
    }
  | {
      type: "convertConversion";
      instrument: {
        type: string;
        investor: string;
        amount: number;
        valuationCap: number;
        discount: number;
      };
      roundSize: number;
      preMoney: number;
    }
  | { type: "bonusIssue"; ratio: number; source: string }
  | {
      type: "rightsIssue";
      ratio: number;
      price: number;
      excludedIds: string[];
    }
  | {
      type: "dilutionWaterfall";
      rounds: { label: string; amount: number; preMoney: number }[];
    };

export type SimFigure =
  | { label: string; kind: "money"; value: number; sub?: string }
  | { label: string; kind: "num"; value: number; sub?: string }
  | { label: string; kind: "pct"; value: number; sub?: string }
  | { label: string; kind: "text"; value: string; sub?: string };

export interface SimRow {
  name: string;
  /** Shares before (0 for a brand-new holder). */
  before: number;
  beforePct: number;
  after: number;
  afterPct: number;
  /** afterPct − beforePct, in percentage points. */
  deltaPct: number;
  isNew?: boolean;
  /** Free-text detail shown beside the row (e.g. "1,000 + 500 bonus"). */
  detail?: string;
  /** Rights issue only — this holder takes no part. */
  excluded?: boolean;
}

export interface SimWaterfall {
  labels: string[];
  rows: { name: string; current: number | null; after: (number | null)[] }[];
  rounds: {
    label: string;
    raised: number;
    preMoney: number;
    postMoney: number;
    investorPct: number;
  }[];
}

export interface SimResult {
  error?: string;
  figures: SimFigure[];
  rows: SimRow[];
  notes: string[];
  waterfall?: SimWaterfall;
  totalBefore: number;
  totalAfter: number;
}

const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

const fail = (error: string, total = 0): SimResult => ({
  error,
  figures: [],
  rows: [],
  notes: [],
  totalBefore: total,
  totalAfter: total,
});

function buildRows(
  holders: SimHolder[],
  total: number,
  afterShares: (h: SimHolder) => number,
  newTotal: number,
  extra: {
    name: string;
    shares: number;
    detail?: string;
    isNew?: boolean;
  }[] = [],
  detail?: (h: SimHolder, after: number) => string | undefined,
): SimRow[] {
  const rows: SimRow[] = holders.map((h) => {
    const after = afterShares(h);
    return {
      name: h.name,
      before: h.shares,
      beforePct: pct(h.shares, total),
      after,
      afterPct: pct(after, newTotal),
      deltaPct: pct(after, newTotal) - pct(h.shares, total),
      detail: detail?.(h, after),
    };
  });
  for (const e of extra) {
    rows.push({
      name: e.name,
      before: 0,
      beforePct: 0,
      after: e.shares,
      afterPct: pct(e.shares, newTotal),
      deltaPct: pct(e.shares, newTotal),
      isNew: e.isNew ?? true,
      detail: e.detail,
    });
  }
  return rows;
}

export function runSimulation(
  holders: SimHolder[],
  pricePerShare: number,
  s: SimScenario,
): SimResult {
  const total = holders.reduce((a, h) => a + h.shares, 0);
  if (!holders.length || total <= 0) {
    return fail(
      "There are no issued shares yet — issue shares to a shareholder first, then model what-ifs.",
      total,
    );
  }
  const byId = (id: string) => holders.find((h) => h.id === id);

  switch (s.type) {
    case "newRound": {
      if (!(s.amount > 0) || !(s.preMoney > 0)) {
        return fail(
          "Enter the investment amount and a pre-money valuation.",
          total,
        );
      }
      const post = s.preMoney + s.amount;
      const newShares = Math.round(total * (s.amount / s.preMoney));
      const newTotal = total + newShares;
      return {
        figures: [
          { label: "Post-money", kind: "money", value: post },
          { label: "New shares", kind: "num", value: newShares },
          { label: "Investor stake", kind: "pct", value: pct(s.amount, post) },
          {
            label: "New price / share",
            kind: "money",
            value: Math.round(post / newTotal),
          },
        ],
        rows: buildRows(holders, total, (h) => h.shares, newTotal, [
          { name: `${s.investor || "New investor"} (new)`, shares: newShares },
        ]),
        notes: [],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "transfer": {
      const from = byId(s.fromId);
      if (!from) return fail("Choose who is transferring.", total);
      if (!(s.shares > 0)) return fail("Enter the number of shares.", total);
      if (s.shares > from.shares) {
        return fail(
          `${from.name} only holds ${from.shares.toLocaleString("en-US")} shares.`,
          total,
        );
      }
      const toName = s.toName.trim() || "Recipient";
      const existing = holders.find(
        (h) => h.name.toLowerCase() === toName.toLowerCase(),
      );
      const rows = buildRows(
        holders,
        total,
        (h) =>
          h.id === from.id
            ? h.shares - s.shares
            : existing && h.id === existing.id
              ? h.shares + s.shares
              : h.shares,
        total,
        existing ? [] : [{ name: `${toName} (new)`, shares: s.shares }],
      );
      return {
        figures: [
          { label: "Transferred", kind: "num", value: s.shares },
          {
            label: `${from.name} after`,
            kind: "num",
            value: from.shares - s.shares,
            sub: `−${pct(s.shares, total).toFixed(1)}%`,
          },
          {
            label: toName,
            kind: "pct",
            value: pct(s.shares + (existing?.shares ?? 0), total),
          },
          {
            label: "Total shares",
            kind: "num",
            value: total,
            sub: "unchanged",
          },
        ],
        rows,
        notes: [
          "A transfer moves existing shares between holders — the total in issue does not change.",
        ],
        totalBefore: total,
        totalAfter: total,
      };
    }

    case "split": {
      if (!(s.ratio > 0)) return fail("Choose a split ratio.", total);
      const newTotal = holders.reduce(
        (a, h) => a + Math.round(h.shares * s.ratio),
        0,
      );
      return {
        figures: [
          {
            label: "Ratio",
            kind: "text",
            value:
              s.ratio >= 1
                ? `${s.ratio}:1`
                : `1:${Math.round(1 / s.ratio)} (reverse)`,
          },
          { label: "New total", kind: "num", value: newTotal },
          {
            label: "New price / share",
            kind: "money",
            value: Math.round(pricePerShare / s.ratio),
          },
          { label: "Ownership", kind: "text", value: "Unchanged" },
        ],
        rows: buildRows(
          holders,
          total,
          (h) => Math.round(h.shares * s.ratio),
          newTotal,
        ),
        notes: [
          "Everyone's share count is multiplied by the ratio and the price per share divided by it, so each holder's percentage — and the company's value — stays the same.",
        ],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "buyback": {
      const from = byId(s.fromId);
      if (!from)
        return fail("Choose who the shares are bought back from.", total);
      if (!(s.shares > 0)) return fail("Enter the number of shares.", total);
      if (s.shares > from.shares) {
        return fail(
          `${from.name} only holds ${from.shares.toLocaleString("en-US")} shares.`,
          total,
        );
      }
      const price = s.price > 0 ? s.price : pricePerShare;
      const newTotal = total - s.shares;
      return {
        figures: [
          { label: "Cancelled", kind: "num", value: s.shares },
          { label: "Cost", kind: "money", value: s.shares * price },
          { label: "New total", kind: "num", value: newTotal },
          {
            label: `${from.name} after`,
            kind: "pct",
            value: pct(from.shares - s.shares, newTotal),
          },
        ],
        rows: buildRows(
          holders,
          total,
          (h) => (h.id === from.id ? h.shares - s.shares : h.shares),
          newTotal,
        ),
        notes: [
          "Bought-back shares are cancelled, so everyone who did not sell owns a bigger slice of a smaller company.",
        ],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "esop": {
      if (!(s.pct > 0) || s.pct >= 100) {
        return fail("Enter a pool size between 0 and 100%.", total);
      }
      const p = s.pct / 100;
      const fromNew = s.source === "new";
      const poolShares = fromNew
        ? Math.round((total * p) / (1 - p))
        : Math.round(total * p);
      const newTotal = fromNew ? total + poolShares : total;
      return {
        figures: [
          { label: "Pool size", kind: "num", value: poolShares, sub: "shares" },
          { label: "Pool %", kind: "pct", value: s.pct },
          { label: "Total after", kind: "num", value: newTotal },
          {
            label: "Vesting",
            kind: "text",
            value: `${s.vestYears} yrs`,
            sub: s.cliffMonths ? `${s.cliffMonths}-month cliff` : "no cliff",
          },
        ],
        rows: buildRows(
          holders,
          total,
          (h) => (fromNew ? h.shares : Math.round(h.shares * (1 - p))),
          newTotal,
          [{ name: s.name || "ESOP pool", shares: poolShares }],
        ),
        notes: [
          fromNew
            ? "New shares are issued for the pool, diluting every existing shareholder proportionally."
            : "The pool is carved out of existing holdings pro rata.",
          "Needs a board resolution and shareholder approval before it can be implemented.",
        ],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "convertConversion": {
      const c = s.instrument;
      if (!(s.preMoney > 0))
        return fail("Enter the round's pre-money valuation.", total);
      const ppsRound = s.preMoney / total;
      const discounted = ppsRound * (1 - (c.discount || 0) / 100);
      const capPps = c.valuationCap ? c.valuationCap / total : ppsRound;
      const effective = Math.min(discounted, capPps);
      if (!(effective > 0))
        return fail("The effective conversion price works out to zero.", total);
      const convShares = Math.round(c.amount / effective);
      const newTotal = total + convShares;
      return {
        figures: [
          {
            label: "Round price / share",
            kind: "money",
            value: Math.round(ppsRound),
          },
          {
            label: "Effective price",
            kind: "money",
            value: Math.round(effective),
            sub:
              capPps < discounted
                ? "valuation cap applied"
                : c.discount
                  ? `${c.discount}% discount`
                  : undefined,
          },
          { label: "Shares issued", kind: "num", value: convShares },
          {
            label: `${c.investor} stake`,
            kind: "pct",
            value: pct(convShares, newTotal),
          },
        ],
        rows: buildRows(holders, total, (h) => h.shares, newTotal, [
          { name: `${c.investor} (converted)`, shares: convShares },
        ]),
        notes: [
          `The ${c.type} converts at the lower of a ${c.discount || 0}% discount to the round price and the valuation cap${c.valuationCap ? ` of ${c.valuationCap.toLocaleString("en-US")}` : " (none set)"}.`,
        ],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "bonusIssue": {
      if (!(s.ratio > 0)) return fail("Choose a bonus ratio.", total);
      const bonusOf = (h: SimHolder) => Math.round(h.shares * s.ratio);
      const bonusTotal = holders.reduce((a, h) => a + bonusOf(h), 0);
      const newTotal = total + bonusTotal;
      return {
        figures: [
          { label: "Bonus shares", kind: "num", value: bonusTotal },
          { label: "New total", kind: "num", value: newTotal },
          {
            label: "Price / share after",
            kind: "money",
            value: Math.round(pricePerShare / (1 + s.ratio)),
          },
          { label: "Ownership", kind: "text", value: "Unchanged" },
        ],
        rows: buildRows(
          holders,
          total,
          (h) => h.shares + bonusOf(h),
          newTotal,
          [],
          (h) =>
            `${h.shares.toLocaleString("en-US")} + ${bonusOf(h).toLocaleString("en-US")} bonus`,
        ),
        notes: [
          `Funded from ${s.source}. No cash changes hands and every holder's percentage stays the same. Needs a board resolution.`,
        ],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "rightsIssue": {
      if (!(s.ratio > 0)) return fail("Choose a rights ratio.", total);
      const excluded = new Set(s.excludedIds);
      const rightsOf = (h: SimHolder) =>
        excluded.has(h.id) ? 0 : Math.round(h.shares * s.ratio);
      const newShares = holders.reduce((a, h) => a + rightsOf(h), 0);
      const newTotal = total + newShares;
      const rows = buildRows(
        holders,
        total,
        (h) => h.shares + rightsOf(h),
        newTotal,
        [],
        (h) =>
          excluded.has(h.id)
            ? "Not taking up rights"
            : `${h.shares.toLocaleString("en-US")} + ${rightsOf(h).toLocaleString("en-US")} rights`,
      ).map((r, i) => ({ ...r, excluded: excluded.has(holders[i].id) }));
      return {
        figures: [
          { label: "New shares", kind: "num", value: newShares },
          { label: "Issue price", kind: "money", value: s.price },
          {
            label: "Capital raised",
            kind: "money",
            value: newShares * s.price,
          },
          { label: "Total after", kind: "num", value: newTotal },
        ],
        rows,
        notes: excluded.size
          ? [
              "Holders who do not take part are diluted. Check pre-emption rights in the shareholders' agreement before proceeding.",
            ]
          : [],
        totalBefore: total,
        totalAfter: newTotal,
      };
    }

    case "dilutionWaterfall": {
      if (!s.rounds.length) return fail("Add at least one round.", total);
      let running = total;
      const names = holders.map((h) => h.name);
      const sharesByName = new Map(holders.map((h) => [h.name, h.shares]));
      const snapshots: { total: number; shares: Map<string, number> }[] = [];
      const rounds: SimWaterfall["rounds"] = [];
      for (const r of s.rounds) {
        if (!(r.amount > 0) || !(r.preMoney > 0)) {
          return fail(
            `Enter an investment and pre-money valuation for ${r.label}.`,
            total,
          );
        }
        const newShares = Math.round(running * (r.amount / r.preMoney));
        running += newShares;
        let name = `${r.label} investor`;
        while (sharesByName.has(name)) name += " ";
        sharesByName.set(name, newShares);
        names.push(name);
        snapshots.push({ total: running, shares: new Map(sharesByName) });
        rounds.push({
          label: r.label,
          raised: r.amount,
          preMoney: r.preMoney,
          postMoney: r.preMoney + r.amount,
          investorPct: pct(newShares, running),
        });
      }
      const rows = names.map((name) => ({
        name: name.trim(),
        current: holders.some((h) => h.name === name)
          ? pct(holders.find((h) => h.name === name)!.shares, total)
          : null,
        after: snapshots.map((snap) =>
          snap.shares.has(name)
            ? pct(snap.shares.get(name)!, snap.total)
            : null,
        ),
      }));
      const last = snapshots[snapshots.length - 1];
      return {
        figures: rounds.map((r) => ({
          label: r.label,
          kind: "pct" as const,
          value: r.investorPct,
          sub: `raised on a ${r.postMoney.toLocaleString("en-US")} post-money`,
        })),
        rows: holders.map((h) => ({
          name: h.name,
          before: h.shares,
          beforePct: pct(h.shares, total),
          after: h.shares,
          afterPct: pct(h.shares, last.total),
          deltaPct: pct(h.shares, last.total) - pct(h.shares, total),
        })),
        notes: [
          "Each round issues new shares at its pre-money valuation, so existing holders are diluted a little more every time.",
        ],
        waterfall: { labels: s.rounds.map((r) => r.label), rows, rounds },
        totalBefore: total,
        totalAfter: last.total,
      };
    }
  }
}
