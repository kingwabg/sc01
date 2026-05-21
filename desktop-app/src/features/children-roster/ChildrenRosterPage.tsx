import { useEffect, useMemo, useState } from 'react';
import type { Child, ChildAttendanceEntry } from '../../types';
import { rebuildDedupedChildrenFromLocalData, saveChildRecord } from '../../data/dataProvider';
import { StatCard } from '../../shared/ui/StatCard';
import { compareTableValues, normalizeFilterText, SortableHeader, uniqueFilterOptions, usePersistentColumnWidths } from '../../shared/ui/data-table';
import type { SortDirection } from '../../shared/ui/data-table';

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

function ChildDetailModal({
  child,
  attendance,
  onClose,
  onSaved
}: {
  child: Child;
  attendance: ChildAttendanceEntry[];
  onClose: () => void;
  onSaved: (child: Child) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Child>(child);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const value = (text?: string | number) => String(text ?? '').trim() || '-';
  const statusLabel: Record<ChildAttendanceEntry['status'], string> = {
    present: '출석',
    absent: '결석',
    official: '공결',
    substitute: '대체출석',
    other: '기타'
  };
  const sortedAttendance = useMemo(
    () => [...attendance].sort((left, right) => right.date.localeCompare(left.date)),
    [attendance]
  );
  const attendanceSummary = sortedAttendance.reduce<Record<ChildAttendanceEntry['status'], number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { present: 0, absent: 0, official: 0, substitute: 0, other: 0 });
  const totalRecords = sortedAttendance.length;
  const recentDate = sortedAttendance[0]?.date || '-';

  useEffect(() => {
    setDraft(child);
    setMessage('');
  }, [child]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const updateDraft = (key: keyof Child, nextValue: string) => {
    setDraft((current) => ({ ...current, [key]: nextValue }));
  };

  const saveDraft = async () => {
    if (saving) return;
    setSaving(true);
    setMessage('저장 중입니다.');
    try {
      await onSaved(draft);
      setMessage('저장 완료');
    } catch (error) {
      setMessage(`저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const editableSections: Array<{
    title: string;
    rows: Array<{ label: string; key: keyof Child; type?: string; area?: boolean; options?: string[] }>;
  }> = [
    {
      title: '기본 정보',
      rows: [
        { label: '이름', key: 'name' },
        { label: '성별', key: 'gender', options: ['', '남', '여'] },
        { label: '생년월일', key: 'birthDate', type: 'date' },
        { label: '연령', key: 'age' },
        { label: '학교', key: 'school' },
        { label: '학년', key: 'grade' },
        { label: '이용유형', key: 'useType' },
        { label: '기준 중위소득', key: 'incomeLevel' }
      ]
    },
    {
      title: '보호자',
      rows: [
        { label: '보호자', key: 'guardianName' },
        { label: '관계', key: 'guardianRelation' },
        { label: '가족 유형', key: 'familyType' },
        { label: '연락처', key: 'guardianContact' },
        { label: '휴대폰', key: 'phone' },
        { label: '주소', key: 'address', area: true }
      ]
    },
    {
      title: '입소 및 관리',
      rows: [
        { label: '상태', key: 'status', options: ['', '재원', '대기', '퇴소'] },
        { label: '입소일', key: 'joinedAt', type: 'date' },
        { label: '퇴소일', key: 'leftAt', type: 'date' },
        { label: '담당자', key: 'manager' },
        { label: '키즈ID', key: 'kidsId' },
        { label: '주민번호', key: 'residentNo' }
      ]
    }
  ];

  return (
    <div className="detail-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="child-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="child-detail-modal-header">
          <div>
            <span className={`pill ${draft.status === '퇴소' ? 'red' : draft.status === '대기' ? 'amber' : 'green'}`}>{value(draft.status)}</span>
            <h2>{draft.name}</h2>
            <p>{value(draft.school)} · {value(draft.grade)} · 담당 {value(draft.manager)}</p>
          </div>
          <div className="child-detail-modal-actions">
            <button className="action-button primary" type="button" onClick={saveDraft} disabled={saving}>
              {saving ? '저장 중' : '저장'}
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="상세보기 닫기">×</button>
          </div>
        </header>
        {message && <div className={`inline-status ${message.includes('실패') ? 'danger' : ''}`}>{message}</div>}

        <div className="child-detail-summary">
          <StatCard label="출결 기록" value={`${totalRecords}건`} />
          <StatCard label="출석" value={`${attendanceSummary.present || 0}건`} />
          <StatCard label="공결" value={`${attendanceSummary.official || 0}건`} />
          <StatCard label="결석" value={`${attendanceSummary.absent || 0}건`} tone={(attendanceSummary.absent || 0) ? 'warning' : ''} />
          <StatCard label="최근 기록" value={recentDate} />
        </div>

        <div className="child-detail-modal-grid">
          {editableSections.map((section) => (
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

        <article className="child-detail-section full">
          <h3>최근 출결</h3>
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
                {sortedAttendance.slice(0, 20).map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td><span className={`pill ${item.status === 'absent' ? 'red' : item.status === 'official' ? 'amber' : 'green'}`}>{statusLabel[item.status]}</span></td>
                    <td>{value(item.memo)}</td>
                  </tr>
                ))}
                {!sortedAttendance.length && (
                  <tr>
                    <td colSpan={3} className="empty-row">출결 기록이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="child-detail-section full">
          <h3>비고</h3>
          <textarea className="child-detail-memo-input" value={draft.memo || ''} onChange={(event) => updateDraft('memo', event.target.value)} placeholder="아동 관련 메모를 입력하세요." />
        </article>
      </section>
    </div>
  );
}

export function ChildrenRosterPage({
  rows,
  childAttendance,
  onDeduped,
  onChildSaved
}: {
  rows: Child[];
  childAttendance: ChildAttendanceEntry[];
  onDeduped: (message: string) => void;
  onChildSaved: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [genderFilter, setGenderFilter] = useState('전체');
  const [schoolFilter, setSchoolFilter] = useState('전체');
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [useTypeFilter, setUseTypeFilter] = useState('전체');
  const [managerFilter, setManagerFilter] = useState('전체');
  const [sortKey, setSortKey] = useState<ChildSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { widths: childColumnWidths, beginResize: beginChildColumnResize } = usePersistentColumnWidths<ChildSortKey>('children', CHILD_COLUMN_WIDTHS);
  const childTableMinWidth = Object.values(childColumnWidths).reduce((sum, width) => sum + width, 0);
  const [selectedId, setSelectedId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [dedupeMessage, setDedupeMessage] = useState('');
  const today = new Date();
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(today);
  const active = rows.filter((row) => row.status !== '퇴소');
  const inactive = rows.filter((row) => row.status === '퇴소');
  const birthdayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const birthdayRows = active.filter((row) => (row.birthDate || '').slice(5, 7) === birthdayMonth);
  const value = (text?: string | number) => String(text ?? '').trim() || '-';
  const ageOf = (row: Child) => {
    if (row.age) return row.age;
    const year = Number((row.birthDate || '').slice(0, 4));
    if (!year) return '-';
    return String(today.getFullYear() - year + 1);
  };
  const statusOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.status), [rows]);
  const genderOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.gender), [rows]);
  const schoolOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.school), [rows]);
  const gradeOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.grade), [rows]);
  const useTypeOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.useType || row.vulnerableType), [rows]);
  const managerOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.manager), [rows]);
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
    return rows
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
  }, [rows, query, statusFilter, genderFilter, schoolFilter, gradeFilter, useTypeFilter, managerFilter, sortKey, sortDirection]);
  const selectedChild = filteredRows.find((row) => row.id === selectedId) || filteredRows[0] || rows[0];
  const selectedChildAttendance = useMemo(
    () => selectedChild ? childAttendance.filter((item) => item.childId === selectedChild.id) : [],
    [childAttendance, selectedChild]
  );
  const detailRows = selectedChild
    ? [
        ['이름', selectedChild.name],
        ['성별', selectedChild.gender],
        ['휴대폰', selectedChild.phone],
        ['생년월일', selectedChild.birthDate],
        ['연령', ageOf(selectedChild)],
        ['학교/학년', `${value(selectedChild.school)} / ${value(selectedChild.grade)}`],
        ['입소일', selectedChild.joinedAt],
        ['주소', selectedChild.address],
        ['이용유형', selectedChild.useType || selectedChild.vulnerableType],
        ['기준 중위소득', selectedChild.incomeLevel],
        ['보호자', selectedChild.guardianName],
        ['보호자 관계', selectedChild.guardianRelation],
        ['가족 유형', selectedChild.familyType],
        ['연락처', selectedChild.guardianContact],
        ['담당자', selectedChild.manager],
        ['키즈ID', selectedChild.kidsId],
        ['비고', selectedChild.memo]
      ]
    : [];
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

  return (
    <section className="child-workspace">
      <section className="child-ledger-header">
        <div className="child-ledger-metric">
          <span>정원</span>
          <strong>35명</strong>
        </div>
        <div className="child-ledger-metric highlight">
          <span>1. 현원 인원</span>
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
          <span className="data-table-eyebrow">OpenStatus 스타일 필터</span>
          <h2>아동 리스트</h2>
          <p>{filteredRows.length} / {rows.length}명 표시 중 · 행을 클릭하면 오른쪽 상세 정보가 열립니다.</p>
        </div>
        <div className="child-ledger-actions data-table-controls child-ledger-filter-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 학교, 보호자, 연락처 검색"
          />
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
          <button className="action-button" type="button" onClick={rebuildRoster} disabled={deduping}>
            {deduping ? '정리 중...' : '중복 정리'}
          </button>
        </div>
      </section>
      <div className="data-table-active-filters">
        <span>정렬: {sortDirection === 'asc' ? '오름차순' : '내림차순'}</span>
        {query.trim() && <span>검색어: {query.trim()}</span>}
        {statusFilter !== '전체' && <span>상태: {statusFilter}</span>}
        {genderFilter !== '전체' && <span>성별: {genderFilter}</span>}
        {schoolFilter !== '전체' && <span>학교: {schoolFilter}</span>}
        {gradeFilter !== '전체' && <span>학년: {gradeFilter}</span>}
        {useTypeFilter !== '전체' && <span>이용유형: {useTypeFilter}</span>}
        {managerFilter !== '전체' && <span>담당자: {managerFilter}</span>}
      </div>
      {dedupeMessage && <div className="inline-status">{dedupeMessage}</div>}

      <div className="child-ledger-layout">
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
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr
                  key={row.id}
                  className={selectedChild?.id === row.id ? 'selected' : ''}
                  onClick={() => setSelectedId(row.id)}
                  onDoubleClick={() => {
                    setSelectedId(row.id);
                    setDetailOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setSelectedId(row.id);
                      setDetailOpen(true);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="number-col">{index + 1}</td>
                  <td className="name-cell sticky-col">{row.name}</td>
                  <td>{value(row.gender)}</td>
                  <td>{value(row.phone)}</td>
                  <td>{value(row.residentNo)}</td>
                  <td>{value(row.birthDate)}</td>
                  <td>{ageOf(row)}</td>
                  <td>{value(row.school)}</td>
                  <td>{value(row.grade)}</td>
                  <td>{value(row.joinedAt)}</td>
                  <td className="long-cell">{value(row.address)}</td>
                  <td><span className="pill greenish">{value(row.useType || row.vulnerableType)}</span></td>
                  <td>{value(row.incomeLevel)}</td>
                  <td>{value(row.guardianName)}</td>
                  <td>{value(row.guardianRelation)}</td>
                  <td><span className="pill blue">{value(row.familyType)}</span></td>
                  <td>{value(row.guardianContact)}</td>
                  <td className="long-cell">{value(row.memo)}</td>
                  <td><span className="pill amber">{value(row.manager)}</span></td>
                  <td>{value(row.kidsId || row.id)}</td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={20} className="empty-row">조건에 맞는 아동이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="panel child-detail-panel">
          <div className="child-detail-head">
            <span className="pill green">{selectedChild?.status || '-'}</span>
            <h2>{selectedChild?.name || '아동 선택'}</h2>
            <p>{selectedChild ? `${value(selectedChild.school)} · ${value(selectedChild.grade)}` : '왼쪽 표에서 아동을 클릭하세요.'}</p>
            <button className="action-button primary" type="button" onClick={() => setDetailOpen(true)} disabled={!selectedChild}>
              상세보기
            </button>
          </div>
          <div className="child-detail-grid">
            {detailRows.map(([label, text]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value(text)}</strong>
              </div>
            ))}
          </div>
          <div className="child-detail-note">
            <strong>빠른 확인</strong>
            <span>전체 {rows.length}명 · 재원 {active.length}명 · 퇴소 {inactive.length}명</span>
          </div>
        </aside>
      </div>
      {detailOpen && selectedChild && (
        <ChildDetailModal
          child={selectedChild}
          attendance={selectedChildAttendance}
          onSaved={async (nextChild) => {
            const saved = await saveChildRecord(nextChild);
            setSelectedId(saved.id);
            onChildSaved(`아동 상세 저장 완료: ${saved.name}`);
          }}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </section>
  );
}
