import { $, $$, Cleanup, combine, listen } from "./core";

// Opening sequence: a living heartbeat monitor draws across the screen, the
// five disciplines light up one per beat, then the screen splits open onto the
// hero. Runs once per browser session (the layout decides whether to mount it).

export function runIntro(
  root: HTMLElement,
  hooks: { onPlay: () => void; onDone: () => void },
): Cleanup {
  const cv = $<HTMLCanvasElement>(root, "#icv");
  if (!cv) {
    hooks.onPlay();
    hooks.onDone();
    return () => {};
  }
  const c = cv.getContext("2d");
  if (!c) {
    hooks.onPlay();
    hooks.onDone();
    return () => {};
  }

  // ---- shared state between the canvas loop and the timeline ----
  const st = {
    period: 0.9,
    flat: false,
    lineY: 0,
    onBeat: null as null | (() => void),
  };

  const D = Math.min(2, window.devicePixelRatio || 1);
  let W = 0;
  let H = 0;
  let nodes: { x: number; y: number; vx: number; vy: number }[] = [];
  const sz = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * D;
    cv.height = H * D;
    c.setTransform(D, 0, 0, D, 0, 0);
    nodes = [];
    for (let i = 0; i < 16; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
      });
    }
  };
  sz();

  const L = 320;
  const ecg = (u: number) => {
    u = ((u % L) + L) % L;
    const x = u / L;
    const g = (m: number, s: number, a: number) => {
      const d = (x - m) / s;
      return a * Math.exp(-d * d);
    };
    return (
      g(0.2, 0.03, 0.09) -
      g(0.285, 0.008, 0.14) +
      g(0.3, 0.009, 1) -
      g(0.318, 0.009, 0.32) +
      g(0.46, 0.045, 0.2)
    );
  };

  let head = -40;
  let last: number | null = null;
  let glow = 0;
  let lastBeat: number | null = null;
  let flat = 0;
  let running = true;
  let rafId = 0;

  const frame = (now: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const speed = L / st.period;
    head += speed * dt;
    if (head > W + 80) {
      head = -40;
      lastBeat = null;
    }
    const bi = Math.floor((head - L * 0.95) / L);
    if (head > 0 && head < W && lastBeat !== null && bi > lastBeat) {
      glow = 1;
      st.onBeat?.();
    }
    if (head > 0) lastBeat = bi;
    glow *= Math.pow(0.05, dt);
    if (st.flat) flat = Math.min(1, flat + dt * 3);

    const y0 = st.lineY || H * 0.55;
    const A = Math.min(64, H * 0.075) * (1 - flat);
    c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = "lighter";

    // breathing glow on every beat (violet, no more fuchsia)
    const rg = c.createRadialGradient(
      W / 2,
      y0,
      0,
      W / 2,
      y0,
      Math.max(W, H) * 0.6,
    );
    rg.addColorStop(0, `rgba(168,87,201,${(0.04 + 0.13 * glow).toFixed(3)})`);
    rg.addColorStop(0.35, `rgba(91,42,158,${(0.06 + 0.12 * glow).toFixed(3)})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = rg;
    c.fillRect(0, 0, W, H);

    // drifting connected points
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const d = Math.hypot(n.x - m.x, n.y - m.y);
        if (d < 240) {
          c.strokeStyle = `rgba(212,166,74,${(0.1 * (1 - d / 240)).toFixed(3)})`;
          c.lineWidth = 0.7;
          c.beginPath();
          c.moveTo(n.x, n.y);
          c.lineTo(m.x, m.y);
          c.stroke();
        }
      }
      c.fillStyle = "rgba(246,217,139,.35)";
      c.beginPath();
      c.arc(n.x, n.y, 1.4, 0, 6.283);
      c.fill();
    }

    // faint baseline that brightens when the heartbeat flat-lines
    const bl = c.createLinearGradient(0, 0, W, 0);
    bl.addColorStop(0, "rgba(212,166,74,0)");
    bl.addColorStop(
      0.5,
      `rgba(246,217,139,${(0.14 + 0.86 * flat).toFixed(3)})`,
    );
    bl.addColorStop(1, "rgba(212,166,74,0)");
    c.fillStyle = bl;
    c.fillRect(0, y0 - 0.6 - flat, W, 1.2 + flat * 2);
    if (flat > 0) {
      c.shadowColor = "rgba(255,200,100,1)";
      c.shadowBlur = 30 * flat;
      c.fillRect(0, y0 - 1, W, 2);
      c.shadowBlur = 0;
    }

    // the trace with a fading tail
    const tail = W * 0.6;
    const x0 = Math.max(0, head - tail);
    for (let pass = 0; pass < 2; pass++) {
      let prev: [number, number] | null = null;
      for (let x = x0; x <= Math.min(W, head); x += 2) {
        const y = y0 - ecg(x + L * 0.35) * A;
        if (prev) {
          let a = Math.max(0, 1 - (head - x) / tail);
          a *= a;
          c.strokeStyle = pass
            ? `rgba(255,240,205,${(a * 0.95).toFixed(3)})`
            : `rgba(255,170,60,${(a * (0.25 + 0.25 * glow)).toFixed(3)})`;
          c.lineWidth = pass ? 1.7 : 7;
          c.beginPath();
          c.moveTo(prev[0], prev[1]);
          c.lineTo(x, y);
          c.stroke();
        }
        prev = [x, y];
      }
    }
    if (head > 0 && head < W) {
      const hy = y0 - ecg(head + L * 0.35) * A;
      const r = 30 + 18 * glow;
      const hg = c.createRadialGradient(head, hy, 0, head, hy, r);
      hg.addColorStop(0, "rgba(255,252,235,1)");
      hg.addColorStop(0.18, "rgba(255,214,130,.7)");
      hg.addColorStop(1, "rgba(255,190,80,0)");
      c.fillStyle = hg;
      c.beginPath();
      c.arc(head, hy, r, 0, 6.283);
      c.fill();
    }
    c.globalCompositeOperation = "source-over";
  };
  rafId = requestAnimationFrame(frame);

  // ---- timeline ----
  const timers: number[] = [];
  const at = (ms: number, f: () => void) => {
    timers.push(window.setTimeout(f, ms));
  };

  const l1 = $<HTMLElement>(root, "#l1");
  const words: HTMLElement[] = [];
  if (l1) {
    const wl = (l1.textContent || "").split(" ");
    l1.textContent = "";
    wl.forEach((w, i) => {
      const s = document.createElement("span");
      s.textContent = w;
      l1.appendChild(s);
      if (i < wl.length - 1) l1.appendChild(document.createTextNode(" "));
      words.push(s);
    });
  }
  const ttl = $<HTMLElement>(root, "#ttl");
  const gw = $<HTMLElement>(root, "#gw");
  const placeLine = () => {
    if (!ttl || !gw) return;
    const a = ttl.getBoundingClientRect();
    const b = gw.getBoundingClientRect();
    st.lineY = (a.bottom + b.top) / 2;
  };
  placeLine();
  const offResize = combine([
    listen(window, "resize", () => {
      sz();
      placeLine();
    }),
  ]);

  const items = $$<HTMLElement>(root, "#gw span");
  const dots = $$<HTMLElement>(root, "#gw i");
  const liveDot = $<HTMLElement>(root, "#liveDot");
  let wi = 0;
  let armed = false;
  let ended = false;
  let fb: number | null = null;

  const finish = () => {
    armed = false;
    if (fb) clearInterval(fb);
    root.classList.add("s4");
    st.flat = true;
    at(420, () => {
      root.classList.add("open");
      hooks.onPlay();
    });
    at(1500, () => {
      running = false;
      cancelAnimationFrame(rafId);
      root.classList.add("done");
      try {
        sessionStorage.setItem("lxIntro", "1");
      } catch {
        /* storage can be blocked */
      }
      hooks.onDone();
    });
  };

  const nextWord = () => {
    if (wi >= items.length) return;
    if (wi > 0) dots[wi - 1]?.classList.add("on");
    items[wi].classList.add("on");
    wi++;
    st.period = Math.max(0.46, st.period - 0.08);
    if (wi === items.length && !ended) {
      ended = true;
      at(2200, finish);
    }
  };
  const resetFb = () => {
    if (fb) clearInterval(fb);
    fb = window.setInterval(() => {
      if (armed) nextWord();
    }, 1000);
  };
  st.onBeat = () => {
    if (liveDot) {
      liveDot.classList.remove("beat");
      void liveDot.offsetWidth;
      liveDot.classList.add("beat");
    }
    if (armed) {
      nextWord();
      resetFb();
    }
  };

  at(150, () => root.classList.add("s1"));
  words.forEach((s, i) => at(450 + i * 150, () => s.classList.add("on")));
  at(1500, () => {
    root.classList.add("s2");
    st.period = 0.72;
  });
  at(2500, () => {
    armed = true;
    resetFb();
  });

  const skip = $<HTMLButtonElement>(root, "#skip");
  const offSkip = skip
    ? listen(skip, "click", () => {
        timers.forEach(clearTimeout);
        timers.length = 0;
        if (!ended) {
          ended = true;
          finish();
        }
      })
    : () => {};

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    timers.forEach(clearTimeout);
    if (fb) clearInterval(fb);
    offResize();
    offSkip();
  };
}
