import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  addParty,
  updateParty,
  removeParty,
  type Deal,
  type DealPartySide,
} from "@/lib/grc/deals-api";

export default function PartiesSection({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const parties = deal.parties ?? [];
  const [f, setF] = useState({
    side: "Buyer" as DealPartySide,
    title: "",
    name: "",
    email: "",
    phone: "",
  });

  const addMut = useMutation({
    mutationFn: () => addParty(deal._id, f),
    onSuccess: () => {
      invalidate();
      setF({ side: "Buyer", title: "", name: "", email: "", phone: "" });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add party"),
  });
  const patchMut = useMutation({
    mutationFn: ({ index, patch }: { index: number; patch: any }) =>
      updateParty(deal._id, index, patch),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: (index: number) => removeParty(deal._id, index),
    onSuccess: invalidate,
  });

  const bySide = (side: DealPartySide) =>
    parties.map((p, i) => ({ ...p, index: i })).filter((p) => p.side === side);

  const SideColumn = ({ side }: { side: DealPartySide }) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {side} side
      </div>
      {bySide(side).map((p) => (
        <div key={p.index} className="border rounded-md p-2.5 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <div className="font-medium">
                {p.name}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  — {p.title}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.email}
                {p.phone && ` · ${p.phone}`}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeMut.mutate(p.index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs pt-1 border-t">
            {(["dataRoom", "contractReview", "offerReview"] as const).map(
              (key) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={p.permissions[key]}
                    onChange={(e) =>
                      patchMut.mutate({
                        index: p.index,
                        patch: { permissions: { [key]: e.target.checked } },
                      })
                    }
                  />
                  {key === "dataRoom"
                    ? "Data room"
                    : key === "contractReview"
                      ? "Contract review"
                      : "Offer review"}
                </label>
              ),
            )}
          </div>
        </div>
      ))}
      {bySide(side).length === 0 && (
        <div className="text-xs text-muted-foreground">
          No {side.toLowerCase()}-side parties yet.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideColumn side="Buyer" />
        <SideColumn side="Seller" />
      </div>
      <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <Select
          value={f.side}
          onValueChange={(v) => setF({ ...f, side: v as DealPartySide })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Buyer">Buyer</SelectItem>
            <SelectItem value="Seller">Seller</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Title (e.g. Counsel)"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
        <Input
          placeholder="Name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Input
          placeholder="Email"
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <Input
          placeholder="Phone"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <Button
          disabled={!f.title || !f.name || !f.email || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
