import {
  $,
  $$,
  Cleanup,
  combine,
  countTo,
  everyWhileVisible,
  listen,
  loop,
  once,
  prefersReducedMotion,
  trackVisible,
} from "./core";
import { initDots, initField } from "./field";
import { initGlobe } from "./globe";

// Page behaviours. The marketing pages are static HTML views (see
// src/site/views); this file brings them to life. Every function looks for
// its markup inside `root` and quietly does nothing when it is absent, so one
// initView() call serves every page. Everything returns a cleanup.

export interface ViewCtx {
  /** SPA navigation (used by the industries ring). */
  navigate: (to: string) => void;
  /** True once the intro has finished (or was skipped). */
  playing: () => boolean;
  /** Subscribe to the moment the intro opens onto the page. */
  onPlay: (cb: () => void) => Cleanup;
  /** Current location hash without the leading #. */
  hash: string;
}

const reduce = () => prefersReducedMotion();

// --------------------------------------------------------------------------
// scroll reveal (adds .in) and the counters that hang off it
// --------------------------------------------------------------------------
function initReveal(root: HTMLElement): Cleanup {
  const targets = $$(
    root,
    ".rv,.rv-l,.rv-r,.rv-z,#hs,.sstats,.gvis,.msl,.mc,.vltv,.grv,.fnv,.msl",
  );
  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.classList.add("in");
        io.unobserve(el);
        // once the entrance transition is over, interactive cards (tilt)
        // switch to their fast hover transition
        if (el.classList.contains("tilt")) {
          window.setTimeout(() => el.classList.add("rvd"), 1500);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  );
  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

function fmtNum(n: number, dec: number) {
  return dec ? n.toFixed(dec) : Math.round(n).toLocaleString("en-US");
}

function initCounters(root: HTMLElement): Cleanup {
  const offs: Cleanup[] = [];
  const r = reduce();

  // sector hero stat tiles: data-pre / data-to / data-suf / data-dec
  $$(root, ".sstats").forEach((box) => {
    offs.push(
      once(
        box,
        () => {
          $$(box, ".sst-v").forEach((v) => {
            const to = v.dataset.to;
            if (!to) return;
            const n = parseFloat(to);
            const dec = +(v.dataset.dec || 0);
            const pre = v.dataset.pre || "";
            const suf = v.dataset.suf || "";
            offs.push(
              countTo(
                n,
                1600,
                (x) => (v.textContent = pre + fmtNum(x, dec) + suf),
                r,
              ),
            );
          });
        },
        0.2,
      ),
    );
  });

  // ESG counter, value / trust-ledger and growth counters
  $$(root, ".esg-n").forEach((n) =>
    offs.push(
      once(
        n,
        () => {
          offs.push(
            countTo(
              +(n.dataset.to || 0),
              1800,
              (v) => (n.textContent = String(Math.round(v))),
              r,
            ),
          );
        },
        0.4,
      ),
    ),
  );
  const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
  $$(root, ".vltv,.grv,.fnv").forEach((box) =>
    offs.push(
      once(
        box,
        () => {
          $$(box, ".vl-amt").forEach((a, i) =>
            offs.push(
              countTo(
                +(a.dataset.to || 0),
                1500,
                (v) => (a.textContent = money(v)),
                r,
                200 + i * 150,
              ),
            ),
          );
          $$(box, ".vl-tot").forEach((a) =>
            offs.push(
              countTo(
                +(a.dataset.to || 0),
                2200,
                (v) => (a.textContent = money(v)),
                r,
                500,
              ),
            ),
          );
          $$(box, ".gr-n").forEach((a) =>
            offs.push(
              countTo(
                +(a.dataset.to || 0),
                2200,
                (v) => (a.textContent = String(Math.round(v))),
                r,
              ),
            ),
          );
        },
        0.3,
      ),
    ),
  );
  return combine(offs);
}

// --------------------------------------------------------------------------
// pointer effects
// --------------------------------------------------------------------------
function initTilt(root: HTMLElement): Cleanup {
  if (reduce()) return () => {};
  const offs: Cleanup[] = [];
  const pricing = !!$(root, "#plans");
  const rx = pricing ? 6 : 8;
  const ry = pricing ? 8 : 10;
  $$(root, ".tilt,#plans .mc,.mgrid .mc").forEach((c) => {
    offs.push(
      listen(c, "mousemove", (e: MouseEvent) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateX(${-y * rx}deg) rotateY(${x * ry}deg) translateY(-8px)`;
      }),
      listen(c, "mouseleave", () => {
        c.style.transform = "";
      }),
    );
  });
  return combine(offs);
}

function initMagnet(root: HTMLElement): Cleanup {
  if (reduce()) return () => {};
  const offs: Cleanup[] = [];
  $$(root, ".magnet").forEach((b) => {
    offs.push(
      listen(b, "mousemove", (e: MouseEvent) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      }),
      listen(b, "mouseleave", () => {
        b.style.transform = "";
      }),
    );
  });
  return combine(offs);
}

function initHeroParallax(root: HTMLElement): Cleanup {
  const hero = $(root, ".hero");
  const paras = $$(root, ".para");
  if (!hero || !paras.length || reduce()) return () => {};
  return listen(hero, "mousemove", (e: MouseEvent) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    paras.forEach((p) => {
      const d = +(p.dataset.depth || 0);
      p.style.transform = `translate(${x * d}px,${y * d}px)`;
    });
  });
}

// --------------------------------------------------------------------------
// canvases + decorative dots
// --------------------------------------------------------------------------
function initCanvases(root: HTMLElement): Cleanup {
  const offs: Cleanup[] = [];
  $$<HTMLCanvasElement>(root, "canvas.stars").forEach((cv) => {
    const n =
      cv.id === "stars" ||
      cv.id === "evStars" ||
      cv.id === "advstars" ||
      cv.id === "gtStars"
        ? 80
        : 70;
    const host =
      (cv.closest("section") as HTMLElement | null) ?? cv.parentElement;
    offs.push(initField(cv, n, host));
  });
  $$(root, ".dots").forEach((d) => offs.push(initDots(d, 44)));
  const globe = $<HTMLCanvasElement>(root, "#globe");
  if (globe) offs.push(initGlobe(globe));
  return combine(offs);
}

// --------------------------------------------------------------------------
// home: typed headline, typed trio, health score, gauge
// --------------------------------------------------------------------------
function typeInto(
  el: HTMLElement,
  text: string,
  speed: number,
  done: (caret: HTMLElement) => void,
) {
  let i = 0;
  let stopped = false;
  const caret = document.createElement("span");
  caret.className = "caret";
  el.textContent = "";
  el.appendChild(caret);
  const step = () => {
    if (stopped) return;
    if (i < text.length) {
      caret.insertAdjacentText("beforebegin", text[i++]);
      window.setTimeout(step, speed);
    } else done(caret);
  };
  step();
  return () => {
    stopped = true;
  };
}

function initHome(root: HTMLElement, ctx: ViewCtx): Cleanup {
  const offs: Cleanup[] = [];
  const timers: number[] = [];
  const r = reduce();
  const hero = $(root, ".hero");

  // hero headline: characters fade in one by one behind a blinking caret.
  // The characters are wrapped (and hidden) straight away so there is no flash
  // of the full headline; typing itself waits for the intro to open.
  const h = $(root, "#headline");
  const chars: HTMLElement[] = [];
  if (h && !r) {
    const wrap = (node: Node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const f = document.createDocumentFragment();
          (n.textContent || "").split("").forEach((ch) => {
            const s = document.createElement("span");
            s.className = "tw-c";
            s.textContent = ch;
            f.appendChild(s);
            chars.push(s);
          });
          n.parentNode?.replaceChild(f, n);
        } else wrap(n);
      });
    };
    wrap(h);
  }
  const startTyping = () => {
    hero?.classList.add("play");
    if (!chars.length) return;
    const caret = document.createElement("span");
    caret.className = "caret";
    let k = 0;
    const step = () => {
      if (k < chars.length) {
        const c = chars[k++];
        c.classList.add("on");
        c.parentNode?.insertBefore(caret, c.nextSibling);
        timers.push(
          window.setTimeout(
            step,
            c.textContent === " " ? 30 : 55 + Math.random() * 40,
          ),
        );
      }
    };
    timers.push(window.setTimeout(step, 450));
  };
  if (ctx.playing()) startTyping();
  else offs.push(ctx.onPlay(startTyping));

  // "Governance / Risk / Compliance" trio typewriter
  const trio = $(root, "#trio");
  if (trio) {
    const tps = $$(trio, ".tp");
    const go = () => {
      let idx = 0;
      const next = () => {
        if (idx >= tps.length) return;
        const tp = tps[idx];
        const b = tp.querySelector("b") as HTMLElement;
        tp.classList.add("on");
        if (r) {
          b.textContent = b.dataset.t || "";
          idx++;
          next();
          return;
        }
        typeInto(b, b.dataset.t || "", 85, (caret) => {
          timers.push(
            window.setTimeout(() => {
              if (idx < tps.length) caret.remove();
            }, 350),
          );
          idx++;
          timers.push(window.setTimeout(next, 250));
        });
      };
      next();
    };
    offs.push(once(trio, go, 0.4));
  }

  // GRC health score count-up
  const hs = $(root, "#hs");
  const sn = $(root, "#scoreNum");
  if (hs && sn) {
    offs.push(
      once(hs, () => {
        if (r) {
          sn.textContent = "76";
          return;
        }
        offs.push(
          countTo(
            76,
            2400,
            (v) => (sn.textContent = String(Math.round(v))),
            false,
            300,
          ),
        );
      }),
    );
  }

  // looping needle gauge
  const g = $(root, ".gauge");
  if (g) {
    const f = g.querySelector<SVGElement>(".gfill");
    const n = g.querySelector<HTMLElement>(".needle");
    const tx = g.querySelector<SVGTextElement | HTMLElement>(".gnum");
    const L = 81.7;
    const set = (v: number) => {
      if (f) f.style.strokeDashoffset = (L * (1 - v / 100)).toFixed(2);
      if (n)
        n.style.transform = `rotate(${(-90 + (180 * v) / 100).toFixed(1)}deg)`;
      if (tx) tx.textContent = Math.round(v) + "%";
    };
    if (r) set(95);
    else {
      const vis = trackVisible(g);
      const t0 = performance.now();
      offs.push(
        vis.stop,
        loop((ts) => {
          if (!vis.get()) return;
          const c = ((ts - t0) / 1000) % 6;
          let v: number;
          if (c < 2.6) v = 95 * (1 - Math.pow(1 - c / 2.6, 3));
          else if (c < 5.2) v = 95 + Math.sin((c - 2.6) * 6) * 0.6;
          else v = 95 * (1 - (c - 5.2) / 0.8);
          set(Math.max(0, v));
        }),
      );
    }
  }

  return () => {
    timers.forEach(clearTimeout);
    offs.forEach((f) => f());
  };
}

// --------------------------------------------------------------------------
// platform: feature tiles fly-in, module tabs + screenshots
// --------------------------------------------------------------------------
function initFeatureTiles(root: HTMLElement): Cleanup {
  const feat = $(root, "#feat");
  if (!feat) return () => {};
  $$(feat, ".ft").forEach((el, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const side = (col - 3) / 3;
    el.style.setProperty(
      "--fx",
      `${side * 420 + (Math.random() * 120 - 60)}px`,
    );
    el.style.setProperty(
      "--fy",
      `${(row - 1) * 220 - 160 + (Math.random() * 80 - 40)}px`,
    );
    el.style.setProperty("--fz", `${900 + Math.random() * 700}px`);
    el.style.setProperty("--rx", `${Math.random() * 70 - 35}deg`);
    el.style.setProperty("--ry", `${-side * 55}deg`);
    el.style.setProperty("--fr", `${Math.random() * 30 - 15}deg`);
    const order = Math.abs(col - 3) * 2 + row;
    el.style.setProperty(
      "--fd",
      `${(order * 0.09 + Math.random() * 0.12).toFixed(2)}s`,
    );
    el.style.setProperty("--gd", `${i * 0.21}s`);
  });
  return once(feat, () => feat.classList.add("in"), 0.3);
}

function initTabs(root: HTMLElement): Cleanup {
  const tabs = $$(root, ".tab");
  const panes = $$(root, ".pane");
  const ind = $(root, "#tabInd");
  const stages = $$(root, ".stage5");
  if (!tabs.length || !ind) return () => {};
  let cur = 0;
  const moveInd = () => {
    const b = tabs[cur];
    if (!b || !b.offsetWidth) return;
    ind.style.width = b.offsetWidth + "px";
    ind.style.transform = `translate(${b.offsetLeft - 7}px,${b.offsetTop - 7}px)`;
  };
  const showShot = () =>
    stages.forEach((s) =>
      s.classList.toggle("on", +(s.dataset.p || 0) === cur),
    );
  const go = (i: number) => {
    if (i === cur) return;
    tabs[cur].classList.remove("on");
    tabs[cur].setAttribute("aria-selected", "false");
    panes[cur].classList.remove("on");
    cur = i;
    tabs[i].classList.add("on");
    tabs[i].setAttribute("aria-selected", "true");
    panes[i].classList.add("on");
    moveInd();
    showShot();
  };
  const offs: Cleanup[] = [];
  tabs.forEach((b, i) => offs.push(listen(b, "click", () => go(i))));
  offs.push(listen(window, "resize", moveInd));
  setTimeout(moveInd, 40);
  (document as any).fonts?.ready?.then(moveInd);
  const mods = $(root, "#modules");
  if (mods) offs.push(once(mods, showShot, 0.25));
  // screenshot parallax follows the pointer
  const sw = $(root, "#stagewrap");
  if (sw && !reduce()) {
    offs.push(
      listen(sw, "mousemove", (e: MouseEvent) => {
        const r = sw.getBoundingClientRect();
        sw.style.setProperty(
          "--mx",
          ((e.clientX - r.left) / r.width - 0.5).toFixed(3),
        );
        sw.style.setProperty(
          "--my",
          ((e.clientY - r.top) / r.height - 0.5).toFixed(3),
        );
      }),
      listen(sw, "mouseleave", () => {
        sw.style.setProperty("--mx", "0");
        sw.style.setProperty("--my", "0");
      }),
    );
  }
  return combine(offs);
}

// --------------------------------------------------------------------------
// pricing: billing toggle, animated prices, team-size slider, FAQ
// --------------------------------------------------------------------------
function initPricing(root: HTMLElement): Cleanup {
  const range = $<HTMLInputElement>(root, "#szR");
  if (!range) return () => {};
  const offs: Cleanup[] = [];
  const r = reduce();
  const bts = $$(root, ".bt");
  const bi = $(root, "#billInd");
  const amts = $$(root, ".amt");
  const n = $(root, "#szN");
  const f = $(root, "#szF");
  const rec = $(root, "#szRec");
  const plans = $$(root, ".plan");
  let annual = false;

  const moveBill = () => {
    const b = $(root, ".bt.on");
    if (!b || !bi || !b.offsetWidth) return;
    bi.style.width = b.offsetWidth + "px";
    bi.style.transform = `translateX(${b.offsetLeft - 6}px)`;
  };
  const roll = (el: HTMLElement, to: number) => {
    const from = +(el.textContent || "").replace(/[^0-9]/g, "") || 0;
    if (r) {
      el.textContent = String(to);
      return;
    }
    el.classList.add("roll");
    let t0: number | null = null;
    const s = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 650);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(s);
      else el.classList.remove("roll");
    };
    requestAnimationFrame(s);
  };
  const updateRec = () => {
    const v = +range.value;
    const pct = (v - 1) / (+range.max - 1);
    if (f) f.style.width = `calc(${pct * 100}% - ${pct * 28 - 14}px)`;
    if (n) n.textContent = v >= 40 ? "40+" : String(v);
    const pick =
      plans.find((p) => v <= +(p.dataset.max || 0)) || plans[plans.length - 1];
    plans.forEach((p) => p.classList.toggle("rec", p === pick));
    const nm = pick.querySelector(".pname")?.textContent || "";
    const am = pick.querySelector<HTMLElement>(".amt");
    if (rec) {
      const price = am
        ? `${annual ? Math.round(+(am.dataset.m || 0) * 0.8) : am.dataset.m}`
        : "";
      rec.innerHTML = `Recommended for you: <b>${nm}</b>${am ? ` at <b>$${price}/month</b>` : ", with tailored terms"}`;
    }
  };
  const setBill = (a: boolean) => {
    annual = a;
    bts.forEach((b) => b.classList.toggle("on", (b.dataset.b === "a") === a));
    moveBill();
    amts.forEach((el) => {
      const m = +(el.dataset.m || 0);
      const v = a ? Math.round(m * 0.8) : m;
      roll(el, v);
      const note = el.closest(".plan")?.querySelector(".annual-note");
      if (note)
        note.textContent = a
          ? `Billed annually: $${(v * 12).toLocaleString("en-US")} per year, excl. VAT`
          : "";
    });
    plans.forEach((p) => p.classList.toggle("annual", a));
    updateRec();
  };
  bts.forEach((b) =>
    offs.push(listen(b, "click", () => setBill(b.dataset.b === "a"))),
  );
  offs.push(
    listen(window, "resize", moveBill),
    listen(range, "input", updateRec),
  );
  setTimeout(moveBill, 40);
  (document as any).fonts?.ready?.then(moveBill);
  updateRec();

  // FAQ accordion (one open at a time)
  $$(root, ".qa").forEach((q) => {
    const b = q.querySelector<HTMLButtonElement>(".qb");
    if (!b) return;
    offs.push(
      listen(b, "click", () => {
        const o = !q.classList.contains("open");
        $$(root, ".qa.open").forEach((x) => {
          x.classList.remove("open");
          x.querySelector(".qb")?.setAttribute("aria-expanded", "false");
        });
        if (o) {
          q.classList.add("open");
          b.setAttribute("aria-expanded", "true");
        }
      }),
    );
  });
  return combine(offs);
}

// --------------------------------------------------------------------------
// industries: sector explorer + the 3D ring of cards
// --------------------------------------------------------------------------
function initIndustries(root: HTMLElement, ctx: ViewCtx): Cleanup {
  const items = $$<HTMLButtonElement>(root, ".ix");
  const panes = $$(root, ".ip");
  const list = $(root, ".ixl");
  const pan = $(root, "#ipanel");
  if (!items.length || !panes.length || !pan) return () => {};
  const offs: Cleanup[] = [];
  const r = reduce();
  const DUR = 7000;
  let cur = 0;
  let timer: number | undefined;
  let inView = false;

  const sel = (i: number, user = false) => {
    cur = (i + items.length) % items.length;
    items.forEach((b, k) => b.classList.toggle("on", k === cur));
    panes.forEach((p, k) => p.classList.toggle("on", k === cur));
    const bar = items[cur].querySelector<HTMLElement>(".ix-bar i");
    if (bar) {
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    }
    if (window.innerWidth < 1000) {
      // horizontal chip row on small screens: keep the active chip in view
      items[cur].scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }
    clearTimeout(timer);
    const dur = user ? DUR * 1.6 : DUR;
    items[cur].style.setProperty("--dur", dur + "ms");
    if (!r) {
      timer = window.setTimeout(() => {
        if (inView) sel(cur + 1);
      }, dur);
    }
  };
  items.forEach((b, i) => offs.push(listen(b, "click", () => sel(i, true))));
  offs.push(
    listen(pan, "mouseenter", () => {
      list?.classList.add("paused");
      clearTimeout(timer);
    }),
    listen(pan, "mouseleave", () => {
      list?.classList.remove("paused");
      sel(cur);
    }),
  );
  const vis = trackVisible(
    pan,
    (v) => {
      inView = v;
      if (v) sel(cur);
      else clearTimeout(timer);
    },
    "0px",
  );
  offs.push(vis.stop, () => clearTimeout(timer));

  // deep link: /industries#ind-fs selects that sector and scrolls to it
  if (ctx.hash.startsWith("ind-")) {
    const k = items.findIndex((b) => b.id === ctx.hash);
    if (k >= 0) {
      sel(k, true);
      setTimeout(
        () =>
          $(root, "#sectors")?.scrollIntoView({
            behavior: r ? "auto" : "smooth",
          }),
        60,
      );
    }
  }

  // 3D carousel ring
  const ring = $(root, "#ring");
  if (ring) {
    const cards = $$<HTMLButtonElement>(ring, ".rc");
    const N = cards.length;
    let ang = 0;
    let hover = false;
    let R = 0;
    const spd = r ? 0 : 7;
    cards.forEach((c) =>
      offs.push(
        listen(c, "click", () => {
          const id = items[+(c.dataset.go || 0)]?.id;
          if (id) {
            sel(+(c.dataset.go || 0), true);
            $(root, "#sectors")?.scrollIntoView({
              behavior: r ? "auto" : "smooth",
            });
          }
        }),
      ),
    );
    offs.push(
      listen(ring, "mouseenter", () => (hover = true)),
      listen(ring, "mouseleave", () => (hover = false)),
    );
    const layout = () => {
      const w = cards[0]?.offsetWidth || 260;
      R = Math.round((w + 40) / (2 * Math.tan(Math.PI / N)));
    };
    layout();
    offs.push(listen(window, "resize", layout));
    const rv = trackVisible(ring, undefined, "200px");
    offs.push(rv.stop);
    let last = performance.now();
    offs.push(
      loop((now) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!rv.get()) return;
        if (!hover) ang = (ang + spd * dt) % 360;
        ring.style.transform = `translateZ(${-R}px) rotateX(-8deg) rotateY(${-ang}deg)`;
        cards.forEach((c, i) => {
          const a = (i * 360) / N;
          const rel = ((((a - ang) % 360) + 540) % 360) - 180;
          const f = Math.cos((rel * Math.PI) / 180);
          c.style.transform = `rotateY(${a}deg) translateZ(${R}px)`;
          c.style.opacity = (
            0.18 +
            0.82 * Math.max(0, (f + 0.35) / 1.35)
          ).toFixed(3);
          c.style.filter = `brightness(${(0.45 + 0.55 * Math.max(0, f)).toFixed(3)})`;
          c.style.pointerEvents = f > 0.3 ? "auto" : "none";
          c.style.zIndex = String(Math.round(f * 100));
        });
      }),
    );
  }
  return combine(offs);
}

// --------------------------------------------------------------------------
// advisory: auto-advancing image accordion
// --------------------------------------------------------------------------
function initAdvisory(root: HTMLElement): Cleanup {
  const acc = $(root, "#axAcc");
  const dw = $(root, "#axDots");
  if (!acc || !dw) return () => {};
  const r = reduce();
  const ps = $$<HTMLElement>(acc, ".ax-p");
  const DUR = 5200;
  let ai = 0;
  let tmr: number | undefined;
  let hold = false;
  let inView = true;
  acc.style.setProperty("--axd", DUR + "ms");
  const offs: Cleanup[] = [];
  const dots = ps.map((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", p.querySelector("strong")?.textContent || "");
    offs.push(listen(b, "click", () => act(i)));
    dw.appendChild(b);
    return b;
  });
  const sched = () => {
    clearTimeout(tmr);
    if (r || hold) return;
    tmr = window.setTimeout(() => {
      if (inView) act(ai + 1);
      else sched();
    }, DUR);
  };
  function act(i: number) {
    ai = (i + ps.length) % ps.length;
    ps.forEach((p, k) => {
      p.classList.toggle("on", k === ai);
      p.classList.remove("run");
    });
    dots.forEach((d, k) => d.classList.toggle("on", k === ai));
    void ps[ai].offsetWidth;
    if (!r) ps[ai].classList.add("run");
    sched();
  }
  ps.forEach((p, i) => {
    offs.push(
      listen(p, "mouseenter", () => {
        if (i !== ai) act(i);
      }),
      listen(p, "focus", () => act(i)),
    );
    // touch: first tap opens the panel, second tap follows the link
    let touched = false;
    offs.push(
      listen(p, "pointerdown", (ev: PointerEvent) => {
        touched = ev.pointerType !== "mouse" && !p.classList.contains("on");
      }),
      listen(p, "click", (ev: MouseEvent) => {
        if (touched) {
          ev.preventDefault();
          touched = false;
          act(i);
        }
      }),
    );
  });
  offs.push(
    listen(acc, "mouseenter", () => {
      hold = true;
      acc.classList.add("hold");
      clearTimeout(tmr);
    }),
    listen(acc, "mouseleave", () => {
      hold = false;
      acc.classList.remove("hold");
      act(ai);
    }),
  );
  const vis = trackVisible(acc, (v) => (inView = v), "0px");
  offs.push(
    vis.stop,
    () => clearTimeout(tmr),
    () => dw.replaceChildren(),
  );
  act(0);
  return combine(offs);
}

// --------------------------------------------------------------------------
// sector page loops: contract lifecycle ring, SLA timers, stage ladders
// --------------------------------------------------------------------------
function initSectorLoops(root: HTMLElement): Cleanup {
  const offs: Cleanup[] = [];
  const r = reduce();

  // 360-degree contract lifecycle
  $$(root, ".cvis").forEach((cv) => {
    const nodes = $$(cv, ".cn");
    const prog = cv.querySelector<SVGElement>(".cprog");
    const lab = cv.querySelector<HTMLElement>(".cd-stage");
    if (!nodes.length || !prog || !lab) return;
    let i = 0;
    const N = nodes.length;
    const step = () => {
      nodes.forEach((n, k) => {
        n.classList.toggle("on", k === i);
        n.classList.toggle("done", k < i);
      });
      prog.setAttribute(
        "stroke-dasharray",
        `${(((i + 1) / N) * 100).toFixed(1)} 100`,
      );
      lab.textContent = nodes[i].textContent;
      cv.classList.toggle("sign", i >= 5);
      cv.classList.toggle("exec", i >= 6);
      i = (i + 1) % N;
    };
    step();
    if (!r) offs.push(everyWhileVisible(cv, 1500, step));
  });

  // SLA countdown tickets
  $$(root, ".tk").forEach((tk, i) => {
    const D = +(tk.dataset.dur || 60);
    const f = tk.querySelector<SVGElement>(".tf");
    const t = tk.querySelector<HTMLElement>(".tk-t");
    const s = tk.querySelector<HTMLElement>(".tk-s");
    if (!f || !t || !s) return;
    let left = D * (0.55 + 0.35 * Math.random());
    let hold = 0;
    const fmt = (x: number) => {
      const m = Math.floor(x / 60);
      const sc = Math.floor(x % 60);
      return (m < 10 ? "0" : "") + m + ":" + (sc < 10 ? "0" : "") + sc;
    };
    const draw = () => {
      const p = Math.max(0, left / D);
      f.setAttribute("stroke-dasharray", `${(p * 100).toFixed(1)} 100`);
      t.textContent = fmt(left * 20) + " remaining";
    };
    draw();
    if (r) return;
    offs.push(
      everyWhileVisible(tk, 100, () => {
        if (hold > 0) {
          hold -= 0.1;
          if (hold <= 0) {
            left = D;
            tk.classList.remove("done", "warn");
            s.textContent = "On track";
          }
          return;
        }
        left -= 0.1;
        if (left < D * 0.3 && !tk.classList.contains("warn")) {
          tk.classList.add("warn");
          s.textContent = "Escalating";
        }
        if (left <= D * (0.12 + (0.1 * ((i * 7) % 3)) / 2)) {
          tk.classList.remove("warn");
          tk.classList.add("done");
          s.textContent = "Resolved";
          hold = 2.6;
        }
        draw();
      }),
    );
  });

  // deal journey ladder
  $$(root, ".jv").forEach((jv) => {
    const st = $$(jv, ".jst");
    const fill = jv.querySelector<HTMLElement>(".jv-fill");
    const lab = jv.querySelector<HTMLElement>("#jvStage");
    if (!st.length || !fill) return;
    let i = 0;
    const step = () => {
      st.forEach((s, k) => {
        s.classList.toggle("on", k === i);
        s.classList.toggle("done", k < i);
      });
      fill.style.height = st[i].offsetTop - st[0].offsetTop + "px";
      if (lab) lab.textContent = st[i].textContent;
      i = (i + 1) % st.length;
    };
    step();
    if (!r) offs.push(everyWhileVisible(jv, 1700, step));
  });

  // certification checklist
  $$(root, ".crv").forEach((cv) => {
    const ms = $$(cv, ".cm");
    const pct = cv.querySelector<HTMLElement>("#crPct");
    if (!ms.length || !pct) return;
    if (r) {
      ms.forEach((m) => m.classList.add("done"));
      cv.classList.add("cert");
      pct.textContent = "100";
      return;
    }
    let i = 0;
    offs.push(
      everyWhileVisible(cv, 1300, () => {
        if (i > ms.length + 1) {
          ms.forEach((m) => m.classList.remove("done"));
          cv.classList.remove("cert");
          i = 0;
          pct.textContent = "0";
          return;
        }
        if (i < ms.length) {
          ms[i].classList.add("done");
          pct.textContent = String(Math.round(((i + 1) / ms.length) * 100));
        } else cv.classList.add("cert");
        i++;
      }),
    );
  });
  return combine(offs);
}

// --------------------------------------------------------------------------
// insights extras (static markup only; the live article grid is React)
// --------------------------------------------------------------------------
function initStaticInsights(root: HTMLElement): Cleanup {
  const offs: Cleanup[] = [];
  const chips = $$(root, ".chipf");
  const arts = $$(root, ".art");
  chips.forEach((c) =>
    offs.push(
      listen(c, "click", () => {
        chips.forEach((x) => x.classList.toggle("on", x === c));
        const f = c.dataset.f;
        arts.forEach((a) => a.classList.add("fade"));
        setTimeout(() => {
          arts.forEach((a) =>
            a.classList.toggle("hide", f !== "All" && a.dataset.cat !== f),
          );
          requestAnimationFrame(() =>
            arts.forEach((a) => a.classList.remove("fade")),
          );
        }, 300);
      }),
    ),
  );
  return combine(offs);
}

// --------------------------------------------------------------------------
// entry point
// --------------------------------------------------------------------------
export function initView(root: HTMLElement, ctx: ViewCtx): Cleanup {
  return combine([
    initReveal(root),
    initCounters(root),
    initTilt(root),
    initMagnet(root),
    initHeroParallax(root),
    initCanvases(root),
    initHome(root, ctx),
    initFeatureTiles(root),
    initTabs(root),
    initPricing(root),
    initIndustries(root, ctx),
    initAdvisory(root),
    initSectorLoops(root),
    initStaticInsights(root),
  ]);
}
