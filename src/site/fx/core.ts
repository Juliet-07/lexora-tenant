// Shared helpers for the marketing-site animations. Everything here is plain
// DOM + canvas (no animation library) and every effect returns a cleanup so
// route changes never leak timers, observers or animation frames.

export type Cleanup = () => void;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const noop: Cleanup = () => {};

export function combine(list: Cleanup[]): Cleanup {
  return () => {
    list.forEach((fn) => {
      try {
        fn();
      } catch {
        /* a failing cleanup must never block the rest */
      }
    });
  };
}

/** Listen on a target and return the matching unsubscribe. */
export function listen<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  fn: (e: WindowEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): Cleanup;
export function listen(
  target: EventTarget,
  type: string,
  fn: (e: any) => void,
  opts?: AddEventListenerOptions,
): Cleanup;
export function listen(
  target: EventTarget,
  type: string,
  fn: (e: any) => void,
  opts?: AddEventListenerOptions,
): Cleanup {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

/** requestAnimationFrame loop; the callback gets the timestamp. */
export function loop(fn: (now: number) => void): Cleanup {
  let id = 0;
  let alive = true;
  const tick = (now: number) => {
    if (!alive) return;
    id = requestAnimationFrame(tick);
    fn(now);
  };
  id = requestAnimationFrame(tick);
  return () => {
    alive = false;
    cancelAnimationFrame(id);
  };
}

/** Tracks whether an element is on screen so heavy canvases can sleep. */
export function trackVisible(
  el: Element,
  onChange?: (v: boolean) => void,
  margin = "120px",
): { get: () => boolean; stop: Cleanup } {
  let visible = true;
  const io = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      onChange?.(visible);
    },
    { rootMargin: margin },
  );
  io.observe(el);
  return { get: () => visible, stop: () => io.disconnect() };
}

/** Fire once when an element first scrolls into view. */
export function once(el: Element, cb: () => void, threshold = 0.3): Cleanup {
  const io = new IntersectionObserver(
    (es, o) => {
      if (es[0].isIntersecting) {
        o.disconnect();
        cb();
      }
    },
    { threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/** Ease a number from 0 to `to`, calling `paint` every frame. */
export function countTo(
  to: number,
  dur: number,
  paint: (v: number) => void,
  reduced: boolean,
  delay = 0,
): Cleanup {
  if (reduced) {
    paint(to);
    return noop;
  }
  let id = 0;
  let alive = true;
  let t0: number | null = null;
  const step = (ts: number) => {
    if (!alive) return;
    if (t0 === null) t0 = ts + delay;
    const p = Math.max(0, Math.min(1, (ts - t0) / dur));
    paint(to * easeOutCubic(p));
    if (p < 1) id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => {
    alive = false;
    cancelAnimationFrame(id);
  };
}

/** setInterval that pauses while its element is not on screen. */
export function everyWhileVisible(
  el: Element,
  ms: number,
  fn: () => void,
): Cleanup {
  const vis = trackVisible(el);
  const id = window.setInterval(() => {
    if (vis.get()) fn();
  }, ms);
  return () => {
    clearInterval(id);
    vis.stop();
  };
}

export const $ = <T extends Element = HTMLElement>(
  root: ParentNode,
  sel: string,
) => root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(
  root: ParentNode,
  sel: string,
) => Array.from(root.querySelectorAll<T>(sel));
