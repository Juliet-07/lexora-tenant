import { Handshake, Plus } from "lucide-react";
import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import boardroomImage from "@/assets/intro-boardroom.jpg";
import executiveImage from "@/assets/intro-executive.jpg";

const stats = [
  { value: "4", label: "Core pillars" },
  { value: "5", label: "Integrated modules" },
  { value: "1", label: "Unified platform" },
  { value: "∞", label: "Growth potential" },
];

export default function About() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="About"
        title="About Lexora Africa"
        subtitle="A governance, risk, and compliance platform built from first principles for African businesses."
      />

      <section className="border-b border-intro-foreground/10 py-14">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-6 px-5 sm:px-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-6">
              <p className="font-display text-4xl text-intro-highlight">{stat.value}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-intro-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">
              African businesses deserve infrastructure designed for how they actually operate.
            </h2>
            <div className="mt-8 space-y-5 text-sm leading-7 text-intro-muted">
              <p>
                The firm is headquartered in Kigali, Rwanda and operates across advisory, training, and technology.
                The advisory practice designs governance and compliance frameworks. The training arm builds the
                internal capacity for organisations to sustain those frameworks. And the technology platform
                operationalises everything into a system that codifies institutional knowledge, quantifies
                organisational health, and makes compliance a driver of growth.
              </p>
              <p>
                The platform is structured around four pillars: people, projects, processes, and performance. Five
                modules cover the full operational surface of a governance-focused organisation. The proprietary GRC
                Health Score quantifies compliance standing, governance health, and risk management effectiveness in
                a single metric.
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            <img
              src={boardroomImage}
              alt="Lexora Africa leadership team in a Kigali boardroom"
              loading="lazy"
              className="aspect-[5/3] w-full rounded-2xl border border-intro-foreground/10 object-cover"
            />
            <img
              src={executiveImage}
              alt="African business executive at work"
              loading="lazy"
              className="aspect-[5/3] w-full rounded-2xl border border-intro-foreground/10 object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-intro-soft py-20 text-intro-soft-foreground sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-intro-primary">Partners</p>
          <h2 className="mt-4 font-display text-4xl">Strategic partnerships across Africa</h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-intro-soft-border bg-intro-soft-raised p-8">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-intro-primary/10 text-sm font-bold text-intro-primary">
                  GGA
                </span>
                <div>
                  <h3 className="text-lg font-semibold">Good Governance Academy</h3>
                  <p className="text-xs text-intro-soft-muted">Strategic East African Partner</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-intro-soft-muted">
                Lexora partners with the Good Governance Academy (South Africa) to deliver governance education and
                board effectiveness programmes across East Africa. The flagship collaboration is the quarterly
                webinar series "Governing for Growth".
              </p>
            </article>
            <article className="rounded-2xl border border-dashed border-intro-soft-border bg-transparent p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-intro-soft-border/50 text-intro-soft-muted">
                <Plus className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">Become a partner</h3>
              <p className="mt-3 text-sm leading-6 text-intro-soft-muted">
                We are building a network of advisory firms, training institutions, and technology providers
                committed to strengthening governance across Africa.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-intro-primary">
                <Handshake className="h-4 w-4" /> Partner enquiry
              </p>
            </article>
          </div>
        </div>
      </section>

      <CtaBand
        title="Join us in building better-governed African enterprises."
        copy="Whether as a client, partner, or team member."
      />
    </MarketingLayout>
  );
}
