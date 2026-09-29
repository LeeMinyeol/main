// 장면 6 · FINAL (12.5초 ~ 15.0초) — 깔끔하게 기억에 남는 마지막 화면
// 화면을 채운 코랄이 조리개처럼 오므라들어 점 하나가 되고(12.5~12.95초),
// 그 점이 16분음표 박자로 C·L·A·U·D·E 글자 위를 콩콩 밟고 지나가며 글자를 세운 뒤
// 14.0초 정박에 마침표 자리에 착지 → 'CLAUDE.' + 'MOTION DESIGNER' 로 끝까지 멈춰 있는 엔딩 카드

import { W, H, C, TAU, ease, prog, lerp, rgba, layoutLetters, FONT_DISPLAY, FONT_MONO } from '../lib.js';

const WORD = 'CLAUDE';
const SIZE = 300;
const DOT_R = 28;
const GAP = 16;
const HOP_T0 = 0.5; // 첫 점프 시작
const HOP = 0.125; // 16분음표
const LAND = 1.5; // 마지막 착지 (= 14.0초 정박)

let geo = null;
function build(ctx) {
  const font = `${SIZE}px ${FONT_DISPLAY}`;
  const lay = layoutLetters(ctx, WORD, font, 10);
  ctx.font = font;
  const cap = ctx.measureText('C').actualBoundingBoxAscent;
  const total = lay.total + GAP + DOT_R * 2;
  const x0 = W / 2 - total / 2;
  const baseline = H / 2 + cap / 2 - 30;
  const letters = lay.letters.map((l) => ({ ...l, x: x0 + lay.total / 2 + l.x }));
  const start = { x: x0 - 130, y: baseline - DOT_R };
  const end = { x: x0 + lay.total + GAP + DOT_R, y: baseline - DOT_R };
  const tops = letters.map((l) => ({ x: l.x, y: baseline - cap - DOT_R }));
  return { font, letters, cap, baseline, start, end, tops };
}

// 시간 t 에서 점의 위치·찌그러짐
function dotState(t) {
  const { start, end, tops } = geo;
  const pts = [start, ...tops, end];
  const times = [HOP_T0, ...tops.map((_, i) => HOP_T0 + (i + 1) * HOP), LAND];
  if (t <= times[0]) return { ...start, sx: 1, sy: 1 };
  if (t >= LAND) {
    const s = t - LAND;
    const k = Math.exp(-s * 10) * Math.cos(s * 40);
    return { ...end, sx: 1 + 0.45 * k, sy: 1 - 0.45 * k, ground: true };
  }
  let i = 0;
  while (t > times[i + 1]) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const u = (t - times[i]) / (times[i + 1] - times[i]);
  const h = i === pts.length - 2 ? 170 : 70;
  const x = lerp(a.x, b.x, u);
  const y = lerp(a.y, b.y, u) - h * 4 * u * (1 - u);
  // 날아가는 동안 살짝 늘어나고, 착지 직후엔 납작하게 찌그러짐
  const land = i > 0 ? Math.exp(-(t - times[i]) * 45) : 0;
  const stretch = 0.18 * Math.sin(u * Math.PI);
  return { x, y, sx: 1 - stretch + 0.5 * land, sy: 1 + stretch - 0.45 * land };
}

export default {
  id: '06',
  name: 'FINAL',
  hud: false,
  vignette: 0.12,
  start: 12.5,
  end: 15.0,
  draw(ctx, lt) {
    if (!geo) geo = build(ctx);
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);

    // 글자: 점이 밟기 직전에 솟아오르고, 밟히면 살짝 눌렸다 튕김
    ctx.font = geo.font;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.ink;
    geo.letters.forEach((l, i) => {
      const tLand = HOP_T0 + (i + 1) * HOP;
      const rise = ease.outCubic(prog(lt, tLand - 0.11, tLand - 0.01));
      if (rise <= 0) return;
      const s = lt - tLand;
      const squash = s > 0 ? 0.14 * Math.exp(-s * 14) * Math.cos(s * 30) : 0;
      ctx.save();
      ctx.translate(l.x, geo.baseline);
      ctx.scale(1 + squash * 0.4, rise * (1 - squash));
      ctx.fillText(l.ch, 0, 0);
      ctx.restore();
    });

    // 조리개: 화면 가득한 코랄이 출발점으로 오므라듦
    const iris = ease.inOutExpo(prog(lt, 0.0, 0.45));
    const d = dotState(lt);
    if (iris < 1) {
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.arc(geo.start.x, geo.start.y, lerp(2300, DOT_R, iris), 0, TAU);
      ctx.fill();
    } else {
      // 출발 직전 예비 동작(앤티시페이션): 납작하게 웅크림
      const crouch = lt < HOP_T0 ? Math.sin(prog(lt, 0.45, HOP_T0) * Math.PI) * 0.3 : 0;
      ctx.save();
      ctx.translate(d.x, d.y + DOT_R);
      ctx.scale(d.sx + crouch, d.sy - crouch);
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.arc(0, -DOT_R, DOT_R, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 부제목: 착지 후 한 글자씩
    const sub = 'MOTION DESIGNER';
    ctx.font = `700 34px ${FONT_MONO}`;
    const tl = layoutLetters(ctx, sub, `700 34px ${FONT_MONO}`, 16);
    ctx.textAlign = 'center';
    tl.letters.forEach((l, i) => {
      const a = ease.outCubic(prog(lt, LAND + 0.05 + i * 0.018, LAND + 0.25 + i * 0.018));
      if (a <= 0) return;
      ctx.fillStyle = rgba(C.ink, a);
      ctx.fillText(l.ch, W / 2 + l.x, geo.baseline + 100 + (1 - a) * 14);
    });

    // 아주 작은 모서리 정보
    const foot = ease.outCubic(prog(lt, 1.75, 2.1));
    if (foot > 0) {
      ctx.font = `400 20px ${FONT_MONO}`;
      ctx.fillStyle = rgba(C.ink, 0.5 * foot);
      ctx.textAlign = 'left';
      ctx.fillText('SHOWREEL 2026', 96, H - 84);
      ctx.textAlign = 'right';
      ctx.fillText('EVERY FRAME WRITTEN IN CODE', W - 96, H - 84);
    }
  },
};
