import fs from 'node:fs';
import {
  launchBrowser,
  newContext,
  saveState,
  screenshot,
  statePath,
  ARTIFACT_DIR,
} from './browser.js';
import { login, looksLoggedIn } from './login.js';
import { attend, RESULT } from './attend.js';

const ICON = {
  [RESULT.SUCCESS]: '✅',
  [RESULT.ALREADY]: '☑️',
  [RESULT.UNKNOWN]: '❔',
  [RESULT.LOGIN_REQUIRED]: '🔒',
  [RESULT.NOT_FOUND]: '🔍',
  [RESULT.ERROR]: '❌',
  skipped: '⏭️',
};

const LABEL = {
  [RESULT.SUCCESS]: '출석 완료',
  [RESULT.ALREADY]: '이미 출석함',
  [RESULT.UNKNOWN]: '결과 불명',
  [RESULT.LOGIN_REQUIRED]: '로그인 필요',
  [RESULT.NOT_FOUND]: '버튼 못 찾음',
  [RESULT.ERROR]: '오류',
  skipped: '건너뜀',
};

/** 한 사이트 처리 (세션 재사용 → 실패 시 로그인 → 출석) */
async function runSite(browser, site, { headed, log }) {
  const context = await newContext(browser, site);
  const page = await context.newPage();

  try {
    // 1) 저장된 세션이 있으면 바로 출석 페이지 진입을 시도한다.
    //    (CI 는 매번 새 러너라 세션이 없으므로 불필요한 요청을 건너뛴다)
    let needLogin = true;
    if (fs.existsSync(statePath(site.key))) {
      try {
        await page.goto(site.attendUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        if ((await looksLoggedIn(page)) === true) {
          log('  기존 세션 유효 — 로그인 생략');
          needLogin = false;
        }
      } catch {
        /* 진입 실패 시 로그인 경로로 */
      }
    }

    // 2) 로그인
    if (needLogin) {
      const res = await login(page, site, log);
      if (!res.ok) {
        return {
          key: site.key,
          name: site.name,
          result: RESULT.LOGIN_REQUIRED,
          message: res.reason,
          shot: await screenshot(page, `${site.key}-login-fail`),
        };
      }
      log('  로그인 성공');
      await saveState(context, site.key);
    }

    // 3) 출석
    const out = await attend(page, site, log);

    // 로그인이 필요하다고 나오면 세션을 버리고 1회 재시도
    if (out.result === RESULT.LOGIN_REQUIRED && !needLogin) {
      log('  세션 만료로 판단 — 재로그인 후 재시도');
      const res = await login(page, site, log);
      if (res.ok) {
        await saveState(context, site.key);
        const retry = await attend(page, site, log);
        return { key: site.key, name: site.name, ...retry };
      }
    }

    if (out.result === RESULT.SUCCESS || out.result === RESULT.ALREADY) {
      await saveState(context, site.key);
    }

    return { key: site.key, name: site.name, ...out };
  } catch (err) {
    return {
      key: site.key,
      name: site.name,
      result: RESULT.ERROR,
      message: err.message.split('\n')[0],
      shot: await screenshot(page, `${site.key}-error`).catch(() => null),
    };
  } finally {
    await context.close().catch(() => {});
  }
}

/** 전체 실행 */
export async function runAll(sites, { headed = false, retries = 1 } = {}) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await launchBrowser({ headed });
  const results = [];

  try {
    for (const site of sites) {
      console.log(`\n▶ ${site.name}`);

      if (!site.id || !site.pw) {
        console.log(`  ${ICON.skipped} 계정 미설정 (${site.idEnv}/${site.pwEnv}) — 건너뜀`);
        results.push({
          key: site.key,
          name: site.name,
          result: 'skipped',
          message: `${site.idEnv} / ${site.pwEnv} 환경변수 미설정`,
        });
        continue;
      }

      const log = (m) => console.log(m);
      let out = await runSite(browser, site, { headed, log });

      // 일시적 오류는 1회 재시도
      for (let i = 0; i < retries && out.result === RESULT.ERROR; i++) {
        console.log(`  재시도 ${i + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 4000));
        out = await runSite(browser, site, { headed, log });
      }

      console.log(`  ${ICON[out.result] || '•'} ${LABEL[out.result] || out.result}: ${out.message}`);
      results.push(out);

      // 서버 부담을 줄이기 위한 사이트 간 간격
      await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return results;
}

/** 결과 요약을 마크다운으로 */
export function toMarkdown(results) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const lines = [
    `## 출석체크 결과 (${now} KST)`,
    '',
    '| 사이트 | 결과 | 상세 |',
    '| --- | --- | --- |',
  ];
  for (const r of results) {
    const detail = (r.message || '').replace(/\|/g, '\\|').slice(0, 160);
    lines.push(`| ${r.name} | ${ICON[r.result] || '•'} ${LABEL[r.result] || r.result} | ${detail} |`);
  }
  const done = results.filter((r) => r.result === RESULT.SUCCESS || r.result === RESULT.ALREADY);
  lines.push('', `**${done.length}/${results.length}** 완료`);
  return lines.join('\n');
}

/** 사람이 개입해야 하는 결과가 있는지 */
export function hasFailure(results) {
  return results.some(
    (r) =>
      r.result === RESULT.ERROR ||
      r.result === RESULT.NOT_FOUND ||
      r.result === RESULT.LOGIN_REQUIRED
  );
}

export { ICON, LABEL };
