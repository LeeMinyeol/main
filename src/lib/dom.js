/**
 * 마크업을 모르는 상태에서도 요소를 찾아내기 위한 휴리스틱 헬퍼.
 * 한국 쇼핑몰은 <img> 버튼, onclick 인라인 JS, <a href="javascript:fn()"> 사용이 잦아
 * 텍스트 / value / alt / onclick 을 모두 훑는다.
 */

const CLICKABLE =
  'button, a, input[type="button"], input[type="submit"], input[type="image"], ' +
  '[onclick], [role="button"], .btn, .button, label';

/** 첫 번째로 보이는(visible) 요소를 반환, 없으면 null */
export async function firstVisible(page, selectors) {
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0 && (await loc.isVisible())) return loc;
    } catch {
      /* 잘못된 셀렉터 무시 */
    }
  }
  return null;
}

/** 보이지 않아도 존재하면 반환 (hidden input 등) */
export async function firstPresent(page, selectors) {
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) return loc;
    } catch {
      /* 무시 */
    }
  }
  return null;
}

/**
 * 텍스트/alt/value/onclick 중 하나라도 매칭되는 클릭 가능한 요소를 찾는다.
 * texts 는 우선순위 순서대로 평가된다.
 *
 * 같은 문구가 여러 곳에 있으면 DOM 순서가 아니라 "동작처럼 보이는 정도"로 고른다.
 * 쇼핑몰은 상단 네비게이션에 '출석체크' 링크를 두는 경우가 많은데, DOM 상
 * 실제 버튼보다 앞에 있어 그대로 집으면 페이지만 다시 열고 출석은 되지 않는다.
 * onclick 이 있거나 button/input 이거나 javascript:/# 링크인 요소를 우선한다.
 */
const PICK_ATTR = 'data-attend-pick';

export async function findClickableByText(page, texts) {
  const matched = await page
    .evaluate(
      ([sel, needles, pickAttr]) => {
        const norm = (s) => (s || '').replace(/\s+/g, '');

        // 요소가 "진짜 동작 버튼"에 가까운 정도
        const actionScore = (el) => {
          const tag = el.tagName.toLowerCase();
          let s = 0;
          if (el.hasAttribute('onclick')) s += 10;
          if (tag === 'button' || tag === 'input') s += 8;
          if (tag === 'a') {
            const href = (el.getAttribute('href') || '').trim();
            // javascript:, #, 빈 href = 페이지 이동이 아닌 동작
            if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) s += 6;
            else s -= 5; // 다른 페이지로 가는 평범한 링크 = 네비게이션일 가능성
          }
          if (/btn|button|stamp|attend|출석/i.test(el.className || '')) s += 2;
          return s;
        };

        let best = null;
        let bestScore = -Infinity;
        let bestText = null;

        for (const el of document.querySelectorAll(sel)) {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          if (!visible) continue;

          const hay = norm(
            [
              el.innerText,
              el.getAttribute('value'),
              el.getAttribute('alt'),
              el.getAttribute('title'),
              el.getAttribute('aria-label'),
              // 이미지 버튼: 자식 img 의 alt/src
              ...Array.from(el.querySelectorAll('img')).map(
                (i) => `${i.alt} ${i.getAttribute('src')}`
              ),
            ].join(' ')
          );

          const idx = needles.findIndex((n) => hay.includes(norm(n)));
          if (idx < 0) continue;

          // 동작처럼 보이는지를 우선하고(×10), 같은 조건이면 앞선 문구를 선호한다.
          // 네비게이션 링크가 더 앞선 문구에 걸려도 실제 버튼을 이기지 못한다.
          const s = actionScore(el) * 10 + (needles.length - idx);
          if (s > bestScore) {
            bestScore = s;
            best = el;
            bestText = needles[idx];
          }
        }

        document.querySelectorAll(`[${pickAttr}]`).forEach((e) => e.removeAttribute(pickAttr));
        if (!best) return null;
        best.setAttribute(pickAttr, '1');
        return bestText;
      },
      [CLICKABLE, texts, PICK_ATTR]
    )
    .catch(() => null);

  if (!matched) return null;
  const element = await page.$(`[${PICK_ATTR}]`).catch(() => null);
  if (!element) return null;
  await element.evaluate((el, a) => el.removeAttribute(a), PICK_ATTR).catch(() => {});
  return { element, matched };
}

/** 페이지 전체 텍스트(프레임 포함)를 모아서 반환 */
export async function collectText(page) {
  const parts = [];
  for (const frame of page.frames()) {
    try {
      const t = await frame.evaluate(() => document.body?.innerText || '');
      if (t) parts.push(t);
    } catch {
      /* cross-origin 프레임 무시 */
    }
  }
  return parts.join('\n');
}

/** 문자열 안에 후보 문구 중 하나라도 포함되어 있는지 */
export function containsAny(haystack, needles) {
  const hay = (haystack || '').replace(/\s+/g, '');
  return needles.find((n) => hay.includes(n.replace(/\s+/g, ''))) || null;
}

/**
 * 페이지 구조를 덤프한다 (discover 모드용).
 * 실제 셀렉터를 확정하기 위한 정보 수집.
 */
export async function dumpStructure(page) {
  return page.evaluate(() => {
    const clip = (s, n = 120) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    return {
      url: location.href,
      title: document.title,
      forms: Array.from(document.forms).map((f) => ({
        name: f.name,
        id: f.id,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map((i) => ({
          tag: i.tagName.toLowerCase(),
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
        })),
      })),
      clickables: Array.from(
        document.querySelectorAll(
          'button, a, input[type=button], input[type=submit], input[type=image], [onclick]'
        )
      )
        .filter(visible)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: clip(el.innerText),
          value: el.getAttribute('value'),
          alt: el.getAttribute('alt') || el.querySelector('img')?.alt,
          href: clip(el.getAttribute('href'), 80),
          onclick: clip(el.getAttribute('onclick'), 100),
          id: el.id,
          cls: clip(el.className, 60),
        }))
        .slice(0, 80),
      bodyText: clip(document.body?.innerText, 1500),
    };
  });
}
