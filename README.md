# Shiny Village · 이어지는 마을

학생이 1차산업 직업을 맡아 생산하고, 장터에서 교환·나눔을 하며, 운송·품질·급식 같은 서비스 활동으로 협력하는 진로 체험 게임입니다.

- [공개 체험 모드](https://ieum-village-play-0921.peace-shiny.chatgpt.site/demo.html): 학급 코드 없이 연습 친구와 둘러보기
- [학생 입장](https://ieum-village-play-0921.peace-shiny.chatgpt.site/): 본인 입장 링크 또는 학급 코드·입장 코드 사용
- [교사 운영실](https://ieum-village-play-0921.peace-shiny.chatgpt.site/teacher.html): 학급 운영, 직업 배정, 학생별 QR, 기록 백업·초기화

## 프로젝트 구조

- `dist/`: 학생·교사 화면과 3D/2D 애셋
- `src/`: Cloudflare Worker API와 D1 스키마
- `scripts/build.mjs`: 배포 자산 준비
- `tests/`: 서버·브라우저 검증
- `docs/학교수업-시작안내.md`: 수업 준비와 운영 순서

로컬 실행은 Node.js와 `private/teacher-setup.txt`의 교사 개설키가 필요합니다. `node scripts/build.mjs`로 자산을 준비하고 `node server.mjs`로 시작합니다. 로컬에서는 SQLite, 온라인에서는 Cloudflare D1을 사용합니다.

학생 입장 코드, 교사 개설키, 학생 DB와 초기화 전 기록 백업은 이 저장소에 올리지 않습니다. `.gitignore`가 `private/`, `test-output/`, 배포용 압축 파일과 생성된 빌드 파일을 제외합니다.
