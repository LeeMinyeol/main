/**
 * 로컬 픽스처 서버로 전체 흐름을 검증한다.
 *   node test/run-tests.js
 */
import assert from 'node:assert';
import fs from 'node:fs';
import { createServer } from './fixture-server.js';
import { runAll } from '../src/lib/runner.js';
import { RESULT } from '../src/lib/attend.js';
import { classify } from '../src/lib/attend.js';

const PORTS = { A: 8181, B: 8182, C: 8183, D: 8184, E: 8185, F: 8186, G: 8187 };

function siteFor(key, port, creds = { id: 'testuser', pw: 'testpw' }) {
  const base = `http://127.0.0.1:${port}`;
  return {
    key,
    name: `테스트-${key}`,
    attendUrl: `${base}/attend/stamp.html`,
    loginUrlCandidates: [
      `${base}/member/login.html`, // 존재하지 않음 → 후보 탐색 검증
      `${base}/shop/member.html?type=login`, // 존재하지 않음
      `${base}/member/login.php`, // 실제 로그인 폼
    ],
    idEnv: `${key.toUpperCase()}_ID`,
    pwEnv: `${key.toUpperCase()}_PW`,
    ...creds,
  };
}

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failures++;
    console.log(`  ❌ ${name}\n     ${err.message}`);
  }
}

