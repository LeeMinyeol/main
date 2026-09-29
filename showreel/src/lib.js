// 모든 장면이 같이 쓰는 도구 모음: 화면 크기, 색상표, 이징(움직임 곡선), 난수 등

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const BPM = 120;              // 음악 템포. 한 박자 = 0.5초
export const BEAT = 60 / BPM;

// 색상표 (영상 전체가 이 색만 사용)
export const C = {
  ink: '#0A0A10',
  paper: '#F3EFE6',
  coral: '#FF4632',
  blue: '#2B4BFF',
  acid: '#D7FF3A',
  violet: '#8B5CFF',
};

export const FONT_DISPLAY = 'Anton';
export const FONT_MONO = '"Space Mono"';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// t 가 a~b 구간에서 0→1 로 얼마나 진행됐는지
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const TAU = Math.PI * 2;

// 이징: 0~1 입력을 받아 "느낌 있는" 0~1 을 돌려줌
export const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

// 항상 같은 결과가 나오는 난수 (렌더할 때마다 영상이 똑같이 나오게)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 16진수 색을 투명도와 함께 쓰기
export function rgba(hex, a = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function mixColor(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16);
  const b = parseInt(h2.slice(1), 16);
  const ch = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// 빛 번짐용 동그란 스프라이트 (파티클에 사용)
const glowCache = new Map();
export function glowSprite(color, size = 32) {
  const key = color + size;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, rgba(color, 1));
  grd.addColorStop(0.18, rgba(color, 0.85));
  grd.addColorStop(0.45, rgba(color, 0.18));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  glowCache.set(key, c);
  return c;
}

// 글자 사이 간격을 직접 계산해서 글자 하나씩 위치를 돌려줌
export function layoutLetters(ctx, text, font, tracking = 0) {
  ctx.font = font;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, w) => s + w, 0) + tracking * (text.length - 1);
  let x = -total / 2;
  return {
    total,
    letters: [...text].map((ch, i) => {
      const item = { ch, x: x + widths[i] / 2, w: widths[i] };
      x += widths[i] + tracking;
      return item;
    }),
  };
}

// 모양 모핑용: 다각형 둘레를 N개의 점으로 균일하게 샘플링
export function polygonPoints(sides, radius, n = 180, rot = -Math.PI / 2) {
  if (sides === 0) {
    return Array.from({ length: n }, (_, i) => {
      const a = rot + (i / n) * TAU;
      return [Math.cos(a) * radius, Math.sin(a) * radius];
    });
  }
  const verts = Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * TAU;
    return [Math.cos(a) * radius, Math.sin(a) * radius];
  });
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = (i / n) * sides;
    const k = Math.floor(u);
    const f = u - k;
    const p = verts[k % sides];
    const q = verts[(k + 1) % sides];
    pts.push([lerp(p[0], q[0], f), lerp(p[1], q[1], f)]);
  }
  return pts;
}

export function starPoints(tips, r1, r2, n = 180, rot = -Math.PI / 2) {
  const verts = [];
  for (let i = 0; i < tips * 2; i++) {
    const a = rot + (i / (tips * 2)) * TAU;
    const r = i % 2 === 0 ? r1 : r2;
    verts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const pts = [];
  const m = verts.length;
  for (let i = 0; i < n; i++) {
    const u = (i / n) * m;
    const k = Math.floor(u);
    const f = u - k;
    const p = verts[k % m];
    const q = verts[(k + 1) % m];
    pts.push([lerp(p[0], q[0], f), lerp(p[1], q[1], f)]);
  }
  return pts;
}

export function tracePath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
