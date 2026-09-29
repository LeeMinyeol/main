// 렌더러: 헤드리스 크롬에서 캔버스를 한 프레임씩 그려 PNG 로 받아 ffmpeg 에 흘려 넣음
//   node render.mjs                  → showreel.mp4 (1920x1080, 30fps, 15초, 사운드 포함)
//   node render.mjs --preview        → build/preview/ 에 장면별 확인용 스틸 이미지만 저장
//   node render.mjs --samples 1      → 모션 블러 없이 빠르게 렌더

import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { makeSoundtrack } from './audio.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const PREVIEW = args.includes('--preview');
const SAMPLES = Number(opt('--samples', PREVIEW ? 1 : 4));
const OUT = path.join(ROOT, opt('--out', 'showreel.mp4'));
const BUILD = path.join(ROOT, 'build');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file.endsWith(path.sep) ? path.join(file, 'index.html') : file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

await mkdir(BUILD, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('[page error]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.goto(url);
await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
const total = await page.evaluate(() => window.SHOWREEL.TOTAL_FRAMES);

const grab = (f) =>
  page.evaluate(
    ([f, s]) => {
      window.SHOWREEL.renderFrame(f, s);
      return window.SHOWREEL.canvas.toDataURL('image/png');
    },
    [f, SAMPLES],
  );
const toBuf = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

if (PREVIEW) {
  const frames = opt('--frames', '10,45,75,100,125,150,185,205,230,265,280,300,340,355,372,400,440')
    .split(',')
    .map(Number);
  await mkdir(path.join(BUILD, 'preview'), { recursive: true });
  for (const f of frames) {
    await writeFile(path.join(BUILD, 'preview', `f${String(f).padStart(3, '0')}.png`), toBuf(await grab(f)));
  }
  console.log(`미리보기 ${frames.length}장 저장: build/preview/`);
} else {
  const wav = path.join(BUILD, 'soundtrack.wav');
  makeSoundtrack(wav);
  console.log('사운드트랙 생성 완료:', path.relative(ROOT, wav));

  const ff = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
      '-i', wav,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-r', '30', '-s', '1920x1080',
      '-c:a', 'aac', '-b:a', '192k',
      '-t', '15', '-movflags', '+faststart',
      OUT,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg 종료 코드 ${c}`)))));
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const buf = toBuf(await grab(f));
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 29) console.log(`프레임 ${f + 1}/${total}  (${((Date.now() - t0) / 1000).toFixed(0)}초 경과)`);
  }
  ff.stdin.end();
  await done;
  console.log('완료:', path.relative(process.cwd(), OUT));
}

await browser.close();
server.close();
