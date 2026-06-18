import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  FileUp,
  CheckCircle2,
  LogOut,
  Loader2,
  User,
  HeartPulse,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyOnboardingStatus,
  completeMyOnboarding,
  type OnboardingDocument,
} from "@/lib/hr-api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────
interface PersonalForm {
  dob: string;
  nationality: string;
  address: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
}
interface MedicalForm {
  bloodGroup: string;
  allergies: string;
  conditions: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
}
interface UploadItem {
  id: string;
  name: string;
  size: number;
}
interface ReferenceItem {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
}

const ICON = { text: FileText, pdf: FileUp } as const;

const emptyPersonal: PersonalForm = {
  dob: "",
  nationality: "",
  address: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
};
const emptyMedical: MedicalForm = {
  bloodGroup: "",
  allergies: "",
  conditions: "",
  medications: "",
  doctorName: "",
  doctorPhone: "",
};

const STEPS = [
  { key: "personal", title: "Personal & Emergency", icon: User },
  { key: "medical", title: "Medical Information", icon: HeartPulse },
  { key: "credentials", title: "Certificates & References", icon: GraduationCap },
  { key: "policies", title: "Policies & Signature", icon: ShieldCheck },
] as const;

export default function EmployeeOnboarding() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [stepIdx, setStepIdx] = useState(0);
  const [personal, setPersonal] = useState<PersonalForm>(emptyPersonal);
  const [medical, setMedical] = useState<MedicalForm>(emptyMedical);
  const [certificates, setCertificates] = useState<UploadItem[]>([]);
  const [references, setReferences] = useState<ReferenceItem[]>([]);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [active, setActive] = useState<OnboardingDocument | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchMyOnboardingStatus,
    staleTime: 0,
  });

  useMemo(() => {
    if (!active && status && (status as any).documents?.length > 0) {
      setActive((status as any).documents[0]);
    }
  }, [status, active]);

  const docs = (status as any)?.documents ?? [];

  const completeMutation = useMutation({
    mutationFn: completeMyOnboarding,
    onSuccess: () => {
      toast.success("Onboarding completed.");
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      window.location.href = "/";
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to submit onboarding"),
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading onboarding…</span>
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const allChecked = docs.length > 0 && docs.every((d) => checks[d._id]);
  const signatureValid =
    signature.trim().toLowerCase() === fullName.toLowerCase();

  // ─── Step validation ──
  const stepValid = (i: number): boolean => {
    if (i === 0) {
      return Boolean(
        personal.dob &&
          personal.address &&
          personal.nextOfKinName &&
          personal.nextOfKinPhone &&
          personal.emergencyName &&
          personal.emergencyPhone,
      );
    }
    if (i === 1) return Boolean(medical.bloodGroup);
    if (i === 2) return certificates.length > 0 && references.length > 0;
    if (i === 3) return allChecked && signatureValid;
    return false;
  };

  const progressPct = Math.round(
    (STEPS.reduce((acc, _, i) => acc + (stepValid(i) ? 1 : 0), 0) / STEPS.length) *
      100,
  );

  const next = () => {
    if (!stepValid(stepIdx)) {
      return toast.error("Please complete the required fields before continuing.");
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const submit = () => {
    if (!STEPS.every((_, i) => stepValid(i))) {
      return toast.error("Some steps are incomplete.");
    }
    completeMutation.mutate({
      signatureName: signature.trim(),
      acknowledgedDocumentIds: docs.map((d) => d._id),
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
    }));
    setCertificates((prev) => [...prev, ...items]);
  };

  const addReference = () =>
    setReferences((r) => [
      ...r,
      {
        id: crypto.randomUUID(),
        name: "",
        relationship: "",
        email: "",
        phone: "",
      },
    ]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Welcome, {user.firstName}</h1>
            <p className="text-sm text-white/80">
              Complete onboarding to access your workspace.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Progress header */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Onboarding Progress
                </p>
                <h2 className="text-lg font-semibold">
                  Step {stepIdx + 1} of {STEPS.length}: {STEPS[stepIdx].title}
                </h2>
              </div>
              <Badge
                variant="outline"
                className="text-sm border-primary text-primary"
              >
                {progressPct === 100 ? "Fully onboarded" : `${progressPct}% complete`}
              </Badge>
            </div>
            <Progress value={progressPct} className="h-2" />

            {/* Stepper */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = stepValid(i);
                const isCurrent = i === stepIdx;
                return (
                  <button
                    key={s.key}
                    onClick={() => setStepIdx(i)}
                    className={`p-2 rounded-md text-left transition flex items-start gap-2 border ${
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : done
                          ? "border-success/40 bg-success/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        done
                          ? "bg-success text-white"
                          : isCurrent
                            ? "bg-primary text-white"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Step {i + 1}
                      </p>
                      <p className="text-xs font-medium truncate">{s.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step body */}
        {stepIdx === 0 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold">Personal details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Date of birth *">
                    <Input
                      type="date"
                      value={personal.dob}
                      onChange={(e) =>
                        setPersonal({ ...personal, dob: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Nationality">
                    <Input
                      value={personal.nationality}
                      onChange={(e) =>
                        setPersonal({ ...personal, nationality: e.target.value })
                      }
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Residential address *">
                      <Textarea
                        rows={2}
                        value={personal.address}
                        onChange={(e) =>
                          setPersonal({ ...personal, address: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold">Next of kin</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Full name *">
                    <Input
                      value={personal.nextOfKinName}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          nextOfKinName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Relationship">
                    <Input
                      value={personal.nextOfKinRelationship}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          nextOfKinRelationship: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Phone *">
                    <Input
                      value={personal.nextOfKinPhone}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          nextOfKinPhone: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold">Emergency contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Full name *">
                    <Input
                      value={personal.emergencyName}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          emergencyName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Relationship">
                    <Input
                      value={personal.emergencyRelationship}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          emergencyRelationship: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Phone *">
                    <Input
                      value={personal.emergencyPhone}
                      onChange={(e) =>
                        setPersonal({
                          ...personal,
                          emergencyPhone: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </section>
            </CardContent>
          </Card>
        )}

        {stepIdx === 1 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Medical information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Blood group *">
                  <Input
                    placeholder="e.g. O+"
                    value={medical.bloodGroup}
                    onChange={(e) =>
                      setMedical({ ...medical, bloodGroup: e.target.value })
                    }
                  />
                </Field>
                <Field label="Family doctor name">
                  <Input
                    value={medical.doctorName}
                    onChange={(e) =>
                      setMedical({ ...medical, doctorName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Doctor phone">
                  <Input
                    value={medical.doctorPhone}
                    onChange={(e) =>
                      setMedical({ ...medical, doctorPhone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Current medications">
                  <Input
                    value={medical.medications}
                    onChange={(e) =>
                      setMedical({ ...medical, medications: e.target.value })
                    }
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Allergies">
                    <Textarea
                      rows={2}
                      value={medical.allergies}
                      onChange={(e) =>
                        setMedical({ ...medical, allergies: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Pre-existing conditions">
                    <Textarea
                      rows={2}
                      value={medical.conditions}
                      onChange={(e) =>
                        setMedical({ ...medical, conditions: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stepIdx === 2 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Certificates & qualifications</h3>
                  <Label
                    htmlFor="cert-upload"
                    className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Upload className="h-4 w-4" /> Upload files
                  </Label>
                  <input
                    id="cert-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>
                {certificates.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    No files uploaded yet. Upload at least one certificate.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {certificates.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between border rounded-md p-2 text-sm"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(c.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCertificates((prev) =>
                              prev.filter((x) => x.id !== c.id),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">References</h3>
                  <Button variant="outline" size="sm" onClick={addReference}>
                    Add reference
                  </Button>
                </div>
                {references.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    Add at least one professional reference.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {references.map((r, idx) => (
                      <div key={r.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Reference {idx + 1}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setReferences((prev) =>
                                prev.filter((x) => x.id !== r.id),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input
                            placeholder="Full name"
                            value={r.name}
                            onChange={(e) =>
                              setReferences((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, name: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="Relationship"
                            value={r.relationship}
                            onChange={(e) =>
                              setReferences((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, relationship: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="Email"
                            value={r.email}
                            onChange={(e) =>
                              setReferences((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, email: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="Phone"
                            value={r.phone}
                            onChange={(e) =>
                              setReferences((prev) =>
                                prev.map((x) =>
                                  x.id === r.id
                                    ? { ...x, phone: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        )}

        {stepIdx === 3 && (
          <>
            {docs.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <p className="font-medium">
                    No policy documents have been configured yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can submit to finish onboarding. Contact your
                    administrator if you expected policies here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                <Card className="h-fit">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                      Documents ({docs.filter((d) => checks[d._id]).length}/
                      {docs.length})
                    </p>
                    {docs.map((d) => {
                      const Icon = ICON[d.type];
                      const isActive = active?._id === d._id;
                      const done = !!checks[d._id];
                      return (
                        <button
                          key={d._id}
                          onClick={() => setActive(d)}
                          className={`w-full text-left p-2 rounded-md flex items-center gap-2 text-sm transition ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{d.title}</span>
                          {done && (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {active && (
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold">
                              {active.title}
                            </h2>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase mt-1"
                            >
                              {active.type}
                            </Badge>
                          </div>
                        </div>

                        <div className="border rounded-lg bg-background">
                          {active.type === "text" && (
                            <ScrollArea className="h-[360px] p-4">
                              <p className="whitespace-pre-wrap text-sm">
                                {active.content}
                              </p>
                            </ScrollArea>
                          )}
                          {active.type === "pdf" && active.fileUrl && (
                            <iframe
                              src={active.fileUrl}
                              className="w-full h-[460px] rounded-lg"
                              title={active.title}
                            />
                          )}
                        </div>

                        <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={!!checks[active._id]}
                            onCheckedChange={(v) =>
                              setChecks((c) => ({ ...c, [active._id]: !!v }))
                            }
                            className="mt-0.5"
                          />
                          <span className="text-sm">
                            I have read and agree to{" "}
                            <span className="font-medium">{active.title}</span>.
                          </span>
                        </label>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardContent className="p-5 space-y-3">
                      <div>
                        <h3 className="font-semibold">Electronic Signature</h3>
                        <p className="text-xs text-muted-foreground">
                          Type your full legal name to confirm all documents
                          above. It must match{" "}
                          <span className="font-medium">{fullName}</span>.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Full name</Label>
                        <Input
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder={fullName}
                          className="font-serif italic text-lg"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {docs.filter((d) => checks[d._id]).length}/{docs.length}{" "}
                        documents agreed
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation footer */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={back}
            disabled={stepIdx === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          {stepIdx < STEPS.length - 1 ? (
            <Button
              onClick={next}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={
                !STEPS.every((_, i) => stepValid(i)) ||
                completeMutation.isPending
              }
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Complete onboarding <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
