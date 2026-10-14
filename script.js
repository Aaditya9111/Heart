"use strict";
/* Browser port of heart.py (turtle/tkinter -> HTML canvas). Click/tap to replay. */

const SC = 21, OY = 20, DURATION = 10, TICK = 16, ANIM = 42, LIFT = 34, GAP = 7;
const SIZES = [9, 10, 11, 12];
const FONT = "Arial";
const BG = "#060208";
const W = 800, H = 800;
const TAU = 2 * Math.PI;

const PHRASES = [
  "I love you", "Seni seviyorum", "Te amo", "Je t'aime",
  "Ich liebe dich", "Ti amo", "Eu te amo", "Я тебя люблю",
  "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
  "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
  "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю",
];

/* ---------- canvas ---------- */
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = W * s + "px";
  cv.style.height = H * s + "px";
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}
addEventListener("resize", fit);
fit();

/* ---------- helpers (same roles as in heart.py) ---------- */
function mulberry32(a) {                       // seeded RNG, like random.Random(11)
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(11);
const uniform = (a, b) => a + (b - a) * rand();
const choice = arr => arr[Math.floor(rand() * arr.length)];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

const px = pt => pt * 4 / 3;                   // Tk points -> CSS pixels (96 dpi)
const fontStr = size => `bold ${px(size)}px ${FONT}, sans-serif`;
function measure(text, size) { ctx.font = fontStr(size); return ctx.measureText(text).width; }
const linespace = size => Math.round(px(size) * 1.15);

const clamp = v => Math.max(0, Math.min(1, v));
const hx = c => "#" + c.map(v => Math.floor(clamp(v) * 255).toString(16).padStart(2, "0")).join("");
const mix = (a, b, k) => a.map((p, i) => p + (b[i] - p) * k);
const dim = (c, k) => c.map(v => v * k);

function heart(a) {
  const x = 16 * Math.sin(a) ** 3;
  const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [x * SC, y * SC + OY];
}

const POLY = Array.from({ length: 720 }, (_, i) => heart(TAU * i / 720));
const EDGES = POLY.map((p, i) => [p, POLY[(i + 1) % POLY.length]]);
const YMAX = Math.max(...POLY.map(p => p[1]));
const YMIN = Math.min(...POLY.map(p => p[1]));
const CY = (YMAX + YMIN) / 2;

function spans(y) {
  const xs = [];
  for (const [[x1, y1], [x2, y2]] of EDGES) {
    if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
  }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

function intersect(A, B) {
  const out = [];
  for (const a of A) for (const b of B) {
    const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
    if (hi - lo > 14) out.push([lo, hi]);
  }
  return out;
}

let bag = [];
function nextPhrase() {                        // phrase_cycle(): shuffled rounds
  if (!bag.length) { bag = PHRASES.slice(); shuffle(bag); bag.reverse(); }
  return bag.pop();
}

const mdist = (x, y) => Math.hypot(x / (16 * SC), (y - CY) / (14.5 * SC));

/* ---------- layout (build()) ---------- */
function build() {
  bag = [];
  const rowH = Math.max(...SIZES.map(linespace)) + 4;
  const half = rowH / 2;
  const placed = [];

  let y = YMAX - half;
  while (y > YMIN + half) {
    const row = intersect(spans(y + half), spans(y - half));
    for (let [lo, hi] of row) {
      lo += 4; hi -= 4;
      let cur = lo + uniform(0, 8);
      const line = [];

      for (;;) {
        let fit = null;
        for (let k = 0; k < 10; k++) {
          const text = nextPhrase();
          const size = choice(SIZES);
          const w = measure(text, size);
          if (cur + w <= hi) { fit = { text, size, w }; break; }
        }
        if (!fit) break;
        line.push({ x: cur + fit.w / 2, text: fit.text, size: fit.size, w: fit.w });
        cur += fit.w + GAP;
      }
      if (!line.length) continue;

      if (line.length > 1) {
        const last = line[line.length - 1];
        const left = hi - (last.x + last.w / 2);
        line.forEach((it, i) => { it.x += left * i / (line.length - 1); });
      } else {
        line[0].x = (lo + hi) / 2;
      }

      line.forEach((it, i) => {
        placed.push({ x: it.x, y, text: it.text, size: it.size, edge: i === 0 || i === line.length - 1 });
      });
    }
    y -= rowH;
  }

  const wine = [0.58, 0.0, 0.09], crimson = [0.90, 0.05, 0.14], blood = [0.98, 0.10, 0.16];
  for (const p of placed) {
    const rad = Math.min(1, mdist(p.x, p.y));
    let base = mix(wine, crimson, 0.25 + 0.75 * rad);
    base = mix(base, blood, uniform(0, 0.35) + (p.edge ? 0.3 : 0));
    p.color = base.map(v => Math.min(1, v));
    p.rad = rad;
  }

  const edges = placed.filter(p => p.edge);
  const inner = placed.filter(p => !p.edge);
  edges.forEach(p => { p.key = (((Math.atan2(p.x, p.y - CY)) % TAU) + TAU) % TAU; });
  edges.sort((a, b) => a.key - b.key);
  inner.forEach(p => { p.key = -p.rad + uniform(0, 0.08); });
  inner.sort((a, b) => a.key - b.key);
  return edges.concat(inner);
}

/* ---------- animation ---------- */
const FLASH = [1.0, 0.78, 0.78];
const BGC = [1, 3, 5].map(i => parseInt(BG.slice(i, i + 2), 16) / 255);

let ORDER, idx, RATE, acc, spawning, spawned, active, shimmerOn, nextShimmer, startAt;

function init() {
  rand = mulberry32(11);
  ORDER = build();
  idx = 0;
  RATE = ORDER.length / (DURATION * 1000 / TICK);
  acc = 0; spawning = true; spawned = []; active = [];
  shimmerOn = false; nextShimmer = 0;
  startAt = performance.now() + 200;
}

function spawn(p) {
  p.cx = W / 2 + p.x;
  p.cy = H / 2 - p.y;
  p.f = 0;
  p.dx = uniform(-10, 10);
  p.sh = BGC; p.ha = BGC; p.mc = BGC;
  p.hx = p.cx; p.hy = p.cy;
  p.mx = p.cx; p.my = p.cy - LIFT;
  p.litUntil = 0;
  spawned.push(p);
  active.push(p);
}

function animate(p) {
  p.f += 1;
  const u = clamp(p.f / ANIM);
  const e = 1 - (1 - u) ** 3;
  const c = p.color;
  const px_ = p.cx + p.dx * (1 - e);
  const py_ = p.cy - (1 - e) * LIFT;

  p.sh = mix(BGC, dim(c, 0.30), e);
  p.ha = mix(BGC, dim(c, 0.20), e * e);
  p.hx = px_; p.hy = py_;

  const flash = 0.75 * Math.sin(Math.PI * clamp((u - 0.55) / 0.45));
  p.mc = mix(mix(BGC, c, e ** 1.5), FLASH, flash);
  p.mx = px_; p.my = py_;

  if (u >= 1) {
    p.hx = p.cx; p.hy = p.cy;
    p.mx = p.cx; p.my = p.cy;
    p.mc = c;
    return false;
  }
  return true;
}

function step() {
  if (spawning) {
    acc += RATE;
    while (acc >= 1) {
      acc -= 1;
      if (idx >= ORDER.length) { spawning = false; break; }
      spawn(ORDER[idx++]);
    }
  }
  active = active.filter(animate);
  if (!spawning && !active.length) shimmerOn = true;
}

function draw(now) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (shimmerOn && now >= nextShimmer) {        // shimmer(): flash a random phrase for 260 ms
    const p = choice(spawned);
    p.litUntil = now + 260;
    nextShimmer = now + 140;
  }

  for (const p of spawned) {
    ctx.font = fontStr(p.size);
    ctx.fillStyle = hx(p.sh);
    ctx.fillText(p.text, p.cx + 2, p.cy + 3);                 // shadow

    ctx.font = fontStr(p.size + 1);
    ctx.fillStyle = hx(p.ha);
    ctx.fillText(p.text, p.hx, p.hy);                         // halo

    ctx.font = fontStr(p.size);
    ctx.fillStyle = hx(now < p.litUntil ? mix(p.color, FLASH, 0.6) : p.mc);
    ctx.fillText(p.text, p.mx, p.my);                         // main text
  }
}

let last = performance.now(), accum = 0;
function loop(now) {
  accum += Math.min(now - last, 200);
  last = now;
  if (now >= startAt) {
    while (accum >= TICK) { accum -= TICK; step(); }
  } else accum = 0;
  draw(now);
  requestAnimationFrame(loop);
}

cv.addEventListener("click", init);                 // tap the heart to replay
window.startHeart = function () { init(); requestAnimationFrame(loop); };
