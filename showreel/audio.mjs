// 사운드트랙: 외부 음원 없이 수학으로 직접 합성 (120BPM, 장면 전환 타이밍에 맞춤)
// 킥·클랩·하이햇·베이스·패드·라이저·임팩트·타이핑 효과음을 만들어 WAV 파일로 저장

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

  // --- 장면 1: 점 튀어나옴, 충격파, 타이핑, 라이저 ---
  blip(0.0, 880, 0.25, 0.12);
  blip(0.05, 1760, 0.12, 0.08);
  kick(0.5, 0.9);
  impact(0.5, 0.35);
  kick(1.0, 0.6);
  for (let i = 0; i < 13; i++) blip(1.0 + i * 0.031, 2400 + (i % 3) * 300, 0.07, 0.02, (i % 2) * 0.4 - 0.2);
  sweep(1.3, 2.0, 300, 7000, 0.35);

  // --- 비트 구간 (2.0 ~ 12.0초) ---
  const beat = 0.5;
  for (let t = 2.0; t < 12.0 - 1e-6; t += beat) kick(t, 1);
  for (let t = 2.5; t < 12.0; t += 1.0) clap(t, 0.55);
  for (let t = 4.5; t < 12.0; t += 0.25) if (Math.round(t * 4) % 2 === 1) hat(t, 0.2, 0.35);
  for (let t = 11.0; t < 12.0; t += 0.125) hat(t, 0.08 + (t - 11) * 0.12, -0.35, 0.03);
  impact(2.0, 1);

  // 장면 전환 휙 소리 + 가벼운 임팩트
  [4.5, 7.0, 9.5].forEach((c) => {
    sweep(c - 0.45, c + 0.05, 400, 9000, 0.3);
    impact(c, 0.35);
  });

  // 베이스 (코드 진행: Am - F - C - G - Am, 한 마디 = 2초)
  const roots = [55, 43.65, 65.41, 49.0, 55];
  {
    let ph = 0;
    let lp = 0;
    for (let i = idx(2.0); i < idx(12.0); i++) {
      const t = i / SR;
      const bar = Math.min(4, Math.floor((t - 2.0) / 2));
      const eighth = Math.floor((t - 2.0) / 0.25);
      const f = roots[bar] * (eighth % 4 === 3 ? 2 : 1);
      ph += f / SR;
      const since = (t - 2.0) % 0.25;
      const x = 0.6 * saw(ph) + 0.6 * Math.sin(TAU * ph);
      lp += (1 - Math.exp((-TAU * (180 + 900 * Math.exp(-since * 18))) / SR)) * (x - lp);
      const duck = 1 - 0.85 * Math.exp(-((t - 2.0) % 0.5) * 11);
      add(i, 0.32 * lp * duck * Math.min(1, since * 400));
    }
  }

  // 패드 화음 (디튠된 톱니파 3겹)
  const chords = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [196, 261.63, 329.63],
    [196, 246.94, 293.66],
    [220, 261.63, 329.63],
    [220, 261.63, 329.63, 493.88],
  ];
  {
    const phs = new Float64Array(12);
    let lpL = 0;
    let lpR = 0;
    for (let i = idx(2.0); i < N; i++) {
      const t = i / SR;
      const ci = Math.min(5, Math.floor((t - 2.0) / 2));
      let l = 0;
      let r = 0;
      chords[ci].forEach((f, j) => {
        for (let d = 0; d < 2; d++) {
          const k = j * 2 + d;
          phs[k] += (f * (d ? 1.006 : 0.994)) / SR;
          const v = saw(phs[k]);
          if (d) r += v;
          else l += v;
        }
      });
      const a = 1 - Math.exp((-TAU * (t > 12 ? 1600 : 900)) / SR);
      lpL += a * (l - lpL);
      lpR += a * (r - lpR);
      const duck = t < 12 ? 1 - 0.6 * Math.exp(-((t - 2.0) % 0.5) * 9) : 1;
      const env = Math.min(1, (t - 2.0) / 0.6) * (t > 14.4 ? Math.max(0, (15 - t) / 0.6) : 1);
      const g = (t >= 12 ? 0.075 : 0.045) * duck * env;
      add(i, g * lpL, -0.6);
      add(i, g * lpR, 0.6);
    }
  }

  // 장면 4: 입자가 반짝이는 아르페지오
  const arp = [880, 1046.5, 1318.5, 1760, 1318.5, 1046.5];
  for (let k = 0; k < 16; k++) blip(7.0 + k * 0.125, arp[k % arp.length], 0.07, 0.12, k % 2 ? 0.5 : -0.5);
  // 장면 5 끝으로 갈수록 쌓이는 라이저
  sweep(10.4, 12.0, 150, 9000, 0.45, (p) => p * p * p);

  // --- 장면 6: 큰 임팩트 + 암호 해독 틱 소리 ---
  impact(12.0, 1.2);
  kick(12.0, 1);
  for (let i = 0; i < 14; i++) blip(12.8 + i * 0.03, 3000 + (i % 4) * 400, 0.05, 0.015, (i % 2) * 0.6 - 0.3);
  blip(13.25, 1318.5, 0.12, 0.8);
  blip(13.25, 659.25, 0.1, 0.9);

  // 믹스: 부드러운 클리핑 → 최대 -1dB 로 정규화 → 끝 페이드
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * 1.1);
    R[i] = Math.tanh(R[i] * 1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.79 / (peak || 1); // 약 -2dB (AAC 인코딩 후 클리핑 방지)
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
