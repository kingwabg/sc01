import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, PointerEvent as ReactPointerEvent } from 'react';
import type { DashboardSnapshot, JournalEntry } from '../../types';
import { downloadHwpxFromHtml } from '../../data/hwpxExport';
import { defaultJournalTemplateHtml, renderJournalTemplate } from '../../data/journalTemplates';
import { loadJournalTemplates, saveJournalEntry } from '../../data/dataProvider';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { safeRows } from '../../shared/lib/arrays';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PanelTitle } from '../../shared/ui/PanelTitle';
import type { DocumentPreviewMode } from '../../shared/ui/document-preview';

type PreviewModeTabsComponent = ComponentType<{
  editable?: boolean;
  onChange: (value: DocumentPreviewMode) => void;
  value: DocumentPreviewMode;
}>;

type RhwpEditorPaneComponent = ComponentType<{
  defaultHtml?: string;
  html: string;
  onHtmlCommit?: (html: string) => void;
}>;

type JournalEditPageProps = {
  PreviewModeTabs: PreviewModeTabsComponent;
  RhwpEditorPane: RhwpEditorPaneComponent;
  onSaved: (message: string) => void;
  snapshot: DashboardSnapshot;
};

type JournalEditTextKey =
  | 'guidanceText'
  | 'staffText'
  | 'childText'
  | 'visitorText'
  | 'facilityText'
  | 'workText'
  | 'otherText';

const journalEditFields: Array<{ key: JournalEditTextKey; label: string; rows: number; placeholder: string }> = [
  {
    key: 'guidanceText',
    label: '지도 및 협의사항',
    rows: 1,
    placeholder: '생활지도, 위생지도, 안전지도 내용을 입력합니다.'
  },
  {
    key: 'staffText',
    label: '종사자',
    rows: 1,
    placeholder: '예: 출근 : 왕시형(센터장), 윤희빈(사회복지사) / 2명'
  },
  {
    key: 'childText',
    label: '아동',
    rows: 1,
    placeholder: '예: 결석 : 김하나, 박수경 / 2명'
  },
  {
    key: 'visitorText',
    label: '방문자',
    rows: 1,
    placeholder: '예: 교사 : 김홍매 / 1명 · 공익 : 노지현 / 1명'
  },
  {
    key: 'facilityText',
    label: '시설',
    rows: 1,
    placeholder: '예: 시설 안전 점검 및 환기, 공용 물품 정리'
  },
  {
    key: 'workText',
    label: '업무내용',
    rows: 1,
    placeholder: '* 행정 업무\n* 아동 지도\n* 프로그램 운영'
  },
  {
    key: 'otherText',
    label: '기타',
    rows: 1,
    placeholder: '기타 전달사항을 입력합니다.'
  }
];

function formatDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function createJournalDraft(journal?: JournalEntry): JournalEntry {
  return {
    id: journal?.id || `journal-${journal?.date || formatDateKey(new Date())}`,
    date: journal?.date || formatDateKey(new Date()),
    operatingHours: journal?.operatingHours || '',
    manager: journal?.manager || '',
    capacity: journal?.capacity || 35,
    enrolled: journal?.enrolled || 0,
    presentChildren: journal?.presentChildren || 0,
    absentChildren: journal?.absentChildren || 0,
    staffCount: journal?.staffCount || 0,
    teacherCount: journal?.teacherCount || 0,
    publicServiceCount: journal?.publicServiceCount || 0,
    otherVisitorCount: journal?.otherVisitorCount || 0,
    guidanceText: journal?.guidanceText || '',
    staffText: journal?.staffText || '',
    childText: journal?.childText || '',
    visitorText: journal?.visitorText || '',
    facilityText: journal?.facilityText || '',
    workText: journal?.workText || '',
    otherText: journal?.otherText || '',
    syncStatus: journal?.syncStatus || 'pending'
  };
}

