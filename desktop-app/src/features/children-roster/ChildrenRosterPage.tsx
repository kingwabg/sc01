import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { yearOptions } from '../../app/navigation';
import { rebuildDedupedChildrenFromLocalData, saveChildYearRecord } from '../../data/dataProvider';
import { StatCard } from '../../shared/ui/StatCard';
import { compareTableValues, normalizeFilterText, SortableHeader, uniqueFilterOptions, usePersistentColumnWidths } from '../../shared/ui/data-table';
import type { SortDirection } from '../../shared/ui/data-table';
import type { Child, ChildAttendanceEntry, ChildYearRecord } from '../../types';

type ChildSortKey =
  | 'index'
  | 'name'
  | 'gender'
  | 'phone'
  | 'residentNo'
  | 'birthDate'
  | 'age'
  | 'school'
  | 'grade'
  | 'joinedAt'
  | 'address'
  | 'useType'
  | 'incomeLevel'
  | 'guardianName'
  | 'guardianRelation'
  | 'familyType'
  | 'guardianContact'
  | 'memo'
  | 'manager'
  | 'kidsId';

const CHILD_COLUMN_WIDTHS: Record<ChildSortKey, number> = {
  index: 64,
  name: 130,
  gender: 80,
  phone: 150,
  residentNo: 150,
  birthDate: 130,
  age: 84,
  school: 120,
  grade: 90,
  joinedAt: 130,
  address: 290,
  useType: 140,
  incomeLevel: 150,
  guardianName: 130,
  guardianRelation: 130,
  familyType: 130,
  guardianContact: 150,
  memo: 260,
  manager: 120,
  kidsId: 130
};

const attendanceLabel: Record<ChildAttendanceEntry['status'], string> = {
  present: '출석',
  absent: '결석',
  official: '공결',
  substitute: '대체출석',
  other: '기타'
};

const detailSections: Array<{
  title: string;
  rows: Array<{ label: string; key: keyof Child; type?: string; area?: boolean; options?: string[] }>;
}> = [
  {
    title: '개인 신청 및 신분 정보',
    rows: [
      { label: '이름', key: 'name' },
      { label: '성별', key: 'gender', options: ['', '남', '여'] },
      { label: '생년월일', key: 'birthDate', type: 'date' },
      { label: '연령', key: 'age' },
      { label: '학교', key: 'school' },
      { label: '학년', key: 'grade' },
      { label: '주소', key: 'address', area: true }
    ]
  },
  {
    title: '보호자 및 연락',
    rows: [
      { label: '보호자', key: 'guardianName' },
      { label: '관계', key: 'guardianRelation' },
      { label: '가족 유형', key: 'familyType' },
      { label: '보호자 연락처', key: 'guardianContact' },
      { label: '휴대폰', key: 'phone' },
      { label: '주민번호', key: 'residentNo' }
    ]
  },
  {
    title: '센터 이용 및 관리',
    rows: [
      { label: '상태', key: 'status', options: ['', '재원', '대기', '퇴소'] },
      { label: '입소일', key: 'joinedAt', type: 'date' },
      { label: '퇴소일', key: 'leftAt', type: 'date' },
      { label: '이용유형', key: 'useType' },
      { label: '기준 중위소득', key: 'incomeLevel' },
      { label: '담당자', key: 'manager' },
      { label: '키즈ID', key: 'kidsId' }
    ]
  }
];

function value(text?: string | number) {
  return String(text ?? '').trim() || '-';
}

function ageOf(row: Child) {
  if (row.age) return row.age;
  const year = Number((row.birthDate || '').slice(0, 4));
  if (!year) return '-';
  return String(new Date().getFullYear() - year + 1);
}

function mergeChildForYear(child: Child, record?: ChildYearRecord): Child {
  if (!record) return child;
  return {
    ...child,
    ...record,
    id: child.id
  };
}

