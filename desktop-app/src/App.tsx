import { useEffect, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { AttendanceEntry, Child, ChildAttendanceEntry, DashboardSnapshot, ImportSummary, InitialImportPayload, Person } from './types';
import { AppShell } from './app/AppShell';
import { yearOptions } from './app/navigation';
import type { ViewKey } from './app/navigation';
import { getDataProviderLabel, loadDashboardSnapshot, rebuildDedupedChildrenFromLocalData, replaceLocalDatabaseFromImport, saveChildRecord, saveJournalEntry } from './data/dataProvider';
import { fetchInitialSpreadsheetSnapshot } from './data/sheetSync';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ChildAttendancePage } from './features/child-attendance/ChildAttendancePage';
import { JournalCreatePage } from './features/journal-create/JournalCreatePage';
import { JournalEditPage } from './features/journal-edit/JournalEditPage';
import { JournalTemplatePage } from './features/journal-template/JournalTemplatePage';
import { ProgramPlansPage } from './features/program-plans/ProgramPlansPage';
import { StatisticsPage } from './features/statistics/StatisticsPage';
import { useMediaQuery } from './shared/hooks/useMediaQuery';
import { safeRows } from './shared/lib/arrays';
import { EmptyState } from './shared/ui/EmptyState';
import { Panel } from './shared/ui/Panel';
import { StatCard } from './shared/ui/StatCard';
import { ViewErrorBoundary } from './shared/ui/ViewErrorBoundary';
import { PreviewModeTabs, RhwpEditorPane as SharedRhwpEditorPane } from './shared/ui/document-preview';

type SortDirection = 'asc' | 'desc';
type PeopleSortKey = 'index' | 'name' | 'role' | 'category' | 'status' | 'startedAt' | 'endedAt' | 'dutyText';
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

const PEOPLE_COLUMN_WIDTHS: Record<PeopleSortKey, number> = {
  index: 72,
  name: 150,
  role: 170,
  category: 140,
  status: 120,
  startedAt: 150,
  endedAt: 150,
  dutyText: 320
};

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

function normalizeFilterText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function compareTableValues(left: unknown, right: unknown) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'ko-KR', {
    numeric: true,
    sensitivity: 'base'
  });
}

function uniqueFilterOptions<T>(rows: T[], read: (row: T) => unknown) {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = String(read(row) ?? '').trim();
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => compareTableValues(a, b));
}

function loadStoredColumnWidths<Key extends string>(storageKey: string, defaults: Record<Key, number>) {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<Key, number>>;
    return Object.keys(defaults).reduce((next, key) => {
      const typedKey = key as Key;
      const stored = Number(parsed[typedKey]);
      next[typedKey] = Number.isFinite(stored) && stored >= 48 ? stored : defaults[typedKey];
      return next;
    }, { ...defaults } as Record<Key, number>);
  } catch {
    return defaults;
  }
}

function usePersistentColumnWidths<Key extends string>(storageName: string, defaults: Record<Key, number>) {
  const storageKey = `seochang:column-widths:${storageName}`;
  const [widths, setWidths] = useState<Record<Key, number>>(() => loadStoredColumnWidths(storageKey, defaults));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      // localStorage가 잠긴 환경에서는 현재 화면에서만 너비를 유지합니다.
    }
  }, [storageKey, widths]);

  const beginResize = (key: Key, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widths[key] || defaults[key] || 120;
    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(680, Math.max(48, startWidth + moveEvent.clientX - startX));
      setWidths((current) => ({ ...current, [key]: nextWidth }));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      document.body.classList.remove('column-resizing');
    };
    document.body.classList.add('column-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  };

  return { widths, beginResize };
}

function SortableHeader<Key extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  className,
  width,
  onSort,
  onResizeStart
}: {
  label: string;
  sortKey: Key;
  activeKey: Key;
  direction: SortDirection;
  className?: string;
  width?: number;
  onSort: (key: Key) => void;
  onResizeStart?: (key: Key, event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={['resizable-th', className].filter(Boolean).join(' ')} style={width ? { width, minWidth: width } : undefined}>
      <button
        className={`sortable-header-button ${active ? 'active' : ''}`}
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`${label} 정렬`}
      >
        <span>{label}</span>
        <span className="sort-indicator">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
      {onResizeStart && (
        <span
          className="column-resize-handle"
          role="separator"
          aria-label={`${label} 너비 조절`}
          onPointerDown={(event) => onResizeStart(sortKey, event)}
        />
      )}
    </th>
  );
}

