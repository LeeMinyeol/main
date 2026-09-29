// 장면 4 · PARTICLES (7.0초 ~ 9.5초)
// 링 구멍에서 입자 2,400개가 터져 나와 은하처럼 소용돌이치다가
// → 'CLAUDE' 글자 모양으로 모여들고 → 빛의 속도로 사방으로 흩어짐 (다음 장면의 3D 터널로 연결)

import { W, H, C, TAU, ease, prog, lerp, rng, rgba, makeCanvas, glowSprite, FONT_DISPLAY } from '../lib.js';

const COUNT = 3400;
const WORD = 'CLAUDE';
const COLORS = [C.paper, C.coral, C.acid, '#6F8BFF'];

let particles = null;

function build() {
  // 글자를 몰래 그려서 픽셀 좌표를 목표점으로 사용
  const c = makeCanvas();
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = `440px ${FONT_DISPLAY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.letterSpacing = '24px';
  g.fillText(WORD, W / 2, H / 2 + 10);
  const img = g.getImageData(0, 0, W, H).data;
  const targets = [];
  for (let y = 0; y < H; y += 6) {
    for (let x = 0; x < W; x += 6) {
      if (img[(y * W + x) * 4 + 3] > 128) targets.push([x, y]);
    }
  }
  const rand = rng(42);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  particles = Array.from({ length: COUNT }, (_, i) => {
    const r0 = 90 + Math.pow(rand(), 0.8) * 880;
    return {
      r0,
      a0: rand() * TAU,
      w: 2.4 * (260 / (r0 + 160)),
      burst: 0.5 + rand() * 0.3,
      delay: rand() * 0.22,
      target: targets[i % targets.length],
      jitter: rand() * TAU,
      size: 1.6 + rand() * 2.6,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      glow: rand() < 0.22,
      spread: 0.7 + rand() * 0.9,
    };
  });
}

function pos(p, lt) {
  const cx = W / 2;
  const cy = H / 2;
  // 은하 소용돌이
  const a = p.a0 + p.w * lt;
  let x = cx + Math.cos(a) * p.r0 * 1.05;
  let y = cy + Math.sin(a) * p.r0 * 0.58 + Math.sin(a * 2 + p.jitter) * 18;
  // 가운데에서 터져 나옴
  const k = ease.outExpo(prog(lt, 0, p.burst));
  x = lerp(cx, x, k);
  y = lerp(cy, y, k);
  // 글자로 모여듦
  const m = ease.inOutCubic(prog(lt, 0.95 + p.delay, 1.6 + p.delay));
  const tx = p.target[0] + Math.sin(lt * 9 + p.jitter) * 1.5;
  const ty = p.target[1] + Math.cos(lt * 7 + p.jitter) * 1.5;
  x = lerp(x, tx, m);
  y = lerp(y, ty, m);
  // 사방으로 폭발 (워프)
  const ex = ease.inExpo(prog(lt, 2.12, 2.5));
  if (ex > 0) {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    x += (dx / len) * ex * 2600 * p.spread;
    y += (dy / len) * ex * 2600 * p.spread;
  }
  return [x, y];
}

export default {
  id: '04',
  name: 'PARTICLES',
  start: 7.0,
  end: 9.5,
  draw(ctx, lt) {
    if (!particles) build();
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
    bg.addColorStop(0, rgba(C.blue, 0.28));
    bg.addColorStop(1, rgba(C.blue, 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // 색깔별로 묶어서 한 번에 그림 (빠르게)
    COLORS.forEach((col) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      for (const p of particles) {
        if (p.color !== col) continue;
        const [x0, y0] = pos(p, lt - 0.025);
        const [x1, y1] = pos(p, lt);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 + 0.01, y1);
      }
      ctx.lineWidth = 2.6;
      ctx.stroke();
    });
    for (const p of particles) {
      if (!p.glow) continue;
      const [x, y] = pos(p, lt);
      const s = p.size * 7;
      ctx.drawImage(glowSprite(p.color, 32), x - s / 2, y - s / 2, s, s);
    }
    ctx.restore();

    // 글자가 완성되면 모서리 괄호 + 캡션
    const lock = ease.outExpo(prog(lt, 1.7, 1.95)) * (1 - prog(lt, 2.08, 2.16));
    if (lock > 0) {
      const bw = 620 + 40 * (1 - lock);
      const bh = 300 + 40 * (1 - lock);
      ctx.strokeStyle = rgba(C.acid, lock);
      ctx.lineWidth = 4;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const x = W / 2 + sx * bw;
        const y = H / 2 + sy * bh;
        ctx.beginPath();
        ctx.moveTo(x - sx * 60, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y - sy * 60);
        ctx.stroke();
      });
      ctx.font = `700 22px "Space Mono"`;
      ctx.fillStyle = rgba(C.acid, lock);
      ctx.textAlign = 'center';
      ctx.fillText(`${COUNT} PARTICLES · 1 IDEA`, W / 2, H / 2 + bh + 50);
    }
  },
};