export function JournalEditPage({
  PreviewModeTabs,
  RhwpEditorPane,
  snapshot,
  onSaved
}: JournalEditPageProps) {
  const journals = useMemo(
    () => [...safeRows(snapshot.journals)].sort((left, right) => right.date.localeCompare(left.date)),
    [snapshot.journals]
  );
  const [selectedJournalId, setSelectedJournalId] = useState(journals[0]?.id || '');
  const selectedJournal = journals.find((journal) => journal.id === selectedJournalId) || journals[0];
  const [draft, setDraft] = useState<JournalEntry>(() => createJournalDraft(selectedJournal));
  const [templateHtml, setTemplateHtml] = useState(defaultJournalTemplateHtml);
  const [message, setMessage] = useState('수정할 날짜를 선택해 주세요.');
  const [saving, setSaving] = useState(false);
  const [listHidden, setListHidden] = useState(false);
  const [previewMode, setPreviewMode] = useState<DocumentPreviewMode>('html');
  const [paneWidths, setPaneWidths] = useState({ list: 300, form: 460 });
  const compactLayout = useMediaQuery('(max-width: 1180px)');

  useEffect(() => {
    loadJournalTemplates()
      .then((items) => {
        const defaultTemplate = items.find((item) => item.isDefault) || items[0];
        setTemplateHtml(defaultTemplate?.html || defaultJournalTemplateHtml);
      })
      .catch(() => {
        setTemplateHtml(defaultJournalTemplateHtml);
      });
  }, []);

  useEffect(() => {
    if (!journals.length) return;
    if (!selectedJournalId || !journals.some((journal) => journal.id === selectedJournalId)) {
      setSelectedJournalId(journals[0].id);
    }
  }, [journals, selectedJournalId]);

  useEffect(() => {
    setDraft(createJournalDraft(selectedJournal));
    if (selectedJournal) {
      setMessage(`${selectedJournal.date} 운영일지를 불러왔습니다.`);
    }
  }, [selectedJournal?.id]);

  const updateDraft = <K extends keyof JournalEntry>(key: K, value: JournalEntry[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const isDirty = selectedJournal
    ? JSON.stringify(createJournalDraft(selectedJournal)) !== JSON.stringify(draft)
    : false;

  const previewHtml = renderJournalTemplate(
    templateHtml,
    draft,
    safeRows(snapshot.staff),
    safeRows(snapshot.nonStaff),
    safeRows(snapshot.attendance)
  );

  const downloadDraftHwpx = async () => {
    const safeDate = (draft.date || selectedJournal?.date || '운영일지').replace(/[^\d가-힣A-Za-z_-]+/g, '_');
    setMessage('HWPX 파일을 준비하고 있습니다.');
    try {
      await downloadHwpxFromHtml(previewHtml, `운영일지_${safeDate}.hwpx`);
      setMessage(`${draft.date || selectedJournal?.date} HWPX 파일을 내려받았습니다.`);
    } catch (error) {
      setMessage(`HWPX 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const saveDraft = async () => {
    if (!draft.date) {
      setMessage('일자를 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveJournalEntry(draft);
      setMessage(`${saved.date} 운영일지를 저장했습니다.`);
      onSaved(`${saved.date} 운영일지 수정 데이터 저장 완료`);
    } catch (error) {
      setMessage(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const clampPaneWidth = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const beginPaneResize = (target: 'list' | 'form') => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = paneWidths;
    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setPaneWidths({
        list: target === 'list' ? clampPaneWidth(startWidths.list + delta, 220, 520) : startWidths.list,
        form: target === 'form' ? clampPaneWidth(startWidths.form - delta, 340, 780) : startWidths.form
      });
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      document.body.classList.remove('pane-resizing');
    };
    document.body.classList.add('pane-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  };

  const journalEditGridTemplate = compactLayout
    ? 'minmax(0, 1fr)'
    : listHidden
    ? `minmax(560px, 1fr) 10px ${paneWidths.form}px`
    : `${paneWidths.list}px 10px minmax(560px, 1fr) 10px ${paneWidths.form}px`;

  if (!journals.length) {
    return (
      <section className="journal-edit-workspace">
        <EmptyState variant="panel">
          운영일지 데이터가 아직 없습니다. 먼저 일지 생성에서 날짜를 만들어 주세요.
        </EmptyState>
      </section>
    );
  }

  return (
    <section className={`journal-edit-workspace ${listHidden ? 'journal-list-hidden' : ''}`} style={{ gridTemplateColumns: journalEditGridTemplate }}>
      {listHidden && (
        <button className="journal-list-rail-tab" type="button" onClick={() => setListHidden(false)}>
          목록 열기
        </button>
      )}
      {!listHidden && (
        <div className="panel journal-edit-list-panel">
          <PanelTitle
            title="운영일지"
            description="날짜를 고르면 미리보기와 수정폼이 함께 바뀝니다."
            actions={(
              <button className="journal-list-toggle-button is-open" type="button" onClick={() => setListHidden(true)}>
                목록 접기
              </button>
            )}
          />
          <div className="journal-edit-date-list">
            {journals.map((journal) => (
              <button
                key={journal.id}
                type="button"
                className={journal.id === selectedJournal?.id ? 'active' : ''}
                onClick={() => setSelectedJournalId(journal.id)}
              >
                <strong>{journal.date}</strong>
                <span>{journal.manager || '담당자 없음'} · {journal.operatingHours || '운영시간 없음'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!listHidden && !compactLayout && (
        <div
          className="journal-pane-resizer"
          role="separator"
          aria-label="운영일지 목록 너비 조절"
          onPointerDown={beginPaneResize('list')}
        />
      )}

      <div className="panel journal-edit-preview-panel">
        <PanelTitle
          title="미리보기"
          description={isDirty ? '저장 전 수정사항이 미리보기에 반영 중입니다.' : '현재 저장된 운영일지입니다.'}
          actions={(
            <div className="button-cluster">
              {isDirty && <span className="draft-badge">저장 필요</span>}
              <button type="button" onClick={downloadDraftHwpx}>HWPX 다운로드</button>
            </div>
          )}
        />
        <PreviewModeTabs value={previewMode} onChange={setPreviewMode} />
        {previewMode === 'rhwp' ? (
          <RhwpEditorPane html={previewHtml} defaultHtml={defaultJournalTemplateHtml} />
        ) : (
          <div className="journal-live-preview-stage">
            <div className="journal-live-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}
      </div>
      {!compactLayout && (
        <div
          className="journal-pane-resizer"
          role="separator"
          aria-label="일지 수정 너비 조절"
          onPointerDown={beginPaneResize('form')}
        />
      )}

      <div className="panel journal-edit-form-panel">
        <PanelTitle
          title="일지 수정"
          description={message}
          actions={(
            <button type="button" className="primary" onClick={saveDraft} disabled={saving}>
              {saving ? '저장 중' : '저장'}
            </button>
          )}
        />

        <div className="journal-edit-basic-grid">
          <label>
            일자
            <input type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
          </label>
          <label>
            운영시간
            <input value={draft.operatingHours} onChange={(event) => updateDraft('operatingHours', event.target.value)} placeholder="09:00 ~ 18:00 (방학중)" />
          </label>
          <label>
            담당자
            <input value={draft.manager} onChange={(event) => updateDraft('manager', event.target.value)} placeholder="담당자 이름" />
          </label>
        </div>

        <div className="journal-edit-text-grid">
          {journalEditFields.map((field) => (
            <label key={field.key} className={field.key === 'workText' ? 'wide' : ''}>
              {field.label}
              <textarea
                rows={field.rows}
                value={String(draft[field.key] || '')}
                onChange={(event) => updateDraft(field.key, event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
