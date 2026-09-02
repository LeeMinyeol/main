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
    // 카페24 표준 — 오네임/딩동/도매돌에서 실제 확인됨 (member_id)
    'input[name="member_id"]',
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
    // 카페24 표준 — 딩동 로그인 폼에서 실제 확인됨 (member_passwd)
    'input[name="member_passwd"]',
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
    loginUrlCandidates: [
      'https://m.showdang.co.kr/member/login.php',
      'https://m.showdang.co.kr/member/login.html',
      'https://m.showdang.co.kr/shop/member.html?type=login',
      'https://showdang.co.kr/member/login.php',
    ],
    // 확인됨(2026-09): HTTP 200, 리다이렉트 없음. 자체 PHP 몰.
    // 출석 폼 #formStamp -> ../event/attendance_ps.php (hidden: sno, checkSno, mode 등)
    // 헤더 검색폼 #frmSearchTop 에 input[name=keyword] 존재 -> 폼 범위 한정 필수
    notes: '자체 PHP 몰. 출석 폼 #formStamp. 로그인 URL 미확인.',
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
    // 확인됨(2026-09): HTTP 200. 카페24(.xans-* 클래스). 검색폼 input[name=keyword] 존재.
    notes: '카페24. 로그인 필드는 member_id / member_passwd 예상.',
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
    // 확인됨(2026-09): HTTP 522 (Cloudflare 오리진 응답 없음).
    // 일시적 장애일 수도, 데이터센터 IP 차단일 수도 있음. 첫 실행에서 확인 필요.
    notes: '자체 PHP 몰. 진단 시 Cloudflare 522 — 접속 자체가 불안정할 수 있음.',
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
    // 확인됨(2026-09): 카페24. 비로그인 시 /intro/adult_im.html?returnUrl=... 로
    // 리다이렉트되며 그 페이지에 로그인 폼이 있다.
    //   form action=/exec/front/Member/login/
    //   input#member_id[type=text], input#member_passwd[type=password]
    //   버튼 onclick=MemberAction.login('member_form_...')
    // 네이버 SNS 로그인도 지원: MemberAction.snsLogin('naver', ...)
    // 성인인증(kcp)이 걸려 있어 계정이 미인증이면 로그인만으로 부족할 수 있음.
    notes: '카페24. member_id/member_passwd 확인됨. 성인인증 페이지 경유.',
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
    // 확인됨(2026-09): HTTP 200. 카페24. 출석 버튼이 비로그인 상태에서는
    // onclick="alert('로그인 후 이용 가능합니다.')" 로 동작 -> loginRequiredTexts 로 감지됨.
    notes: '카페24. 모바일 전용 도메인 없음. 비로그인 시 로그인 안내 alert.',
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
