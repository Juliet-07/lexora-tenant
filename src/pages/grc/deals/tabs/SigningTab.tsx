import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Plus } from "lucide-react";
import {
  addSigningChecklistItem,
  toggleSigningChecklistItem,
  addSignatory,
  markSignatorySigned,
  updateSigningDetails,
  type Deal,
} from "@/lib/grc/deals-api";

export default function SigningTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const checklist = deal.signing?.checklist ?? [];
  const signatories = deal.signing?.signatories ?? [];
  const [item, setItem] = useState({ item: "", owner: "" });
  const [sig, setSig] = useState({ name: "", party: "", role: "" });
  const [details, setDetails] = useState({
    signingDate: deal.signing.signingDate?.slice(0, 10) ?? "",
    venue: deal.signing.venue,
  });

  const addChecklistMut = useMutation({
    mutationFn: () =>
      addSigningChecklistItem(deal._id, item.item, item.owner || "TBD"),
    onSuccess: () => {
      invalidate();
      setItem({ item: "", owner: "" });
    },
  });
  const toggleMut = useMutation({
    mutationFn: (index: number) => toggleSigningChecklistItem(deal._id, index),
    onSuccess: invalidate,
  });
  const addSigMut = useMutation({
    mutationFn: () => addSignatory(deal._id, sig.name, sig.party, sig.role),
    onSuccess: () => {
      invalidate();
      setSig({ name: "", party: "", role: "" });
    },
  });
  const signMut = useMutation({
    mutationFn: (index: number) => markSignatorySigned(deal._id, index),
    onSuccess: invalidate,
  });
  const detailsMut = useMutation({
    mutationFn: () => updateSigningDetails(deal._id, details),
    onSuccess: invalidate,
  });

  const done = checklist.filter((c) => c.status === "Done").length;
  const total = checklist.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Pre-signing checklist ({done}/{total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={total ? (done / total) * 100 : 0} className="h-2" />
          {checklist.map((c, i) => (
            <label
              key={i}
              className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={c.status === "Done"}
                onChange={() => toggleMut.mutate(i)}
              />
              <span
                className={
                  c.status === "Done"
                    ? "line-through text-muted-foreground"
                    : ""
                }
              >
                {c.item}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {c.owner}
              </span>
            </label>
          ))}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Checklist item"
              value={item.item}
              onChange={(e) => setItem({ ...item, item: e.target.value })}
            />
            <Input
              placeholder="Owner"
              value={item.owner}
              onChange={(e) => setItem({ ...item, owner: e.target.value })}
              className="w-32"
            />
            <Button
              disabled={!item.item || addChecklistMut.isPending}
              onClick={() => addChecklistMut.mutate()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Signing date</Label>
              <Input
                type="date"
                value={details.signingDate}
                onChange={(e) =>
                  setDetails({ ...details, signingDate: e.target.value })
                }
                onBlur={() => detailsMut.mutate()}
              />
            </div>
            <div>
              <Label className="text-xs">Venue</Label>
              <Input
                value={details.venue}
                onChange={(e) =>
                  setDetails({ ...details, venue: e.target.value })
                }
                onBlur={() => detailsMut.mutate()}
              />
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xs font-semibold mb-2">Signatories</div>
            {signatories.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between border rounded p-2 mb-1"
              >
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.party} · {s.role}
                  </div>
                </div>
                {s.signed ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-700 border-emerald-500/30"
                  >
                    Signed {new Date(s.signedAt!).toLocaleDateString()}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={signMut.isPending}
                    onClick={() => signMut.mutate(i)}
                  >
                    Mark signed
                  </Button>
                )}
              </div>
            ))}
            {signatories.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No signatories added.
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Input
                placeholder="Name"
                value={sig.name}
                onChange={(e) => setSig({ ...sig, name: e.target.value })}
              />
              <Input
                placeholder="Party"
                value={sig.party}
                onChange={(e) => setSig({ ...sig, party: e.target.value })}
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Role"
                  value={sig.role}
                  onChange={(e) => setSig({ ...sig, role: e.target.value })}
                />
                <Button
                  size="sm"
                  disabled={!sig.name || !sig.party || addSigMut.isPending}
                  onClick={() => addSigMut.mutate()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
