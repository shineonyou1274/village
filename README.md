# Shiny Village · 이어지는 마을

학생이 농사와 1차산업 직업을 경험하고 장터에서 교환·나눔을 하며, 운송·전력·품질·급식 같은 서비스 활동으로 협력하는 진로 체험 웹 게임입니다.

- 학생: https://ieum-village-play-0921.peace-shiny.chatgpt.site/
- 체험: https://ieum-village-play-0921.peace-shiny.chatgpt.site/demo.html
- 교사: https://ieum-village-play-0921.peace-shiny.chatgpt.site/teacher.html

## 제출 소스 구성

이 ZIP은 프론트엔드뿐 아니라 서버 API와 DB 스키마를 포함합니다. 실사용 학생 기록·비밀키·로그인 코드는 포함하지 않습니다.

| 경로 | 내용 |
| --- | --- |
| dist/ | HTML, CSS, JS, 3D/2D 모델·텍스처, 로컬 라이브러리 |
| src/api.mjs | 상태 조회, 학급 생성·입장, 장터·농사·교사 API |
| src/plaza.mjs | 광장 동시 접속·이동·인사 |
| src/campus.mjs | 도서관 좌석·집중 기록·학급 연결 |
| src/schema.mjs | DB 스키마와 초기 테이블 생성 |
| server.mjs | 독립 실행 Node HTTP 서버, SQLite 어댑터 |
| scripts/build.mjs | Cloudflare Worker와 정적 자산 빌드 |
| tests/ | API·단위·UI 회귀 검증 |
| docs/ | 수업 안내·설계·검증 자료 |

## 필요한 환경과 로컬 실행

1. Node.js **22.16 이상**(node:sqlite 지원) 또는 Node.js 24 LTS, Git을 준비합니다. 최신 웨일·크롬·엣지처럼 ES modules, WebGL, Canvas를 지원하는 브라우저가 필요합니다.
2. ZIP을 풀고 프로젝트 폴더에서 실행합니다. **앱 실행용 npm 외부 패키지 설치는 필요 없습니다.**

```sh
node server.mjs
```

3. http://127.0.0.1:8787/ 을 엽니다. 로컬 교사 화면은 http://127.0.0.1:8787/teacher.html 입니다. 도서관은 /campus 또는 /campus.html 입니다.
4. 처음 실행하면 `private/teacher-setup.txt`에 **이 로컬 서버 전용 개설키**가 자동 생성됩니다. 파일을 본인 PC에서 열어 교사 운영실 → 새 학급 만들기에 입력합니다. 학생 수·직업 배정 방식을 고르고 학급을 만듭니다. 생성된 교사 코드는 따로 보관하고 학생별 코드를 배부합니다. 기존 교사로 로그인한 뒤에는 운영실의 새 학급 만들기에서 별도 개설키 없이 독립 학급을 추가할 수 있습니다. 기존 학급 기록과 설정은 바뀌지 않으며 새 학급의 코드는 자동 발급됩니다.
5. 기본 DB는 `private/classroom.sqlite`이며 재시작해도 기록이 유지됩니다. 서버를 종료한 뒤 SQLite 파일과 관련 WAL 파일을 백업하세요. 이 파일과 개설키는 제출·공개 저장소에 넣지 않습니다.

선택 환경변수:

| 변수 | 기본값·용도 |
| --- | --- |
| PORT | 8787 |
| HOST | 127.0.0.1; 별도 기기 접근 테스트 시 신뢰할 수 있는 네트워크에서 지정 |
| DB_FILE | private/classroom.sqlite; 별도 테스트 DB 절대경로 또는 상대경로 |
| TEACHER_SETUP_KEY | 생략 시 private/teacher-setup.txt 사용; 서버에서만 설정 |

다른 기기에서 접속하는 공개 운영은 HTTPS가 필요합니다. 일반 LAN HTTP에서는 클립보드, crypto 등 보안 컨텍스트 전용 기능이 제한될 수 있습니다. 제출 ZIP으로 인터넷 없이 로컬 API·농장·장터·도서관을 실행할 수 있으나, 외부 교육자료 링크는 인터넷이 필요합니다. 여러 학생 동시 접속은 같은 서버 주소를 사용해야 합니다.

## 주요 서버 API

`/api/create`, `/api/join`, `/api/trial`, `/api/state`, `/api/action`, `/api/plaza`, `/api/market-presence`, `/api/teacher`, `/api/teacher/entry-links`, `/api/campus` 등을 `src/`가 직접 처리합니다. 교사·학생 토큰 검증과 재고 확인·거래 저장은 서버 책임입니다. 스키마는 첫 API 요청에서 준비됩니다. 정적 파일만 여는 file:// 또는 GitHub Pages만으로는 실제 학급·저장·교환이 동작하지 않습니다.

## ChatGPT Sites 외부 실행과 배포 의존성

**핵심 게임 기능에 ChatGPT 계정 또는 Sites SDK 런타임은 필요하지 않습니다.** Node 서버와 SQLite 어댑터를 포함하므로 Sites 밖에서 실행 가능합니다. 공개 사이트의 기존 D1 데이터·계정·입장 코드가 ZIP으로 복제되지는 않으며 로컬에서 새 학급을 생성해야 합니다.

