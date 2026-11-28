import {
  createContext,
  FormEvent,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  Suspense,
  useState,
} from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { prefersReducedMotion } from "./fx/core";
import { runIntro } from "./fx/intro";
import { initView } from "./fx/view";
import { viewForPath } from "./siteViews";
import "./site.css";

// Shell for the public marketing site: intro overlay, scroll progress, cursor
// glow, navigation, closing call-to-action band and footer. Individual pages
// render inside the Outlet.

interface SiteCtx {
  playing: () => boolean;
  onPlay: (cb: () => void) => () => void;
}
const Ctx = createContext<SiteCtx>({
  playing: () => true,
  onPlay: () => () => {},
});
export const useSite = () => useContext(Ctx);

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap";

const NAV: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: "/", label: "Home", match: (p) => p === "/" },
  {
    to: "/platform",
    label: "Platform",
    match: (p) => p.startsWith("/platform"),
  },
  { to: "/pricing", label: "Pricing", match: (p) => p.startsWith("/pricing") },
  {
    to: "/industries",
    label: "Industries",
    match: (p) => p.startsWith("/industries"),
  },
  {
    to: "/advisory",
    label: "Advisory & Training",
    match: (p) => p.startsWith("/advisory"),
  },
  {
    to: "/insights",
    label: "Insights",
    match: (p) => p.startsWith("/insights"),
  },
  { to: "/events", label: "Events", match: (p) => p.startsWith("/events") },
  { to: "/about", label: "About", match: (p) => p.startsWith("/about") },
];

const seenIntro = () => {
  try {
    return sessionStorage.getItem("lxIntro") === "1";
  } catch {
    return false;
  }
};

function useSubscribe(source: string) {
  const [msg, setMsg] = useState("");
  const mut = useMutation({
    mutationFn: (email: string) =>
      api.post("/public/newsletter/subscribe", { email, source }),
    onSuccess: () =>
      setMsg("Thank you. You are now on the Boardroom Bytes Newsletter list."),
    onError: () =>
      setMsg("We could not subscribe you right now. Please try again shortly."),
  });
  return {
    msg,
    pending: mut.isPending,
    submit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const email = (new FormData(form).get("email") as string | null)?.trim();
      if (!email) return;
      setMsg("");
      mut.mutate(email, { onSuccess: () => form.reset() });
    },
  };
}

