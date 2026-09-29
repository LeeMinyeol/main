// 장면 2 · TYPOGRAPHY (1.0초 ~ 4.0초) — 타이포그래피 기법 3연타
//  a) 0.0~1.0  편집 디자인 레이아웃: 8분음표마다 I / MAKE / PIXELS / DANCE 가 각기 다른 방식으로 등장
//              (팝, 마스크 와이프, 외곽선 그려지기, 튀어 내려와 춤추는 글자)
//  b) 1.0~2.0  원형 타이포: 두 겹의 글자 링이 반대로 돌고, 가운데 글리프가 8분음표마다 바뀜
//  c) 2.0~3.0  마퀴(흐르는 글자 줄) 9줄이 박자마다 휙휙 밀리다가 → 납작하게 눌려 가로선 9개가 됨 (다음 장면으로)

import { W, H, C, TAU, ease, prog, lerp, rgba, layoutLetters, FONT_DISPLAY, FONT_MONO } from '../lib.js';

// ---------- a) 편집 레이아웃 ----------
const X0 = 150;
function drawStack(ctx, lt) {
  const lift = ease.inExpo(prog(lt, 0.86, 1.0)) * (H + 200);
  // 파란 배경 → 아래에서 잉크색이 차오름
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, W, H);
  if (lift > 0) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, H - lift, W, lift);
  }
  ctx.save();
  ctx.translate(0, -lift);
  ctx.textAlign = 'left';

  // "I" — 크기 튀어오르며 등장
  const pI = ease.outBack(prog(lt, 0.0, 0.18), 2.2);
  ctx.save();
  ctx.translate(X0 + 30, 245);
  ctx.scale(pI, pI);
  ctx.font = `180px ${FONT_DISPLAY}`;
  ctx.fillStyle = C.paper;
  ctx.fillText('I', -30, 0);
  ctx.restore();

  // "MAKE" — 왼쪽에서 마스크로 쓱
  const pM = ease.outExpo(prog(lt, 0.25, 0.45));
  ctx.save();
  ctx.font = `180px ${FONT_DISPLAY}`;
  const mw = ctx.measureText('MAKE').width;
  ctx.beginPath();
  ctx.rect(X0 + 115, 50, mw * pM + 4, 220);
  ctx.clip();
  ctx.fillStyle = C.paper;
  ctx.fillText('MAKE', X0 + 115 - (1 - pM) * 120, 245);
  ctx.restore();

  // "PIXELS" — 외곽선이 펜으로 그려지듯 나타남
  const pP = prog(lt, 0.5, 0.78);
  if (pP > 0) {
    ctx.save();
    ctx.font = `390px ${FONT_DISPLAY}`;
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 6;
    ctx.setLineDash([2000, 2000]);
    ctx.lineDashOffset = 2000 * (1 - ease.outCubic(pP));
    ctx.strokeText('PIXELS', X0, 625);
    ctx.restore();
  }

  // "DANCE" — 글자가 위에서 튀어 내려와 박자에 맞춰 춤춤
  ctx.font = `390px ${FONT_DISPLAY}`;
  ctx.fillStyle = C.acid;
  let x = X0;
  [...'DANCE'].forEach((ch, i) => {
    const w = ctx.measureText(ch).width;
    const p = prog(lt, 0.75 + i * 0.03, 0.95 + i * 0.03);
    if (p > 0) {
      const drop = (1 - ease.outBack(p, 2)) * -500;
      const bob = Math.sin((lt - 0.75) * TAU * 2 + i * 1.1) * 16 * p;
      ctx.save();
      ctx.translate(x + w / 2, 965 + drop + bob);
      ctx.rotate(Math.sin((lt - 0.75) * TAU * 2 + i) * 0.06 * p);
      ctx.fillText(ch, -w / 2, 0);
      ctx.restore();
    }
    x += w + 6;
  });

  // 오른쪽: 8분음표마다 30°씩 딸깍 도는 커다란 별표 장식
  const star = ease.outBack(prog(lt, 0.1, 0.4), 2);
  if (star > 0) {
    let steps = 0;
    for (let n = 1; n < 4; n++) steps += ease.inOutExpo(prog(lt, n * 0.25, n * 0.25 + 0.15));
    ctx.save();
    ctx.translate(1480, 700);
    ctx.rotate((steps * Math.PI) / 6);
    ctx.scale(star, star);
    ctx.strokeStyle = C.coral;
    ctx.lineCap = 'round';
    ctx.lineWidth = 64;
    for (let k = 0; k < 3; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -190);
      ctx.lineTo(0, 190);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 오른쪽 세로 캡션
  ctx.save();
  ctx.translate(W - 150, 180);
  ctx.rotate(Math.PI / 2);
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.fillStyle = rgba(C.paper, 0.8 * ease.outExpo(prog(lt, 0.1, 0.4)));
  ctx.fillText('TYPE IS A MOVING MATERIAL →', 0, 0);
  ctx.restore();
  ctx.restore();
}

