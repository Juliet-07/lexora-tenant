/** Consistent print / Save as PDF presentation for text-based GRC documents. */
export const escapeReportText = (value: unknown): string =>
  String(value ?? "—").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character,
  );

export function printGrcReport({
  title,
  category,
  body,
  details = [],
}: {
  title: string;
  category: string;
  body: string;
  details?: { label: string; value: string }[];
}): void {
  const windowRef = window.open("", "_blank");
  if (!windowRef) return;

  const theme = getComputedStyle(document.documentElement);
  const primary = `hsl(${theme.getPropertyValue("--primary").trim()})`;
  const foreground = `hsl(${theme.getPropertyValue("--foreground").trim()})`;
  const muted = `hsl(${theme.getPropertyValue("--muted-foreground").trim()})`;
  const border = `hsl(${theme.getPropertyValue("--border").trim()})`;
  const paper = `hsl(${theme.getPropertyValue("--card").trim()})`;
  const onPrimary = `hsl(${theme.getPropertyValue("--primary-foreground").trim()})`;
  const parsed = new DOMParser().parseFromString(body, "text/html");
  parsed.querySelectorAll("script,iframe,object,embed,link,style,form").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.startsWith("on") || /^(href|src)$/i.test(attribute.name) && !/^https?:|^\//i.test(attribute.value)) node.removeAttribute(attribute.name);
    }
  });
  const detailsHtml = details.length
    ? `<dl class="metadata">${details.map(({ label, value }) => `<div><dt>${escapeReportText(label)}</dt><dd>${escapeReportText(value)}</dd></div>`).join("")}</dl>`
    : "";

  windowRef.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeReportText(title)} — Lexora</title>
    <style>
      @page { size: A4; margin: 24mm 18mm 20mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: ${foreground}; background: ${paper}; font: 12px/1.65 Arial, sans-serif; }
      .page { max-width: 820px; margin: 0 auto; padding: 42px 36px; }
      .masthead { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 18px; border-bottom: 3px solid ${primary}; }
      .masthead img { display: block; max-width: 145px; max-height: 46px; object-fit: contain; }
      .category { color: ${primary}; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      h1 { font-size: 25px; line-height: 1.25; margin: 30px 0 15px; overflow-wrap: anywhere; }
      .metadata { display: flex; flex-wrap: wrap; gap: 18px 32px; padding: 16px 0; border-top: 1px solid ${border}; border-bottom: 1px solid ${border}; margin: 0 0 28px; }
      .metadata div { min-width: 125px; max-width: 100%; } dt { color: ${muted}; font-size: 10px; text-transform: uppercase; } dd { margin: 2px 0 0; font-weight: 600; overflow-wrap: anywhere; }
      .content { overflow-wrap: anywhere; } .content h2 { font-size: 17px; border-bottom: 1px solid ${border}; padding-bottom: 7px; margin: 25px 0 10px; color: ${primary}; }
      .content h3 { font-size: 14px; margin: 20px 0 8px; color: ${primary}; } .content p { margin: 0 0 12px; } .content li { margin: 5px 0; }
      .content table { border-collapse: collapse; width: 100%; font-size: 11px; margin: 16px 0; } .content th, .content td { border: 1px solid ${border}; padding: 8px; text-align: left; vertical-align: top; }
      .content th { background: ${primary}; color: ${onPrimary}; } .content tr, .content h2, .content h3 { break-inside: avoid; }
      footer { border-top: 1px solid ${border}; color: ${muted}; padding-top: 12px; margin-top: 38px; font-size: 10px; display: flex; justify-content: space-between; }
      @media print { .page { max-width: none; padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } footer { position: fixed; bottom: -11mm; left: 0; right: 0; } }
    </style></head><body><div class="page"><header class="masthead"><img src="/lexora-logo.png" alt="Lexora"><span class="category">${escapeReportText(category)}</span></header>
    <h1>${escapeReportText(title)}</h1>${detailsHtml}<main class="content">${parsed.body.innerHTML}</main><footer><span>Lexora · Governance, Risk & Compliance</span><span>${escapeReportText(new Date().toLocaleDateString("en-GB"))}</span></footer></div></body></html>`);
  windowRef.document.close();
  // Allow the logo to paint before opening the print / Save as PDF dialog.
  windowRef.addEventListener("load", () => windowRef.print(), { once: true });
}