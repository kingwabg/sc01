import { useEffect, useMemo, useState } from 'react';
import type { AttendanceEntry, Child, ChildAttendanceEntry, DashboardSnapshot, JournalEntry, Person } from '../../types';
import { saveJournalEntry } from '../../data/dataProvider';
import { safeRows } from '../../shared/lib/arrays';

type ProgramJournalTemplate = {
  activityHint: string;
  badge: string;
  id: string;
  reviewHint: string;
  setupHint: string;
  targetHint: string;
  title: string;
};

type ProgramJournalDraft = {
  activitySummary: string;
  attendanceSummary: string;
  base: JournalEntry;
  facilitatorSummary: string;
  programTitle: string;
  reviewSummary: string;
  setupSummary: string;
  targetSummary: string;
  templateId: string;
};

const programJournalTemplates: ProgramJournalTemplate[] = [
  {
    id: 'basic-learning',
    title: '기초학습 지도',
    badge: '학습',
    targetHint: '저학년 아동 6명 / 수학 보충, 받아쓰기 복습',
    activityHint: '도입 활동\n핵심 학습\n개별 피드백',
    reviewHint: '집중도가 높은 아동과 추가 보충이 필요한 아동을 정리합니다.',
    setupHint: '교재, 필기구, 학습지 준비'
  },
  {
    id: 'art-play',
    title: '창의미술 활동',
    badge: '미술',
    targetHint: '고학년 아동 8명 / 공동 작품 만들기',
    activityHint: '재료 소개\n표현 활동\n작품 발표',
    reviewHint: '참여도, 협동 정도, 다음 회차 보완점을 기록합니다.',
    setupHint: '물감, 도화지, 앞치마, 정리 구역 점검'
  },
  {
    id: 'culture-experience',
    title: '문화체험 프로그램',
    badge: '체험',
    targetHint: '전학년 아동 12명 / 외부 연계 체험',
    activityHint: '사전 안전 안내\n현장 체험 진행\n귀가 전 정리',
    reviewHint: '인솔, 외부 연계, 안전상 특이사항을 남깁니다.',
    setupHint: '출석 확인표, 이동 동선, 비상 연락망 준비'
  },
  {
    id: 'sports-play',
    title: '신체활동 프로그램',
    badge: '체육',
    targetHint: '저학년 아동 10명 / 실내 놀이·체육',
    activityHint: '준비 운동\n팀별 활동\n마무리 스트레칭',
    reviewHint: '안전 지도와 참여도, 대체 활동 여부를 기록합니다.',
    setupHint: '매트, 콘, 체육 도구, 안전거리 확인'
  }
];

function formatDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function defaultOperatingHoursForDate(date: string) {
  const month = Number(date.slice(5, 7));
  if ([1, 2, 8].includes(month)) return '09:00 ~ 18:00 (방학중)';
  return '10:00 ~ 19:00';
}

function isRecognizedChildAttendance(entry: ChildAttendanceEntry) {
  return entry.status === 'present' || entry.status === 'official' || entry.status === 'substitute';
}

function isWorkAttendance(entry: AttendanceEntry) {
  return entry.status === 'present' || entry.status === 'official' || entry.status === 'substitute';
}

function isActiveChildInRange(child: Child, start: string, end: string) {
  const joinedAt = child.joinedAt || start;
  const leftAt = child.leftAt || end;
  return joinedAt <= end && leftAt >= start && child.status !== '퇴소';
}

function isActivePersonOnDate(person: Person, date: string) {
  const startedAt = person.startedAt || date;
  const endedAt = person.endedAt || '9999-12-31';
  const inactiveWithoutDate = !person.startedAt && !person.endedAt && (person.status === '퇴사' || person.status === '종료');
  return !inactiveWithoutDate && startedAt <= date && endedAt >= date;
}

function isLeaderRole(person: Person) {
  return person.role.includes('센터장') || person.role.includes('팀장');
}

function pickJournalManager(staffPresent: Person[], activeStaff: Person[]) {
  return (
    staffPresent.find((person) => !isLeaderRole(person)) ||
    activeStaff.find((person) => !isLeaderRole(person)) ||
    staffPresent[0] ||
    activeStaff[0]
  )?.name || '-';
}