// ---------- b) 원형 타이포 ----------
const OUTER = 'TYPOGRAPHY • KINETIC • LAYOUT • RHYTHM • ';
const INNER = 'ANTON 400 — SPACE MONO 700 — ANTON 400 — SPACE MONO 700 — ';
const GLYPHS = ['A', '&', 'R', '?', 'G', '@', '%', 'Q'];

function ringText(ctx, text, radius, font, color, angle, reveal) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0);
  const scale = (TAU * radius) / total; // 한 바퀴에 딱 맞게 자간 조정
  let a = angle;
  chars.forEach((c, i) => {
    const step = (widths[i] * scale) / radius;
    if (i / chars.length <= reveal) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(a + step / 2);
      ctx.fillText(c, 0, -radius);
      ctx.restore();
    }
    a += step;
  });
}

function drawRings(ctx, lt) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const local = lt - 1.0;
  const kick = [0, 0.5].reduce((s, b) => s + ease.outExpo(prog(local, b, b + 0.3)) * 0.5, 0);
  const inS = ease.outExpo(prog(local, 0, 0.35));
  const outS = 1 + ease.inExpo(prog(local, 0.85, 1.0)) * 2.4;
  const reveal = ease.outCubic(prog(local, 0, 0.4));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(lerp(0.6, 1, inS) * outS, lerp(0.6, 1, inS) * outS);
  ctx.translate(-W / 2, -H / 2);
  ringText(ctx, OUTER, 410, `78px ${FONT_DISPLAY}`, C.paper, local * 0.7 + kick, reveal);
  ringText(ctx, INNER, 300, `700 26px ${FONT_MONO}`, C.acid, -local * 1.1 - kick, reveal);
  ctx.strokeStyle = rgba(C.paper, 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 350, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // 가운데 글리프: 8분음표마다 교체
  const gi = Math.floor(local / 0.25);
  const since = local - gi * 0.25;
  const gs = lerp(1.25, 1, ease.outExpo(prog(since, 0, 0.15))) * (1 - ease.inExpo(prog(local, 0.85, 1.0)));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(gs, gs);
  ctx.font = `330px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.coral;
  ctx.fillText(GLYPHS[(gi * 3) % GLYPHS.length], 0, 12);
  ctx.restore();
}

// ---------- c) 마퀴 9줄 ----------
const ROWS = 9;
const ROW_H = H / ROWS;
const MARQ = 'RHYTHM • ';
export const LINE_COLORS = Array.from({ length: ROWS }, (_, i) => (i === 4 ? C.coral : C.paper));

function drawMarquee(ctx, lt) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const local = lt - 2.0;
  const lurch = [0, 0.5].reduce((s, b) => s + ease.outExpo(prog(local, b, b + 0.28)), 0);
  ctx.font = `150px ${FONT_DISPLAY}`;
  const unit = ctx.measureText(MARQ).width;
  for (let i = 0; i < ROWS; i++) {
    const dir = i % 2 ? 1 : -1;
    const cy = ROW_H * i + ROW_H / 2;
    const enter = ease.outExpo(prog(local, Math.abs(i - 4) * 0.02, 0.3 + Math.abs(i - 4) * 0.02));
    const squash = ease.inOutExpo(prog(local, 0.72 + Math.abs(i - 4) * 0.015, 0.95 + Math.abs(i - 4) * 0.015));
    const offset = dir * (local * 260 + lurch * 240 * (1 + (i % 3))) + dir * (1 - enter) * -W;
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(1, lerp(1, 0.045, squash));
    const hot = i === 4 && local >= 0.5;
    const style = i === 4 ? 'fill' : i % 2 ? 'stroke' : 'fill';
    ctx.fillStyle = hot ? C.coral : i === 4 ? C.paper : rgba(C.paper, 0.9);
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 3;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const start = (((offset % unit) + unit) % unit) - unit * 2;
    for (let x = start; x < W + unit; x += unit) {
      if (squash > 0.97) break;
      if (style === 'fill') ctx.fillText(MARQ, x, 6);
      else ctx.strokeText(MARQ, x, 6);
    }
    ctx.restore();
    // 눌린 뒤에는 가로선으로 남음
    const line = prog(squash, 0.7, 0.95);
    if (line > 0) {
      ctx.fillStyle = rgba(LINE_COLORS[i], line);
      ctx.fillRect(0, cy - 3, W, 6);
    }
  }
}

export default {
  id: '02',
  name: 'TYPOGRAPHY',
  start: 1.0,
  end: 4.0,
  draw(ctx, lt) {
    if (lt < 1.0) drawStack(ctx, lt);
    else if (lt < 2.0) drawRings(ctx, lt);
    else drawMarquee(ctx, lt);
  },
};
