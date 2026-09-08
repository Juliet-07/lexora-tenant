import { useState } from "react";
import { CheckCircle2, Clock, Globe, Mail, MapPin } from "lucide-react";
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
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { cn } from "@/lib/utils";

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

const slots = [
  { day: "Mon", date: 1, times: ["09:00", "11:00", "14:00"] },
  { day: "Tue", date: 2, times: ["10:00", "14:00", "16:00"] },
  { day: "Wed", date: 3, times: ["09:00", "11:00", "15:00"] },
  { day: "Thu", date: 4, times: ["10:00", "13:00", "15:00"] },
  { day: "Fri", date: 5, times: ["09:00", "11:00", "14:00"] },
  { day: "Sat", date: 6, times: [] },
];

export default function Contact() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);

  const toggle = (item: string) =>
    setSelected((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));

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
                    <p className="text-xs uppercase tracking-wide text-intro-muted">Email</p>
                    <p>info@lexoraafrica.com</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-intro-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-intro-muted">Location</p>
                    <p>Kigali, Rwanda</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Globe className="mt-0.5 h-4 w-4 text-intro-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-intro-muted">Serving</p>
                    <p>East Africa and beyond</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-intro-primary/30 bg-intro-primary/10 p-7">
              <h3 className="text-sm font-semibold">Looking for a platform demo?</h3>
              <p className="mt-2 text-sm leading-6 text-intro-muted">
                Select "Platform demo" in step 1 and choose the modules that interest you. We will arrange a
                personalised walkthrough at your preferred time.
              </p>
            </div>
          </aside>

          <div className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-7 sm:p-9">
            <div className="mb-8 flex items-center gap-2">
              {["Your details", "Your interests", "Select a time"].map((label, i) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      step > i ? "bg-intro-primary text-white" : "bg-intro-foreground/10 text-intro-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden text-xs text-intro-muted sm:block">{label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(2);
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" required><Input required className="intro-field" /></Field>
                  <Field label="Last name" required><Input required className="intro-field" /></Field>
                </div>
                <Field label="Work email" required><Input type="email" required className="intro-field" /></Field>
                <Field label="Company"><Input className="intro-field" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Industry"><PickList placeholder="Select industry" options={industries} /></Field>
                  <Field label="Company size"><PickList placeholder="Select size" options={companySizes} /></Field>
                </div>
                <Field label="Subject" required><PickList placeholder="Select subject" options={subjects} /></Field>
                <Button type="submit" className="w-full bg-intro-primary text-intro-foreground hover:bg-intro-primary/90">
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
                  <p className="text-sm text-intro-muted">Select all that apply.</p>
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
                  <Textarea rows={4} className="intro-field" />
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
                  <p className="text-sm text-intro-muted">Pick a 30-minute slot that works for you.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {slots.map((s) => (
                    <div key={s.day} className="rounded-xl border border-intro-foreground/10 p-4">
                      <p className="text-xs font-semibold">
                        {s.day} <span className="text-intro-muted">{s.date}</span>
                      </p>
                      <div className="mt-3 space-y-2">
                        {s.times.length === 0 && <p className="text-xs text-intro-muted">No slots</p>}
                        {s.times.map((t) => {
                          const id = `${s.day}-${t}`;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setSlot(id)}
                              className={cn(
                                "w-full rounded-lg border px-3 py-1.5 text-xs transition-colors",
                                slot === id
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
                <p className="flex items-center gap-2 text-xs text-intro-muted">
                  <Clock className="h-3.5 w-3.5" /> All times in CAT (UTC+2) · 30-minute session
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!slot}
                    className="flex-1 bg-intro-primary text-intro-foreground hover:bg-intro-primary/90"
                    onClick={() => setStep(4)}
                  >
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
                  A confirmation will be sent to your email with the meeting details and a calendar invite.
                </p>
                <Button
                  variant="outline"
                  className="mt-7 border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10"
                  onClick={() => {
                    setStep(1);
                    setSelected([]);
                    setSlot(null);
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

function PickList({ placeholder, options }: { placeholder: string; options: string[] }) {
  return (
    <Select>
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
