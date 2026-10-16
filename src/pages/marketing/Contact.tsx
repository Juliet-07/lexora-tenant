import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  MarketingLayout,
  PageHero,
} from "@/components/marketing/MarketingLayout";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const industries = [
  "Financial services",
  "Fund management",
  "Professional services",
  "Government & public sector",
  "Manufacturing",
  "Agriculture",
  "Technology",
  "Telecommunications",
  "Mining & extractives",
  "Healthcare",
  "Education",
  "Non-profit",
  "Other",
];

const companySizes = ["1 - 10", "11 - 50", "51 - 200", "201 - 500", "500+"];

const subjects = [
  "Platform demo",
  "Advisory engagement",
  "Training programme",
  "Organisational health assessment",
  "Partnership enquiry",
  "General enquiry",
];

const interests = [
  "Lexora AML/KYC",
  "Lexora Projects (CRM)",
  "Lexora Finance",
  "Lexora GRC",
  "Lexora HR",
  "Advisory",
  "Capacity building",
  "Org. health assessment",
  "Deal / transaction mgt",
  "Full platform overview",
];

// Real weekly availability, set by the Super Admin (see
// lexora-super-admin's Contact Requests → Weekly availability tab)
// and served from GET /public/demo-requests/availability. No auth.
interface PublicAvailabilityDay {
  date: string; // YYYY-MM-DD
  day: string; // "Mon".."Sun"
  label: string; // "Mon, Oct 20"
  slots: string[]; // "HH:mm"
}
interface PublicAvailability {
  timezone: string;
  durationMinutes: number;
  days: PublicAvailabilityDay[];
}

async function fetchPublicAvailability(): Promise<PublicAvailability> {
  const res = await api.get("/public/demo-requests/availability");
  const d = res.data?.data ?? res.data;
  return d ?? { timezone: "CAT", durationMinutes: 30, days: [] };
}

interface Slot {
  date: string;
  day: string;
  time: string;
}

