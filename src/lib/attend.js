import { COMMON } from '../config/sites.js';
import {
  findClickableByText,
  firstVisible,
  collectText,
  containsAny,
} from './dom.js';
import { captureDialogs, screenshot } from './browser.js';

export const RESULT = {
  SUCCESS: 'success',
  ALREADY: 'already',
  UNKNOWN: 'unknown', // 클릭은 됐고 알림도 떴지만 문구 분류 실패
  LOGIN_REQUIRED: 'login_required',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
};

/**
 * alert 메시지 + 페이지 텍스트를 보고 결과를 분류한다.
 * 순서 주의: '이미 출석' 판정을 성공보다 먼저 해야 오탐이 없다.
 */
export function classify(text) {
  if (!text) return null;
  const already = containsAny(text, COMMON.alreadyTexts);
  if (already) return { result: RESULT.ALREADY, matched: already };

  const loginNeeded = containsAny(text, COMMON.loginRequiredTexts);
  if (loginNeeded) return { result: RESULT.LOGIN_REQUIRED, matched: loginNeeded };

  const success = containsAny(text, COMMON.successTexts);
  if (success) return { result: RESULT.SUCCESS, matched: success };

  return null;
}

/**
 * 출석체크 실행.
 * @returns {{result: string, message: string, shot?: string}}
 */
export async function attend(page, site, log = console.log) {
  const dialogs = captureDialogs(page);

  log(`  출석 페이지 이동: ${site.attendUrl}`);
  await page.goto(site.attendUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 페이지 진입 시점에 뜬 alert (예: "로그인이 필요합니다")
  let pageText = await collectText(page);
  const entryText = [...dialogs, pageText].join('\n');

  if (containsAny(entryText, COMMON.loginRequiredTexts)) {
    return {
      result: RESULT.LOGIN_REQUIRED,
      message: '출석 페이지에서 로그인 요구됨',
      shot: await screenshot(page, `${site.key}-login-required`),
    };
  }

  // 이미 출석한 상태인지 클릭 전에 먼저 확인
  const pre = classify(entryText);
  if (pre && pre.result === RESULT.ALREADY) {
    return {
      result: RESULT.ALREADY,
      message: `이미 출석 완료 ("${pre.matched}")`,
      shot: await screenshot(page, `${site.key}-already`),
    };
  }

  // 출석 버튼 찾기
  const before = dialogs.length;
  let clicked = false;

  if (site.attendSelector) {
    const el = await firstVisible(page, [site.attendSelector]);
    if (el) {
      await el.click().catch(() => {});
      clicked = true;
      log(`  출석 버튼 클릭 (지정 셀렉터)`);
    }
  }

  if (!clicked) {
    const hit = await findClickableByText(page, COMMON.attendTexts);
    if (hit) {
      await hit.element.click().catch(() => {});
      clicked = true;
      log(`  출석 버튼 클릭 (매칭: "${hit.matched}")`);
    }
  }

  if (!clicked) {
    return {
      result: RESULT.NOT_FOUND,
      message:
        '출석 버튼을 찾지 못함. `npm run discover -- --site ' +
        site.key +
        '` 로 실제 마크업 확인 후 ' +
        site.key.toUpperCase() +
        '_ATTEND_SELECTOR 를 지정하세요.',
      shot: await screenshot(page, `${site.key}-notfound`),
    };
  }

  // 클릭 후 alert / 페이지 변화 대기
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  pageText = await collectText(page);
  const newDialogs = dialogs.slice(before);
  const afterText = [...newDialogs, pageText].join('\n');

  const verdict = classify(afterText);
  const dialogMsg = newDialogs.join(' | ');
  const shot = await screenshot(page, `${site.key}-after`);

  if (verdict) {
    return {
      result: verdict.result,
      message: dialogMsg || `페이지 문구 매칭: "${verdict.matched}"`,
      shot,
    };
  }

  // 분류 실패: alert 이 떴다면 그 내용을 그대로 보고 (사람이 판단)
  if (dialogMsg) {
    return { result: RESULT.UNKNOWN, message: `알림: ${dialogMsg}`, shot };
  }

  return {
    result: RESULT.ERROR,
    message: '클릭은 했으나 결과를 확인하지 못함 (스크린샷 확인 필요)',
    shot,
  };
}
