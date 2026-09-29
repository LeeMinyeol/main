// 장면 6 · OUTRO (12.0초 ~ 15.0초)
// 흰 화면 위로 색 띠 5개가 차례로 쓸고 지나간 뒤, 이름 카드가 나타남:
// 'CLAUDE' 글자가 솟아오르고 → 코랄 밑줄이 그어지고 → 'MOTION DESIGNER' 가 암호 풀리듯 나타남
// 배경에는 앞 장면의 도형들이 작게 떠다니고, 마지막 0.3초에 검게 페이드아웃

import { W, H, C, TAU, ease, prog, lerp, rgba, layoutLetters, polygonPoints, starPoints, tracePath, FONT_DISPLAY, FONT_MONO } from '../lib.js';

const NAME = 'CLAUDE';
const TITLE = 'MOTION DESIGNER';
const GLYPHS = '#%&*+/<>=?@$ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
const WIPES = [C.coral, C.acid, C.blue, C.violet, C.ink];

const FLOATERS = [
  { pts: polygonPoints(0, 46, 90), x: 0.14, y: 0.22, col: C.coral, spin: 0.4 },
  { pts: polygonPoints(3, 54, 90), x: 0.86, y: 0.26, col: C.acid, spin: -0.6 },
  { pts: polygonPoints(4, 44, 90, Math.PI / 4), x: 0.1, y: 0.78, col: C.blue, spin: 0.5 },
  { pts: starPoints(5, 52, 24, 90), x: 0.9, y: 0.76, col: C.violet, spin: 0.3 },
];

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export default {
  id: '06',
  name: 'OUTRO',
  start: 12.0,
  end: 15.0,
  draw(ctx, lt) {
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);

    // 색 띠가 차례로 화면을 쓸고 지나감 (마지막 잉크색이 배경으로 남음)
    WIPES.forEach((col, i) => {
      const p = ease.inOutExpo(prog(lt, 0.02 + i * 0.07, 0.42 + i * 0.07));
      if (p <= 0) return;
      const edge = p * (W + 400);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(edge, 0);
      ctx.lineTo(edge - 400, H);
      ctx.lineTo(-10, H);
      ctx.closePath();
      ctx.fill();
    });

    // 떠다니는 도형들 (앞 장면 오마주)
    FLOATERS.forEach((f, i) => {
      const a = ease.outBack(prog(lt, 0.6 + i * 0.08, 1.0 + i * 0.08));
      if (a <= 0) return;
      ctx.save();
      ctx.translate(f.x * W + Math.sin(lt * 1.3 + i) * 14, f.y * H + Math.cos(lt * 1.1 + i * 2) * 12);
      ctx.rotate(lt * f.spin);
      ctx.scale(a, a);
      tracePath(ctx, f.pts);
      ctx.strokeStyle = f.col;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    });

    // 이름: 글자가 마스크 안에서 솟아오름
    const size = 300;
    const font = `${size}px ${FONT_DISPLAY}`;
    const { letters, total } = layoutLetters(ctx, NAME, font, 18);
    const baseY = H / 2 + 40;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, baseY - size * 0.95, W, size * 1.0);
    ctx.clip();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.paper;
    letters.forEach((l, i) => {
      const p = prog(lt, 0.45 + i * 0.04, 0.85 + i * 0.04);
      const y = baseY + (1 - ease.outBack(p, 1.3)) * size * 1.05;
      ctx.fillText(l.ch, W / 2 + l.x, y);
    });
    ctx.restore();

    // 코랄 밑줄이 왼쪽에서 오른쪽으로 그어짐
    const ul = ease.inOutExpo(prog(lt, 0.8, 1.2));
    if (ul > 0) {
      ctx.fillStyle = C.coral;
      ctx.fillRect(W / 2 - total / 2, baseY + 34, total * ul, 12);
    }

    // 'MOTION DESIGNER' 암호 해독 효과
    ctx.font = `700 40px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    const tl = layoutLetters(ctx, TITLE, `700 40px ${FONT_MONO}`, 14);
    tl.letters.forEach((l, i) => {
      const t0 = 0.95 + i * 0.03;
      if (lt < t0 - 0.2 || l.ch === ' ') return;
      const solved = lt >= t0 + 0.12;
      const ch = solved ? l.ch : GLYPHS[Math.floor(hash(i * 31 + Math.floor(lt * 30)) * GLYPHS.length)];
      ctx.fillStyle = solved ? C.paper : C.acid;
      ctx.fillText(ch, W / 2 + l.x, baseY + 120);
    });

    // 하단 정보 줄
    const info = ease.outExpo(prog(lt, 1.45, 1.9));
    if (info > 0) {
      ctx.font = `400 22px ${FONT_MONO}`;
      ctx.fillStyle = rgba(C.paper, 0.75 * info);
      const y = H - 110 + (1 - info) * 20;
      ctx.textAlign = 'left';
      ctx.fillText('SHOWREEL — 2026', 140, y);
      ctx.textAlign = 'right';
      ctx.fillText('450 FRAMES · 0 KEYFRAMES · 100% CODE', W - 140, y);
      ctx.fillStyle = rgba(C.paper, 0.25 * info);
      ctx.fillRect(140, y - 44, (W - 280) * info, 2);
    }

    // 마지막 페이드아웃
    const out = prog(lt, 2.7, 3.0);
    if (out > 0) {
      ctx.fillStyle = rgba('#000000', ease.inCubic(out));
      ctx.fillRect(0, 0, W, H);
    }
  },
};
