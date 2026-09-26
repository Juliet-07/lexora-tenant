import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DocumentEditorDialog } from "@/components/DocumentEditorDialog";
import {
  Loader2,
  Send,
  FileText,
  Check,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Upload,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAvailableTemplates,
  editContractBody,
  sendContractForSignature,
  type AvailableTemplate,
  type SignableContract,
} from "@/lib/crm/tools-api";
import {
  createBoardMemberWithContract,
  type BoardMemberRole,
} from "@/lib/grc/governance-api";

// ─────────────────────────────────────────────────────────────
// Mirrors AddClientWizard.tsx's exact 4-step pattern (Details →
// Select Contract → Review & Send → Confirmation) for appointing a
// new board member: after the details form, a real appointment-
// letter contract is generated from a template, reviewed and sent
// for the director to sign electronically. Only once both parties
// have signed (the tenant countersigns from the contract detail
// view, same as any other ToolContract) are login credentials
// issued and the director directed to the board portal — see
// board-member.service.ts#onAppointmentContractCountersigned.
// ─────────────────────────────────────────────────────────────

interface NewDirectorWizardProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Director Details" },
  { n: 2, label: "Select Contract" },
  { n: 3, label: "Review & Send" },
  { n: 4, label: "Confirmation" },
];

const ROLES: BoardMemberRole[] = [
  "Chair",
  "Vice-Chair",
  "Executive Director",
  "Non-Executive Director",
  "Independent Director",
  "Alternate Director",
  "Company Secretary (Non-voting)",
];

