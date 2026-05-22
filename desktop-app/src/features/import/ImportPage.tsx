import { useEffect, useState } from 'react';
import { yearOptions } from '../../app/navigation';
import { getDataProviderLabel, replaceLocalDatabaseFromImport } from '../../data/dataProvider';
import { fetchInitialSpreadsheetSnapshot } from '../../data/sheetSync';
import type { DashboardSnapshot, ImportSummary, InitialImportPayload } from '../../types';

export function ImportPage({
  onImported,
  snapshot
}: {
  onImported: (summary: ImportSummary) => void;
  snapshot: DashboardSnapshot | null;
}) {
  const providerLabel = getDataProviderLabel();
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(snapshot?.settings.sourceSpreadsheetUrl || '');
  const [webAppUrl, setWebAppUrl] = useState(snapshot?.settings.sourceWebAppUrl || '');
  const [selectedYears, setSelectedYears] = useState<number[]>(yearOptions);
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('스프레드시트는 최초 이관용입니다. 가져오기 후에는 앱 내부 SQLite가 기준 데이터가 됩니다.');

  useEffect(() => {
    if (!snapshot) return;
    setSpreadsheetUrl(snapshot.settings.sourceSpreadsheetUrl || '');
    setWebAppUrl(snapshot.settings.sourceWebAppUrl || '');
  }, [snapshot]);

  const toggleYear = (year: number) => {
    setSelectedYears((current) => {
      if (current.includes(year)) {
        const next = current.filter((item) => item !== year);
        return next.length ? next : current;
      }
      return [...current, year].sort();
    });
  };

  const importPayload = async (payload: InitialImportPayload, sourceMode: 'spreadsheet' | 'manual') => {
    setBusy(true);
    try {
      const summary = await replaceLocalDatabaseFromImport(
        {
          ...payload,
          sourceSpreadsheetUrl: payload.sourceSpreadsheetUrl || spreadsheetUrl
        },
        sourceMode,
        webAppUrl
      );
      setMessage(`이관 완료: 인원 ${summary.peopleCount}명, 아동 ${summary.childCount}명, 출결 ${summary.attendanceCount + summary.childAttendanceCount}건, 운영일지 ${summary.journalCount}건`);
      onImported(summary);
    } catch (error) {
      setMessage(`이관 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const importFromApi = async () => {
    if (!webAppUrl.trim()) {
      setMessage('Apps Script Web App URL을 먼저 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const payload = await fetchInitialSpreadsheetSnapshot(webAppUrl, spreadsheetUrl, selectedYears);
      await importPayload(payload, 'spreadsheet');
    } catch (error) {
      setMessage(`자동 가져오기 실패: ${error instanceof Error ? error.message : String(error)}. Web App 배포 URL을 확인하거나 JSON 붙여넣기를 사용해주세요.`);
      setBusy(false);
    }
  };

  const importFromJson = async () => {
    try {
      const payload = JSON.parse(jsonText) as InitialImportPayload;
      await importPayload(payload, 'manual');
    } catch (error) {
      setMessage(`JSON 확인 필요: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <section className="import-layout">
      <div className="panel import-hero">
        <span className="eyebrow">최초 1회</span>
        <h2>스프레드시트 데이터를 앱 내부 DB로 이관</h2>
        <p>
          기존 Google Sheets 데이터는 처음 한 번만 가져오고, 이후 작성/수정/조회는
          {providerLabel}에서 처리합니다. 스프레드시트는 백업과 내보내기 대상으로 남깁니다.
        </p>
        <div className="import-steps">
          <span>1. 스프레드시트 읽기</span>
          <span>2. {providerLabel} 저장</span>
          <span>3. 앱 단독 운영</span>
        </div>
      </div>

      <div className="panel import-card">
        <h2>자동 가져오기</h2>
        <label>
          스프레드시트 URL
          <input
            value={spreadsheetUrl}
            onChange={(event) => setSpreadsheetUrl(event.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </label>
        <label>
          Apps Script Web App URL
          <input
            value={webAppUrl}
            onChange={(event) => setWebAppUrl(event.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </label>
        <div className="year-picker">
          {yearOptions.map((year) => (
            <button
              key={year}
              type="button"
              className={selectedYears.includes(year) ? 'active' : ''}
              onClick={() => toggleYear(year)}
            >
              {String(year).slice(2)}년
            </button>
          ))}
        </div>
        <button className="primary wide" type="button" onClick={importFromApi} disabled={busy}>
          {busy ? '가져오는 중...' : '스프레드시트에서 가져오기'}
        </button>
      </div>

      <div className="panel import-card">
        <h2>JSON으로 가져오기</h2>
        <p className="muted">자동 URL 접근이 막힐 때는 Web App 결과 JSON을 붙여넣어도 동일하게 이관됩니다.</p>
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder='{"people":[],"attendance":[],"journals":[]}'
        />
        <button className="wide" type="button" onClick={importFromJson} disabled={busy || !jsonText.trim()}>
          JSON 데이터 이관
        </button>
      </div>

      <div className="panel import-card">
        <h2>현재 상태</h2>
        <p>{message}</p>
        <div className="mini-stats">
          <span>종사자 {snapshot?.staff.length || 0}명</span>
          <span>비종사자 {snapshot?.nonStaff.length || 0}명</span>
          <span>아동 {snapshot?.children.length || 0}명</span>
          <span>운영일지 {snapshot?.journals.length || 0}건</span>
        </div>
      </div>
    </section>
  );
}
