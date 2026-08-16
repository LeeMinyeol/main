# 출석체크 자동화

5개 쇼핑몰의 일일 출석체크를 GitHub Actions로 매일 자동 실행합니다.

| 키 | 사이트 | 출석 페이지 |
| --- | --- | --- |
| `showdang` | 쇼당 | `m.showdang.co.kr/event/attend_stamp.php` |
| `oname` | 오네임 | `m.oname.kr/attend/stamp2.html` |
| `bananamall` | 바나나몰 | `m.bananamall.co.kr/etc/attendance.php` |
| `dingdong` | 딩동 | `m.dingdong.co.kr/attend/stamp.html` |
| `domaedoll` | 도매돌 | `domaedoll.com/attend/stamp.html` |

---

## ⚠️ 먼저 읽어주세요

**개발 환경에서 위 5개 사이트에 접속할 수 없었습니다.** (네트워크 정책으로 차단됨)

그래서 **로그인 페이지 주소와 출석 버튼 셀렉터는 실제로 확인한 값이 아니라
한국 쇼핑몰의 일반적인 패턴을 바탕으로 한 후보값**입니다. 대신 코드가 이렇게 대응합니다:

- 로그인 URL을 여러 후보로 **순차 시도**해서 실제 로그인 폼이 있는 페이지를 찾습니다
- 출석 버튼을 **텍스트 / 이미지 alt / value / onclick** 전부에서 찾습니다
  (한국 쇼핑몰은 이미지 버튼과 인라인 JS를 많이 써서 이 방식이 필요합니다)
- 그래도 못 찾으면 **`discover` 명령**으로 실제 마크업을 덤프해 셀렉터를 확정할 수 있습니다

