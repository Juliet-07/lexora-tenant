import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  Coins,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  fetchLedgerAccounts,
  saveBaseCurrency,
  type GeneralSettings,
} from "@/lib/crm/finance-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FINANCE_CURRENCIES } from "@/hooks/use-finance-currency";
import {
  BASE_CURRENCY_KEY,
  applyBaseCurrencyChange,
} from "@/hooks/use-base-currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Field,
  NumberInput,
  SavedOnlyBadge,
  SectionFooter,
  SettingsCard,
  SimpleSelect,
  ToggleRow,
  useFinanceSettings,
  SETTINGS_QUERY_KEY,
  SETTINGS_LOG_KEY,
  useSectionForm,
} from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const NONE = "__none__";

// The account's base currency. It is changed here and nowhere else; the
// change is saved on the account straight away (not with the section's Save
// button), and takes effect across the whole platform at once.
function BaseCurrencyField({ current }: { current: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pick, setPick] = useState(current);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setPick(current), [current]);

  const options = Array.from(new Set([current, ...FINANCE_CURRENCIES]));
  const mut = useMutation({
    mutationFn: () => saveBaseCurrency(pick),
    onSuccess: (payload) => {
      const next = payload.profile.baseCurrency;
      qc.setQueryData(SETTINGS_QUERY_KEY, payload);
      qc.setQueryData(BASE_CURRENCY_KEY, { baseCurrency: next });
      // Every screen now starts from, and shows money in, the new currency.
      applyBaseCurrencyChange(qc, next);
      qc.invalidateQueries({ queryKey: SETTINGS_LOG_KEY });
      setConfirm(false);
      toast({
        title: `Base currency is now ${next}`,
        description:
          "Your ledger, budgets, reports and new records now use it throughout the platform.",
      });
    },
    onError: (err: any) => {
      setConfirm(false);
      setPick(current);
      toast({
        title: "Could not change the currency",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Field
        label="Base currency"
        hint="The currency your books are kept and reported in, and the one every new record starts in."
      >
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                  {c === current ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={pick === current || mut.isPending}
            onClick={() => setConfirm(true)}
          >
            Change
          </Button>
        </div>
      </Field>
      <AlertDialog
        open={confirm}
        onOpenChange={(o) => !mut.isPending && setConfirm(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change base currency from {current} to {pick}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Your whole account will use {pick}: every new record, report and
                balance starts and shows in it.
              </span>
              <span className="block">
                Amounts already in your ledger and budgets are restated into{" "}
                {pick} at today's exchange rate; each ledger line keeps the
                original amount and currency it was recorded in. The change is
                recorded in the Change Log.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mut.isPending}
              onClick={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
            >
              {mut.isPending ? "Changing…" : `Change to ${pick}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AccountPicker({
  value,
  onChange,
  accounts,
  types,
}: {
  value: string;
  onChange: (code: string) => void;
  accounts: { code: string; name: string; type: string }[];
  types: string[];
}) {
  const pool = accounts.filter((a) => types.includes(a.type));
  // Keep a previously chosen code visible even if it is no longer listed.
  const known = pool.some((a) => a.code === value);
  return (
    <Select
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Not set" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Not set</SelectItem>
        {value && !known && <SelectItem value={value}>{value}</SelectItem>}
        {pool.map((a) => (
          <SelectItem key={a.code} value={a.code}>
            {a.code} — {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function GeneralTab() {
  const { data } = useFinanceSettings();
  const form = useSectionForm("general", data?.settings.general);
  const { data: accounts = [] } = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: fetchLedgerAccounts,
  });
  const d = form.draft;
  if (!d || !data)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<GeneralSettings>) => form.patch(p);
  const fyEnd = MONTHS[(d.fiscalYearStartMonth + 10) % 12];

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Coins className="h-4 w-4" />}
        title="Currency & locale"
        description="How amounts and dates are written on every finance document."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <BaseCurrencyField current={data.profile.baseCurrency} />
          <Field label="Number format">
            <SimpleSelect
              value={d.numberFormat}
              onChange={(v) => set({ numberFormat: v as any })}
              options={[
                {
                  value: "comma-dot",
                  label: "1,234,567.89 (comma thousands, dot decimal)",
                },
                {
                  value: "dot-comma",
                  label: "1.234.567,89 (dot thousands, comma decimal)",
                },
                {
                  value: "space-dot",
                  label: "1 234 567.89 (space thousands, dot decimal)",
                },
              ]}
            />
          </Field>
          <Field label="Date format">
            <SimpleSelect
              value={d.dateFormat}
              onChange={(v) => set({ dateFormat: v as any })}
              options={[
                { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                { value: "DD MMM YYYY", label: "DD MMM YYYY (14 Nov 2026)" },
                { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
              ]}
            />
          </Field>
        </div>
        <ToggleRow
          title="Multi-currency mode"
          description="Allow transactions in foreign currencies with automatic conversion."
          checked={d.multiCurrency}
          onChange={(v) => set({ multiCurrency: v })}
        />
      </SettingsCard>

      <SettingsCard
        icon={<CalendarDays className="h-4 w-4" />}
        title="Fiscal year & periods"
        description="Define your financial year and reporting periods."
        action={<SavedOnlyBadge />}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fiscal year start">
            <SimpleSelect
              value={String(d.fiscalYearStartMonth)}
              onChange={(v) => set({ fiscalYearStartMonth: Number(v) })}
              options={MONTHS.map((m, i) => ({
                value: String(i + 1),
                label: m,
              }))}
            />
          </Field>
          <Field label="Fiscal year end">
            <Input value={fyEnd} disabled />
          </Field>
          <Field label="Reporting periods">
            <SimpleSelect
              value={d.reportingPeriods}
              onChange={(v) => set({ reportingPeriods: v as any })}
              options={[
                { value: "monthly", label: "Monthly (12 periods)" },
                { value: "quarterly", label: "Quarterly (4 periods)" },
                { value: "bi-annually", label: "Bi-annually (2 periods)" },
              ]}
            />
          </Field>
        </div>
        <ToggleRow
          title="Lock closed periods"
          description="Prevent journal entries in closed accounting periods."
          checked={d.lockClosedPeriods}
          onChange={(v) => set({ lockClosedPeriods: v })}
        />
        <ToggleRow
          title="Auto-close periods"
          description="Automatically close the previous period when a new one begins."
          checked={d.autoClosePeriods}
          onChange={(v) => set({ autoClosePeriods: v })}
        />
      </SettingsCard>

      <SettingsCard
        icon={<BookOpen className="h-4 w-4" />}
        title="Chart of accounts"
        description="Default accounts used for auto-posting across the finance module."
        action={<SavedOnlyBadge />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default revenue account">
            <AccountPicker
              value={d.defaultAccounts.revenue}
              accounts={accounts}
              types={["Revenue", "Income"]}
              onChange={(v) =>
                set({ defaultAccounts: { ...d.defaultAccounts, revenue: v } })
              }
            />
          </Field>
          <Field label="Accounts receivable">
            <AccountPicker
              value={d.defaultAccounts.receivable}
              accounts={accounts}
              types={["Asset"]}
              onChange={(v) =>
                set({
                  defaultAccounts: { ...d.defaultAccounts, receivable: v },
                })
              }
            />
          </Field>
          <Field label="Accounts payable">
            <AccountPicker
              value={d.defaultAccounts.payable}
              accounts={accounts}
              types={["Liability"]}
              onChange={(v) =>
                set({ defaultAccounts: { ...d.defaultAccounts, payable: v } })
              }
            />
          </Field>
          <Field label="Bank / cash account">
            <AccountPicker
              value={d.defaultAccounts.bank}
              accounts={accounts}
              types={["Asset"]}
              onChange={(v) =>
                set({ defaultAccounts: { ...d.defaultAccounts, bank: v } })
              }
            />
          </Field>
          <Field label="Retained earnings">
            <AccountPicker
              value={d.defaultAccounts.retainedEarnings}
              accounts={accounts}
              types={["Equity"]}
              onChange={(v) =>
                set({
                  defaultAccounts: {
                    ...d.defaultAccounts,
                    retainedEarnings: v,
                  },
                })
              }
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Coins className="h-4 w-4" />}
        title="Exchange rates"
        description="How foreign currency transactions are converted."
        action={<SavedOnlyBadge />}
      >
        <Field label="Exchange rate source">
          <SimpleSelect
            value={d.exchangeRateSource}
            onChange={(v) => set({ exchangeRateSource: v as any })}
            options={[
              { value: "central-bank", label: "Central bank official rate" },
              { value: "manual", label: "Manual entry" },
              { value: "commercial", label: "Commercial bank mid-rate" },
            ]}
          />
        </Field>
        <ToggleRow
          title="Auto-sync exchange rates"
          description="Refresh rates daily from the chosen source."
          checked={d.autoSyncRates}
          onChange={(v) => set({ autoSyncRates: v })}
        />
      </SettingsCard>

      <SettingsCard
        icon={<Landmark className="h-4 w-4" />}
        title="Asset register defaults"
        description="Defaults applied when you add a fixed asset."
        action={<SavedOnlyBadge />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Depreciation method">
            <SimpleSelect
              value={d.asset.depreciationMethod}
              onChange={(v) =>
                set({ asset: { ...d.asset, depreciationMethod: v as any } })
              }
              options={[
                { value: "straight-line", label: "Straight-line" },
                { value: "reducing-balance", label: "Reducing balance" },
                { value: "units-of-production", label: "Units of production" },
              ]}
            />
          </Field>
          <Field
            label={`Capitalisation threshold (${data.profile.baseCurrency})`}
            hint="Purchases below this are expensed rather than capitalised."
          >
            <NumberInput
              min={0}
              value={d.asset.capitalisationThreshold}
              onChange={(v) =>
                set({ asset: { ...d.asset, capitalisationThreshold: v } })
              }
            />
          </Field>
        </div>
        <ToggleRow
          title="Track insurance expiry"
          description="Ask for an insurance expiry date on each asset."
          checked={d.asset.trackInsuranceExpiry}
          onChange={(v) =>
            set({ asset: { ...d.asset, trackInsuranceExpiry: v } })
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Trust accounting defaults"
        description="Controls for client money held in trust."
        action={<SavedOnlyBadge />}
      >
        <Field label="Interest treatment">
          <SimpleSelect
            value={d.trust.interestTreatment}
            onChange={(v) =>
              set({ trust: { ...d.trust, interestTreatment: v as any } })
            }
            options={[
              { value: "firm-retained", label: "Firm retained" },
              { value: "credited-to-client", label: "Credited to client" },
              { value: "split", label: "Split between firm and client" },
            ]}
          />
        </Field>
        <ToggleRow
          title="Require approval for drawdowns"
          description="A drawdown from a trust account needs authorisation before it is paid."
          checked={d.trust.requireDrawdownApproval}
          onChange={(v) =>
            set({ trust: { ...d.trust, requireDrawdownApproval: v } })
          }
        />
        <ToggleRow
          title="Auto-reconcile trust accounts"
          description="Match trust movements against the bank statement automatically."
          checked={d.trust.autoReconcile}
          onChange={(v) => set({ trust: { ...d.trust, autoReconcile: v } })}
        />
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
