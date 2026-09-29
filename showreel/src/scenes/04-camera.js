// 장면 4 · CAMERA (7.0초 ~ 10.0초) — 카메라 무빙 4연타 (3D 원근을 직접 계산)
//  a) 0.00~1.45  돌리 줌(버티고 효과): 카메라는 앞으로 가는데 화각은 넓어져서
//                코랄 원(피사체)은 크기가 그대로인 채 복도만 쭉 늘어남
//  b) 1.45~1.60  휩 팬: 카메라가 오른쪽으로 90° 휙 돌아감
//  c) 1.60~1.90  크래시 줌: 새로 보인 큐브 덩어리로 확 당겨 들어감
//  d) 1.90~3.00  오빗: 큐브 덩어리 주위를 돌며, 박자마다 루빅스 큐브처럼 한 층씩 90° 회전 → 사방으로 폭발

import { W, H, C, TAU, ease, prog, lerp, rgba, FONT_MONO } from '../lib.js';
import { DISK_R } from './03-shapes.js';

const SUBJ_Z = 3000;
const SUBJ_R = 160;
const D0 = 3000;
const D1 = 450;
const K = DISK_R / SUBJ_R; // 화면 크기 유지용: f / D = K

const HALF_W = 820;
const HALF_H = 460;
const FAR = SUBJ_Z + 4200;

const ORBIT_R = 1500;
const CAM_END = { x: 0, y: 0, z: SUBJ_Z - D1 };
const CLUSTER = { x: CAM_END.x + ORBIT_R, y: 0, z: CAM_END.z };

// ---------- 카메라 ----------
function camera(lt) {
  const d = lerp(D0, D1, ease.inOutCubic(prog(lt, 0.02, 1.45)));
  const whip = ease.inOutCubic(prog(lt, 1.45, 1.6));
  const orbitP = ease.inOutCubic(prog(lt, 1.6, 3.0));
  const theta = orbitP * ((115 * Math.PI) / 180);
  const pitch = ease.inOutCubic(prog(lt, 1.62, 2.3)) * ((26 * Math.PI) / 180);
  const yaw = whip * (Math.PI / 2) + theta;
  let f = d * K;
  const crash = ease.outExpo(prog(lt, 1.62, 1.92));
  f = lerp(f, 1500, crash) + 350 * prog(lt, 1.9, 2.7);
  f *= 1 + 3.5 * ease.inExpo(prog(lt, 2.7, 3.0));
  let pos;
  if (lt < 1.6) {
    pos = { x: 0, y: 0, z: SUBJ_Z - d };
  } else {
    const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    pos = {
      x: CLUSTER.x - ORBIT_R * sy * cp,
      y: CLUSTER.y - ORBIT_R * sp,
      z: CLUSTER.z - ORBIT_R * cy * cp,
    };
  }
  return { pos, yaw, pitch, f, mm: Math.round((f * 36) / W) };
}

function toCam(cam, p) {
  const dx = p.x - cam.pos.x, dy = p.y - cam.pos.y, dz = p.z - cam.pos.z;
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
  return { x: x1, y: dy * cp - z1 * sp, z: dy * sp + z1 * cp };
}
const NEAR = 20;
function proj(cam, q) {
  return [W / 2 + (cam.f * q.x) / q.z, H / 2 + (cam.f * q.y) / q.z];
}
// 카메라 앞쪽 부분만 남기도록 선분을 잘라서 그림
function line3(ctx, cam, a, b) {
  let p = toCam(cam, a), q = toCam(cam, b);
  if (p.z < NEAR && q.z < NEAR) return;
  if (p.z < NEAR || q.z < NEAR) {
    const t = (NEAR - p.z) / (q.z - p.z);
    const m = { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), z: NEAR };
    if (p.z < NEAR) p = m;
    else q = m;
  }
  const [x0, y0] = proj(cam, p);
  const [x1, y1] = proj(cam, q);
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
}

