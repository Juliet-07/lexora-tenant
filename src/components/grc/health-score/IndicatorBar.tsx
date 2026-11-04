import { TONE_BG, scoreTone } from "@/lib/grc/health-score-api";

// Horizontal bar of an indicator's 0–100 position, with a tick at 50
// (below it the indicator counts as "critical" and costs the module 5%).
export function IndicatorBar({
  value,
  muted,
}: {
  value: number | null;
  muted?: boolean;
}) {
  const tone = muted || value === null ? "none" : scoreTone(value);
  return (
    <div className="relative h-2 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${TONE_BG[tone]}`}
        style={{ width: `${value === null ? 0 : Math.max(2, value)}%` }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/20" />
    </div>
  );
}
