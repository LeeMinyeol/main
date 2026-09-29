// 장면 5 · COLOUR (10.0초 ~ 12.5초) — 색 전환
// 박자마다 팔레트(배경·덩어리·글자 색 조합)가 통째로 바뀌는데, 새 배경색은 매번 다른 지점에서
// 원형으로 퍼져 나옴. 가운데엔 꿀렁이는 덩어리 + 'COLOUR' 글자, 둘레엔 회전하는 컬러휠 링,
// 아래엔 현재 팔레트의 색상 칩과 HEX 코드. 마지막 박자엔 8분음표로 더 빨리 바뀌고
// → 코랄 덩어리가 화면을 가득 채우며 엔딩으로 넘어감

import { W, H, C, TAU, ease, prog, lerp, rgba, layoutLetters, FONT_DISPLAY, FONT_MONO } from '../lib.js';

const PALETTES = [
  { bg: C.coral, blob: C.blue, text: C.paper },
  { bg: C.acid, blob: C.violet, text: C.ink },
  { bg: C.blue, blob: C.coral, text: C.acid },
  { bg: C.violet, blob: C.acid, text: C.ink },
  { bg: C.ink, blob: C.coral, text: C.paper },
];
const ORIGINS = [[0.5, 0.5], [0.12, 0.85], [0.88, 0.15], [0.2, 0.2], [0.5, 0.5]];
const BEATS = [0, 0.5, 1.0, 1.5, 2.0];
// 마지막 박자 구간엔 8분음표로 덩어리/글자 색만 한 번 더 바뀜
const EXTRA = { t: 1.75, blob: C.paper, text: C.coral };
const NAMES = { [C.coral]: 'CORAL', [C.acid]: 'ACID', [C.blue]: 'ELECTRIC', [C.violet]: 'VIOLET', [C.ink]: 'INK', [C.paper]: 'PAPER' };

function blobPath(ctx, cx, cy, r, t) {
  ctx.beginPath();
  const n = 140;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + 0.1 * Math.sin(3 * a + t * 2.2) + 0.07 * Math.sin(5 * a - t * 3.1) + 0.04 * Math.sin(8 * a + t * 5);
    const x = cx + Math.cos(a) * r * k;
    const y = cy + Math.sin(a) * r * k;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export default {
  id: '05',
  name: 'COLOUR',
  start: 10.0,
  end: 12.5,
  draw(ctx, lt) {
    const idx = Math.min(PALETTES.length - 1, Math.floor(lt / 0.5));
    const pal = PALETTES[idx];
    const since = lt - BEATS[idx];

    // 이전 배경 → 새 배경이 원형으로 퍼짐 (첫 박자는 잉크 위로)
    ctx.fillStyle = idx === 0 ? C.ink : PALETTES[idx - 1].bg;
    ctx.fillRect(0, 0, W, H);
    const [ox, oy] = ORIGINS[idx];
    const spread = ease.outExpo(prog(since, 0, 0.34)) * 2300;
    ctx.fillStyle = pal.bg;
    ctx.beginPath();
    ctx.arc(ox * W, oy * H, spread, 0, TAU);
    ctx.fill();

    const extra = lt >= EXTRA.t && idx === 3;
    const blobCol = extra ? EXTRA.blob : pal.blob;
    const textCol = extra ? EXTRA.text : pal.text;

    // 컬러휠 링 (원뿔형 그라디언트가 빙글빙글)
    const ringIn = ease.outExpo(prog(lt, 0.05, 0.4));
    const endGrow = ease.inExpo(prog(lt, 2.18, 2.5));
    const g = ctx.createConicGradient(lt * 2.4, W / 2, H / 2);
    [C.coral, C.acid, C.blue, C.violet, C.coral].forEach((c, i) => g.addColorStop(i / 4, c));
    ctx.strokeStyle = g;
    ctx.lineWidth = 30 * ringIn;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 455 + 40 * endGrow, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba(textCol, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 490, -lt * 3, -lt * 3 + TAU * 0.3 * ringIn);
    ctx.stroke();

    // 덩어리: 박자마다 쿵 커졌다 돌아옴, 마지막엔 화면을 가득 채움
    const pulse = 1 + 0.14 * Math.exp(-since * 9) + 0.08 * (extra ? Math.exp(-(lt - EXTRA.t) * 9) : 0);
    const r = 320 * ease.outBack(prog(lt, 0, 0.3), 1.8) * pulse + endGrow * 2000;
    ctx.fillStyle = idx === 4 ? C.coral : blobCol;
    blobPath(ctx, W / 2, H / 2, r, lt);
    ctx.fill();

    // COLOUR 글자: 박자마다 글자별로 통통
    const textAlpha = 1 - prog(lt, 2.2, 2.35);
    if (textAlpha > 0) {
      const font = `250px ${FONT_DISPLAY}`;
      const { letters } = layoutLetters(ctx, 'COLOUR', font, 4);
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(textCol, textAlpha);
      letters.forEach((l, i) => {
        const hop = Math.exp(-Math.max(0, since - i * 0.025) * 12) * (since >= i * 0.025 ? 1 : 0);
        ctx.fillText(l.ch, W / 2 + l.x, H / 2 + 92 - hop * 40);
      });
    }

    // 팔레트 칩 + HEX 코드
    const chipsIn = ease.outExpo(prog(lt, 0.1, 0.45)) * (1 - prog(lt, 2.15, 2.28));
    if (chipsIn > 0) {
      const chips = [pal.bg, blobCol, textCol];
      const labelCol = pal.bg === C.ink || pal.bg === C.blue || pal.bg === C.violet ? C.paper : C.ink;
      ctx.font = `700 18px ${FONT_MONO}`;
      ctx.textAlign = 'left';
      chips.forEach((col, i) => {
        const x = W / 2 - 330 + i * 230;
        const y = H - 150 + (1 - chipsIn) * 40;
        ctx.fillStyle = col;
        ctx.fillRect(x, y - 30, 40, 40);
        ctx.strokeStyle = rgba(labelCol, 0.6);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - 30, 40, 40);
        ctx.fillStyle = rgba(labelCol, chipsIn);
        ctx.fillText(NAMES[col] || '', x + 54, y - 14);
        ctx.fillText(col.toUpperCase(), x + 54, y + 8);
      });
    }
  },
};
