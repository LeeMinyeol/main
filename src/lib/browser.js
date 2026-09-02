import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

export const STATE_DIR = process.env.STATE_DIR || '.state';
export const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'artifacts';

export function statePath(key) {
  return path.join(STATE_DIR, `${key}.json`);
}

/**
 * 브라우저를 띄운다. m.* 도메인이 대부분이라 모바일 에뮬레이션을 기본으로 사용.
 */
export async function launchBrowser({ headed = false } = {}) {
  const launchOpts = {
    headless: !headed,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  };
  // 이 환경에는 Chromium 이 미리 설치되어 있음. 없으면 Playwright 기본 경로 사용.
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(launchOpts);
}

export async function newContext(browser, site, { reuseState = true } = {}) {
  const opts = {
    ...devices['iPhone 13'],
    userAgent: MOBILE_UA,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    ignoreHTTPSErrors: true,
  };

  const sp = statePath(site.key);
  if (reuseState && fs.existsSync(sp)) {
    try {
      opts.storageState = sp;
    } catch {
      /* 손상된 상태 파일은 무시 */
    }
  }

  const context = await browser.newContext(opts);
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(45000);
  return context;
}

export async function saveState(context, key) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    await context.storageState({ path: statePath(key) });
  } catch (err) {
    console.warn(`  [warn] 세션 저장 실패 (${key}): ${err.message}`);
  }
}

export async function screenshot(page, name) {
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const file = path.join(ARTIFACT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch {
    return null;
  }
}

/**
 * 페이지의 alert/confirm 을 가로채 메시지를 수집한다.
 * 한국 쇼핑몰 출석체크는 결과를 대부분 alert() 로 알려주므로 핵심 로직.
 */
export function captureDialogs(page) {
  const messages = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    try {
      await dialog.accept();
    } catch {
      /* 이미 처리됨 */
    }
  });
  return messages;
}
