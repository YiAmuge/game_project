# 도시 경계 — 4vs4 MOBA

Project Moon 작품을 모티브로 한 비공식 팬 게임 개발 프로젝트입니다. 첨부된 기획서 2종을 기준으로 개발합니다. 공식 게임·공식 서비스가 아닙니다.

기획 원문과 31명 챔피언 명세는 `docs/sources/`와 `src/roster.json`에 보존했습니다. 구현 범위와 임시 결정을 [개발 명세](docs/PROTOTYPE.md)에서 구분합니다.

## 브라우저에서 직접 개발하기 — ZIP 불필요

GitHub에서 `codex/city-border-v0.2` 브랜치를 선택하고 **Code → Codespaces → Create codespace on this branch**를 누르세요. 브라우저 VS Code가 열리면 의존성을 설치하고 포트 **5173**의 게임을 자동 실행하도록 구성했습니다. **Ports** 탭에서 5173의 **Open in Browser**로 게임을 엽니다.

- `src/data.js`: 능력치·맵 오브젝트·밸런스 수치
- `src/game.js`: 전투 규칙·스킬·봇
- `src/render.js`, `src/art.js`: 외형·무기·이펙트
- `src/style.css`, `index.html`: 화면과 HUD

파일은 약 0.8초 후 자동 저장됩니다. 저장하면 열린 게임 화면이 약 1.2초 안에 자동 새로고침됩니다. 새로고침 시 진행 중이던 연습 경기는 초기화됩니다. **Codespaces에 저장한 파일을 GitHub에도 보관하려면 Source Control에서 Commit 후 Sync Changes(또는 Push)**를 해야 합니다.

자세한 단계와 온라인 배포 방법은 [브라우저 개발 안내](docs/LIVE_DEVELOPMENT.md)에 있습니다. `.devcontainer/devcontainer.json`은 환경과 포트, `.github/workflows/pages.yml`은 배포 절차를 정의합니다. 구성 파일을 추가했다고 Codespace가 이미 생성되거나 사이트가 게시된 것은 아닙니다.

## 온라인 플레이 주소 만들기

개발 브랜치를 `main`에 병합한 뒤 저장소 **Settings → Pages → Source: GitHub Actions**를 선택하세요. **Actions → Publish browser game → Run workflow**로 첫 배포를 실행합니다. 이후에는 `main`으로 푸시할 때 검사·빌드·Pages 배포가 자동 실행됩니다. 실제 주소는 배포 작업 결과에 표시됩니다.

## 현재 클라우드 / 로컬 개발 서버

Node.js 22 이상에서 다음을 실행합니다.

```bash
cd /workspace/game_project
npm run dev
```

기본 포트는 **5173**이며 `PORT=8080 npm run dev`로 변경할 수 있습니다. 개발 서버 자체에는 설치할 외부 런타임 패키지가 없습니다. 소스 저장을 감지해 브라우저를 새로고침합니다. Codespaces 연결 시 실행하는 `node scripts/codespaces-start.mjs`는 이미 실행 중인 게임 서버를 재사용합니다.

## 웹 배포 빌드

```bash
npm ci
npm run build
```

빌드용 esbuild 버전은 잠금 파일에 고정했습니다. `dist/index.html`은 웹 배포 진입점이고 `dist/city-border.html`은 같은 내용의 단일 파일입니다. 스프라이트·코드·스타일·챔피언 데이터가 내장되어 서버 외부의 파일 요청이 없습니다. ZIP을 다운로드하지 않고 배포된 페이지에 접속할 수 있습니다.

## 플레이

