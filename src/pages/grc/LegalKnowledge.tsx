import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Scale,
  ShieldCheck,
  Gavel,
  Globe2,
  MessageSquare,
  Rss,
  Search,
  ExternalLink,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import {
  fetchLegalKnowledge,
  type Category,
  type LegalKnowledgeEntry,
} from "@/lib/grc/legal-knowledge-api";

const CATEGORIES = [
  "All",
  "Statute",
  "Regulation",
  "Case Law",
  "International",
  "Commentary",
  "Update",
] as const;

const CATEGORY_STYLE: Record<Category, { icon: any; tone: string }> = {
  Statute: {
    icon: Scale,
    tone: "text-blue-600 border-blue-500/30 bg-blue-500/10",
  },
  Regulation: {
    icon: ShieldCheck,
    tone: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  },
  "Case Law": {
    icon: Gavel,
    tone: "text-violet-600 border-violet-500/30 bg-violet-500/10",
  },
  International: {
    icon: Globe2,
    tone: "text-teal-600 border-teal-500/30 bg-teal-500/10",
  },
  Commentary: {
    icon: MessageSquare,
    tone: "text-slate-600 border-slate-500/30 bg-slate-500/10",
  },
  Update: {
    icon: Rss,
    tone: "text-emerald-600 border-emerald-500/30 bg-emerald-500/10",
  },
};

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// An entry counts as "revised" once it's been meaningfully edited
// after first publishing — a day's clock skew from the save itself
// shouldn't count, so this needs a real gap.
const wasRevised = (entry: LegalKnowledgeEntry) =>
  !!entry.publishedAt &&
  new Date(entry.updatedAt).getTime() - new Date(entry.publishedAt).getTime() >
    24 * 60 * 60 * 1000;

export default function LegalKnowledge() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["legalKnowledge"],
    queryFn: fetchLegalKnowledge,
    staleTime: 5 * 60 * 1000,
  });

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [area, setArea] = useState("All");
  const [active, setActive] = useState<LegalKnowledgeEntry | null>(null);

  const areas = useMemo(
    () => [
      "All",
      ...Array.from(new Set(entries.map((l) => l.practiceArea))).sort(),
    ],
    [entries],
  );

  const rows = useMemo(
    () =>
      entries
        .filter(
          (l) =>
            (cat === "All" || l.category === cat) &&
            (area === "All" || l.practiceArea === area) &&
            (!q ||
              `${l.title} ${l.summary} ${l.practiceArea} ${l.jurisdiction}`
                .toLowerCase()
                .includes(q.toLowerCase())),
        )
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? 0).getTime() -
            new Date(a.publishedAt ?? 0).getTime(),
        ),
    [entries, q, cat, area],
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
          <BookOpen className="h-3.5 w-3.5" />
          {isLoading ? "Loading…" : `${entries.length} entries`}
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

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading the knowledge base…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((l) => {
            const { icon: Icon, tone } = CATEGORY_STYLE[l.category];
            return (
              <Card
                key={l._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setActive(l)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base leading-snug">
                        {l.title}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        <span>{l.practiceArea}</span>
                        {l.jurisdiction && <span>· {l.jurisdiction}</span>}
                        {wasRevised(l) && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 ml-1"
                          >
                            Revised
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 gap-1 ${tone}`}
                    >
                      <Icon className="h-3 w-3" />
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
                      Published {fmtDate(l.publishedAt)}
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
            );
          })}
          {rows.length === 0 && (
            <div className="text-sm text-muted-foreground py-12 text-center col-span-full">
              {entries.length === 0
                ? "Nothing has been published to the knowledge base yet."
                : "No entries match your filters."}
            </div>
          )}
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader className="text-left">
                <Badge
                  variant="outline"
                  className={`w-fit gap-1 ${CATEGORY_STYLE[active.category].tone}`}
                >
                  {(() => {
                    const Icon = CATEGORY_STYLE[active.category].icon;
                    return <Icon className="h-3 w-3" />;
                  })()}
                  {active.category}
                </Badge>
                <SheetTitle className="text-xl leading-snug">
                  {active.title}
                </SheetTitle>
                <SheetDescription>{active.summary}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Meta label="Practice area" value={active.practiceArea} />
                <Meta label="Jurisdiction" value={active.jurisdiction} />
                <Meta label="Reference" value={active.reference} />
                <Meta label="Source" value={active.source} />
                <Meta label="Published" value={fmtDate(active.publishedAt)} />
                <Meta label="Last updated" value={fmtDate(active.updatedAt)} />
              </div>

              <Separator className="my-5" />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Details</h3>
                {active.content ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: active.content }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No further detail has been published for this entry yet.
                  </p>
                )}
              </div>

              {active.externalLink && (
                <Button asChild variant="outline" className="mt-5 gap-2">
                  <a
                    href={active.externalLink}
                    target="_blank"
                    rel="noreferrer"
                  >
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
