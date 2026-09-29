// 장면 1 · IGNITION (0.0초 ~ 2.0초)
// 점 하나가 톡 튀어나와 → 충격파 링과 방사형 선이 터지고 → 인사말이 타이핑된 뒤
// → 점이 가로선으로 늘어나 화면 전체를 코랄색으로 덮으며 다음 장면으로 넘어감

import { W, H, C, TAU, ease, prog, lerp, rgba, FONT_MONO } from '../lib.js';

const CX = W / 2;
const CY = H / 2;
const GREETING = 'HELLO. I MAKE THINGS MOVE.';

export default {
  id: '01',
  name: 'IGNITION',
  start: 0.0,
  end: 2.0,
  draw(ctx, lt) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);

    // 충격파 링 두 개 (0.5초 박자에 맞춰)
    [
      [0.5, C.paper, 34],
      [0.58, C.coral, 18],
      [1.0, C.acid, 8],
    ].forEach(([t0, col, lw]) => {
      const p = prog(lt, t0, t0 + 0.9);
      if (p <= 0 || p >= 1) return;
      const r = ease.outExpo(p) * 1150;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * (1 - p);
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, TAU);
      ctx.stroke();
    });

    // 방사형 스피드 라인 24개
    const burst = prog(lt, 0.5, 1.15);
    if (burst > 0 && burst < 1) {
      const cols = [C.paper, C.coral, C.acid];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU + 0.13;
        const r2 = 60 + ease.outExpo(burst) * (700 + (i % 3) * 160);
        const r1 = 60 + ease.inOutCubic(burst) * (700 + (i % 3) * 160);
        ctx.strokeStyle = cols[i % 3];
        ctx.lineWidth = i % 2 ? 6 : 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
        ctx.lineTo(CX + Math.cos(a) * r2, CY + Math.sin(a) * r2);
        ctx.stroke();
      }
    }

    // 궤도를 도는 위성 점 3개 + 꼬리
    const orbitIn = ease.outBack(prog(lt, 0.55, 0.95));
    const orbitOut = 1 - ease.inExpo(prog(lt, 1.45, 1.65));
    const orbitK = orbitIn * orbitOut;
    if (orbitK > 0.001) {
      [C.coral, C.acid, C.blue].forEach((col, k) => {
        for (let s = 0; s < 14; s++) {
          const tt = lt - s * 0.012;
          const a = tt * 7 + (k * TAU) / 3;
          const r = 120 * orbitK;
          ctx.fillStyle = rgba(col === C.blue ? '#6F8BFF' : col, (1 - s / 14) * 0.9);
          ctx.beginPath();
          ctx.arc(CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.9, 10 * (1 - s / 16) * orbitK, 0, TAU);
          ctx.fill();
        }
      });
    }

    // 인사말 타이핑 (1.0초부터)
    const typeP = prog(lt, 1.0, 1.4);
    if (typeP > 0 && lt < 1.95) {
      const n = Math.floor(typeP * GREETING.length);
      const txt = GREETING.slice(0, n);
      ctx.font = `700 34px ${FONT_MONO}`;
      ctx.textBaseline = 'middle';
      const full = ctx.measureText(GREETING).width;
      const x0 = CX - full / 2;
      const y = CY + 170;
      ctx.fillStyle = C.paper;
      ctx.fillText(txt, x0, y);
      // 깜빡이는 블록 커서
      if (Math.floor(lt * 8) % 2 === 0 || typeP < 1) {
        ctx.fillStyle = C.coral;
        ctx.fillRect(x0 + ctx.measureText(txt).width + 6, y - 20, 20, 40);
      }
    }

    // 가운데 점: 튀어나옴 → 박동 → 가로선으로 늘어남 → 화면을 덮음
    const pop = ease.outBack(prog(lt, 0.0, 0.3), 3);
    const pulse = 1 + 0.35 * Math.exp(-((lt - 0.5) ** 2) / 0.004) + 0.25 * Math.exp(-((lt - 1.0) ** 2) / 0.004);
    const stretch = ease.inOutExpo(prog(lt, 1.45, 1.8));
    const fill = ease.inExpo(prog(lt, 1.72, 2.0));
    const r = 16 * pop * pulse;
    const halfW = lerp(r, W * 0.52, stretch);
    const halfH = lerp(r, H * 0.52, fill);
    ctx.fillStyle = stretch > 0 ? C.coral : C.paper;
    ctx.beginPath();
    ctx.roundRect(CX - halfW, CY - Math.max(halfH, r * (1 - stretch * 0.6)), halfW * 2, Math.max(halfH, r * (1 - stretch * 0.6)) * 2, Math.min(r, halfH));
    ctx.fill();
  },
};