// ---------- a) 돌리 줌 복도 ----------
function drawCorridor(ctx, cam, lt) {
  const fade = 1 - prog(lt, 1.45, 1.6);
  if (fade <= 0) return;
  const beat = [0.5, 1.0].reduce((s, b) => s + Math.exp(-((lt - b) ** 2) / 0.003), 0);
  ctx.lineWidth = 2;
  // 바닥·천장·벽의 세로줄 (깊이 방향)
  ctx.strokeStyle = rgba(C.paper, 0.35 * fade);
  ctx.beginPath();
  const z0 = cam.pos.z + 1;
  for (let j = 0; j <= 10; j++) {
    const x = -HALF_W + (j * HALF_W * 2) / 10;
    line3(ctx, cam, { x, y: HALF_H, z: z0 }, { x, y: HALF_H, z: FAR });
    line3(ctx, cam, { x, y: -HALF_H, z: z0 }, { x, y: -HALF_H, z: FAR });
  }
  for (let j = 1; j < 6; j++) {
    const y = -HALF_H + (j * HALF_H * 2) / 6;
    line3(ctx, cam, { x: HALF_W, y, z: z0 }, { x: HALF_W, y, z: FAR });
    line3(ctx, cam, { x: -HALF_W, y, z: z0 }, { x: -HALF_W, y, z: FAR });
  }
  ctx.stroke();
  // 사각 프레임 링 (먼 것부터)
  const rings = [];
  for (let z = 0; z <= FAR; z += 300) if (z > cam.pos.z + NEAR) rings.push(z);
  rings.reverse();
  for (const z of rings) {
    const depth = (z - cam.pos.z) / (FAR - cam.pos.z);
    ctx.strokeStyle = rgba(beat > 0.05 && z > SUBJ_Z ? C.acid : C.paper, (1 - depth) ** 1.2 * fade * (0.5 + 0.5 * Math.min(1, beat + 0.6)));
    ctx.lineWidth = z === SUBJ_Z ? 5 : 3;
    ctx.beginPath();
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
    for (let k = 0; k < 4; k++) {
      line3(ctx, cam, { x: c[k][0] * HALF_W, y: c[k][1] * HALF_H, z }, { x: c[k + 1][0] * HALF_W, y: c[k + 1][1] * HALF_H, z });
    }
    ctx.stroke();
  }
  // 피사체: 크기가 변하지 않는 코랄 원 + 초점 링
  const q = toCam(cam, { x: 0, y: 0, z: SUBJ_Z });
  if (q.z > NEAR) {
    const [sx, sy] = proj(cam, q);
    const r = (cam.f * SUBJ_R) / q.z;
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(C.paper, 0.8 * fade * ease.outExpo(prog(lt, 0.05, 0.4)));
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    ctx.lineDashOffset = -lt * 60;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 26, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ---------- d) 루빅스 큐브 덩어리 ----------
const CUBE = 150;
const GAP = 185;
const CUBE_COLORS = [C.coral, C.blue, C.acid, C.violet, C.paper];
const CUBES = [];
for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
  CUBES.push({ o: [i, j, k], color: CUBE_COLORS[(i * 7 + j * 3 + k * 5 + 40) % CUBE_COLORS.length] });
}
const FACES = [
  { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: [-1, 0, 0], v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] },
  { n: [0, 1, 0], v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [0, -1, 0], v: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] },
  { n: [0, 0, 1], v: [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]] },
  { n: [0, 0, -1], v: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] },
];
const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const LIGHT = (() => {
  const l = [-0.5, -0.8, -0.35];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ink = parseInt(C.ink.slice(1), 16);
  const ch = (s) => Math.round(lerp((ink >> s) & 255, (n >> s) & 255, k));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function drawCubes(ctx, cam, lt) {
  const show = prog(lt, 1.47, 1.55);
  if (show <= 0) return;
  // 박자마다 한 층씩 90° 회전 (윗층 → 오른쪽 세로층)
  const a1 = ease.inOutExpo(prog(lt, 2.0, 2.22)) * (Math.PI / 2);
  const a2 = ease.inOutExpo(prog(lt, 2.5, 2.72)) * (Math.PI / 2);
  const boom = ease.inExpo(prog(lt, 2.72, 3.0));
  const faces = [];
  for (const cube of CUBES) {
    const layer1 = cube.o[1] === -1;
    const after1 = layer1 ? rotY(cube.o, Math.PI / 2).map(Math.round) : cube.o;
    const layer2 = after1[0] === 1;
    const xf = (v) => {
      let p = v;
      if (layer1) p = rotY(p, a1);
      if (layer2) p = rotX(p, a2);
      return p;
    };
    const dir = cube.o.map((c) => c + 0.001);
    const spin = boom * 3;
    for (const face of FACES) {
      const pts = face.v.map((v) => {
        let p = v.map((c) => (c * CUBE) / 2);
        p = rotX(rotY(p, spin * cube.o[0]), spin * cube.o[2]);
        p = xf(p.map((c, i) => c + cube.o[i] * GAP));
        return {
          x: CLUSTER.x + p[0] + dir[0] * boom * 2600,
          y: CLUSTER.y + p[1] + dir[1] * boom * 2600,
          z: CLUSTER.z + p[2] + dir[2] * boom * 2600,
        };
      });
      let n = rotX(rotY(face.n, spin * cube.o[0]), spin * cube.o[2]);
      if (layer1) n = rotY(n, a1);
      if (layer2) n = rotX(n, a2);
      const cams = pts.map((p) => toCam(cam, p));
      if (cams.some((q) => q.z < NEAR)) continue;
      // 뒷면 제거: 카메라 쪽을 향한 면만
      const mid = pts.reduce((s, p) => ({ x: s.x + p.x / 4, y: s.y + p.y / 4, z: s.z + p.z / 4 }), { x: 0, y: 0, z: 0 });
      const toC = [cam.pos.x - mid.x, cam.pos.y - mid.y, cam.pos.z - mid.z];
      if (n[0] * toC[0] + n[1] * toC[1] + n[2] * toC[2] <= 0) continue;
      const light = 0.38 + 0.62 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      faces.push({ cams, depth: cams.reduce((s, q) => s + q.z, 0) / 4, color: shade(cube.color, light) });
    }
  }
  faces.sort((a, b) => b.depth - a.depth);
  ctx.globalAlpha = show;
  ctx.lineJoin = 'round';
  for (const f of faces) {
    ctx.beginPath();
    f.cams.forEach((q, i) => {
      const [x, y] = proj(cam, q);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 휩 팬 동안의 가로 잔상
function drawWhipStreaks(ctx, lt) {
  const s = Math.sin(prog(lt, 1.45, 1.62) * Math.PI);
  if (s <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const y = ((i * 7919) % 1080);
    const len = 400 + ((i * 131) % 900);
    const x = ((i * 3571) % 1920) - len / 2;
    ctx.fillStyle = rgba(i % 5 === 0 ? C.coral : C.paper, 0.12 * s);
    ctx.fillRect(x, y, len * s * 1.5, 2 + (i % 3));
  }
  ctx.restore();
}

// 뷰파인더 정보 (지금 무슨 카메라 기법인지 표시)
function drawReadout(ctx, cam, lt) {
  const label =
    lt < 1.45 ? `DOLLY ZOOM   ƒ ${cam.mm}MM` : lt < 1.62 ? 'WHIP PAN' : lt < 1.95 ? `CRASH ZOOM   ƒ ${cam.mm}MM` : lt < 2.72 ? 'ORBIT + LAYER TWIST' : 'SCATTER';
  ctx.font = `700 22px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.acid;
  ctx.fillText(label, W / 2, H - 120);
  // REC 표시
  if (Math.floor(lt * 2) % 2 === 0) {
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.arc(W / 2 - 52, 128, 8, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.paper;
  ctx.textAlign = 'left';
  ctx.fillText('REC', W / 2 - 34, 136);
  // 삼분할 가이드 코너
  ctx.strokeStyle = rgba(C.paper, 0.35);
  ctx.lineWidth = 2;
  const bx = 300, by = 170;
  [[bx, by, 1, 1], [W - bx, by, -1, 1], [bx, H - by, 1, -1], [W - bx, H - by, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 40);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 40, y);
    ctx.stroke();
  });
}

export default {
  id: '04',
  name: 'CAMERA',
  start: 7.0,
  end: 10.0,
  // 휩 팬처럼 아주 빠른 순간엔 모션 블러 샘플을 늘림
  samplesAt: (lt) => (lt > 1.44 && lt < 1.64 ? 12 : lt > 2.7 ? 8 : 0),
  draw(ctx, lt) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    const cam = camera(lt);
    drawCorridor(ctx, cam, lt);
    drawCubes(ctx, cam, lt);
    drawWhipStreaks(ctx, lt);
    drawReadout(ctx, cam, lt);
  },
};
