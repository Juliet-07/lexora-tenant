import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Deterministic pseudo-random generator so star positions are stable
// across renders (no layout flicker on route changes).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  left: number;
  top: number;
  size: number;
  accent: boolean;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

export function FloatingStars({
  count = 26,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const stars = useMemo<Star[]>(() => {
    const rand = mulberry32(20260929);
    return Array.from({ length: count }, () => ({
      left: rand() * 100,
      top: rand() * 100,
      size: 1.5 + rand() * 2.5,
      accent: rand() > 0.65,
      delay: rand() * 8,
      duration: 5 + rand() * 6,
      driftX: (rand() - 0.5) * 18,
      driftY: -6 - rand() * 14,
    }));
  }, [count]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {stars.map((star, i) => (
        <span
          key={i}
          className="marketing-star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s, ${star.delay}s`,
            animationDuration: `${star.duration}s, ${star.duration * 2.5}s`,
            ["--star-drift-x" as string]: `${star.driftX}px`,
            ["--star-drift-y" as string]: `${star.driftY}px`,
            ["--star-color" as string]: star.accent
              ? "hsl(var(--intro-accent))"
              : "hsl(var(--intro-highlight))",
          }}
        />
      ))}
    </div>
  );
}
