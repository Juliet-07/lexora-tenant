import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Cog,
  FolderKanban,
  Gauge,
  Globe2,
  Link2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingStars } from "@/components/marketing/FloatingStars";
import { CtaBand, MarketingLayout } from "@/components/marketing/MarketingLayout";
import { pillars, testimonials } from "@/data/marketingContent";
import dashboardPreview from "@/assets/dashboard-preview.png";
import executiveImage from "@/assets/intro-executive.jpg";
import boardroomImage from "@/assets/intro-boardroom.jpg";

const pillarIcons = [Users, FolderKanban, Cog, Gauge];

const whyLexora = [
  {
    icon: Globe2,
    title: "Built for Africa, from Africa",
    copy: "Designed around the regulatory realities and operational patterns of African business ecosystems.",
  },
  {
    icon: Link2,
    title: "One system, total visibility",
    copy: "Stakeholders, projects, finance, governance, compliance, and HR in a single platform reading from the same data.",
  },
  {
    icon: TrendingUp,
    title: "Investor-ready by design",
    copy: "Organisational health quantified through the GRC Health Score. Auditable, structured, and transparent.",
  },
];

export default function Intro() {
  return (
    <MarketingLayout>
      <section id="top" className="marketing-hero relative overflow-hidden">
        <div className="absolute inset-0 intro-grid opacity-30" aria-hidden="true" />
        <FloatingStars />
        <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-2xl intro-reveal">
            <div className="hidden mb-8 inline-flex items-center gap-2 rounded-full border border-intro-accent/30 bg-intro-accent/10 px-3 py-1.5 text-xs font-semibold uppercase text-intro-accent">
              <Sparkles className="h-3.5 w-3.5" /> Built from first principles for Africa
            </div>
            <h1 className="font-display text-5xl leading-[0.98] sm:text-6xl lg:text-[4.75rem]">
              Leading growth strategies in business ecosystems in
              <span className="mt-2 block text-intro-highlight">Africa.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-intro-muted">
              A governance, risk, and compliance platform that unifies stakeholder management, projects, finance,
              human resources, governance, risk, compliance workflows, advisory, capacity building, and performance
              measurement into a single system.
            </p>
            <div className="mt-9 flex flex-col md:flex-row md:items-center gap-4">
              <Button asChild size="lg" className="h-[40px] rounded-lg bg-intro-primary px-7 text-intro-foreground shadow-intro-glow hover:bg-intro-primary/90">
                <Link to="/contact">Get in touch <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-[40px] border-intro-foreground/20 bg-intro-foreground/5 px-7 text-intro-foreground hover:bg-intro-foreground/10 hover:text-intro-foreground">
                <Link to="/platform">Explore the platform</Link>
              </Button>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-intro-foreground/10 pt-7">
              {[
                { value: "5", label: "Integrated modules" },
                { value: "4", label: "Business pillars" },
                { value: "1", label: "Unified view" },
              ].map((stat) => (
                <div key={stat.label} className="border-r border-intro-foreground/10 pr-3 last:border-0 sm:pr-6">
                  <p className="font-display text-3xl text-intro-foreground">{stat.value}</p>
                  <p className="mt-1 text-[10px] uppercase leading-4 text-intro-muted sm:text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs uppercase tracking-wide text-intro-muted">
              Trusted by governance-focused organisations across Africa
            </p>
          </div>

           <div className="relative mx-auto w-full max-w-[620px] intro-reveal intro-delay marketing-float">
            <div className="relative ml-auto w-[88%] overflow-hidden rounded-2xl border border-intro-foreground/10 bg-intro-surface shadow-intro-deep">
              <img src={executiveImage} alt="African business leader in a modern Kigali office" width={1024} height={1280} className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-intro via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="max-w-xs border-l-2 border-intro-accent pl-4">
                  <p className="text-sm font-medium leading-6">Clarity to lead. Control to grow.</p>
                  <p className="mt-1 text-xs text-intro-muted">The command layer for modern enterprise</p>
                </div>
              </div>
            </div>
            <div className="absolute -left-1 top-10 hidden w-48 overflow-hidden rounded-xl border border-intro-foreground/10 bg-intro-surface shadow-intro-deep sm:block lg:-left-10">
              <img src={boardroomImage} alt="African executives collaborating in a boardroom" width={1280} height={768} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="border-t border-intro-foreground/10 p-3">
                <p className="text-[10px] uppercase text-intro-muted">Live business view</p>
                <p className="mt-1 text-xs font-semibold">One team. One source of truth.</p>
              </div>
            </div>
            <div className="absolute -bottom-5 right-2 flex items-center gap-3 rounded-lg border border-intro-foreground/10 bg-intro-surface/90 px-4 py-3 shadow-intro-deep backdrop-blur-xl sm:right-8">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-intro-success/15 text-intro-success"><BarChart3 className="h-4 w-4" /></span>
              <div><p className="text-[10px] uppercase text-intro-muted">GRC Health Score</p><p className="text-sm font-semibold">Always in view</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-intro-soft-border bg-intro-soft-raised py-20 text-intro-soft-foreground sm:py-24">
        <FloatingStars className="foundation-stars" count={38} />
        <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-intro-primary">The foundation</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">Four pillars. One platform.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, i) => {
              const Icon = pillarIcons[i];
              return (
                <div key={pillar.title} className="rounded-lg border border-intro-soft-border bg-intro-soft-raised p-6 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-intro-primary/10 text-intro-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-intro-soft-muted">{pillar.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-intro-foreground/10 bg-intro py-20 text-intro-foreground sm:py-28">
        <div className="mx-auto max-w-[1320px] px-5 text-center sm:px-8">
          <p className="text-xs font-semibold uppercase text-intro-accent">The platform</p>
          <h2 className="mt-5 font-display text-4xl sm:text-5xl">Your entire operation, one screen.</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-intro-muted">One view across governance, clients, delivery, people and finance.</p>
          <div className="marketing-showcase mx-auto mt-12 max-w-[1100px] overflow-hidden rounded-lg border border-intro-foreground/15 bg-intro-surface shadow-intro-deep">
            <div className="flex h-9 items-center gap-1.5 border-b border-intro-foreground/10 bg-intro-surface px-4" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-destructive"/><span className="h-2 w-2 rounded-full bg-warning"/><span className="h-2 w-2 rounded-full bg-success"/></div>
             <img src={dashboardPreview} alt="Lexora GRC dashboard showing business pulse, cross-module performance and governance navigation" loading="lazy" className="block h-auto w-full"/>
          </div>
          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline" className="border-intro-foreground/20 bg-transparent text-intro-foreground hover:bg-intro-foreground/10">
              <Link to="/platform">See every feature <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <h2 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
            Built for teams that take governance seriously.
          </h2>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-7">
                <blockquote className="text-sm leading-7 text-intro-foreground/90">"{t.quote}"</blockquote>
                <figcaption className="mt-6 border-t border-intro-foreground/10 pt-5">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-intro-muted">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-intro-foreground/10 py-20 sm:py-28">
        <div className="absolute inset-0 opacity-25 intro-grid" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-intro-foreground/10">
            <img src={boardroomImage} alt="African leadership team reviewing business performance" width={1280} height={768} loading="lazy" className="aspect-[5/4] w-full object-cover" />
          </div>
          <div className="lg:pl-10">
            <p className="text-xs font-semibold uppercase text-intro-accent">Why Lexora</p>
            <h2 className="mt-5 font-display text-4xl leading-none sm:text-5xl">Compliance as a growth driver.</h2>
            <div className="mt-10 space-y-7">
              {whyLexora.map((item) => (
                <div key={item.title} className="flex gap-4 border-t border-intro-foreground/10 pt-6">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-intro-primary/20 text-intro-accent">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-intro-muted">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Ready to lead with governance?" copy="See how Lexora fits your organisation." />
    </MarketingLayout>
  );
}
