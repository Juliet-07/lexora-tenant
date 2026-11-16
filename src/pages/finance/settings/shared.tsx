import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  fetchFinanceSettings,
  resetFinanceSettingsSection,
  saveFinanceSettingsSection,
  type FinanceSettingsMap,
  type FinanceSettingsPayload,
  type FinanceSettingsSection,
} from "@/lib/crm/finance-api";

export const SETTINGS_QUERY_KEY = ["finance-settings"];
export const SETTINGS_LOG_KEY = ["finance-settings-log"];

export const useFinanceSettings = (enabled = true) =>
  useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchFinanceSettings,
    enabled,
  });

const SECTION_LABEL: Record<FinanceSettingsSection, string> = {
  general: "General",
  tax: "Tax",
  invoicing: "Invoicing",
  approvals: "Approvals",
  banking: "Banking",
  branding: "Document branding",
};

/**
 * Holds the editable copy of one settings section. The copy re-seeds
 * whenever the saved version changes (after a save, a reset, or a change
 * made elsewhere), and `dirty` is true only while the two actually differ.
 */
export function useSectionForm<S extends FinanceSettingsSection>(
  section: S,
  saved: FinanceSettingsMap[S] | undefined,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FinanceSettingsMap[S] | null>(null);
  const savedKey = useMemo(() => JSON.stringify(saved ?? null), [saved]);

  useEffect(() => {
    if (saved) setDraft(JSON.parse(JSON.stringify(saved)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const dirty = !!draft && JSON.stringify(draft) !== savedKey;

  const onDone = (title: string) => (payload: FinanceSettingsPayload) => {
    queryClient.setQueryData(SETTINGS_QUERY_KEY, payload);
    queryClient.invalidateQueries({ queryKey: SETTINGS_LOG_KEY });
    toast({ title });
  };
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message ?? "Please try again.",
      variant: "destructive",
    });

  const saveMut = useMutation({
    mutationFn: () => saveFinanceSettingsSection(section, draft!),
    onSuccess: onDone(`${SECTION_LABEL[section]} settings saved`),
    onError: onErr("Could not save"),
  });
  const resetMut = useMutation({
    mutationFn: () => resetFinanceSettingsSection(section),
    onSuccess: onDone(`${SECTION_LABEL[section]} settings reset to defaults`),
    onError: onErr("Could not reset"),
  });

  const patch = (p: Partial<FinanceSettingsMap[S]>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  return {
    draft,
    setDraft,
    patch,
    dirty,
    save: () => saveMut.mutate(),
    saving: saveMut.isPending,
    reset: () => resetMut.mutate(),
    resetting: resetMut.isPending,
    discard: () => saved && setDraft(JSON.parse(JSON.stringify(saved))),
  };
}

export function SettingsCard({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/** Number box that lets the field be emptied without snapping back to 0. */
export function NumberInput({
  value,
  onChange,
  nullable,
  min,
  max,
  step,
  placeholder,
  className,
}: {
  value: number | null | undefined;
  onChange: (v: any) => void;
  nullable?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      className={className}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(nullable ? null : 0);
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

export function SimpleSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Sticky save bar: only offers Save/Discard once something changed. */
export function SectionFooter({
  dirty,
  saving,
  resetting,
  onSave,
  onDiscard,
  onReset,
  resetNote,
}: {
  dirty: boolean;
  saving: boolean;
  resetting: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  resetNote?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(true)}
          disabled={resetting || saving}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
        </Button>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={onDiscard}
          >
            Discard
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={onSave}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset these settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Every setting on this tab goes back to its default.{" "}
              {resetNote ?? ""} The change is recorded in the change log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirm(false);
                onReset();
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const money = (n: number | null | undefined, currency = "") =>
  n === null || n === undefined
    ? "Unlimited"
    : `${currency ? currency + " " : ""}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Marks a card whose settings are stored but not yet applied by the system. */
export function SavedOnlyBadge() {
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-[10px] text-muted-foreground"
      title="These choices are saved and logged. Automatic enforcement is not switched on yet."
    >
      Saved · not enforced yet
    </Badge>
  );
}