function buildBaseJournal(date: string, snapshot: DashboardSnapshot): JournalEntry {
  const peopleById = new Map([...safeRows(snapshot.staff), ...safeRows(snapshot.nonStaff)].map((person) => [person.id, person]));
  const activeChildren = safeRows(snapshot.children).filter((child) => isActiveChildInRange(child, date, date));
  const activeStaff = safeRows(snapshot.staff).filter((person) => isActivePersonOnDate(person, date));
  const dayChildAttendance = safeRows(snapshot.childAttendance).filter((entry) => entry.date === date);
  const dayAttendance = safeRows(snapshot.attendance).filter((entry) => entry.date === date);
  const staffPresent = dayAttendance
    .filter((entry) => entry.personKind === 'staff' && isWorkAttendance(entry))
    .map((entry) => peopleById.get(entry.personId))
    .filter((person): person is Person => Boolean(person));
  const nonStaffPresent = dayAttendance
    .filter((entry) => entry.personKind === 'nonStaff' && isWorkAttendance(entry))
    .map((entry) => peopleById.get(entry.personId))
    .filter((person): person is Person => Boolean(person));

  return {
    id: `journal-${date}`,
    date,
    operatingHours: defaultOperatingHoursForDate(date),
    manager: pickJournalManager(staffPresent, activeStaff),
    capacity: 35,
    enrolled: activeChildren.length,
    presentChildren: dayChildAttendance.filter(isRecognizedChildAttendance).length,
    absentChildren: dayChildAttendance.filter((entry) => entry.status === 'absent').length,
    staffCount: staffPresent.length,
    teacherCount: nonStaffPresent.filter((person) => person.category.includes('교사')).length,
    publicServiceCount: nonStaffPresent.filter((person) => person.category.includes('공익') || person.role.includes('사회복무')).length,
    otherVisitorCount: nonStaffPresent.filter((person) => !person.category.includes('교사') && !person.category.includes('공익') && !person.role.includes('사회복무')).length,
    guidanceText: '',
    staffText: '',
    childText: '',
    visitorText: '',
    facilityText: '',
    workText: '',
    otherText: '',
    syncStatus: 'pending'
  };
}

