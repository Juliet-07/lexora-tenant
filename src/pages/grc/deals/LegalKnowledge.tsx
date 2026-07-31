import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, Search, ExternalLink, Rss, ArrowRight } from "lucide-react";
import { useDeals, type LegalDoc } from "@/lib/dealsStore";

const CATEGORIES = [
  "All",
  "Statute",
  "Regulation",
  "Case Law",
  "International",
  "Commentary",
  "Update",
] as const;

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function LegalKnowledge() {
  const s = useDeals();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [area, setArea] = useState("All");
  const [active, setActive] = useState<LegalDoc | null>(null);

  const areas = useMemo(
    () => ["All", ...Array.from(new Set(s.legal.map((l) => l.practiceArea)))],
    [s.legal],
  );

  const rows = s.legal.filter(
    (l) =>
      (cat === "All" || l.category === cat) &&
      (area === "All" || l.practiceArea === area) &&
      (!q ||
        `${l.title} ${l.summary} ${l.practiceArea} ${l.jurisdiction ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Legal Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">
            Statutes, regulations, case law, international frameworks and
            commentary published to your organisation.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Rss className="h-3.5 w-3.5" />
          Legal news feed · {s.legal.length} entries
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search statute, regulation, case…"
            className="pl-8"
          />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Practice area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "All" ? "All practice areas" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((l) => (
          <Card
            key={l.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setActive(l)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {l.category} · {l.practiceArea}
                    {l.jurisdiction ? ` · ${l.jurisdiction}` : ""}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {l.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {l.summary}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Published {fmtDate(l.publishedAt ?? l.updatedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(l);
                  }}
                >
                  View details <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center col-span-full">
            No entries.
          </div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader className="text-left">
                <Badge variant="secondary" className="w-fit">
                  {active.category}
                </Badge>
                <SheetTitle className="text-xl">{active.title}</SheetTitle>
                <SheetDescription>{active.summary}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Meta label="Practice area" value={active.practiceArea} />
                <Meta label="Jurisdiction" value={active.jurisdiction} />
                <Meta label="Reference" value={active.reference} />
                <Meta label="Source" value={active.source} />
                <Meta
                  label="Published"
                  value={fmtDate(active.publishedAt ?? active.updatedAt)}
                />
                <Meta label="Last updated" value={fmtDate(active.updatedAt)} />
              </div>

              <Separator className="my-5" />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Details</h3>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {active.content ??
                    "No further detail has been published for this entry yet."}
                </p>
              </div>

              {active.link && (
                <Button asChild variant="outline" className="mt-5 gap-2">
                  <a href={active.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open source
                  </a>
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
