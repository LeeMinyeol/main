// 타임라인: 장면 6개를 시간 순서대로 이어 붙이고, 그 위에 HUD·필름 그레인·비네팅을 얹음
// 장면을 추가/삭제/순서 변경하려면 아래 SCENES 목록만 고치면 됨

import { W, H, FPS, C, rng, rgba, makeCanvas, FONT_MONO } from './lib.js';
import hook from './scenes/01-hook.js';
import typography from './scenes/02-typography.js';
import shapes from './scenes/03-shapes.js';
import camera from './scenes/04-camera.js';
import colour from './scenes/05-colour.js';
import final from './scenes/06-final.js';

export const SCENES = [hook, typography, shapes, camera, colour, final];
export const DURATION = 15;
export const TOTAL_FRAMES = DURATION * FPS;

const canvas = document.getElementById('stage');
canvas.width = W;
canvas.height = H;
const out = canvas.getContext('2d');
const scratch = makeCanvas();
const sctx = scratch.getContext('2d');

// 필름 그레인 텍스처 (미리 3장 만들어 두고 번갈아 사용)
const grains = [1, 2, 3].map((seed) => {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out.createPattern(c, 'repeat');
});

function sceneAt(t) {
  return SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
}

function drawScene(ctx, t) {
  const s = sceneAt(t);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  s.draw(ctx, t - s.start, (t - s.start) / (s.end - s.start));
  ctx.restore();
}

function timecode(f) {
  const sec = Math.floor(f / FPS);
  const fr = f % FPS;
  return `00:00:${String(sec).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
}

function drawHUD(ctx, f, t) {
  const s = sceneAt(t);
  if (s.hud === false) return; // 오프닝 훅과 엔딩 카드는 깨끗하게
  const idx = SCENES.indexOf(s);
  ctx.save();
  ctx.globalCompositeOperation = 'difference'; // 밝은 배경에서도 자동으로 반전돼 보임
  ctx.fillStyle = '#E8E8E8';
  ctx.strokeStyle = '#E8E8E8';
  ctx.font = `400 18px ${FONT_MONO}`;
  ctx.textBaseline = 'middle';
  const m = 64;
  ctx.textAlign = 'left';
  ctx.fillText('CLAUDE / MOTION SHOWREEL 2026', m + 28, m);
  ctx.fillText(`${s.id} — ${s.name}`, m + 28, H - m);
  ctx.textAlign = 'right';
  ctx.fillText(timecode(f), W - m - 28, m);
  ctx.fillText(`${idx + 1}/${SCENES.length}`, W - m - 28 - 260, H - m);
  // 진행 막대
  ctx.globalAlpha = 0.35;
  ctx.fillRect(W - m - 28 - 220, H - m - 1, 220, 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(W - m - 28 - 220, H - m - 2, 220 * (t / DURATION), 4);
  // 모서리 크롭 마크
  ctx.lineWidth = 2;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 16);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 16, y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawFinish(ctx, f, t) {
  // 비네팅 (장면마다 세기를 정할 수 있음. 밝은 엔딩 카드는 약하게)
  const s = sceneAt(t);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${s.vignette ?? 0.42})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  // 필름 그레인
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  ctx.translate(((f * 97) % 256) - 256, ((f * 57) % 256) - 256);
  ctx.fillStyle = grains[f % 3];
  ctx.fillRect(0, 0, W + 512, H + 512);
  ctx.restore();
}

// 프레임 하나를 그림. samples > 1 이면 셔터를 반쯤 연 것처럼 여러 순간을 겹쳐 모션 블러를 만듦
export function renderFrame(f, samples = 1) {
  const t = f / FPS;
  const s = sceneAt(t);
  // 휩 팬처럼 아주 빠른 순간은 장면이 샘플 수를 더 요구할 수 있음
  if (samples > 1 && s.samplesAt) samples = Math.max(samples, s.samplesAt(t - s.start));
  if (samples <= 1) {
    drawScene(out, t);
  } else {
    const shutter = 0.5 / FPS; // 180도 셔터
    for (let k = 0; k < samples; k++) {
      sctx.clearRect(0, 0, W, H);
      drawScene(sctx, Math.min(t + (k / samples) * shutter, DURATION - 0.001));
      out.globalAlpha = 1 / (k + 1);
      out.drawImage(scratch, 0, 0);
    }
    out.globalAlpha = 1;
  }
  drawHUD(out, f, t);
  drawFinish(out, f, t);
}

window.SHOWREEL = { renderFrame, TOTAL_FRAMES, FPS, W, H, canvas, C, rgba };
