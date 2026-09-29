// 장면 3 · SHAPE PLAY (4.0초 ~ 7.0초) — 도형 기법 3연타
//  a) 0.0~1.0  가로선 9개가 90° 돌아 세로 막대가 되고, 8분음표마다 이퀄라이저처럼 튐
//  b) 1.0~2.0  바우하우스 타일 격자: 8분음표마다 타일이 90°씩 회전, 박자마다 색이 대각선으로 뒤집힘
//  c) 2.0~3.0  타일의 도형들이 소용돌이치며 가운데로 빨려 들어가 코랄 원 하나가 됨 (다음 장면의 피사체)

import { W, H, C, TAU, ease, prog, lerp, rng, rgba } from '../lib.js';
import { LINE_COLORS } from './02-typography.js';

const ROWS = 9;
const ROW_H = H / ROWS;
const BAR_COLORS = [C.coral, C.acid, C.blue, C.violet, C.paper, C.violet, C.blue, C.acid, C.coral];
export const DISK_R = 170; // 장면 끝 원의 반지름 = 장면 4 피사체 크기

// ---------- a) 이퀄라이저 ----------
function barHeight(i, lt) {
  // 8분음표마다: 짝수 막대는 정박, 홀수 막대는 엇박에 튐
  let e = 0;
  for (let n = 0; n < 4; n++) {
    const t0 = n * 0.25;
    if (lt < t0) break;
    if ((n + i) % 2 === 0) e += Math.exp(-(lt - t0) * 9) * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + n)));
  }
  return 90 + 520 * Math.min(1, e);
}

function drawBars(ctx, lt) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  for (let i = 0; i < ROWS; i++) {
    const p = ease.inOutExpo(prog(lt, Math.abs(i - 4) * 0.02, 0.32 + Math.abs(i - 4) * 0.02));
    const dot = ease.inExpo(prog(lt, 0.82, 0.97));
    const cx = lerp(W / 2, W / 2 + (i - 4) * 150, p);
    const cy = lerp(ROW_H * i + ROW_H / 2, H / 2, p);
    const len = lerp(W, barHeight(i, lt), p) * (1 - dot);
    const thick = lerp(6, 70, p);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((p * Math.PI) / 2);
    ctx.strokeStyle = p < 0.5 ? LINE_COLORS[i] : BAR_COLORS[i];
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2 + 0.01, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- b) 바우하우스 타일 ----------
const S = 240;
const COLS = 8;
const TROWS = 4;
const OY = (H - S * TROWS) / 2;
const PAL = [C.coral, C.acid, C.blue, C.violet, C.paper, C.ink];
const KINDS = ['quarter', 'half', 'circle', 'tri', 'diag', 'eye'];
const rand = rng(2026);
const TILES = [];
for (let r = 0; r < TROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const bg = Math.floor(rand() * PAL.length);
    let fg = Math.floor(rand() * PAL.length);
    if (fg === bg) fg = (fg + 2) % PAL.length;
    TILES.push({
      r, c,
      cx: c * S + S / 2,
      cy: OY + r * S + S / 2,
      bg: PAL[bg],
      fg: PAL[fg],
      kind: KINDS[Math.floor(rand() * KINDS.length)],
      rot0: Math.floor(rand() * 4),
      dist: Math.hypot(c - (COLS - 1) / 2, r - (TROWS - 1) / 2) / 4.3,
    });
  }
}

function tileRotation(t, lt) {
  // 8분음표 n 마다, 규칙에 걸린 타일만 90° 회전
  let q = t.rot0;
  for (let n = 0; n < 4; n++) {
    if ((t.c + t.r + n) % 3 !== 0) continue;
    q += ease.inOutExpo(prog(lt, 1.0 + n * 0.25, 1.0 + n * 0.25 + 0.18));
  }
  return (q * Math.PI) / 2;
}

function tileColors(t, lt) {
  // 박자마다 대각선 띠에 걸린 타일은 배경/도형 색이 뒤바뀜
  let flip = false;
  [1.0, 1.5].forEach((b, k) => {
    if (lt >= b + 0.09 && ((t.c - t.r + 8) % 4 === k * 2 || (t.c - t.r + 8) % 4 === k * 2 + 1)) flip = !flip;
  });
  return flip ? [t.fg, t.bg] : [t.bg, t.fg];
}

function drawShape(ctx, kind, color) {
  const h = S / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (kind) {
    case 'quarter':
      ctx.moveTo(-h, -h);
      ctx.arc(-h, -h, S, 0, Math.PI / 2);
      break;
    case 'half':
      ctx.arc(0, h, h, Math.PI, TAU);
      break;
    case 'circle':
      ctx.arc(0, 0, S * 0.32, 0, TAU);
      break;
    case 'tri':
      ctx.moveTo(-h, -h);
      ctx.lineTo(h, h);
      ctx.lineTo(-h, h);
      break;
    case 'diag':
      ctx.moveTo(-h, -h);
      ctx.arc(-h, -h, h, 0, Math.PI / 2);
      ctx.moveTo(h, h);
      ctx.arc(h, h, h, Math.PI, Math.PI * 1.5);
      break;
    case 'eye':
      ctx.moveTo(-h, 0);
      ctx.quadraticCurveTo(0, -h * 1.1, h, 0);
      ctx.quadraticCurveTo(0, h * 1.1, -h, 0);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

function drawTiles(ctx, lt) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  for (const t of TILES) {
    const appear = ease.outBack(prog(lt, 1.0 + t.dist * 0.2, 1.22 + t.dist * 0.2), 1.6);
    const bgOut = 1 - ease.inExpo(prog(lt, 2.0 + (1 - t.dist) * 0.18, 2.2 + (1 - t.dist) * 0.18));
    const fly = ease.inOutCubic(prog(lt, 2.08 + t.dist * 0.16, 2.5 + t.dist * 0.16));
    if (appear <= 0 || fly >= 1) continue;
    const [bg, fg] = tileColors(t, lt);
    const rot = tileRotation(t, lt) + fly * Math.PI * 1.5;
    // 가운데로 휘어 들어가는 경로
    const dx = W / 2 - t.cx;
    const dy = H / 2 - t.cy;
    const bend = Math.sin(fly * Math.PI) * 160;
    const len = Math.hypot(dx, dy) || 1;
    const x = t.cx + dx * fly + (-dy / len) * bend;
    const y = t.cy + dy * fly + (dx / len) * bend;
    const sc = appear * lerp(1, 0.18, fly);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.rotate(rot);
    if (bgOut > 0) {
      ctx.save();
      ctx.scale(bgOut, bgOut);
      ctx.fillStyle = bg;
      ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.rect(-S / 2, -S / 2, S, S);
    ctx.clip();
    drawShape(ctx, t.kind, fg === C.ink && bgOut < 0.5 ? C.paper : fg);
    ctx.restore();
  }

  // 빨려 들어온 도형들이 코랄 원으로 합쳐짐
  const grow = ease.outBack(prog(lt, 2.3, 2.75), 2);
  if (grow > 0) {
    const wob = 1 + 0.06 * Math.sin(lt * 40) * Math.exp(-(lt - 2.3) * 5);
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, DISK_R * grow * wob, (DISK_R * grow) / wob, 0, 0, TAU);
    ctx.fill();
  }
}

export default {
  id: '03',
  name: 'SHAPE PLAY',
  start: 4.0,
  end: 7.0,
  draw(ctx, lt) {
    if (lt < 1.0) drawBars(ctx, lt);
    else drawTiles(ctx, lt);
  },
};
