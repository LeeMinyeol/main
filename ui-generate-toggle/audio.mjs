// 효과음: 마우스 딸깍(누름/뗌) + 토글이 펼쳐지고 접힐 때의 아주 작은 '뽁' 소리. 전부 코드로 합성
// 클릭 시각은 src/main.js 의 타임라인(T)에서 그대로 받아옴 → 화면과 소리가 항상 맞음

import { writeFileSync } from 'node:fs';

const SR = 48000;
const TAU = Math.PI * 2;

export function makeSoundtrack(path, { duration, clicks, press, expand, collapse, picks }) {
  const N = Math.round(SR * duration);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  let seed = 7;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const add = (i, v, pan = 0) => {
    if (i < 0 || i >= N) return;
    L[i] += v * (1 - Math.max(0, pan));
    R[i] += v * (1 + Math.min(0, pan));
  };
  // 마우스 스위치 딸깍: 아주 짧은 노이즈 + 높은 공진음
  function click(t, g, f, pan) {
    const n0 = Math.round(t * SR);
    let hp = 0;
    for (let k = 0; k < SR * 0.025; k++) {
      const tau = k / SR;
      const x = noise();
      hp += 0.45 * (x - hp);
      add(n0 + k, g * ((x - hp) * Math.exp(-tau * 900) + 0.5 * Math.sin(TAU * f * tau) * Math.exp(-tau * 260)), pan);
    }
  }
  // 음정이 살짝 미끄러지는 부드러운 '뽁'
  function pop(t, f0, f1, g, len = 0.12) {
    const n0 = Math.round(t * SR);
    let ph = 0;
    for (let k = 0; k < SR * len; k++) {
      const p = k / (SR * len);
      ph += (TAU * lerp(f0, f1, Math.sqrt(p))) / SR;
      add(n0 + k, g * Math.sin(ph) * Math.min(1, k / 96) * Math.pow(1 - p, 2.2));
    }
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  clicks.forEach((t) => {
    click(t - press, 0.55, 3200, 0.1); // 누름
    click(t, 0.4, 3800, 0.1); // 뗌
  });
  pop(expand + 0.04, 520, 860, 0.16); // 버튼 → 토글
  picks.forEach((p) => pop(p.click + 0.02, 900 + p.seg * 120, 1100 + p.seg * 120, 0.06, 0.07)); // 선택 이동
  pop(collapse + 0.1, 820, 480, 0.14); // 토글 → 버튼

  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = 0.5 / (peak || 1); // 약 -6dB: UI 효과음이라 조용하게
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
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}
