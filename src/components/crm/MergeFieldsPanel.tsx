import { useEffect, useMemo, useState } from "react";
import { Braces, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MERGE_GROUP_ORDER,
  metaFor,
  readMergeFields,
  setMergeFieldValue,
} from "@/lib/crm/merge-fields";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "RWF",
  "UGX",
  "TZS",
  "XOF",
  "XAF",
  "CAD",
  "AUD",
  "AED",
  "INR",
];

interface Props {
  /** The document as it currently stands (draft, pending panel edits, or saved). */
  body: string;
  /** Called with the document after one field changed. */
  onChange: (nextBody: string, key: string, value: string) => void;
  /** Document is locked (signed / declined). */
  locked: boolean;
  /** The tenant is in "Edit content" mode — changes land in the draft. */
  editing: boolean;
  /** Panel changes not yet saved (only meaningful when not editing). */
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

const sameValue = (a: string, b: string, multiline: boolean) =>
  multiline
    ? a
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n") ===
      b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n")
    : a.trim() === b.trim();

// Every field the document uses, grouped, with one input each. Typing in
// an input rewrites that field everywhere it appears in the document, so
// the tenant fills the contract in here instead of scrolling for it.
export function MergeFieldsPanel({
  body,
  onChange,
  locked,
  editing,
  dirty,
  saving,
  onSave,
  onDiscard,
}: Props) {
  const fields = useMemo(() => readMergeFields(body), [body]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [unfilledOnly, setUnfilledOnly] = useState(false);

  // The document is the source of truth: when it changes from outside the
  // panel (typing in the editor, discard, a save landing) the inputs follow.
  // What the tenant is typing is left alone while it already matches — that
  // is what lets a new line be typed in the scope-of-work box, since blank
  // lines never survive into the document.
  useEffect(() => {
    setVals((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const f of fields) {
        const multiline = metaFor(f.key).input === "textarea";
        if (!(f.key in next) || !sameValue(next[f.key], f.value, multiline)) {
          next[f.key] = f.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [fields]);

  const filled = fields.filter((f) => f.filled).length;
  const unfilled = fields.length - filled;

  const edit = (key: string, value: string) => {
    setVals((v) => ({ ...v, [key]: value }));
    onChange(setMergeFieldValue(body, key, value), key, value);
  };

  const groups = MERGE_GROUP_ORDER.map((g) => ({
    group: g,
    items: fields.filter(
      (f) => metaFor(f.key).group === g && (!unfilledOnly || !f.filled),
    ),
  })).filter((g) => g.items.length);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Braces className="h-3.5 w-3.5" /> Merge fields
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {!fields.length ? (
          <p className="text-xs text-muted-foreground">
            This document has no merge fields — nothing in it needs filling in.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md bg-muted/60 px-2.5 py-1.5 text-xs">
              <span>
                Fields:{" "}
                <span className="font-semibold text-success">{filled}</span> /{" "}
                {fields.length}
              </span>
              <span
                className={
                  unfilled
                    ? "font-semibold text-destructive"
                    : "font-semibold text-success"
                }
              >
                {unfilled ? `${unfilled} unfilled` : "All filled ✓"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {locked
                ? "This contract is locked, so its fields can no longer be changed."
                : "Values auto-populate everywhere they appear in the document."}
            </p>
            <label className="flex items-center justify-between gap-2 text-xs">
              Show unfilled only
              <Switch
                checked={unfilledOnly}
                onCheckedChange={setUnfilledOnly}
              />
            </label>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              {groups.map(({ group, items }) => (
                <div key={group} className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group === "Clause-specific"
                      ? "Clause-specific fields"
                      : group}
                  </p>
                  {items.map((f) => {
                    const meta = metaFor(f.key);
                    const v = vals[f.key] ?? f.value;
                    const id = `mf-${f.key}`;
                    return (
                      <div key={f.key} className="space-y-1">
                        <label
                          htmlFor={id}
                          className="flex items-center justify-between text-xs font-medium"
                        >
                          {meta.label}
                          {!f.filled && (
                            <span className="text-[10px] font-normal text-warning">
                              needs a value
                            </span>
                          )}
                        </label>
                        {meta.input === "textarea" ? (
                          <Textarea
                            id={id}
                            rows={3}
                            value={v}
                            disabled={locked}
                            placeholder={`{{${f.key}}}`}
                            className="text-xs"
                            onChange={(e) => edit(f.key, e.target.value)}
                          />
                        ) : meta.input === "currency" ? (
                          <Select
                            value={v || undefined}
                            disabled={locked}
                            onValueChange={(c) => edit(f.key, c)}
                          >
                            <SelectTrigger id={id} className="h-8 text-xs">
                              <SelectValue placeholder={`{{${f.key}}}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(v && !CURRENCIES.includes(v)
                                ? [v, ...CURRENCIES]
                                : CURRENCIES
                              ).map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={id}
                            // A date input only takes yyyy-mm-dd; if someone has
                            // typed other wording into the document, show it as text.
                            type={
                              meta.input === "date" &&
                              (!v || /^\d{4}-\d{2}-\d{2}$/.test(v))
                                ? "date"
                                : "text"
                            }
                            value={v}
                            disabled={locked}
                            placeholder={`{{${f.key}}}`}
                            className="h-8 text-xs"
                            onChange={(e) => edit(f.key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {!groups.length && (
                <p className="text-xs text-success">
                  Every field has a value ✓
                </p>
              )}
            </div>

            {!locked && editing && (
              <p className="border-t pt-2 text-[11px] text-muted-foreground">
                Changes are applied to your draft — use <b>Save draft</b> above
                to keep them.
              </p>
            )}
            {!locked && !editing && dirty && (
              <div className="flex gap-2 border-t pt-3">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={saving}
                  onClick={onSave}
                >
                  {saving && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Save fields
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={onDiscard}
                >
                  Discard
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
