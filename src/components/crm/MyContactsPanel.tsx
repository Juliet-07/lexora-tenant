import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Mail,
  Phone,
  Building2,
  Clock,
  Plus,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyContacts,
  logMyContactActivity,
  type Contact,
  type ActivityType,
} from "@/lib/crm/crm-contacts-api";

const MY_ACTIVITY_TYPES: ActivityType[] = [
  "Email",
  "Call",
  "Meeting",
  "Document",
  "Note",
];

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "No activity yet";

// Real "last activity" — the most recent entry in the actual
// activity array, not assumed to be pre-sorted either direction.
const lastTouch = (c: Contact): string | null => {
  if (!c.activity.length) return null;
  return c.activity.reduce(
    (latest, a) => (a.at > latest ? a.at : latest),
    c.activity[0].at,
  );
};

export function MyContactsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [entry, setEntry] = useState<{ type: ActivityType; summary: string }>({
    type: "Call",
    summary: "",
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["my-contacts"],
    queryFn: fetchMyContacts,
    staleTime: 30_000,
  });

  const filtered = useMemo(
    () =>
      contacts.filter((c) =>
        `${c.name} ${c.organisation} ${c.email}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [contacts, q],
  );

  const selected = contacts.find((c) => c._id === openId) ?? null;

  const activityMut = useMutation({
    mutationFn: () =>
      logMyContactActivity(selected!._id, {
        type: entry.type,
        summary: entry.summary.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-contacts"] });
      setEntry({ type: "Call", summary: "" });
      toast({ title: "Activity recorded", description: selected?.name });
    },
    onError: (err: any) =>
      toast({
        title: "Could not record activity",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const record = () => {
    if (!selected || !entry.summary.trim()) return;
    activityMut.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search contacts…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c._id}>
                  <TableCell>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.title} · {c.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {c.organisation}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {[...c.tags, ...c.roleTags].map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {when(lastTouch(c))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setOpenId(c._id)}>
                      <Plus className="mr-1 h-3 w-3" /> Record activity
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {contacts.length === 0
                      ? "No contacts assigned to you yet."
                      : "No contacts assigned to you match that search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    {selected.title} · {selected.organisation}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selected.email}
                  </p>
                  {selected.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selected.phone}
                    </p>
                  )}
                </div>

                {selected.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Notes
                    </Label>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Record an interaction</Label>
                  <Select
                    value={entry.type}
                    onValueChange={(v) =>
                      setEntry({ ...entry, type: v as ActivityType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MY_ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={2}
                    placeholder="What happened?"
                    value={entry.summary}
                    onChange={(e) =>
                      setEntry({ ...entry, summary: e.target.value })
                    }
                  />
                  <Button
                    className="w-full"
                    disabled={!entry.summary.trim() || activityMut.isPending}
                    onClick={record}
                  >
                    {activityMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add to timeline"
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Timeline</p>
                  {selected.activity.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nothing recorded yet.
                    </p>
                  )}
                  {[...selected.activity]
                    .sort((a, b) => (a.at < b.at ? 1 : -1))
                    .map((a, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p>
                            <Badge
                              variant="outline"
                              className="mr-2 text-[10px]"
                            >
                              {a.type}
                            </Badge>
                            {a.summary}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.by || "You"} · {new Date(a.at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
