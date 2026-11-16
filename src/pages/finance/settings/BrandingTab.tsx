import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Palette,
  Type,
  Upload,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBrandingPreviewPdf,
  removeBrandingLogo,
  resolveFinanceFileUrl,
  uploadBrandingLogo,
  type BrandingPreviewKind,
  type BrandingSettings,
  type FinanceSettingsPayload,
} from "@/lib/crm/finance-api";
import {
  fetchPayslipTemplate,
  updatePayslipTemplate,
} from "@/lib/hr/hr-api";
import {
  Field,
  SectionFooter,
  SETTINGS_LOG_KEY,
  SETTINGS_QUERY_KEY,
  SettingsCard,
  SimpleSelect,
  ToggleRow,
  useFinanceSettings,
  useSectionForm,
} from "./shared";

const KINDS: { value: BrandingPreviewKind; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "quote", label: "Quote" },
  { value: "purchase-order", label: "Purchase order" },
  { value: "payslip", label: "Payslip" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded border"
        />
        <Input
          className="font-mono"
          value={value}
          maxLength={7}
          aria-invalid={!HEX.test(value)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      </div>
    </Field>
  );
}

const cssFont = (name: string) =>
  name === "Merriweather"
    ? `"${name}", Georgia, "Times New Roman", serif`
    : `"${name}", system-ui, sans-serif`;

