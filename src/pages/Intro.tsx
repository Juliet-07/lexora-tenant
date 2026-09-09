import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, MarketingLayout } from "@/components/marketing/MarketingLayout";
import { InfrastructureMark, ModuleGlyph } from "@/components/marketing/Brand";
import { modules } from "@/data/marketingContent";
import boardroomImage from "@/assets/intro-boardroom.jpg";

const operatingSequence = ["Govern", "Control", "Comply", "Measure", "Grow"];

export default function Intro() {
  return (
    <MarketingLayout>
      <section id="top" className="relative min-h-[calc(100vh-5rem)] overflow-hidden border-b border-intro-foreground/10">
        <div className="absolute inset-0 intro-grid opacity-20" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1400px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-20">
          <div className="intro-reveal">
            <p className="border-l border-intro-gold pl-3 text-xs font-semibold uppercase text-intro-gold">Africa's integrated business governance platform</p>
            <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[0.96] sm:text-7xl lg:text-[5.35rem]">
              One platform for how your business <span className="text-intro-highlight">operates, governs and grows.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-intro-muted sm:text-lg">
              Lexora unifies governance, risk, compliance, finance, projects and people into one connected business platform built for Africa.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-13 rounded-sm bg-intro-gold px-7 text-intro hover:bg-intro-gold-light">
                <Link to="/contact">Request a demo <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 rounded-sm border-intro-foreground/20 bg-transparent px-7 text-intro-foreground hover:bg-intro-foreground/10 hover:text-intro-foreground">
                <Link to="/platform">Explore the platform</Link>
              </Button>
            </div>
          </div>
          <div className="intro-reveal intro-delay mx-auto w-full max-w-[610px]">
            <p className="mb-6 text-right text-xs uppercase text-intro-muted">Five systems / one infrastructure</p>
            <InfrastructureMark className="w-full" />
          </div>
        </div>
      </section>

      <section className="bg-intro-soft py-24 text-intro-soft-foreground sm:py-32">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-intro-primary">The Lexora architecture</p>
              <h2 className="mt-5 max-w-2xl font-display text-4xl leading-none sm:text-5xl">
                Five systems.<br />One connected infrastructure.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-intro-soft-muted lg:justify-self-end">
              Each product is purpose-built. Together, they create one institutional record across clients, delivery, money, governance and people.
            </p>
          </div>

          <div className="mt-16 border-y border-intro-soft-border">
            {modules.map((module, i) => {
              return (
                <article
                  key={module.name}
                  className="group grid gap-5 border-b border-intro-soft-border py-8 last:border-0 md:grid-cols-[80px_1fr_1.1fr] md:items-center"
                >
                  <ModuleGlyph index={i} className="text-intro-primary" />
                  <div><span className="text-xs text-intro-soft-muted">{module.number}</span><h3 className="mt-2 font-display text-3xl">{module.name}</h3></div>
                  <p className="max-w-lg text-sm leading-6 text-intro-soft-muted">{module.short}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline" className="border-intro-soft-border bg-transparent text-intro-soft-foreground hover:bg-intro-soft-raised">
              <Link to="/platform">See every feature <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-intro-foreground/10 bg-intro-deep-blue py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase text-intro-gold">The institutional growth cycle</p>
          <div className="mt-10 grid grid-cols-2 border-l border-intro-foreground/15 sm:grid-cols-5">
            {operatingSequence.map((step, index) => (
              <div key={step} className="border-r border-t border-intro-foreground/15 px-5 py-8 sm:border-t-0">
                <p className="font-display text-3xl text-intro-foreground">{step}</p>
                <p className="mt-3 text-xs text-intro-muted">0{index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto grid max-w-[1320px] gap-14 px-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="relative overflow-hidden">
            <img src={boardroomImage} alt="African leadership team reviewing business performance" width={1280} height={768} loading="lazy" className="aspect-[5/4] w-full object-cover grayscale-[20%]" />
            <div className="absolute inset-y-0 right-0 w-1 bg-intro-gold" />
          </div>
          <div className="lg:pl-10">
            <p className="text-xs font-semibold uppercase text-intro-gold">A different proposition</p>
            <h2 className="mt-5 font-display text-4xl leading-none sm:text-5xl">Compliance as a growth driver.</h2>
            <p className="mt-7 text-base leading-7 text-intro-muted">Lexora turns governance from an obligation into operating infrastructure: stronger controls, reliable records, clearer accountability and decisions that withstand scrutiny.</p>
            <div className="mt-10 border-l border-intro-gold pl-6">
              <p className="font-display text-3xl">Investor-ready by design.</p>
              <p className="mt-3 text-sm leading-6 text-intro-muted">Build the financial visibility, documented processes, risk intelligence and organisational data that credible institutions expect.</p>
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Build a business that can withstand scrutiny." copy="See how Lexora can connect the systems your organisation depends on." primaryLabel="Request a demo" />
    </MarketingLayout>
  );
}
