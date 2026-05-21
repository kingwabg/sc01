# Frontend Architecture Plan

이 문서는 서창 운영관리 프론트엔드를 실제 서비스 수준으로 키우기 위한 구조 개선 계획이다.

현재 앱은 Tauri + React + Vite + TypeScript 기반이다. 사용자가 원하는 장기 목표인 Next.js + Tailwind CSS 구조는 별도 웹 앱으로 확장하거나, 현재 앱의 화면/도메인 구조를 먼저 정리한 뒤 점진적으로 이관하는 방식이 안전하다.

## 현재 구조 진단

### 잘 되어 있는 점

- `dataProvider.ts`가 로컬 SQLite, 브라우저 로컬, Web API 모드를 추상화하고 있어 장기적인 웹/데스크톱 병행 운영에 유리하다.
- `types.ts`에 주요 운영 도메인 타입이 모여 있어 타입 기반 리팩토링을 시작하기 좋다.
- `localDatabase.ts`, `sheetSync.ts`, `journalTemplates.ts`, `hwpxExport.ts`처럼 데이터/문서 처리 로직이 일부 분리되어 있다.
- Vite 개발 서버와 Tauri 데스크톱 앱이 같은 React 화면을 공유한다.

### 주요 문제

- `src/App.tsx`가 약 4,000줄 규모로, 라우팅, 레이아웃, 화면, 상태, 표/문서 편집, 통계 계산, 아이콘까지 한 파일에 모여 있다.
- `src/styles.css`가 약 4,900줄 규모로, 디자인 토큰, 레이아웃, 컴포넌트 스타일, 화면별 예외가 한 파일에 섞여 있다.
- 화면 단위 경계가 약하다. 예를 들어 운영일지, 템플릿, 아동 출결, 통계, 프로그램 화면이 모두 `App.tsx` 안에서 직접 관리된다.
- 재사용 가능한 UI 컴포넌트 체계가 없다. 버튼, 패널, 테이블, 필터, 모달, 탭, 사이드바가 명확한 공통 API 없이 화면마다 흩어져 있다.
- 상태관리 기준이 없다. 전역 앱 상태, 화면 상태, 폼 상태, 서버/로컬 데이터 상태가 같은 컴포넌트 계층에서 섞인다.
- 모바일/PC 대응은 일부 들어가 있지만, 레이아웃 규칙과 컴포넌트 단위 반응형 기준이 문서화되어 있지 않다.
- 다크모드로 확장 가능한 색상 토큰 구조가 아직 분리되어 있지 않다.

## 목표 구조

현재 Tauri/Vite 앱을 유지하면서도 Next.js로 옮기기 쉬운 형태로 먼저 정리한다.

```text
desktop-app/src
  app/
    App.tsx
    routes.ts
    navigation.ts
    providers/
  shared/
    ui/
      Button.tsx
      Card.tsx
      DataTable.tsx
      Dialog.tsx
      EmptyState.tsx
      Field.tsx
      Tabs.tsx
    hooks/
      useMediaQuery.ts
      usePersistentState.ts
      useResizablePane.ts
    lib/
      date.ts
      format.ts
      sorting.ts
      storage.ts
    styles/
      tokens.css
      base.css
      layout.css
      components.css
  entities/
    person/
    child/
    journal/
    program/
  features/
    dashboard/
    import/
    journal-create/
    journal-edit/
    journal-template/
    child-attendance/
    statistics/
    program-plans/
  data/
    providers/
    local/
    api/
  types/
    domain.ts
```

Next.js로 새 웹 앱을 만들 경우 같은 개념을 다음처럼 대응한다.

```text
web-app/src
  app/
    (dashboard)/
    api/
    layout.tsx
    page.tsx
  shared/
  entities/
  features/
  services/
  styles/
```

## 리팩토링 원칙

- 한 번에 큰 이동을 하지 않는다. 화면 단위로 “추출 → 빌드 → 브라우저 확인 → 커밋” 순서로 진행한다.
- 현재 동작을 바꾸지 않는 구조 이동을 먼저 한다.
- 공통 UI는 실제로 두 번 이상 쓰이는 패턴부터 만든다.
- 데이터 저장 로직과 화면 상태를 분리한다.
- RHWP 관련 변경은 별도 작업으로 분리하고, 표 기능 변경 시 `desktop-app/docs/rhwp-table-feature-check.md`를 갱신한다.
- Next.js/Tailwind 전환은 현재 앱 구조가 기능 단위로 정리된 뒤 별도 앱 또는 별도 패키지로 진행한다.

## 단계별 실행 계획

### 1단계: 앱 뼈대 분리

