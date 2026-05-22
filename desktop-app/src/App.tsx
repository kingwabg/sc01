import { useEffect, useMemo, useState } from 'react';
import type { DashboardSnapshot, ImportSummary, Person } from './types';
import { AppShell } from './app/AppShell';
import { AppStatusStrip } from './app/AppStatusStrip';
import type { AppStatusEntry, AppStatusTone } from './app/AppStatusStrip';
import type { ViewKey } from './app/navigation';
import { getDataProviderLabel, loadDashboardSnapshot } from './data/dataProvider';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ChildAttendancePage } from './features/child-attendance/ChildAttendancePage';
import { ChildrenRosterPage } from './features/children-roster/ChildrenRosterPage';
import { ExportPage } from './features/export/ExportPage';
import { ImportPage } from './features/import/ImportPage';
import { JournalCreatePage } from './features/journal-create/JournalCreatePage';
import { JournalEditPage } from './features/journal-edit/JournalEditPage';
import { JournalTemplatePage } from './features/journal-template/JournalTemplatePage';
import { ProgramJournalsPage } from './features/program-journals/ProgramJournalsPage';
import { PeopleRosterPage } from './features/people-roster/PeopleRosterPage';
import { ProgramPlansPage } from './features/program-plans/ProgramPlansPage';
import { StatisticsPage } from './features/statistics/StatisticsPage';
import { safeRows } from './shared/lib/arrays';
import { EmptyState } from './shared/ui/EmptyState';
import { ParityWorkbench } from './shared/ui/ParityWorkbench';
import { ViewErrorBoundary } from './shared/ui/ViewErrorBoundary';
import { PreviewModeTabs, RhwpEditorPane as SharedRhwpEditorPane } from './shared/ui/document-preview';

