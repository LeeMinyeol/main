// Generate 버튼 → Day / Week / Month 토글 → 다시 버튼 : 15초 UI 마이크로 인터랙션
// 흰 정사각형 캔버스(1080x1080) 가운데의 검정 알약 버튼을 커서가 누르면, 버튼이 스프링처럼
// 부드럽게 늘어나며 토글로 변신 → 커서가 Day, Month, Week 를 차례로 고르고 → 바깥을 클릭하면
// 다시 Generate 버튼으로 줄어듦. 첫 화면과 마지막 화면이 같아서 끊김 없이 반복(루프) 재생됨.

export const SIZE = 1080;
export const FPS = 60;
export const DURATION = 15;
export const TOTAL_FRAMES = FPS * DURATION;

// ────────────────────────── 타임라인 (초) ──────────────────────────
// 타이밍을 바꾸고 싶으면 여기 숫자만 고치면 됨. 클릭 시각 = 마우스 버튼을 뗀 순간
export const T = {
  cursorIn: [0.8, 2.3], // 커서가 화면 밖에서 버튼으로
  hover: 2.0, // 버튼 호버 시작
  clickButton: 2.82, // 버튼 클릭 → 토글로 펼쳐짐
  picks: [
    { move: [4.0, 4.8], click: 4.95, seg: 0 }, // Day
    { move: [5.9, 6.7], click: 6.85, seg: 2 }, // Month
    { move: [7.9, 8.6], click: 8.75, seg: 1 }, // Week
  ],
  outside: { move: [9.7, 10.5], click: 10.65 }, // 바깥 클릭 → 버튼으로 접힘
  cursorOut: [12.2, 13.8], // 커서가 화면 밖으로
};
const PRESS = 0.1; // 마우스를 누르고 있는 시간

// ────────────────────────── 디자인 값 ──────────────────────────
const BG = '#FFFFFF';
const INK = '#0A0A0A';
const HOVER_INK = '#1F1F21';
const FONT = 'Inter';
const LABELS = ['Day', 'Week', 'Month'];
const DEFAULT_SEG = 1; // 펼쳐질 때 기본 선택 = Week (가운데라 버튼 중심에서 자연스럽게 자라남)
const BTN = { w: 320, h: 100 };
const TGL = { w: 588, h: 104, pad: 8 };
const CX = SIZE / 2;
const CY = SIZE / 2;

// ────────────────────────── 도구 ──────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};
// 감쇠 스프링: 0 → 1 로 가며 살짝 넘쳤다가 자리 잡음 (w: 빠르기, z: 출렁임 억제)
function spring(t, w = 20, z = 0.62) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16);
  const b = parseInt(h2.slice(1), 16);
  const ch = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function pill(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
}

// ────────────────────────── 커서 경로 ──────────────────────────
const SEG_W = (TGL.w - TGL.pad * 2) / 3;
const P = {
  start: [1190, 1250],
  button: [556, 556],
  seg: [0, 1, 2].map((k) => [CX + (k - 1) * SEG_W + 10, 556]),
  outside: [742, 800],
  end: [1190, 1250],
};
const MOVES = [
  { at: T.cursorIn, to: P.button },
  ...T.picks.map((p) => ({ at: p.move, to: P.seg[p.seg] })),
  { at: T.outside.move, to: P.outside },
  { at: T.cursorOut, to: P.end },
];
const CLICKS = [T.clickButton, ...T.picks.map((p) => p.click), T.outside.click];

function cursorPos(t) {
  let from = P.start;
  for (const m of MOVES) {
    if (t < m.at[0]) return from;
    if (t <= m.at[1]) {
      // 사람 손처럼 살짝 휘어진 경로(2차 베지어) + 가속·감속
      const u = ease.inOutCubic(prog(t, m.at[0], m.at[1]));
      const [ax, ay] = from;
      const [bx, by] = m.to;
      const d = Math.hypot(bx - ax, by - ay);
      const cx = (ax + bx) / 2 + ((by - ay) / (d || 1)) * d * 0.12;
      const cy = (ay + by) / 2 - ((bx - ax) / (d || 1)) * d * 0.12;
      return [
        (1 - u) ** 2 * ax + 2 * (1 - u) * u * cx + u * u * bx,
        (1 - u) ** 2 * ay + 2 * (1 - u) * u * cy + u * u * by,
      ];
    }
    from = m.to;
  }
  return from;
}
// 클릭할 때 커서가 살짝 작아졌다 돌아옴
function cursorPress(t) {
  let s = 0;
  for (const c of CLICKS) s = Math.max(s, ease.outCubic(prog(t, c - PRESS, c - PRESS + 0.06)) * (1 - spring(t - c, 34, 0.55)));
  return s;
}

// ────────────────────────── 상태 계산 ──────────────────────────
const COLLAPSE = T.outside.click;

// 버튼(0) ↔ 토글(1) 변신 정도
function morph(t) {
  if (t < COLLAPSE + 0.12) return spring(t - T.clickButton, 19, 0.6);
  return 1 - spring(t - (COLLAPSE + 0.12), 19, 0.66);
}