목표: `App.tsx`가 모든 것을 직접 품지 않도록 한다.

- `ViewKey`, `menuGroups`, `flatMenu`를 `src/app/navigation.ts`로 이동
- `useMediaQuery`를 `src/shared/hooks/useMediaQuery.ts`로 이동
- `ViewErrorBoundary`를 `src/shared/ui/ViewErrorBoundary.tsx`로 이동
- `StatCard` 같은 작은 공통 UI를 `src/shared/ui`로 이동

완료 기준:
- 화면 변화 없음
- `npm run build` 통과
- 브라우저에서 기본 대시보드와 템플릿 만들기 화면 정상 표시

### 2단계: 공통 UI 체계화

목표: SaaS 관리자 화면의 기본 부품을 통일한다.

- `Button`, `Panel`, `Toolbar`, `DataTable`, `FilterBar`, `Modal`, `Tabs`, `StatusBadge` 작성
- 기존 CSS 클래스는 유지하되 컴포넌트 API를 먼저 안정화
- 나중에 Tailwind로 옮기기 쉬운 prop 구조 유지

완료 기준:
- 화면별 버튼/패널/테이블 스타일 차이 감소
- 새 화면 추가 시 공통 컴포넌트 조합으로 시작 가능

### 3단계: 화면 단위 분리

목표: 기능별 폴더를 만든다.

우선순위:
- `features/dashboard`
- `features/journal-template`
- `features/journal-edit`
- `features/child-attendance`
- `features/statistics`
- `features/program-plans`

각 feature 폴더 기본 구조:

```text
features/journal-template/
  JournalTemplatePage.tsx
  components/
  hooks/
  model/
  utils/
```

완료 기준:
- `App.tsx`는 라우팅과 앱 셸 중심으로 축소
- 각 화면은 자기 폴더 안에서 이해 가능

### 4단계: 상태관리 패턴 정리

목표: 상태의 위치를 명확히 한다.

- 앱 공통 상태: 현재 화면, snapshot, provider status
- 서버/로컬 데이터 상태: dataProvider + 화면별 loader hook
- 화면 UI 상태: 각 feature 내부 hook
- 폼 상태: 화면 내부 또는 전용 form hook

추천 패턴:
- 현재는 추가 라이브러리 없이 React hooks로 유지
- 데이터 요청 중복이 커지면 TanStack Query 도입 검토
- 복잡한 전역 UI 상태가 늘면 Zustand 도입 검토

### 5단계: 디자인 시스템과 다크모드 준비

목표: CSS를 토큰 중심으로 재구성한다.

- `tokens.css`: 색상, 간격, radius, shadow, font size
- `base.css`: reset, body, typography
- `layout.css`: app shell, sidebar, content
- `components.css`: button, panel, table, modal, tabs
- `features/*.css`: 화면별 예외만 유지

다크모드는 CSS 변수 기반으로 준비한다.

```css
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-text: #0f172a;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #111827;
  --color-text: #e5e7eb;
}
```

### 6단계: Next.js/Tailwind 전환 판단

아래 중 하나를 선택한다.

- 현재 Tauri/Vite 앱을 계속 고도화한다.
- `web-app` 폴더에 Next.js 앱을 새로 만들고 공통 도메인/컴포넌트를 이식한다.
- UI 패키지를 분리해 Tauri와 Next.js가 함께 쓰게 한다.

추천은 2번이다. 현재 운영 앱을 안정적으로 유지하면서, 웹 서비스 버전은 `web-app`으로 새로 세우는 방식이 위험이 가장 낮다.

## 가능

- 현재 앱을 서비스 수준 구조로 리팩토링
- Next.js + Tailwind 신규 웹 앱 설계 및 생성
- 현재 기능을 Next.js로 점진 이관
- 디자인 시스템, 공통 컴포넌트, API 레이어 정리
- 모바일/PC 반응형 개선
- 다크모드 대응 가능한 토큰 설계

## 불가능 또는 주의

- 현재 앱을 즉시 Next.js라고 가정하고 파일만 바꾸는 방식은 불가
- Tauri SQLite 기능을 일반 웹 브라우저에서 그대로 실행하는 것은 불가
- RHWP 편집 기능을 Next.js 서버 컴포넌트로 직접 옮기는 것은 부적절
- 대규모 파일 이동과 기능 수정, RHWP 수정은 같은 커밋에 섞으면 위험

## 바로 다음 작업

1. `src/app/navigation.ts`를 만들고 메뉴/라우트 타입을 이동한다.
2. `src/shared/hooks/useMediaQuery.ts`를 만든다.
3. `src/shared/ui/ViewErrorBoundary.tsx`를 만든다.
4. `App.tsx` import를 새 구조로 바꾼다.
5. 빌드와 브라우저 확인 후 커밋한다.

