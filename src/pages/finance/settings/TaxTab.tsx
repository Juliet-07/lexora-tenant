import { useState } from "react";
import { BellRing, FileText, Percent, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { TaxSettings } from "@/lib/crm/finance-api";
import {
  Field,
  NumberInput,
  SectionFooter,
  SettingsCard,
  SimpleSelect,
  ToggleRow,
  useFinanceSettings,
  useSectionForm,
} from "./shared";

const JURISDICTIONS = [
  ["rw", "Rwanda (RRA)"], ["ke", "Kenya (KRA)"], ["tz", "Tanzania (TRA)"],
  ["ug", "Uganda (URA)"], ["za", "South Africa (SARS)"], ["ng", "Nigeria (FIRS)"],
  ["gh", "Ghana (GRA)"], ["bw", "Botswana (BURS)"], ["zw", "Zimbabwe (ZIMRA)"],
  ["mu", "Mauritius (MRA)"], ["et", "Ethiopia (MoR)"], ["zm", "Zambia (ZRA)"],
  ["mz", "Mozambique (AT)"], ["cd", "DRC (DGI)"], ["sn", "Senegal (DGID)"],
  ["ci", "Ivory Coast (DGI)"],
].map(([value, label]) => ({ value, label }));

const REMINDERS: { key: keyof TaxSettings["reminders"]; title: string; description: string }[] = [
  { key: "vat", title: "VAT return reminder", description: "Email the person responsible before a VAT return is due." },
  { key: "paye", title: "PAYE return reminder", description: "Email before the monthly PAYE return is due." },
  { key: "cit", title: "Annual CIT return reminder", description: "Email before the corporate income tax return is due." },
  { key: "pension", title: "Pension fund contribution reminder", description: "Email before the monthly pension / social security contribution is due." },
];

export default function TaxTab() {
  const { data } = useFinanceSettings();
  const form = useSectionForm("tax", data?.settings.tax);
  const d = form.draft;
  const [newCat, setNewCat] = useState({ code: "", name: "", rate: "" });
  const [newWht, setNewWht] = useState({ name: "", rate: "" });
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<TaxSettings>) => form.patch(p);

  const updateCat = (i: number, p: Partial<TaxSettings["categories"][number]>) =>
    set({ categories: d.categories.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const updateWht = (i: number, p: Partial<TaxSettings["whtCategories"][number]>) =>
    set({ whtCategories: d.whtCategories.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Percent className="h-4 w-4" />}
        title="VAT configuration"
        description="Tax authority settings and the VAT rate new invoices start with."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tax jurisdiction">
            <SimpleSelect
              value={d.jurisdiction}
              onChange={(v) => set({ jurisdiction: v })}
              options={JURISDICTIONS}
            />
          </Field>
          <Field label="Tax identification number" hint="Printed in the footer of your documents.">
            <Input value={d.tin} onChange={(e) => set({ tin: e.target.value })} />
          </Field>
          <Field label="Standard VAT rate (%)">
            <NumberInput min={0} max={100} step={0.5} value={d.standardVatRate} onChange={(v) => set({ standardVatRate: v })} />
          </Field>
        </div>
        <ToggleRow
          title="VAT registered"
          description="Your organisation is registered for VAT. When off, new invoices start with 0% VAT."
          checked={d.vatRegistered}
          onChange={(v) => set({ vatRegistered: v })}
        />
        <ToggleRow
          title="Auto-calculate VAT on invoices"
          description="Automatically apply the standard rate to line items."
          checked={d.autoCalculateVat}
          onChange={(v) => set({ autoCalculateVat: v })}
        />
      </SettingsCard>

      <SettingsCard
        icon={<Tags className="h-4 w-4" />}
        title="Tax categories"
        description="Tax classifications you apply to invoice line items."
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Classification</th>
                <th className="px-3 py-2 text-left font-medium">Rate %</th>
                <th className="px-3 py-2 text-left font-medium">Active</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {d.categories.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2"><Input className="h-8 w-24 font-mono" value={c.code} onChange={(e) => updateCat(i, { code: e.target.value.toUpperCase() })} /></td>
                  <td className="px-3 py-2"><Input className="h-8" value={c.name} onChange={(e) => updateCat(i, { name: e.target.value })} /></td>
                  <td className="px-3 py-2"><NumberInput nullable className="h-8 w-24" placeholder="N/A" min={0} max={100} value={c.rate} onChange={(v) => updateCat(i, { rate: v })} /></td>
                  <td className="px-3 py-2"><Switch checked={c.active} onCheckedChange={(v) => updateCat(i, { active: v })} /></td>
                  <td className="px-2"><Button size="icon" variant="ghost" aria-label={`Remove ${c.code}`} onClick={() => set({ categories: d.categories.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></td>
                </tr>
              ))}
              {!d.categories.length && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">No categories.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input className="h-9 w-24 font-mono" placeholder="Code" value={newCat.code} onChange={(e) => setNewCat({ ...newCat, code: e.target.value.toUpperCase() })} />
          <Input className="h-9 min-w-[160px] flex-1" placeholder="Classification" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <Input className="h-9 w-24" type="number" placeholder="Rate %" value={newCat.rate} onChange={(e) => setNewCat({ ...newCat, rate: e.target.value })} />
          <Button
            size="sm"
            variant="outline"
            disabled={!newCat.code.trim() || !newCat.name.trim()}
            onClick={() => {
              set({ categories: [...d.categories, { code: newCat.code.trim(), name: newCat.name.trim(), rate: newCat.rate === "" ? null : Number(newCat.rate), active: true }] });
              setNewCat({ code: "", name: "", rate: "" });
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add category
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<FileText className="h-4 w-4" />}
        title="Withholding tax"
        description="Withholding rates applied to vendor payments."
      >
        <div className="space-y-2">
          {d.whtCategories.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="h-9 flex-1" value={c.name} onChange={(e) => updateWht(i, { name: e.target.value })} />
              <div className="flex items-center gap-1">
                <NumberInput className="h-9 w-24" min={0} max={100} value={c.rate} onChange={(v) => updateWht(i, { rate: v })} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button size="icon" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => set({ whtCategories: d.whtCategories.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input className="h-9 min-w-[200px] flex-1" placeholder="Category, e.g. Management fees" value={newWht.name} onChange={(e) => setNewWht({ ...newWht, name: e.target.value })} />
          <Input className="h-9 w-24" type="number" placeholder="Rate %" value={newWht.rate} onChange={(e) => setNewWht({ ...newWht, rate: e.target.value })} />
          <Button
            size="sm"
            variant="outline"
            disabled={!newWht.name.trim() || newWht.rate === ""}
            onClick={() => {
              set({ whtCategories: [...d.whtCategories, { name: newWht.name.trim(), rate: Number(newWht.rate) }] });
              setNewWht({ name: "", rate: "" });
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add category
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<BellRing className="h-4 w-4" />}
        title="Tax filing reminders"
        description="Choose which recurring filings get a reminder email. Deadlines themselves are managed on the Tax page."
        action={<Badge variant="outline" className="text-[10px]">Applied by the daily tax job</Badge>}
      >
        {REMINDERS.map((r) => (
          <ToggleRow
            key={r.key}
            title={r.title}
            description={r.description}
            checked={d.reminders[r.key]}
            onChange={(v) => set({ reminders: { ...d.reminders, [r.key]: v } })}
          />
        ))}
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