// 선택 표시(흰 알약)의 왼쪽/오른쪽 끝 (세그먼트 단위, 가운데 세그먼트 중심 = 0)
// 움직이는 방향의 앞쪽 끝은 빠른 스프링, 뒤쪽 끝은 느린 스프링 → 이동 중에 쭉 늘어나는 젤리 느낌
function indicatorEdges(t) {
  let L = DEFAULT_SEG - 1.5;
  let R = DEFAULT_SEG - 0.5;
  for (const p of T.picks) {
    if (t < p.click) break;
    const L0 = L;
    const R0 = R;
    const Lt = p.seg - 1.5;
    const Rt = p.seg - 0.5;
    const right = Lt > L0;
    const fast = (x) => spring(x, 30, 0.72);
    const slow = (x) => spring(x, 17, 0.8);
    const next = T.picks[T.picks.indexOf(p) + 1];
    const tt = next && t >= next.click ? next.click - p.click : t - p.click;
    L = L0 + (Lt - L0) * (right ? slow(tt) : fast(tt));
    R = R0 + (Rt - R0) * (right ? fast(tt) : slow(tt));
  }
  // 스프링이 넘쳐도 토글 안쪽 벽을 뚫고 나가지 않게 (벽에 닿으면 눌린 듯 멈춤)
  return [Math.max(-1.5, L), Math.min(1.5, R)];
}

function selectedAt(t) {
  let s = DEFAULT_SEG;
  for (const p of T.picks) if (t >= p.click) s = p.seg;
  return s;
}

// ────────────────────────── 그리기 ──────────────────────────
function drawSparkle(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  const k = r * 0.16;
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(k, -k, r, 0);
  ctx.quadraticCurveTo(k, k, 0, r);
  ctx.quadraticCurveTo(-k, k, -r, 0);
  ctx.quadraticCurveTo(-k, -k, 0, -r);
  ctx.fill();
  ctx.restore();
}

function drawCursor(ctx, x, y, press) {
  // macOS 스타일 화살표 커서 (끝점이 x, y)
  const s = 2.1 * (1 - 0.14 * press);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 22.5);
  ctx.lineTo(5.2, 17.6);
  ctx.lineTo(8.9, 26.2);
  ctx.lineTo(12.6, 24.6);
  ctx.lineTo(9.0, 16.2);
  ctx.lineTo(15.8, 16.2);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.restore();
}