## 진행 기록

### 2026-05-21

- 완료: `src/app/navigation.ts`로 메뉴/라우트 타입 분리
- 완료: `src/shared/hooks/useMediaQuery.ts`로 반응형 훅 분리
- 완료: `src/shared/ui/ViewErrorBoundary.tsx`로 화면 에러 경계 분리
- 완료: `src/shared/ui/StatCard.tsx`로 통계 카드 공통 UI 분리
- 완료: `src/shared/ui/EmptyState.tsx`로 빈 상태 표시 공통 UI 분리
- 완료: `src/shared/lib/arrays.ts`로 배열 안전 처리 유틸 분리
- 완료: 사이드바 브랜드 영역, 데이터 상태 뱃지, 활성 그룹 표시, 하단 액션 활성 상태를 서비스형 관리자 UI에 맞춰 개선
- 완료: 사이드바 접힘 상태를 82px 아이콘 레일로 정리하고, 좁은 화면에서도 본문이 오른쪽에 붙도록 보정
- 완료: `src/app/AppSidebar.tsx`로 사이드바 마크업과 아이콘 렌더링을 분리
- 완료: 상단바를 제거하고 본문이 상태 스트립과 화면 콘텐츠부터 바로 시작하도록 정리
- 완료: `src/app/AppShell.tsx`로 사이드바와 본문 레이아웃 껍데기를 `App.tsx` 밖으로 분리
- 완료: `src/shared/ui/Panel.tsx`로 기본 패널 래퍼를 만들고 대시보드/동일화/내보내기 패널 일부에 적용
- 완료: `src/shared/ui/PanelTitle.tsx`로 패널 제목/설명/액션 행을 공통화하고 기존 `panel-title-row` 반복을 제거
- 완료: `src/features/dashboard/DashboardPage.tsx`로 대시보드 화면과 동일화 패널을 기능 폴더로 분리
- 완료: `src/features/journal-edit/JournalEditPage.tsx`를 추가하고 운영일지 수정 화면 라우팅을 기능 폴더로 연결
- 완료: `src/shared/ui/document-preview`에 `PreviewModeTabs`, `HwpStylePreview`, `DocumentPreviewMode`를 분리
- 완료: `src/shared/ui/document-preview/RhwpEditorPane.tsx`를 추가하고 운영일지/템플릿 화면이 공유 RHWP 래퍼를 쓰도록 연결
- 완료: 병렬 분석으로 `JournalTemplateWorkspace` 분리 의존성 목록을 확인
- 완료: `src/features/journal-template/JournalTemplatePage.tsx`로 템플릿 만들기 화면, HTML 템플릿 편집기, 템플릿 트리 아이콘을 기능 폴더로 분리
- 완료: `src/features/child-attendance/ChildAttendancePage.tsx`로 아동 출결대장 화면과 저장/삭제 UI 흐름을 기능 폴더로 분리
- 완료: `src/features/statistics/StatisticsPage.tsx`로 운영 통계 화면을 기능 폴더로 분리
- 완료: `src/features/journal-create/JournalCreatePage.tsx`로 일지 생성 화면과 누락 운영일 생성 계산을 기능 폴더로 분리
- 완료: `src/features/program-plans/ProgramPlansPage.tsx`로 프로그램 계획 화면, 샘플 계획, 빠른 작업 아이콘을 기능 폴더로 분리
- 완료: `src/shared/ui/data-table`로 정렬 헤더/컬럼폭 저장/필터 유틸을 분리
- 완료: `src/features/people-roster/PeopleRosterPage.tsx`로 종사자/비종사자 공통 인력 표 화면을 기능 폴더로 분리
- 검증: `npm run build` 통과
- 검증: 브라우저에서 대시보드 통계 카드, 빈 상태 클래스, 운영일지 수정 화면, 템플릿 만들기/RHWP iframe, 아동 출결대장 화면, 사이드바 메뉴 이동, 상단바 제거, AppShell 적용, Panel/PanelTitle 적용, DashboardPage/JournalEditPage/JournalTemplatePage/ChildAttendancePage 분리, 문서 미리보기/RHWP 래퍼 공통화, 82px 접힘 레일 확인

다음 추천 작업:

1. `Toolbar`와 버튼 클러스터 같은 패널 내부 액션 UI를 실제 사용처 기준으로 추출한다.
2. 테이블 정렬/필터 유틸을 `shared/lib/table.ts`로 분리한다.
3. 아동 목록 테이블 또는 프로그램 일지/평가 placeholder를 다음 기능 폴더로 분리한다.