/** A small page that follows the draft as you edit, before anything is saved. */
function LivePreview({
  b,
  kind,
  logoUrl,
  tin,
}: {
  b: BrandingSettings;
  kind: BrandingPreviewKind;
  logoUrl: string | null;
  tin: string;
}) {
  const title = {
    invoice: "INVOICE",
    receipt: "RECEIPT",
    quote: "QUOTE",
    "purchase-order": "PURCHASE ORDER",
    payslip: "PAYSLIP",
  }[kind];
  const name = b.companyName || "Your company";
  const rows =
    kind === "payslip"
      ? [["Basic salary", "1,200,000.00"], ["Transport allowance", "150,000.00"]]
      : [["Professional services", "2,000.00"], ["Filing fees", "350.00"]];
  return (
    <div
      className="relative mx-auto aspect-[1/1.35] w-full max-w-[360px] overflow-hidden rounded border bg-white p-5 text-[10px] text-neutral-800 shadow-sm"
      style={{ fontFamily: cssFont(b.bodyFont) }}
      aria-label="Live preview"
    >
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: b.highlightColor }} />
      {b.watermarkDrafts && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-bold tracking-widest text-neutral-200/70 -rotate-[30deg]">
          DRAFT
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-bold" style={{ color: b.headerColor, fontFamily: cssFont(b.headingFont) }}>
            {title}
          </div>
          <div className="mt-1 font-semibold">Sample Client Ltd</div>
        </div>
        <div className="text-right">
          {b.showLogo && logoUrl ? (
            <img src={logoUrl} alt="" className="ml-auto mb-1 h-8 max-w-[90px] object-contain" />
          ) : null}
          <div className="font-semibold">{name}</div>
          {b.showTagline && b.tagline && <div className="text-neutral-500">{b.tagline}</div>}
          {b.address && <div className="whitespace-pre-line text-neutral-500">{b.address}</div>}
        </div>
      </div>
      <div className="my-3 h-px" style={{ background: b.highlightColor }} />
      <div className="flex justify-between font-bold" style={{ color: b.headerColor }}>
        <span>DESCRIPTION</span>
        <span>AMOUNT</span>
      </div>
      <div className="my-1 h-px" style={{ background: b.highlightColor }} />
      {rows.map(([l, v]) => (
        <div key={l} className="flex justify-between py-1">
          <span>{l}</span>
          <span>{v}</span>
        </div>
      ))}
      <div className="mt-1 h-px" style={{ background: b.highlightColor }} />
      <div className="mt-2 flex justify-between font-bold" style={{ color: b.accentColor }}>
        <span>TOTAL</span>
        <span>{kind === "payslip" ? "1,350,000.00" : "2,350.00"}</span>
      </div>
      {b.footerWithAddressAndTin && (
        <div className="absolute inset-x-5 bottom-3 border-t pt-1 text-center text-[8px] text-neutral-500">
          {[name, b.address.split("\n")[0], tin && `TIN ${tin}`].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function PayslipContents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tpl, isError } = useQuery({
    queryKey: ["payslip-template"],
    queryFn: fetchPayslipTemplate,
    retry: false,
  });
  const mut = useMutation({
    mutationFn: updatePayslipTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslip-template"] });
      toast({ title: "Payslip contents saved" });
    },
    onError: (err: any) =>
      toast({ title: "Could not save", description: err?.response?.data?.message, variant: "destructive" }),
  });
  if (isError || !tpl) return null;
  const rows: { key: "showEmployerContributions" | "showLoanDeductions" | "showYearToDateSummary"; title: string }[] = [
    { key: "showEmployerContributions", title: "Show employer contributions section" },
    { key: "showLoanDeductions", title: "Show loan deductions section" },
    { key: "showYearToDateSummary", title: "Show year-to-date summary" },
  ];
  return (
    <SettingsCard
      icon={<FileText className="h-4 w-4" />}
      title="Payslip contents"
      description="Payslips use the same logo, colours, fonts and footer as every other document. These switches only choose which sections they include."
    >
      {rows.map((r) => (
        <ToggleRow
          key={r.key}
          title={r.title}
          checked={!!tpl[r.key]}
          disabled={mut.isPending}
          onChange={(v) => mut.mutate({ [r.key]: v })}
        />
      ))}
    </SettingsCard>
  );
}

export default function BrandingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useFinanceSettings();
  const form = useSectionForm("branding", data?.settings.branding);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<BrandingPreviewKind>("invoice");
  const [pdfOpen, setPdfOpen] = useState(false);

  const onPayload = (title: string) => (p: FinanceSettingsPayload) => {
    queryClient.setQueryData(SETTINGS_QUERY_KEY, p);
    queryClient.invalidateQueries({ queryKey: SETTINGS_LOG_KEY });
    queryClient.invalidateQueries({ queryKey: ["branding-preview"] });
    toast({ title });
  };
  const onErr = (title: string) => (err: any) =>
    toast({ title, description: err?.response?.data?.message ?? "Please try again.", variant: "destructive" });

  const uploadMut = useMutation({
    mutationFn: uploadBrandingLogo,
    onSuccess: onPayload("Logo updated"),
    onError: onErr("Could not upload the logo"),
  });
  const removeMut = useMutation({
    mutationFn: removeBrandingLogo,
    onSuccess: onPayload("Logo removed"),
    onError: onErr("Could not remove the logo"),
  });

  // The real PDF, built by the server from the *saved* branding.
  const pdf = useQuery({
    queryKey: ["branding-preview", kind],
    queryFn: () => fetchBrandingPreviewPdf(kind),
    enabled: pdfOpen,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pdf.data) return setPdfUrl(null);
    const url = URL.createObjectURL(pdf.data);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf.data]);

  const d = form.draft;
  if (!d || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<BrandingSettings>) => form.patch(p);
  const logoUrl = data.logo ? resolveFinanceFileUrl(data.logo.url) : null;
  const logoFromElsewhere = data.logo && data.logo.source !== "finance";

  const download = async () => {
    try {
      const blob = pdf.data ?? (await fetchBrandingPreviewPdf(kind));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sample-${kind}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      onErr("Could not build the sample")(e);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <SettingsCard
          icon={<Palette className="h-4 w-4" />}
          title="Colour scheme"
          description="Colours applied to invoices, receipts, quotes, purchase orders and payslips."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <ColourField label="Header colour" value={d.headerColor} onChange={(v) => set({ headerColor: v })} />
            <ColourField label="Accent colour" value={d.accentColor} onChange={(v) => set({ accentColor: v })} />
            <ColourField label="Highlight colour" value={d.highlightColor} onChange={(v) => set({ highlightColor: v })} />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm">Presets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.presets).map(([key, p]) => (
                <Button key={key} type="button" size="sm" variant="outline" className="capitalize" onClick={() => set(p)}>
                  <span className="mr-2 flex">
                    {[p.headerColor, p.accentColor, p.highlightColor].map((c) => (
                      <span key={c} className="-ml-1 first:ml-0 h-3.5 w-3.5 rounded-full border border-white" style={{ background: c }} />
                    ))}
                  </span>
                  {key}
                </Button>
              ))}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<ImageIcon className="h-4 w-4" />}
          title="Logo & identity"
          description="Your logo and company details appear on every financial document. Logo changes apply straight away."
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-32 items-center justify-center rounded border bg-muted/30">
              {logoUrl ? (
                <img src={logoUrl} alt="Current logo" className="max-h-14 max-w-[7.5rem] object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={uploadMut.isPending} onClick={() => fileRef.current?.click()}>
                  {uploadMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {data.logo ? "Replace logo" : "Upload logo"}
                </Button>
                {data.logo?.source === "finance" && (
                  <Button size="sm" variant="ghost" disabled={removeMut.isPending} onClick={() => removeMut.mutate()}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                SVG, PNG or JPG, max 2 MB.
                {logoFromElsewhere && " Using your existing logo until you upload one here."}
              </p>
            </div>
            <input
              ref={fileRef}
              data-testid="logo-input"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name on documents">
              <Input value={d.companyName} maxLength={120} onChange={(e) => set({ companyName: e.target.value })} />
            </Field>
            <Field label="Tagline (optional)">
              <Input value={d.tagline} maxLength={160} onChange={(e) => set({ tagline: e.target.value })} />
            </Field>
          </div>
          <Field label="Address on documents" hint="One line per row, as it should print.">
            <Textarea rows={3} maxLength={300} value={d.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
        </SettingsCard>

        <SettingsCard
          icon={<Type className="h-4 w-4" />}
          title="Document fonts"
          description="Documents are generated as PDFs with built-in typefaces, so each choice maps to the closest match: Merriweather prints as a serif, everything else as a clean sans-serif."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Heading font">
              <SimpleSelect value={d.headingFont} onChange={(v) => set({ headingFont: v })} options={data.fonts.heading.map((f) => ({ value: f, label: f }))} />
            </Field>
            <Field label="Body font">
              <SimpleSelect value={d.bodyFont} onChange={(v) => set({ bodyFont: v })} options={data.fonts.body.map((f) => ({ value: f, label: f }))} />
            </Field>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Document options"
          description="Elements shown on generated finance documents."
        >
          <ToggleRow title="Show logo" description="Display your logo in the header of all documents." checked={d.showLogo} onChange={(v) => set({ showLogo: v })} />
          <ToggleRow title="Show tagline" description="Display the tagline below the company name." checked={d.showTagline} onChange={(v) => set({ showTagline: v })} />
          <ToggleRow title="Footer with address and TIN" description="Add your address, tax identification number and contact email in the footer." checked={d.footerWithAddressAndTin} onChange={(v) => set({ footerWithAddressAndTin: v })} />
          <ToggleRow title="Watermark on drafts" description='Show a "DRAFT" watermark on documents that are not yet issued.' checked={d.watermarkDrafts} onChange={(v) => set({ watermarkDrafts: v })} />
        </SettingsCard>

        <PayslipContents />

        <SectionFooter
          dirty={form.dirty}
          saving={form.saving}
          resetting={form.resetting}
          onSave={form.save}
          onDiscard={form.discard}
          onReset={form.reset}
          resetNote="Your company name, tagline, address and logo are kept."
        />
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <SettingsCard
          icon={<Eye className="h-4 w-4" />}
          title="Live document preview"
          description="Follows your edits as you make them."
        >
          <Tabs value={kind} onValueChange={(v) => setKind(v as BrandingPreviewKind)}>
            <TabsList className="h-auto flex-wrap justify-start">
              {KINDS.map((k) => (
                <TabsTrigger key={k.value} value={k.value} className="px-2 py-1 text-xs">
                  {k.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <LivePreview b={d} kind={kind} logoUrl={logoUrl} tin={data.settings.tax.tin} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setPdfOpen(true)}>
              <Eye className="mr-2 h-4 w-4" /> View sample PDF
            </Button>
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Download sample
            </Button>
          </div>
          {form.dirty && (
            <Badge variant="outline" className="text-[10px]">
              Save to see these changes in the sample PDF
            </Badge>
          )}
        </SettingsCard>
      </div>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="flex h-[85vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>Sample {KINDS.find((k) => k.value === kind)?.label.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded border bg-muted/30">
            {pdf.isLoading && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building the sample…
              </div>
            )}
            {pdf.isError && (
              <div className="flex h-full items-center justify-center text-sm text-destructive">
                Could not build the sample document.
              </div>
            )}
            {pdfUrl && <iframe title="Sample document" src={pdfUrl} className="h-full w-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
