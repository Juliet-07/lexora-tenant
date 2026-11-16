import { Clock, Mail, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { InvoicingSettings } from "@/lib/crm/finance-api";
import {
  Field,
  NumberInput,
  SavedOnlyBadge,
  SectionFooter,
  SettingsCard,
  SimpleSelect,
  ToggleRow,
  useFinanceSettings,
  useSectionForm,
} from "./shared";

const TERMS = [
  { value: "due-on-receipt", label: "Due on receipt" },
  { value: "net-7", label: "Net 7" },
  { value: "net-14", label: "Net 14" },
  { value: "net-30", label: "Net 30" },
  { value: "net-45", label: "Net 45" },
  { value: "net-60", label: "Net 60" },
  { value: "net-90", label: "Net 90" },
];

export default function InvoicingTab() {
  const { data } = useFinanceSettings();
  const form = useSectionForm("invoicing", data?.settings.invoicing);
  const d = form.draft;
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<InvoicingSettings>) => form.patch(p);
  const dun = d.dunning;
  const dunOk =
    dun.firstReminderDays < dun.secondReminderDays &&
    dun.secondReminderDays < dun.finalNoticeDays;

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Clock className="h-4 w-4" />}
        title="Payment terms"
        description="Default terms applied when you create a new invoice. The due date fills in from this; you can still change it per invoice."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default invoice payment terms">
            <SimpleSelect value={d.defaultPaymentTerms} onChange={(v) => set({ defaultPaymentTerms: v })} options={TERMS} />
          </Field>
          <Field label="Late payment interest rate (% per year)">
            <NumberInput min={0} max={100} step={0.5} value={d.lateInterestRate} onChange={(v) => set({ lateInterestRate: v })} />
          </Field>
        </div>
        <ToggleRow
          title="Apply late fees automatically"
          description="Calculate and add late payment interest on overdue invoices. Saved for now; interest is not added automatically yet."
          checked={d.applyLateFees}
          onChange={(v) => set({ applyLateFees: v })}
        />
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Early payment discount</p>
              <p className="text-xs text-muted-foreground">
                Offer {d.earlyPaymentDiscount.percent}% off for payment within {d.earlyPaymentDiscount.days} days. Saved for now; not applied to invoices yet.
              </p>
            </div>
            <Switch checked={d.earlyPaymentDiscount.enabled} onCheckedChange={(v) => set({ earlyPaymentDiscount: { ...d.earlyPaymentDiscount, enabled: v } })} />
          </div>
          {d.earlyPaymentDiscount.enabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Discount (%)">
                <NumberInput min={0} max={100} step={0.5} value={d.earlyPaymentDiscount.percent} onChange={(v) => set({ earlyPaymentDiscount: { ...d.earlyPaymentDiscount, percent: v } })} />
              </Field>
              <Field label="Within (days)">
                <NumberInput min={1} max={365} value={d.earlyPaymentDiscount.days} onChange={(v) => set({ earlyPaymentDiscount: { ...d.earlyPaymentDiscount, days: v } })} />
              </Field>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Mail className="h-4 w-4" />}
        title="Dunning & collections"
        description="Follow-up schedule for overdue invoices, counted in days after the due date."
        action={<SavedOnlyBadge />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="First reminder (days overdue)" hint="0 = on the due date">
            <NumberInput min={0} max={365} value={dun.firstReminderDays} onChange={(v) => set({ dunning: { ...dun, firstReminderDays: v } })} />
          </Field>
          <Field label="Second reminder (days overdue)">
            <NumberInput min={0} max={365} value={dun.secondReminderDays} onChange={(v) => set({ dunning: { ...dun, secondReminderDays: v } })} />
          </Field>
          <Field label="Final notice (days overdue)">
            <NumberInput min={0} max={365} value={dun.finalNoticeDays} onChange={(v) => set({ dunning: { ...dun, finalNoticeDays: v } })} />
          </Field>
        </div>
        {!dunOk && (
          <p className="text-xs text-destructive">
            Reminders have to escalate: first, then second, then the final notice.
          </p>
        )}
        <ToggleRow
          title="Enable auto-dunning"
          description="Automatically send reminder emails on this schedule."
          checked={dun.enabled}
          onChange={(v) => set({ dunning: { ...dun, enabled: v } })}
        />
      </SettingsCard>

      <SettingsCard
        icon={<StickyNote className="h-4 w-4" />}
        title="Default notes"
        description="Standard text printed at the bottom of your documents. Bank details are managed in the Bank Accounts tab."
      >
        <Field label="Invoice footer text" hint="Shown on invoices and receipts.">
          <Textarea rows={3} maxLength={1000} value={d.invoiceFooter} onChange={(e) => set({ invoiceFooter: e.target.value })} placeholder="Thank you for your business. Please include the invoice number as a reference when making payment." />
        </Field>
        <Field label="Credit note footer">
          <Textarea rows={3} maxLength={1000} value={d.creditNoteFooter} onChange={(e) => set({ creditNoteFooter: e.target.value })} placeholder="This credit note should be applied against the referenced invoice." />
        </Field>
      </SettingsCard>

      <SectionFooter
        dirty={form.dirty}
        saving={form.saving}
        resetting={form.resetting}
        onSave={form.save}
        onDiscard={form.discard}
        onReset={form.reset}
      />
    </div>
  );
}
