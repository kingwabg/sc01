import type { DashboardSnapshot } from '../types';

function resolveModeLabel(sourceMode: DashboardSnapshot['settings']['sourceMode']) {
  return {
    demo: '샘플 데이터',
    spreadsheet: '스프레드시트에서 이관됨',
    manual: 'JSON 수동 이관',
    empty: '비어 있음'
  }[sourceMode];
}

function resolveStatusTone(message: string) {
  if (message.includes('실패') || message.includes('오류')) return 'danger';
  if (message.includes('완료') || message.includes('준비되었습니다')) return 'success';
  return 'neutral';
}

export function AppStatusStrip({
  snapshot,
  providerLabel,
  message
}: {
  snapshot: DashboardSnapshot;
  providerLabel: string;
  message: string;
}) {
  const importedAt = snapshot.settings.importedAt
    ? new Date(snapshot.settings.importedAt).toLocaleString()
    : '-';
  const statusTone = resolveStatusTone(message);

  return (
    <div className="status-strip" aria-live="polite">
      <span>기준 DB: {providerLabel}</span>
      <span>운영 모드: {resolveModeLabel(snapshot.settings.sourceMode)}</span>
      <span>마지막 이관: {importedAt}</span>
      <strong className={`status-message ${statusTone}`}>{message}</strong>
    </div>
  );
}
