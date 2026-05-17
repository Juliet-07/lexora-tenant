import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  User as UserIcon,
  Lock,
  Crown,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useModule } from "@/contexts/ModuleContext";
import { useToast } from "@/hooks/use-toast";

// ─── Types & helpers ──────────────────────────────────────────
interface TenantProfile {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  tenantProfile?: {
    businessName?: string;
    industry?: string;
    registrationNumber?: string;
    taxId?: string;
    website?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    contactPerson?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
    };
  };
  [key: string]: any;
}

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  businessName: string;
  industry: string;
  registrationNumber: string;
  taxId: string;
  website: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  contactPosition: string;
};

const EMPTY_FORM: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  businessName: "",
  industry: "",
  registrationNumber: "",
  taxId: "",
  website: "",
  street: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  contactFirstName: "",
  contactLastName: "",
  contactEmail: "",
  contactPhone: "",
  contactPosition: "",
};

function toForm(p: TenantProfile | null | undefined): ProfileForm {
  if (!p) return EMPTY_FORM;
  const tp = p.tenantProfile ?? {};
  const addr = tp.address ?? {};
  const cp = tp.contactPerson ?? {};
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    position: p.position ?? "",
    businessName: tp.businessName ?? "",
    industry: tp.industry ?? "",
    registrationNumber: tp.registrationNumber ?? "",
    taxId: tp.taxId ?? "",
    website: tp.website ?? "",
    street: addr.street ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    country: addr.country ?? "",
    postalCode: addr.postalCode ?? "",
    contactFirstName: cp.firstName ?? "",
    contactLastName: cp.lastName ?? "",
    contactEmail: cp.email ?? "",
    contactPhone: cp.phone ?? "",
    contactPosition: cp.position ?? "",
  };
}

function fromForm(f: ProfileForm) {
  return {
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    phone: f.phone,
    position: f.position,
    tenantProfile: {
      businessName: f.businessName,
      industry: f.industry,
      registrationNumber: f.registrationNumber,
      taxId: f.taxId,
      website: f.website,
      address: {
        street: f.street,
        city: f.city,
        state: f.state,
        country: f.country,
        postalCode: f.postalCode,
      },
      contactPerson: {
        firstName: f.contactFirstName,
        lastName: f.contactLastName,
        email: f.contactEmail,
        phone: f.contactPhone,
        position: f.contactPosition,
      },
    },
  };
}

