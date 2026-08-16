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
 */
export async function findClickableByText(page, texts) {
  for (const text of texts) {
    const handle = await page
      .evaluateHandle(
        ([sel, needle]) => {
          const norm = (s) => (s || '').replace(/\s+/g, '');
          const target = norm(needle);
          const nodes = Array.from(document.querySelectorAll(sel));
          for (const el of nodes) {
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
            if (hay.includes(target)) return el;
          }
          return null;
        },
        [CLICKABLE, text]
      )
      .catch(() => null);

    if (handle) {
      const el = handle.asElement();
      if (el) return { element: el, matched: text };
      await handle.dispose().catch(() => {});
    }
  }
  return null;
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
