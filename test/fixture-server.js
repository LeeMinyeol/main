/**
 * 실제 사이트에 접근하지 않고 로직을 검증하기 위한 로컬 테스트 서버.
 * 한국 쇼핑몰에서 흔한 3가지 패턴을 재현한다.
 *   A: 텍스트 버튼 + alert 성공
 *   B: 이미지 버튼(alt) + alert "이미 출석"
 *   C: onclick 인라인 JS + 페이지 내 문구로 성공 표시
 */
import http from 'node:http';

const SESSIONS = new Set();
let nextSid = 1;

const html = (body) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>테스트몰</title></head><body>${body}</body></html>`;

const loginPage = (action) =>
  html(`
    <h1>로그인</h1>
    <form method="POST" action="${action}">
      <input type="text" name="id" placeholder="아이디">
      <input type="password" name="passwd" placeholder="비밀번호">
      <input type="submit" value="로그인">
    </form>`);

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, v] = part.split('=').map((s) => s?.trim());
    if (k) out[k] = v;
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(new URLSearchParams(data)));
  });
}

function isAuthed(req) {
  const sid = parseCookies(req).sid;
  return sid && SESSIONS.has(sid);
}

export function createServer(variant = 'A', { attended = false } = {}) {
  let hasAttended = attended;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (code, body, headers = {}) => {
      res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
      res.end(body);
    };

    // 로그인 페이지 (후보 탐색 검증을 위해 일부러 /member/login.php 만 유효)
    if (url.pathname === '/member/login.php') {
      if (req.method === 'POST') {
        const form = await readBody(req);
        if (form.get('id') === 'testuser' && form.get('passwd') === 'testpw') {
          const sid = `s${nextSid++}`;
          SESSIONS.add(sid);
          return send(302, '', { Location: '/', 'Set-Cookie': `sid=${sid}; Path=/` });
        }
        return send(200, html('<p>아이디 또는 비밀번호가 올바르지 않습니다.</p>' ) +
          loginPage('/member/login.php'));
      }
      return send(200, loginPage('/member/login.php'));
    }

    if (url.pathname === '/') {
      return send(200, html(isAuthed(req) ? '<a href="/logout">로그아웃</a><p>마이페이지</p>' : '<a href="/member/login.php">로그인</a>'));
    }

    // 출석 API
    if (url.pathname === '/api/attend') {
      if (!isAuthed(req)) return send(200, 'LOGIN');
      if (hasAttended) return send(200, 'ALREADY');
      hasAttended = true;
      return send(200, 'OK');
    }

    // 출석 페이지
    if (url.pathname === '/attend/stamp.html') {
      if (!isAuthed(req)) {
        return send(200, html('<script>alert("로그인이 필요합니다.");</script><p>로그인이 필요합니다</p>'));
      }

      const script = `
        <script>
        async function doAttend() {
          const r = await fetch('/api/attend');
          const t = await r.text();
          if (t === 'OK') { ${
            variant === 'C'
              ? `document.getElementById('msg').innerText = '출석체크가 완료되었습니다. 100포인트 적립되었습니다.';`
              : `alert('출석체크가 완료되었습니다. 100포인트가 적립되었습니다.');`
          } }
          else if (t === 'ALREADY') { alert('오늘은 이미 출석체크를 하셨습니다.'); }
          else { alert('로그인이 필요합니다.'); }
        }
        </script>`;

      let button;
      if (variant === 'A') {
        button = `<button onclick="doAttend()">출석체크</button>`;
      } else if (variant === 'B') {
        // 이미지 버튼: 텍스트 노드가 전혀 없고 alt 로만 식별 가능
        button = `<a href="javascript:void(0)" onclick="doAttend()"><img src="/btn.png" alt="출석하기" width="200" height="60"></a>`;
      } else {
        button = `<div class="btn" onclick="doAttend()">도장찍기</div><p id="msg"></p>`;
      }

      return send(200, html(`<h1>출석체크</h1><a href="/logout">로그아웃</a>${button}${script}`));
    }

    if (url.pathname === '/btn.png') {
      return send(200, '', { 'Content-Type': 'image/png' });
    }

    send(404, html('<p>Not Found</p>'));
  });
}
