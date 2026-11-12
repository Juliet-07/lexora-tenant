import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DealDocumentPreviewData } from "@/lib/grc/deals-api";

// The way a document's text is styled — the same wherever it is read: the
// deal's Preview tab, the review page and the signing page.
export const DOC_CLASSES =
  "text-sm leading-relaxed [&_p]:my-2 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_mark]:rounded [&_mark]:bg-warning/20 [&_mark]:px-0.5 [&_mark]:text-amber-800 dark:[&_mark]:text-amber-200 [&_mark]:ring-1 [&_mark]:ring-warning/40";

// The full-screen view reads a size up.
const DOC_CLASSES_LG = DOC_CLASSES.replace("text-sm", "text-base");

const hasText = (html: string | undefined) =>
  !!html?.replace(/<[^>]*>/g, "").trim();

/** The pages of a document: cover, contents, then the body. */
export function DealDocumentPages({
  preview,
  title,
  large = false,
}: {
  preview: DealDocumentPreviewData;
  title?: string;
  large?: boolean;
}) {
  const docClass = large ? DOC_CLASSES_LG : DOC_CLASSES;
  const hasCover = hasText(preview.cover);
  const toc = preview.toc?.enabled ? preview.toc.entries : [];
  const structured = hasCover || toc.length > 0;
  return (
    <div
      className={`mx-auto space-y-3 ${large ? "max-w-5xl" : "max-w-3xl"}`}
      data-testid="document-pages"
    >
      {hasCover && (
        <article
          aria-label="Cover page"
          className="flex min-h-[460px] flex-col items-center justify-center rounded-lg border bg-background px-6 py-10 text-center shadow-sm sm:px-10"
        >
          <div
            className={docClass}
            dangerouslySetInnerHTML={{ __html: preview.cover }}
          />
        </article>
      )}
      {toc.length > 0 && (
        <article
          aria-label="Table of contents"
          className="min-h-[460px] rounded-lg border bg-background px-6 py-10 shadow-sm sm:px-10"
        >
          <h2 className="mb-5 text-xl font-semibold">
            {preview.toc.title || "Table of Contents"}
          </h2>
          <ul className={`space-y-1.5 ${large ? "text-base" : "text-sm"}`}>
            {toc.map((e, i) => (
              <li
                key={i}
                style={{ paddingLeft: `${(e.level - 1) * 20}px` }}
                className={e.level === 1 ? "font-semibold" : ""}
              >
                {e.title}
              </li>
            ))}
          </ul>
        </article>
      )}
      <article
        aria-label="Body"
        className="space-y-6 rounded-lg border bg-background px-6 py-10 shadow-sm sm:px-10"
      >
        {!structured && (
          <h2 className="text-center text-xl font-semibold uppercase tracking-wide">
            {title || preview.name}
          </h2>
        )}
        {preview.sections.map((s, i) => (
          <section key={i} className="space-y-1">
            <h3 className={`font-semibold ${large ? "text-base" : "text-sm"}`}>
              {s.title}
            </h3>
            <div
              className={docClass}
              dangerouslySetInnerHTML={{ __html: s.html }}
            />
          </section>
        ))}
        {preview.sections.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            This document has no sections.
          </p>
        )}
      </article>
    </div>
  );
}

/**
 * A scrolling pane that tells its owner when the reader has reached the end
 * (or straight away if everything already fits without scrolling).
 */
function EndAwareScroll({
  className,
  onEnd,
  children,
  testId,
}: {
  className: string;
  onEnd?: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el || !onEnd) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) onEnd();
  }, [onEnd]);
  useEffect(() => {
    check();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [check]);
  return (
    <div ref={ref} onScroll={check} className={className} data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * The document in a readable pane, with a Full screen button. Reaching the
 * end of the text — in either view — calls `onScrolledToEnd`.
 */
export function DealDocumentViewer({
  preview,
  title,
  onScrolledToEnd,
}: {
  preview: DealDocumentPreviewData;
  title?: string;
  onScrolledToEnd?: () => void;
}) {
  const [full, setFull] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setFull(true)}
        >
          <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
          Full screen
        </Button>
      </div>
      <EndAwareScroll
        testId="document-scroll"
        onEnd={onScrolledToEnd}
        className="max-h-[70vh] overflow-y-auto rounded-md border bg-muted/30 p-3"
      >
        <DealDocumentPages preview={preview} title={title} />
      </EndAwareScroll>
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="flex h-[96vh] w-[98vw] max-w-6xl flex-col gap-0 p-0">
          <DialogHeader className="border-b px-5 py-3 text-left">
            <DialogTitle className="pr-8 text-base">
              {title || preview.name}
            </DialogTitle>
          </DialogHeader>
          <EndAwareScroll
            testId="document-scroll-full"
            onEnd={onScrolledToEnd}
            className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6"
          >
            <DealDocumentPages preview={preview} title={title} large />
          </EndAwareScroll>
        </DialogContent>
      </Dialog>
    </div>
  );
}
