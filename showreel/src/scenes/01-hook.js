// 장면 1 · HOOK (0.0초 ~ 1.0초)
// 첫 프레임부터 화면을 꽉 채운 'MOTION' 이 위아래에서 쾅 박히고(0.0초),
// 8분음표에 글자가 들썩이고(0.25초), 박자에 맞춰 색이 반전(0.5초)된 뒤
// → 카메라가 'O' 의 구멍 속으로 돌진해, 구멍 너머의 파란 화면(다음 장면)으로 들어감

import { W, H, C, ease, prog, lerp, rgba, makeCanvas, layoutLetters, FONT_DISPLAY, FONT_MONO } from '../lib.js';

const WORD = 'MOTION';
const TARGET_W = 1840;
const NEXT_BG = C.blue; // O 구멍 너머로 보이는 색 = 장면 2 첫 배경색

let geo = null;

function measure(ctx) {
  // 화면 폭에 딱 맞는 글자 크기 계산
  const ref = layoutLetters(ctx, WORD, `100px ${FONT_DISPLAY}`, 0);
  const size = (100 * TARGET_W) / ref.total;
  const font = `${size}px ${FONT_DISPLAY}`;
  const lay = layoutLetters(ctx, WORD, font, 0);
  ctx.font = font;
  const m = ctx.measureText('O');
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  const baseline = H / 2 + (asc - desc) / 2;

  // 'O' 를 따로 그려서 가운데 구멍(카운터)의 실제 크기를 픽셀로 측정
  const cw = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 20;
  const ch = Math.ceil(asc + desc) + 20;
  const c = makeCanvas(cw, ch);
  const g = c.getContext('2d');
  g.font = font;
  g.fillStyle = '#fff';
  g.fillText('O', 10 + m.actualBoundingBoxLeft, 10 + asc);
  const data = g.getImageData(0, 0, cw, ch).data;
  const alpha = (x, y) => data[(y * cw + x) * 4 + 3];
  const mx = Math.floor(cw / 2);
  const my = Math.floor(ch / 2);
  let l = mx, r = mx, t = my, b = my;
  while (l > 0 && alpha(l - 1, my) < 128) l--;
  while (r < cw - 1 && alpha(r + 1, my) < 128) r++;
  while (t > 0 && alpha(mx, t - 1) < 128) t--;
  while (b < ch - 1 && alpha(mx, b + 1) < 128) b++;
  // 측정 캔버스에서 글자 왼쪽 끝은 x=10, 윗끝은 y=10 → 화면 좌표로 옮김
  const glyphLeft = W / 2 + lay.letters[1].x - lay.letters[1].w / 2 - m.actualBoundingBoxLeft;
  const hole = { x: glyphLeft + (l - 10), y: baseline - asc + (t - 10), w: r - l + 1, h: b - t + 1 };
  hole.cx = hole.x + hole.w / 2;
  hole.cy = hole.y + hole.h / 2;
  return { font, size, lay, asc, baseline, hole };
}

const shake = (lt) =>
  [0, 0.5].reduce((s, t0) => (lt >= t0 ? s + Math.sin((lt - t0) * 95) * 26 * Math.exp(-(lt - t0) * 16) : s), 0);

export default {
  id: '01',
  name: 'HOOK',
  hud: false,
  start: 0.0,
  end: 1.0,
  draw(ctx, lt) {
    if (!geo) geo = measure(ctx);
    const inverted = lt >= 0.5;
    const bg = inverted ? C.coral : C.ink;
    const fg = inverted ? C.ink : C.paper;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const { hole } = geo;
    const z = ease.inExpo(prog(lt, 0.55, 1.0));
    const zoom = lerp(1.0, 70, z) * (1 + 0.05 * prog(lt, 0, 0.5));
    const rot = z * 0.14;

    // 줌하는 동안 O 가 화면 가운데로 끌려오며 커짐
    const pivotX = lerp(hole.cx, W / 2, ease.inOutCubic(prog(lt, 0.5, 0.9)));
    const pivotY = lerp(hole.cy, H / 2, ease.inOutCubic(prog(lt, 0.5, 0.9)));
    ctx.save();
    ctx.translate(pivotX + shake(lt) * (1 - z), pivotY + shake(lt + 0.013) * 0.6 * (1 - z));
    ctx.scale(zoom, zoom);
    ctx.rotate(rot);
    ctx.translate(-hole.cx, -hole.cy);

    // O 구멍 안에 다음 장면 색을 깔아 둠 (0.5초 이후)
    if (inverted) {
      ctx.fillStyle = NEXT_BG;
      ctx.beginPath();
      ctx.roundRect(hole.x - 4, hole.y - 4, hole.w + 8, hole.h + 8, (hole.w + 8) / 2);
      ctx.fill();
    }

    // 글자: 위/아래에서 번갈아 쾅 박힘 → 0.25초에 8분음표로 들썩
    ctx.font = geo.font;
    ctx.textAlign = 'center';
    ctx.fillStyle = fg;
    geo.lay.letters.forEach((l, i) => {
      const p = ease.outExpo(prog(lt, -0.06 + i * 0.012, 0.1 + i * 0.012));
      const from = (i % 2 ? -1 : 1) * H * 0.9;
      const stutter = (i % 2 ? -1 : 1) * 30 * (prog(lt, 0.25, 0.26) - prog(lt, 0.36, 0.42));
      ctx.fillText(l.ch, W / 2 + l.x, geo.baseline + lerp(from, 0, p) + stutter);
    });

    // 편집 디자인 느낌의 작은 캡션
    const cap = ease.outExpo(prog(lt, 0.12, 0.35));
    if (cap > 0) {
      ctx.font = `700 26px ${FONT_MONO}`;
      ctx.fillStyle = rgba(fg, cap);
      ctx.textAlign = 'left';
      const left = W / 2 - TARGET_W / 2 + 8;
      ctx.fillText('CLAUDE — MOTION DESIGNER', left, geo.baseline - geo.asc - 34 - (1 - cap) * 20);
      ctx.textAlign = 'right';
      ctx.fillText('SHOWREEL ’26  ▶', W / 2 + TARGET_W / 2 - 8, geo.baseline + 60 + (1 - cap) * 20);
    }
    ctx.restore();
  },
};
