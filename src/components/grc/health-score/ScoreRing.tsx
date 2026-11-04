import { TONE_HEX, scoreTone, fmtScore } from "@/lib/grc/health-score-api";

// A circular gauge. The arc length is the score out of 100.
export function ScoreRing({
  score,
  size = 140,
  stroke = 12,
  label,
  sub,
}: {
  score: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        score === null ? "No score yet" : `Score ${fmtScore(score)} out of 100`
      }
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={TONE_HEX[scoreTone(score)]}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold leading-none">{fmtScore(score)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {sub ?? "out of 100"}
        </div>
        {label && <div className="mt-0.5 text-xs font-semibold">{label}</div>}
      </div>
    </div>
  );
}
