import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileStack } from "lucide-react";
import { fetchPrecedents } from "@/lib/grc/deals-api";

export default function PrecedentTemplates() {
  const { data: precedents = [], isLoading } = useQuery({
    queryKey: ["deals-precedents"],
    queryFn: fetchPrecedents,
  });

  if (isLoading)
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading precedent templates…
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileStack className="h-6 w-6" />
          Precedent Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Pre-approved contract shells that assemble from the shared Clause
          Library.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {precedents.map((p) => (
          <Card key={p._id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.jurisdiction} · {p.sections.length} clauses
                  </div>
                </div>
                <Badge variant="outline">{p.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {p.sections.map((sec, i) => (
                <div key={i} className="border rounded p-2 text-xs">
                  <div className="font-medium">{sec.title}</div>
                  <div className="text-muted-foreground line-clamp-2">
                    {sec.body}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {precedents.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            No precedent templates yet.
          </div>
        )}
      </div>
    </div>
  );
}
