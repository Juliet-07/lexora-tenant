import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Search } from "lucide-react";
import { useDeals } from "@/lib/dealsStore";

const CATEGORIES = ["All", "Statute", "Regulation", "Case Law", "International", "Commentary", "Update"] as const;

export default function LegalKnowledge() {
  const s = useDeals();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const rows = s.legal.filter(
    (l) =>
      (cat === "All" || l.category === cat) &&
      (!q || `${l.title} ${l.summary} ${l.practiceArea}`.toLowerCase().includes(q.toLowerCase())),
  );

  const urgencyTone = (u?: string) =>
    u === "Action Required" ? "bg-rose-500/15 text-rose-700 border-rose-500/30" :
    u === "Review" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
    u === "Informational" ? "bg-sky-500/15 text-sky-700 border-sky-500/30" :
    "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" />Legal Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">Statutes, regulations, case law, international frameworks, commentary and regulatory updates.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search statute, regulation, case…" className="pl-8" />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as any)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((l) => (
          <Card key={l.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.category} · {l.practiceArea}</div>
                </div>
                {l.urgency && <Badge variant="outline" className={urgencyTone(l.urgency)}>{l.urgency}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{l.summary}</CardContent>
          </Card>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center col-span-full">No entries.</div>}
      </div>
    </div>
  );
}
