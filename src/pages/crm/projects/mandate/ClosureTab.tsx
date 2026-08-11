import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setClosureItem, closeMandate, type Mandate } from "@/lib/crm/mandates-api";

export function ClosureTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mandates"] });

  const closureMut = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      setClosureItem(mandate._id, itemId, done),
    onSuccess: invalidate,
  });

  const closeMut = useMutation({
    mutationFn: () => closeMandate(mandate._id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Mandate closed", description: "Documents archived and satisfaction survey sent to the client." });
    },
    onError: (err: any) => toast({ title: "Couldn't close mandate", description: err?.response?.data?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">All items must be complete before the mandate can be closed.</p>
      {mandate.closureChecklist.map((c) => (
        <label key={c._id} className="flex items-center gap-3 rounded border p-3 text-sm">
          <Checkbox
            checked={c.done}
            onCheckedChange={(v) => closureMut.mutate({ itemId: c._id, done: !!v })}
          />
          {c.label}
        </label>
      ))}
      <Button
        disabled={!mandate.closureChecklist.every((c) => c.done) || closeMut.isPending}
        onClick={() => closeMut.mutate()}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" /> Close mandate
      </Button>
    </div>
  );
}
