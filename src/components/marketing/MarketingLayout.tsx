import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, Mail, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const marketingNav = [
  { label: "Home", to: "/" },
  { label: "Platform", to: "/platform" },
  { label: "Pricing", to: "/pricing" },
  { label: "Solutions", to: "/solutions" },
  { label: "Advisory & Training", to: "/advisory" },
  { label: "Insights", to: "/insights" },
  { label: "About", to: "/about" },
];

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="intro-page min-h-screen overflow-x-hidden bg-intro text-intro-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-intro-foreground/10 bg-intro/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Lexora home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-intro-primary to-intro-accent text-sm font-bold text-intro-foreground">
              L
            </span>
            <span className="text-lg font-semibold tracking-tight">Lexora</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {marketingNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-intro-primary/15 text-intro-foreground"
                      : "text-intro-muted hover:text-intro-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-lg border-intro-foreground/15 bg-transparent px-4 text-xs text-intro-muted hover:bg-intro-foreground/10 hover:text-intro-foreground"
            >
              <Link to="/login">Launch app <ArrowRight /></Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-lg bg-gradient-to-br from-intro-primary to-intro-accent px-4 text-xs text-intro-foreground shadow-intro-glow hover:opacity-90"
            >
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-intro-foreground hover:bg-intro-foreground/10 hover:text-intro-foreground lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {menuOpen && (
          <nav className="border-t border-intro-foreground/10 bg-intro px-5 py-5 lg:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col gap-3">
              {marketingNav.map((item) => (
                <Link key={item.to} to={item.to} className="text-sm text-intro-muted">
                  {item.label}
                </Link>
              ))}
              <Button asChild variant="outline" className="mt-2 border-intro-foreground/15 bg-transparent text-intro-foreground hover:bg-intro-foreground/10">
                <Link to="/login">Launch app</Link>
              </Button>
              <Button asChild className="bg-intro-primary text-intro-foreground hover:bg-intro-primary/90">
                <Link to="/contact">Get in touch</Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-intro-foreground/10 bg-intro px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-intro-primary to-intro-accent text-sm font-bold">L</span>
              <span className="font-semibold">Lexora Africa</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-intro-muted">
              Governance, risk, and compliance platform built from first principles for African businesses.
            </p>
          </div>
          <FooterCol
            title="Platform"
            links={[
              ["Lexora AML/KYC", "/platform"],
              ["Lexora Projects", "/platform"],
              ["Lexora Finance", "/platform"],
              ["Lexora GRC", "/platform"],
              ["Lexora HR", "/platform"],
            ]}
          />
          <FooterCol
            title="Solutions"
            links={[
              ["For boards", "/solutions"],
              ["For regulated entities", "/solutions"],
              ["For fund administrators", "/solutions"],
              ["For professional services", "/solutions"],
              ["For SMEs", "/solutions"],
            ]}
          />
          <FooterCol
            title="Services"
            links={[
              ["Advisory", "/advisory"],
              ["Training", "/advisory"],
              ["Pricing", "/pricing"],
              ["Partners", "/about"],
              ["About", "/about"],
            ]}
          />
          <FooterCol
            title="Connect"
            links={[
              ["Get in touch", "/contact"],
              ["Insights", "/insights"],
              ["Launch app", "/login"],
            ]}
          />
        </div>
        <div className="mx-auto mt-10 flex max-w-[1320px] flex-col gap-3 border-t border-intro-foreground/10 pt-6 text-xs text-intro-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lexora Africa (Limited). All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> info@lexoraafrica.com</span>
            <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Kigali, Rwanda</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-intro-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-sm text-intro-muted transition-colors hover:text-intro-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-intro-foreground/10 py-20 sm:py-24">
      <div className="absolute inset-0 intro-grid opacity-30" aria-hidden="true" />
      <div className="absolute left-1/2 top-[-220px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-intro-primary/20 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-[900px] px-5 text-center sm:px-8">
        {eyebrow && (
          <span className="inline-flex rounded-full border border-intro-accent/30 bg-intro-accent/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-intro-accent">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-6 font-display text-5xl leading-[1.02] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-intro-muted">{subtitle}</p>}
      </div>
    </section>
  );
}

export function CtaBand({
  title,
  copy,
  primaryLabel = "Get in touch",
  primaryTo = "/contact",
}: {
  title: string;
  copy: string;
  primaryLabel?: string;
  primaryTo?: string;
}) {
  return (
    <section className="border-y border-intro-foreground/10 bg-intro-primary">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="max-w-3xl font-display text-4xl leading-none text-intro-foreground sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-xl text-sm text-intro-foreground/75">{copy}</p>
        </div>
        <Button asChild size="lg" className="h-13 w-fit bg-intro-foreground px-7 text-intro hover:bg-intro-foreground/90">
          <Link to={primaryTo}>{primaryLabel} <ArrowRight /></Link>
        </Button>
      </div>
    </section>
  );
}
