import { $, Cleanup, listen, prefersReducedMotion, trackVisible } from "./core";

// Connected-dots constellation. Violet / lavender / gold only: the PO's
// original fuchsia channel is replaced by a softer orchid.
const COLS = ["224,176,74", "168,87,201", "196,181,253", "155,77,255"];

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
}

export function initField(
  cv: HTMLCanvasElement,
  count = 80,
  host: HTMLElement | null = cv.parentElement,
): Cleanup {
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};
  const reduced = prefersReducedMotion();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pts: P[] = [];
  let W = 0;
  let H = 0;
  const mouse = { x: -999, y: -999 };

  const size = () => {
    W = cv.offsetWidth;
    H = cv.offsetHeight;
    if (!W || !H) return;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!pts.length) {
      for (let i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.8 + 0.4,
          c: COLS[i % 4],
        });
      }
    }
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(cv);

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!reduced) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = `rgba(${p.c},.9)`;
      ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d = dx * dx + dy * dy;
        if (d < 14000) {
          ctx.strokeStyle = `rgba(${p.c},${0.18 * (1 - d / 14000)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const md = mdx * mdx + mdy * mdy;
      if (md < 26000) {
        ctx.strokeStyle = `rgba(246,217,139,${0.45 * (1 - md / 26000)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  };

  if (reduced) {
    draw();
    return () => ro.disconnect();
  }

  const vis = trackVisible(cv);
  let id = 0;
  let alive = true;
  const tick = () => {
    if (!alive) return;
    id = requestAnimationFrame(tick);
    if (vis.get() && W) draw();
  };
  id = requestAnimationFrame(tick);

  const off: Cleanup[] = [];
  if (host) {
    off.push(
      listen(host, "mousemove", (e: MouseEvent) => {
        const r = cv.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      }),
      listen(host, "mouseleave", () => {
        mouse.x = -999;
        mouse.y = -999;
      }),
    );
  }
  return () => {
    alive = false;
    cancelAnimationFrame(id);
    ro.disconnect();
    vis.stop();
    off.forEach((f) => f());
  };
}

/** Drifting soft dots that sit behind the light sections. */
export function initDots(host: HTMLElement, count = 44): Cleanup {
  if (host.childElementCount) return () => {};
  for (let k = 0; k < count; k++) {
    const s = document.createElement("i");
    const z = Math.random() * 5 + 2;
    s.style.cssText =
      `left:${Math.random() * 100}%;top:${Math.random() * 100 + 10}%;` +
      `width:${z}px;height:${z}px;opacity:.55;` +
      `animation-duration:${8 + Math.random() * 12}s;` +
      `animation-delay:${-Math.random() * 20}s;` +
      `background:${k % 3 ? "#8E5BE0" : "#A857C9"}`;
    host.appendChild(s);
  }
  return () => host.replaceChildren();
}

export const queryField = (root: ParentNode) =>
  $<HTMLCanvasElement>(root, "canvas.stars");