- 파우스트·이상·싱클레어·뫼르소 중 선택, 플레이어 1명 + 봇 7명으로 경기.
- WASD 이동, 마우스 조준, 왼쪽 클릭을 누르고 있으면 연속 공격. 자동 조준은 보류 중입니다.
- 마우스 우클릭 전술기, Space 궁극기, 1 회복 물약, B 상점, Esc 일시정지, F 전체 화면.
- 좌측 본진 뒤 부활소에서 회복·강화 구매. 두 적 포탑을 파괴한 뒤 본진 공략.
- 30초 웨이브, 3번째 웨이브마다 공성 미니언, 5분 중앙 보스, 10분 목표물 판정.
- 상단 1× 버튼으로 1/2/4배속 선택. 기록실에서는 31명 전체 원안을 검색할 수 있습니다.

PC 키보드·마우스 기준입니다. 작은 화면의 레이아웃은 대응하지만 터치 이동 조작은 구현하지 않았습니다. 네 챔피언은 기본 수감자 특징을 반영한 팬 아트 스프라이트를 사용하며, 무기는 커서 방향으로 회전합니다. 사운드는 없습니다.

## 검증

```bash
npm run check
npm test
```

규칙 및 통합 테스트 **34개**가 통과했습니다. 네 챔피언 선택 각각에 대해 10분까지 실제 시뮬레이션을 실행하여 유효한 종료 결과와 상태값을 검사합니다. 전체 테스트에는 약 40초가 걸릴 수 있습니다.

개발 서버 실행 중 선택적 브라우저 테스트:

```bash
python3 tests/browser_smoke.py
```

이 테스트만 Python Playwright 및 Chromium이 필요합니다. 현재 클라우드 환경에는 설치되어 있습니다. 다른 환경에서는 `CHROMIUM_PATH` 및 `MOBA_TEST_URL`로 실행 파일과 서버 주소를 지정할 수 있습니다. UI 시나리오 16종을 확인했으며 JavaScript 페이지 오류는 없었습니다. 스크린샷은 Git에서 제외한 `artifacts/`에 저장됩니다. `?debug=1`은 테스트용 시뮬레이션 접근을 활성화합니다.

단일 HTML의 미리보기 호환성 검증은 빌드 후 `python3 tests/standalone_smoke.py`로 실행합니다. 서버 없이, 외부 요청을 차단한 별도 출처의 sandbox iframe에서 화면·전투·기록실을 검증합니다. JavaScript를 허용하지 않는 iframe에서는 실행 안내가 표시되는지도 확인합니다. 실제 ChatGPT 미리보기 플랫폼의 복구 여부까지 검사하는 테스트는 아닙니다.

부쉬는 스케치의 초록색 연결부에 배치했습니다. 원거리 적에게 은닉되며 2.5 거리 근접 탐지, 공격/스킬 사용·피격 시 1.25초 노출됩니다. 시야 규칙은 원안 미정 부분의 테스트용 제안입니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `src/game.js` | 렌더링과 분리된 30 Hz 전투·경제·AI 시뮬레이션 |
| `src/data.js` | 플레이 가능한 4명, 밸런스 상수, 임시 맵 좌표 |
| `src/geometry.js` | 벽 충돌, 시선 판정, 봇 경로 탐색 |
| `src/render.js` | 플레이어 추적 시점, 무기·부쉬·이펙트 렌더링 |
| `src/camera.js` | 확대·좌표 변환·플레이어 중심 카메라 |
| `src/assets/champions.png` | 투명 배경 4인 팬 아트 아틀라스 |
| `src/main.js` | 입력, HUD, 로비, 상점, 기록실 |
| `src/roster.json` | 31명 전체 기획 데이터; 실제 플레이 구현과 구분 |
| `scripts/build.mjs` | 모듈·스타일·기록을 단일 HTML로 패키징 |
| `dist/city-border.html` | 다운로드용 실행 파일 (`npm run build`로 재생성) |
| `docs/PROTOTYPE.md` | 설계 출처·충돌·구현 차이·다음 단계 |

현재는 로컬 프로토타입입니다. 온라인 8인 대전, 나머지 27명, 특성, 물약 외 소모품은 아직 구현되지 않았습니다. 밸런스 목표치는 플레이테스트로 검증해야 합니다.
