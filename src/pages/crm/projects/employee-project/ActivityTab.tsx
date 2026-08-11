import { CommentThread } from "@/components/crm/CommentThread";

export function ActivityTab({ mandateId }: { mandateId: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Comment threads aren't wired to a real backend yet — coming with a later
        pass.
      </p>
      <CommentThread subject={mandateId} />
    </div>
  );
}
