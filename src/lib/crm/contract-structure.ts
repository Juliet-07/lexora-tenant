// A generated contract can be a structured document: a cover page, a
// contents page and the body, each in its own marked <section> (the engine
// builds it — see lexora-engine common/utils/contract-structure.util.ts).
// Tenants edit the BODY only: the cover is fixed by the template and the
// contents page is rebuilt from the body's headings when the document is
// saved. These helpers take a document apart and put it back together
// around an edited body. A document with no sections (everything made
// before this existed) is just a body.

const BODY_OPEN = /<section\b[^>]*data-contract-part="body"[^>]*>/;

export interface DocumentParts {
  /** The cover and contents sections, exactly as they are. */
  prefix: string;
  body: string;
}

export function splitDocument(html: string): DocumentParts {
  const doc = html ?? "";
  const open = BODY_OPEN.exec(doc);
  if (!open) return { prefix: "", body: doc };
  const start = open.index + open[0].length;
  const end = doc.lastIndexOf("</section>");
  return {
    prefix: doc.slice(0, open.index),
    body: doc.slice(start, end > start ? end : doc.length),
  };
}

export function joinDocument(prefix: string, body: string): string {
  return prefix
    ? `${prefix}<section data-contract-part="body">${body}</section>`
    : body;
}

export const hasCoverOrContents = (html: string) =>
  /data-contract-part="(cover|toc)"/.test(html ?? "");