온라인 Sites 배포는 `.openai/hosting.json`의 기존 프로젝트 식별자와 Cloudflare D1 `DB` 바인딩, 서버 비밀 `TEACHER_SETUP_KEY`를 사용합니다. 다른 Cloudflare 환경으로 이전하려면 본인 D1 DB와 동일 바인딩을 만들고 Worker·정적 자산을 구성해야 합니다. 기존 프로젝트 ID만 복사해도 배포 권한이나 DB가 넘어오지 않습니다. Sites의 배포·버전 관리, 기존 URL, Git 인증은 서비스 전용이지만 게임 로직과 분리되어 있습니다.

Cloudflare용 빌드는 Git 체크아웃에서 `node scripts/build.mjs`로 실행합니다(버전 SHA를 읽으므로 Git 메타데이터가 필요). 제출 ZIP에는 .git이 없으므로 빌드가 필요하면 `git init`, `git add .`, `git commit -m "Import submission"`으로 먼저 본인 저장소를 만드세요. **로컬 앱 실행에는 빌드와 Git이 필요하지 않습니다.**

## 외부 의존성과 애셋

- Node.js 내장 http/fs/path/crypto/sqlite API, 브라우저 기본 API.
- Three.js 및 GLTFLoader: `dist/vendor/`에 동봉(MIT, `THREE-LICENSE.txt`). 외부 CDN에 의존하지 않습니다.
- QR Code Generator: `dist/vendor/qrcode.mjs` 동봉(MIT, `QR-LICENSE.txt`). QR 이미지·학생 코드를 외부 QR 서비스로 전송하지 않습니다.
- 게임 애셋: `dist/assets/`, PNG 파일과 관련 안내 문서·애셋 메타데이터 포함. 애셋 출처·권리 정보는 각 폴더의 문서를 확인하세요. 자체/AI 생성 그림과 캐릭터가 포함되며 제3자 애셋은 해당 고지를 보존합니다.
- 일부 UI 테스트는 Playwright가 필요합니다. 기본 실행에는 필요 없으며 브라우저 테스트 환경에서 별도 설치합니다.
- 외부 교육자료 페이지는 링크 이동만 하며, 웨일 스페이스 로그인·명부 API와 직접 연동하지 않습니다.

## 웨일 스페이스에서 수업하기

교사 운영실 → 학생별 입장 링크·QR 보기에서 **학생별 입장 링크 일괄 복사**, 전체 링크 CSV, 반 전체 공통 링크·QR을 사용할 수 있습니다. 공통 링크는 학급 코드만 미리 채웁니다. 본인 입장 코드는 여전히 필요하며, 학생별 전용 링크는 본인 확인을 대신합니다. 개별 링크 일괄 목록은 교사 전용 게시물에 보관하고 각 학생에게 자기 링크만 전달하세요. 공개 게시판에 전체 목록을 게시하면 서로의 계정에 들어갈 수 있습니다.

공통 링크는 웨일북 수업관리로 전송하거나 웨일 클래스 게시판에 올리고, 학생별 링크는 비공개 전달에 사용합니다. **결과 이미지 저장 · 팀보드용** 버튼으로 협력 이야기/공동 도시락의 학급 집계 PNG를 내려받아 팀보드에 첨부합니다. 개인 이름·입장 코드·비공개 성찰은 이미지에 포함하지 않습니다. 이는 링크·이미지 기반 연계이며 웨일 스페이스 API, SSO, 팀보드 자동 업로드 구현은 아닙니다.

## 문항 편집 지원 여부

현재 교사 운영실에서 진로 책장 퀴즈·협력 미션의 문제/보기/정답을 직접 바꾸는 편집기는 없습니다. 문항은 src/growth-data.mjs, src/career-data.mjs, src/mission.mjs 및 해당 프론트 데이터에 코드로 정의되어 있습니다. 변경 시 서버 정답 검증과 프론트 문항을 함께 수정·검증·배포해야 합니다. 이번 제출 범위에는 문항 편집기를 추가하지 않았습니다.

## 검증

```sh
node tests/campus-unit.mjs
node tests/study-refresh-unit.mjs
node tests/contest-sharing-unit.mjs
```

API 통합/부하 검증은 `tests/api-test.mjs` 안내대로 **별도 test-output SQLite DB와 localhost**로만 실행하세요. 심사용 학급이나 운영 DB에 테스트를 돌리지 않습니다. 웨일 실제 브라우저 확인 결과와 한계는 docs/NWEC26-제출검증.md에 기록합니다.

## 심사 기간 운영

**2026-10-19~2026-10-26에는 배포하지 않습니다.** 같은 URL을 유지하고 테스트 학급과 기존 학급을 초기화하지 않습니다. 심사용 코드·학생 4명 계정은 공개 ZIP/Git과 분리하여 교사에게 전달합니다. 심사 종료 전 변경은 로컬에만 보관합니다. 호스팅 장애·외부 서비스 장애에 대한 가동 보증과 배포 동결은 서로 다릅니다.