로직 자체는 로컬 테스트 서버로 13개 케이스를 검증했습니다 (`npm test`).
**첫 실행은 반드시 수동으로 돌려서 결과를 확인하세요.** ([4단계](#4-첫-실행-확인-중요))

---

## 설정 방법

### 1. 계정 정보를 GitHub Secrets에 등록

저장소 → **Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 값 |
| --- | --- |
| `SHOWDANG_ID` / `SHOWDANG_PW` | 쇼당 아이디 / 비밀번호 |
| `ONAME_ID` / `ONAME_PW` | 오네임 아이디 / 비밀번호 |
| `BANANAMALL_ID` / `BANANAMALL_PW` | 바나나몰 아이디 / 비밀번호 |
| `DINGDONG_ID` / `DINGDONG_PW` | 딩동 아이디 / 비밀번호 |
| `DOMAEDOLL_ID` / `DOMAEDOLL_PW` | 도매돌 아이디 / 비밀번호 |

> 등록하지 않은 사이트는 자동으로 **건너뜁니다**. 일부만 쓰셔도 됩니다.

### 2. (선택) 결과 알림

`WEBHOOK_URL` secret에 **Discord 또는 Slack 웹훅 URL**을 넣으면 매일 결과가 전송됩니다.
설정하지 않아도 Actions 실행 요약 페이지에서 결과표를 볼 수 있습니다.

### 3. 스케줄

`.github/workflows/attendance.yml` 에 이미 설정되어 있습니다.

- **매일 00:10 (KST)** — 자정 리셋 직후 1차 실행
- **매일 12:00 (KST)** — 1차가 실패했을 경우를 위한 2차 실행

이미 출석한 상태면 `이미 출석함`으로 표시되고 아무 일도 일어나지 않으니 2번 돌아도 안전합니다.

> GitHub Actions의 `schedule`은 러너가 붐빌 때 **수 분~수십 분 지연**될 수 있습니다.
> 2차 실행이 이 지연에 대한 보험 역할을 합니다.

### 4. 첫 실행 확인 (중요)

**Actions 탭 → 출석체크 → Run workflow** 로 수동 실행한 뒤 결과를 확인하세요.

실행 요약에 이런 표가 나옵니다:

| 사이트 | 결과 | 상세 |
| --- | --- | --- |
| 쇼당 (showdang) | ✅ 출석 완료 | 출석체크가 완료되었습니다 |
| 딩동 (dingdong) | ☑️ 이미 출석함 | 오늘은 이미 출석하셨습니다 |

| 표시 | 의미 | 조치 |
| --- | --- | --- |
| ✅ 출석 완료 | 정상 | — |
| ☑️ 이미 출석함 | 정상 (오늘 이미 완료) | — |
| ❔ 결과 불명 | 클릭은 됐으나 문구 해석 실패 | 스크린샷 확인 |
| 🔒 로그인 필요 | 로그인 실패 | 계정 정보 확인 |
| 🔍 버튼 못 찾음 | 출석 버튼 탐색 실패 | 아티팩트의 `debug-*.json` 확인 |
| ❌ 오류 | 접속 실패 등 | 스크린샷 확인 |
| ⏭️ 건너뜀 | 계정 미설정 | Secret 등록 |

실패한 사이트의 **스크린샷과 진단 정보는 Actions 실행 페이지 하단 Artifacts**에서 받을 수 있습니다.

---

## 셀렉터가 안 맞을 때

`🔍 버튼 못 찾음` 또는 `🔒 로그인 필요`가 나오면, **실패한 그 실행의 아티팩트에
이미 진단 정보가 들어 있습니다** (`debug-<사이트키>.json`). 따로 다시 돌릴 필요 없이
그 파일의 `forms` / `clickables` 를 보고 셀렉터를 확정하면 됩니다.

```json
{
  "clickables": [
    { "tag": "a", "text": "출석체크", "id": "btn_stamp", "onclick": "goAttend()" }
  ]
}
```

더 자세히 보고 싶으면 `discover` 모드로 별도 실행할 수도 있습니다.
**Actions → 출석체크 → Run workflow → mode: `discover`** 로 실행하면
로그인 폼과 클릭 가능한 요소 목록이 로그와 `artifacts/discover.json`에 출력됩니다.

로컬에서도 가능합니다:

```bash
npm install
npx playwright install chromium
cp .env.example .env   # 계정 정보 입력
npm run discover -- --site dingdong
```

출력 예시:

```
<a> "출석체크" #btn_stamp onclick=goAttend()
```

확인한 값을 저장소 **Settings → Secrets and variables → Actions → Variables** 에 등록하면
자동 탐색보다 우선 적용됩니다:

| Variable | 예시 |
| --- | --- |
| `DINGDONG_ATTEND_SELECTOR` | `#btn_stamp` |
| `DINGDONG_LOGIN_URL` | `https://m.dingdong.co.kr/member/login.html` |

`SHOWDANG_`, `ONAME_`, `BANANAMALL_`, `DOMAEDOLL_` 도 동일한 형식입니다.

---

## 로컬 실행

```bash
npm install
npx playwright install chromium
cp .env.example .env      # 계정 정보 입력

npm run attend                      # 전체 실행
node src/index.js run --site oname  # 특정 사이트만
node src/index.js run --headed      # 브라우저 창 띄워서 확인
npm run list                        # 설정 상태 확인
npm test                            # 로직 테스트 (실제 사이트 접속 없음)
```

Chromium 경로를 직접 지정해야 하면 `CHROMIUM_PATH` 환경변수를 사용하세요.

---

## 동작 방식

```
저장된 세션으로 출석 페이지 접속
  └─ 로그인 상태 아니면 → 로그인 URL 후보를 순차 시도해 로그인 → 세션 저장
      └─ 출석 페이지에서 이미 출석했는지 먼저 확인
          └─ 출석 버튼 탐색 (텍스트 / 이미지 alt / value / onclick)
              └─ 클릭 → alert 메시지 가로채기 → 결과 분류
```

핵심 포인트:

- **alert 가로채기** — 한국 쇼핑몰은 출석 결과를 대부분 `alert()`로 알려줍니다.
  Playwright는 기본적으로 alert를 자동으로 닫아버리기 때문에, 닫히기 전에 메시지를 가로채
  성공/중복 여부를 판단합니다.
- **"이미" 판정이 "완료"보다 우선** — `"이미 출석이 완료되었습니다"` 같은 문구를
  성공으로 오분류하지 않도록 순서를 고정했습니다.
- **아이디 입력란은 폼 범위로 한정** — 페이지 전체를 뒤지면 헤더의 검색창(대부분의
  쇼핑몰에 있고 DOM 상 로그인 폼보다 앞에 옵니다)에 아이디를 입력해버립니다.
  비밀번호 필드가 속한 `<form>` 안에서만 찾습니다.
- **실패 시 자동 진단** — 실패한 실행의 아티팩트에 페이지 구조가 자동으로 덤프되어,
  한 번의 실패만으로 셀렉터를 확정할 수 있습니다.
- **모바일 에뮬레이션** — 대상이 대부분 `m.` 도메인이라 iPhone UA로 접속합니다.
- **세션 재사용** — 로컬 실행 시 `.state/`에 세션을 저장해 매번 로그인하지 않습니다.
  (GitHub Actions에서는 자격증명이 캐시에 남지 않도록 매번 새로 로그인합니다)
- 사이트 간 2초 간격을 두고 **순차 실행**해 서버에 부담을 주지 않습니다.

## 구조

```
src/
  index.js            CLI
  config/sites.js     사이트 설정 + 문구 사전 (여기만 고치면 사이트 추가 가능)
  lib/
    runner.js         전체 실행 흐름 / 결과 요약
    login.js          로그인 (URL 후보 탐색 포함)
    attend.js         출석 클릭 + 결과 분류
    dom.js            요소 탐색 휴리스틱
    browser.js        브라우저 / 세션 / alert 가로채기
    discover.js       마크업 덤프
    notify.js         웹훅 알림
test/                 로컬 픽스처 기반 테스트
```

## 참고

- 계정 정보는 GitHub Secrets에만 저장되며 로그에 출력되지 않습니다. `.env`는 `.gitignore` 처리되어 있습니다.
- 사이트가 개편되면 셀렉터가 바뀔 수 있습니다. 실패 알림이 오면 `discover`로 다시 확인하세요.
- 각 사이트 이용약관에 따라 자동화가 제한될 수 있습니다. 본인 계정의 일일 출석 용도로만 사용하세요.
