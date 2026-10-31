// ─────────────────────────────────────────────────────────────
// Merge fields inside a generated contract's HTML.
//
// The engine wraps every field it renders —
//   <span data-merge="clientJurisdiction">Rwanda</span>
//   <span data-merge="commencementDate" data-empty="true">{{commencementDate}}</span>
// — so the editor's Merge Fields panel can list them, show whether each
// has a value, and change one everywhere it appears without touching
// the rest of the text (anything the tenant hand-edited stays put).
//
// A contract generated before that tagging existed has no wrappers, only
// bare {{tokens}} for the fields that were never filled. Those are picked
// up too (and wrapped the first time one is edited); fields already
// filled in such a contract are plain text and can't be traced back.
// ─────────────────────────────────────────────────────────────

// Groups come from the field registry the engine serves, so a new group
// (Deal, Term sheet, Signing…) needs no change here.
export type MergeFieldGroup = string;

export type MergeFieldInput = "text" | "date" | "textarea" | "currency";

export interface MergeFieldMeta {
  label: string;
  group: MergeFieldGroup;
  input: MergeFieldInput;
}

export const MERGE_GROUP_ORDER: MergeFieldGroup[] = [
  "Parties",
  "Deal",
  "Engagement",
  "Dates",
  "Commercial",
  "Term sheet",
  "Signing",
  "Contract",
  "Person",
  "Letter",
  "Clause-specific",
];

