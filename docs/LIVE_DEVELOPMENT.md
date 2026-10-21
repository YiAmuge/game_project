# ZIP 없이 브라우저에서 게임 수정·실행하기

## GitHub Codespaces

1. GitHub의 `YiAmuge/game_project`에서 `codex/city-border-v0.2` 브랜치를 선택한다.
2. **Code → Codespaces → Create codespace on this branch**를 누른다. Codespace 생성과 사용은 본인 GitHub 계정에서 진행된다.
3. 설정이 완료되면 **Ports** 탭에서 **5173 / 도시 경계 게임 → Open in Browser**를 누른다.
4. 코드 편집 탭과 게임 탭을 나란히 놓는다. 코드 저장 시 게임 탭이 자동 새로고침된다.

브랜치 이름은 v0.2를 유지하지만 현재 내용은 v0.20.0이다. 기존 Codespace에서는 터미널에서 **`npm run update`**를 실행한다. 현재 브랜치의 변경을 `git pull --ff-only`로 받은 뒤 서버와 게임 파일을 확인한다. Pull이 실패하면 오류를 표시하고 기존 파일로 실행만 확인하며, 로컬 수정을 자동으로 덮어쓰거나 stash·병합하지 않는다. 출력된 현재 Codespace 주소를 열고 게임 탭을 새로고침한다. 새 ZIP을 받을 필요는 없다.

Codespaces 구성은 Node.js 22, 의존성 설치, 자동 저장, 포트 열기를 설정한다. 컨테이너 시작 시와 편집기 연결 시 개발 서버를 확인하고, 이미 실행 중이면 재사용한다. 이 작업에서 실제 Codespace 인스턴스를 생성하지는 않았다. GitHub 계정에서 Codespaces를 사용할 수 있어야 한다.

시작은 `npm start`, 복구는 `npm run repair`, 진단은 `npm run doctor`다. 이전의 `node scripts/codespaces-start.mjs`도 계속 지원한다. `npm start`는 정상 서버를 재사용하고, 종료됐으면 시작하며, 실행 코드가 바뀌었으면 소유권을 확인한 게임 서버만 교체한다. `repair`는 정상 서버도 한 번 재시작한다. 로그는 `/tmp/city-border-dev.log`에 있다. 직접 전경 실행이 필요하면 `npm run dev`를 사용한다.

서버 소유권 기록은 저장소 밖 임시 폴더에 권한 600으로 저장한다. 새 서버는 임의 값의 해시로 기록을 확인하므로 PID가 재사용됐거나 다른 프로그램이 포트를 쓰면 종료하지 않는다. 구버전 서버는 Linux의 실행 파일·작업 경로·실제 소켓 소유권을 모두 확인할 수 있을 때만 교체한다. 프로세스 조회가 제한되어 구버전 소유권을 확인하지 못하면 한 번 Codespace를 **Stop → Start**하여 새 시작 절차를 적용한다. 이후 새 서버는 이 기록으로 복구한다. 서버 중지·파일 삭제·Git 충돌 등 모든 원인을 자동으로 고친다는 뜻은 아니다.

## 껐다 켠 뒤 게임 주소가 404일 때

`…-5173.app.github.dev`는 실행 중인 Codespace의 개발 포트를 연결하는 주소다. 고정된 공개 게임 사이트가 아니며, 주소만 열어서는 중지된 Codespace가 시작되지 않는다. Codespace 중지·삭제, 개발 서버 종료, 포트 연결 해제 또는 다른 GitHub 계정으로 접근할 때 연결되지 않을 수 있다.

