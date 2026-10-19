# ZIP 없이 브라우저에서 게임 수정·실행하기

## GitHub Codespaces

1. GitHub의 `YiAmuge/game_project`에서 `codex/city-border-v0.2` 브랜치를 선택한다.
2. **Code → Codespaces → Create codespace on this branch**를 누른다. Codespace 생성과 사용은 본인 GitHub 계정에서 진행된다.
3. 설정이 완료되면 **Ports** 탭에서 **5173 / 도시 경계 게임 → Open in Browser**를 누른다.
4. 코드 편집 탭과 게임 탭을 나란히 놓는다. 코드 저장 시 게임 탭이 자동 새로고침된다.

브랜치 이름은 v0.2를 유지하지만 현재 내용은 v0.6이다. 기존 Codespace에서는 수정 내용을 Commit한 뒤 **Source Control → Pull**로 업데이트한다. Pull 이후 게임 탭을 새로고침하면 새 메뉴가 나타난다. 새 ZIP을 받을 필요는 없다.

Codespaces 구성은 Node.js 22, 의존성 설치, 자동 저장, 포트 열기를 설정한다. 컨테이너 시작 시와 편집기 연결 시 개발 서버를 확인하고, 이미 실행 중이면 재사용한다. 이 작업에서 실제 Codespace 인스턴스를 생성하지는 않았다. GitHub 계정에서 Codespaces를 사용할 수 있어야 한다.

게임이 시작되지 않으면 터미널에서 `node scripts/codespaces-start.mjs`를 실행한다. 로그는 `/tmp/city-border-dev.log`에 있다. 개발 서버가 종료된 상태라면 `npm run dev`로 직접 시작해도 된다.

## 껐다 켠 뒤 게임 주소가 404일 때

`…-5173.app.github.dev`는 실행 중인 Codespace의 개발 포트를 연결하는 주소다. 고정된 공개 게임 사이트가 아니며, 주소만 열어서는 중지된 Codespace가 시작되지 않는다. Codespace 중지·삭제, 개발 서버 종료, 포트 연결 해제 또는 다른 GitHub 계정으로 접근할 때 연결되지 않을 수 있다.

1. [GitHub Codespaces](https://github.com/codespaces)에서 기존 `game_project` Codespace를 열고 편집기가 준비될 때까지 기다린다. 해당 Codespace를 사용할 수 있는 GitHub 계정으로 로그인한다.
2. 프로젝트 터미널에서 `node scripts/codespaces-start.mjs`를 실행한다. `City Border is running on port 5173`이 나오면 서버가 응답한 상태다. 이미 켜져 있으면 중복 실행하지 않는다.
3. **Ports → 5173 → Open in Browser**로 게임을 연다. 5173이 없으면 **Forward a Port → 5173**으로 추가한다. 이전 즐겨찾기보다 여기서 현재 제공되는 주소를 사용한다.

이 저장소는 컨테이너 시작 시 자동 실행도 설정한다. 기존 Codespace에서 새 `.devcontainer/devcontainer.json`을 Pull한 경우, 설정을 적용하려면 명령 팔레트의 **Codespaces: Rebuild Container**를 한 번 실행한다. 당장 게임을 다시 여는 데는 재빌드 없이 위 터미널 명령을 사용하면 된다.

Codespace를 꺼도 유지되는 플레이 주소가 필요하면 아래의 GitHub Pages 게시 절차를 사용한다. 포트 공개 설정을 바꾸는 것만으로 중지된 서버가 실행되지는 않는다.

## 저장의 두 단계

- **파일 저장**: Codespace의 파일이 바뀌고 개발 화면에 반영된다. 자동 저장은 800 ms, 새로고침 확인은 1,200 ms 간격이다.
- **GitHub 저장**: 왼쪽 **Source Control**에서 변경 내용을 확인하고 메시지를 입력한 뒤 **Commit → Sync Changes / Push**한다. 다른 기기에서도 받을 수 있는 저장소 기록이 된다.

게임 새로고침은 진행 중인 연습 경기를 초기화한다. 플레이 중 상태를 유지하는 핫 교체는 구현하지 않았다.

## 수정하기 쉬운 위치

| 바꿀 내용 | 파일 |
| --- | --- |
| 공통 규칙·기존 4명·포지션 | `src/data.js` |
| 신규 8명·실험 5명의 능력치·사거리·쿨다운 | `src/extra-data.js` |
| 전투·연속 이동·귀환·자연 치유·장전·캠프·봇 | `src/game.js` |
| 신규 8명·실험 5명의 공격·스킬 | `src/skills.js` |
| 카메라 확대 범위 | `src/camera.js` |
| 무기·스킬 이펙트·맵 표현 | `src/render.js` |
| 머리 위 체력·자원·스택·상태 효과·충전 범위 | `src/overlays.js` |
| 조작 키와 UI 연결 | `src/main.js` |
| HUD 배치·전체 화면 화면 구성 | `src/style.css`, `index.html` |
| 캐릭터 스프라이트 | `src/assets/champions.png`, `src/assets/champions-extra.png`, `src/art.js` |
| 도감 데이터 | `src/catalog.js`, `src/roster.json` |

## 누구나 주소로 플레이하게 만들기

GitHub Pages 배포는 GitHub 저장소 설정에서 별도로 활성화해야 한다.

1. 개발 브랜치의 변경을 확인하고 Pull Request로 `main`에 병합한다.
2. 저장소 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택한다.
3. **Actions → Publish browser game → Run workflow**를 실행한다.
4. 작업이 성공한 뒤 **github-pages** 환경 또는 배포 작업이 보여 주는 주소를 연다.

이후 `main`으로 푸시하면 테스트·빌드·게시가 자동 진행된다. Codespaces의 저장 즉시 미리보기와 Pages의 푸시 후 배포는 서로 다른 과정이다. 구성 파일을 저장하거나 브랜치를 올리는 것만으로 사이트 게시 성공을 의미하지 않는다.

현재 준비한 것은 소스·Codespaces 구성·자동 새로고침·Pages 워크플로다. Pages 설정 활성화와 실제 첫 배포 여부는 GitHub 화면에서 확인한다.
