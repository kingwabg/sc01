# Bootstrap Check

새 스레드에서 바로 작업을 시작하기 전에 이 문서를 보고 프로젝트 상태를 먼저 확인합니다.

## 빠른 점검

저장소 루트에서 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\desktop-app\scripts\bootstrap-check.ps1
```

확인하는 내용:

- `PROJECT_MEMORY.md`, `AGENTS.md` 존재 여부
- Apps Script 연결 파일 존재 여부
- RHWP vendor 원본 체크아웃 존재 여부
- public RHWP가 실제로 불러오는 활성 JS/CSS 번들
- RHWP 표 핵심 표식 존재 여부
- stale RHWP asset 목록
- `node_modules` 설치 여부
- 개발 서버 `http://127.0.0.1:1420` 응답 여부

## 빌드까지 확인

시간이 조금 더 걸려도 전체 빌드 가능 여부까지 확인하려면 `-Build`를 붙입니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\desktop-app\scripts\bootstrap-check.ps1 -Build
```

`-Build`가 실패하면 그 자체가 중요한 진단 결과입니다. 특히 RHWP 가드에서 실패하면 `desktop-app/public/rhwp-studio/index.html`이 실제로 불러오는 활성 번들과 `desktop-app/scripts/check-rhwp-boundary-guard.mjs`의 기준이 맞는지 먼저 확인합니다.

## 결과 해석

- `OK`: 바로 진행해도 되는 상태입니다.
- `WARN`: 작업은 가능하지만 주의가 필요합니다. 예를 들어 dev server가 꺼져 있거나 RHWP vendor 원본이 로컬에 없을 수 있습니다.
- `FAIL`: 이 상태에서는 해당 영역 작업을 바로 진행하면 안 됩니다.

## 새 스레드 첫 순서

1. `PROJECT_MEMORY.md`와 `AGENTS.md`를 읽습니다.
2. 빠른 점검 스크립트를 실행합니다.
3. RHWP 표 기능을 만질 때는 `desktop-app/docs/rhwp-table-feature-check.md`도 읽습니다.
4. RHWP 또는 앱 빌드가 중요한 작업이면 `-Build` 점검을 실행합니다.
