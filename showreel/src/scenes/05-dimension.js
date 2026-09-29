// 장면 5 · DIMENSION (9.5초 ~ 12.0초)
// 3D 원근 계산을 직접 해서 만든 장면: 회전하는 사각 링 터널을 날아가고,
// 가운데에는 네온 '토러스 매듭'이 3D로 회전. 박자마다 터널이 번쩍이고,
// 마지막엔 매듭이 한 점으로 빨려 들어가며 흰 빛이 터져 엔딩으로 넘어감

import { W, H, C, TAU, ease, prog, lerp, rng, rgba, mixColor } from '../lib.js';

const F = 900; // 카메라 초점 거리
const RINGS = 26;
const SPACING = 260;
const DEPTH = RINGS * SPACING;
const KNOT_N = 420;

const rand = rng(7);
const STARS = Array.from({ length: 260 }, () => ({
  x: (rand() - 0.5) * 3000,
  y: (rand() - 0.5) * 2000,
  z: rand() * DEPTH,
}));

function project(x, y, z) {
  const s = F / z;
  return [W / 2 + x * s, H / 2 + y * s, s];
}

function travel(lt) {
  // 워프 속도로 들어와 → 감속 순항 → 끝에 다시 가속
  return 5200 * ease.outExpo(prog(lt, 0, 0.9)) + 700 * lt + 16000 * ease.inExpo(prog(lt, 2.0, 2.5));
}

// 매듭 색: 코랄 → 보라 → 형광 연두, 멀수록 어둡게
function tubeColor(u, dark) {
  const stops = [C.coral, C.violet, C.acid].map((h) => parseInt(h.slice(1), 16));
  const k = u < 0.5 ? 0 : 1;
  const t = u < 0.5 ? u * 2 : (u - 0.5) * 2;
  const ink = parseInt(C.ink.slice(1), 16);
  const ch = (s) => {
    const v = lerp((stops[k] >> s) & 255, (stops[k + 1] >> s) & 255, t);
    return Math.round(lerp(v, (ink >> s) & 255, dark));
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

const beatFlash = (lt) => [0.5, 1.0, 1.5, 2.0].reduce((s, b) => s + Math.exp(-((lt - b) ** 2) / 0.002), 0);

export default {
  id: '05',
  name: 'DIMENSION',
  start: 9.5,
  end: 12.0,
  draw(ctx, lt) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    const tr = travel(lt);
    const trPrev = travel(lt - 0.03);
    const flash = beatFlash(lt);

    // 별 (속도에 따라 길게 늘어짐)
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(C.paper, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const s of STARS) {
      const z1 = ((((s.z - tr) % DEPTH) + DEPTH) % DEPTH) + 40;
      const z0 = z1 + (tr - trPrev);
      if (z0 > DEPTH) continue;
      const [x1, y1] = project(s.x, s.y, z1);
      const [x0, y0] = project(s.x, s.y, z0);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 + 0.01, y1);
    }
    ctx.stroke();

    // 사각 링 터널 (먼 것부터 그림)
    const rings = [];
    for (let k = 0; k < RINGS; k++) {
      const z = ((((k * SPACING - tr) % DEPTH) + DEPTH) % DEPTH) + 60;
      rings.push(z);
    }
    rings.sort((a, b) => b - a);
    for (const z of rings) {
      const depth = z / DEPTH;
      const rot = z * 0.0011 + lt * 0.8;
      const half = 820;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = rot + (i / 4) * TAU + Math.PI / 4;
        const [x, y] = project(Math.cos(a) * half, Math.sin(a) * half * 0.8, z);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      // 가까우면 코랄, 멀면 파랑. 박자마다 형광 연두로 번쩍
      ctx.strokeStyle =
        flash > 0.05
          ? mixColor(C.blue, C.acid, Math.min(1, flash) * (1 - depth * 0.7))
          : mixColor(C.coral, C.blue, Math.min(1, depth * 1.6));
      ctx.globalAlpha = (1 - depth) ** 1.4;
      ctx.lineWidth = Math.max(1, 26 * (F / z) * 0.35);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 토러스 매듭 (p=2, q=3)
    const appear = ease.outBack(prog(lt, 0.15, 0.7), 1.6);
    const collapse = ease.inExpo(prog(lt, 1.95, 2.3));
    const pulse = 1 + 0.1 * flash;
    const scale = 150 * appear * (1 - collapse) * pulse;
    if (scale > 0.5) {
      const ry = lt * 1.3 + collapse * 6;
      const rx = 0.6 + lt * 0.7;
      const pts = [];
      for (let i = 0; i <= KNOT_N; i++) {
        const u = (i / KNOT_N) * TAU;
        const r = Math.cos(3 * u) + 2.2;
        let x = r * Math.cos(2 * u);
        let y = r * Math.sin(2 * u);
        let z = -Math.sin(3 * u) * 1.1;
        // Y축 회전 → X축 회전
        [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
        [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
        pts.push([x * scale, y * scale, 1500 + z * scale, i / KNOT_N]);
      }
      const scr = pts.map(([x, y, z, u]) => [...project(x, y, z), z, u]);
      // 매듭 전체 뒤쪽에 은은한 빛 번짐
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = ctx.lineJoin = 'round';
      [[70, 0.05], [36, 0.08]].forEach(([w, a]) => {
        ctx.strokeStyle = rgba(C.violet, a + 0.05 * flash);
        ctx.lineWidth = w * (scale / 150);
        ctx.beginPath();
        scr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
      ctx.restore();

      // 튜브: 6조각씩 묶은 띠를 먼 것부터 그리고, 먼 쪽은 어둡게 칠해 입체감
      const CH = 6;
      const chunks = [];
      for (let i = 0; i < KNOT_N; i += CH) {
        const part = scr.slice(i, Math.min(i + CH, KNOT_N) + 1);
        chunks.push({ part, z: part.reduce((s, p) => s + p[3], 0) / part.length, u: part[0][4] });
      }
      chunks.sort((a, b) => b.z - a.z);
      ctx.lineCap = ctx.lineJoin = 'round';
      const zMin = 1500 - 3.4 * scale;
      const line = (part, dx = 0, dy = 0) => {
        ctx.beginPath();
        part.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
      };
      for (const { part, z, u } of chunks) {
        const near = Math.max(0, Math.min(1, 1 - (z - zMin) / (6.8 * scale)));
        const w = 26 * part[0][2] * (scale / 150);
        line(part);
        // 테두리는 잘린 끝(butt)으로 → 조각 사이 이음새가 안 보임
        ctx.lineCap = 'butt';
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = w + 7;
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.strokeStyle = tubeColor(u, (1 - near) * 0.6);
        ctx.lineWidth = w;
        ctx.stroke();
        // 하이라이트 (튜브 윗면 반사광)
        line(part, -w * 0.16, -w * 0.2);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = rgba(C.paper, 0.2 + 0.5 * near);
        ctx.lineWidth = w * 0.2;
        ctx.stroke();
        ctx.lineCap = 'round';
      }
    }

    // 끝: 가운데에서 흰 빛이 터짐
    const burst = ease.inExpo(prog(lt, 2.22, 2.5));
    if (burst > 0) {
      ctx.fillStyle = C.paper;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, burst * 1200, 0, TAU);
      ctx.fill();
    }
    const spark = Math.exp(-((lt - 2.28) ** 2) / 0.001);
    if (spark > 0.01) {
      ctx.fillStyle = rgba(C.paper, spark);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 10 + spark * 20, 0, TAU);
      ctx.fill();
      ctx.fillRect(W / 2 - 600 * spark, H / 2 - 2, 1200 * spark, 4);
    }
  },
};
