import { Cleanup, listen, prefersReducedMotion, trackVisible } from "./core";

// The hero globe: a canvas-rendered, lit sphere made of real land points
// (Africa highlighted in bronze/gold), flowing arcs between African hubs,
// orbit ribbons and a lens flare. Point data lives in /site/globe-points.json
// (two Int16 arrays of lon/lat * 100, base64 encoded).

const D = Math.PI / 180;

function dec(s: string): Int16Array {
  const b = atob(s);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return new Int16Array(u.buffer);
}

interface Prepped {
  n: number;
  cl: Float32Array;
  sl: Float32Array;
  lon: Float32Array;
  lat: Float32Array;
}

function prep(arr: Int16Array): Prepped {
  const n = arr.length / 2;
  const o: Prepped = {
    n,
    cl: new Float32Array(n),
    sl: new Float32Array(n),
    lon: new Float32Array(n),
    lat: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const lo = arr[2 * i] / 100;
    const la = arr[2 * i + 1] / 100;
    o.lon[i] = lo * D;
    o.lat[i] = la;
    o.cl[i] = Math.cos(la * D);
    o.sl[i] = Math.sin(la * D);
  }
  return o;
}

const CITIES: [number, number][] = [
  [30.06, -1.95], // Kigali
  [3.38, 6.52],
  [36.82, -1.29],
  [28.05, -26.2],
  [31.24, 30.04],
  [-17.45, 14.69],
  [38.75, 9.03],
  [13.23, -8.84],
  [-7.59, 33.57],
  [31.05, -17.83],
  [-0.19, 5.6],
  [39.27, -6.79],
  [15.27, -4.32],
  [32.58, 0.35],
  [18.42, -33.92],
  [-4.0, 5.35],
  [3.06, 36.75],
  [45.32, 2.05],
];
const PAIRS: [number, number][] = [
  [1, 6],
  [5, 3],
  [4, 14],
  [8, 9],
  [2, 7],
  [10, 11],
  [16, 12],
  [17, 13],
  [0, 15],
  [6, 3],
  [1, 4],
  [11, 14],
];

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function initGlobe(cv: HTMLCanvasElement): Cleanup {
  const ctx = cv.getContext("2d");
  if (!ctx) return () => {};
  const reduce = prefersReducedMotion();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0;
  let H = 0;
  let R = 0;
  let cx = 0;
  let cy = 0;
  let LO: Prepped | null = null;
  let AF: Prepped | null = null;
  let alive = true;
  let id = 0;

  const size = () => {
    const r = cv.getBoundingClientRect();
    W = r.width;
    H = r.height;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.36;
    cx = W / 2;
    cy = H * 0.47;
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(cv);

  // colour buckets (Africa, bronze -> gold -> champagne)
  const BRONZE: RGB = [140, 82, 10];
  const GOLD: RGB = [236, 158, 32];
  const CHAMP: RGB = [255, 212, 110];
  const NB = 7;
  const BB = 6;
  const buckets: number[][] = [];
  for (let i = 0; i < NB * BB; i++) buckets.push([]);
  const afCols: string[] = [];
  for (let m = 0; m < NB; m++) {
    const t = m / (NB - 1);
    const c =
      t < 0.5 ? mix(BRONZE, GOLD, t * 2) : mix(GOLD, CHAMP, (t - 0.5) * 2);
    for (let b = 0; b < BB; b++) {
      const k = 0.35 + 0.65 * (b / (BB - 1));
      afCols.push(`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${k.toFixed(2)})`);
    }
  }
  const oBuckets: number[][] = [[], [], [], [], []];
  const oCols = [
    "rgba(70,90,230,.14)",
    "rgba(80,105,245,.24)",
    "rgba(95,120,255,.36)",
    "rgba(120,140,255,.5)",
    "rgba(150,165,255,.66)",
  ];
  const Lx = -0.45;
  const Ly = 0.5;
  const Lz = 0.74;

  const vis = trackVisible(cv);
  let mxo = 0;
  let myo = 0;
  const host = cv.parentElement?.parentElement ?? cv;
  const offMove = listen(host, "mousemove", (e: MouseEvent) => {
    const r = cv.getBoundingClientRect();
    mxo = (e.clientX - r.left) / r.width - 0.5;
    myo = (e.clientY - r.top) / r.height - 0.5;
  });

  const lon0 = 20;
  const lat0 = 6;
  const t0 = performance.now();

  const proj = (
    lo: number,
    la: number,
    cl0: number,
    sl0: number,
    l0: number,
  ) => {
    const cl = Math.cos(la * D);
    const sl = Math.sin(la * D);
    const dl = lo * D - l0;
    const cd = Math.cos(dl);
    return [
      cl * Math.sin(dl),
      cl0 * sl - sl0 * cl * cd,
      sl0 * sl + cl0 * cl * cd,
    ];
  };

  function arc(
    a: [number, number],
    b: [number, number],
    tt: number,
    cl0: number,
    sl0: number,
    l0: number,
    idx: number,
  ) {
    if (!ctx) return;
    const la1 = a[1] * D;
    const lo1 = a[0] * D;
    const la2 = b[1] * D;
    const lo2 = b[0] * D;
    const v1 = [
      Math.cos(la1) * Math.cos(lo1),
      Math.cos(la1) * Math.sin(lo1),
      Math.sin(la1),
    ];
    const v2 = [
      Math.cos(la2) * Math.cos(lo2),
      Math.cos(la2) * Math.sin(lo2),
      Math.sin(la2),
    ];
    const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    const om = Math.acos(Math.min(1, dot));
    const so = Math.sin(om) || 1;
    const pts: number[][] = [];
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const s1 = Math.sin((1 - f) * om) / so;
      const s2 = Math.sin(f * om) / so;
      const x = v1[0] * s1 + v2[0] * s2;
      const y = v1[1] * s1 + v2[1] * s2;
      const z = v1[2] * s1 + v2[2] * s2;
      const lat = Math.asin(z) / D;
      const lon = Math.atan2(y, x) / D;
      const p = proj(lon, lat, cl0, sl0, l0);
      const h = 1 + Math.sin(f * Math.PI) * om * 0.28;
      pts.push([cx + R * p[0] * h, cy - R * p[1] * h, p[2]]);
    }
    const phase = (tt * 0.35) % 1.4;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < N; i++) {
      const A = pts[i];
      const B = pts[i + 1];
      if (A[2] < -0.05) continue;
      const f2 = i / N;
      const dd = phase - f2;
      const al = dd > 0 && dd < 0.45 ? 1 - dd / 0.45 : 0;
      const base = 0.16;
      ctx.strokeStyle =
        idx % 2
          ? `rgba(247,226,166,${base + al * 0.8})`
          : `rgba(212,166,74,${base + al * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
    }
    if (phase >= 0 && phase <= 1) {
      const hi = Math.min(N, (phase * N) | 0);
      const H2 = pts[hi];
      if (H2[2] > -0.05) {
        const hg = ctx.createRadialGradient(H2[0], H2[1], 0, H2[0], H2[1], 7);
        hg.addColorStop(0, "rgba(255,255,255,1)");
        hg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(H2[0], H2[1], 7, 0, 6.283);
        ctx.fill();
      }
    }
  }

  function ring(t: number, front: boolean) {
    if (!ctx) return;
    const tilt = -0.32;
    const rx = R * 1.42;
    const ry = R * 0.36;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const M = 140;
    for (let i = 0; i < M; i++) {
      const a = (i / M) * 6.283 + t * 0.25;
      const s = Math.sin(a);
      if (front ? s < 0 : s >= 0) continue;
      const ex = Math.cos(a) * rx;
      const ey = s * ry;
      const X = cx + ex * ct - ey * st;
      const Y = cy + ex * st + ey * ct;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(a * 3 + t * 2));
      ctx.fillStyle =
        i % 3 === 2
          ? `rgba(196,181,253,${tw * 0.55})`
          : `rgba(222,184,98,${tw})`;
      ctx.beginPath();
      ctx.arc(X, Y, i % 7 === 0 ? 2.2 : 1.2, 0, 6.283);
      ctx.fill();
    }
  }

  function flare(t: number) {
    if (!ctx) return;
    const fx = cx - R * 0.62;
    const fy = cy - R * 0.78;
    const pul = 1 + 0.12 * Math.sin(t * 1.8);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 0.75 * pul);
    fg.addColorStop(0, "rgba(255,252,235,.95)");
    fg.addColorStop(0.06, "rgba(255,220,140,.7)");
    fg.addColorStop(0.25, "rgba(255,160,40,.22)");
    fg.addColorStop(1, "rgba(255,140,20,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, R * 0.75 * pul, 0, 6.283);
    ctx.fill();
    ctx.translate(fx, fy);
    ctx.rotate(t * 0.05);
    for (let k = 0; k < 14; k++) {
      ctx.rotate((Math.PI * 2) / 14);
      const L = R * (k % 2 ? 0.38 : 0.62) * pul;
      const lg = ctx.createLinearGradient(0, 0, L, 0);
      lg.addColorStop(0, "rgba(255,236,190,.55)");
      lg.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, -1.2);
      ctx.lineTo(L, 0);
      ctx.lineTo(0, 1.2);
      ctx.fill();
    }
    ctx.restore();
  }

  function ribbons(t: number, front: boolean) {
    if (!ctx) return;
    // [radiusX, radiusY, tilt, rgb, width, speed]
    const defs: [number, number, number, string, number, number][] = [
      [1.48, 0.3, -0.3, "150,80,255", 5, 0.22],
      [1.62, 0.36, -0.22, "255,180,60", 2.4, 0.3],
      [1.36, 0.24, -0.38, "190,120,255", 2, 0.4],
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const f of defs) {
      const rx = R * f[0];
      const ry = R * f[1];
      const ct = Math.cos(f[2]);
      const st = Math.sin(f[2]);
      const seg = 90;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * 6.283;
        const a1 = ((i + 1) / seg) * 6.283;
        const s0 = Math.sin(a0);
        if (front ? s0 < 0 : s0 >= 0) continue;
        let ph = (a0 / 6.283 - t * f[5] * 0.25) % 1;
        ph = ph < 0 ? ph + 1 : ph;
        const al = 0.18 + 0.75 * Math.pow(1 - ph, 3);
        const x0 = Math.cos(a0) * rx;
        const y0 = s0 * ry;
        const x1 = Math.cos(a1) * rx;
        const y1 = Math.sin(a1) * ry;
        ctx.strokeStyle = `rgba(${f[3]},${al.toFixed(3)})`;
        ctx.lineWidth = f[4] * (0.6 + 0.6 * Math.pow(1 - ph, 2));
        ctx.beginPath();
        ctx.moveTo(cx + x0 * ct - y0 * st, cy + x0 * st + y0 * ct);
        ctx.lineTo(cx + x1 * ct - y1 * st, cy + x1 * st + y1 * ct);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function floor(t: number) {
    if (!ctx) return;
    const fy = cy + R * 1.0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const bg = ctx.createRadialGradient(cx, fy, 0, cx, fy, R * 1.2);
    bg.addColorStop(0, "rgba(255,180,60,.35)");
    bg.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = bg;
    ctx.save();
    ctx.translate(cx, fy);
    ctx.scale(1, 0.18);
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.2, 0, 6.283);
    ctx.restore();
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      const p = (t * 0.18 + k / 5) % 1;
      const rr = R * (0.55 + p * 0.75);
      ctx.strokeStyle = `rgba(255,${190 - k * 10},80,${(0.55 * (1 - p)).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, fy, rr, rr * 0.16, 0, 0, 6.283);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(160,100,255,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, fy, R * 1.05, R * 0.17, 0, 0, 6.283);
    ctx.stroke();
    ctx.restore();
  }

  function frame(now: number) {
    if (!ctx || !LO || !AF) return;
    const t = reduce ? 0 : Math.max(0, (now - t0) / 1000);
    const tl = lon0 + Math.sin(t * 0.16) * 16 + mxo * 14;
    const tb = lat0 + Math.sin(t * 0.11) * 5 - myo * 8;
    const l0 = tl * D;
    const cl0 = Math.cos(tb * D);
    const sl0 = Math.sin(tb * D);
    ctx.clearRect(0, 0, W, H);

    // outer glow (violet, with only a whisper of orchid)
    const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.32);
    g.addColorStop(0, "rgba(91,42,158,.55)");
    g.addColorStop(0.35, "rgba(168,87,201,.16)");
    g.addColorStop(0.7, "rgba(31,58,104,.12)");
    g.addColorStop(1, "rgba(14,26,51,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.32, 0, 6.283);
    ctx.fill();
    floor(t);
    ribbons(t, false);
    ring(t, false);

    // sphere
    const s = ctx.createRadialGradient(
      cx - R * 0.35,
      cy - R * 0.4,
      R * 0.05,
      cx,
      cy,
      R,
    );
    s.addColorStop(0, "#26338A");
    s.addColorStop(0.45, "#121A55");
    s.addColorStop(0.85, "#080D30");
    s.addColorStop(1, "#04061A");
    ctx.fillStyle = s;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();

    // graticule
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(160,170,240,.08)";
    for (let gl = -180; gl < 180; gl += 20) {
      ctx.beginPath();
      let pen = false;
      for (let la = -80; la <= 80; la += 4) {
        const p = proj(gl, la, cl0, sl0, l0);
        if (p[2] > 0) {
          const X = cx + R * p[0];
          const Y = cy - R * p[1];
          if (pen) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    }
    for (let gb = -60; gb <= 60; gb += 20) {
      ctx.beginPath();
      let pen2 = false;
      for (let lo = -180; lo <= 180; lo += 4) {
        const q = proj(lo, gb, cl0, sl0, l0);
        if (q[2] > 0) {
          const X2 = cx + R * q[0];
          const Y2 = cy - R * q[1];
          if (pen2) ctx.lineTo(X2, Y2);
          else ctx.moveTo(X2, Y2);
          pen2 = true;
        } else pen2 = false;
      }
      ctx.stroke();
    }

    // other land masses
    for (let i = 0; i < 5; i++) oBuckets[i].length = 0;
    let n = LO.n;
    const ds = Math.max(1.1, R / 230);
    for (let i = 0; i < n; i++) {
      const dl = LO.lon[i] - l0;
      const cd = Math.cos(dl);
      const cl = LO.cl[i];
      const sl = LO.sl[i];
      const z = sl0 * sl + cl0 * cl * cd;
      if (z <= 0.02) continue;
      const x = cl * Math.sin(dl);
      const y = cl0 * sl - sl0 * cl * cd;
      const lit = x * Lx + y * Ly + z * Lz;
      const bi = Math.max(0, Math.min(4, ((lit * 0.5 + 0.5) * z * 5.5) | 0));
      oBuckets[bi].push(cx + R * x, cy - R * y);
    }
    for (let i = 0; i < 5; i++) {
      const a = oBuckets[i];
      if (!a.length) continue;
      ctx.fillStyle = oCols[i];
      ctx.beginPath();
      for (let j = 0; j < a.length; j += 2) ctx.rect(a[j], a[j + 1], ds, ds);
      ctx.fill();
    }

    // Africa
    for (let i = 0; i < buckets.length; i++) buckets[i].length = 0;
    n = AF.n;
    const ds2 = Math.max(1.15, R / 230);
    for (let i = 0; i < n; i++) {
      const dl = AF.lon[i] - l0;
      const cd = Math.cos(dl);
      const cl = AF.cl[i];
      const sl = AF.sl[i];
      const z = sl0 * sl + cl0 * cl * cd;
      if (z <= 0.02) continue;
      const x = cl * Math.sin(dl);
      const y = cl0 * sl - sl0 * cl * cd;
      const lit = x * Lx + y * Ly + z * Lz;
      const w = Math.pow(
        Math.sin(AF.lon[i] * 0.9 - AF.lat[i] * 0.012 + t * 0.55) * 0.5 + 0.5,
        6,
      );
      const mi = Math.max(
        0,
        Math.min(NB - 1, (((lit * 0.5 + 0.5) * 0.6 + w * 0.4) * NB) | 0),
      );
      const b2 = Math.max(
        0,
        Math.min(BB - 1, ((lit * 0.5 + 0.55) * Math.min(1, z * 1.6) * BB) | 0),
      );
      buckets[mi * BB + b2].push(cx + R * x, cy - R * y);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gs = ds2 * 3.2;
    const go = (gs - ds2) / 2;
    ctx.fillStyle = "rgba(255,150,20,.03)";
    ctx.beginPath();
    for (let i = 0; i < buckets.length; i++) {
      const a = buckets[i];
      for (let j = 0; j < a.length; j += 2)
        ctx.rect(a[j] - go, a[j + 1] - go, gs, gs);
    }
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < buckets.length; i++) {
      const a = buckets[i];
      if (!a.length) continue;
      ctx.fillStyle = afCols[i];
      ctx.beginPath();
      for (let j = 0; j < a.length; j += 2) ctx.rect(a[j], a[j + 1], ds2, ds2);
      ctx.fill();
    }
    ctx.restore();

    // arcs + city lights
    for (let i = 0; i < PAIRS.length; i++) {
      arc(
        CITIES[PAIRS[i][0]],
        CITIES[PAIRS[i][1]],
        t + i * 0.53,
        cl0,
        sl0,
        l0,
        i,
      );
    }
    for (let i = 0; i < CITIES.length; i++) {
      const cc = CITIES[i];
      const cp = proj(cc[0], cc[1], cl0, sl0, l0);
      if (cp[2] <= 0.05) continue;
      const X3 = cx + R * cp[0];
      const Y3 = cy - R * cp[1];
      const pr = 3.6 * (1 + 0.35 * Math.sin(t * 2.2 + i * 1.7));
      const cg = ctx.createRadialGradient(X3, Y3, 0, X3, Y3, pr * 2.6);
      cg.addColorStop(0, "rgba(255,248,225,1)");
      cg.addColorStop(0.25, "rgba(232,192,108,.85)");
      cg.addColorStop(1, "rgba(212,166,74,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(X3, Y3, pr * 2.6, 0, 6.283);
      ctx.fill();
    }

    // terminator shade, specular, rim
    const sh = ctx.createRadialGradient(
      cx - R * 0.45,
      cy - R * 0.5,
      R * 0.2,
      cx,
      cy,
      R * 1.05,
    );
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(0.7, "rgba(4,8,20,.15)");
    sh.addColorStop(1, "rgba(4,8,20,.65)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();
    const sp = ctx.createRadialGradient(
      cx - R * 0.42,
      cy - R * 0.48,
      0,
      cx - R * 0.42,
      cy - R * 0.48,
      R * 0.7,
    );
    sp.addColorStop(0, "rgba(255,255,255,.16)");
    sp.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sp;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();
    const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, "rgba(255,226,150,1)");
    rim.addColorStop(0.4, "rgba(255,170,50,.6)");
    rim.addColorStop(0.75, "rgba(140,80,255,.7)");
    rim.addColorStop(1, "rgba(255,190,80,.9)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "rgba(255,180,60,.9)";
    ctx.shadowBlur = reduce ? 0 : 22;
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.stroke();
    ctx.restore();
    const gx = cx + R * 1.6 * Math.sin(t * 0.22);
    const gl2 = ctx.createRadialGradient(
      gx,
      cy - R * 0.3,
      0,
      gx,
      cy - R * 0.3,
      R * 0.9,
    );
    gl2.addColorStop(0, "rgba(255,240,205,.10)");
    gl2.addColorStop(1, "rgba(255,240,205,0)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.clip();
    ctx.fillStyle = gl2;
    ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
    ribbons(t, true);
    ring(t, true);
    flare(t);
  }

  fetch("/site/globe-points.json")
    .then((r) => r.json())
    .then((P: { o: string; a: string }) => {
      if (!alive) return;
      LO = prep(dec(P.o));
      AF = prep(dec(P.a));
      if (reduce) {
        frame(performance.now());
        return;
      }
      const tick = (now: number) => {
        if (!alive) return;
        id = requestAnimationFrame(tick);
        if (vis.get()) frame(now);
      };
      id = requestAnimationFrame(tick);
    })
    .catch(() => {
      /* the hero still reads fine without the globe */
    });

  return () => {
    alive = false;
    cancelAnimationFrame(id);
    ro.disconnect();
    vis.stop();
    offMove();
  };
}