function CtaBand({ heading, sub }: { heading: string; sub: string }) {
  const ref = useRef<HTMLElement>(null);
  const subscribe = useSubscribe("website-cta");
  useLayoutEffect(() => {
    if (!ref.current) return;
    return initView(ref.current, {
      navigate: () => {},
      playing: () => true,
      onPlay: () => () => {},
      hash: "",
    });
  }, []);
  return (
    <section className="cta" id="contact" ref={ref}>
      <div className="aurora" aria-hidden="true">
        <div className="kaleido" />
      </div>
      <div className="wrap">
        <div className="cta-row rv">
          <div>
            <h2>{heading}</h2>
            <p>{sub}</p>
          </div>
          <div className="ctas" style={{ animation: "none" }}>
            <Link className="btn btn-white magnet" to="/contact">
              Get in touch <span className="arr">&#8594;</span>
            </Link>
            <Link className="btn btn-gold magnet" to="/contact?topic=demo">
              Book a demo <span className="arr">&#8594;</span>
            </Link>
          </div>
        </div>
        <div className="news rv" style={{ ["--d" as string]: ".15s" }}>
          <div>
            <h3>Run your enterprise on Lexora.</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,.9)" }}>
              Book a demo to see the platform in action, or subscribe to the
              Boardroom Bytes Newsletter for governance insight from across the
              continent.
            </p>
          </div>
          <div>
            <form className="sub-form" onSubmit={subscribe.submit}>
              <label className="sr" htmlFor="lx-cta-email">
                Email address
              </label>
              <input
                id="lx-cta-email"
                name="email"
                type="email"
                required
                placeholder="Your email address"
              />
              <button
                className="btn btn-white"
                type="submit"
                disabled={subscribe.pending}
              >
                {subscribe.pending
                  ? "Subscribing"
                  : "Subscribe to Boardroom Bytes"}
              </button>
            </form>
            <div className="thanks" role="status">
              {subscribe.msg}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    return initView(ref.current, {
      navigate: () => {},
      playing: () => true,
      onPlay: () => () => {},
      hash: "",
    });
  }, []);
  return (
    <footer id="footer" ref={ref}>
      <div className="wrap">
        <div className="fgrid">
          <div className="rv">
            <img src="/site/img/f493b9ff68.png" alt="Lexora Africa" />
            <p className="about">
              Governance, risk, and compliance platform built from first
              principles for African businesses.
            </p>
          </div>
          <div className="fcol rv" style={{ ["--d" as string]: ".05s" }}>
            <h4>Platform</h4>
            <Link to="/platform#modules">Lexora AML/KYC</Link>
            <Link to="/platform#modules">Lexora Projects</Link>
            <Link to="/platform#modules">Lexora Finance</Link>
            <Link to="/platform#modules">Lexora GRC</Link>
            <Link to="/platform#modules">Lexora HR</Link>
            <Link to="/#healthscore">GRC Health Score</Link>
          </div>
          <div className="fcol rv" style={{ ["--d" as string]: ".1s" }}>
            <h4>Industries</h4>
            <Link to="/industries#ind-ps">Professional services</Link>
            <Link to="/industries#ind-fs">Financial services</Link>
            <Link to="/industries#ind-fund">Fund managers</Link>
            <Link to="/industries#ind-mfg">Manufacturing</Link>
            <Link to="/industries">All industries</Link>
          </div>
          <div className="fcol rv" style={{ ["--d" as string]: ".15s" }}>
            <h4>Services</h4>
            <Link to="/advisory#adv-services">Advisory</Link>
            <Link to="/advisory#adv-training">Training</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/contact?topic=partner">Partners</Link>
            <Link to="/about">About</Link>
          </div>
          <div className="fcol rv" style={{ ["--d" as string]: ".2s" }}>
            <h4>Connect</h4>
            <Link to="/contact">Get in touch</Link>
            <Link to="/insights">Insights</Link>
            <Link to="/events">Events</Link>
            <Link className="lx-flink" to="/login">
              Launch app
            </Link>
          </div>
        </div>
        <div className="fbot">
          <span>&#169; 2026 Lexora Africa (Limited). All rights reserved.</span>
          <div className="contact">
            <a href="mailto:support@lexoraafrica.com">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              support@lexoraafrica.com
            </a>
            <span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 21V5l8-3v19M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M2 21h20" />
              </svg>
              Kigali, Rwanda
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function IntroOverlay({
  onPlay,
  onDone,
}: {
  onPlay: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return runIntro(ref.current, { onPlay, onDone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      className="intro"
      id="intro"
      role="dialog"
      aria-label="Your business has a heartbeat. Lexora keeps it healthy. Governance, Risk, Compliance, Advisory, Technology."
      ref={ref}
    >
      <div className="ih t" />
      <div className="ih b" />
      <canvas className="icv" id="icv" />
      <span className="wm">LEXORA AFRICA</span>
      <span className="live">
        <i id="liveDot" />
        LIVE
      </span>
      <div className="ic">
        <div className="ttl" id="ttl">
          <div className="l1" id="l1">
            Your business has a heartbeat.
          </div>
          <span className="l2">Lexora keeps it healthy.</span>
        </div>
        <div className="gw" id="gw">
          <span>Governance</span>
          <i />
          <span>Risk</span>
          <i />
          <span>Compliance</span>
          <i />
          <span>Advisory</span>
          <i />
          <span>Technology</span>
        </div>
      </div>
      <button className="skip" id="skip" type="button">
        Skip intro
      </button>
    </div>
  );
}

export default function SiteLayout() {
  const { pathname } = useLocation();
  const view = viewForPath(pathname);

  // The intro plays once per browser session, on the home page only.
  const [showIntro, setShowIntro] = useState(
    () => pathname === "/" && !prefersReducedMotion() && !seenIntro(),
  );
  const [playing, setPlaying] = useState(!showIntro);
  const playingRef = useRef(!showIntro);
  const cbs = useRef(new Set<() => void>());

  const onPlayCb = useCallback((cb: () => void) => {
    cbs.current.add(cb);
    return () => {
      cbs.current.delete(cb);
    };
  }, []);
  const firePlay = useCallback(() => {
    playingRef.current = true;
    setPlaying(true);
    document.documentElement.style.overflow = "";
    cbs.current.forEach((cb) => cb());
    cbs.current.clear();
  }, []);
  const ctx = useMemo<SiteCtx>(
    () => ({ playing: () => playingRef.current, onPlay: onPlayCb }),
    [onPlayCb],
  );

  // lock scroll while the intro runs
  useEffect(() => {
    if (showIntro) document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [showIntro]);

  // site-wide chrome: fonts, page background, smooth scrolling, title
  useEffect(() => {
    if (!document.querySelector("link[data-lx-fonts]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONT_HREF;
      l.setAttribute("data-lx-fonts", "1");
      document.head.appendChild(l);
    }
    const prevBg = document.body.style.background;
    const prevSmooth = document.documentElement.style.scrollBehavior;
    document.body.style.background = "#0E1A33";
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.body.style.background = prevBg;
      document.documentElement.style.scrollBehavior = prevSmooth;
    };
  }, []);
  useEffect(() => {
    const t = view?.title;
    document.title =
      t && t !== "Home"
        ? `${t} | Lexora Africa`
        : "Lexora Africa | Governance, Risk and Compliance Platform";
  }, [view]);

  // scroll progress bar, nav background and the soft cursor glow
  const navRef = useRef<HTMLElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      if (progRef.current) progRef.current.style.transform = `scaleX(${p})`;
      navRef.current?.classList.toggle("scrolled", h.scrollTop > 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let gx = mx;
    let gy = my;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    if (!prefersReducedMotion()) {
      window.addEventListener("mousemove", onMove);
      const loop = () => {
        gx += (mx - gx) * 0.12;
        gy += (my - gy) * 0.12;
        if (glowRef.current)
          glowRef.current.style.transform = `translate(${gx}px,${gy}px)`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // new page: back to the top (hash targets are scrolled to by the page)
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  // mobile menu
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("lx-menu-open", menu);
    return () => document.documentElement.classList.remove("lx-menu-open");
  }, [menu]);

  const cta = view?.noCta
    ? null
    : {
        heading: view?.cta ?? "Start building your governance infrastructure",
        sub: view?.sub ?? "See how Lexora fits your organisation.",
      };

  return (
    <Ctx.Provider value={ctx}>
      <div className={`lxsite js${playing ? " play" : ""}`}>
        {showIntro && (
          <IntroOverlay
            onPlay={firePlay}
            onDone={() => window.setTimeout(() => setShowIntro(false), 1100)}
          />
        )}
        <div className="grain" aria-hidden="true" />
        <div className="progress" id="progress" ref={progRef} />
        <div
          className="cursor-glow"
          id="glow"
          aria-hidden="true"
          ref={glowRef}
        />

        <header className="nav" id="nav" ref={navRef}>
          <div className="nav-in">
            <Link className="logo" to="/" aria-label="Lexora Africa home">
              <img
                src="/site/img/f493b9ff68.png"
                alt="Lexora Africa: Governance, Risk, Compliance, Beyond"
              />
            </Link>
            <nav className="links" aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={n.match(pathname) ? "active" : undefined}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="nav-cta">
              <Link className="btn btn-sm lx-launch" to="/login">
                <span className="lx-live" />
                Launch app <span className="arr">&#8594;</span>
              </Link>
              <Link className="btn btn-violet btn-sm" to="/contact">
                Get in touch
              </Link>
              <button
                type="button"
                className="burger"
                aria-label={menu ? "Close menu" : "Open menu"}
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
          <nav className={`mnav${menu ? " open" : ""}`} aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={n.match(pathname) ? "active" : undefined}
              >
                {n.label}
              </Link>
            ))}
            <Link to="/login" className="mnav-app">
              Launch app &#8594;
            </Link>
            <Link to="/contact" className="mnav-cta">
              Get in touch
            </Link>
          </nav>
        </header>

        <main>
          <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
            <Outlet />
          </Suspense>
          {cta && (
            <CtaBand key={pathname} heading={cta.heading} sub={cta.sub} />
          )}
        </main>
        <Footer />
      </div>
    </Ctx.Provider>
  );
}
