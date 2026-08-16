/**
 * 사이트별 설정.
 *
 * 중요: loginUrl / 셀렉터는 "후보 목록"입니다.
 * 러너가 후보를 순서대로 시도하고, 실제로 동작하는 것을 사용합니다.
 * 정확한 값이 확인되면 아래에 하드코딩하거나 환경변수로 덮어쓰면 됩니다.
 *   예) SHOWDANG_LOGIN_URL, SHOWDANG_ATTEND_URL
 *
 * 실제 마크업을 확인하려면:  npm run discover -- --site showdang
 */

/** 대부분의 한국 쇼핑몰(메이크샵/카페24/자체 PHP)에서 통용되는 공통 후보들 */
export const COMMON = {
  idSelectors: [
    'input[name="id"]',
    'input[name="m_id"]',
    'input[name="user_id"]',
    'input[name="userid"]',
    'input[name="loginId"]',
    'input[name="login_id"]',
    'input[name="mem_id"]',
    'input[name="memberId"]',
    'input[id="id"]',
    'input[id="user_id"]',
    'input[id="loginId"]',
    'input[autocomplete="username"]',
  ],
  pwSelectors: [
    'input[type="password"]',
    'input[name="passwd"]',
    'input[name="password"]',
    'input[name="pw"]',
    'input[name="m_pw"]',
    'input[name="user_pw"]',
  ],
  submitSelectors: [
    'form button[type="submit"]',
    'form input[type="submit"]',
    'button[type="submit"]',
    'input[type="submit"]',
  ],
  submitTexts: ['로그인', 'LOGIN', 'Login', '로그인하기', '확인'],
  // 출석 버튼에 흔히 쓰이는 문구
  attendTexts: [
    '출석체크',
    '출석 체크',
    '출석하기',
    '도장찍기',
    '도장 찍기',
    '출석도장',
    '오늘 출석',
    '출석',
    '체크인',
    'ATTEND',
  ],
  // 이미 출석한 상태를 나타내는 문구
  alreadyTexts: [
    '이미 출석',
    '이미 참여',
    '오늘은 이미',
    '출석완료',
    '출석 완료',
    '이미 완료',
    '중복',
    '내일 다시',
    '하루에 한 번',
    '1일 1회',
  ],
  // 출석 성공을 나타내는 문구
  successTexts: [
    '출석체크가 완료',
    '출석이 완료',
    '출석완료',
    '적립되었습니다',
    '지급되었습니다',
    '지급 되었습니다',
    '적립 되었습니다',
    '완료되었습니다',
    '감사합니다',
    '축하',
    '당첨',
    '포인트를 획득',
  ],
  // 로그인이 필요한 상태
  loginRequiredTexts: [
    '로그인이 필요',
    '로그인 후',
    '회원만',
    '로그인 해주세요',
    '로그인하세요',
  ],
};

export const SITES = [
  {
    key: 'showdang',
    name: '쇼당 (showdang)',
    attendUrl: 'https://m.showdang.co.kr/event/attend_stamp.php',
    // 확인 필요: PHP 기반 몰이므로 .php 로그인 페이지가 유력
    loginUrlCandidates: [
      'https://m.showdang.co.kr/member/login.php',
      'https://m.showdang.co.kr/member/login.html',
      'https://m.showdang.co.kr/shop/member.html?type=login',
      'https://showdang.co.kr/member/login.php',
    ],
    notes: '자체 PHP 몰로 추정. attend_stamp.php 가 출석 페이지.',
  },
  {
    key: 'oname',
    name: '오네임 (oname)',
    attendUrl: 'https://m.oname.kr/attend/stamp2.html',
    loginUrlCandidates: [
      'https://m.oname.kr/member/login.html',
      'https://m.oname.kr/shop/member.html?type=login',
      'https://m.oname.kr/member/login.php',
      'https://oname.kr/member/login.html',
    ],
    notes: '/attend/stamp2.html — 메이크샵 계열 출석 플러그인으로 추정.',
  },
  {
    key: 'bananamall',
    name: '바나나몰 (bananamall)',
    // islog=Y 중복 파라미터는 정리해도 동작에 영향 없음
    attendUrl: 'https://m.bananamall.co.kr/etc/attendance.php?islog=Y',
    loginUrlCandidates: [
      'https://m.bananamall.co.kr/member/login.php',
      'https://m.bananamall.co.kr/etc/login.php',
      'https://m.bananamall.co.kr/member/login.html',
      'https://www.bananamall.co.kr/member/login.php',
    ],
    notes: 'islog=Y 파라미터는 로그인 상태 플래그로 추정. 자체 PHP 몰.',
  },
  {
    key: 'dingdong',
    name: '딩동 (dingdong)',
    attendUrl: 'https://m.dingdong.co.kr/attend/stamp.html',
    loginUrlCandidates: [
      'https://m.dingdong.co.kr/member/login.html',
      'https://m.dingdong.co.kr/shop/member.html?type=login',
      'https://m.dingdong.co.kr/member/login.php',
      'https://dingdong.co.kr/member/login.html',
    ],
    notes: '/attend/stamp.html — oname/domaedoll 과 동일 플러그인으로 추정.',
  },
  {
    key: 'domaedoll',
    name: '도매돌 (domaedoll)',
    attendUrl: 'https://domaedoll.com/attend/stamp.html',
    loginUrlCandidates: [
      'https://domaedoll.com/member/login.html',
      'https://domaedoll.com/shop/member.html?type=login',
      'https://domaedoll.com/member/login.php',
      'https://m.domaedoll.com/member/login.html',
    ],
    notes: '모바일 전용 도메인이 따로 없어 domaedoll.com 사용.',
  },
];

/** 환경변수 오버라이드를 적용해 사이트 설정을 완성한다 */
export function resolveSites(env = process.env) {
  return SITES.map((site) => {
    const up = site.key.toUpperCase();
    return {
      ...site,
      idEnv: `${up}_ID`,
      pwEnv: `${up}_PW`,
      id: env[`${up}_ID`] || '',
      pw: env[`${up}_PW`] || '',
      attendUrl: env[`${up}_ATTEND_URL`] || site.attendUrl,
      loginUrlCandidates: env[`${up}_LOGIN_URL`]
        ? [env[`${up}_LOGIN_URL`]]
        : site.loginUrlCandidates,
      // 셀렉터 직접 지정 오버라이드 (확인된 경우)
      idSelector: env[`${up}_ID_SELECTOR`] || null,
      pwSelector: env[`${up}_PW_SELECTOR`] || null,
      attendSelector: env[`${up}_ATTEND_SELECTOR`] || null,
    };
  });
}

export function getSite(key, env = process.env) {
  return resolveSites(env).find((s) => s.key === key);
}
