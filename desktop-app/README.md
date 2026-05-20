# 서창 운영관리 앱

Tauri + React + SQLite 기반의 Windows 앱이며, 같은 화면을 웹사이트로도 열 수 있게 데이터 연결층을 분리했습니다.

## 방향

- 앱 입력과 조회는 SQLite에 먼저 저장합니다.
- Google Sheets는 가져오기, 내보내기, 백업, 공유용으로 유지합니다.
- Apps Script는 기존 운영 화면을 당장 버리지 않고 동기화 통로로 재사용합니다.
- 웹사이트로 열 때는 기본적으로 브라우저 로컬 저장소를 사용하고, 서버 주소를 지정하면 Web API를 기준 DB로 사용합니다.

## 첫 실행 준비

현재 PC에는 Tauri 실행에 필요한 Rust/Cargo와 Microsoft C++ Build Tools를 잡아두었습니다.
기본 Node.js v25에서는 Vite 빌드가 불안정해서, `npm run build`는 프로젝트 스크립트가 안정 Node 런타임을 자동 선택하도록 구성했습니다.

```powershell
cd desktop-app
npm install
npm run tauri:dev
```

## Windows 빌드

```powershell
cd desktop-app
npm run build
npm run tauri -- build --debug
```

`npm run build`는 RHWP 표 경계 가드를 먼저 확인합니다. 이 가드는 운영일지 표가 드래그, 방향키 이동, 표 크기 조절 중에도 편집용지 여백 밖으로 나가지 않게 막는 안전장치입니다. RHWP 라이브러리나 내장 번들을 갱신했다면 먼저 아래 명령으로 가드가 살아 있는지 확인하세요.

```powershell
cd desktop-app
npm run rhwp:guard
```

생성 위치:

- 실행 파일: `src-tauri/target/debug/seochang_operations_desktop.exe`
- 설치 파일: `src-tauri/target/debug/bundle/msi/서창 운영관리_0.1.0_x64_ko-KR.msi`

## 웹사이트로 열기

개발 중에는 아래처럼 브라우저에서 바로 확인할 수 있습니다.

```powershell
cd desktop-app
npm run dev
```

주소:

- `http://127.0.0.1:1420`

웹 API 서버를 붙일 때는 환경변수 `VITE_SEOCHANG_API_URL`에 서버 주소를 넣습니다. 이 값이 있으면 화면은 같은데 데이터 저장/조회만 서버 API로 이동합니다.

필요한 API 모양:

- `GET /api/dashboard-snapshot`
- `GET /api/journal-templates`
- `POST /api/import`
- `POST /api/journal-templates`
- `POST /api/generated-journals`
- `POST /api/journals`
- `POST /api/children`
- `POST /api/child-attendance`
- `DELETE /api/child-attendance?childId=...&date=...`
- `POST /api/children/dedupe`

## 데이터 구조

- `people`: 종사자/비종사자 기본정보
- `attendance`: 사람별 날짜 출결
- `journals`: 운영일지 날짜별 집계
- `sync_jobs`: Google Sheets 반영 대기 큐

## 다음 구현 순서

1. 기존 스프레드시트에서 종사자/비종사자/운영일지를 가져오기
2. 출결 수정 저장을 SQLite에 즉시 반영
3. 미동기화 데이터를 Apps Script Web App으로 전송
4. 운영일지 HTML 미리보기와 템플릿 편집기 이식
