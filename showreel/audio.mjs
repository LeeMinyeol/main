// 사운드트랙: 외부 음원 없이 수학으로 직접 합성 (120BPM = 한 박자 0.5초, 장면 전환은 모두 박자 위)
// 킥·클랩·하이햇·베이스·패드·라이저·임팩트·효과음을 만들어 WAV 파일로 저장
// 코드 진행: Am → F → C → Dm(드론) → G → Am → F → E(긴장) → … → Am9 (마지막 착지에서 해결)

import { writeFileSync } from 'node:fs';

const SR = 48000;
const DUR = 15;
const N = SR * DUR;
const TAU = Math.PI * 2;

export function makeSoundtrack(path) {
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  let seed = 12345;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  const add = (i, v, pan = 0) => {
    if (i < 0 || i >= N) return;
    L[i] += v * (1 - Math.max(0, pan));
    R[i] += v * (1 + Math.min(0, pan));
  };
  const idx = (t) => Math.round(t * SR);

  function kick(t, g = 1) {
    let ph = 0;
    for (let k = 0; k < SR * 0.45; k++) {
      const tau = k / SR;
      const f = 44 + 120 * Math.exp(-tau * 32);
      ph += (TAU * f) / SR;
      const click = k < SR * 0.004 ? noise() * 0.5 * (1 - k / (SR * 0.004)) : 0;
      add(idx(t) + k, g * (Math.sin(ph) * Math.exp(-tau * 7.5) + click));
    }
  }
  function clap(t, g = 0.5) {
    let lp = 0;
    for (let k = 0; k < SR * 0.25; k++) {
      const tau = k / SR;
      const n = noise();
      lp += 0.25 * (n - lp);
      const env = [0, 0.011, 0.022].reduce((s, o) => s + (tau >= o ? Math.exp(-(tau - o) * (o < 0.02 ? 90 : 16)) : 0), 0);
      add(idx(t) + k, g * (n - lp) * env * 0.8);
    }
  }
  function hat(t, g = 0.18, pan = 0.3, len = 0.05) {
    let lp = 0;
    for (let k = 0; k < SR * len; k++) {
      const n = noise();
      lp += 0.6 * (n - lp);
      add(idx(t) + k, g * (n - lp) * Math.exp(-(k / SR) * (4 / len)), pan);
    }
  }
  function blip(t, f = 1800, g = 0.12, len = 0.03, pan = 0) {
    for (let k = 0; k < SR * len; k++) {
      const tau = k / SR;
      add(idx(t) + k, g * Math.sin(TAU * f * tau) * Math.exp(-tau * (5 / len)), pan);
    }
  }
  function impact(t, g = 1) {
    let ph = 0;
    let lp = 0;
    for (let k = 0; k < SR * 1.6; k++) {
      const tau = k / SR;
      ph += (TAU * (30 + 50 * Math.exp(-tau * 6))) / SR;
      lp += 0.08 * (noise() - lp);
      add(idx(t) + k, g * (0.9 * Math.sin(ph) * Math.exp(-tau * 2.2) + 1.4 * lp * Math.exp(-tau * 5)));
    }
    // 심벌 크래시 (좌우로 퍼짐)
    let hp = 0;
    for (let k = 0; k < SR * 1.4; k++) {
      const n = noise();
      hp += 0.5 * (n - hp);
      const v = g * 0.22 * (n - hp) * Math.exp(-(k / SR) * 3);
      add(idx(t) + k, v, k % 2 ? 0.5 : -0.5);
    }
  }
  // 대역 필터가 위로 쓸려 올라가는 노이즈 (라이저 / 휙 소리)
  function sweep(t0, t1, f0, f1, g, shape = (p) => p * p) {
    let low = 0;
    let band = 0;
    const n0 = idx(t0);
    const len = idx(t1) - n0;
    for (let k = 0; k < len; k++) {
      const p = k / len;
      const fc = f0 * Math.pow(f1 / f0, p);
      const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
      const x = noise();
      low += f * band;
      const high = x - low - 0.35 * band;
      band += f * high;
      add(n0 + k, g * band * shape(p), Math.sin(p * TAU * 3) * 0.4);
    }
  }
  function saw(ph) {
    return 2 * (ph - Math.floor(ph + 0.5));
  }

  // ---------- 추가 악기 ----------
  // 우드블록 딸깍 (타일 회전)
  function tick(t, f = 1200, g = 0.18, pan = 0) {
    for (let k = 0; k < SR * 0.06; k++) {
      const tau = k / SR;
      add(idx(t) + k, g * (Math.sin(TAU * f * tau) * 0.8 + noise() * 0.3 * Math.exp(-tau * 400)) * Math.exp(-tau * 70), pan);
    }
  }
  // 루빅스 큐브 철컥
  function clack(t, g = 0.4) {
    let lp = 0;
    for (let k = 0; k < SR * 0.12; k++) {
      const tau = k / SR;
      lp += 0.3 * (noise() - lp);
      add(idx(t) + k, g * (lp * Math.exp(-tau * 45) + 0.6 * Math.sin(TAU * 140 * tau) * Math.exp(-tau * 30)));
    }
  }
  // 음정이 미끄러지는 사인 (f0 → f1)
  function glide(t0, t1, f0, f1, g, pan = 0) {
    let ph = 0;
    const n0 = idx(t0);
    const len = idx(t1) - n0;
    for (let k = 0; k < len; k++) {
      const p = k / len;
      ph += (TAU * f0 * Math.pow(f1 / f0, p)) / SR;
      add(n0 + k, g * Math.sin(ph) * Math.min(1, k / (SR * 0.01)) * (1 - p) ** 0.7, pan);
    }
  }

  // ---------- 코드 진행 / 킥 위치 ----------
  const A = [220, 261.63, 329.63], F = [174.61, 220, 261.63], Cmaj = [196, 261.63, 329.63];
  const Dm = [146.83, 174.61, 220], G = [196, 246.94, 293.66], E = [164.81, 207.65, 246.94];
  const PROG = [
    { t0: 1.0, t1: 3.0, notes: A, root: 55 },
    { t0: 3.0, t1: 5.0, notes: F, root: 43.65 },
    { t0: 5.0, t1: 7.0, notes: Cmaj, root: 65.41 },
    { t0: 7.0, t1: 8.5, notes: Dm, root: 36.71, drone: true },
    { t0: 8.5, t1: 10.0, notes: G, root: 49 },
    { t0: 10.0, t1: 11.0, notes: A, root: 55 },
    { t0: 11.0, t1: 12.0, notes: F, root: 43.65 },
    { t0: 12.0, t1: 12.5, notes: E, root: 41.2 },
  ];
  const kicks = [0.0, 0.5];
  for (let t = 1.0; t < 7.0 - 1e-6; t += 0.5) kicks.push(t);
  kicks.push(7.0, 7.5, 8.0);
  for (let t = 8.5; t < 12.5 - 1e-6; t += 0.5) kicks.push(t);
  kicks.push(14.0);
  const lastKick = (t) => {
    let k = -1;
    for (const x of kicks) if (x <= t) k = x;
    return k;
  };

  // ---------- 1. HOOK (0 ~ 1초) ----------
  impact(0.0, 1.3);
  hat(0.25, 0.3, 0.4, 0.08);
  blip(0.25, 1760, 0.1, 0.05, -0.3);
  impact(0.5, 0.9);
  sweep(0.52, 1.0, 180, 11000, 0.5, (p) => p * p * p); // O 속으로 크래시 줌
  kicks.forEach((t) => kick(t, t >= 7.0 && t < 8.5 ? 0.55 : 1));
  impact(1.0, 0.6);

  // ---------- 2. TYPOGRAPHY (1 ~ 4초) ----------
  [[1.0, 440], [1.25, 523.25], [1.5, 659.25], [1.75, 880]].forEach(([t, f]) => blip(t, f, 0.16, 0.12)); // I MAKE PIXELS DANCE
  for (let i = 0; i < 4; i++) tick(2.0 + i * 0.25, 2200 - i * 150, 0.12, i % 2 ? 0.4 : -0.4); // 글리프 교체
  [3.0, 3.5].forEach((t) => sweep(t - 0.02, t + 0.2, 600, 5000, 0.18, (p) => Math.sin(p * Math.PI))); // 마퀴 휙
  glide(3.72, 4.0, 1600, 200, 0.12); // 납작하게 눌림

  // ---------- 3. SHAPE PLAY (4 ~ 7초) ----------
  for (let i = 0; i < 4; i++) tick(5.0 + i * 0.25, 900 + (i % 2) * 300, 0.22, i % 2 ? 0.5 : -0.5); // 타일 회전
  sweep(6.0, 7.0, 200, 8000, 0.4, (p) => p * p); // 가운데로 빨려 들어감
  impact(7.0, 0.7);

  // ---------- 4. CAMERA (7 ~ 10초) ----------
  glide(7.0, 8.5, 220, 180, 0.07, -0.5); // 버티고: 두 음이 벌어지며 불안하게
  glide(7.0, 8.5, 220, 275, 0.07, 0.5);
  sweep(8.05, 8.5, 300, 9000, 0.35, (p) => p * p * p);
  sweep(8.44, 8.62, 800, 12000, 0.45, (p) => Math.sin(p * Math.PI)); // 휩 팬
  impact(8.5, 0.9);
  sweep(8.6, 8.75, 3000, 400, 0.25, (p) => Math.sin(p * Math.PI)); // 크래시 줌
  clack(9.0);
  clack(9.5);
  sweep(9.7, 10.0, 200, 10000, 0.35, (p) => p * p); // 폭발

  // ---------- 5. COLOUR (10 ~ 12.5초) ----------
  impact(10.0, 1.0);
  const penta = [880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  for (let i = 0; i < 16; i++) blip(10.0 + i * 0.125, penta[(i * 2) % 6] * (i >= 8 ? 1.5 : 1), 0.06, 0.1, i % 2 ? 0.5 : -0.5);
  for (let t = 10.0; t < 12.0; t += 0.125) hat(t, 0.06, -0.3, 0.03);
  for (let i = 0; i < 12; i++) clap(12.0 + i * (0.5 / 12), 0.12 + i * 0.03); // 스네어 롤
  sweep(11.4, 12.5, 150, 10000, 0.45, (p) => p * p * p);

  // ---------- 공통 리듬 (클랩·하이햇) ----------
  for (let t = 1.5; t < 7.0; t += 1.0) clap(t, 0.5);
  for (let t = 9.5; t < 12.0; t += 1.0) clap(t, 0.5);
  for (let t = 1.25; t < 12.0; t += 0.5) if (t < 7.0 || t > 8.5) hat(t, 0.18, 0.35);

  // ---------- 베이스 & 패드 (킥에 맞춰 사이드체인) ----------
  {
    let ph = 0, lp = 0;
    const phs = new Float64Array(8);
    let pl = 0, pr = 0;
    for (let i = idx(1.0); i < idx(12.5); i++) {
      const t = i / SR;
      const sec = PROG.find((s) => t >= s.t0 && t < s.t1);
      if (!sec) continue;
      const since = (t - sec.t0) % 0.25;
      const duck = 1 - 0.8 * Math.exp(-(t - lastKick(t)) * 10);
      // 베이스: 8분음표 플럭 (버티고 구간은 길게 깔리는 드론)
      const e8 = Math.floor((t - sec.t0) / 0.25);
      const f = sec.root * (sec.drone ? 1 : e8 % 4 === 3 ? 2 : 1);
      ph += f / SR;
      const x = 0.6 * saw(ph) + 0.6 * Math.sin(TAU * ph);
      const cut = sec.drone ? 120 + 500 * ((t - sec.t0) / 1.5) ** 2 : 180 + 900 * Math.exp(-since * 18);
      lp += (1 - Math.exp((-TAU * cut) / SR)) * (x - lp);
      const env = sec.drone ? 0.9 : Math.min(1, since * 400);
      add(i, 0.3 * lp * duck * env);
      // 패드
      let l = 0, r = 0;
      sec.notes.forEach((nf, j) => {
        phs[j * 2] += (nf * 0.994) / SR;
        phs[j * 2 + 1] += (nf * 1.006) / SR;
        l += saw(phs[j * 2]);
        r += saw(phs[j * 2 + 1]);
      });
      const a = 1 - Math.exp((-TAU * (sec.drone ? 500 : 1000)) / SR);
      pl += a * (l - pl);
      pr += a * (r - pr);
      const g = 0.045 * (0.4 + 0.6 * duck) * Math.min(1, (t - 1.0) / 0.3);
      add(i, g * pl, -0.6);
      add(i, g * pr, 0.6);
    }
  }

  // ---------- 6. FINAL (12.5 ~ 15초) ----------
  glide(12.5, 12.95, 1800, 260, 0.14); // 조리개가 점으로 오므라듦
  sweep(12.55, 13.0, 2000, 300, 0.1, (p) => Math.sin(p * Math.PI));
  for (let i = 0; i < 6; i++) {
    const t = 13.125 + i * 0.125; // 16분음표로 글자 밟기
    blip(t, penta[i], 0.14, 0.14, (i - 2.5) * 0.15);
    glide(t, t + 0.08, 320, 120, 0.1);
  }
  impact(14.0, 1.0); // 마침표 착지
  {
    const final = [110, 220, 261.63, 329.63, 493.88];
    const phs = new Float64Array(10);
    let pl = 0, pr = 0;
    for (let i = idx(14.0); i < N; i++) {
      const t = i / SR - 14.0;
      let l = 0, r = 0;
      final.forEach((nf, j) => {
        phs[j * 2] += (nf * 0.995) / SR;
        phs[j * 2 + 1] += (nf * 1.005) / SR;
        l += saw(phs[j * 2]) + 0.5 * Math.sin(TAU * phs[j * 2] * 2);
        r += saw(phs[j * 2 + 1]) + 0.5 * Math.sin(TAU * phs[j * 2 + 1] * 2);
      });
      const a = 1 - Math.exp((-TAU * (600 + 2400 * Math.exp(-t * 3))) / SR);
      pl += a * (l - pl);
      pr += a * (r - pr);
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 1.2);
      add(i, 0.09 * env * pl, -0.5);
      add(i, 0.09 * env * pr, 0.5);
      add(i, 0.25 * env * Math.sin(TAU * 55 * t));
    }
  }

  // 믹스: 부드러운 클리핑 → 최대 -1dB 로 정규화 → 끝 페이드
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.72 / (peak || 1); // 약 -3dB (AAC 인코딩 후 클리핑 방지)
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 0.3));
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm * fade)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm * fade)) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}
