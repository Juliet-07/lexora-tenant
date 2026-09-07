import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, Mail, Phone, Building2, Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useMyContacts,
  logMyContactActivity,
  updateMyContactNotes,
  lastTouch,
  MY_ACTIVITY_TYPES,
  type MyActivityType,
} from "@/lib/crm/myContactsStore";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : "No activity yet";

export function MyContactsPanel() {
  const contacts = useMyContacts();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [entry, setEntry] = useState<{
    type: MyActivityType;
    summary: string;
  }>({ type: "Call", summary: "" });

  const filtered = useMemo(
    () =>
      contacts.filter((c) =>
        `${c.name} ${c.organisation} ${c.email}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [contacts, q],
  );

  const selected = contacts.find((c) => c.id === openId) ?? null;

  const record = () => {
    if (!selected || !entry.summary.trim()) return;
    logMyContactActivity(selected.id, {
      type: entry.type,
      summary: entry.summary.trim(),
    });
    setEntry({ type: "Call", summary: "" });
    toast({ title: "Activity recorded", description: selected.name });
  };

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
                <TableRow key={c.id}>
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
                      {c.tags.map((t) => (
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
                    <Button size="sm" onClick={() => setOpenId(c.id)}>
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
                    No contacts assigned to you match that search.
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
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selected.phone}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={3}
                    value={selected.notes}
                    onChange={(e) =>
                      updateMyContactNotes(selected.id, e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Record an interaction</Label>
                  <Select
                    value={entry.type}
                    onValueChange={(v) =>
                      setEntry({ ...entry, type: v as MyActivityType })
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
                    disabled={!entry.summary.trim()}
                    onClick={record}
                  >
                    Add to timeline
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Timeline</p>
                  {selected.activity.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nothing recorded yet.
                    </p>
                  )}
                  {selected.activity.map((a) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p>
                          <Badge variant="outline" className="mr-2 text-[10px]">
                            {a.type}
                          </Badge>
                          {a.summary}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.by} · {new Date(a.at).toLocaleString()}
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
