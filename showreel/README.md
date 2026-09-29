# Claude Showreel — 코드로 만든 15초 모션그래픽

1920x1080 · 30fps · 15초 · 사운드 포함 MP4 (`showreel.mp4`)

사용한 프롬프트 (원문 그대로):

> make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. Go all out

## 다시 렌더하기

```bash
cd showreel
npm install            # 처음 한 번만 (이 폴더 안에만 설치됨)
npm run render         # → showreel.mp4 (약 3분)
npm run preview        # → build/preview/ 에 확인용 스틸 이미지 (약 10초)
```

필요한 것: Node.js 20 이상, ffmpeg, Chromium(Playwright용)

## 장면 구성 (6개)

| # | 파일 | 시간 | 내용 |
|---|------|------|------|
| 1 | `src/scenes/01-ignition.js` | 0.0–2.0초 | 점 하나 → 충격파·방사선 폭발 → "HELLO. I MAKE THINGS MOVE." 타이핑 → 코랄색으로 화면을 덮음 |
| 2 | `src/scenes/02-kinetic-type.js` | 2.0–4.5초 | 박자마다 DESIGN → ANIMATE → DIRECT → DELIVER, 배경색 전환 → MOTION 이 가로로 찢어짐 |
| 3 | `src/scenes/03-geometry.js` | 4.5–7.0초 | 물결치는 타일 격자 + 원 → 삼각형 → 사각형 → 육각형 → 별 모핑 → 링 속으로 줌인 |
| 4 | `src/scenes/04-particles.js` | 7.0–9.5초 | 입자 3,400개 은하 소용돌이 → "CLAUDE" 글자로 모임 → 워프 폭발 |
| 5 | `src/scenes/05-dimension.js` | 9.5–12.0초 | 3D 사각 터널 비행 + 네온 토러스 매듭 회전 → 흰 빛 폭발 |
| 6 | `src/scenes/06-outro.js` | 12.0–15.0초 | 색 띠 와이프 → CLAUDE / MOTION DESIGNER 이름 카드 → 페이드아웃 |

그 밖의 파일

- `src/main.js` — 장면 순서, 화면 테두리 정보(HUD), 필름 그레인, 비네팅, 모션 블러
- `src/lib.js` — 색상표, 움직임 곡선(이징), 공통 도구
- `audio.mjs` — 배경 음악과 효과음을 수학으로 합성 (120BPM, 한 박자 = 0.5초)
- `render.mjs` — 브라우저로 한 프레임씩 그려서 ffmpeg 로 MP4 제작
- 폰트: Anton, Space Mono (둘 다 SIL Open Font License, npm `@fontsource` 패키지로 설치)

## 장면 하나만 고치고 싶을 때

**장면 번호나 이름**과 **바꾸고 싶은 것**을 같이 말하면 됩니다. 예:

- "장면 2(KINETIC TYPE)의 단어를 DESIGN, ANIMATE, DIRECT, DELIVER 대신 기획, 촬영, 편집, 완성으로 바꿔줘"
- "장면 4에서 입자가 만드는 글자를 CLAUDE 대신 내 이름 MINYEOL 로 바꿔줘"
- "장면 6 마지막 이름 카드의 밑줄 색을 코랄 대신 파란색으로 바꿔줘"
- "장면 3을 1초 더 길게 하고, 대신 전체 길이는 15초로 유지해줘"
- "장면 5는 너무 어지러우니 터널 회전 속도를 절반으로 줄여줘"
- "색상표 전체를 파스텔 톤으로 바꿔줘" (모든 장면에 적용 → `src/lib.js`)

다른 장면은 건드리지 않고 해당 파일만 고친 뒤 다시 렌더하면 됩니다.