// ─── Profile Tab ──────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-profile"],
    queryFn: async () => {
      const res = await api.get("/tenant/profile");
      return (res.data?.data ?? res.data) as TenantProfile;
    },
  });

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  useEffect(() => {
    if (data) setForm(toForm(data));
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof fromForm>) => {
      const res = await api.patch("/tenant/profile", payload);
      return (res.data?.data ?? res.data) as TenantProfile;
    },
    onSuccess: (updated) => {
      qc.setQueryData(["tenant-profile"], updated);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    },
    onError: (err: any) =>
      toast({
        title: "Update failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const set = (k: keyof ProfileForm, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const initials =
    `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() ||
    user?.firstName?.[0]?.toUpperCase() ||
    "U";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold">
              {form.firstName} {form.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
              {form.position && <Badge variant="secondary">{form.position}</Badge>}
              {form.businessName && (
                <Badge variant="outline">{form.businessName}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal information</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name" value={form.firstName} onChange={(v) => set("firstName", v)} />
            <Field label="Last name" value={form.lastName} onChange={(v) => set("lastName", v)} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Position" value={form.position} onChange={(v) => set("position", v)} className="md:col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>Business profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Business name" value={form.businessName} onChange={(v) => set("businessName", v)} />
            <Field label="Industry" value={form.industry} onChange={(v) => set("industry", v)} />
            <Field label="Registration number" value={form.registrationNumber} onChange={(v) => set("registrationNumber", v)} />
            <Field label="Tax ID" value={form.taxId} onChange={(v) => set("taxId", v)} />
            <Field label="Website" value={form.website} onChange={(v) => set("website", v)} className="md:col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Street" value={form.street} onChange={(v) => set("street", v)} className="md:col-span-2" />
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="State / Region" value={form.state} onChange={(v) => set("state", v)} />
            <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
            <Field label="Postal code" value={form.postalCode} onChange={(v) => set("postalCode", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Primary contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Primary contact</CardTitle>
          <CardDescription>
            The main point of contact for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name" value={form.contactFirstName} onChange={(v) => set("contactFirstName", v)} />
            <Field label="Last name" value={form.contactLastName} onChange={(v) => set("contactLastName", v)} />
            <Field label="Email" type="email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
            <Field label="Phone" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} />
            <Field label="Position" value={form.contactPosition} onChange={(v) => set("contactPosition", v)} className="md:col-span-2" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setForm(toForm(data))}
          disabled={mutation.isPending}
        >
          Reset
        </Button>
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={() => mutation.mutate(fromForm(form))}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ─── Security Tab (change password) ───────────────────────────
function SecurityTab() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await api.post("/auth/change-password", payload);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (err: any) =>
      toast({
        title: "Could not change password",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const minLen = next.length >= 8;
  const hasNumber = /\d/.test(next);
  const hasUpper = /[A-Z]/.test(next);
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current && minLen && hasNumber && hasUpper && matches && !mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          Use a strong password you don't reuse elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Current password</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>New password</Label>
          <Input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Confirm new password</Label>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <ul className="text-xs space-y-1 text-muted-foreground">
          <Rule ok={minLen} text="At least 8 characters" />
          <Rule ok={hasUpper} text="At least one uppercase letter" />
          <Rule ok={hasNumber} text="At least one number" />
          <Rule ok={matches} text="Passwords match" />
        </ul>

        <div className="flex justify-end pt-2">
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            disabled={!canSubmit}
            onClick={() =>
              mutation.mutate({ currentPassword: current, newPassword: next })
            }
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-success" : ""}`}>
      <Check className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-30"}`} /> {text}
    </li>
  );
}

// ─── Plan Tab (upgrade plan) ──────────────────────────────────
interface PlanOption {
  id: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    cadence: "/month",
    description: "Essentials for small teams getting started.",
    features: ["Up to 5 users", "1 active module", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$149",
    cadence: "/month",
    description: "Scale operations with multi-module access.",
    features: ["Up to 25 users", "3 active modules", "Priority support", "API access"],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "Tailored deployment for regulated organizations.",
    features: ["Unlimited users", "All modules", "Dedicated CSM", "SSO & audit logs"],
  },
];

function PlanTab() {
  const { subscription, refetchDashboard } = useModule();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post("/tenant/upgrade-plan", { plan: planId });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Upgrade requested",
        description: "Our team will reach out to finalize your upgrade.",
      });
      refetchDashboard();
    },
    onError: (err: any) =>
      toast({
        title: "Upgrade request received",
        description:
          err?.response?.data?.message ??
          "We've noted your interest. Our team will contact you shortly.",
      }),
  });

  const current = subscription?.plan?.toLowerCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>
            You're currently on the{" "}
            <span className="font-semibold text-foreground capitalize">
              {subscription?.plan ?? "free"}
            </span>{" "}
            plan ({subscription?.status ?? "—"}).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_OPTIONS.map((plan) => {
          const isCurrent = current === plan.id;
          const isSelected = selected === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative ${plan.highlighted ? "border-primary shadow-md" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-primary to-secondary">
                  Most popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4 text-secondary" /> {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={isCurrent || mutation.isPending}
                  onClick={() => {
                    setSelected(plan.id);
                    mutation.mutate(plan.id);
                  }}
                >
                  {isCurrent
                    ? "Current plan"
                    : mutation.isPending && isSelected
                      ? "Requesting..."
                      : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Need a custom arrangement? Contact your account manager.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "profile";
  const validTabs = useMemo(() => new Set(["profile", "security", "plan"]), []);
  const active = validTabs.has(tab) ? tab : "profile";

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security and subscription.
        </p>
      </div>

      <Tabs value={active} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="plan">
            <Crown className="h-4 w-4 mr-2" /> Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="plan">
          <PlanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
