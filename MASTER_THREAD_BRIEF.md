# 새 스레드 마스터 브리프

이 문서는 서창 운영관리 시스템 프로젝트의 새 스레드를 시작할 때 사용하는 고정 브리프입니다.

목표는 두 가지입니다.

1. 새 스레드에서도 프로젝트 핵심 맥락이 빠지지 않게 한다.
2. 한 스레드 안에서 전체 기능 범위를 먼저 선언하고, 우선순위대로 끝까지 밀고 가게 한다.

이 문서는 `PROJECT_MEMORY.md`를 대체하지 않습니다.  
새 스레드에서는 항상 아래 순서로 읽습니다.

1. `PROJECT_MEMORY.md`
2. `AGENTS.md`
3. `MASTER_THREAD_BRIEF.md`

---

## 1. 프로젝트 개요

- 프로젝트명: 서창 운영관리 시스템
- 저장소: `https://github.com/kingwabg/sc01.git`
- 앱 루트: `desktop-app`
- 현재 운영 구조:
  - 기존 시스템: Google Sheets + Apps Script
  - 신규 시스템: Tauri + React + SQLite 데스크톱/웹 앱
- 방향:
  - SQLite를 빠른 로컬 운영 저장소로 사용
  - Google Sheets는 가져오기/내보내기/백업/검토용으로 사용
  - Apps Script Web App은 필요한 경우 동기화 채널로 사용

## 2. 고정 연결 정보

- Spreadsheet ID: `1iy5O6Qen4EKW30EqYvTbzZNkmA5SL-ZdZgUh5mu5Wx4`
- Apps Script Project ID: `1dqZp9bn1j8egPyYD-9w91OBWXdgZPL6bYtjwvqo-YW2Ze3kY73K4M1kQ`
- clasp 계정: `seochang23.1@gmail.com`
- GitHub: `https://github.com/kingwabg/sc01.git`

## 3. 시작 규칙

- 작업 전 `PROJECT_MEMORY.md`와 `AGENTS.md`를 먼저 읽는다.
- 필요한 경우 `desktop-app/scripts/bootstrap-check.ps1`를 먼저 실행한다.
- RHWP 표 기능은 오래 걸린 핵심 작업이므로 보수적으로 다룬다.
- RHWP 표 관련 수정 시 `desktop-app/docs/rhwp-table-feature-check.md`를 반드시 갱신한다.
- 작업 완료 시 관련 파일만 커밋하고 GitHub에 push 한다.
- 불필요한 RHWP 빌드 산출물과 대용량 결과물은 건드리지 않는다.
- 기존 사용자 변경사항은 되돌리지 않는다.

## 4. 현재 구조

- 루트의 `*.js`, `*.html` 파일들은 Apps Script 소스다.
- 프론트엔드 앱은 `desktop-app` 아래에 있다.
- RHWP 원본 경로: `desktop-app/vendor/rhwp/rhwp-studio`
- RHWP 빌드 결과 경로: `desktop-app/public/rhwp-studio`
- Semble 로컬 검색 래퍼:
  - 설치: `desktop-app/scripts/install-semble.ps1`
  - 실행: `desktop-app/scripts/semble.ps1`
- Semble Codex MCP 연결:
  - 설치: `desktop-app/scripts/install-semble-codex-mcp.ps1`

## 5. 현재까지 반영된 핵심 상태

- 앱 구조 1차 분리 완료
- `App.tsx`는 예전보다 많이 가벼워진 상태
- 종사자/비종사자/아동/가져오기/내보내기/프로그램 일지 화면 분리 완료
- 아동 목록은 데이터 테이블 유지
- 아동 목록 행 클릭 시 상세 화면으로 전환
- 아동 상세는 연도별 저장 가능
- Semble 저장소 로컬 검색 워크플로우 추가 완료
- Semble Codex MCP 연결 준비 완료

## 6. 이번 이후 스레드에서 항상 다루는 전체 기능 범위

새 스레드는 이 전체 범위를 먼저 인지한 뒤 시작한다.