1. [GitHub Codespaces](https://github.com/codespaces)에서 기존 `game_project` Codespace를 열고 편집기가 준비될 때까지 기다린다. 해당 Codespace를 사용할 수 있는 GitHub 계정으로 로그인한다.
2. 프로젝트 터미널에서 `npm start`를 실행한다. 버전과 `내부 HTTP 정상, 게임 파일 확인 완료`를 확인한다. 이는 HTML·모듈·데이터·이미지를 개발 서버가 반환한 상태이며, 외부 브라우저 접속 성공을 뜻하지 않는다.
3. **Ports → 5173 → Open in Browser**로 게임을 연다. 5173이 없으면 **Forward a Port → 5173**으로 추가한다. 이전 즐겨찾기보다 여기서 현재 제공되는 주소를 사용한다.

이 저장소는 컨테이너 시작 시 자동 실행도 설정한다. 기존 Codespace에서 새 `.devcontainer/devcontainer.json`을 Pull한 경우, 설정을 적용하려면 명령 팔레트의 **Codespaces: Rebuild Container**를 한 번 실행한다. 당장 게임을 다시 여는 데는 재빌드 없이 위 터미널 명령을 사용하면 된다.

그래도 404라면 `npm run doctor`의 결과를 확인한다. 실제 `CODESPACE_NAME`과 포워딩 도메인으로 현재 주소를 만들며, 로컬 상태와 외부 페이지·진단 주소(`/__dev/health`)를 각각 확인한다. 외부 페이지가 게임 HTML이고 외부 진단 응답의 프로젝트가 로컬과 일치해야 실제 게임 응답으로 판정한다. HTTP `200`만 반환하는 로그인·권한·오류 페이지는 성공이 아니다. `302`는 Private 포트의 로그인 이동일 수 있으며 인증 정보 없이 검사하므로 이동을 따라가지 않는다.

터미널에서 실제 게임 응답이 검증돼도 사용자의 브라우저 경로는 별도다. 같은 브라우저에서 `/__dev/health`도 404라면 다른 기기·모바일 데이터 경로와 비교하고 브라우저의 사이트 데이터·확장 기능·VPN/프록시·네트워크를 좁혀 확인한다. 서버와 게임 파일을 다시 설치하거나 Public 전환·포트 재등록을 반복해서 해결됐다고 판단하지 않는다. Codespaces 자체가 반환하는 404는 게임 코드가 응답하기 전의 문제일 수 있으며, 이 실행 도구로 GitHub 측 연결을 복구할 수는 없다.

Codespace를 꺼도 유지되는 플레이 주소가 필요하면 아래의 GitHub Pages 게시 절차를 사용한다. 포트 공개 설정을 바꾸는 것만으로 중지된 서버가 실행되지는 않는다.

## 저장의 두 단계

- **파일 저장**: Codespace의 파일이 바뀌고 개발 화면에 반영된다. 자동 저장은 800 ms, 새로고침 확인은 1,200 ms 간격이다.
- **GitHub 저장**: 왼쪽 **Source Control**에서 변경 내용을 확인하고 메시지를 입력한 뒤 **Commit → Sync Changes / Push**한다. 다른 기기에서도 받을 수 있는 저장소 기록이 된다.

게임 새로고침은 진행 중인 연습 경기를 초기화한다. 플레이 중 상태를 유지하는 핫 교체는 구현하지 않았다.

## 수정하기 쉬운 위치

| 바꿀 내용 | 파일 |
| --- | --- |
| 공통 규칙·기존 4명·포지션 | `src/data.js` |
| 추가 챔피언의 능력치·사거리·쿨다운 | `src/extra-data.js`, `src/new-data.js` |
| 전투·연속 이동·귀환·자연 치유·장전·캠프·봇 | `src/game.js` |
| 추가 챔피언의 공격·스킬 | `src/skills.js`, `src/new-champions.js`, `src/v06-champions.js`, `src/v08-champions.js`, `src/v10-champions.js` |
| 처치 귀속·선취점·현상금·전투 알림 | `src/combat-events.js` |
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


## 연습장 사용

v0.15.0부터기본메뉴에**연습장으로이동**이있다.챔피언선택후입장하며20분제한없이연습할수있다.게임우측상단의상시**연습장옵션**패널에서환경과챔피언을바꾼다.패널은접기/펼치기를지원하며작은화면입장시접힌상태다.이규칙은일반AI연습전에는적용되지않는다.연습장지형/허수아비/옵션은`src/training.js`,게임의지형선택은`src/geometry.js`와`src/game.js`에있다.브라우저검증은`MOBA_TEST_URL=http://127.0.0.1:5173 python3 tests/training_browser.py`로실행한다.