function drawScene(ctx, t) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const m = morph(t);
  const [mx, my] = cursorPos(t);
  const press = cursorPress(t);

  // 버튼 호버 / 누름
  const hover = ease.outCubic(prog(t, T.hover, T.hover + 0.25)) * (1 - ease.outCubic(prog(t, T.clickButton, T.clickButton + 0.3)));
  const btnPress = t < T.clickButton + 0.3 ? cursorPress(t) : 0;
  const scale = (1 + 0.035 * hover) * (1 - 0.06 * btnPress);

  const w = lerp(BTN.w, TGL.w, m) * scale;
  const h = lerp(BTN.h, TGL.h, m) * scale;

  // 컨테이너 (검정 알약) + 부드러운 그림자
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.16 + 0.08 * hover - 0.06 * btnPress})`;
  ctx.shadowBlur = 44 + 16 * hover;
  ctx.shadowOffsetY = 16 + 8 * hover - 8 * btnPress;
  ctx.fillStyle = mix(INK, HOVER_INK, hover);
  pill(ctx, CX, CY, w, h);
  ctx.fill();
  ctx.restore();

  ctx.save();
  pill(ctx, CX, CY, w, h);
  ctx.clip();

  // 버튼을 누른 자리에서 번지는 잔물결
  const rp = prog(t, T.clickButton - PRESS, T.clickButton + 0.5);
  if (rp > 0 && rp < 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 * (1 - rp)})`;
    ctx.beginPath();
    ctx.arc(mx, my, 16 + ease.outCubic(rp) * 200, 0, TAU);
    ctx.fill();
  }

  // ── 버튼 내용: ✦ Generate ──
  const gOut = 1 - ease.outCubic(prog(t, T.clickButton, T.clickButton + 0.16));
  const gIn = ease.outCubic(prog(t, COLLAPSE + 0.22, COLLAPSE + 0.54));
  const g = t < COLLAPSE ? gOut : gIn;
  if (g > 0.001) {
    ctx.save();
    ctx.globalAlpha = g;
    ctx.filter = `blur(${(1 - g) * 8}px)`;
    const dy = t < COLLAPSE ? -(1 - g) * 14 : (1 - g) * 14;
    ctx.font = `600 34px ${FONT}`;
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('Generate').width;
    const icon = 13;
    const gap = 14;
    const total = icon * 2 + gap + tw;
    const x0 = CX - total / 2;
    ctx.fillStyle = '#FFFFFF';
    const spin = ease.inOutCubic(prog(t, T.hover, T.hover + 0.45)) * (Math.PI / 2);
    const twinkle = 1 + 0.18 * Math.sin(prog(t, T.hover, T.hover + 0.45) * Math.PI);
    drawSparkle(ctx, x0 + icon, CY + dy, icon * twinkle, spin);
    ctx.fillText('Generate', x0 + icon * 2 + gap, CY + dy + 1);
    ctx.restore();
  }

  // ── 토글 내용: 선택 표시 + Day / Week / Month ──
  const segW = (w - TGL.pad * 2 * scale) / 3;
  const [L, R] = indicatorEdges(t);
  const indIn = spring(t - (T.clickButton + 0.1), 24, 0.68);
  const indOut = 1 - ease.inCubic(prog(t, COLLAPSE, COLLAPSE + 0.18));
  const indS = Math.max(0, indIn * indOut);
  const ih0 = h - TGL.pad * 2 * scale;
  const stretch = R - L - 1;
  const iw = (R - L) * segW * indS;
  const ih = ih0 * (1 - 0.1 * stretch) * indS;
  const icx = CX + ((L + R) / 2) * segW;
  const indicatorPath = () => pill(ctx, icx, CY, Math.max(iw, ih), ih);
  if (indS > 0.001) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.globalAlpha = clamp(indS * 3); // 아주 작을 때는 투명하게 → 점처럼 튀어 보이지 않게
    ctx.fillStyle = '#FFFFFF';
    indicatorPath();
    ctx.fill();
    ctx.restore();
  }

  const labelVis = (k) => {
    const d = k === 1 ? 0 : 0.07; // 가운데부터 바깥으로 순서대로
    const inn = ease.outCubic(prog(t, T.clickButton + 0.14 + d, T.clickButton + 0.46 + d));
    const out = 1 - ease.outCubic(prog(t, COLLAPSE, COLLAPSE + 0.16));
    return Math.min(inn, out);
  };
  const clickBounce = (k) => {
    let s = 0;
    for (const p of T.picks) if (p.seg === k) s = Math.max(s, (1 - spring(t - p.click, 30, 0.45)) * (t >= p.click - PRESS ? 1 : 0));
    return 1 - 0.08 * s;
  };
  const drawLabels = (color, hoverAware) => {
    ctx.font = `500 31px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    LABELS.forEach((label, k) => {
      const v = labelVis(k);
      if (v <= 0.001) return;
      const x = CX + (k - 1) * segW;
      // 커서가 올라간 세그먼트는 글자가 더 또렷해짐
      const near = clamp(1 - Math.abs(mx - x) / (segW * 0.6)) * (Math.abs(my - CY) < h / 2 ? 1 : 0);
      const a = hoverAware ? 0.58 + 0.42 * near : 1;
      ctx.save();
      ctx.globalAlpha = v * a;
      ctx.filter = `blur(${(1 - v) * 6}px)`;
      ctx.fillStyle = color;
      ctx.translate(x, CY + 1 + (1 - v) * 10);
      const b = clickBounce(k);
      ctx.scale(b, b);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });
  };
  // 흰 글자를 먼저 쓰고, 선택 표시 모양으로 잘라낸 영역에만 검정 글자를 덮어씀
  // → 선택 표시가 글자 위를 지나갈 때 글자 색이 경계선에서 정확히 반반 갈림
  drawLabels('#FFFFFF', true);
  if (indS > 0.001) {
    ctx.save();
    indicatorPath();
    ctx.clip();
    drawLabels(INK, false);
    ctx.restore();
  }
  ctx.restore();

  // 바깥 클릭 표시 (회색 동그라미가 퍼짐)
  const op = prog(t, T.outside.click - PRESS, T.outside.click + 0.45);
  if (op > 0 && op < 1) {
    ctx.strokeStyle = `rgba(0,0,0,${0.22 * (1 - op)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(mx, my, 8 + ease.outCubic(op) * 46, 0, TAU);
    ctx.stroke();
  }

  drawCursor(ctx, mx, my, press);
}

// ────────────────────────── 프레임 렌더 (모션 블러 포함) ──────────────────────────
const canvas = document.getElementById('stage');
canvas.width = SIZE;
canvas.height = SIZE;
const out = canvas.getContext('2d');
const scratch = document.createElement('canvas');
scratch.width = SIZE;
scratch.height = SIZE;
const sctx = scratch.getContext('2d');

export function renderFrame(f, samples = 1) {
  const t = f / FPS;
  if (samples <= 1) return drawScene(out, t);
  const shutter = 0.5 / FPS;
  for (let k = 0; k < samples; k++) {
    sctx.save();
    drawScene(sctx, t + (k / samples) * shutter);
    sctx.restore();
    out.globalAlpha = 1 / (k + 1);
    out.drawImage(scratch, 0, 0);
  }
  out.globalAlpha = 1;
}

export const EVENTS = { clicks: CLICKS, press: PRESS, collapse: COLLAPSE, expand: T.clickButton, picks: T.picks };
window.APP = { renderFrame, TOTAL_FRAMES, FPS, SIZE, DURATION, EVENTS, canvas };