- 구조 재정리
- 실제 UI 품질 개선
- 데이터 저장 안정화
- RHWP / 템플릿 기능 개선
- Apps Script / Sheets 연동 정리
- 공통 UI 시스템 정리
- 아동 / 인력 / 운영일지 / 프로그램 흐름 완성

중요:

- 한 스레드 안에서 전체 범위를 먼저 선언한다.
- 실제 구현은 우선순위대로 진행한다.
- 한 번에 전부 뒤엎지 말고, 각 단계가 동작 가능한 상태로 남도록 작업한다.

## 7. 권장 우선순위

1. 데이터 구조와 저장 안정화
2. 아동 상세 / 출결 / 연도 스냅샷 흐름 완성
3. 운영일지 / 프로그램 계획 / 일지 / 평가 연결
4. RHWP / 템플릿 연결
5. UI 공통화와 디자인 품질 정리
6. 외부 연동 정리

## 8. 충돌 주의 파일

병렬 작업 시 아래 파일은 충돌 가능성이 높다.

- `desktop-app/src/App.tsx`
- `desktop-app/src/styles.css`
- RHWP 빌드 번들 및 공개 결과물
- 루트 Apps Script 핵심 파일들
- `PROJECT_MEMORY.md`
- `AGENTS.md`
- `desktop-app/docs/rhwp-table-feature-check.md`

## 9. 완료 조건

완료로 보려면 아래를 만족해야 한다.

- 기능이 실제 화면에서 동작한다.
- 저장/불러오기 흐름이 검증된다.
- 필요한 경우 브라우저 검증까지 완료한다.
- 빌드가 통과한다.
- 관련 파일만 커밋하고 push 한다.
- RHWP 관련 작업이면 표 기능 검증과 점검 문서 갱신까지 끝낸다.

## 10. 검증 기준

- `npm run build` 통과
- 브라우저 주요 화면 동작 확인
- 콘솔 오류 없음
- 저장 후 재진입 시 데이터 유지 확인
- RHWP 관련 작업이면 표 기능 검증 및 점검 문서 기록 확인

## 11. 최근 중요 커밋

- `8dddf99` RHWP 표 범위 선택
- `ddc1e6a` 프로젝트 기억 문서 추가
- `63ed005` Codex Semble MCP installer 추가

## 12. 새 스레드 시작용 프롬프트 템플릿

아래 템플릿을 새 스레드 첫 메시지에 그대로 붙여넣고, `이번 스레드 즉시 목표`만 채워서 시작합니다.

```markdown
PROJECT_MEMORY.md와 AGENTS.md와 MASTER_THREAD_BRIEF.md를 먼저 읽고 이어서 작업해줘.

## 프로젝트
- 서창 운영관리 시스템
- Google Sheets + Apps Script 기존 시스템과 Tauri + React + SQLite 데스크톱/웹 앱을 함께 운영 중

## 이번 스레드 즉시 목표
- [ ] 목표 1
- [ ] 목표 2
- [ ] 목표 3

## 작업 원칙
- 전체 기능 범위를 먼저 인지한 뒤 우선순위대로 진행
- 구조, UI, 데이터 저장, RHWP/템플릿까지 연결 관점 유지
- 작업 완료 시 관련 파일만 커밋하고 GitHub에 push
- RHWP 표 수정 시 `desktop-app/docs/rhwp-table-feature-check.md` 갱신

## 검증
- 빌드 통과
- 브라우저 동작 확인
- 저장/불러오기 확인
- 콘솔 오류 없음

## 시작 지시
- 현재 코드베이스를 다시 점검하고
- 가장 위험한 병목부터 해결하며
- 끝나면 다음 작업이 있으면 바로 제안해줘.
```

## 13. 스레드 운영 메모

- 새 스레드의 목적은 "기억 리셋"이지 "처음부터 다시 시작"이 아니다.
- 새 스레드에서는 이미 끝난 구조 분리나 검증을 다시 반복하지 말고, 현재 상태를 이어서 사용한다.
- 한 단계가 끝나면 다음 단계 제안까지 이어서 한다.
