import type { DashboardSnapshot, ImportSummary } from '../../types';
import { safeRows } from '../../shared/lib/arrays';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Panel } from '../../shared/ui/Panel';
import { StatCard } from '../../shared/ui/StatCard';

type DashboardPageProps = {
  lastImportSummary: ImportSummary | null;
  providerLabel: string;
  snapshot: DashboardSnapshot;
};

function SpreadsheetParityPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const readyCount = [
    snapshot.settings.initialized,
    safeRows(snapshot.staff).length > 0,
    safeRows(snapshot.children).length > 0,
    safeRows(snapshot.journals).length > 0
  ].filter(Boolean).length;

  return (
    <Panel className="parity-panel">
      <div>
        <h2>스프레드시트 동일화 기준</h2>
        <p>기존 스프레드시트 기능을 데스크톱 앱 메뉴와 같은 순서로 옮기는 중입니다.</p>
      </div>
      <div className="parity-grid">
        <span className="done">운영일지 통계</span>
        <span className="done">종사자 / 비종사자 현황</span>
        <span className="done">아동 목록 / 출결대장</span>
        <span className="done">일지 미리보기 / 템플릿</span>
        <span>일지 생성 저장</span>
        <span>간단 수정 저장</span>
        <span>프로그램 계획 / 일지 / 평가</span>
        <span>텔레그램 작업함</span>
      </div>
      <div className="parity-meter">
        <strong>{readyCount}/4</strong>
        <span>기초 데이터 준비 상태</span>
      </div>
    </Panel>
  );
}

export function DashboardPage({ lastImportSummary, providerLabel, snapshot }: DashboardPageProps) {
  const journals = safeRows(snapshot.journals);

  return (
    <>
      <section className="stats-grid">
        <StatCard label="종사자" value={`${safeRows(snapshot.staff).length}명`} />
        <StatCard label="비종사자" value={`${safeRows(snapshot.nonStaff).length}명`} />
        <StatCard label="아동" value={`${safeRows(snapshot.children).length}명`} />
        <StatCard label="출결 데이터" value={`${Number(snapshot.attendanceCount || 0) + Number(snapshot.childAttendanceCount || 0)}건`} />
        <StatCard label="운영일지" value={`${journals.length}건`} tone={snapshot.unsyncedCount ? 'warning' : ''} />
      </section>

      <section className="panel-grid">
        <Panel>
          <h2>운영 원칙</h2>
          <ul className="todo-list">
            <li>스프레드시트는 최초 이관과 백업용으로만 사용합니다.</li>
            <li>작성, 수정, 출결 체크는 {providerLabel}에 저장합니다.</li>
            <li>필요할 때만 스프레드시트/엑셀/PDF로 내보냅니다.</li>
          </ul>
        </Panel>

        <Panel>
          <h2>최근 운영일지</h2>
          <div className="journal-list">
            {journals.map((journal) => (
              <div className="journal-item" key={journal.id}>
                <strong>{journal.date}</strong>
                <span>{journal.manager} · 현원 {journal.enrolled} · 출석 {journal.presentChildren}</span>
              </div>
            ))}
            {!journals.length && <EmptyState variant="inline">운영일지 데이터가 아직 없습니다.</EmptyState>}
          </div>
        </Panel>
      </section>

      <SpreadsheetParityPanel snapshot={snapshot} />

      {lastImportSummary && (
        <Panel className="import-result">
          최근 이관: 인원 {lastImportSummary.peopleCount}명, 아동 {lastImportSummary.childCount}명, 출결 {lastImportSummary.attendanceCount + lastImportSummary.childAttendanceCount}건, 운영일지 {lastImportSummary.journalCount}건
        </Panel>
      )}
    </>
  );
}
