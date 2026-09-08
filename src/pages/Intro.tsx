import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Landmark,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import executiveImage from "@/assets/intro-executive.jpg";
import boardroomImage from "@/assets/intro-boardroom.jpg";

const modules = [
  {
    number: "01",
    name: "AML & Client Onboarding",
    description: "Move every relationship from verification to contracting with confidence.",
    icon: ShieldCheck,
    className: "lg:col-span-2",
  },
  {
    number: "02",
    name: "Human Resources",
    description: "Build accountable teams, from hiring and payroll to performance.",
    icon: UsersRound,
    className: "",
  },
  {
    number: "03",
    name: "CRM & Projects",
    description: "Turn client relationships into well-run, profitable work.",
    icon: BriefcaseBusiness,
    className: "",
  },
  {
    number: "04",
    name: "Governance, Risk & Compliance",
    description: "Make oversight, evidence, policy and risk part of daily operations.",
    icon: Scale,
    className: "",
  },
  {
    number: "05",
    name: "Finance",
    description: "See cash, performance and management reporting in one clear view.",
    icon: Landmark,
    className: "lg:col-span-2",
  },
];

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Why Lexora", href: "#why-lexora" },
];

export default function Intro() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="intro-page min-h-screen overflow-x-hidden bg-intro text-intro-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-intro-foreground/10 bg-intro/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="Lexora home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-intro-primary font-semibold text-intro-foreground shadow-intro-glow">L</span>
            <span className="text-lg font-semibold">Lexora</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="text-sm text-intro-muted transition-colors hover:text-intro-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button asChild className="h-10 rounded-full bg-intro-primary px-5 text-intro-foreground hover:bg-intro-primary/90">
              <Link to="/login">Launch app <ArrowRight /></Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-intro-foreground hover:bg-intro-foreground/10 hover:text-intro-foreground md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {menuOpen && (
          <nav className="border-t border-intro-foreground/10 bg-intro px-5 py-5 md:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="text-sm text-intro-muted">
                  {item.label}
                </a>
              ))}
              <Button asChild className="mt-2 bg-intro-primary text-intro-foreground hover:bg-intro-primary/90">
                <Link to="/login">Launch app <ArrowRight /></Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section id="top" className="relative min-h-[94vh] overflow-hidden pt-20">
          <div className="absolute inset-0 intro-grid opacity-30" aria-hidden="true" />
          <div className="relative mx-auto grid min-h-[calc(94vh-5rem)] max-w-[1440px] items-center gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-16">
            <div className="relative z-10 max-w-2xl intro-reveal">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-intro-accent/30 bg-intro-accent/10 px-3 py-1.5 text-xs font-semibold uppercase text-intro-accent">
                <Sparkles className="h-3.5 w-3.5" /> Built for ambitious African enterprise
              </div>
              <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl lg:text-[5.75rem]">
                One platform.
                <span className="mt-2 block text-intro-highlight">Every business pulse.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-intro-muted sm:text-lg">
                Lexora brings governance, risk, people, clients, projects and finance into one intelligent operating system—built for the pace and ambition of African business.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="h-13 rounded-lg bg-intro-primary px-7 text-intro-foreground shadow-intro-glow hover:bg-intro-primary/90">
                  <Link to="/login">Launch app <ArrowRight /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-13 border-intro-foreground/20 bg-intro-foreground/5 px-7 text-intro-foreground hover:bg-intro-foreground/10 hover:text-intro-foreground">
                  <a href="#platform">Explore platform</a>
                </Button>
              </div>
              <div className="mt-12 grid max-w-lg grid-cols-3 border-t border-intro-foreground/10 pt-7">
                {[{ value: "5", label: "Integrated modules" }, { value: "4", label: "Business pillars" }, { value: "1", label: "Unified view" }].map((stat) => (
                  <div key={stat.label} className="border-r border-intro-foreground/10 pr-3 last:border-0 sm:pr-6">
                    <p className="font-display text-3xl text-intro-foreground">{stat.value}</p>
                    <p className="mt-1 text-[10px] uppercase leading-4 text-intro-muted sm:text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[620px] intro-reveal intro-delay">
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
                <div><p className="text-[10px] uppercase text-intro-muted">Business pulse</p><p className="text-sm font-semibold">Always in view</p></div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-intro-primary to-transparent" />
        </section>

        <section id="platform" className="bg-intro-soft py-24 text-intro-soft-foreground sm:py-32">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase text-intro-primary">The Lexora platform</p>
                <h2 className="mt-5 max-w-2xl font-display text-5xl leading-none sm:text-6xl">Complex operations. One clear picture.</h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-intro-soft-muted lg:justify-self-end">
                Your work is connected. Your software should be too. Lexora replaces disconnected processes with a shared operating rhythm for leadership and teams.
              </p>
            </div>

            <div id="solutions" className="mt-16 grid gap-px overflow-hidden rounded-xl border border-intro-soft-border bg-intro-soft-border lg:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <article key={module.name} className={`group min-h-64 bg-intro-soft p-7 transition-colors hover:bg-intro-soft-raised sm:p-9 ${module.className}`}>
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-intro-soft-muted">{module.number}</span>
                      <Icon className="h-6 w-6 text-intro-primary" />
                    </div>
                    <h3 className="mt-16 max-w-md font-display text-3xl leading-tight">{module.name}</h3>
                    <p className="mt-4 max-w-md text-sm leading-6 text-intro-soft-muted">{module.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="why-lexora" className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 opacity-25 intro-grid" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-intro-foreground/10">
              <img src={boardroomImage} alt="African leadership team reviewing business performance" width={1280} height={768} loading="lazy" className="aspect-[5/4] w-full object-cover" />
            </div>
            <div className="lg:pl-10">
              <p className="text-xs font-semibold uppercase text-intro-accent">Designed for how business moves here</p>
              <h2 className="mt-5 font-display text-5xl leading-none sm:text-6xl">Built for visibility. Made for momentum.</h2>
              <div className="mt-10 space-y-7">
                {[
                  ["Connected by design", "Client, people, compliance, project and financial activity tell one coherent story."],
                  ["Governance without gridlock", "Controls live inside the work, helping teams move responsibly without slowing down."],
                  ["Leadership-ready insight", "From daily actions to board-level reporting, the right signal reaches the right person."],
                ].map(([title, copy]) => (
                  <div key={title} className="flex gap-4 border-t border-intro-foreground/10 pt-6">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-intro-primary/20 text-intro-accent"><Check className="h-3.5 w-3.5" /></span>
                    <div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-intro-muted">{copy}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-intro-foreground/10 bg-intro-primary">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-intro-foreground/70">Your next chapter</p>
              <h2 className="mt-4 max-w-3xl font-display text-5xl leading-none text-intro-foreground sm:text-6xl">Lead the business you are becoming.</h2>
            </div>
            <Button asChild size="lg" className="h-14 w-fit bg-intro-foreground px-7 text-intro hover:bg-intro-foreground/90">
              <Link to="/login">Launch Lexora <ChevronRight /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-intro px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 border-t border-intro-foreground/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-intro-primary text-sm font-semibold">L</span><span className="font-semibold">Lexora</span></div>
          <p className="text-xs text-intro-muted">Building stronger African enterprises, one decision at a time.</p>
          <div className="flex items-center gap-2 text-xs text-intro-muted"><Building2 className="h-4 w-4" /> Africa, connected</div>
        </div>
      </footer>
    </div>
  );
}