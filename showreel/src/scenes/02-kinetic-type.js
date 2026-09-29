// 장면 2 · KINETIC TYPE (2.0초 ~ 4.5초)
// 박자(0.5초)마다 단어가 바뀜: DESIGN → ANIMATE → DIRECT → DELIVER
// 배경색이 대각선으로 밀려 들어오고, 글자는 한 글자씩 아래에서 솟아오름
// 마지막 MOTION 은 가로로 여러 조각 나며 좌우로 찢어져 다음 장면으로 넘어감

import { W, H, C, ease, prog, lerp, rgba, makeCanvas, layoutLetters, FONT_DISPLAY } from '../lib.js';

const WORDS = [
  { text: 'DESIGN', bg: C.coral, fg: C.ink, echo: C.paper },
  { text: 'ANIMATE', bg: C.ink, fg: C.acid, echo: C.acid },
  { text: 'DIRECT', bg: C.blue, fg: C.paper, echo: C.paper },
  { text: 'DELIVER', bg: C.acid, fg: C.ink, echo: C.ink },
];
const SEG = 0.5; // 단어 하나가 머무는 시간(초)
const SIZE = 380;

let buffer = null; // MOTION 을 찢기 위한 임시 캔버스

function drawWord(ctx, word, lt, fg, echo, size) {
  const font = `${size}px ${FONT_DISPLAY}`;
  const { letters } = layoutLetters(ctx, word, font, 6);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baseY = H / 2 + size * 0.36;

  // 위아래로 겹쳐 흐르는 외곽선 에코
  ctx.save();
  ctx.strokeStyle = rgba(echo, 0.28);
  ctx.lineWidth = 3;
  const drift = ease.outExpo(prog(lt, 0, 0.45)) * 40;
  [-1, 1].forEach((dir) => {
    const y = baseY + dir * (size * 0.86 + drift);
    letters.forEach((l, i) => {
      const p = ease.outExpo(prog(lt, 0.04 + i * 0.02, 0.4 + i * 0.02));
      ctx.globalAlpha = p;
      ctx.strokeText(l.ch, W / 2 + l.x, y);
    });
  });
  ctx.restore();

  // 본문 글자: 마스크 안에서 아래 → 위로 솟아오름 (살짝 오버슈트)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baseY - size * 0.86, W, size * 0.92);
  ctx.clip();
  ctx.fillStyle = fg;
  letters.forEach((l, i) => {
    const p = prog(lt, i * 0.025, 0.3 + i * 0.025);
    const y = baseY + (1 - ease.outBack(p, 1.4)) * size;
    ctx.fillText(l.ch, W / 2 + l.x, y);
  });
  ctx.restore();
}

export default {
  id: '02',
  name: 'KINETIC TYPE',
  start: 2.0,
  end: 4.5,
  draw(ctx, lt) {
    const idx = Math.min(Math.floor(lt / SEG), WORDS.length);

    if (idx < WORDS.length) {
      const w = WORDS[idx];
      const local = lt - idx * SEG;
      // 이전 배경
      ctx.fillStyle = idx === 0 ? C.coral : WORDS[idx - 1].bg;
      ctx.fillRect(0, 0, W, H);
      // 새 배경이 대각선 블록으로 밀려 들어옴
      const wipe = idx === 0 ? 1 : ease.outExpo(prog(local, 0, 0.22));
      const x = lerp(W + 600, -600, wipe);
      ctx.fillStyle = w.bg;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(W + 700, 0);
      ctx.lineTo(W + 700, H);
      ctx.lineTo(x - 420, H);
      ctx.closePath();
      ctx.fill();

      // 박자마다 번쩍하는 가는 띠
      const bar = 1 - prog(local, 0, 0.18);
      if (bar > 0 && idx > 0) {
        ctx.fillStyle = rgba(w.fg, 0.9 * bar);
        ctx.fillRect(0, H * 0.5 - 4 - (1 - bar) * 300, W, 8 * bar);
      }

      drawWord(ctx, w.text, local, w.fg, w.echo, SIZE);

      // 작은 인덱스 숫자
      ctx.font = `28px ${FONT_DISPLAY}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(w.fg, 0.8);
      ctx.fillText(`0${idx + 1}/04`, 140, H / 2 - SIZE * 0.55);
      return;
    }

    // 마지막: MOTION (2.0 ~ 2.5초)
    const local = lt - WORDS.length * SEG;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);

    if (!buffer) buffer = makeCanvas();
    const b = buffer.getContext('2d');
    b.clearRect(0, 0, W, H);
    const s = lerp(1.35, 1, ease.outExpo(prog(local, 0, 0.25)));
    b.save();
    b.translate(W / 2, H / 2);
    b.scale(s, s);
    b.translate(-W / 2, -H / 2);
    b.fillStyle = C.paper;
    b.font = `520px ${FONT_DISPLAY}`;
    b.textAlign = 'center';
    b.textBaseline = 'middle';
    const { letters } = layoutLetters(b, 'MOTION', `520px ${FONT_DISPLAY}`, 10);
    letters.forEach((l) => b.fillText(l.ch, W / 2 + l.x, H / 2 + 18));
    b.restore();

    // 가로 띠 8개로 잘라 번갈아 좌우로 날려 보냄
    const tear = ease.inExpo(prog(local, 0.22, 0.5));
    const strips = 8;
    const sh = H / strips;
    for (let i = 0; i < strips; i++) {
      const dir = i % 2 ? 1 : -1;
      const dx = dir * tear * (W * 1.1) * (0.8 + (i % 3) * 0.15);
      ctx.drawImage(buffer, 0, i * sh, W, sh, dx, i * sh, W, sh);
      if (tear > 0) {
        ctx.fillStyle = [C.coral, C.acid, C.blue][i % 3];
        ctx.fillRect(dx + (dir > 0 ? -W * 0.25 : W), i * sh + sh * 0.42, W * 0.25 * tear, sh * 0.16);
      }
    }
  },
};
