import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

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
    phone: f.phone,
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

// ─────────────────────────────────────────────────────────────
// SHARED FIELD COMPONENT
// ─────────────────────────────────────────────────────────────

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
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ProfileTab() {
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
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
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
      {/* Avatar / name card */}
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
              {form.position && (
                <Badge variant="secondary">{form.position}</Badge>
              )}
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
            <Field
              label="First name"
              value={form.firstName}
              onChange={(v) => set("firstName", v)}
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(v) => set("lastName", v)}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(v) => set("email", v)}
              type="email"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => set("phone", v)}
            />
            <Field
              label="Position"
              value={form.position}
              onChange={(v) => set("position", v)}
              className="md:col-span-2"
            />
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
            <Field
              label="Business name"
              value={form.businessName}
              onChange={(v) => set("businessName", v)}
            />
            <Field
              label="Industry"
              value={form.industry}
              onChange={(v) => set("industry", v)}
            />
            <Field
              label="Registration number"
              value={form.registrationNumber}
              onChange={(v) => set("registrationNumber", v)}
            />
            <Field
              label="Tax ID"
              value={form.taxId}
              onChange={(v) => set("taxId", v)}
            />
            <Field
              label="Website"
              value={form.website}
              onChange={(v) => set("website", v)}
              className="md:col-span-2"
            />
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
            <Field
              label="Street"
              value={form.street}
              onChange={(v) => set("street", v)}
              className="md:col-span-2"
            />
            <Field
              label="City"
              value={form.city}
              onChange={(v) => set("city", v)}
            />
            <Field
              label="State / Region"
              value={form.state}
              onChange={(v) => set("state", v)}
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(v) => set("country", v)}
            />
            <Field
              label="Postal code"
              value={form.postalCode}
              onChange={(v) => set("postalCode", v)}
            />
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
            <Field
              label="First name"
              value={form.contactFirstName}
              onChange={(v) => set("contactFirstName", v)}
            />
            <Field
              label="Last name"
              value={form.contactLastName}
              onChange={(v) => set("contactLastName", v)}
            />
            <Field
              label="Email"
              value={form.contactEmail}
              onChange={(v) => set("contactEmail", v)}
              type="email"
            />
            <Field
              label="Phone"
              value={form.contactPhone}
              onChange={(v) => set("contactPhone", v)}
            />
            <Field
              label="Position"
              value={form.contactPosition}
              onChange={(v) => set("contactPosition", v)}
              className="md:col-span-2"
            />
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