export default function NewDirectorWizard({
  open,
  onClose,
  onDone,
}: NewDirectorWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "",
    role: "Non-Executive Director" as BoardMemberRole,
    email: "",
    appointedAt: new Date().toISOString().slice(0, 10),
    termEnds: new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10),
    bio: "",
    nationality: "",
    idNumber: "",
    taxResidency: "",
    otherDirectorships: "",
  });
  const [selectedTemplate, setSelectedTemplate] =
    useState<AvailableTemplate | null>(null);
  const [contractValue, setContractValue] = useState("");
  const [contractCurrency, setContractCurrency] = useState("USD");
  const [contract, setContract] = useState<SignableContract | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const reset = () => {
    setStep(1);
    setForm({
      name: "",
      role: "Non-Executive Director",
      email: "",
      appointedAt: new Date().toISOString().slice(0, 10),
      termEnds: new Date(Date.now() + 730 * 86400000)
        .toISOString()
        .slice(0, 10),
      bio: "",
      nationality: "",
      idNumber: "",
      taxResidency: "",
      otherDirectorships: "",
    });
    setSelectedTemplate(null);
    setContractValue("");
    setContractCurrency("USD");
    setContract(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  // ── Step 1 — Director Details (local only) ─────────────────────
  const handleContinue = () => {
    if (!form.name)
      return toast({ title: "Name required", variant: "destructive" });
    if (!form.email)
      return toast({ title: "Email required", variant: "destructive" });
    setStep(2);
  };

  // ── Step 2 — Select Contract ────────────────────────────────────
  // moduleKey "grc" — NOT "governance": the platform template
  // taxonomy (lexora-super-admin's TEMPLATE_MODULES) scopes templates
  // by module ("grc") with areas underneath it ("compliance"/"risk"),
  // and has no "governance" module or area at all. A template tagged
  // for Board Management is published under GRC (super admins have
  // been tagging it moduleKey "grc" areaKey "compliance" for lack of
  // a dedicated area), so this queries by module only — every
  // published GRC template, regardless of area — rather than a
  // moduleKey that can never match anything.
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["board-appointment-contract-templates"],
    queryFn: () => fetchAvailableTemplates("grc"),
    enabled: step === 2,
  });

  // Real, atomic call — creates the director's login and generates
  // their appointment-letter contract together. See
  // BoardMemberService#createWithContract for why this can never
  // leave a director created without a contract already generated.
  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) {
        throw new Error("Select a contract template first");
      }
      return createBoardMemberWithContract({
        name: form.name,
        role: form.role,
        email: form.email,
        appointedAt: form.appointedAt,
        termEnds: form.termEnds,
        bio: form.bio || undefined,
        nationality: form.nationality || undefined,
        idNumber: form.idNumber || undefined,
        taxResidency: form.taxResidency || undefined,
        otherDirectorships: form.otherDirectorships
          .split(/\n|,/)
          .map((s) => s.trim())
          .filter(Boolean),
        templateId: selectedTemplate._id,
        templateSource: "platform",
        contractTitle: `${selectedTemplate.title} — ${form.name}`,
        value: contractValue.trim() ? Number(contractValue) : undefined,
        currency: contractCurrency.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setContract(data.contract);
      setStep(3);
    },
    onError: (err: any) =>
      toast({
        title: "Could not add director",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  // ── Step 3 — Review & Send ──────────────────────────────────────
  const saveBodyMutation = useMutation({
    mutationFn: (html: string) =>
      editContractBody(contract!._id, { renderedBody: html }),
    onSuccess: (updated) => {
      setContract(updated);
      setEditorOpen(false);
      toast({ title: "Changes saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not save changes",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendContractForSignature(contract!._id),
    onSuccess: (data) => {
      setContract(data);
      setStep(4);
    },
    onError: (err: any) =>
      toast({
        title: "Could not send contract",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  // ── Step 4 — Confirmation → close ───────────────────────────────
  const finish = () => {
    queryClient.invalidateQueries({ queryKey: ["grc-board-members"] });
    onDone();
    handleClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && "Director Details"}
              {step === 2 && "Select Appointment Contract"}
              {step === 3 && "Review & Send"}
              {step === 4 && "Contract Sent"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex gap-1">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s.n < step
                      ? "bg-success"
                      : s.n === step
                        ? "bg-primary"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[11px] font-medium">
              {STEPS.map((s) => (
                <span
                  key={s.n}
                  className={
                    s.n < step
                      ? "text-success"
                      : s.n === step
                        ? "text-primary"
                        : "text-muted-foreground"
                  }
                >
                  {s.n}. {s.label.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* ── Step 1: Director Details ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="director@email.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({ ...form, role: v as BoardMemberRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Appointed</Label>
                  <Input
                    type="date"
                    value={form.appointedAt}
                    onChange={(e) =>
                      setForm({ ...form, appointedAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Term ends</Label>
                  <Input
                    type="date"
                    value={form.termEnds}
                    onChange={(e) =>
                      setForm({ ...form, termEnds: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Nationality</Label>
                  <Input
                    value={form.nationality}
                    onChange={(e) =>
                      setForm({ ...form, nationality: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>National ID / Passport</Label>
                  <Input
                    value={form.idNumber}
                    onChange={(e) =>
                      setForm({ ...form, idNumber: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tax residency</Label>
                <Input
                  value={form.taxResidency}
                  onChange={(e) =>
                    setForm({ ...form, taxResidency: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Other directorships (one per line)</Label>
                <Textarea
                  rows={2}
                  value={form.otherDirectorships}
                  onChange={(e) =>
                    setForm({ ...form, otherDirectorships: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Next, you'll pick an appointment contract for{" "}
                {form.name || "this director"} to sign before they receive their
                login credentials for the board portal.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-primary to-secondary"
                onClick={handleContinue}
              >
                Continue to Contract <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Select Contract ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose an appointment letter template to send to{" "}
                <strong>{form.name}</strong>.
              </p>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No published contract templates are tagged for GRC yet. Ask
                  your super admin to publish one under Contract Templates → GRC
                  before appointing a new director.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {templates.map((t) => {
                    const active = selectedTemplate?._id === t._id;
                    return (
                      <button
                        key={t._id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`text-left p-4 rounded-lg border-2 transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t.sourceType === "uploaded" ? (
                              <Upload className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">
                              {t.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {t.description || "No description provided."}
                            </p>
                            {active && (
                              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1.5">
                                <Check className="h-3 w-3" /> Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedTemplate && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contract value</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      className="h-8 text-sm"
                      value={contractCurrency}
                      onChange={(e) => setContractCurrency(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!selectedTemplate || createMutation.isPending}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Preparing…
                    </>
                  ) : (
                    <>
                      Continue to Review <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Send ── */}
          {step === 3 && contract && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the appointment letter before sending it to{" "}
                <strong>{form.name}</strong>.
              </p>
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {contract.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{contract.ref}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setEditorOpen(true)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
                <div
                  className="p-4 max-h-64 overflow-y-auto text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contract.renderedBody }}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Signing order
                </p>
                <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                      1
                    </span>
                    {form.name} (Director)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Signs first
                  </span>
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                      2
                    </span>
                    Your firm
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Countersigns
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-success/5 border border-success/20 p-3 text-xs text-success flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  The director receives this appointment letter by email to sign
                  electronically. Once both parties have signed, their board
                  portal login and onboarding link are sent automatically — no
                  manual step required.
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || editorOpen}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Send for Signing
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Confirmation ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center py-2 space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <h3 className="font-semibold">
                  Appointment letter sent to {form.name}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  The contract has been sent for signing. Once countersigned,
                  their board portal credentials and onboarding link will be
                  sent automatically.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Send className="h-4 w-4 text-primary" /> Appointment letter
                    sent for signing
                  </span>
                  <Badge className="bg-warning/10 text-warning border-warning/20">
                    Awaiting
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Lock className="h-4 w-4 text-muted-foreground" /> Board
                    portal access
                  </span>
                  <Badge variant="secondary">Locked</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Lock className="h-4 w-4 text-muted-foreground" /> Director
                    onboarding
                  </span>
                  <Badge variant="secondary">Locked</Badge>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-primary to-secondary"
                onClick={finish}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {contract && (
        <DocumentEditorDialog
          open={editorOpen}
          title={`Edit — ${contract.title}`}
          subtitle={`For ${form.name}`}
          value={contract.renderedBody}
          onClose={() => setEditorOpen(false)}
          onSave={(html) => saveBodyMutation.mutate(html)}
          saving={saveBodyMutation.isPending}
        />
      )}
    </>
  );
}