function PeopleTable({ rows, title = '인력 데이터', storageKey = 'people' }: { rows: Person[]; title?: string; storageKey?: string }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [sortKey, setSortKey] = useState<PeopleSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { widths: columnWidths, beginResize: beginColumnResize } = usePersistentColumnWidths<PeopleSortKey>(storageKey, PEOPLE_COLUMN_WIDTHS);
  const tableMinWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
  const categoryOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.category), [rows]);
  const statusOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.status), [rows]);
  const roleOptions = useMemo(() => uniqueFilterOptions(rows, (row) => row.role), [rows]);
  const hasFilters = Boolean(query.trim() || categoryFilter !== '전체' || statusFilter !== '전체' || roleFilter !== '전체');
  const setSort = (nextKey: PeopleSortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  };
  const resetFilters = () => {
    setQuery('');
    setCategoryFilter('전체');
    setStatusFilter('전체');
    setRoleFilter('전체');
  };
  const filteredRows = useMemo(() => {
    const keyword = normalizeFilterText(query);
    const matchesKeyword = (row: Person) => !keyword || [
      row.name,
      row.email,
      row.role,
      row.category,
      row.status,
      row.startedAt,
      row.endedAt,
      row.dutyText
    ].some((value) => normalizeFilterText(value).includes(keyword));
    const getSortValue = (row: Person, index: number) => {
      if (sortKey === 'index') return index + 1;
      return row[sortKey] ?? '';
    };
    return rows
      .filter((row) => matchesKeyword(row))
      .filter((row) => categoryFilter === '전체' || row.category === categoryFilter)
      .filter((row) => statusFilter === '전체' || row.status === statusFilter)
      .filter((row) => roleFilter === '전체' || row.role === roleFilter)
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const result = compareTableValues(getSortValue(left.row, left.index), getSortValue(right.row, right.index));
        return sortDirection === 'asc' ? result : -result;
      })
      .map(({ row }) => row);
  }, [rows, query, categoryFilter, statusFilter, roleFilter, sortKey, sortDirection]);

  return (
    <div className="data-table-shell">
      <div className="data-table-toolbar">
        <div>
          <span className="data-table-eyebrow">OpenStatus 스타일 필터</span>
          <h2>{title}</h2>
          <p>{filteredRows.length} / {rows.length}명 표시 중</p>
        </div>
        <div className="data-table-controls">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 직위, 구분, 업무 검색"
          />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="전체">구분 전체</option>
            {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="전체">상태 전체</option>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="전체">직위 전체</option>
            {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button className="action-button" type="button" onClick={resetFilters} disabled={!hasFilters}>
            초기화
          </button>
        </div>
      </div>
      <div className="data-table-active-filters">
        <span>정렬: {sortDirection === 'asc' ? '오름차순' : '내림차순'}</span>
        {query.trim() && <span>검색어: {query.trim()}</span>}
        {categoryFilter !== '전체' && <span>구분: {categoryFilter}</span>}
        {statusFilter !== '전체' && <span>상태: {statusFilter}</span>}
        {roleFilter !== '전체' && <span>직위: {roleFilter}</span>}
      </div>
      <div className="table-card data-table-card">
      <table style={{ minWidth: tableMinWidth }}>
        <thead>
          <tr>
            <SortableHeader label="번호" sortKey="index" activeKey={sortKey} direction={sortDirection} width={columnWidths.index} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="이름" sortKey="name" activeKey={sortKey} direction={sortDirection} width={columnWidths.name} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="직위/역할" sortKey="role" activeKey={sortKey} direction={sortDirection} width={columnWidths.role} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="구분" sortKey="category" activeKey={sortKey} direction={sortDirection} width={columnWidths.category} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="상태" sortKey="status" activeKey={sortKey} direction={sortDirection} width={columnWidths.status} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="시작일" sortKey="startedAt" activeKey={sortKey} direction={sortDirection} width={columnWidths.startedAt} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="종료일" sortKey="endedAt" activeKey={sortKey} direction={sortDirection} width={columnWidths.endedAt} onSort={setSort} onResizeStart={beginColumnResize} />
            <SortableHeader label="업무/활동내용" sortKey="dutyText" activeKey={sortKey} direction={sortDirection} width={columnWidths.dutyText} onSort={setSort} onResizeStart={beginColumnResize} />
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td className="name-cell">{row.name}</td>
              <td>{row.role || '-'}</td>
              <td><span className="pill">{row.category || '-'}</span></td>
              <td><span className="pill green">{row.status || '-'}</span></td>
              <td>{row.startedAt || '-'}</td>
              <td>{row.endedAt || '-'}</td>
              <td className="muted">{row.dutyText || '-'}</td>
            </tr>
          ))}
          {!filteredRows.length && (
            <tr>
              <td colSpan={8} className="empty-row">조건에 맞는 데이터가 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

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

function ChildrenTable({
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

function StatusStrip({ snapshot, providerLabel }: { snapshot: DashboardSnapshot; providerLabel: string }) {
  const modeLabel = {
    demo: '샘플 데이터',
    spreadsheet: '스프레드시트에서 이관됨',
    manual: 'JSON 수동 이관',
    empty: '비어 있음'
  }[snapshot.settings.sourceMode];
  return (
    <div className="status-strip">
      <span>기준 DB: {providerLabel}</span>
      <span>운영 모드: {modeLabel}</span>
      <span>마지막 이관: {snapshot.settings.importedAt ? new Date(snapshot.settings.importedAt).toLocaleString() : '-'}</span>
    </div>
  );
}

function ImportWizard({
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

function ParityWorkbench({
  title,
  summary,
  implemented,
  next
}: {
  title: string;
  summary: string;
  implemented: string[];
  next: string[];
}) {
  return (
    <section className="parity-workbench">
      <Panel className="parity-hero">
        <span className="eyebrow">스프레드시트 동일화</span>
        <h2>{title}</h2>
        <p>{summary}</p>
      </Panel>
      <Panel className="parity-card">
        <h2>현재 연결됨</h2>
        <ul className="todo-list">
          {implemented.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
      <Panel className="parity-card">
        <h2>다음 구현</h2>
        <ul className="todo-list">
          {next.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
    </section>
  );
}

function App() {
  const providerLabel = getDataProviderLabel();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState(`${providerLabel} 기준 데이터를 준비하는 중입니다.`);
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const refreshSnapshot = () => {
    loadDashboardSnapshot()
      .then((next) => {
        setSnapshot(next);
        setStatus(`${providerLabel} 기준 운영 구조가 준비되었습니다.`);
      })
      .catch((error) => {
        setStatus(`초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
  };

  useEffect(() => {
    let alive = true;
    loadDashboardSnapshot()
      .then((next) => {
        if (!alive) return;
        setSnapshot(next);
        setStatus(`${providerLabel} 기준 운영 구조가 준비되었습니다.`);
      })
      .catch((error) => {
        if (!alive) return;
        setStatus(`초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
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
    refreshSnapshot();
  };

  const handleDataChanged = (message: string) => {
    setStatus(message);
    refreshSnapshot();
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
      {snapshot && <StatusStrip snapshot={snapshot} providerLabel={providerLabel} />}

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

        {view === 'import' && <ImportWizard snapshot={snapshot} onImported={handleImported} />}

        {snapshot && (view === 'staffRoster' || view === 'nonStaffRoster') && (
          <PeopleTable
            rows={selectedRows}
            title={view === 'nonStaffRoster' ? '비종사자 데이터' : '종사자 데이터'}
            storageKey={view === 'nonStaffRoster' ? 'non-staff' : 'staff'}
          />
        )}

        {snapshot && view === 'children' && (
          <ChildrenTable
            rows={safeRows(snapshot.children)}
            childAttendance={safeRows(snapshot.childAttendance)}
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

        {view === 'programJournals' && (
          <ParityWorkbench
            title="프로그램 일지"
            summary="기존 스프레드시트 프로그램 일지를 데스크톱에서 작성하고 운영일지 미리보기로 이어지게 만드는 화면입니다."
            implemented={['운영일지 템플릿 미리보기', '참석자/담당자 표시 규칙 설계']}
            next={['프로그램 일지 DB 추가', '아동 출결과 참석자 자동 연결', '프로그램일지 출력 템플릿 연결']}
          />
        )}

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

        {view === 'export' && (
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
        )}
      </ViewErrorBoundary>
    </AppShell>
  );
}

export default App;
