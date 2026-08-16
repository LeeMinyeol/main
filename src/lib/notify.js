/**
 * 결과 알림. WEBHOOK_URL 이 설정된 경우에만 동작한다.
 * Discord(content) / Slack(text) 양쪽 형식을 함께 보내 둘 다 호환된다.
 */
export async function notify(text) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, text }),
    });
    if (!res.ok) {
      console.warn(`  [warn] 알림 전송 실패: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`  [warn] 알림 전송 실패: ${err.message}`);
    return false;
  }
}

/** GitHub Actions 요약 페이지에 결과를 남긴다 */
export async function writeStepSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return false;
  const { appendFileSync } = await import('node:fs');
  try {
    appendFileSync(file, markdown + '\n');
    return true;
  } catch {
    return false;
  }
}
