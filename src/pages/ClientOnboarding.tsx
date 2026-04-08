import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, User, Upload, ShieldCheck, CheckCircle2, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const steps = ["Client Type", "Details", "Documents", "AML/KYC", "Approval", "Complete"];

export default function ClientOnboarding() {
  const [step, setStep] = useState(0);
  const [clientType, setClientType] = useState<"Individual" | "Corporate" | null>(null);
  const [kycRunning, setKycRunning] = useState(false);
  const [kycDone, setKycDone] = useState(false);
  const [riskResult, setRiskResult] = useState<"Low" | "Medium" | "High">("Medium");
  const navigate = useNavigate();

  const progress = ((step + 1) / steps.length) * 100;

  const runKYC = () => {
    setKycRunning(true);
    setTimeout(() => {
      setKycRunning(false);
      setKycDone(true);
      const risks: Array<"Low" | "Medium" | "High"> = ["Low", "Medium", "High"];
      setRiskResult(risks[Math.floor(Math.random() * 3)]);
    }, 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">New Client Onboarding</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length} — {steps[step]}</p>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Step indicators */}
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Client Type */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { type: "Individual" as const, icon: User, desc: "Private individual client" },
            { type: "Corporate" as const, icon: Building2, desc: "Company or organization" },
          ].map(({ type, icon: Icon, desc }) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${clientType === type ? "ring-2 ring-primary shadow-md" : ""}`}
              onClick={() => setClientType(type)}
            >
              <CardContent className="p-8 text-center">
                <div className={`mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${clientType === type ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-lg">{type}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Enter {clientType === "Corporate" ? "company" : "personal"} information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientType === "Corporate" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Company Name</Label><Input placeholder="Acme Corp Ltd" /></div>
                  <div><Label>Registration No.</Label><Input placeholder="REG-12345678" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Industry</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finance">Financial Services</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Country</Label><Input placeholder="United Kingdom" /></div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input placeholder="John" /></div>
                <div><Label>Last Name</Label><Input placeholder="Smith" /></div>
                <div><Label>Date of Birth</Label><Input type="date" /></div>
                <div><Label>Nationality</Label><Input placeholder="British" /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" placeholder="email@example.com" /></div>
              <div><Label>Phone</Label><Input placeholder="+44 20 1234 5678" /></div>
            </div>
            <div><Label>Address</Label><Textarea placeholder="Full address..." /></div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Documents */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>Upload required identification and compliance documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {["Proof of Identity (Passport/ID)", clientType === "Corporate" ? "Certificate of Incorporation" : "Proof of Address", "Source of Funds Declaration"].map((doc) => (
              <div key={doc} className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">{doc}</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload (PDF, JPG, PNG)</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: AML/KYC */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>AML / KYC Verification</CardTitle>
            <CardDescription>Automated compliance screening</CardDescription>
          </CardHeader>
          <CardContent>
            {!kycRunning && !kycDone && (
              <div className="text-center py-8">
                <ShieldCheck className="h-16 w-16 mx-auto text-primary mb-4" />
                <p className="text-muted-foreground mb-4">Ready to run compliance checks</p>
                <Button onClick={runKYC} className="bg-gradient-to-r from-primary to-secondary">Run Verification</Button>
              </div>
            )}
            {kycRunning && (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                <p className="font-medium">Running compliance checks...</p>
                {["Identity Verification", "PEP Screening", "Sanctions Check", "Risk Assessment"].map((check, i) => (
                  <div key={check} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            )}
            {kycDone && (
              <div className="space-y-4 py-4">
                {[
                  { label: "Identity Verification", passed: true },
                  { label: "PEP Screening", passed: true },
                  { label: "Sanctions Check", passed: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-success/5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge className="bg-success/10 text-success"><CheckCircle2 className="h-3 w-3 mr-1" /> Passed</Badge>
                  </div>
                ))}
                <div className={`flex items-center justify-between p-3 rounded-lg ${riskResult === "High" ? "bg-destructive/5" : riskResult === "Medium" ? "bg-warning/5" : "bg-success/5"}`}>
                  <span className="text-sm font-medium">Risk Score</span>
                  <Badge className={riskResult === "High" ? "bg-destructive/10 text-destructive" : riskResult === "Medium" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}>
                    {riskResult}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Approval */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskResult === "High" && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Enhanced Due Diligence Required</p>
                  <p className="text-sm text-muted-foreground">This client has been flagged as high risk. EDD workflow has been triggered.</p>
                </div>
              </div>
            )}
            <div>
              <Label>Assign Compliance Officer</Label>
              <Select defaultValue="sarah">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah">Sarah Chen</SelectItem>
                  <SelectItem value="michael">Michael Torres</SelectItem>
                  <SelectItem value="david">David Park</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Review Notes</Label><Textarea placeholder="Add notes about this client..." /></div>
            <div className="flex gap-3">
              <Button className="bg-success hover:bg-success/90 flex-1">Approve Client</Button>
              <Button variant="destructive" className="flex-1">Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Complete */}
      {step === 5 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">Client Onboarded Successfully</h2>
            <p className="text-muted-foreground mt-2">The client has been added to the system and all checks are complete.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => navigate("/clients")}>View All Clients</Button>
              <Button variant="outline" onClick={() => { setStep(0); setClientType(null); setKycDone(false); }}>Add Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {step < 5 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button
            onClick={() => {
              if (step === 3 && !kycDone) return;
              setStep(Math.min(5, step + 1));
            }}
            disabled={(step === 0 && !clientType) || (step === 3 && !kycDone)}
          >
            {step === 4 ? "Complete" : "Next"} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
