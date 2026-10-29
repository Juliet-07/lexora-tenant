import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addShareholder,
  createShareTransaction,
  uploadShareholderDoc,
  type CapTable,
} from "@/lib/grc/ownership-api";
import {
  Field,
  errMsg,
  fmtNum,
  invalidateOwnership,
  rolesOf,
  todayInput,
  useOrgPeople,
} from "../shared";

// ── helpers ─────────────────────────────────────────────────────

/** Optional file picked in a dialog; filed in the private repository. */
function DocPicker({
  file,
  onChange,
  hint,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  hint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Field label="Supporting document (optional)" hint={hint}>
      <Input
        ref={ref}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <button
          type="button"
          className="text-[11px] text-muted-foreground underline"
          onClick={() => {
            onChange(null);
            if (ref.current) ref.current.value = "";
          }}
        >
          Remove {file.name}
        </button>
      )}
    </Field>
  );
}

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

function useDialogReset(open: boolean, reset: () => void) {
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

// ── Add shareholder ─────────────────────────────────────────────
export function AddShareholderDialog({
  open,
  onOpenChange,
  cap,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cap: CapTable;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const people = useOrgPeople();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [nodeId, setNodeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [also, setAlso] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayInput());
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useDialogReset(open, () => {
    setMode("new");
    setNodeId("");
    setName("");
    setEmail("");
    setTitle("");
    setAlso([]);
    setClassId(cap.classes[0]?.id ?? "");
    setShares("");
    setPrice(cap.pricePerShare ? String(cap.pricePerShare) : "");
    setDate(todayInput());
    setRef("");
    setFile(null);
  });

  const candidates = people.filter(
    (p) => !cap.holders.some((h) => h.nodeId === p.id),
  );

  const mut = useMutation({
    mutationFn: async () => {
      const res = await addShareholder({
        ...(mode === "existing"
          ? { nodeId }
          : {
              name: name.trim(),
              email: email.trim() || undefined,
              subtitle: title.trim() || undefined,
              alsoTypes: also,
            }),
        shareClassId: num(shares) > 0 ? classId : undefined,
        shares: num(shares) > 0 ? num(shares) : undefined,
        pricePerShare: num(price) || undefined,
        date,
        reference: ref.trim() || undefined,
      });
      if (file) {
        await uploadShareholderDoc({
          category: "Share Certificate",
          title: `Share certificate — ${mode === "existing" ? (people.find((p) => p.id === nodeId)?.name ?? "") : name.trim()}`,
          shareholderNodeId: res.node._id,
          access: "Private",
          date,
          refNo: ref.trim() || undefined,
          file,
        });
      }
      return res;
    },
    onSuccess: () => {
      invalidateOwnership(qc);
      qc.invalidateQueries({ queryKey: ["cap-docs"] });
      toast({ title: "Shareholder added" });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Couldn't add the shareholder",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  const issuing = num(shares) > 0;
  const submit = () => {
    if (mode === "existing" && !nodeId)
      return toast({
        title: "Choose who is becoming a shareholder",
        variant: "destructive",
      });
    if (mode === "new" && !name.trim())
      return toast({
        title: "Enter the shareholder's name",
        variant: "destructive",
      });
    if (issuing && !classId)
      return toast({ title: "Choose a share class", variant: "destructive" });
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add shareholder</DialogTitle>
          <DialogDescription>
            A person can hold more than one role — a board member can also be a
            shareholder. Pick someone already in your structure, or add a new
            person.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["new", "New person"],
                ["existing", "Already in my structure"],
              ] as const
            ).map(([m, label]) => (
              <Button
                key={m}
                type="button"
                variant={mode === m ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(m)}
              >
                {label}
              </Button>
            ))}
          </div>

          {mode === "existing" ? (
            <Field
              label="Person"
              hint="They keep every role they already have and gain Shareholder."
            >
              <Select value={nodeId} onValueChange={setNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground">
                      Everyone in your structure is already a shareholder.
                    </div>
                  )}
                  {candidates.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {rolesOf(p).join(" / ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Role / title (optional)">
                <Input
                  placeholder="e.g. Managing Director"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <div className="space-y-1.5">
                <Label>Also holds the role of</Label>
                <div className="flex gap-4">
                  {["Board", "Department", "Role"].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={also.includes(t)}
                        onCheckedChange={(v) =>
                          setAlso((a) =>
                            v ? [...a, t] : a.filter((x) => x !== t),
                          )
                        }
                      />
                      {t === "Board" ? "Board member" : t}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-medium">
              First issuance{" "}
              <span className="font-normal text-muted-foreground">
                (optional — leave shares empty to add them with no holding yet)
              </span>
            </p>
            {cap.classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Create a share class first (Share Classes tab) to issue shares.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Share class">
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cap.classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({fmtNum(c.authorised - c.issued)} left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Number of shares">
                    <Input
                      type="number"
                      min={0}
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                    />
                  </Field>
                </div>
                {issuing && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={`Price per share (${baseCurrency})`}>
                        <Input
                          type="number"
                          min={0}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </Field>
                      <Field label="Date">
                        <Input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </Field>
                    </div>
                    <Field label="Board resolution reference">
                      <Input
                        placeholder="e.g. BR-2026-012"
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                      />
                    </Field>
                    <DocPicker
                      file={file}
                      onChange={setFile}
                      hint="Filed privately under Shareholders Documents as a share certificate."
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add shareholder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Issue shares ────────────────────────────────────────────────
export function IssueSharesDialog({
  open,
  onOpenChange,
  cap,
  baseCurrency,
  presetNodeId,
  presetClassId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cap: CapTable;
  baseCurrency: string;
  presetNodeId?: string;
  presetClassId?: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [nodeId, setNodeId] = useState("");
  const [classId, setClassId] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayInput());
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useDialogReset(open, () => {
    setNodeId(presetNodeId ?? cap.holders[0]?.nodeId ?? "");
    setClassId(presetClassId ?? cap.classes[0]?.id ?? "");
    setShares("");
    setPrice(cap.pricePerShare ? String(cap.pricePerShare) : "");
    setDate(todayInput());
    setRef("");
    setFile(null);
  });

  const cls = cap.classes.find((c) => c.id === classId);
  const left = cls ? cls.authorised - cls.issued : 0;

  const mut = useMutation({
    mutationFn: async () => {
      await createShareTransaction({
        type: "Issuance",
        date,
        toNodeId: nodeId,
        shareClassId: classId,
        shares: num(shares),
        pricePerShare: num(price),
        reference: ref.trim() || undefined,
      });
      if (file) {
        await uploadShareholderDoc({
          category: "Share Certificate",
          title: `Share certificate — ${cap.holders.find((h) => h.nodeId === nodeId)?.name ?? ""}`,
          shareholderNodeId: nodeId,
          access: "Private",
          date,
          refNo: ref.trim() || undefined,
          file,
        });
      }
    },
    onSuccess: () => {
      invalidateOwnership(qc);
      qc.invalidateQueries({ queryKey: ["cap-docs"] });
      toast({ title: "Shares issued" });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Couldn't issue those shares",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  const submit = () => {
    if (!nodeId || !classId || !(num(shares) > 0))
      return toast({
        title: "Choose a shareholder, a class and a number of shares",
        variant: "destructive",
      });
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue new shares</DialogTitle>
          <DialogDescription>
            New shares come from the company and can't take issued shares past
            the class's authorised amount.
          </DialogDescription>
        </DialogHeader>
        {cap.holders.length === 0 || cap.classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {cap.classes.length === 0
              ? "Create a share class first."
              : "Add a shareholder first."}
          </p>
        ) : (
          <div className="space-y-4">
            <Field label="Shareholder">
              <Select value={nodeId} onValueChange={setNodeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cap.holders.map((h) => (
                    <SelectItem key={h.nodeId} value={h.nodeId}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Share class"
                hint={
                  cls ? `${fmtNum(left)} authorised shares left` : undefined
                }
              >
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cap.classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Number of shares">
                <Input
                  type="number"
                  min={1}
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Price per share (${baseCurrency})`}>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Board resolution reference">
              <Input
                placeholder="e.g. BR-2026-012"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </Field>
            <DocPicker
              file={file}
              onChange={setFile}
              hint="Filed privately under Shareholders Documents as a share certificate."
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              mut.isPending ||
              cap.holders.length === 0 ||
              cap.classes.length === 0
            }
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue shares
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transfer shares ─────────────────────────────────────────────
const NEW_HOLDER = "__new__";

export function TransferDialog({
  open,
  onOpenChange,
  cap,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cap: CapTable;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const sellers = cap.holders.filter((h) => h.totalShares > 0);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [newName, setNewName] = useState("");
  const [classId, setClassId] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useDialogReset(open, () => {
    const first = sellers[0];
    setFromId(first?.nodeId ?? "");
    setClassId(first?.holdings[0]?.classId ?? "");
    setToId("");
    setNewName("");
    setShares("");
    setPrice(cap.pricePerShare ? String(cap.pricePerShare) : "");
    setDate(todayInput());
    setReason("");
    setFile(null);
  });

  const from = cap.holders.find((h) => h.nodeId === fromId);
  const held = from?.holdings.find((h) => h.classId === classId)?.shares ?? 0;

  const mut = useMutation({
    mutationFn: async () => {
      let toNodeId = toId;
      let toName = cap.holders.find((h) => h.nodeId === toId)?.name ?? "";
      if (toId === NEW_HOLDER) {
        const created = await addShareholder({ name: newName.trim() });
        toNodeId = created.node._id;
        toName = newName.trim();
      }
      await createShareTransaction({
        type: "Transfer",
        date,
        fromNodeId: fromId,
        toNodeId,
        shareClassId: classId,
        shares: num(shares),
        pricePerShare: num(price),
        note: reason.trim() || undefined,
      });
      if (file) {
        await uploadShareholderDoc({
          category: "Transfer Form",
          title: `Share transfer — ${from?.name ?? ""} to ${toName}`,
          shareholderNodeId: toNodeId,
          access: "Restricted",
          date,
          file,
        });
      }
    },
    onSuccess: () => {
      invalidateOwnership(qc);
      qc.invalidateQueries({ queryKey: ["cap-docs"] });
      toast({ title: "Shares transferred" });
      onOpenChange(false);
    },
    onError: (e) => {
      invalidateOwnership(qc);
      toast({
        title: "Couldn't transfer those shares",
        description: errMsg(e),
        variant: "destructive",
      });
    },
  });

  const submit = () => {
    if (!fromId || !classId || !toId || !(num(shares) > 0))
      return toast({
        title: "Choose who sells, who buys, the class and the number of shares",
        variant: "destructive",
      });
    if (toId === NEW_HOLDER && !newName.trim())
      return toast({
        title: "Enter the new shareholder's name",
        variant: "destructive",
      });
    if (num(shares) > held)
      return toast({
        title: `${from?.name} only holds ${fmtNum(held)} of that class`,
        variant: "destructive",
      });
    mut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer shares</DialogTitle>
          <DialogDescription>
            Moves existing shares from one holder to another — the total in
            issue doesn't change.
          </DialogDescription>
        </DialogHeader>
        {sellers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody holds shares yet — issue some first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Select
                  value={fromId}
                  onValueChange={(v) => {
                    setFromId(v);
                    setClassId(
                      cap.holders.find((h) => h.nodeId === v)?.holdings[0]
                        ?.classId ?? "",
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((h) => (
                      <SelectItem key={h.nodeId} value={h.nodeId}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="To">
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {cap.holders
                      .filter((h) => h.nodeId !== fromId)
                      .map((h) => (
                        <SelectItem key={h.nodeId} value={h.nodeId}>
                          {h.name}
                        </SelectItem>
                      ))}
                    <SelectItem value={NEW_HOLDER}>New shareholder…</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {toId === NEW_HOLDER && (
              <Field label="New shareholder's name">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Share class">
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(from?.holdings ?? []).map((h) => (
                      <SelectItem key={h.classId} value={h.classId}>
                        {h.className} ({fmtNum(h.shares)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Number of shares" hint={`Up to ${fmtNum(held)}`}>
                <Input
                  type="number"
                  min={1}
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Price per share (${baseCurrency})`}>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Reason">
              <Input
                placeholder="e.g. Private sale, restructuring"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <DocPicker
              file={file}
              onChange={setFile}
              hint="Filed privately under Shareholders Documents as a transfer form."
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={mut.isPending || sellers.length === 0}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transfer shares
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
