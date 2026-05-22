import { Panel } from '../../shared/ui/Panel';

export function ExportPage({ providerLabel }: { providerLabel: string }) {
  return (
    <Panel className="sync-panel">
      <h2>내보내기 설계</h2>
      <p>이제 Google Sheets는 운영 DB가 아니라 백업/공유/제출용 출력 대상입니다.</p>
      <div className="sync-flow">
        <span>{providerLabel} 기준 데이터</span>
        <span>검증</span>
        <span>스프레드시트 내보내기</span>
        <span>PDF/HTML 출력</span>
      </div>
    </Panel>
  );
}
