import { useQuery } from "@tanstack/react-query";
import { Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApprovalSettings, ApprovalTier } from "@/lib/crm/finance-api";
import { fetchEmployees } from "@/lib/hr/hr-api";
import {
  Field,
  NumberInput,
  SectionFooter,
  SavedOnlyBadge,
  SettingsCard,
  SimpleSelect,
  ToggleRow,
  money,
  useFinanceSettings,
  useSectionForm,
} from "./shared";

const NONE = "__none__";

function PersonSelect({
  value,
  onChange,
  people,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  people: { id: string; name: string }[];
  placeholder: string;
}) {
  const known = !value || people.some((p) => p.id === value);
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {!known && <SelectItem value={value}>Former employee</SelectItem>}
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ApprovalsTab() {
  const { data } = useFinanceSettings();
  const form = useSectionForm("approvals", data?.settings.approvals);
  const { data: page } = useQuery({
    queryKey: ["hr-employees-all"],
    queryFn: () => fetchEmployees({ limit: 500 }),
    retry: false,
  });
  const d = form.draft;
  if (!d || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<ApprovalSettings>) => form.patch(p);
  const cur = data.profile.baseCurrency;
  // Approver ids are the employee's user account where there is one —
  // that is who actually signs in to approve.
  const people = (page?.items ?? [])
    .filter((e) => e.userId)
    .map((e) => ({ id: String(e.userId), name: `${e.firstName} ${e.lastName}` }));
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name;

  const updateTier = (i: number, p: Partial<ApprovalTier>) =>
    set({ tiers: d.tiers.map((t, j) => (j === i ? { ...t, ...p } : t)) });
  const addTier = () => {
    const last = d.tiers[d.tiers.length - 1];
    set({
      tiers: [
        ...d.tiers,
        {
          name: `Tier ${d.tiers.length + 1}`,
          min: last?.max ?? 0,
          max: null,
          mode: "single",
          approverIds: [],
          backupId: "",
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Payment approval tiers"
        description={`Approval thresholds for outgoing payments (${cur}). A payment above a tier's minimum is routed to that tier's approvers. Tiers cannot overlap.`}
        action={
          <div className="flex items-center gap-2">
            <SavedOnlyBadge />
            <Button size="sm" variant="outline" onClick={addTier}>
              <Plus className="mr-1 h-4 w-4" /> Add tier
            </Button>
          </div>
        }
      >
        {!d.tiers.length && (
          <p className="text-sm text-muted-foreground">
            No tiers yet. Without tiers, every payment follows the standard approval flow.
          </p>
        )}
        {d.tiers.map((t, i) => (
          <div key={t.id ?? i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t.name || `Tier ${i + 1}`}</Badge>
                <span className="text-xs text-muted-foreground">
                  {money(t.min, cur)} – {t.max === null ? "no upper limit" : money(t.max, cur)}
                  {" · "}
                  {t.mode === "dual" ? "Dual approval" : "Single approval"}
                </span>
              </div>
              <Button size="icon" variant="ghost" aria-label={`Remove ${t.name}`} onClick={() => set({ tiers: d.tiers.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Tier name">
                <Input value={t.name} onChange={(e) => updateTier(i, { name: e.target.value })} />
              </Field>
              <Field label="From">
                <NumberInput min={0} value={t.min} onChange={(v) => updateTier(i, { min: v })} />
              </Field>
              <Field label="Up to" hint="Leave empty for no upper limit.">
                <NumberInput nullable min={0} placeholder="No limit" value={t.max} onChange={(v) => updateTier(i, { max: v })} />
              </Field>
              <Field label="Approval">
                <SimpleSelect
                  value={t.mode}
                  onChange={(v) => updateTier(i, { mode: v as any, approverIds: t.approverIds.slice(0, v === "dual" ? 2 : 1) })}
                  options={[
                    { value: "single", label: "Single approval" },
                    { value: "dual", label: "Dual approval" },
                  ]}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t.mode === "dual" ? "First approver" : "Approver"}>
                <PersonSelect
                  value={t.approverIds[0] ?? ""}
                  people={people}
                  placeholder="Select a person"
                  onChange={(id) => updateTier(i, { approverIds: [id, t.approverIds[1]].filter(Boolean) as string[] })}
                />
              </Field>
              {t.mode === "dual" && (
                <Field label="Second approver">
                  <PersonSelect
                    value={t.approverIds[1] ?? ""}
                    people={people.filter((p) => p.id !== t.approverIds[0])}
                    placeholder="Select a person"
                    onChange={(id) => updateTier(i, { approverIds: [t.approverIds[0], id].filter(Boolean) as string[] })}
                  />
                </Field>
              )}
              <Field label="Backup approver">
                <PersonSelect
                  value={t.backupId}
                  people={people}
                  placeholder="None (escalate)"
                  onChange={(id) => updateTier(i, { backupId: id })}
                />
              </Field>
            </div>
            {t.mode === "dual" && t.approverIds.length === 1 && (
              <p className="text-xs text-destructive">Dual approval needs two different approvers.</p>
            )}
            {t.approverIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Routed to {t.approverIds.map((id) => nameOf(id) ?? "Former employee").join(" and ")}
                {t.backupId ? `, backup ${nameOf(t.backupId) ?? "Former employee"}` : ""}.
              </p>
            )}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Only people with an active Lexora account can be approvers.
        </p>
      </SettingsCard>

      <SettingsCard
        icon={<Users className="h-4 w-4" />}
        title="Expense limits"
        description="Monthly expense claim limit per role. Leave a limit empty for unlimited."
        action={
          <div className="flex items-center gap-2">
            <SavedOnlyBadge />
            <Button size="sm" variant="outline" onClick={() => set({ expenseLimits: [...d.expenseLimits, { role: "", monthlyLimit: 0 }] })}>
              <Plus className="mr-1 h-4 w-4" /> Add limit
            </Button>
          </div>
        }
      >
        {!d.expenseLimits.length && (
          <p className="text-sm text-muted-foreground">No role limits set.</p>
        )}
        {d.expenseLimits.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="flex-1" placeholder="Role, e.g. Manager" value={l.role} onChange={(e) => set({ expenseLimits: d.expenseLimits.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} />
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{cur}</span>
              <NumberInput nullable className="w-36" min={0} placeholder="Unlimited" value={l.monthlyLimit} onChange={(v) => set({ expenseLimits: d.expenseLimits.map((x, j) => (j === i ? { ...x, monthlyLimit: v } : x)) })} />
            </div>
            <Button size="icon" variant="ghost" aria-label="Remove limit" onClick={() => set({ expenseLimits: d.expenseLimits.filter((_, j) => j !== i) })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </SettingsCard>

      <SettingsCard
        icon={<Lock className="h-4 w-4" />}
        title="Approval rules"
        description="Additional controls for financial approvals."
        action={<SavedOnlyBadge />}
      >
        <ToggleRow
          title="Self-approval restriction"
          description="Users cannot approve their own expense claims or invoices."
          checked={d.rules.selfApprovalRestriction}
          onChange={(v) => set({ rules: { ...d.rules, selfApprovalRestriction: v } })}
        />
        <ToggleRow
          title="Receipt required above threshold"
          description={`Require supporting documentation for expenses over ${money(d.rules.receiptThreshold, cur)}.`}
          checked={d.rules.receiptRequired}
          onChange={(v) => set({ rules: { ...d.rules, receiptRequired: v } })}
        />
        {d.rules.receiptRequired && (
          <Field label={`Receipt threshold (${cur})`}>
            <NumberInput className="sm:max-w-[200px]" min={0} value={d.rules.receiptThreshold} onChange={(v) => set({ rules: { ...d.rules, receiptThreshold: v } })} />
          </Field>
        )}
        <ToggleRow
          title="Budget check before approval"
          description="Warn the approver when a payment would exceed the budget."
          checked={d.rules.budgetCheck}
          onChange={(v) => set({ rules: { ...d.rules, budgetCheck: v } })}
        />
        <ToggleRow
          title="Escalate on timeout"
          description={`Escalate to the backup approver if there is no response in ${d.rules.escalationHours} hours.`}
          checked={d.rules.escalateOnTimeout}
          onChange={(v) => set({ rules: { ...d.rules, escalateOnTimeout: v } })}
        />
        {d.rules.escalateOnTimeout && (
          <Field label="Escalation timeout (hours)">
            <NumberInput className="sm:max-w-[200px]" min={1} max={720} value={d.rules.escalationHours} onChange={(v) => set({ rules: { ...d.rules, escalationHours: v } })} />
          </Field>
        )}
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