/** Groups present in a set of fields, in the display order above. */
export const orderGroups = (groups: MergeFieldGroup[]): MergeFieldGroup[] =>
  Array.from(new Set(groups)).sort((a, b) => {
    const ia = MERGE_GROUP_ORDER.indexOf(a);
    const ib = MERGE_GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

// Mirrors CONTRACT_MERGE_FIELDS in the engine
// (src/modules/crm/tools/schemas/contract.schema.ts). A token that is not
// listed here (a platform template's own custom field) still gets a panel
// input — it just lands under "Clause-specific" with a label made from
// its name.
const META: Record<string, MergeFieldMeta> = {
  counterpartyName: {
    label: "Counterparty name",
    group: "Parties",
    input: "text",
  },
  recipientName: { label: "Recipient name", group: "Parties", input: "text" },
  recipientEmail: { label: "Recipient email", group: "Parties", input: "text" },
  tenantCompanyName: {
    label: "Our company name",
    group: "Parties",
    input: "text",
  },
  tenantCompanyJurisdiction: {
    label: "Our jurisdiction",
    group: "Parties",
    input: "text",
  },
  clientJurisdiction: {
    label: "Counterparty jurisdiction",
    group: "Parties",
    input: "text",
  },
  tenantRegisteredAddress: {
    label: "Our registered address",
    group: "Parties",
    input: "textarea",
  },
  clientRegisteredAddress: {
    label: "Counterparty registered address",
    group: "Parties",
    input: "textarea",
  },
  leadProfessionalName: {
    label: "Lead professional",
    group: "Parties",
    input: "text",
  },
  leadProfessionalTitle: {
    label: "Lead professional title",
    group: "Parties",
    input: "text",
  },
  clientRepresentativeName: {
    label: "Client representative",
    group: "Parties",
    input: "text",
  },
  clientRepresentativeTitle: {
    label: "Client representative title",
    group: "Parties",
    input: "text",
  },
  title: { label: "Contract title", group: "Engagement", input: "text" },
  serviceCategory: {
    label: "Service category",
    group: "Engagement",
    input: "text",
  },
  scopeOfWork: {
    label: "Scope of work (one per line)",
    group: "Engagement",
    input: "textarea",
  },
  effectiveDate: {
    label: "Effective date",
    group: "Engagement",
    input: "date",
  },
  commencementDate: {
    label: "Commencement date",
    group: "Engagement",
    input: "date",
  },
  expiryDate: { label: "Expiry date", group: "Engagement", input: "date" },
  todayDate: { label: "Date of drafting", group: "Engagement", input: "date" },
  engagementDuration: {
    label: "Engagement duration",
    group: "Engagement",
    input: "text",
  },
  contractCurrency: {
    label: "Currency",
    group: "Commercial",
    input: "currency",
  },
  contractValue: {
    label: "Contract value",
    group: "Commercial",
    input: "text",
  },
};

const humanize = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

// Labels/groups for fields the static table above doesn't list (the deal
// fields, term-sheet sections…), filled from the engine's registry
// (see useMergeFieldRegistry). The static table wins where both have a
// field, so the CRM panel's existing grouping does not shift.
const REGISTRY_META: Record<string, MergeFieldMeta> = {};

export interface RegistryField {
  token: string;
  label: string;
  group: string;
  input: "text" | "textarea" | "date" | "currency" | "number";
}

export const registerMergeMeta = (fields: RegistryField[]) => {
  for (const f of fields) {
    REGISTRY_META[f.token] = {
      label: f.label,
      group: f.group,
      input: f.input === "number" ? "text" : f.input,
    };
  }
};

export const metaFor = (key: string): MergeFieldMeta =>
  META[key] ??
  REGISTRY_META[key] ?? {
    label: humanize(key),
    group: "Clause-specific",
    input: "text",
  };

// Fields whose value is a block of HTML (a list) rather than a line of
// text — the engine wraps these in a <div>, not a <span>.
const LIST_FIELDS = new Set(["scopeOfWork", "partiesList", "signatoriesList"]);

// Free text that can run to several lines (the deal term-sheet sections):
// the engine renders the line breaks as <br> inside a <span>.
const isMultiline = (key: string) => key.startsWith("termSheet");

const TOKEN = /^\s*\{\{(\w+)\}\}\s*$/;
const TOKEN_G = /\{\{(\w+)\}\}/g;

export interface MergeField {
  key: string;
  value: string;
  filled: boolean;
}

const parse = (html: string): Document =>
  new DOMParser().parseFromString(
    `<!doctype html><html><body>${html ?? ""}</body></html>`,
    "text/html",
  );

const makeWrapper = (doc: Document, key: string): HTMLElement => {
  const el = doc.createElement(LIST_FIELDS.has(key) ? "div" : "span");
  el.setAttribute("data-merge", key);
  return el;
};

// Wraps every bare {{token}} sitting in running text (not inside a field
// already) so it can be treated like any other field.
function wrapBareTokens(doc: Document): number {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (t.data.includes("{{") && !t.parentElement?.closest("[data-merge]")) {
      hits.push(t);
    }
  }
  let wrapped = 0;
  for (const t of hits) {
    const before = wrapped;
    const frag = doc.createDocumentFragment();
    let last = 0;
    t.data.replace(TOKEN_G, (m: string, key: string, at: number) => {
      if (at > last) frag.append(doc.createTextNode(t.data.slice(last, at)));
      const el = makeWrapper(doc, key);
      el.setAttribute("data-empty", "true");
      el.textContent = m;
      frag.append(el);
      last = at + m.length;
      wrapped++;
      return m;
    });
    if (wrapped === before) continue;
    if (last < t.data.length)
      frag.append(doc.createTextNode(t.data.slice(last)));
    t.replaceWith(frag);
  }
  return wrapped;
}

const readValue = (el: Element, key: string): string => {
  if (LIST_FIELDS.has(key)) {
    const items = Array.from(el.querySelectorAll("li")).map((li) =>
      (li.textContent ?? "").trim(),
    );
    if (items.length) return items.join("\n");
  }
  if (isMultiline(key)) {
    // <br> is what carries the line breaks — textContent would drop them.
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    return (clone.textContent ?? "").trim();
  }
  return (el.textContent ?? "").trim();
};

/** The fields in a document, in order of first appearance. */
export function readMergeFields(html: string): MergeField[] {
  const doc = parse(html);
  wrapBareTokens(doc);
  const seen = new Map<string, MergeField>();
  doc.querySelectorAll("[data-merge]").forEach((el) => {
    const key = el.getAttribute("data-merge") as string;
    if (seen.has(key)) return;
    const raw = readValue(el, key);
    const unfilled = !raw || TOKEN.test(raw);
    seen.set(key, { key, value: unfilled ? "" : raw, filled: !unfilled });
  });
  return Array.from(seen.values());
}

/** True when running text still holds a bare {{token}} no field wraps. */
export function hasBareTokens(html: string): boolean {
  const doc = parse(html);
  return wrapBareTokens(doc) > 0;
}

/**
 * Sets one field's value everywhere it appears and returns the new HTML.
 * An empty value puts the {{token}} back, so a field can be cleared.
 */
export function setMergeFieldValue(
  html: string,
  key: string,
  value: string,
): string {
  const doc = parse(html);
  wrapBareTokens(doc);
  doc.querySelectorAll(`[data-merge="${key}"]`).forEach((el) => {
    const text = value.trim();
    if (!text) {
      el.setAttribute("data-empty", "true");
      el.textContent = `{{${key}}}`;
      return;
    }
    el.removeAttribute("data-empty");
    if (LIST_FIELDS.has(key)) {
      const items = value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const ol = doc.createElement("ol");
      items.forEach((item) => {
        const li = doc.createElement("li");
        li.textContent = item;
        ol.append(li);
      });
      el.replaceChildren(ol);
    } else if (isMultiline(key)) {
      const lines = value.split(/\r?\n/);
      el.replaceChildren(
        ...lines.flatMap((line, i) =>
          i < lines.length - 1
            ? [doc.createTextNode(line), doc.createElement("br")]
            : [doc.createTextNode(line)],
        ),
      );
    } else {
      el.textContent = value;
    }
  });
  return doc.body.innerHTML;
}
