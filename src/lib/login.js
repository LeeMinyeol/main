import { COMMON } from '../config/sites.js';
import { firstVisible, findClickableByText, collectText, containsAny } from './dom.js';

/** 현재 페이지가 로그인된 상태로 보이는지 판단 */
export async function looksLoggedIn(page) {
  try {
    const text = await collectText(page);
    if (containsAny(text, ['로그아웃', 'LOGOUT', 'Logout', '마이페이지'])) return true;
    // 로그인 폼(비밀번호 입력창)이 노출되어 있으면 미로그인으로 간주
    const pw = await firstVisible(page, ['input[type="password"]']);
    if (pw) return false;
    if (containsAny(text, COMMON.loginRequiredTexts)) return false;
    return null; // 판단 불가
  } catch {
    return null;
  }
}

/**
 * 로그인 페이지 후보를 순회하며 실제 로그인 폼이 있는 URL 을 찾는다.
 */
async function resolveLoginPage(page, site, log) {
  for (const url of site.loginUrlCandidates) {
    try {
      log(`  로그인 페이지 시도: ${url}`);
      const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (res && res.status() >= 400) {
        log(`    HTTP ${res.status()} — 다음 후보로`);
        continue;
      }
      await page.waitForTimeout(800);
      const pw = await firstVisible(page, site.pwSelector ? [site.pwSelector] : COMMON.pwSelectors);
      if (pw) {
        log(`    로그인 폼 발견`);
        return { url, pwField: pw };
      }
      log(`    로그인 폼 없음 — 다음 후보로`);
    } catch (err) {
      log(`    접속 실패: ${err.message.split('\n')[0]}`);
    }
  }
  return null;
}

/**
 * 로그인 수행.
 * @returns {{ok: boolean, reason?: string, loginUrl?: string}}
 */
export async function login(page, site, log = console.log) {
  if (!site.id || !site.pw) {
    return { ok: false, reason: `계정 정보 없음 (${site.idEnv} / ${site.pwEnv} 미설정)` };
  }

  const found = await resolveLoginPage(page, site, log);
  if (!found) {
    return { ok: false, reason: '로그인 페이지를 찾지 못함 (LOGIN_URL 환경변수로 지정 필요)' };
  }

  const idField = await firstVisible(
    page,
    site.idSelector ? [site.idSelector] : COMMON.idSelectors
  );
  const pwField = found.pwField;

  if (!idField) {
    // 마지막 수단: 비밀번호 필드와 같은 폼 안의 첫 text 입력창
    const fallback = await firstVisible(page, [
      'form input[type="text"]',
      'input[type="text"]',
      'input:not([type])',
    ]);
    if (!fallback) return { ok: false, reason: '아이디 입력란을 찾지 못함' };
    await fallback.fill(site.id);
  } else {
    await idField.fill(site.id);
  }
  await pwField.fill(site.pw);

  // 제출: submit 버튼 → 텍스트 매칭 → Enter 키 순으로 시도
  let submitted = false;
  const submitBtn = await firstVisible(page, COMMON.submitSelectors);
  if (submitBtn) {
    await submitBtn.click().catch(() => {});
    submitted = true;
  } else {
    const byText = await findClickableByText(page, COMMON.submitTexts);
    if (byText) {
      await byText.element.click().catch(() => {});
      submitted = true;
    }
  }
  if (!submitted) {
    await pwField.press('Enter').catch(() => {});
  }

  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => page.waitForTimeout(3000));

  const state = await looksLoggedIn(page);
  if (state === false) {
    const text = await collectText(page);
    const hint = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6).join(' / ');
    return { ok: false, reason: `로그인 실패 (아이디/비밀번호 확인). 페이지: ${hint.slice(0, 200)}` };
  }

  return { ok: true, loginUrl: found.url };
}
