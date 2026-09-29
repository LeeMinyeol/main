# Claude Showreel — 코드로 만든 15초 모션그래픽

1920x1080 · 30fps · 15초 · 사운드 포함 MP4 (`showreel.mp4`)

사용한 프롬프트 (v2, 원문 그대로):

> You're a world-class motion designer, and this is your 15-second résumé reel. Make it dynamic and confident: open with a striking hook in the first second, build through a sequence of distinct techniques (typography, shape play, camera moves, colour shifts), and land on a clean, memorable final frame. Pacing should feel like it's cut to music. Go crazy

(v1 은 git 기록에 남아 있습니다: 커밋 `cbaf66c`)

## 다시 렌더하기

```bash
cd showreel
npm install            # 처음 한 번만 (이 폴더 안에만 설치됨)
npm run render         # → showreel.mp4 (약 3분)
npm run preview        # → build/preview/ 에 확인용 스틸 이미지 (약 10초)
```

필요한 것: Node.js 20 이상, ffmpeg, Chromium(Playwright용)

## 장면 구성 (6개) — 모든 컷은 음악 박자(0.5초) 위에 있음

| # | 파일 | 시간 | 기법 | 내용 |
|---|------|------|------|------|
| 1 | `src/scenes/01-hook.js` | 0.0–1.0초 | 훅 | 첫 프레임부터 화면을 꽉 채운 MOTION 이 쾅 → 박자에 색 반전 → 'O' 구멍 속으로 크래시 줌 |
| 2 | `src/scenes/02-typography.js` | 1.0–4.0초 | 타이포그래피 | I MAKE / PIXELS / DANCE 편집 레이아웃 → 원형 글자 링 → RHYTHM 마퀴 9줄이 눌려 선이 됨 |
| 3 | `src/scenes/03-shapes.js` | 4.0–7.0초 | 도형 | 선이 이퀄라이저 막대로 → 바우하우스 타일이 8분음표마다 회전 → 도형들이 코랄 원으로 모임 |
| 4 | `src/scenes/04-camera.js` | 7.0–10.0초 | 카메라 무빙 | 돌리 줌(버티고) → 휩 팬 → 크래시 줌 → 루빅스 큐브 오빗 & 층 회전 → 폭발 |
| 5 | `src/scenes/05-colour.js` | 10.0–12.5초 | 색 전환 | 박자마다 팔레트 교체(원형으로 퍼짐), 꿀렁이는 덩어리, 컬러휠 링, HEX 칩 |
| 6 | `src/scenes/06-final.js` | 12.5–15.0초 | 엔딩 | 코랄이 점으로 오므라듦 → 점이 16분음표로 글자를 밟고 → 14.0초에 마침표로 착지 → 'CLAUDE.' 카드 |

그 밖의 파일

- `src/main.js` — 장면 순서, 화면 테두리 정보(HUD), 필름 그레인, 비네팅, 모션 블러
- `src/lib.js` — 색상표, 움직임 곡선(이징), 공통 도구
- `audio.mjs` — 배경 음악과 효과음을 수학으로 합성 (120BPM, 한 박자 = 0.5초, 장면 전환·효과음이 전부 박자에 맞춤)
- `render.mjs` — 브라우저로 한 프레임씩 그려서 ffmpeg 로 MP4 제작
- 폰트: Anton, Space Mono (둘 다 SIL Open Font License, npm `@fontsource` 패키지로 설치)

## 장면 하나만 고치고 싶을 때

**장면 번호나 이름**과 **바꾸고 싶은 것**을 같이 말하면 됩니다. 예:

- "장면 1(HOOK)의 MOTION 을 DESIGN 으로 바꿔줘"
- "장면 2의 I MAKE PIXELS DANCE 문구를 I MAKE IDEAS MOVE 로 바꿔줘"
- "장면 3의 바우하우스 타일 색을 파스텔로 바꿔줘"
- "장면 4에서 큐브 대신 구슬들로 해줘" / "돌리 줌을 조금 더 길게"
- "장면 5의 COLOUR 글자를 빼고 덩어리만 남겨줘"
- "장면 6 엔딩 카드의 이름을 MINYEOL 로, 부제목을 VIDEO EDITOR 로 바꿔줘"
- "음악 템포를 더 빠르게" (→ `audio.mjs` 와 박자에 맞춘 장면 타이밍을 같이 조정)

다른 장면은 건드리지 않고 해당 파일만 고친 뒤 다시 렌더하면 됩니다.