function ChildDetailPage({
  child,
  attendance,
  availableYears,
  savedYears,
  selectedYear,
  onYearChange,
  onBack,
  onSaved
}: {
  child: Child;
  attendance: ChildAttendanceEntry[];
  availableYears: number[];
  savedYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  onBack: () => void;
  onSaved: (child: Child) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Child>(child);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft(child);
    setMessage('');
  }, [child]);

  const sortedAttendance = useMemo(
    () => [...attendance].sort((left, right) => right.date.localeCompare(left.date)),
    [attendance]
  );
  const attendanceSummary = sortedAttendance.reduce<Record<ChildAttendanceEntry['status'], number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, official: 0, substitute: 0, other: 0 });

  const updateDraft = (key: keyof Child, nextValue: string) => {
    setDraft((current) => ({ ...current, [key]: nextValue }));
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    setMessage(`${selectedYear}년 상세를 저장하는 중입니다.`);
    try {
      await onSaved(draft);
      setMessage(`${selectedYear}년 저장 완료`);
    } catch (error) {
      setMessage(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="child-detail-page">
      <header className="child-detail-page-hero panel">
        <div className="child-detail-page-topbar">
          <button className="icon-button child-detail-back-button" type="button" onClick={onBack} aria-label="아동 목록으로 돌아가기">
            ‹
          </button>
          <button className="action-button primary child-detail-save-button" type="button" onClick={saveDraft} disabled={saving}>
            {saving ? '저장 중' : `${selectedYear}년 저장`}
          </button>
        </div>

        <div className="child-detail-hero-grid">
          <div className="child-detail-avatar-card">
            <div className="child-detail-avatar">{draft.name.slice(0, 1) || '?'}</div>
          </div>

          <div className="child-detail-hero-copy">
            <div className="child-detail-hero-title-row">
              <h1>{draft.name}</h1>
              <span className="pill blue">{selectedYear} 년도 스냅샷</span>
            </div>
            <p>개인 데이터 보유 타임라인</p>

            <div className="child-detail-year-row">
              {availableYears.map((year) => (
                <button
                  className={year === selectedYear ? 'selected' : ''}
                  key={year}
                  type="button"
                  onClick={() => onYearChange(year)}
                >
                  {String(year).slice(2)} 년
                </button>
              ))}
            </div>

            <div className="child-detail-chip-row">
              <span className="child-detail-chip">{value(draft.school)}</span>
              <span className="child-detail-chip soft">{value(draft.manager)} 담당</span>
            </div>
          </div>
        </div>
      </header>

      <section className="child-detail-step-strip panel">
        <button className="active" type="button">1. 아동카드 (기본)</button>
        <button type="button">2. 관찰 일지</button>
        <button type="button">3. 전문상담</button>
        <button type="button">4. 고객지원</button>
      </section>

      <section className="child-detail-summary">
        <StatCard label={`${selectedYear}년 출결`} value={`${sortedAttendance.length}건`} />
        <StatCard label="출석" value={`${attendanceSummary.present || 0}건`} />
        <StatCard label="공결" value={`${attendanceSummary.official || 0}건`} />
        <StatCard label="결석" value={`${attendanceSummary.absent || 0}건`} tone={(attendanceSummary.absent || 0) ? 'warning' : ''} />
        <StatCard label="저장된 연도" value={savedYears.length ? savedYears.join(', ') : '-'} />
      </section>

      <section className="panel child-detail-page-card">
        <div className="child-detail-page-card-head">
          <div>
            <span className="data-table-eyebrow">데이터베이스: {savedYears.includes(selectedYear) ? '연도 저장본' : '기본값'}</span>
            <h2>개인 신청 및 신분 정보 ({selectedYear})</h2>
          </div>
          <div className="child-detail-page-card-status">
            <span className={`pill ${draft.status === '퇴소' ? 'red' : draft.status === '대기' ? 'amber' : 'green'}`}>{value(draft.status)}</span>
            <span className="muted">최근 출결 {sortedAttendance[0]?.date || '-'}</span>
          </div>
        </div>

        {message && <div className={`inline-status ${message.includes('실패') ? 'danger' : ''}`}>{message}</div>}

        <div className="child-detail-page-sections">
          {detailSections.map((section) => (
            <article className="child-detail-section" key={section.title}>
              <h3>{section.title}</h3>
              <div className="child-detail-form-grid">
                {section.rows.map((field) => (
                  <label className={field.area ? 'wide' : ''} key={field.key}>
                    <span>{field.label}</span>
                    {field.options ? (
                      <select value={String(draft[field.key] ?? '')} onChange={(event) => updateDraft(field.key, event.target.value)}>
                        {field.options.map((option) => <option key={option || 'blank'} value={option}>{option || '선택 안 함'}</option>)}
                      </select>
                    ) : field.area ? (
                      <textarea value={String(draft[field.key] ?? '')} onChange={(event) => updateDraft(field.key, event.target.value)} />
                    ) : (
                      <input type={field.type || 'text'} value={String(draft[field.key] ?? '')} onChange={(event) => updateDraft(field.key, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="child-detail-page-bottom-grid">
        <article className="panel child-detail-section">
          <h3>{selectedYear}년 최근 출결</h3>
          <div className="child-detail-attendance-table">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>상태</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttendance.slice(0, 12).map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td><span className={`pill ${item.status === 'absent' ? 'red' : item.status === 'official' ? 'amber' : 'green'}`}>{attendanceLabel[item.status]}</span></td>
                    <td>{value(item.memo)}</td>
                  </tr>
                ))}
                {!sortedAttendance.length && (
                  <tr>
                    <td colSpan={3} className="empty-row">선택한 연도의 출결 기록이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel child-detail-section">
          <h3>비고</h3>
          <textarea
            className="child-detail-memo-input"
            value={draft.memo || ''}
            onChange={(event) => updateDraft('memo', event.target.value)}
            placeholder={`${selectedYear}년 아동 메모를 입력하세요.`}
          />
        </article>
      </section>
    </section>
  );
}

export function ChildrenRosterPage({
  rows,
  childAttendance,
  childYearRecords,
  onDeduped,
  onChildSaved
}: {
  rows: Child[];
  childAttendance: ChildAttendanceEntry[];
  childYearRecords: ChildYearRecord[];
  onDeduped: (message: string) => void;
  onChildSaved: (message: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [genderFilter, setGenderFilter] = useState('전체');
  const [schoolFilter, setSchoolFilter] = useState('전체');
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [useTypeFilter, setUseTypeFilter] = useState('전체');
  const [managerFilter, setManagerFilter] = useState('전체');
  const [sortKey, setSortKey] = useState<ChildSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedId, setSelectedId] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [dedupeMessage, setDedupeMessage] = useState('');
  const [directEditMode, setDirectEditMode] = useState(false);
  const [directEditDrafts, setDirectEditDrafts] = useState<Record<string, Partial<Child>>>({});
  const [savingDirectEditId, setSavingDirectEditId] = useState('');
  const { widths: childColumnWidths, beginResize: beginChildColumnResize } = usePersistentColumnWidths<ChildSortKey>('children', CHILD_COLUMN_WIDTHS);
  const childTableMinWidth = Object.values(childColumnWidths).reduce((sum, width) => sum + width, 0) + (directEditMode ? 112 : 0);
  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(today);

  const availableYears = useMemo(() => {
    return Array.from(new Set([
      ...yearOptions,
      currentYear,
      ...rows.map((row) => Number((row.joinedAt || '').slice(0, 4))).filter(Boolean),
      ...childAttendance.map((entry) => Number(entry.date.slice(0, 4))).filter(Boolean),
      ...childYearRecords.map((record) => record.year).filter(Boolean)
    ])).sort((left, right) => left - right);
  }, [childAttendance, childYearRecords, currentYear, rows]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[availableYears.length - 1] || currentYear);
    }
  }, [availableYears, currentYear, selectedYear]);

  const yearRecordMap = useMemo(
    () => new Map(childYearRecords.map((record) => [`${record.childId}:${record.year}`, record])),
    [childYearRecords]
  );

  const yearScopedRows = useMemo(
    () => rows.map((row) => mergeChildForYear(row, yearRecordMap.get(`${row.id}:${selectedYear}`))),
    [rows, selectedYear, yearRecordMap]
  );

  const active = yearScopedRows.filter((row) => row.status !== '퇴소');
  const birthdayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const birthdayRows = active.filter((row) => (row.birthDate || '').slice(5, 7) === birthdayMonth);
  const storedYearCount = childYearRecords.filter((record) => record.year === selectedYear).length;
  const statusOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.status), [yearScopedRows]);
  const genderOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.gender), [yearScopedRows]);
  const schoolOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.school), [yearScopedRows]);
  const gradeOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.grade), [yearScopedRows]);
  const useTypeOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.useType || row.vulnerableType), [yearScopedRows]);
  const managerOptions = useMemo(() => uniqueFilterOptions(yearScopedRows, (row) => row.manager), [yearScopedRows]);

  const hasChildFilters = Boolean(
    query.trim()
      || statusFilter !== '전체'
      || genderFilter !== '전체'
      || schoolFilter !== '전체'
      || gradeFilter !== '전체'
      || useTypeFilter !== '전체'
      || managerFilter !== '전체'
  );

  const setChildSort = (nextKey: ChildSortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const resetChildFilters = () => {
    setQuery('');
    setStatusFilter('전체');
    setGenderFilter('전체');
    setSchoolFilter('전체');
    setGradeFilter('전체');
    setUseTypeFilter('전체');
    setManagerFilter('전체');
  };

  const filteredRows = useMemo(() => {
    const keyword = normalizeFilterText(query);
    const getSortValue = (row: Child, index: number) => {
      if (sortKey === 'index') return index + 1;
      if (sortKey === 'age') return Number(ageOf(row)) || 0;
      if (sortKey === 'useType') return row.useType || row.vulnerableType || '';
      return row[sortKey] ?? '';
    };
    return yearScopedRows
      .filter((row) => {
        const matchesQuery = !keyword || [
          row.name,
          row.gender,
          row.phone,
          row.residentNo,
          row.birthDate,
          ageOf(row),
          row.school,
          row.grade,
          row.joinedAt,
          row.address,
          row.useType,
          row.incomeLevel,
          row.guardianName,
          row.guardianRelation,
          row.familyType,
          row.guardianContact,
          row.vulnerableType,
          row.status,
          row.memo,
          row.manager,
          row.kidsId
        ].some((item) => normalizeFilterText(item).includes(keyword));
        return matchesQuery
          && (statusFilter === '전체' || row.status === statusFilter)
          && (genderFilter === '전체' || row.gender === genderFilter)
          && (schoolFilter === '전체' || row.school === schoolFilter)
          && (gradeFilter === '전체' || row.grade === gradeFilter)
          && (useTypeFilter === '전체' || (row.useType || row.vulnerableType) === useTypeFilter)
          && (managerFilter === '전체' || row.manager === managerFilter);
      })
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const priority = (left.row.status === '퇴소' ? 1 : 0) - (right.row.status === '퇴소' ? 1 : 0);
        if (sortKey === 'name' && priority) return priority;
        const result = compareTableValues(getSortValue(left.row, left.index), getSortValue(right.row, right.index));
        return sortDirection === 'asc' ? result : -result;
      })
      .map(({ row }) => row);
  }, [yearScopedRows, query, statusFilter, genderFilter, schoolFilter, gradeFilter, useTypeFilter, managerFilter, sortKey, sortDirection]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedId('');
      return;
    }
    if (!filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(filteredRows[0].id);
    }
  }, [filteredRows, selectedId]);

  const selectedBaseChild = rows.find((row) => row.id === selectedId) || rows[0] || null;
  const selectedYearRecord = selectedBaseChild ? yearRecordMap.get(`${selectedBaseChild.id}:${selectedYear}`) : undefined;
  const selectedChild = selectedBaseChild ? mergeChildForYear(selectedBaseChild, selectedYearRecord) : null;
  const selectedChildAttendance = useMemo(
    () => selectedBaseChild
      ? childAttendance.filter((item) => item.childId === selectedBaseChild.id && item.date.startsWith(`${selectedYear}-`))
      : [],
    [childAttendance, selectedBaseChild, selectedYear]
  );
  const selectedChildSavedYears = selectedBaseChild
    ? childYearRecords
        .filter((record) => record.childId === selectedBaseChild.id)
        .map((record) => record.year)
        .sort((left, right) => left - right)
    : [];

  const getDirectEditDraft = (row: Child) => ({
    ...row,
    ...(directEditDrafts[row.id] || {})
  });

  const updateDirectEditDraft = (childId: string, key: keyof Child, nextValue: string) => {
    setDirectEditDrafts((current) => ({
      ...current,
      [childId]: {
        ...(current[childId] || {}),
        [key]: nextValue
      }
    }));
  };

  const saveDirectEditRow = async (row: Child) => {
    if (savingDirectEditId) return;
    const draft = getDirectEditDraft(row);
    const yearRecord = yearRecordMap.get(`${row.id}:${selectedYear}`);
    setSavingDirectEditId(row.id);
    try {
      const saved = await saveChildYearRecord({
        ...draft,
        id: yearRecord?.id || `child-year-${row.id}-${selectedYear}`,
        childId: row.id,
        year: selectedYear
      });
      setDirectEditDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      onChildSaved(`화면 직접 수정 저장 완료: ${saved.name} (${selectedYear}년)`);
    } catch (error) {
      onChildSaved(`화면 직접 수정 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingDirectEditId('');
    }
  };

  const renderDirectEditInput = (row: Child, key: keyof Child, options?: string[]) => {
    const draft = getDirectEditDraft(row);
    const fieldValue = String(draft[key] ?? '');
    const common = {
      value: fieldValue,
      onClick: (event: MouseEvent) => event.stopPropagation(),
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => updateDirectEditDraft(row.id, key, event.target.value)
    };
    if (options) {
      return (
        <select className="direct-edit-control" {...common}>
          {options.map((option) => <option key={option || 'blank'} value={option}>{option || '선택 안 함'}</option>)}
        </select>
      );
    }
    return <input className="direct-edit-control" {...common} />;
  };

  const rebuildRoster = async () => {
    if (deduping) return;
    setDeduping(true);
    setDedupeMessage('중복 아동을 정리하는 중입니다.');
    try {
      const result = await rebuildDedupedChildrenFromLocalData();
      const nextMessage = `아동 명단 정리 완료: ${result.before}명 -> ${result.after}명, 중복 ${result.removed}건 정리`;
      setDedupeMessage(nextMessage);
      onDeduped(nextMessage);
    } catch (error) {
      setDedupeMessage(`아동 명단 정리 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeduping(false);
    }
  };

  if (detailViewOpen && selectedChild && selectedBaseChild) {
    return (
      <ChildDetailPage
        child={selectedChild}
        attendance={selectedChildAttendance}
        availableYears={availableYears}
        savedYears={selectedChildSavedYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onBack={() => setDetailViewOpen(false)}
        onSaved={async (nextChild) => {
          const saved = await saveChildYearRecord({
            ...nextChild,
            id: selectedYearRecord?.id || `child-year-${selectedBaseChild.id}-${selectedYear}`,
            childId: selectedBaseChild.id,
            year: selectedYear
          });
          setSelectedId(saved.childId);
          onChildSaved(`아동 상세 저장 완료: ${saved.name} (${selectedYear}년)`);
        }}
      />
    );
  }

  return (
    <section className="child-workspace">
      <section className="child-ledger-header">
        <div className="child-ledger-metric">
          <span>{selectedYear}년 저장본</span>
          <strong>{storedYearCount}건</strong>
        </div>
        <div className="child-ledger-metric highlight">
          <span>현원 인원</span>
          <strong>{active.length}명</strong>
        </div>
        <div className="child-ledger-metric today">
          <span>오늘 날짜</span>
          <strong>{todayLabel}</strong>
        </div>
        <div className="child-ledger-metric">
          <span>{today.getMonth() + 1}월 생일자</span>
          <strong>{birthdayRows.length}명</strong>
        </div>
      </section>

      <section className="child-ledger-toolbar panel data-table-toolbar child-data-toolbar">
        <div>
          <span className="data-table-eyebrow">연도별 아동 상세 화면</span>
          <h2>아동 리스트</h2>
          <p>{filteredRows.length} / {rows.length}명 표시 중 · 행을 누르면 상세 화면으로 이동합니다.</p>
        </div>
        <div className="child-ledger-actions data-table-controls child-ledger-filter-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 학교, 보호자, 연락처 검색"
          />
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {availableYears.map((year) => <option key={year} value={year}>{year}년 기준</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="전체">상태 전체</option>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="전체">성별 전체</option>
            {genderOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}>
            <option value="전체">학교 전체</option>
            {schoolOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
            <option value="전체">학년 전체</option>
            {gradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={useTypeFilter} onChange={(event) => setUseTypeFilter(event.target.value)}>
            <option value="전체">이용유형 전체</option>
            {useTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)}>
            <option value="전체">담당자 전체</option>
            {managerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button className="action-button" type="button" onClick={resetChildFilters} disabled={!hasChildFilters}>
            초기화
          </button>
          <button
            className={`action-button ${directEditMode ? 'primary' : ''}`}
            type="button"
            onClick={() => setDirectEditMode((value) => !value)}
          >
            화면 직접 수정
          </button>
          <button className="action-button" type="button" onClick={rebuildRoster} disabled={deduping}>
            {deduping ? '정리 중...' : '중복 정리'}
          </button>
        </div>
      </section>

      <div className="data-table-active-filters">
        <span>기준 연도: {selectedYear}년</span>
        <span>정렬: {sortDirection === 'asc' ? '오름차순' : '내림차순'}</span>
        {query.trim() && <span>검색어: {query.trim()}</span>}
        {statusFilter !== '전체' && <span>상태: {statusFilter}</span>}
        {genderFilter !== '전체' && <span>성별: {genderFilter}</span>}
        {schoolFilter !== '전체' && <span>학교: {schoolFilter}</span>}
        {gradeFilter !== '전체' && <span>학년: {gradeFilter}</span>}
        {useTypeFilter !== '전체' && <span>이용유형: {useTypeFilter}</span>}
        {managerFilter !== '전체' && <span>담당자: {managerFilter}</span>}
      </div>
      {dedupeMessage && <div className={`inline-status ${dedupeMessage.includes('실패') ? 'danger' : ''}`}>{dedupeMessage}</div>}

      <div className="table-card child-ledger-table">
        <table style={{ minWidth: childTableMinWidth }}>
          <thead>
            <tr>
              <SortableHeader label="번호" sortKey="index" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.index} onSort={setChildSort} onResizeStart={beginChildColumnResize} className="number-col" />
              <SortableHeader label="이름" sortKey="name" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.name} onSort={setChildSort} onResizeStart={beginChildColumnResize} className="sticky-col" />
              <SortableHeader label="성별" sortKey="gender" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.gender} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="휴대폰" sortKey="phone" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.phone} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="주민번호" sortKey="residentNo" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.residentNo} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="생년월일" sortKey="birthDate" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.birthDate} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="연령" sortKey="age" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.age} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="학교" sortKey="school" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.school} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="학년" sortKey="grade" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.grade} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="입소일" sortKey="joinedAt" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.joinedAt} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="주소" sortKey="address" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.address} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="이용유형" sortKey="useType" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.useType} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="기준 중위소득" sortKey="incomeLevel" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.incomeLevel} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="보호자" sortKey="guardianName" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.guardianName} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="보호자 관계" sortKey="guardianRelation" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.guardianRelation} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="유형" sortKey="familyType" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.familyType} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="연락처" sortKey="guardianContact" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.guardianContact} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="비고" sortKey="memo" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.memo} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="담당자" sortKey="manager" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.manager} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              <SortableHeader label="키즈ID" sortKey="kidsId" activeKey={sortKey} direction={sortDirection} width={childColumnWidths.kidsId} onSort={setChildSort} onResizeStart={beginChildColumnResize} />
              {directEditMode && <th className="direct-edit-action-col">저장</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr
                key={row.id}
                className={selectedChild?.id === row.id ? 'selected' : ''}
                onClick={() => {
                  if (directEditMode) return;
                  setSelectedId(row.id);
                  setDetailViewOpen(true);
                }}
                onKeyDown={(event) => {
                  if (!directEditMode && event.key === 'Enter') {
                    setSelectedId(row.id);
                    setDetailViewOpen(true);
                  }
                }}
                tabIndex={0}
              >
                <td className="number-col">{index + 1}</td>
                <td className="name-cell sticky-col">{directEditMode ? renderDirectEditInput(row, 'name') : row.name}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'gender', ['', '남', '여']) : value(row.gender)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'phone') : value(row.phone)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'residentNo') : value(row.residentNo)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'birthDate') : value(row.birthDate)}</td>
                <td>{ageOf(row)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'school') : value(row.school)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'grade') : value(row.grade)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'joinedAt') : value(row.joinedAt)}</td>
                <td className="long-cell">{directEditMode ? renderDirectEditInput(row, 'address') : value(row.address)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'useType') : <span className="pill greenish">{value(row.useType || row.vulnerableType)}</span>}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'incomeLevel') : value(row.incomeLevel)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'guardianName') : value(row.guardianName)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'guardianRelation') : value(row.guardianRelation)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'familyType') : <span className="pill blue">{value(row.familyType)}</span>}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'guardianContact') : value(row.guardianContact)}</td>
                <td className="long-cell">{directEditMode ? renderDirectEditInput(row, 'memo') : value(row.memo)}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'manager') : <span className="pill amber">{value(row.manager)}</span>}</td>
                <td>{directEditMode ? renderDirectEditInput(row, 'kidsId') : value(row.kidsId || row.id)}</td>
                {directEditMode && (
                  <td className="direct-edit-action-col">
                    <button
                      className="action-button small"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void saveDirectEditRow(row);
                      }}
                      disabled={savingDirectEditId === row.id}
                    >
                      {savingDirectEditId === row.id ? '저장 중' : '저장'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!filteredRows.length && (
              <tr>
                <td colSpan={directEditMode ? 21 : 20} className="empty-row">조건에 맞는 아동이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
