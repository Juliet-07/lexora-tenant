import lockupAsset from "@/assets/lexora-lockup.png.asset.json";
import markAsset from "@/assets/lexora-mark.png.asset.json";
import { cn } from "@/lib/utils";

export function LexoraBrand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <img
      src={compact ? markAsset.url : lockupAsset.url}
      alt={compact ? "Lexora" : "Lexora Africa"}
      className={cn(compact ? "h-9 w-9 object-contain" : "h-11 w-auto object-contain", className)}
    />
  );
}

const forms = [
  "rounded-t-full rounded-br-full",
  "rotate-45 rounded-sm",
  "rounded-full",
  "rounded-tl-full rounded-br-full",
  "rounded-sm",
];

export function ModuleGlyph({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn("relative flex h-10 w-10 items-center justify-center", className)} aria-hidden="true">
      <span className={cn("h-5 w-5 border border-current bg-current/10", forms[index % forms.length])} />
      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-intro-gold" />
    </span>
  );
}

export function InfrastructureMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden="true">
      <div className="absolute inset-[18%] border border-intro-gold/35" />
      <div className="absolute left-1/2 top-1/2 h-px w-[62%] -translate-x-1/2 -translate-y-1/2 bg-intro-foreground/20" />
      <div className="absolute left-1/2 top-1/2 h-[62%] w-px -translate-x-1/2 -translate-y-1/2 bg-intro-foreground/20" />
      {[0, 1, 2, 3, 4].map((item) => {
        const positions = [
          "left-[7%] top-[10%]",
          "right-[7%] top-[10%]",
          "left-[3%] bottom-[12%]",
          "right-[3%] bottom-[12%]",
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        ];
        return (
          <span key={item} className={cn("absolute flex h-16 w-16 items-center justify-center border border-intro-foreground/15 bg-intro-surface", positions[item])}>
            <ModuleGlyph index={item} />
          </span>
        );
      })}
    </div>
  );
}