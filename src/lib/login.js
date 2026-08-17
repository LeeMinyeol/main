import { COMMON } from '../config/sites.js';
import { firstVisible, findClickableByText, collectText, containsAny } from './dom.js';

/**
 * 현재 페이지가 로그인된 상태로 보이는지 판단.
 *
 * 판정 순서가 중요하다. "마이페이지" 는 로그인 여부와 무관하게 대부분의 쇼핑몰
 * 네비게이션에 항상 떠 있으므로 근거로서 약하다. 반면 보이는 비밀번호 입력창은
 * 미로그인의 강한 근거다. 이 둘의 순서가 뒤바뀌면 로그인 실패 후 재노출된
 * 로그인 폼을 "로그인 성공" 으로 오판한다.
 */
export async function looksLoggedIn(page) {
  try {
    const text = await collectText(page);

    // 1) 로그아웃 링크 — 로그인 상태의 가장 강한 근거
    if (containsAny(text, ['로그아웃', 'LOGOUT', 'Logout'])) return true;

    // 2) 보이는 비밀번호 입력창 — 미로그인의 강한 근거
    if (await firstVisible(page, ['input[type="password"]'])) return false;

    // 3) 약한 근거들
    if (containsAny(text, COMMON.loginRequiredTexts)) return false;
    if (containsAny(text, ['마이페이지', '주문내역', '적립금'])) return true;

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
 * 비밀번호 필드가 속한 폼 안에서만 아이디 입력란을 찾는다.
 * 후보 셀렉터 → 폼 내 첫 텍스트성 입력창 순으로 시도한다.
 */
async function findIdFieldInSameForm(pwField, selectors) {
  const pwHandle = await pwField.elementHandle();
  if (!pwHandle) return null;

  const found = await pwHandle.evaluateHandle((pw, sels) => {
    const scope = pw.closest('form') || pw.ownerDocument.body;
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    for (const sel of sels) {
      let el;
      try {
        el = scope.querySelector(sel);
      } catch {
        continue; // 잘못된 셀렉터
      }
      if (visible(el) && el !== pw) return el;
    }

    // 후보가 안 맞으면 폼 안의 첫 텍스트성 입력창
    const TEXTY = ['text', 'email', 'tel', ''];
    for (const el of scope.querySelectorAll('input')) {
      if (el !== pw && TEXTY.includes(el.type) && visible(el)) return el;
    }
    return null;
  }, selectors);

  const el = found.asElement();
  if (!el) {
    await found.dispose().catch(() => {});
    return null;
  }
  return el;
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

  const pwField = found.pwField;
  const idSelectors = site.idSelector ? [site.idSelector] : COMMON.idSelectors;

  // 아이디 입력란은 반드시 비밀번호 필드와 같은 폼 안에서 찾는다.
  // 페이지 전체를 뒤지면 헤더의 검색창(대부분의 쇼핑몰에 있고 DOM 상 로그인 폼보다
  // 앞에 온다)에 아이디를 입력해버린다.
  const idField = await findIdFieldInSameForm(pwField, idSelectors);
  if (!idField) {
    return { ok: false, reason: '아이디 입력란을 찾지 못함 (ID_SELECTOR 환경변수로 지정 필요)' };
  }

  await idField.fill(site.id);
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
