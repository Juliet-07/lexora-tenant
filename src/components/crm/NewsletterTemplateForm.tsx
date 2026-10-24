import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  previewNewsletter,
  uploadNewsletterImage,
  type NewsletterTemplate,
} from "@/lib/crm/tools-api";

// ─────────────────────────────────────────────────────────────
// Tenant-side newsletter template composer — the same four designs
// the platform newsletter uses, rendered by the same engine
// renderer so what you preview here is exactly what recipients get
// in their inbox and what shows in the client / board portals.
// ─────────────────────────────────────────────────────────────

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  "RegulatoryAlert",
  "QuarterlyRoundup",
  "ArticleSpotlight",
  "EventInvite",
];

export const NEWSLETTER_TEMPLATE_LABELS: Record<NewsletterTemplate, string> = {
  RegulatoryAlert: "Regulatory alert",
  QuarterlyRoundup: "Quarterly round-up",
  ArticleSpotlight: "Article spotlight",
  EventInvite: "Event invite",
};

export const NEWSLETTER_TEMPLATE_HINTS: Record<NewsletterTemplate, string> = {
  RegulatoryAlert:
    "An urgent notice with a checklist and a call to action — for rule changes and deadlines.",
  QuarterlyRoundup:
    "A numbered multi-section digest — for periodic updates to clients and the board.",
  ArticleSpotlight:
    "One featured article with an excerpt and a read-more button, plus related items.",
  EventInvite:
    "A date badge, agenda and a register button — for webinars, briefings and events.",
};

export function emptyNewsletterTemplateData(
  template: NewsletterTemplate,
): Record<string, any> {
  switch (template) {
    case "RegulatoryAlert":
      return {
        refTag: "",
        heading: "",
        subtext: "",
        alertText: "",
        checklist: [""],
        ctaLabel: "Read the full advisory",
        ctaUrl: "",
        fineText: "",
        imageUrl: "",
        imageAlt: "",
      };
    case "QuarterlyRoundup":
      return {
        eyebrow: "",
        heading: "Quarterly Round-Up",
        intro: "",
        sections: [
          { num: "01", heading: "", body: "", linkLabel: "", linkUrl: "" },
        ],
        blogHeading: "Also from us this quarter",
        blogItems: [],
        imageUrl: "",
        imageAlt: "",
      };
    case "ArticleSpotlight":
      return {
        heroLabel: "",
        eyebrow: "FEATURED ARTICLE",
        heading: "",
        byline: "",
        excerpt: "",
        ctaLabel: "Read the full article",
        ctaUrl: "",
        moreItems: [],
        imageUrl: "",
        imageAlt: "",
      };
    case "EventInvite":
      return {
        day: "",
        month: "",
        heading: "",
        location: "",
        bodyText: "",
        infoRows: [
          { label: "Date", value: "" },
          { label: "Time", value: "" },
          { label: "Format", value: "" },
        ],
        agenda: [{ time: "", label: "" }],
        ctaLabel: "Reserve my seat",
        ctaUrl: "",
        calendarLabel: "Add to calendar",
        calendarUrl: "",
        imageUrl: "",
        imageAlt: "",
      };
  }
}

// ── Small helpers for editing arrays of strings / rows ──────────

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}

