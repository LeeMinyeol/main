// 장면 3 · GEOMETRY (4.5초 ~ 7.0초)
// 16x9 타일 격자가 가운데서부터 물결처럼 회전·변형(네모 ↔ 동그라미)하고,
// 가운데 큰 도형이 박자마다 원 → 삼각형 → 사각형 → 육각형 → 별로 모핑.
// 마지막엔 도형이 링이 되고, 카메라가 링 구멍 속으로 돌진해 다음 장면으로 이어짐

import { W, H, C, TAU, ease, prog, lerp, rgba, mixColor, polygonPoints, starPoints, tracePath } from '../lib.js';

const COLS = 16;
const ROWS = 9;
const CELL = W / COLS;
const N = 180;
const SHAPES = [
  polygonPoints(0, 250, N),
  polygonPoints(3, 300, N),
  polygonPoints(4, 280, N, -Math.PI / 4),
  polygonPoints(6, 270, N),
  starPoints(5, 310, 140, N),
];
const RING = polygonPoints(0, 270, N);

function heroPoints(lt) {
  // 0.5초마다 다음 모양으로 (0.22초 동안 모핑)
  let pts = SHAPES[0];
  for (let k = 1; k < SHAPES.length; k++) {
    const p = ease.inOutExpo(prog(lt, k * 0.5 - 0.11, k * 0.5 + 0.11));
    if (p <= 0) break;
    pts = pts.map(([x, y], i) => [lerp(x, SHAPES[k][i][0], p), lerp(y, SHAPES[k][i][1], p)]);
  }
  const toRing = ease.inOutCubic(prog(lt, 2.05, 2.2));
  if (toRing > 0) pts = pts.map(([x, y], i) => [lerp(x, RING[i][0], toRing), lerp(y, RING[i][1], toRing)]);
  return pts;
}

export default {
  id: '03',
  name: 'GEOMETRY',
  start: 4.5,
  end: 7.0,
  draw(ctx, lt) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);

    // 끝부분: 링 속으로 줌인
    const zoom = lerp(1, 26, ease.inExpo(prog(lt, 2.12, 2.5)));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate(ease.inExpo(prog(lt, 2.12, 2.5)) * 0.6);
    ctx.translate(-W / 2, -H / 2);

    // 타일 격자
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        const d = Math.hypot(cx - W / 2, cy - H / 2);
        const appear = ease.outBack(prog(lt, (c + r) * 0.018, (c + r) * 0.018 + 0.35), 2);
        if (appear <= 0) continue;
        const phase = lt * 6.5 - d * 0.012;
        const wave = 0.5 + 0.5 * Math.sin(phase);
        const size = (34 + 46 * wave) * appear;
        const radius = (size / 2) * (0.5 + 0.5 * Math.sin(phase + Math.PI / 2));
        const rot = ease.inOutCubic((((phase / TAU) % 1) + 1) % 1) * (Math.PI / 2);
        const crest = Math.max(0, (wave - 0.82) / 0.18);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = crest > 0 ? mixColor(C.blue, (r + c) % 2 ? C.acid : C.coral, crest) : rgba(C.blue, 0.35 + 0.5 * wave);
        ctx.beginPath();
        ctx.roundRect(-size / 2, -size / 2, size, size, radius);
        ctx.fill();
        ctx.restore();
      }
    }

    // 가운데 도형 뒤를 어둡게 비워서 잘 보이게
    const holeIn = ease.outExpo(prog(lt, 0.1, 0.6));
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 390 * holeIn, 0, TAU);
    ctx.fill();

    // 가운데 모핑 도형 + 뒤따라오는 잔상 외곽선
    const grow = ease.outElastic(prog(lt, 0.05, 0.9));
    const pulse = 1 + [0.5, 1.0, 1.5, 2.0].reduce((s, b) => s + 0.07 * Math.exp(-((lt - b) ** 2) / 0.003), 0);
    for (let e = 4; e >= 0; e--) {
      const tt = lt - e * 0.045;
      const pts = heroPoints(tt);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(tt * 0.9);
      ctx.scale(grow * pulse, grow * pulse);
      tracePath(ctx, pts);
      if (e === 0) {
        const ringP = prog(lt, 2.05, 2.2);
        if (ringP < 1) {
          ctx.fillStyle = rgba(C.coral, 1 - ringP);
          ctx.fill();
        }
        ctx.strokeStyle = C.paper;
        ctx.lineWidth = 6 + ringP * 10;
        ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(e % 2 ? C.acid : C.paper, 0.5 - e * 0.09);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  },
};
