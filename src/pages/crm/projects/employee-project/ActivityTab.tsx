import { CommentThread } from "@/components/crm/CommentThread";

export function ActivityTab({ mandateId }: { mandateId: string }) {
  return (
    <div>
      <CommentThread subject={mandateId} subjectType="Mandate" />
    </div>
  );
}