function App() {
  const providerLabel = getDataProviderLabel();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState<{ message: string; tone: AppStatusTone }>({
    message: `${providerLabel} 기준 데이터를 준비하는 중입니다.`,
    tone: 'neutral'
  });
  const [statusEntries, setStatusEntries] = useState<AppStatusEntry[]>([]);
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const publishStatus = (message: string, tone: AppStatusTone, record = true) => {
    setStatus({ message, tone });
    if (!record) return;
    setStatusEntries((current) => {
      const nextEntry: AppStatusEntry = {
        createdAt: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        tone
      };
      const deduped = current.filter((entry) => entry.message !== message || entry.tone !== tone);
      return [nextEntry, ...deduped].slice(0, 4);
    });
  };

  const refreshSnapshot = (nextStatus?: { message: string; tone: AppStatusTone; record?: boolean }) => {
    loadDashboardSnapshot()
      .then((next) => {
        setSnapshot(next);
        if (nextStatus) {
          publishStatus(nextStatus.message, nextStatus.tone, nextStatus.record ?? true);
          return;
        }
        publishStatus(`${providerLabel} 기준 운영 구조가 준비되었습니다.`, 'success');
      })
      .catch((error) => {
        publishStatus(`초기화 실패: ${error instanceof Error ? error.message : String(error)}`, 'danger');
      });
  };

  useEffect(() => {
    let alive = true;
    loadDashboardSnapshot()
      .then((next) => {
        if (!alive) return;
        setSnapshot(next);
        publishStatus(`${providerLabel} 기준 운영 구조가 준비되었습니다.`, 'success');
      })
      .catch((error) => {
        if (!alive) return;
        publishStatus(`초기화 실패: ${error instanceof Error ? error.message : String(error)}`, 'danger');
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedRows = useMemo(() => {
    if (!snapshot) return [];
    return view === 'nonStaffRoster' ? safeRows(snapshot.nonStaff) : safeRows(snapshot.staff);
  }, [snapshot, view]);

  const handleImported = (summary: ImportSummary) => {
    setLastImportSummary(summary);
    const message = `이관 완료: 인원 ${summary.peopleCount}명, 아동 ${summary.childCount}명, 출결 ${summary.attendanceCount + summary.childAttendanceCount}건, 운영일지 ${summary.journalCount}건`;
    publishStatus(message, 'success', false);
    refreshSnapshot({ message, tone: 'success' });
  };

  const handleDataChanged = (message: string) => {
    const tone: AppStatusTone = message.includes('실패') || message.includes('오류') ? 'danger' : 'success';
    publishStatus(message, tone, false);
    refreshSnapshot({ message, tone });
  };

  return (
    <AppShell
      currentView={view}
      providerLabel={providerLabel}
      sidebarHidden={sidebarHidden}
      onSidebarToggle={() => setSidebarHidden((value) => !value)}
      onViewChange={setView}
    >
      {!snapshot && <EmptyState>데이터를 불러오는 중입니다.</EmptyState>}
      {snapshot && <AppStatusStrip snapshot={snapshot} providerLabel={providerLabel} message={status.message} tone={status.tone} entries={statusEntries} />}

      <ViewErrorBoundary viewKey={view}>
        {snapshot && view === 'dashboard' && (
          <DashboardPage
            lastImportSummary={lastImportSummary}
            providerLabel={providerLabel}
            snapshot={snapshot}
          />
        )}

        {snapshot && view === 'journalStats' && <StatisticsPage snapshot={snapshot} />}

        {snapshot && view === 'journalCreate' && (
          <JournalCreatePage
            snapshot={snapshot}
            onGenerated={handleDataChanged}
          />
        )}

        {view === 'journalQuickEdit' && (
          <ParityWorkbench
            title="간단 수정"
            summary="스프레드시트 미리보기의 간단 수정처럼 담당자, 지도 및 협의내용, 통합 관리, 업무내용을 한 화면에서 수정하는 기능입니다."
            implemented={['운영일지 데이터 구조 준비', '템플릿 미리보기 연결', '업무내용 필드 렌더링']}
            next={['선택 일자의 수정 폼 연결', 'SQLite 즉시 저장', '수정 후 미리보기 자동 갱신']}
          />
        )}

        {view === 'import' && <ImportPage snapshot={snapshot} onImported={handleImported} />}

        {snapshot && (view === 'staffRoster' || view === 'nonStaffRoster') && (
          <PeopleRosterPage
            rows={selectedRows}
            title={view === 'nonStaffRoster' ? '비종사자 데이터' : '종사자 데이터'}
            storageKey={view === 'nonStaffRoster' ? 'non-staff' : 'staff'}
          />
        )}

        {snapshot && view === 'children' && (
          <ChildrenRosterPage
            rows={safeRows(snapshot.children)}
            childAttendance={safeRows(snapshot.childAttendance)}
            childYearRecords={safeRows(snapshot.childYearRecords)}
            onChildSaved={handleDataChanged}
            onDeduped={handleDataChanged}
          />
        )}
        {snapshot && view === 'childAttendance' && (
          <ChildAttendancePage
            snapshot={snapshot}
            onSaved={handleDataChanged}
          />
        )}

        {snapshot && view === 'journalPrint' && (
          <JournalEditPage
            PreviewModeTabs={PreviewModeTabs}
            RhwpEditorPane={SharedRhwpEditorPane}
            snapshot={snapshot}
            onSaved={handleDataChanged}
          />
        )}

        {snapshot && view === 'templateManager' && <JournalTemplatePage snapshot={snapshot} />}

        {view === 'programPlans' && <ProgramPlansPage />}

        {snapshot && view === 'programJournals' && <ProgramJournalsPage snapshot={snapshot} onSaved={handleDataChanged} />}

        {view === 'programEvaluations' && (
          <ParityWorkbench
            title="프로그램 평가"
            summary="프로그램 결과, 평가, 다음 계획을 기록하는 영역입니다."
            implemented={['프로그램 관리 메뉴 구조']}
            next={['평가 항목/만족도/결과 기록', '계획-일지-평가 연결', '출력 템플릿 등록']}
          />
        )}

        {view === 'telegram' && (
          <ParityWorkbench
            title="텔레그램"
            summary="스프레드시트의 텔레그램 작업함처럼 외부에서 요청을 받고, 승인된 작업만 반영하는 관리 화면입니다."
            implemented={['메뉴 구조 반영', '작업함/상태 확인 흐름 설계']}
            next={['봇 토큰/채팅ID 설정 저장', '명령 로그 DB화', '운영일지/종사자 요청 처리 연결']}
          />
        )}

        {view === 'settings' && (
          <ParityWorkbench
            title="기본 설정"
            summary="운영시간, 담당자 규칙, 관리자 권한, 템플릿 기본값을 한 곳에서 관리하는 화면입니다."
            implemented={['앱 설정 테이블 준비', '스프레드시트 원본 URL 저장']}
            next={['운영시간 규칙 저장', '권한/부관리자 설정', '도장/기관명/머리말/꼬리말 설정']}
          />
        )}

        {view === 'export' && <ExportPage providerLabel={providerLabel} />}
      </ViewErrorBoundary>
    </AppShell>
  );
}

export default App;
