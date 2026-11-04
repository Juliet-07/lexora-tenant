import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, RotateCcw, Save } from "lucide-react";
import {
  updateHealthScoreSettings,
  type HealthScore,
  type HsModuleKey,
} from "@/lib/grc/health-score-api";

type Row = { weight: string; floor: string; target: string };

const rowKey = (m: string, i: string) => `${m}.${i}`;

// Lets an administrator tune the model for their company: how much each
// area counts toward the total, and each indicator's weight, floor and
// target. Only values that differ from the defaults are stored.
export default function SettingsTab({ hs }: { hs: HealthScore }) {
  const qc = useQueryClient();
  const initial = useMemo(() => {
    const w: Record<string, string> = {};
    const r: Record<string, Row> = {};
    hs.modules.forEach((m) => {
      w[m.key] = String(m.weight);
      m.indicators.forEach((i) => {
        r[rowKey(m.key, i.key)] = {
          weight: String(i.weight),
          floor: String(i.floor),
          target: String(i.target),
        };
      });
    });
    return { w, r };
  }, [hs]);

  const [weights, setWeights] = useState(initial.w);
  const [rows, setRows] = useState(initial.r);
  const [open, setOpen] = useState<string | null>(null);

  const total = hs.modules.reduce(
    (s, m) => s + (Number(weights[m.key]) || 0),
    0,
  );
  const totalOk = Math.abs(total - 100) < 0.01;

  const dirty =
    JSON.stringify(weights) !== JSON.stringify(initial.w) ||
    JSON.stringify(rows) !== JSON.stringify(initial.r);

  const errors: string[] = [];
  hs.modules.forEach((m) =>
    m.indicators.forEach((i) => {
      const r = rows[rowKey(m.key, i.key)];
      const nums = [r.weight, r.floor, r.target].map(Number);
      if (
        [r.weight, r.floor, r.target].some((x) => x.trim() === "") ||
        nums.some(Number.isNaN)
      )
        errors.push(`${i.label}: enter numbers for weight, floor and target.`);
      else if (nums[0] < 0)
        errors.push(`${i.label}: weight cannot be negative.`);
      else if (nums[1] === nums[2])
        errors.push(`${i.label}: floor and target must differ.`);
    }),
  );

  const onError = (err: any) =>
    toast.error(
      err?.response?.status === 403
        ? "Only owners, admins, managers and compliance officers can change the scoring."
        : (err?.response?.data?.message ?? "Could not save the settings."),
    );

  const save = useMutation({
    mutationFn: () => {
      const moduleWeights: Partial<Record<HsModuleKey, number>> = {};
      hs.modules.forEach((m) => {
        if (Number(weights[m.key]) !== m.defaultWeight)
          moduleWeights[m.key] = Number(weights[m.key]);
      });
      const indicators: Record<
        string,
        { weight: number; floor: number; target: number }
      > = {};
      hs.modules.forEach((m) =>
        m.indicators.forEach((i) => {
          const r = rows[rowKey(m.key, i.key)];
          const v = {
            weight: Number(r.weight),
            floor: Number(r.floor),
            target: Number(r.target),
          };
          if (
            v.weight !== i.defaultWeight ||
            v.floor !== i.defaultFloor ||
            v.target !== i.defaultTarget
          )
            indicators[rowKey(m.key, i.key)] = v;
        }),
      );
      // Always send all five area weights so the total is checked as a set.
      const allWeights = Object.fromEntries(
        hs.modules.map((m) => [m.key, Number(weights[m.key])]),
      ) as Record<HsModuleKey, number>;
      return updateHealthScoreSettings({
        moduleWeights: allWeights,
        indicators,
      });
    },
    onSuccess: () => {
      toast.success("Scoring settings saved.");
      qc.invalidateQueries({ queryKey: ["grcHealthScore"] });
    },
    onError,
  });

  const reset = useMutation({
    mutationFn: () => updateHealthScoreSettings({ reset: true }),
    onSuccess: () => {
      toast.success("Back to the default scoring.");
      qc.invalidateQueries({ queryKey: ["grcHealthScore"] });
    },
    onError,
  });

  const setRow = (k: string, f: keyof Row, v: string) =>
    setRows((p) => ({ ...p, [k]: { ...p[k], [f]: v } }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            These are the product defaults. You can change them to reflect your
            own risk appetite — for example, raise the weight of Finance or
            lower a target your sector does not need. Changes apply to your
            company only and recalculate the score straight away.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hs.customised || reset.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Reset every weight, floor and target to the defaults?",
                  )
                )
                  reset.mutate();
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Reset to defaults
            </Button>
            <Button
              size="sm"
              disabled={
                !dirty || !totalOk || errors.length > 0 || save.isPending
              }
              onClick={() => save.mutate()}
            >
              <Save className="mr-1 h-4 w-4" />
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Area weights
            <Badge
              variant="outline"
              className={
                totalOk
                  ? "border-emerald-300 text-emerald-700"
                  : "border-rose-300 text-rose-700"
              }
            >
              Total {Math.round(total * 100) / 100}%{" "}
              {totalOk ? "✓" : "— must be 100%"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {hs.modules.map((m) => (
            <label key={m.key} className="space-y-1 text-sm">
              <span className="flex items-center justify-between font-medium">
                {m.name}
                <span className="text-xs font-normal text-muted-foreground">
                  default {m.defaultWeight}
                </span>
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step="any"
                value={weights[m.key]}
                onChange={(e) =>
                  setWeights((p) => ({ ...p, [m.key]: e.target.value }))
                }
                aria-label={`${m.name} weight`}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {hs.modules.map((m) => {
        const isOpen = open === m.key;
        const changed = m.indicators.filter((i) => {
          const r = rows[rowKey(m.key, i.key)];
          return (
            Number(r.weight) !== i.defaultWeight ||
            Number(r.floor) !== i.defaultFloor ||
            Number(r.target) !== i.defaultTarget
          );
        }).length;
        return (
          <Collapsible
            key={m.key}
            open={isOpen}
            onOpenChange={(o) => setOpen(o ? m.key : null)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <div className="font-semibold">{m.name} indicators</div>
                    <div className="text-xs text-muted-foreground">
                      {m.totalCount} indicators
                      {changed > 0 ? ` · ${changed} changed from default` : ""}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 border-t pt-4">
                  <div className="hidden grid-cols-[1fr_90px_90px_90px] gap-3 text-xs font-medium text-muted-foreground md:grid">
                    <span>Indicator</span>
                    <span>Weight</span>
                    <span>Floor (0)</span>
                    <span>Target (100)</span>
                  </div>
                  {m.indicators.map((i) => {
                    const k = rowKey(m.key, i.key);
                    const r = rows[k];
                    return (
                      <div
                        key={k}
                        className="grid grid-cols-3 items-center gap-3 md:grid-cols-[1fr_90px_90px_90px]"
                      >
                        <div className="col-span-3 md:col-span-1">
                          <div className="text-sm font-medium">{i.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.unit === "%"
                              ? "percentage"
                              : i.unit === "x"
                                ? "ratio"
                                : "months"}{" "}
                            · default {i.defaultWeight} / {i.defaultFloor} /{" "}
                            {i.defaultTarget}
                          </div>
                        </div>
                        {(["weight", "floor", "target"] as const).map((f) => (
                          <Input
                            key={f}
                            type="number"
                            step="any"
                            value={r[f]}
                            onChange={(e) => setRow(k, f, e.target.value)}
                            aria-label={`${i.label} ${f}`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {errors.length > 0 && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errors.slice(0, 4).map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