function ObjectListEditor({
  values,
  fields,
  onChange,
}: {
  values: Record<string, string>[];
  fields: { key: string; label: string; wide?: boolean }[];
  onChange: (next: Record<string, string>[]) => void;
}) {
  return (
    <div className="space-y-3">
      {values.map((row, i) => (
        <div key={i} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              #{i + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={f.wide ? "space-y-1 sm:col-span-2" : "space-y-1"}
              >
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={row[f.key] ?? ""}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = { ...next[i], [f.key]: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...values,
            Object.fromEntries(fields.map((f) => [f.key, ""])),
          ])
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add row
      </Button>
    </div>
  );
}

// Image / GIF picker — uploads to the tenant's own newsletter media
// folder and drops the returned absolute URL in (email clients need
// an absolute URL), with a paste-a-link fallback.
function ImageField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helpText?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadNewsletterImage(file));
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description:
          err?.response?.data?.message ||
          "Could not upload that file (PNG, JPG, GIF or WebP up to 8 MB).",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {value ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-md border">
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-1.5 top-1.5 h-6 w-6"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https:// or upload a file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TemplateFields({
  template,
  data,
  onChange,
}: {
  template: NewsletterTemplate;
  data: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  const set = (key: string, value: any) => onChange({ ...data, [key]: value });
  const str = (key: string) => data[key] ?? "";

  if (template === "RegulatoryAlert") {
    return (
      <div className="space-y-4">
        <Field
          label="Reference tag"
          value={str("refTag")}
          onChange={(v) => set("refTag", v)}
          placeholder="e.g. REF: AML-CFT/2026-04"
        />
        <Field
          label="Heading *"
          value={str("heading")}
          onChange={(v) => set("heading", v)}
          placeholder="e.g. New AML/CFT requirements are now in effect"
        />
        <Field
          label="Subtext"
          value={str("subtext")}
          onChange={(v) => set("subtext", v)}
          placeholder="e.g. Effective 1 August 2026 · Affects all regulated entities"
        />
        <div className="space-y-1">
          <Label>Alert text *</Label>
          <Textarea
            rows={4}
            value={str("alertText")}
            onChange={(e) => set("alertText", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Checklist</Label>
          <StringListEditor
            values={data.checklist ?? []}
            onChange={(v) => set("checklist", v)}
            placeholder="e.g. Beneficial ownership records must be re-verified within 30 days."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Button label"
            value={str("ctaLabel")}
            onChange={(v) => set("ctaLabel", v)}
          />
          <Field
            label="Button URL"
            value={str("ctaUrl")}
            onChange={(v) => set("ctaUrl", v)}
            placeholder="https://…"
          />
        </div>
        <Field
          label="Fine print"
          value={str("fineText")}
          onChange={(v) => set("fineText", v)}
        />
        <ImageField
          label="Image / GIF (optional)"
          value={str("imageUrl")}
          onChange={(url) => set("imageUrl", url)}
          helpText="Shown above the heading."
        />
      </div>
    );
  }

  if (template === "QuarterlyRoundup") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Eyebrow"
            value={str("eyebrow")}
            onChange={(v) => set("eyebrow", v)}
            placeholder="e.g. Q2 2026 · QUARTERLY ROUND-UP"
          />
          <Field
            label="Heading *"
            value={str("heading")}
            onChange={(v) => set("heading", v)}
          />
        </div>
        <div className="space-y-1">
          <Label>Intro *</Label>
          <Textarea
            rows={3}
            value={str("intro")}
            onChange={(e) => set("intro", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Sections *</Label>
          <ObjectListEditor
            values={data.sections ?? []}
            fields={[
              { key: "num", label: "Number label" },
              { key: "heading", label: "Heading" },
              { key: "body", label: "Body", wide: true },
              { key: "linkLabel", label: "Link label" },
              { key: "linkUrl", label: "Link URL" },
            ]}
            onChange={(v) => set("sections", v)}
          />
        </div>
        <div className="space-y-2">
          <Field
            label="Related-links heading (optional)"
            value={str("blogHeading")}
            onChange={(v) => set("blogHeading", v)}
            placeholder="Also from us this quarter"
          />
          <ObjectListEditor
            values={data.blogItems ?? []}
            fields={[
              { key: "label", label: "Label", wide: true },
              { key: "meta", label: "Meta" },
              { key: "url", label: "URL" },
            ]}
            onChange={(v) => set("blogItems", v)}
          />
        </div>
        <ImageField
          label="Image / GIF (optional)"
          value={str("imageUrl")}
          onChange={(url) => set("imageUrl", url)}
          helpText="Shown below the heading band, above the intro."
        />
      </div>
    );
  }

  if (template === "ArticleSpotlight") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Hero label"
            value={str("heroLabel")}
            onChange={(v) => set("heroLabel", v)}
            placeholder="e.g. GOVERNANCE ADVISORY"
          />
          <Field
            label="Eyebrow"
            value={str("eyebrow")}
            onChange={(v) => set("eyebrow", v)}
            placeholder="e.g. FEATURED ARTICLE"
          />
        </div>
        <Field
          label="Heading *"
          value={str("heading")}
          onChange={(v) => set("heading", v)}
        />
        <Field
          label="Byline"
          value={str("byline")}
          onChange={(v) => set("byline", v)}
          placeholder="e.g. By Jane Doe, Senior Associate · 6 min read"
        />
        <div className="space-y-1">
          <Label>Excerpt *</Label>
          <Textarea
            rows={4}
            value={str("excerpt")}
            onChange={(e) => set("excerpt", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Button label"
            value={str("ctaLabel")}
            onChange={(v) => set("ctaLabel", v)}
          />
          <Field
            label="Button URL *"
            value={str("ctaUrl")}
            onChange={(v) => set("ctaUrl", v)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1">
          <Label>More from the series (optional)</Label>
          <ObjectListEditor
            values={data.moreItems ?? []}
            fields={[
              { key: "title", label: "Title", wide: true },
              { key: "meta", label: "Meta" },
            ]}
            onChange={(v) => set("moreItems", v)}
          />
        </div>
        <ImageField
          label="Image / GIF (optional)"
          value={str("imageUrl")}
          onChange={(url) => set("imageUrl", url)}
          helpText="Shown below the hero band, above the heading."
        />
      </div>
    );
  }

  // EventInvite
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Day *"
          value={str("day")}
          onChange={(v) => set("day", v)}
          placeholder="18"
        />
        <Field
          label="Month *"
          value={str("month")}
          onChange={(v) => set("month", v)}
          placeholder="SEP"
        />
        <Field
          label="Location"
          value={str("location")}
          onChange={(v) => set("location", v)}
          placeholder="e.g. Kigali · In-person"
        />
      </div>
      <Field
        label="Heading *"
        value={str("heading")}
        onChange={(v) => set("heading", v)}
      />
      <div className="space-y-1">
        <Label>Body text</Label>
        <Textarea
          rows={3}
          value={str("bodyText")}
          onChange={(e) => set("bodyText", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Key details (Date / Time / Format…)</Label>
        <ObjectListEditor
          values={data.infoRows ?? []}
          fields={[
            { key: "label", label: "Label" },
            { key: "value", label: "Value" },
          ]}
          onChange={(v) => set("infoRows", v)}
        />
      </div>
      <div className="space-y-1">
        <Label>Agenda</Label>
        <ObjectListEditor
          values={data.agenda ?? []}
          fields={[
            { key: "time", label: "Time" },
            { key: "label", label: "Item", wide: true },
          ]}
          onChange={(v) => set("agenda", v)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Button label"
          value={str("ctaLabel")}
          onChange={(v) => set("ctaLabel", v)}
        />
        <Field
          label="Button URL"
          value={str("ctaUrl")}
          onChange={(v) => set("ctaUrl", v)}
          placeholder="https://…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Calendar link label"
          value={str("calendarLabel")}
          onChange={(v) => set("calendarLabel", v)}
        />
        <Field
          label="Calendar link URL"
          value={str("calendarUrl")}
          onChange={(v) => set("calendarUrl", v)}
        />
      </div>
      <ImageField
        label="Image / GIF (optional)"
        value={str("imageUrl")}
        onChange={(url) => set("imageUrl", url)}
        helpText="Shown below the date/heading band, above the body text."
      />
    </div>
  );
}

// ── Live preview — the engine renders the real thing (same renderer
// that builds the sent email), debounced as the user types. ─────

const REQUIRED_LABEL: Record<string, string> = {
  heading: "Heading",
  alertText: "Alert text",
  intro: "Intro",
  sections: "At least one section",
  excerpt: "Excerpt",
  ctaUrl: "Button URL",
  day: "Day",
  month: "Month",
};

export function NewsletterPreview({
  template,
  data,
  previewText,
}: {
  template: NewsletterTemplate;
  data: Record<string, any>;
  previewText?: string;
}) {
  const [debounced, setDebounced] = useState({ template, data, previewText });
  useEffect(() => {
    const t = setTimeout(
      () => setDebounced({ template, data, previewText }),
      600,
    );
    return () => clearTimeout(t);
  }, [template, data, previewText]);

  const q = useQuery({
    queryKey: ["newsletter-preview", JSON.stringify(debounced)],
    queryFn: () =>
      previewNewsletter({
        template: debounced.template,
        templateData: debounced.data,
        previewText: debounced.previewText,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-2">
      {q.data?.missingFields?.length ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
          Still needed before this can be sent:{" "}
          {q.data.missingFields.map((f) => REQUIRED_LABEL[f] ?? f).join(", ")}.
        </p>
      ) : null}
      <div className="relative overflow-hidden rounded-md border bg-muted/30">
        {q.isFetching && (
          <Loader2 className="absolute right-2 top-2 z-10 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {q.isError ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Couldn't render the preview.
          </p>
        ) : (
          <iframe
            title="Newsletter preview"
            // Sandboxed — rendered email HTML never gets scripts or
            // same-origin access to the app.
            sandbox=""
            srcDoc={q.data?.html ?? ""}
            className="h-[560px] w-full bg-white"
          />
        )}
      </div>
    </div>
  );
}

export function NewsletterTemplateForm({
  template,
  data,
  previewText,
  onTemplateChange,
  onDataChange,
  onPreviewTextChange,
}: {
  template: NewsletterTemplate;
  data: Record<string, any>;
  previewText: string;
  onTemplateChange: (t: NewsletterTemplate) => void;
  onDataChange: (d: Record<string, any>) => void;
  onPreviewTextChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {NEWSLETTER_TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => t !== template && onTemplateChange(t)}
            className={`rounded-md border p-3 text-left transition-colors ${
              t === template
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
          >
            <p className="text-sm font-medium">
              {NEWSLETTER_TEMPLATE_LABELS[t]}
            </p>
            <p className="text-xs text-muted-foreground">
              {NEWSLETTER_TEMPLATE_HINTS[t]}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <Label>Preview text</Label>
        <Input
          value={previewText}
          onChange={(e) => onPreviewTextChange(e.target.value)}
          placeholder="The short line shown next to the subject in the inbox"
        />
      </div>

      <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
        {(["edit", "preview"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 rounded px-3 py-1.5 font-medium capitalize ${
              tab === k ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {k === "edit" ? "Edit content" : "Live preview"}
          </button>
        ))}
      </div>

      {tab === "edit" ? (
        <TemplateFields
          template={template}
          data={data}
          onChange={onDataChange}
        />
      ) : (
        <NewsletterPreview
          template={template}
          data={data}
          previewText={previewText}
        />
      )}
    </div>
  );
}