export default function Contact() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [slot, setSlotState] = useState<Slot | null>(null);
  const [altDate, setAltDate] = useState<string>("");
  const [altTime, setAltTime] = useState<string>("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    industry: "",
    companySize: "",
    subject: "",
  });
  const setField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ["public-demo-availability"],
    queryFn: fetchPublicAvailability,
    enabled: step === 3,
  });

  const altDayOptions = (availability?.days ?? []).filter(
    (d) => d.date !== slot?.date,
  );
  const altTimesForDay =
    availability?.days.find((d) => d.date === altDate)?.slots ?? [];

  const submitMut = useMutation({
    mutationFn: () =>
      api.post("/public/demo-requests", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        company: form.company,
        industry: form.industry,
        companySize: form.companySize,
        subject: form.subject,
        interests: selected,
        goals,
        requestedDay: slot!.day,
        requestedDate: slot!.date,
        requestedTime: slot!.time,
        alternateDate: altDate,
        alternateTime: altTime,
      }),
    onSuccess: () => setStep(4),
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ||
          "Something went wrong submitting your request — please try again.",
      ),
  });

  const toggle = (item: string) =>
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );

  const pickSlot = (next: Slot) => {
    setSlotState(next);
    // A stale alternate choice on the same day as the new primary
    // pick could collide with it — clear it so the requirement to
    // pick two distinct times is always honestly enforced.
    if (altDate === next.date && altTime === next.time) {
      setAltDate("");
      setAltTime("");
    }
  };

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Get in touch"
        title="Let's build something together."
        subtitle="Whether you are exploring the platform, need advisory support, or want to discuss a partnership. Our team typically responds within 24 hours."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-7">
              <h2 className="text-lg font-semibold">How to reach us</h2>
              <ul className="mt-6 space-y-5 text-sm">
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-intro-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-intro-muted">
                      Email
                    </p>
                    <p>info@lexoraafrica.com</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-intro-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-intro-muted">
                      Location
                    </p>
                    <p>Kigali, Rwanda</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Globe className="mt-0.5 h-4 w-4 text-intro-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-intro-muted">
                      Serving
                    </p>
                    <p>East Africa and beyond</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-intro-primary/30 bg-intro-primary/10 p-7">
              <h3 className="text-sm font-semibold">
                Looking for a platform demo?
              </h3>
              <p className="mt-2 text-sm leading-6 text-intro-muted">
                Select "Platform demo" in step 1 and choose the modules that
                interest you. We will arrange a personalised walkthrough at your
                preferred time.
              </p>
            </div>
          </aside>

          <div className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-7 sm:p-9">
            <div className="mb-8 flex items-center gap-2">
              {["Your details", "Your interests", "Select a time"].map(
                (label, i) => (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        step > i
                          ? "bg-intro-primary text-white"
                          : "bg-intro-foreground/10 text-intro-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="hidden text-xs text-intro-muted sm:block">
                      {label}
                    </span>
                  </div>
                ),
              )}
            </div>

            {step === 1 && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.subject) {
                    toast.error("Pick a subject before continuing.");
                    return;
                  }
                  setStep(2);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" required>
                    <Input
                      required
                      className="intro-field"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                    />
                  </Field>
                  <Field label="Last name" required>
                    <Input
                      required
                      className="intro-field"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Work email" required>
                  <Input
                    type="email"
                    required
                    className="intro-field"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    className="intro-field"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Industry">
                    <PickList
                      placeholder="Select industry"
                      options={industries}
                      value={form.industry}
                      onChange={(v) => setField("industry", v)}
                    />
                  </Field>
                  <Field label="Company size">
                    <PickList
                      placeholder="Select size"
                      options={companySizes}
                      value={form.companySize}
                      onChange={(v) => setField("companySize", v)}
                    />
                  </Field>
                </div>
                <Field label="Subject" required>
                  <PickList
                    placeholder="Select subject"
                    options={subjects}
                    value={form.subject}
                    onChange={(v) => setField("subject", v)}
                  />
                </Field>
                <Button
                  type="submit"
                  className="w-full bg-intro-primary text-intro-foreground hover:bg-intro-primary/90"
                >
                  Continue to interests
                </Button>
                <p className="text-center text-xs text-intro-muted">
                  Your details are secure and will not be shared.
                </p>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Your interests</h3>
                  <p className="text-sm text-intro-muted">
                    Select all that apply.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggle(item)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs transition-colors",
                        selected.includes(item)
                          ? "border-intro-primary bg-intro-primary/20 text-intro-foreground"
                          : "border-intro-foreground/12 text-intro-muted hover:text-intro-foreground",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <Field label="Any specific goals? (optional)">
                  <Textarea
                    rows={4}
                    className="intro-field"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                  />
                </Field>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-intro-primary text-intro-foreground hover:bg-intro-primary/90"
                    onClick={() => setStep(3)}
                  >
                    Select a time
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Select a time</h3>
                  <p className="text-sm text-intro-muted">
                    Pick a {availability?.durationMinutes ?? 30}-minute slot
                    that works for you.
                  </p>
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-intro-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading
                    available times…
                  </div>
                ) : (availability?.days.length ?? 0) === 0 ? (
                  <p className="rounded-xl border border-intro-foreground/10 p-4 text-sm text-intro-muted">
                    No times are currently available. Please email us directly
                    at info@lexoraafrica.com.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {availability!.days.map((d) => (
                      <div
                        key={d.date}
                        className="rounded-xl border border-intro-foreground/10 p-4"
                      >
                        <p className="text-xs font-semibold">{d.label}</p>
                        <div className="mt-3 space-y-2">
                          {d.slots.map((t) => {
                            const isSelected =
                              slot?.date === d.date && slot?.time === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() =>
                                  pickSlot({
                                    date: d.date,
                                    day: d.day,
                                    time: t,
                                  })
                                }
                                className={cn(
                                  "w-full rounded-lg border px-3 py-1.5 text-xs transition-colors",
                                  isSelected
                                    ? "border-intro-primary bg-intro-primary/20"
                                    : "border-intro-foreground/10 text-intro-muted hover:text-intro-foreground",
                                )}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="flex items-center gap-2 text-xs text-intro-muted">
                  <Clock className="h-3.5 w-3.5" /> All times in{" "}
                  {availability?.timezone ?? "CAT"} ·{" "}
                  {availability?.durationMinutes ?? 30}-minute session
                </p>

                {slot && (
                  <div className="space-y-3 rounded-xl border border-intro-foreground/10 p-4">
                    <div>
                      <p className="text-sm font-semibold">Backup time</p>
                      <p className="text-xs text-intro-muted">
                        In case we need to reschedule, pick a second time you're
                        also available.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Alternate date">
                        <Select
                          value={altDate}
                          onValueChange={(v) => {
                            setAltDate(v);
                            setAltTime("");
                          }}
                        >
                          <SelectTrigger className="intro-field">
                            <SelectValue placeholder="Select a date" />
                          </SelectTrigger>
                          <SelectContent>
                            {altDayOptions.map((d) => (
                              <SelectItem key={d.date} value={d.date}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Alternate time">
                        <Select
                          value={altTime}
                          onValueChange={setAltTime}
                          disabled={!altDate}
                        >
                          <SelectTrigger className="intro-field">
                            <SelectValue placeholder="Select a time" />
                          </SelectTrigger>
                          <SelectContent>
                            {altTimesForDay.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={
                      !slot || !altDate || !altTime || submitMut.isPending
                    }
                    className="flex-1 bg-intro-primary text-intro-foreground hover:bg-intro-primary/90"
                    onClick={() => submitMut.mutate()}
                  >
                    {submitMut.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirm booking
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-intro-success" />
                <h3 className="mt-6 font-display text-3xl">You're all set.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-intro-muted">
                  Thank you for reaching out — we've emailed you a note
                  confirming we received your request. Our team will review it
                  and follow up with your meeting details shortly.
                </p>
                <Button
                  variant="outline"
                  className="mt-7 border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10"
                  onClick={() => {
                    setStep(1);
                    setForm({
                      firstName: "",
                      lastName: "",
                      email: "",
                      company: "",
                      industry: "",
                      companySize: "",
                      subject: "",
                    });
                    setSelected([]);
                    setGoals("");
                    setSlotState(null);
                    setAltDate("");
                    setAltTime("");
                  }}
                >
                  Start over
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-intro-muted">
        {label} {required && <span className="text-intro-accent">*</span>}
      </Label>
      {children}
    </div>
  );
}

function PickList({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="intro-field">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