async function main() {
  // ── 1. 단위 테스트: 결과 분류 ────────────────────────────
  console.log('\n[1] 결과 문구 분류');
  check('성공 문구', () =>
    assert.equal(classify('출석체크가 완료되었습니다').result, RESULT.SUCCESS)
  );
  check('중복 출석 문구', () =>
    assert.equal(classify('오늘은 이미 출석체크를 하셨습니다').result, RESULT.ALREADY)
  );
  check('"이미"가 "완료"보다 우선', () =>
    assert.equal(
      classify('이미 출석체크가 완료되었습니다').result,
      RESULT.ALREADY,
      '중복인데 성공으로 오분류됨'
    )
  );
  check('로그인 요구 문구', () =>
    assert.equal(classify('로그인이 필요합니다').result, RESULT.LOGIN_REQUIRED)
  );
  check('무관한 문구는 null', () => assert.equal(classify('상품 목록'), null));

  // ── 2. 통합 테스트: 브라우저 자동화 ──────────────────────
  const servers = [];
  const start = (variant, port, opts) =>
    new Promise((resolve) => {
      const s = createServer(variant, opts);
      s.listen(port, '127.0.0.1', () => resolve(s));
      servers.push(s);
    });

  await start('A', PORTS.A); // 텍스트 버튼
  await start('B', PORTS.B); // 이미지 버튼 (alt)
  await start('C', PORTS.C); // onclick div + 페이지 문구
  await start('A', PORTS.D, { attended: true }); // 이미 출석함
  await start('A', PORTS.E); // 잘못된 비밀번호
  // 아이디 입력란 name 이 기본 후보에 없음 → 폴백 경로.
  // 헤더 검색창을 아이디 칸으로 오인하면 로그인이 실패한다.
  await start('A', PORTS.F, { loginIdName: 'mb_id_login' });
  await start('NONE', PORTS.G); // 출석 버튼 없음 → 진단 덤프 검증

  try {
    console.log('\n[2] 브라우저 통합 테스트 (로컬 픽스처)');
    const sites = [
      siteFor('varA', PORTS.A),
      siteFor('varB', PORTS.B),
      siteFor('varC', PORTS.C),
      siteFor('already', PORTS.D),
      siteFor('badpw', PORTS.E, { id: 'testuser', pw: 'wrong' }),
      siteFor('oddid', PORTS.F),
      siteFor('nobutton', PORTS.G),
    ];

    const results = await runAll(sites, { retries: 0 });
    const by = Object.fromEntries(results.map((r) => [r.key, r]));

    console.log('\n[3] 검증');
    check('A: 텍스트 버튼 + alert → 성공', () =>
      assert.equal(by.varA.result, RESULT.SUCCESS, JSON.stringify(by.varA))
    );
    check('B: 이미지 버튼(alt만 존재) → 성공', () =>
      assert.equal(by.varB.result, RESULT.SUCCESS, JSON.stringify(by.varB))
    );
    check('C: onclick div + 페이지 문구 → 성공', () =>
      assert.equal(by.varC.result, RESULT.SUCCESS, JSON.stringify(by.varC))
    );
    check('D: 이미 출석한 계정 → already', () =>
      assert.equal(by.already.result, RESULT.ALREADY, JSON.stringify(by.already))
    );
    check('E: 비밀번호 오류 → 로그인 실패로 보고', () =>
      assert.equal(by.badpw.result, RESULT.LOGIN_REQUIRED, JSON.stringify(by.badpw))
    );
    check('로그인 URL 후보 탐색이 동작', () =>
      assert.ok(by.varA.result !== RESULT.ERROR, '후보 탐색 실패')
    );
    check('아이디 입력란을 헤더 검색창과 혼동하지 않음', () =>
      assert.equal(
        by.oddid.result,
        RESULT.SUCCESS,
        '폼 범위를 벗어나 검색창에 아이디를 입력한 것으로 보임: ' + JSON.stringify(by.oddid)
      )
    );
    check('출석 버튼이 없으면 not_found 로 보고', () =>
      assert.equal(by.nobutton.result, RESULT.NOT_FOUND, JSON.stringify(by.nobutton))
    );
    check('네비게이션 링크 대신 실제 출석 버튼을 클릭', () => {
      // 세 변형 모두 상단에 '출석체크' 링크가 있다. 링크를 집으면 페이지만
      // 다시 열려 출석이 되지 않으므로 success 가 나올 수 없다.
      for (const k of ['varA', 'varB', 'varC']) {
        assert.equal(
          by[k].result,
          RESULT.SUCCESS,
          `${k}: 네비게이션 링크를 클릭한 것으로 보임 — ` + JSON.stringify(by[k])
        );
      }
    });
    check('로그인 실패를 마이페이지 문구로 오판하지 않음', () => {
      // 로그인 실패 페이지에도 '마이페이지'가 남아 있다. 이것만 보고 로그인 성공으로
      // 판단하면 실패가 로그인 단계에서 잡히지 않고, 뒤늦게 출석 단계에서
      // "로그인 요구됨"으로만 보고되어 원인이 자격증명이라는 사실이 가려진다.
      assert.equal(by.badpw.result, RESULT.LOGIN_REQUIRED, JSON.stringify(by.badpw));
      assert.ok(
        by.badpw.message.includes('아이디/비밀번호'),
        '자격증명 문제로 진단되지 않음: ' + by.badpw.message
      );
    });
    check('실패 시 진단 덤프를 자동 생성', () => {
      const f = by.nobutton.debug;
      assert.ok(f && fs.existsSync(f), '진단 파일 없음: ' + f);
      const dump = JSON.parse(fs.readFileSync(f, 'utf8'));
      assert.ok(Array.isArray(dump.clickables), 'clickables 누락');
      assert.ok(dump.bodyText.includes('준비중'), '페이지 본문 누락');
    });

    // ── 4. 세션 재사용 (2일차 이후 흐름) ───────────────────
    console.log('\n[4] 저장된 세션 재사용');
    const logs = [];
    const orig = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    const second = await runAll([siteFor('varA', PORTS.A)], { retries: 0 });
    console.log = orig;

    check('재실행 시 로그인을 건너뜀', () =>
      assert.ok(
        logs.some((l) => l.includes('기존 세션 유효')),
        '세션이 재사용되지 않음:\n' + logs.join('\n')
      )
    );
    check('재실행 결과는 이미 출석함', () =>
      assert.equal(second[0].result, RESULT.ALREADY, JSON.stringify(second[0]))
    );
  } finally {
    for (const s of servers) s.close();
  }

  console.log(
    failures === 0 ? '\n전체 통과 🎉' : `\n실패 ${failures}건`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