function extractProgramTitle(workText: string) {
  const lines = String(workText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const taggedLine = lines.find((line) => line.startsWith('[프로그램명]'));
  if (taggedLine) return taggedLine.replace('[프로그램명]', '').trim();
  const firstLine = lines[0] || '';
  if (/(프로그램|학습|미술|체험|활동)/.test(firstLine)) return firstLine.replace(/^[*\-\s]+/, '').trim();
  return '';
}

function extractProgramBody(workText: string) {
  const lines = String(workText || '').split(/\r?\n/);
  const cleaned = lines.filter((line, index) => !(index === 0 && line.trim().startsWith('[프로그램명]')));
  return cleaned.join('\n').trim();
}

function buildWorkText(title: string, activitySummary: string) {
  const parts = [
    title.trim() ? `[프로그램명] ${title.trim()}` : '',
    activitySummary.trim()
  ].filter(Boolean);
  return parts.join('\n');
}

function inferTemplateId(text: string) {
  const match = programJournalTemplates.find((template) => text.includes(template.title) || text.includes(template.badge));
  return match?.id || '';
}

function createProgramJournalDraft(snapshot: DashboardSnapshot, journal?: JournalEntry, template?: ProgramJournalTemplate): ProgramJournalDraft {
  const base = journal ? { ...journal } : buildBaseJournal(formatDateKey(new Date()), snapshot);
  const workText = String(base.workText || '');
  const titleFromJournal = extractProgramTitle(workText);
  const bodyFromJournal = extractProgramBody(workText);
  const templateId = template?.id || inferTemplateId(`${titleFromJournal} ${bodyFromJournal} ${base.guidanceText || ''}`);

  return {
    base,
    templateId,
    programTitle: titleFromJournal || template?.title || '',
    targetSummary: base.childText || template?.targetHint || '',
    facilitatorSummary: base.staffText || [base.manager].filter(Boolean).join(', '),
    activitySummary: bodyFromJournal || template?.activityHint || '',
    reviewSummary: base.guidanceText || template?.reviewHint || '',
    setupSummary: base.facilityText || template?.setupHint || '',
    attendanceSummary: base.visitorText || ''
  };
}

export function ProgramJournalsPage({
  snapshot,
  onSaved
}: {
  snapshot: DashboardSnapshot;
  onSaved: (message: string) => void;
}) {
  const journals = useMemo(
    () => [...safeRows(snapshot.journals)].sort((left, right) => right.date.localeCompare(left.date)),
    [snapshot.journals]
  );
  const [query, setQuery] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(journals[0]?.id || null);
  const [message, setMessage] = useState('프로그램 일지는 현재 운영일지와 같은 날짜 데이터에 함께 저장됩니다.');
  const [saving, setSaving] = useState(false);

  const programJournalItems = useMemo(() => {
    return journals.map((journal) => {
      const title = extractProgramTitle(journal.workText || '') || '운영일지 기반 프로그램 기록';
      const preview = extractProgramBody(journal.workText || '') || journal.guidanceText || journal.childText || '진행 내용을 입력해 주세요.';
      return {
        id: journal.id,
        journal,
        preview,
        title
      };
    });
  }, [journals]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return programJournalItems.slice(0, 24);
    return programJournalItems.filter((item) => (
      `${item.journal.date} ${item.journal.manager} ${item.title} ${item.preview}`.toLowerCase().includes(normalized)
    ));
  }, [programJournalItems, query]);

  const selectedJournal = journals.find((journal) => journal.id === selectedJournalId);
  const [draft, setDraft] = useState<ProgramJournalDraft>(() => createProgramJournalDraft(snapshot, selectedJournal));

  useEffect(() => {
    if (!selectedJournalId) return;
    const nextSelectedJournal = journals.find((journal) => journal.id === selectedJournalId);
    if (!nextSelectedJournal && journals[0]) {
      setSelectedJournalId(journals[0].id);
      return;
    }
    if (nextSelectedJournal) {
      setDraft(createProgramJournalDraft(snapshot, nextSelectedJournal));
    }
  }, [journals, selectedJournalId]);

  const selectedTemplate = programJournalTemplates.find((template) => template.id === draft.templateId);

  const startNewDraft = (template?: ProgramJournalTemplate) => {
    setSelectedJournalId(null);
    setDraft(createProgramJournalDraft(snapshot, undefined, template));
    setMessage(template ? `${template.title} 템플릿으로 새 프로그램 일지를 시작합니다.` : '오늘 날짜 기준 새 프로그램 일지를 시작합니다.');
  };

  const applyTemplate = (template: ProgramJournalTemplate) => {
    setDraft((current) => ({
      ...current,
      templateId: template.id,
      programTitle: current.programTitle || template.title,
      targetSummary: current.targetSummary || template.targetHint,
      facilitatorSummary: current.facilitatorSummary,
      activitySummary: current.activitySummary || template.activityHint,
      reviewSummary: current.reviewSummary || template.reviewHint,
      setupSummary: current.setupSummary || template.setupHint
    }));
    setMessage(`${template.title} 템플릿을 현재 일지에 적용했습니다.`);
  };

  const updateBase = <K extends keyof JournalEntry>(key: K, value: JournalEntry[K]) => {
    setDraft((current) => ({
      ...current,
      base: { ...current.base, [key]: value }
    }));
  };

  const updateText = (key: keyof Omit<ProgramJournalDraft, 'base'>, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const programJournalCount = programJournalItems.filter((item) => item.title !== '운영일지 기반 프로그램 기록').length;

  const saveDraft = async () => {
    if (!draft.base.date) {
      setMessage('일자를 입력해 주세요.');
      return;
    }
    if (!draft.programTitle.trim()) {
      setMessage('프로그램명을 입력해 주세요.');
      return;
    }

    const journalToSave: JournalEntry = {
      ...buildBaseJournal(draft.base.date, snapshot),
      ...draft.base,
      id: `journal-${draft.base.date}`,
      manager: draft.base.manager || '-',
      staffText: draft.facilitatorSummary.trim(),
      childText: draft.targetSummary.trim(),
      visitorText: draft.attendanceSummary.trim(),
      facilityText: draft.setupSummary.trim(),
      guidanceText: draft.reviewSummary.trim(),
      workText: buildWorkText(draft.programTitle, draft.activitySummary),
      syncStatus: 'pending'
    };

    setSaving(true);
    setMessage('프로그램 일지를 저장하는 중입니다.');
    try {
      const saved = await saveJournalEntry(journalToSave);
      const nextMessage = `프로그램 일지 저장 완료: ${saved.date} · ${draft.programTitle}`;
      setSelectedJournalId(saved.id);
      setDraft(createProgramJournalDraft(snapshot, saved, selectedTemplate));
      setMessage(nextMessage);
      onSaved(nextMessage);
    } catch (error) {
      setMessage(`프로그램 일지 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="program-journal-workspace">
      <div className="program-command-card">
        <div className="program-search-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="프로그램 일지 검색..."
          />
        </div>

        <div className="program-command-section">
          <div className="program-section-title">최근 프로그램 일지</div>
          <div className="program-command-list">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`program-command-item ${selectedJournalId === item.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedJournalId(item.id);
                  setMessage(`${item.journal.date} 일지를 프로그램 작업 화면으로 불러왔습니다.`);
                }}
              >
                <span>
                  <strong>{item.title}</strong>
                  <em>{item.preview}</em>
                </span>
                <small>{item.journal.date}</small>
              </button>
            ))}
            {!filteredItems.length && <div className="program-empty-command">검색 결과가 없습니다.</div>}
          </div>
        </div>

        <div className="program-command-section">
          <div className="program-section-title">새 일지 시작</div>
          <div className="program-command-list">
            {programJournalTemplates.map((template) => (
              <button key={template.id} type="button" className="program-command-item action" onClick={() => startNewDraft(template)}>
                <span>
                  <strong>{template.title}</strong>
                  <em>{template.targetHint}</em>
                </span>
              </button>
            ))}
            <button type="button" className="program-command-item action" onClick={() => startNewDraft()}>
              <span>
                <strong>빈 양식으로 시작</strong>
                <em>오늘 날짜 기준으로 새 프로그램 일지를 작성합니다.</em>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="panel program-journal-editor-panel">
        <span className="eyebrow">프로그램 일지</span>
        <div className="program-detail-head">
          <div>
            <h2>{draft.programTitle.trim() || '새 프로그램 일지'}</h2>
            <p>운영일지와 같은 날짜 레코드에 프로그램명, 대상, 진행 내용, 평가를 함께 저장합니다.</p>
          </div>
          <span className="program-status-pill">{selectedTemplate?.badge || '기록중'}</span>
        </div>

        <section className="program-plan-metrics">
          <div>
            <span>프로그램 일지</span>
            <strong>{programJournalCount}건</strong>
          </div>
          <div>
            <span>작성 일자</span>
            <strong>{draft.base.date || '-'}</strong>
          </div>
          <div>
            <span>담당</span>
            <strong>{draft.base.manager || '-'}</strong>
          </div>
          <div>
            <span>연동</span>
            <strong>운영일지 저장</strong>
          </div>
        </section>

        <div className={`inline-status ${message.includes('실패') ? 'danger' : ''}`}>{message}</div>

        <div className="program-journal-meta-grid">
          <label>
            <span>일자</span>
            <input type="date" value={draft.base.date} onChange={(event) => updateBase('date', event.target.value)} />
          </label>
          <label>
            <span>담당자</span>
            <input value={draft.base.manager} onChange={(event) => updateBase('manager', event.target.value)} placeholder="담당자명" />
          </label>
          <label>
            <span>운영시간</span>
            <input value={draft.base.operatingHours} onChange={(event) => updateBase('operatingHours', event.target.value)} placeholder="10:00 ~ 19:00" />
          </label>
          <label>
            <span>프로그램명</span>
            <input value={draft.programTitle} onChange={(event) => updateText('programTitle', event.target.value)} placeholder="예: FUN FUN 미술프로그램" />
          </label>
        </div>

        <div className="program-template-chips">
          {programJournalTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`program-template-chip ${draft.templateId === template.id ? 'active' : ''}`}
              onClick={() => applyTemplate(template)}
            >
              {template.title}
            </button>
          ))}
        </div>

        <div className="program-journal-sections">
          <label>
            <span>대상 및 참석 아동</span>
            <textarea
              rows={3}
              value={draft.targetSummary}
              onChange={(event) => updateText('targetSummary', event.target.value)}
              placeholder="참여 아동, 대상 그룹, 특이사항"
            />
          </label>
          <label>
            <span>담당 및 진행자</span>
            <textarea
              rows={3}
              value={draft.facilitatorSummary}
              onChange={(event) => updateText('facilitatorSummary', event.target.value)}
              placeholder="담당자, 외부 강사, 지원 인력"
            />
          </label>
          <label className="wide">
            <span>진행 내용</span>
            <textarea
              rows={8}
              value={draft.activitySummary}
              onChange={(event) => updateText('activitySummary', event.target.value)}
              placeholder="도입, 핵심 활동, 마무리 흐름을 적습니다."
            />
          </label>
          <label>
            <span>준비물 및 환경</span>
            <textarea
              rows={4}
              value={draft.setupSummary}
              onChange={(event) => updateText('setupSummary', event.target.value)}
              placeholder="교구, 환경 세팅, 안전 확인 사항"
            />
          </label>
          <label>
            <span>평가 및 다음 계획</span>
            <textarea
              rows={4}
              value={draft.reviewSummary}
              onChange={(event) => updateText('reviewSummary', event.target.value)}
              placeholder="참여도, 반응, 다음 회차 보완점"
            />
          </label>
          <label className="wide">
            <span>참석/연계 메모</span>
            <textarea
              rows={3}
              value={draft.attendanceSummary}
              onChange={(event) => updateText('attendanceSummary', event.target.value)}
              placeholder="외부 연계, 보호자 전달, 출석 요약 메모"
            />
          </label>
        </div>

        <div className="program-journal-actions">
          <button className="action-button" type="button" onClick={() => startNewDraft(selectedTemplate)}>
            새 일지
          </button>
          <button className="action-button primary" type="button" onClick={saveDraft} disabled={saving}>
            {saving ? '저장 중...' : '프로그램 일지 저장'}
          </button>
        </div>
      </div>
    </section>
  );
}
