import { useState } from "react";
import { Paperclip } from "lucide-react";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import {
  resolveVendorFileUrl,
  type VendorApprovalComment,
} from "@/lib/crm/vendor-api";

/** A due-diligence document name that opens the file in a preview popup. */
export function EvidenceLink({ name, url }: { name: string; url: string }) {
  const [open, setOpen] = useState(false);
  const href = resolveVendorFileUrl(url);
  if (!href) return <span className="text-[11px]">{name}</span>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline text-left"
      >
        <Paperclip className="h-3 w-3 shrink-0" />
        <span className="break-all">{name || "View document"}</span>
      </button>
      <DocumentPreviewDialog
        doc={open ? { url: href, name } : null}
        onOpenChange={(o) => !o && setOpen(false)}
      />
    </>
  );
}

/** The approver / tenant comment thread on a vendor, oldest first. */
export function ApprovalComments({
  comments,
}: {
  comments: VendorApprovalComment[] | undefined;
}) {
  if (!comments?.length) return null;
  return (
    <div className="space-y-1.5">
      {comments.map((c) => (
        <div
          key={c._id}
          className={`rounded-md border px-3 py-2 ${
            c.by === "tenant"
              ? "border-primary/30 bg-primary/5"
              : "border-border/60 bg-muted/30"
          }`}
        >
          <p className="text-xs whitespace-pre-wrap break-words">{c.text}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {c.author} · {new Date(c.at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
