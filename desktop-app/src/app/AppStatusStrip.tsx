import type { DashboardSnapshot } from '../types';

export type AppStatusTone = 'neutral' | 'success' | 'danger';

export type AppStatusEntry = {
  createdAt: number;
  id: string;
  message: string;
  tone: AppStatusTone;
};

function resolveModeLabel(sourceMode: DashboardSnapshot['settings']['sourceMode']) {
  return {
    demo: '샘플 데이터',
    spreadsheet: '스프레드시트에서 이관됨',
    manual: 'JSON 수동 이관',
    empty: '비어 있음'
  }[sourceMode];
}

function formatEntryTime(createdAt: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(createdAt);
}

function resolveStatusTone(message: string): AppStatusTone {
  if (message.includes('실패') || message.includes('오류')) return 'danger';
  if (message.includes('완료') || message.includes('준비되었습니다')) return 'success';
  return 'neutral';
}

export function AppStatusStrip({
  snapshot,
  providerLabel,
  message,
  tone,
  entries
}: {
  entries: AppStatusEntry[];
  snapshot: DashboardSnapshot;
  providerLabel: string;
  message: string;
  tone?: AppStatusTone;
}) {
  const importedAt = snapshot.settings.importedAt
    ? new Date(snapshot.settings.importedAt).toLocaleString()
    : '-';
  const statusTone = tone || resolveStatusTone(message);

  return (
    <>
      <div className="status-strip" aria-live="polite">
        <span>기준 DB: {providerLabel}</span>
        <span>운영 모드: {resolveModeLabel(snapshot.settings.sourceMode)}</span>
        <span>마지막 이관: {importedAt}</span>
        <strong className={`status-message ${statusTone}`}>{message}</strong>
      </div>
      {!!entries.length && (
        <div className="status-feed" aria-label="최근 작업">
          {entries.map((entry) => (
            <div className={`status-feed-item ${entry.tone}`} key={entry.id}>
              <span>{formatEntryTime(entry.createdAt)}</span>
              <strong>{entry.message}</strong>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
