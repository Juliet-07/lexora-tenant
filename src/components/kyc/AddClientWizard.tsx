import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import {
  fetchAvailableTemplates,
  fetchContract,
  sendContractForSignature,
  type AvailableTemplate,
  type SignableContract,
} from "@/lib/crm/tools-api";

interface AddClientWizardProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  // Real resume path — set when returning from the CRM contract
  // editor mid-flow. When present, the wizard skips client creation
  // and template selection entirely and re-fetches the real,
  // already-generated contract, landing straight on Review & Send.
  resumeContractId?: string | null;
}

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Client Details" },
  { n: 2, label: "Select Contract" },
  { n: 3, label: "Review & Send" },
  { n: 4, label: "Confirmation" },
];

interface CreateClientWithContractResponse {
  success: boolean;
  message: string;
  data: { _id: string; email: string };
  contract: SignableContract;
}

const createClientWithContract = async (payload: {
  fullName: string;
  email: string;
  phoneNumber: string;
  clientType: string;
  templateId: string;
  templateSource: "platform" | "tenant";
  contractTitle: string;
  contractType?: string;
}): Promise<CreateClientWithContractResponse> => {
  const res = await api.post("/tenant/create-client", payload);
  return res.data;
};

export default function AddClientWizard({
  open,
  onClose,
  onDone,
  resumeContractId,
}: AddClientWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    classification: "individual" as "individual" | "corporate",
    fullName: "",
    email: "",
    phone: "",
  });
  const [createdClient, setCreatedClient] = useState<{
    _id: string;
    email: string;
  } | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<AvailableTemplate | null>(null);
  const [contract, setContract] = useState<SignableContract | null>(null);
  const [resuming, setResuming] = useState(false);

  // Real resume — re-fetches the actual contract (not cached local
  // state, since the person may have just edited it in the CRM
  // editor) and reconstructs just enough of the wizard's state
  // (client name, for display) to land correctly on Review & Send.
  useEffect(() => {
    if (!open || !resumeContractId) return;
    setResuming(true);
    fetchContract(resumeContractId)
      .then((c) => {
        setContract(c);
        setForm((f) => ({ ...f, fullName: c.counterparty }));
        setStep(3);
      })
      .catch(() =>
        toast({
          title: "Could not load contract",
          description: "The contract may have been removed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setResuming(false));
    // Only re-run when the dialog opens with a resume id — not on
    // every render, since setForm/setContract above would otherwise
    // create a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumeContractId]);

  const reset = () => {
    setStep(1);
    setForm({
      classification: "individual",
      fullName: "",
      email: "",
      phone: "",
    });
    setCreatedClient(null);
    setSelectedTemplate(null);
    setContract(null);
  };

  const handleClose = () => {
    onClose();
    // Small delay so the dialog's own close animation doesn't visibly
    // flash back to step 1 before it's fully gone.
    setTimeout(reset, 200);
  };

  // ── Step 1 — Client Details (local only — no backend call) ────
  const handleCreateClient = () => {
    if (!form.email || !form.fullName) {
      toast({
        title: "Missing fields",
        description: "Full name and email are required.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  // ── Step 2 — Select Contract ──────────────────────────────────
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["kyc-contract-templates"],
    queryFn: () => fetchAvailableTemplates("kyc_aml"),
    enabled: step === 2,
  });

  // Real, atomic call — creates the client and generates the real
  // contract together in one backend transaction. Deliberately not
  // split into two steps: doing so previously let a tenant create a
  // real client on Step 1, then abandon the wizard before ever
  // generating or sending a contract, leaving a permanently
  // unreachable "ghost" client with no email ever sent. Now a client
  // is never created without a contract already generated for them.
  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) {
        throw new Error("Select a contract template first");
      }
      return createClientWithContract({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phone,
        clientType: form.classification,
        templateId: selectedTemplate._id,
        templateSource: "platform",
        contractTitle: `${selectedTemplate.title} — ${form.fullName}`,
        contractType: selectedTemplate.type ?? "MSA",
      });
    },
    onSuccess: (data) => {
      setCreatedClient({ _id: data.data._id, email: data.data.email });
      setContract(data.contract);
      setStep(3);
    },
    onError: (err: any) =>
      toast({
        title: "Could not create client",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  // ── Step 3 — Review & Send ────────────────────────────────────
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

  // ── Step 4 — Confirmation → close ─────────────────────────────
  const finish = () => {
    queryClient.invalidateQueries({ queryKey: ["tenant-pending-approvals"] });
    queryClient.invalidateQueries({
      queryKey: ["tenant-onboarding-in-progress"],
    });
    onDone();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Client Details"}
            {step === 2 && "Select Contract Template"}
            {step === 3 && "Review & Send Contract"}
            {step === 4 && "Contract Sent"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
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

        {resuming ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading contract…</p>
          </div>
        ) : (
          <>
            {/* ── Step 1: Client Details ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={form.classification}
                    onValueChange={(v: "individual" | "corporate") =>
                      setForm({ ...form, classification: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">
                        Business / Corporate
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {form.classification === "individual"
                      ? "Full Name"
                      : "Business Name"}
                  </Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder={
                      form.classification === "individual"
                        ? "Jane Doe"
                        : "Acme Holdings Ltd"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="client@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Next, you'll pick a contract for{" "}
                  {form.fullName || "the client"} to sign before they receive
                  their login credentials.
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={handleCreateClient}
                >
                  Continue to Contract <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* ── Step 2: Select Contract ── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose a contract template to send to{" "}
                  <strong>{form.fullName}</strong> before onboarding begins.
                </p>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No published contract templates are tagged for KYC / AML
                    yet. Ask your super admin to publish one under Contract
                    Templates → KYC / AML.
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
                        Continue to Review{" "}
                        <ArrowRight className="h-4 w-4 ml-2" />
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
                  Review the contract before sending it to{" "}
                  <strong>{form.fullName}</strong>.
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
                        onClick={() =>
                          navigate(
                            `/crm/contracts/${contract._id}?returnTo=onboarding&resumeClient=${
                              createdClient?._id ?? ""
                            }`,
                          )
                        }
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit in CRM Editor
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
                      {form.fullName} (Client)
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
                    The client receives this contract by email to sign
                    electronically. Once both parties have signed, their
                    onboarding link and login credentials are sent automatically
                    — no manual step required.
                  </span>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="bg-gradient-to-r from-primary to-secondary"
                  >
                    {sendMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" /> Send Contract for
                        Signing
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
                    Contract sent to {form.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The contract has been sent to the client for signing. Once
                    countersigned, their onboarding link will be sent
                    automatically.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="flex items-center gap-2.5 text-sm">
                      <Send className="h-4 w-4 text-primary" /> Contract sent
                      for signing
                    </span>
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                      Awaiting
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                    <span className="flex items-center gap-2.5 text-sm">
                      <Lock className="h-4 w-4 text-muted-foreground" />{" "}
                      Onboarding link
                    </span>
                    <Badge variant="secondary">Locked</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                    <span className="flex items-center gap-2.5 text-sm">
                      <Lock className="h-4 w-4 text-muted-foreground" /> CDD /
                      KYC review
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
