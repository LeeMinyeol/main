import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser, newContext, screenshot, captureDialogs, ARTIFACT_DIR } from './browser.js';
import { login } from './login.js';
import { dumpStructure } from './dom.js';

/**
 * 로그인 후 출석 페이지의 실제 마크업을 덤프한다.
 * 여기서 나온 결과로 *_ATTEND_SELECTOR / *_LOGIN_URL 을 확정하면 된다.
 */
export async function discover(sites, { headed = false } = {}) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await launchBrowser({ headed });
  const report = {};

  try {
    for (const site of sites) {
      console.log(`\n▶ ${site.name} 구조 분석`);
      const context = await newContext(browser, site, { reuseState: false });
      const page = await context.newPage();
      const dialogs = captureDialogs(page);
      const entry = { key: site.key, name: site.name, dialogs };

      try {
        if (site.id && site.pw) {
          const res = await login(page, site, (m) => console.log(m));
          entry.login = res;
          console.log(`  로그인: ${res.ok ? 'OK' : res.reason}`);
        } else {
          entry.login = { ok: false, reason: '계정 미설정 — 비로그인 상태로 분석' };
          console.log('  계정 미설정 — 비로그인 상태로 분석');
        }

        await page.goto(site.attendUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        entry.attendPage = await dumpStructure(page);
        entry.shot = await screenshot(page, `discover-${site.key}`);

        console.log(`  클릭 가능 요소 ${entry.attendPage.clickables.length}개 수집`);
        for (const c of entry.attendPage.clickables.slice(0, 15)) {
          const label = c.text || c.value || c.alt || '';
          if (label || c.onclick) {
            console.log(
              `    <${c.tag}> "${label}" ${c.id ? `#${c.id}` : ''} ${c.onclick ? `onclick=${c.onclick}` : ''}`
            );
          }
        }
      } catch (err) {
        entry.error = err.message.split('\n')[0];
        console.log(`  오류: ${entry.error}`);
      } finally {
        await context.close().catch(() => {});
      }

      report[site.key] = entry;
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const out = path.join(ARTIFACT_DIR, 'discover.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n분석 결과 저장: ${out}`);
  return report;
}
