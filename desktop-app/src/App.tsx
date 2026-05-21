import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { AttendanceEntry, Child, ChildAttendanceEntry, DashboardSnapshot, ImportSummary, InitialImportPayload, JournalEntry, JournalTemplate, Person } from './types';
import { AppShell } from './app/AppShell';
import { yearOptions } from './app/navigation';
import type { ViewKey } from './app/navigation';
import { deleteChildAttendanceEntry, getDataProviderLabel, loadDashboardSnapshot, loadJournalTemplates, rebuildDedupedChildrenFromLocalData, replaceLocalDatabaseFromImport, saveChildAttendanceEntries, saveChildRecord, saveGeneratedJournals, saveJournalEntry, saveJournalTemplate } from './data/dataProvider';
import { createHwpxBytesFromHtml, downloadHwpxFromHtml } from './data/hwpxExport';
import { defaultJournalTemplateHtml, journalTemplateFields, renderJournalTemplate } from './data/journalTemplates';
import { fetchInitialSpreadsheetSnapshot } from './data/sheetSync';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { JournalEditPage } from './features/journal-edit/JournalEditPage';
import { useMediaQuery } from './shared/hooks/useMediaQuery';
import { safeRows } from './shared/lib/arrays';
import { EmptyState } from './shared/ui/EmptyState';
import { Panel } from './shared/ui/Panel';
import { PanelTitle } from './shared/ui/PanelTitle';
import { StatCard } from './shared/ui/StatCard';
import { ViewErrorBoundary } from './shared/ui/ViewErrorBoundary';

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

function dateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function getMonthEnd(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getPeriodRange(year: number, month: number | 'all') {
  if (month === 'all') {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const monthText = String(month).padStart(2, '0');
  return { start: `${year}-${monthText}-01`, end: `${year}-${monthText}-${String(getMonthEnd(year, month)).padStart(2, '0')}` };
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return { year, month, day };
}

function formatDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function isWeekday(dateKey: string) {
  const { year, month, day: date } = parseDateKey(dateKey);
  const day = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return day >= 1 && day <= 5;
}

function addDays(dateKey: string, amount: number) {
  const { year, month, day } = parseDateKey(dateKey);
  return formatDateKey(new Date(Date.UTC(year, month - 1, day + amount)));
}

function getComparableTodayForYear(year: number) {
  const today = new Date();
  const todayYear = today.getFullYear();
  if (year < todayYear) return `${year}-12-31`;
  if (year > todayYear) return `${year}-12-31`;
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
}

function expectedWeekdays(year: number, month: number | 'all') {
  const range = getPeriodRange(year, month);
  const end = range.end < getComparableTodayForYear(year) ? range.end : getComparableTodayForYear(year);
  const days: string[] = [];
  for (let cursor = range.start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (isWeekday(cursor)) days.push(cursor);
  }
  return days;
}

function isWorkAttendance(entry: AttendanceEntry) {
  return entry.status === 'present' || entry.status === 'official' || entry.status === 'substitute';
}

function sumNumbers<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((total, row) => total + pick(row), 0);
}

function averageNumbers<T>(rows: T[], pick: (row: T) => number) {
  if (!rows.length) return 0;
  return Math.round((sumNumbers(rows, pick) / rows.length) * 10) / 10;
}

const childAttendanceLabels: Record<ChildAttendanceEntry['status'], string> = {
  present: '출석',
  absent: '결석',
  official: '공결',
  substitute: '대체출석',
  other: '기타'
};

function isRecognizedChildAttendance(entry: ChildAttendanceEntry) {
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

function defaultOperatingHoursForDate(date: string) {
  const month = Number(date.slice(5, 7));
  if ([1, 2, 8].includes(month)) return '09:00 ~ 18:00 (방학중)';
  return '10:00 ~ 19:00';
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

function buildJournalFromSnapshot(date: string, snapshot: DashboardSnapshot): JournalEntry {
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
  const teacherCount = nonStaffPresent.filter((person) => person.category.includes('교사')).length;
  const publicServiceCount = nonStaffPresent.filter((person) => person.category.includes('공익') || person.role.includes('사회복무')).length;
  const otherVisitorCount = nonStaffPresent.length - teacherCount - publicServiceCount;
  const workText = nonStaffPresent
    .filter((person) => person.dutyText)
    .map((person) => {
      const duty = String(person.dutyText || '').trim().replace(/[.。]\s*$/, '');
      const role = person.role ? `${person.role} ` : '';
      return `* [${role}${person.name}] ${duty}.`;
    })
    .join('\n');

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
    teacherCount,
    publicServiceCount,
    otherVisitorCount,
    workText,
    syncStatus: 'pending'
  };
}

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

type DocumentPreviewMode = 'html' | 'htmlEdit' | 'rhwp';

function PreviewModeTabs({
  value,
  onChange,
  editable = false
}: {
  value: DocumentPreviewMode;
  onChange: (value: DocumentPreviewMode) => void;
  editable?: boolean;
}) {
  return (
    <div className="document-preview-tabs" role="tablist" aria-label="문서 미리보기 방식">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'html'}
        className={value === 'html' ? 'active' : ''}
        onClick={() => onChange('html')}
      >
        미리보기
      </button>
      {editable && (
        <button
          type="button"
          role="tab"
          aria-selected={value === 'htmlEdit'}
          className={value === 'htmlEdit' ? 'active' : ''}
          onClick={() => onChange('htmlEdit')}
        >
          문서 편집
        </button>
      )}
      <button
        type="button"
        role="tab"
        aria-selected={value === 'rhwp'}
        className={value === 'rhwp' ? 'active' : ''}
        onClick={() => onChange('rhwp')}
      >
        RHWP 보기
      </button>
    </div>
  );
}

function HtmlTemplateEditor({
  html,
  onCommit,
  onSelectCell
}: {
  html: string;
  onCommit: (html: string) => void;
  onSelectCell?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!editorRef.current || lastHtmlRef.current === html) return;
    editorRef.current.innerHTML = html;
    lastHtmlRef.current = html;
    setDirty(false);
  }, [html]);

  const commit = () => {
    const nextHtml = editorRef.current?.innerHTML || '';
    lastHtmlRef.current = nextHtml;
    setDirty(false);
    onCommit(nextHtml);
  };

  return (
    <div className="html-template-editor-shell">
      <div className="html-template-editor-toolbar">
        <span>{dirty ? 'HTML 표 수정 중' : 'HTML 표 편집 가능'}</span>
        <button type="button" className="primary small" onClick={commit} disabled={!dirty}>
          편집 반영
        </button>
      </div>
      <div className="html-template-editor-stage">
        <div
          ref={editorRef}
          className="html-template-editor template-clickable-preview"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => setDirty(true)}
          onBlur={commit}
          onClickCapture={onSelectCell}
        />
      </div>
    </div>
  );
}

const RHWP_INLINE_STYLE_PROPS = [
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'border-collapse',
  'table-layout',
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'vertical-align',
  'padding',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'width',
  'height'
];

function shouldKeepComputedStyle(prop: string, value: string) {
  if (!value) return false;
  if (value === 'normal' && !['font-weight', 'line-height'].includes(prop)) return false;
  if ((prop === 'background-color' || prop === 'color') && value === 'rgba(0, 0, 0, 0)') return false;
  return true;
}

function inlineStylesForRhwpImport(sourceHtml: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return `<html><body><!--StartFragment-->${sourceHtml}<!--EndFragment--></body></html>`;
  }

  const sandbox = document.createElement('div');
  sandbox.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:210mm',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1'
  ].join(';');
  sandbox.innerHTML = sourceHtml;
  document.body.appendChild(sandbox);

  try {
    sandbox.querySelectorAll<HTMLElement>('table, col, tr, td, th, div, p, span, strong').forEach((element) => {
      const computed = window.getComputedStyle(element);
      const tagName = element.tagName.toLowerCase();
      const props = tagName === 'col' ? ['width'] : RHWP_INLINE_STYLE_PROPS;
      props.forEach((prop) => {
        const value = computed.getPropertyValue(prop);
        if (shouldKeepComputedStyle(prop, value)) {
          element.style.setProperty(prop, value);
        }
      });

      if ((tagName === 'td' || tagName === 'th') && !element.style.border) {
        element.style.border = '1px solid #9ca3af';
      }
      if (tagName === 'table') {
        element.style.setProperty('border-collapse', 'collapse');
        element.style.setProperty('table-layout', 'fixed');
        element.style.setProperty('width', '100%');
      }
    });

    sandbox.querySelectorAll('style, script, link, meta').forEach((node) => node.remove());
    const fragment = sandbox.innerHTML.trim();
    return `<html><body><!--StartFragment-->${fragment}<!--EndFragment--></body></html>`;
  } finally {
    sandbox.remove();
  }
}

function RhwpEditorPane({
  html,
  onHtmlCommit,
  defaultHtml
}: {
  html: string;
  onHtmlCommit?: (html: string) => void;
  defaultHtml?: string;
}) {
  type RhwpEditorInstance = {
    destroy?: () => void;
    readonly element?: HTMLIFrameElement;
    loadFile?: (data: ArrayBuffer | Uint8Array, fileName?: string) => Promise<{ pageCount?: number }>;
    _request?: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown> & { pageCount?: number }>;
  };
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<RhwpEditorInstance | null>(null);
  const loadSeqRef = useRef(0);
  const [showHtmlPanel, setShowHtmlPanel] = useState(false);
  const [draftHtml, setDraftHtml] = useState(html);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('RHWP 에디터를 준비하는 중입니다.');

  const resetRhwpEmbeddedCaches = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope.includes('/rhwp-studio/'))
            .map((registration) => registration.unregister())
        );
      }
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => /rhwp|workbox|wasm/i.test(key))
            .map((key) => window.caches.delete(key))
        );
      }
    } catch (error) {
      console.warn('RHWP embedded cache cleanup skipped', error);
    }
  };

  useEffect(() => {
    setDraftHtml(html);
    setDirty(false);
  }, [html]);

  const applyHtmlDraft = (nextHtml = draftHtml) => {
    setDraftHtml(nextHtml);
    setDirty(false);
    onHtmlCommit?.(nextHtml);
  };

  const requestRhwpEditor = (
    editor: RhwpEditorInstance,
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 60000
  ): Promise<Record<string, unknown> & { pageCount?: number; timedOut?: boolean }> => {
    const iframe = editor.element;
    const targetWindow = iframe?.contentWindow;
    if (!targetWindow) {
      return editor._request
        ? editor._request(method, params)
        : Promise.reject(new Error('RHWP iframe을 찾지 못했습니다.'));
    }

    const id = Date.now() + Math.floor(Math.random() * 100000);
    return new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timer);
      };
      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.type !== 'rhwp-response' || data.id !== id) return;
        if (event.source !== targetWindow) {
          console.info('RHWP response accepted from alternate window reference', { method, id });
        }
        finished = true;
        cleanup();
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.result || {});
        }
      };
      const timer = window.setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        console.warn('RHWP request timed out', { method, id, timeoutMs });
        resolve({ timedOut: true });
      }, timeoutMs);

      window.addEventListener('message', handleMessage);
      targetWindow.postMessage({ type: 'rhwp-request', id, method, params }, '*');
    });
  };

  const waitForRhwpReady = async (editor: RhwpEditorInstance, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const result = await requestRhwpEditor(editor, 'ready', {}, 1500);
        if (!result?.timedOut) return result;
      } catch (error) {
        console.warn('RHWP ready polling failed', error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    throw new Error('RHWP 에디터 준비 시간이 초과되었습니다.');
  };

  const createEmbeddedRhwpEditor = (
    container: HTMLDivElement,
    studioUrl: string
  ): Promise<RhwpEditorInstance> => new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = studioUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.tabIndex = 0;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('RHWP iframe 로드 시간이 초과되었습니다.'));
    }, 20000);

    iframe.addEventListener('load', () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve({
        element: iframe,
        destroy: () => iframe.remove()
      });
    }, { once: true });
    iframe.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(new Error('RHWP iframe을 불러오지 못했습니다.'));
    }, { once: true });

    container.appendChild(iframe);
  });

  const navigateRhwpIframe = (
    iframe: HTMLIFrameElement,
    url: string,
    timeoutMs = 30000
  ): Promise<void> => new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('RHWP 문서 로드 시간이 초과되었습니다.'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('RHWP 문서를 불러오지 못했습니다.'));
    };
    iframe.addEventListener('load', handleLoad, { once: true });
    iframe.addEventListener('error', handleError, { once: true });
    iframe.src = url;
  });

  const createRhwpNativeSessionUrl = (
    sourceHtml: string,
    fileName = '운영일지.hwp',
  ) => {
    const key = `seochang-rhwp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    window.sessionStorage.setItem(key, JSON.stringify({
      html: sourceHtml,
      fileName
    }));
    const loadUrl = new URL('/rhwp-studio/index.html', window.location.origin);
    loadUrl.searchParams.set('embed', '1');
    loadUrl.searchParams.set('v', String(Date.now()));
    loadUrl.searchParams.set('seochangNativeHtmlKey', key);
    loadUrl.searchParams.set('autoFixValidation', '1');
    loadUrl.searchParams.set('suppressValidationModal', '1');
    loadUrl.searchParams.set('suppressHwpxSaveNotice', '1');
    return loadUrl;
  };

  const waitForRhwpTables = async (editor: RhwpEditorInstance, timeoutMs = 45000) => {
    const deadline = Date.now() + timeoutMs;
    let lastResult: Record<string, unknown> & { pageCount?: number; timedOut?: boolean } = {};
    while (Date.now() < deadline) {
      try {
        const result = await requestRhwpEditor(editor, 'getTableLayout', {}, 5000);
        lastResult = result;
        const tables = Array.isArray(result.tables) ? result.tables : [];
        if (tables.length > 0) return result;
      } catch (error) {
        console.warn('RHWP table layout polling failed', error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
    return lastResult;
  };

  const fitRhwpEditorToWidth = (editor: RhwpEditorInstance) => {
    window.setTimeout(() => {
      try {
        editor.element?.contentWindow?.postMessage({ type: 'seochang-rhwp-fit-width' }, '*');
        editor.element?.contentWindow?.focus();
      } catch (error) {
        console.warn('RHWP fit-width skipped', error);
      }
    }, 350);
  };

  const focusRhwpEditorFrame = (editor = editorRef.current) => {
    window.setTimeout(() => {
      try {
        editor?.element?.focus();
        editor?.element?.contentWindow?.focus();
      } catch (error) {
        console.warn('RHWP iframe focus skipped', error);
      }
    }, 50);
  };

  const loadTemplateIntoEditor = async (editor: RhwpEditorInstance, sourceHtml: string) => {
    const seq = ++loadSeqRef.current;
    const rhwpHtml = inlineStylesForRhwpImport(sourceHtml);
    setStatus('RHWP 에디터에 운영일지 표를 만드는 중입니다.');
    let result: { pageCount?: number; timedOut?: boolean } | undefined;
    if (editor.element) {
      try {
        const loadUrl = createRhwpNativeSessionUrl(rhwpHtml, '운영일지.hwp');
        await navigateRhwpIframe(editor.element, loadUrl.toString(), 60000);
        await waitForRhwpTables(editor, 45000);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        result = {};
      } catch (nativeError) {
        console.warn('RHWP native table load failed, falling back to HWPX load.', nativeError);
        if (seq !== loadSeqRef.current) return;
        setStatus('RHWP 표 생성 실패 · HWPX 방식으로 다시 여는 중입니다.');
        const bytes = await createHwpxBytesFromHtml(rhwpHtml, {
          preferNative: false,
          allowFallback: true
        });
        if (seq !== loadSeqRef.current) return;
        const fileBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const blobUrl = URL.createObjectURL(new Blob([fileBuffer], { type: 'application/hwp+zip' }));
        const loadUrl = new URL('/rhwp-studio/index.html', window.location.origin);
        loadUrl.searchParams.set('embed', '1');
        loadUrl.searchParams.set('v', String(Date.now()));
        loadUrl.searchParams.set('url', blobUrl);
        loadUrl.searchParams.set('filename', '운영일지.hwpx');
        loadUrl.searchParams.set('autoFixValidation', '1');
        loadUrl.searchParams.set('suppressValidationModal', '1');
        loadUrl.searchParams.set('suppressHwpxSaveNotice', '1');
        try {
          await navigateRhwpIframe(editor.element, loadUrl.toString());
          result = { pageCount: 1 };
        } finally {
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        }
      }
    } else if (editor.loadFile) {
      const bytes = await createHwpxBytesFromHtml(rhwpHtml, {
        preferNative: false,
        allowFallback: true
      });
      result = await editor.loadFile(bytes, '운영일지.hwpx');
    }
    if (seq !== loadSeqRef.current) return;
    fitRhwpEditorToWidth(editor);
    focusRhwpEditorFrame(editor);
    setStatus(`운영일지 템플릿 로드 완료${result?.pageCount ? ` · ${result.pageCount}쪽` : ''}`);
  };

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;

    async function mountEditor() {
      if (!hostRef.current) return;
      hostRef.current.innerHTML = '';
      setStatus('RHWP 에디터를 불러오는 중입니다.');

      try {
        setStatus('RHWP 캐시를 정리하는 중입니다.');
        await resetRhwpEmbeddedCaches();
        if (cancelled || !hostRef.current) return;
        const studioUrl = new URL('/rhwp-studio/index.html', window.location.origin);
        studioUrl.searchParams.set('embed', '1');
        studioUrl.searchParams.set('v', String(Date.now()));
        const editor = await createEmbeddedRhwpEditor(hostRef.current, studioUrl.toString());
        if (cancelled) {
          editor.destroy?.();
          return;
        }
        editorRef.current = editor;
        setStatus('RHWP iframe 탑재 완료 · 문서를 준비하는 중입니다.');
        if (cancelled) return;
        await loadTemplateIntoEditor(editor, html);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`RHWP 에디터 로딩 실패: ${message}`);
      }
    }

    mountEditor();

    return () => {
      cancelled = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    loadTemplateIntoEditor(editorRef.current, html).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`운영일지 템플릿 로드 실패: ${message}`);
    });
  }, [html]);

  return (
    <div className="rhwp-editor-shell rhwp-library-shell">
      <div className="rhwp-library-head">
        <div>
          <strong>RHWP 라이브러리 에디터</strong>
          <span>{status}</span>
        </div>
        <div className="rhwp-library-actions">
          <button
            type="button"
            className={showHtmlPanel ? 'active' : ''}
            onClick={() => setShowHtmlPanel((current) => !current)}
          >
            HTML 탭
          </button>
          <button type="button" onClick={() => applyHtmlDraft(defaultHtml || html)}>
            기본 HTML
          </button>
          <button type="button" className="primary small" onClick={() => applyHtmlDraft()}>
            HTML 저장
          </button>
        </div>
      </div>

      {showHtmlPanel && (
        <div className="rhwp-library-tools">
          <div className="rhwp-html-menu-panel rhwp-library-html-panel">
            <div className="rhwp-html-menu-head">
              <strong>HTML로 표 만들기</strong>
              <span>붙여 넣은 HTML은 운영일지 템플릿 값으로 저장됩니다.</span>
            </div>
            <textarea
              value={draftHtml}
              onChange={(event) => {
                setDraftHtml(event.target.value);
                setDirty(true);
              }}
              spellCheck={false}
            />
            <div className="button-cluster">
              <button type="button" onClick={() => applyHtmlDraft(defaultHtml || html)}>
                기본 템플릿 넣기
              </button>
              <button type="button" className="primary small" onClick={() => applyHtmlDraft()}>
                표 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rhwp-library-body">
        <div ref={hostRef} className="rhwp-editor-host rhwp-editor-host-visible" />
      </div>

      <div className="rhwp-editor-status">{status}</div>
      {dirty && <div className="rhwp-dirty-status">수정 내용이 있습니다. HTML 저장을 누르면 템플릿에 반영됩니다.</div>}
    </div>
  );
}

function HwpStylePreview({ html }: { html: string }) {
  return (
    <div className="hwp-preview-shell">
      <div className="hwp-preview-body">
        <div className="hwp-preview-canvas">
          <div className="hwp-preview-page" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <div className="hwp-preview-status">
        <span>HTML 기반 보조 보기</span>
      </div>
    </div>
  );
}

function JournalEditWorkspace({
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

function ChildAttendanceWorkspace({
  snapshot,
  onSaved
}: {
  snapshot: DashboardSnapshot;
  onSaved: (message: string) => void;
}) {
  const children = safeRows(snapshot.children);
  const childAttendance = safeRows(snapshot.childAttendance);
  const availableYears = Array.from(
    new Set([
      ...yearOptions,
      ...childAttendance.map((entry) => Number(entry.date.slice(0, 4))).filter(Boolean),
      ...children.map((child) => Number(child.joinedAt.slice(0, 4))).filter(Boolean)
    ])
  ).sort();
  const [selectedYear, setSelectedYear] = useState(availableYears[availableYears.length - 1] || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const todayKey = formatDateKey(new Date());
  const range = getPeriodRange(selectedYear, selectedMonth);
  const activeChildren = children.filter((child) => isActiveChildInRange(child, range.start, range.end));
  const monthEntries = childAttendance.filter((entry) => dateInRange(entry.date, range.start, range.end));
  const dates = Array.from({ length: getMonthEnd(selectedYear, selectedMonth) }, (_, index) => `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayKey >= range.start && todayKey <= range.end ? todayKey : range.start);
  const [draftStatus, setDraftStatus] = useState<ChildAttendanceEntry['status']>('present');
  const [draftMemo, setDraftMemo] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const entriesByDate = new Map<string, ChildAttendanceEntry[]>();
  monthEntries.forEach((entry) => {
    const rows = entriesByDate.get(entry.date) || [];
    rows.push(entry);
    entriesByDate.set(entry.date, rows);
  });
  const dailyRows = dates.map((date) => {
    const rows = entriesByDate.get(date) || [];
    return {
      date,
      target: activeChildren.filter((child) => isActiveChildInRange(child, date, date)).length,
      recognized: rows.filter(isRecognizedChildAttendance).length,
      present: rows.filter((entry) => entry.status === 'present').length,
      absent: rows.filter((entry) => entry.status === 'absent').length,
      official: rows.filter((entry) => entry.status === 'official').length,
      substitute: rows.filter((entry) => entry.status === 'substitute').length,
      other: rows.filter((entry) => entry.status === 'other').length
    };
  });
  const rosterRows = activeChildren.map((child) => {
    const rows = monthEntries.filter((entry) => entry.childId === child.id);
    return {
      child,
      total: rows.length,
      recognized: rows.filter(isRecognizedChildAttendance).length,
      present: rows.filter((entry) => entry.status === 'present').length,
      absent: rows.filter((entry) => entry.status === 'absent').length,
      official: rows.filter((entry) => entry.status === 'official').length,
      substitute: rows.filter((entry) => entry.status === 'substitute').length,
      other: rows.filter((entry) => entry.status === 'other').length,
      recentMemo: rows.find((entry) => entry.memo)?.memo || ''
    };
  }).sort((a, b) => b.total - a.total || a.child.name.localeCompare(b.child.name));
  const selectedChild = activeChildren.find((child) => child.id === selectedChildId) || activeChildren[0];
  const selectedEntry = selectedChild
    ? childAttendance.find((entry) => entry.childId === selectedChild.id && entry.date === selectedDate)
    : undefined;
  const selectedChildMonthEntries = selectedChild
    ? monthEntries.filter((entry) => entry.childId === selectedChild.id).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const selectedChildEntryByDate = new Map(selectedChildMonthEntries.map((entry) => [entry.date, entry]));
  const leadingBlankDays = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).getUTCDay();
  const calendarCells: Array<string | null> = [
    ...Array.from({ length: leadingBlankDays }, () => null),
    ...dates
  ];

  useEffect(() => {
    if (!activeChildren.length) {
      setSelectedChildId('');
      return;
    }
    if (!activeChildren.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(activeChildren[0].id);
    }
  }, [activeChildren, selectedChildId]);

  useEffect(() => {
    const defaultDate = todayKey >= range.start && todayKey <= range.end ? todayKey : range.start;
    if (selectedDate < range.start || selectedDate > range.end) {
      setSelectedDate(defaultDate);
    }
  }, [range.start, range.end, selectedDate, todayKey]);

  useEffect(() => {
    setDraftStatus(selectedEntry?.status || 'present');
    setDraftMemo(selectedEntry?.memo || '');
  }, [selectedEntry?.id, selectedEntry?.status, selectedEntry?.memo, selectedChild?.id, selectedDate]);

  const saveChildAttendanceForDate = async (date: string, status: ChildAttendanceEntry['status'], memo: string) => {
    if (!selectedChild || savingAttendance) return;
    setSavingAttendance(true);
    setAttendanceMessage('출결을 저장하는 중입니다.');
    try {
      const currentEntry = childAttendance.find((entry) => entry.childId === selectedChild.id && entry.date === date);
      const nextEntry: ChildAttendanceEntry = {
        id: currentEntry?.id || `child-attendance-${selectedChild.id}-${date}`,
        childId: selectedChild.id,
        date,
        yearMonth: date.slice(0, 7),
        status,
        memo,
        syncedAt: 'local'
      };
      await saveChildAttendanceEntries([nextEntry]);
      setSelectedDate(date);
      setDraftStatus(status);
      setDraftMemo(memo);
      const message = `${selectedChild.name} ${date} 출결 저장 완료`;
      setAttendanceMessage(message);
      onSaved(message);
    } catch (error) {
      setAttendanceMessage(`출결 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  const saveSelectedChildAttendance = async () => {
    await saveChildAttendanceForDate(selectedDate, draftStatus, draftMemo);
  };

  const deleteSelectedChildAttendance = async () => {
    if (!selectedChild || !selectedEntry || savingAttendance) return;
    setSavingAttendance(true);
    setAttendanceMessage('선택 날짜 출결 기록을 삭제하는 중입니다.');
    try {
      await deleteChildAttendanceEntry(selectedChild.id, selectedDate);
      setDraftStatus('present');
      setDraftMemo('');
      const message = `${selectedChild.name} ${selectedDate} 출결 기록 삭제 완료`;
      setAttendanceMessage(message);
      onSaved(message);
    } catch (error) {
      setAttendanceMessage(`출결 삭제 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  const fillSelectedMonthWeekdays = async () => {
    if (!selectedChild || savingAttendance) return;
    const weekdayDates = dates.filter((date) => (
      isWeekday(date) &&
      isActiveChildInRange(selectedChild, date, date) &&
      !childAttendance.some((entry) => entry.childId === selectedChild.id && entry.date === date)
    ));
    if (!weekdayDates.length) return;
    setSavingAttendance(true);
    setAttendanceMessage('선택 월 미기록 평일을 출석으로 채우는 중입니다.');
    try {
      const rows = weekdayDates.map((date) => {
        return {
          id: `child-attendance-${selectedChild.id}-${date}`,
          childId: selectedChild.id,
          date,
          yearMonth: date.slice(0, 7),
          status: 'present' as ChildAttendanceEntry['status'],
          memo: '',
          syncedAt: 'local'
        };
      });
      const result = await saveChildAttendanceEntries(rows);
      const message = `${selectedChild.name} ${selectedYear}년 ${selectedMonth}월 미기록 평일 출석 ${result.saved}건 저장 완료`;
      setAttendanceMessage(message);
      onSaved(message);
    } catch (error) {
      setAttendanceMessage(`월 출석 채우기 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <section className="child-attendance-workspace">
      <div className="stats-toolbar panel">
        <div>
          <h2>아동 출결대장</h2>
          <p>{range.start} ~ {range.end} 기준으로 아동별 출석/공결/결석을 확인합니다.</p>
        </div>
        <div className="stats-filters">
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {availableYears.map((year) => <option key={year} value={year}>{year}년</option>)}
          </select>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
        </div>
      </div>

      <section className="stats-grid secondary">
        <StatCard label="대상 아동" value={`${activeChildren.length}명`} />
        <StatCard label="출결 기록" value={`${monthEntries.length}건`} />
        <StatCard label="인정 출석" value={`${monthEntries.filter(isRecognizedChildAttendance).length}건`} />
        <StatCard label="결석" value={`${monthEntries.filter((entry) => entry.status === 'absent').length}건`} tone={monthEntries.some((entry) => entry.status === 'absent') ? 'warning' : ''} />
      </section>

      <section className="panel child-attendance-calendar-panel">
        <div className="child-attendance-calendar-head">
          <div>
            <h2>월간 출결 캘린더</h2>
            <p>{selectedChild ? `${selectedChild.name} · ${selectedYear}년 ${selectedMonth}월` : '아동을 선택하세요.'}</p>
          </div>
          <div className="child-attendance-calendar-actions">
            <select value={selectedChild?.id || ''} onChange={(event) => setSelectedChildId(event.target.value)}>
              {activeChildren.map((child) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
            <button className="action-button" type="button" onClick={fillSelectedMonthWeekdays} disabled={!selectedChild || savingAttendance}>
              미기록 평일 출석 채우기
            </button>
          </div>
        </div>
        <div className="child-attendance-calendar">
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName) => (
            <span className="calendar-weekday" key={dayName}>{dayName}</span>
          ))}
          {calendarCells.map((date, index) => {
            if (!date) return <span className="child-calendar-empty" key={`blank-${index}`} />;
            const entry = selectedChildEntryByDate.get(date);
            const activeForDate = selectedChild ? isActiveChildInRange(selectedChild, date, date) : false;
            const dayNumber = Number(date.slice(8, 10));
            return (
              <button
                className={`child-calendar-day ${entry?.status || 'empty'} ${selectedDate === date ? 'selected' : ''} ${!activeForDate ? 'inactive' : ''}`}
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
              >
                <strong>{dayNumber}</strong>
                <span>{entry ? childAttendanceLabels[entry.status] : '미기록'}</span>
                {entry?.memo && <em>메모</em>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="child-attendance-grid">
        <div className="table-card stats-table">
          <div className="table-card-title">
            <h2>일자별 집계</h2>
            <span className="muted">운영일지 현원/출석 계산의 기준이 될 영역입니다.</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>대상</th>
                <th>인정 출석</th>
                <th>출석</th>
                <th>공결</th>
                <th>대체</th>
                <th>결석</th>
                <th>기타</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((row) => (
                <tr
                  key={row.date}
                  className={selectedDate === row.date ? 'selected' : ''}
                  onClick={() => setSelectedDate(row.date)}
                >
                  <td className="name-cell">{row.date}</td>
                  <td>{row.target}</td>
                  <td>{row.recognized}</td>
                  <td>{row.present}</td>
                  <td>{row.official}</td>
                  <td>{row.substitute}</td>
                  <td>{row.absent}</td>
                  <td>{row.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card stats-table">
          <div className="table-card-title">
            <h2>아동별 출결</h2>
            <span className="muted">아동을 누르면 오른쪽 편집 대상이 바뀝니다.</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학교/학년</th>
                <th>기록</th>
                <th>인정</th>
                <th>결석</th>
                <th>상태</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((row) => (
                <tr
                  key={row.child.id}
                  className={selectedChild?.id === row.child.id ? 'selected' : ''}
                  onClick={() => setSelectedChildId(row.child.id)}
                >
                  <td className="name-cell">{row.child.name}</td>
                  <td>{[row.child.school, row.child.grade].filter(Boolean).join(' · ') || '-'}</td>
                  <td>{row.total}</td>
                  <td>{row.recognized}</td>
                  <td>{row.absent}</td>
                  <td>
                    <span className={`pill ${row.absent ? 'amber' : 'green'}`}>
                      {row.total ? childAttendanceLabels[row.absent ? 'absent' : 'present'] : '미기록'}
                    </span>
                  </td>
                  <td className="muted">{row.recentMemo || '-'}</td>
                </tr>
              ))}
              {!rosterRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">선택한 기간에 표시할 아동이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel child-attendance-editor">
        <div>
          <h2>출결 상세 수정</h2>
          <p>{selectedChild ? `${selectedChild.name} · ${selectedDate}` : '수정할 아동을 선택하세요.'}</p>
        </div>
        <div className="child-attendance-editor-grid">
          <label>
            <span>아동</span>
            <select value={selectedChild?.id || ''} onChange={(event) => setSelectedChildId(event.target.value)}>
              {activeChildren.map((child) => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>날짜</span>
            <input type="date" value={selectedDate} min={range.start} max={range.end} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label>
            <span>상태</span>
            <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as ChildAttendanceEntry['status'])}>
              {Object.entries(childAttendanceLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>메모</span>
            <textarea value={draftMemo} onChange={(event) => setDraftMemo(event.target.value)} placeholder="결석 사유, 공결 사유, 특이사항을 입력하세요." />
          </label>
        </div>
        <div className="child-attendance-editor-actions">
          <button className="action-button primary" type="button" onClick={saveSelectedChildAttendance} disabled={!selectedChild || savingAttendance}>
            {savingAttendance ? '저장 중' : '출결 저장'}
          </button>
          <button className="action-button danger" type="button" onClick={deleteSelectedChildAttendance} disabled={!selectedEntry || savingAttendance}>
            기록 삭제
          </button>
          {attendanceMessage && <span className={attendanceMessage.includes('실패') ? 'danger-text' : ''}>{attendanceMessage}</span>}
        </div>
        <div className="child-attendance-recent">
          {selectedChildMonthEntries.slice(0, 12).map((entry) => (
            <button key={entry.id} type="button" onClick={() => setSelectedDate(entry.date)}>
              <strong>{entry.date}</strong>
              <span>{childAttendanceLabels[entry.status]}</span>
            </button>
          ))}
          {!selectedChildMonthEntries.length && <span className="muted">선택 월 출결 기록이 없습니다.</span>}
        </div>
      </section>
    </section>
  );
}

function StatisticsWorkspace({ snapshot }: { snapshot: DashboardSnapshot }) {
  const journals = safeRows(snapshot.journals);
  const attendance = safeRows(snapshot.attendance);
  const staff = safeRows(snapshot.staff);
  const nonStaff = safeRows(snapshot.nonStaff);
  const availableYears = Array.from(
    new Set([
      ...yearOptions,
      ...journals.map((journal) => Number(journal.date.slice(0, 4))).filter(Boolean)
    ])
  ).sort();
  const [selectedYear, setSelectedYear] = useState(availableYears[availableYears.length - 1] || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedTab, setSelectedTab] = useState<'children' | 'staff' | 'nonStaff' | 'education' | 'program'>('children');
  const range = getPeriodRange(selectedYear, selectedMonth);
  const periodJournals = journals
    .filter((journal) => dateInRange(journal.date, range.start, range.end))
    .sort((a, b) => a.date.localeCompare(b.date));
  const expectedDates = expectedWeekdays(selectedYear, selectedMonth);
  const journalDateSet = new Set(periodJournals.map((journal) => journal.date));
  const missingDates = expectedDates.filter((date) => !journalDateSet.has(date));
  const monthlyRows = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthRange = getPeriodRange(selectedYear, month);
    const rows = journals.filter((journal) => dateInRange(journal.date, monthRange.start, monthRange.end));
    return {
      month,
      days: rows.length,
      averageEnrolled: averageNumbers(rows, (journal) => journal.enrolled),
      presentChildren: sumNumbers(rows, (journal) => journal.presentChildren),
      absentChildren: sumNumbers(rows, (journal) => journal.absentChildren)
    };
  });
  const maxMonthlyPresent = Math.max(1, ...monthlyRows.map((row) => row.presentChildren));
  const staffRecordCount = attendance.filter((entry) => entry.personKind === 'staff').length;
  const nonStaffRecordCount = attendance.filter((entry) => entry.personKind === 'nonStaff').length;
  const childPresentForStats = sumNumbers(periodJournals, (journal) => journal.presentChildren);
  const tabs = [
    { key: 'children', label: '아동출결' },
    { key: 'staff', label: '종사자' },
    { key: 'nonStaff', label: '비종사자' },
    { key: 'education', label: '종사자 교육' },
    { key: 'program', label: '프로그램' }
  ] as const;

  const summarizePeopleAttendance = (people: Person[], entries: AttendanceEntry[]) => {
    return people.map((person) => {
      const rows = entries.filter((entry) => entry.personId === person.id);
      return {
        person,
        present: rows.filter(isWorkAttendance).length,
        leave: rows.filter((entry) => entry.status === 'leave').length,
        absent: rows.filter((entry) => entry.status === 'absent').length,
        official: rows.filter((entry) => entry.status === 'official').length,
        substitute: rows.filter((entry) => entry.status === 'substitute').length,
        total: rows.length
      };
    }).filter((row) => row.total || dateInRange(row.person.startedAt || range.start, range.start, range.end));
  };

  return (
    <section className="statistics-workspace">
      <div className="stats-toolbar panel">
        <div>
          <h2>운영 통계</h2>
          <p>{range.start} ~ {range.end} 기준으로 집계합니다.</p>
        </div>
        <div className="stats-filters">
          <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
            {availableYears.map((year) => <option key={year} value={year}>{year}년</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">연간</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="운영일지" value={`${periodJournals.length}일`} />
        <StatCard label="평균 현원" value={`${averageNumbers(periodJournals, (journal) => journal.enrolled)}명`} />
        <StatCard label="아동 출석" value={`${childPresentForStats}명`} />
        <StatCard label="누락 일지" value={`${missingDates.length}일`} tone={missingDates.length ? 'warning' : ''} />
      </section>

      <section className="stats-grid secondary">
        <StatCard label="아동 결석" value={`${sumNumbers(periodJournals, (journal) => journal.absentChildren)}명`} />
        <StatCard label="종사자 기록" value={`${staffRecordCount}건`} />
        <StatCard label="비종사자 기록" value={`${nonStaffRecordCount}건`} />
        <StatCard label="기간 일지" value={`${periodJournals.length}건`} />
      </section>

      <div className="stats-tabs panel">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={selectedTab === tab.key ? 'active' : ''}
            onClick={() => setSelectedTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedTab === 'children' && (
        <>
          <section className="stats-layout">
            <div className="panel chart-panel">
              <PanelTitle title="월별 출석 흐름" actions={<span className="muted">운영일지 출석 합계</span>} />
              <div className="monthly-bars">
                {monthlyRows.map((row) => (
                  <div key={row.month} className="monthly-bar-row">
                    <span>{row.month}월</span>
                    <div>
                      <i style={{ width: `${Math.max(4, (row.presentChildren / maxMonthlyPresent) * 100)}%` }} />
                    </div>
                    <strong>{row.presentChildren}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel quality-panel">
              <PanelTitle
                title="데이터 점검"
                actions={(
                  <span className={missingDates.length ? 'pill amber' : 'pill green'}>
                    {missingDates.length ? '확인 필요' : '정상'}
                  </span>
                )}
              />
              <p>평일 기준 예상 운영일과 생성된 운영일지를 비교합니다.</p>
              <div className="quality-list">
                <span>예상 운영일 {expectedDates.length}일</span>
                <span>생성 일지 {periodJournals.length}일</span>
                <span>누락 {missingDates.length}일</span>
              </div>
              <div className="missing-dates">
                {missingDates.slice(0, 18).map((date) => <span key={date}>{date}</span>)}
                {missingDates.length > 18 && <span>외 {missingDates.length - 18}일</span>}
                {!missingDates.length && <span>누락된 평일 운영일지가 없습니다.</span>}
              </div>
            </div>
          </section>

          <div className="table-card stats-table">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>운영시간</th>
                  <th>담당자</th>
                  <th>정원</th>
                  <th>현원</th>
                  <th>출석</th>
                  <th>결석</th>
                  <th>종사자</th>
                  <th>교사</th>
                  <th>공익</th>
                  <th>기타</th>
                </tr>
              </thead>
              <tbody>
                {periodJournals.map((journal) => (
                  <tr key={journal.id}>
                    <td className="name-cell">{journal.date}</td>
                    <td>{journal.operatingHours || '-'}</td>
                    <td>{journal.manager || '-'}</td>
                    <td>{journal.capacity}</td>
                    <td>{journal.enrolled}</td>
                    <td>{journal.presentChildren}</td>
                    <td>{journal.absentChildren}</td>
                    <td>{journal.staffCount}</td>
                    <td>{journal.teacherCount}</td>
                    <td>{journal.publicServiceCount}</td>
                    <td>{journal.otherVisitorCount}</td>
                  </tr>
                ))}
                {!periodJournals.length && (
                  <tr>
                    <td colSpan={11} className="empty-row">선택한 기간의 운영일지 데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedTab === 'staff' && (() => {
        const staffAttendance = attendance
          .filter((entry) => entry.personKind === 'staff')
          .filter((entry) => dateInRange(entry.date, range.start, range.end));
        const staffRows = summarizePeopleAttendance(staff, staffAttendance);
        return (
          <div className="table-card stats-table">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>직위</th>
                  <th>상태</th>
                  <th>출근</th>
                  <th>연차</th>
                  <th>결근</th>
                  <th>공결</th>
                  <th>대체</th>
                  <th>기록 합계</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map(({ person, present, leave, absent, official, substitute, total }) => (
                  <tr key={person.id}>
                    <td className="name-cell">{person.name}</td>
                    <td>{person.role || '-'}</td>
                    <td><span className="pill green">{person.status || '-'}</span></td>
                    <td>{present}</td>
                    <td>{leave}</td>
                    <td>{absent}</td>
                    <td>{official}</td>
                    <td>{substitute}</td>
                    <td>{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {selectedTab === 'nonStaff' && (() => {
        const nonStaffAttendance = attendance
          .filter((entry) => entry.personKind === 'nonStaff')
          .filter((entry) => dateInRange(entry.date, range.start, range.end));
        const nonStaffRows = summarizePeopleAttendance(nonStaff, nonStaffAttendance);
        const nonStaffGroupRows = ['교사', '공익', '기타'].map((category) => {
          const rows = nonStaffRows.filter(({ person }) => {
            if (category === '기타') return person.category !== '교사' && person.category !== '공익';
            return person.category === category;
          });
          return {
            category,
            people: rows.length,
            present: sumNumbers(rows, (row) => row.present),
            absent: sumNumbers(rows, (row) => row.absent)
          };
        });
        return (
          <>
            <section className="stats-grid secondary">
              {nonStaffGroupRows.map((row) => (
                <StatCard key={row.category} label={`${row.category} 활동`} value={`${row.present}건`} />
              ))}
              <StatCard label="비종사자 인원" value={`${nonStaff.length}명`} />
            </section>
            <div className="table-card stats-table">
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>구분</th>
                    <th>활동유형</th>
                    <th>활동</th>
                    <th>결석</th>
                    <th>기록 합계</th>
                    <th>업무/활동내용</th>
                  </tr>
                </thead>
                <tbody>
                  {nonStaffRows.map(({ person, present, absent, total }) => (
                    <tr key={person.id}>
                      <td className="name-cell">{person.name}</td>
                      <td><span className="pill">{person.category || '기타'}</span></td>
                      <td>{person.role || '-'}</td>
                      <td>{present}</td>
                      <td>{absent}</td>
                      <td>{total}</td>
                      <td className="muted">{person.dutyText || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {selectedTab === 'education' && (
        <section className="plan-grid">
          <div className="panel">
            <h2>종사자 교육 통계</h2>
            <p className="muted">전용 교육 DB가 붙으면 연도별 교육명, 참석자, 시간, 이수 여부를 집계합니다.</p>
            <div className="quality-list">
              <span>교육 데이터 0건</span>
              <span>이수자 0명</span>
              <span>미이수 0명</span>
            </div>
          </div>
          <div className="panel">
            <h2>추가 예정 데이터</h2>
            <ul className="todo-list">
              <li>교육일자, 교육명, 교육시간</li>
              <li>참석 종사자, 출장 여부</li>
              <li>운영일지 통합 관리 자동 반영</li>
            </ul>
          </div>
        </section>
      )}

      {selectedTab === 'program' && (() => {
        const programLines = periodJournals
          .flatMap((journal) => String(journal.workText || '').split(/\r?\n/).map((line) => ({ date: journal.date, line: line.trim() })))
          .filter((item) => item.line.includes('[') || item.line.includes('프로그램') || item.line.includes('학습'));
        return (
          <section className="plan-grid">
            <div className="panel">
              <h2>프로그램 통계</h2>
              <p className="muted">현재는 운영일지 업무내용에서 프로그램성 문구를 임시로 탐색합니다.</p>
              <div className="program-line-list">
                {programLines.slice(0, 12).map((item, index) => (
                  <span key={`${item.date}-${index}`}>{item.date} · {item.line}</span>
                ))}
                {!programLines.length && <span>프로그램계획/일지/평가 DB가 연결되면 이 영역에 표시됩니다.</span>}
              </div>
            </div>
            <div className="panel">
              <h2>확장 예정</h2>
              <ul className="todo-list">
                <li>프로그램계획: 목표, 대상, 회기, 예산</li>
                <li>프로그램일지: 참석자, 진행 내용</li>
                <li>프로그램평가: 결과, 만족도, 개선점</li>
              </ul>
            </div>
          </section>
        );
      })()}
    </section>
  );
}

function TemplateTreeFolderIcons() {
  return (
    <>
      <svg
        className="template-tree-icon template-folder-closed-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
      <svg
        className="template-tree-icon template-folder-open-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        <path d="M2 10h20" />
      </svg>
    </>
  );
}

function TemplateTreeFileIcon() {
  return (
    <svg
      className="template-tree-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function JournalTemplateWorkspace({ snapshot }: { snapshot: DashboardSnapshot }) {
  type TemplateCellSelection = {
    tableIndex: number;
    rowIndex: number;
    cellIndex: number;
    label: string;
  };

  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState(snapshot.journals[0]?.id || '');
  const [templateName, setTemplateName] = useState('기본 운영일지');
  const [templateGroup, setTemplateGroup] = useState('일지');
  const [templateHtml, setTemplateHtml] = useState(defaultJournalTemplateHtml);
  const [message, setMessage] = useState('운영일지 템플릿을 준비했습니다.');
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFieldToken, setSelectedFieldToken] = useState(journalTemplateFields[0]?.token || '{{날짜}}');
  const [selectedTemplateCell, setSelectedTemplateCell] = useState<TemplateCellSelection | null>(null);
  const [openTemplateGroups, setOpenTemplateGroups] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<DocumentPreviewMode>('rhwp');
  const compactLayout = useMediaQuery('(max-width: 1180px)');
  const [templatePaneWidths, setTemplatePaneWidths] = useState(() => {
    try {
      const saved = window.localStorage.getItem('seochang-template-pane-widths');
      const parsed = saved ? JSON.parse(saved) as { list?: number; editor?: number } : null;
      return {
        list: typeof parsed?.list === 'number' ? Math.min(520, Math.max(210, parsed.list)) : 250,
        editor: typeof parsed?.editor === 'number' ? Math.min(560, Math.max(320, parsed.editor)) : 390
      };
    } catch {
      return { list: 250, editor: 390 };
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadJournalTemplates()
      .then((items) => {
        setTemplates(items);
        const defaultTemplate = items.find((item) => item.isDefault) || items[0];
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setTemplateName(defaultTemplate.name);
          setTemplateGroup(defaultTemplate.groupName);
          setTemplateHtml(defaultTemplate.html);
        }
      })
      .catch((error) => {
        setMessage(`템플릿 로딩 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, []);

  useEffect(() => {
    const selected = templates.find((template) => template.id === selectedTemplateId);
    if (!selected) return;
    setTemplateName(selected.name);
    setTemplateGroup(selected.groupName);
    setTemplateHtml(selected.html);
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedJournalId && snapshot.journals[0]) {
      setSelectedJournalId(snapshot.journals[0].id);
    }
  }, [selectedJournalId, snapshot.journals]);

  useEffect(() => {
    window.localStorage.setItem('seochang-template-pane-widths', JSON.stringify(templatePaneWidths));
  }, [templatePaneWidths]);

  const selectedJournal = snapshot.journals.find((journal) => journal.id === selectedJournalId) || snapshot.journals[0];
  const renderedHtml = selectedJournal
    ? renderJournalTemplate(templateHtml, selectedJournal, snapshot.staff, snapshot.nonStaff, snapshot.attendance)
    : '<div class="journal-page">운영일지 데이터가 없습니다.</div>';
  const templateGroups = useMemo(() => {
    const names = new Set<string>(['일지', ...customGroups]);
    templates.forEach((template) => names.add(template.groupName || '일지'));
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'ko'));
  }, [customGroups, templates]);
  const groupedTemplates = useMemo(() => {
    return templateGroups.map((groupName) => ({
      groupName,
      items: templates
        .filter((template) => (template.groupName || '일지') === groupName)
      .sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name, 'ko'))
    }));
  }, [templateGroups, templates]);

  useEffect(() => {
    setOpenTemplateGroups((current) => {
      const next = new Set(current);
      templateGroups.forEach((groupName) => next.add(groupName));
      return Array.from(next).filter((groupName) => templateGroups.includes(groupName));
    });
  }, [templateGroups]);

  const toggleTemplateGroup = (groupName: string, open: boolean) => {
    setTemplateGroup(groupName);
    setOpenTemplateGroups((current) => {
      if (open) return Array.from(new Set([...current, groupName]));
      return current.filter((item) => item !== groupName);
    });
  };

  const markSelectedPreviewCell = () => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.querySelectorAll('.template-preview-selected-cell').forEach((node) => {
      node.classList.remove('template-preview-selected-cell');
    });
    if (!selectedTemplateCell) return;
    const table = preview.querySelectorAll('table')[selectedTemplateCell.tableIndex] as HTMLTableElement | undefined;
    const row = table ? Array.from(table.rows)[selectedTemplateCell.rowIndex] : undefined;
    const cell = row ? Array.from(row.cells)[selectedTemplateCell.cellIndex] : undefined;
    cell?.classList.add('template-preview-selected-cell');
  };

  useEffect(() => {
    markSelectedPreviewCell();
  }, [renderedHtml, selectedTemplateCell]);

  const insertField = (token: string) => {
    setSelectedFieldToken(token);
    if (selectedTemplateCell) {
      const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
      const cell = findTemplateCell(doc, selectedTemplateCell);
      if (cell) {
        cell.innerHTML = token;
        setTemplateHtml(doc.body.innerHTML);
        setMessage(`${selectedTemplateCell.label}에 ${token} 필드를 넣었습니다.`);
        return;
      }
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateHtml((current) => current + token);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setTemplateHtml((current) => current.slice(0, start) + token + current.slice(end));
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const findTemplateCell = (doc: Document, selection: TemplateCellSelection | null) => {
    if (!selection) return null;
    const table = doc.body.querySelectorAll('table')[selection.tableIndex] as HTMLTableElement | undefined;
    const row = table ? Array.from(table.rows)[selection.rowIndex] : undefined;
    const cell = row ? Array.from(row.cells)[selection.cellIndex] : undefined;
    return cell || null;
  };

  const selectPreviewCell = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement | null;
    const fallbackRoot = event.currentTarget as HTMLDivElement;
    const preview = previewRef.current?.contains(cell) ? previewRef.current : fallbackRoot;
    if (!cell || !preview || !preview.contains(cell)) return;
    const table = cell.closest('table') as HTMLTableElement | null;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row) return;
    const tableIndex = Array.from(preview.querySelectorAll('table')).indexOf(table);
    const rowIndex = Array.from(table.rows).indexOf(row);
    const cellIndex = Array.from(row.cells).indexOf(cell);
    if (tableIndex < 0 || rowIndex < 0 || cellIndex < 0) return;
    const nextSelection = {
      tableIndex,
      rowIndex,
      cellIndex,
      label: `표 ${tableIndex + 1} · ${rowIndex + 1}행 ${cellIndex + 1}칸`
    };
    setSelectedTemplateCell(nextSelection);
    setMessage(`${nextSelection.label}을 선택했습니다. 필드를 교체하거나 추가할 수 있습니다.`);
    preview.querySelectorAll('.template-preview-selected-cell').forEach((node) => {
      node.classList.remove('template-preview-selected-cell');
    });
    cell.classList.add('template-preview-selected-cell');
    window.requestAnimationFrame(markSelectedPreviewCell);
  };

  const updateSelectedCell = (mode: 'replace' | 'append' | 'clear') => {
    if (!selectedTemplateCell) {
      setMessage('먼저 미리보기에서 수정할 표 칸을 클릭해 주세요.');
      return;
    }
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const cell = findTemplateCell(doc, selectedTemplateCell);
    if (!cell) {
      setMessage('선택한 칸을 템플릿 코드에서 찾지 못했습니다. 다시 클릭해 주세요.');
      setSelectedTemplateCell(null);
      return;
    }
    if (mode === 'replace') {
      cell.innerHTML = selectedFieldToken;
    } else if (mode === 'append') {
      const current = cell.innerHTML.trim();
      cell.innerHTML = current && current !== '&nbsp;' ? `${current} ${selectedFieldToken}` : selectedFieldToken;
    } else {
      cell.innerHTML = '&nbsp;';
    }
    setTemplateHtml(doc.body.innerHTML);
    setMessage(`${selectedTemplateCell.label} ${mode === 'replace' ? '교체' : mode === 'append' ? '추가' : '비우기'} 완료`);
  };

  const fitSelectedTableWidth = () => {
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const tables = Array.from(doc.body.querySelectorAll('table')) as HTMLTableElement[];
    const targets = selectedTemplateCell ? [tables[selectedTemplateCell.tableIndex]].filter(Boolean) : tables;
    if (!targets.length) {
      setMessage('폭을 맞출 표를 찾지 못했습니다.');
      return;
    }
    targets.forEach((table) => {
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'fixed';
      table.style.borderCollapse = 'collapse';
      table.style.boxSizing = 'border-box';
      Array.from(table.querySelectorAll('td, th')).forEach((cell) => {
        const target = cell as HTMLTableCellElement;
        target.style.boxSizing = 'border-box';
        target.style.wordBreak = 'break-all';
        target.style.overflowWrap = 'anywhere';
      });
    });
    setTemplateHtml(doc.body.innerHTML);
    setMessage(selectedTemplateCell ? `${selectedTemplateCell.label}이 있는 표 폭을 100%로 맞췄습니다.` : '모든 표 폭을 100%로 맞췄습니다.');
  };

  const saveTemplate = async () => {
    const current = templates.find((template) => template.id === selectedTemplateId);
    const next: JournalTemplate = {
      id: current?.id || `template-${Date.now()}`,
      name: templateName.trim() || '이름 없는 템플릿',
      groupName: templateGroup.trim() || '일지',
      html: templateHtml,
      isDefault: current?.isDefault ?? true
    };
    await saveJournalTemplate(next);
    const items = await loadJournalTemplates();
    setTemplates(items);
    setSelectedTemplateId(next.id);
    setMessage('템플릿을 저장했습니다.');
  };

  const createTemplate = () => {
    const id = `template-${Date.now()}`;
    const groupName = templateGroup.trim() || templateGroups[0] || '일지';
    setSelectedTemplateId(id);
    setTemplateName('새 운영일지 템플릿');
    setTemplateGroup(groupName);
    setTemplateHtml(defaultJournalTemplateHtml);
    setTemplates((current) => [
      { id, name: '새 운영일지 템플릿', groupName, html: defaultJournalTemplateHtml, isDefault: false },
      ...current
    ]);
    setMessage(`${groupName} 그룹에 새 템플릿을 만들었습니다.`);
  };

  const addTemplateGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      setMessage('그룹 이름을 입력해 주세요.');
      return;
    }
    setCustomGroups((current) => Array.from(new Set([...current, name])));
    setTemplateGroup(name);
    setNewGroupName('');
    setMessage(`${name} 그룹을 만들었습니다. 이 그룹으로 저장하면 목록에 유지됩니다.`);
  };

  const copyRenderedHtml = async () => {
    await navigator.clipboard.writeText(renderedHtml);
    setMessage('미리보기 HTML을 복사했습니다.');
  };

  const downloadRenderedHwpx = async () => {
    const safeName = (templateName || '운영일지').replace(/[^\d가-힣A-Za-z_-]+/g, '_');
    setMessage('HWPX 파일을 준비하고 있습니다.');
    try {
      await downloadHwpxFromHtml(renderedHtml, `${safeName}.hwpx`);
      setMessage('HWPX 파일을 내려받았습니다.');
    } catch (error) {
      setMessage(`HWPX 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const resetToDefaultTemplate = () => {
    setTemplateName('기본 운영일지');
    setTemplateGroup('일지');
    setTemplateHtml(defaultJournalTemplateHtml);
    setMessage('기본 운영일지 템플릿으로 되돌렸습니다. 저장을 누르면 적용됩니다.');
  };

  const printRenderedHtml = () => {
    const printWindow = window.open('', '_blank', 'width=980,height=900');
    if (!printWindow) {
      setMessage('인쇄 창을 열 수 없습니다. 팝업 차단 설정을 확인해주세요.');
      return;
    }
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>운영일지 인쇄</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0; background: #fff; }
            .journal-page { box-shadow: none !important; page-break-after: always; }
          </style>
        </head>
        <body>${renderedHtml}</body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const fieldGroups = journalTemplateFields.reduce<Record<string, typeof journalTemplateFields>>((acc, field) => {
    acc[field.group] = acc[field.group] || [];
    acc[field.group].push(field);
    return acc;
  }, {});
  const clampTemplatePaneWidth = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const beginTemplatePaneResize = (target: 'list' | 'editor') => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = templatePaneWidths;
    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setTemplatePaneWidths({
        list: target === 'list' ? clampTemplatePaneWidth(startWidths.list + delta, 210, 520) : startWidths.list,
        editor: target === 'editor' ? clampTemplatePaneWidth(startWidths.editor - delta, 320, 560) : startWidths.editor
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
  const templateGridTemplate = compactLayout
    ? 'minmax(0, 1fr)'
    : `${templatePaneWidths.list}px 10px minmax(720px, 1fr) 10px ${templatePaneWidths.editor}px`;

  return (
    <section className="journal-workspace template-workspace" style={{ gridTemplateColumns: templateGridTemplate }}>
      <div className="panel journal-list-panel">
        <PanelTitle title="템플릿목록" actions={<button type="button" onClick={createTemplate}>새 템플릿</button>} />
        <div className="template-group-create">
          <input
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="새 그룹 이름"
          />
          <button type="button" onClick={addTemplateGroup}>그룹 추가</button>
        </div>
        <div className="template-tree-container">
          <ul className="template-tree-list">
            {groupedTemplates.map((group, groupIndex) => {
              const folderId = `template-folder-${groupIndex}`;
              const isOpen = openTemplateGroups.includes(group.groupName);
              return (
                <li className="template-tree-node" key={group.groupName}>
                  <input
                    type="checkbox"
                    id={folderId}
                    className="template-tree-toggle"
                    checked={isOpen}
                    onChange={(event) => toggleTemplateGroup(group.groupName, event.target.checked)}
                  />
                  <label
                    htmlFor={folderId}
                    className={`template-tree-label ${templateGroup === group.groupName ? 'is-active' : ''}`}
                    title={group.groupName}
                  >
                    <TemplateTreeFolderIcons />
                    <span>{group.groupName}</span>
                    <em>{group.items.length}</em>
                  </label>
                  <div className="template-tree-children-wrapper">
                    <ul className="template-tree-children">
                      {group.items.map((template) => (
                        <li className="template-tree-node" key={template.id}>
                          <button
                            type="button"
                            className={`template-file-item ${template.id === selectedTemplateId ? 'is-selected' : ''}`}
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setTemplateGroup(group.groupName);
                            }}
                          >
                            <TemplateTreeFileIcon />
                            <span>{template.name || '이름 없는 템플릿'}</span>
                            {template.isDefault && <em>기본</em>}
                          </button>
                        </li>
                      ))}
                      {!group.items.length && (
                        <li className="template-tree-node">
                          <div className="template-file-item is-empty">
                            <TemplateTreeFileIcon />
                            <span>아직 템플릿이 없습니다.</span>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {!compactLayout && (
        <div
          className="journal-pane-resizer template-pane-resizer"
          role="separator"
          aria-label="템플릿 목록 너비 조절"
          onPointerDown={beginTemplatePaneResize('list')}
        />
      )}

      <div className="panel preview-panel template-document-panel">
        <PanelTitle
          title="문서 에디터"
          description="표를 직접 누르고 수정하면서 오른쪽에서 필드를 꽂습니다."
          actions={(
            <div className="button-cluster">
              <label className="preview-date-select">
                날짜
                <select value={selectedJournal?.id || ''} onChange={(event) => setSelectedJournalId(event.target.value)}>
                  {snapshot.journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.date} · {journal.manager || '담당자 없음'}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={copyRenderedHtml}>HTML 복사</button>
              <button type="button" onClick={downloadRenderedHwpx}>HWPX 다운로드</button>
              <button type="button" className="primary small" onClick={printRenderedHtml}>인쇄</button>
            </div>
          )}
        />
        <PreviewModeTabs value={previewMode} onChange={setPreviewMode} editable />
        {previewMode === 'html' ? (
          <div className="a4-preview-stage">
            <div
              ref={previewRef}
              className="a4-preview template-clickable-preview"
              onClickCapture={selectPreviewCell}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        ) : previewMode === 'htmlEdit' ? (
          <HtmlTemplateEditor html={templateHtml} onCommit={setTemplateHtml} onSelectCell={selectPreviewCell} />
        ) : previewMode === 'rhwp' ? (
          <RhwpEditorPane html={templateHtml} onHtmlCommit={setTemplateHtml} defaultHtml={defaultJournalTemplateHtml} />
        ) : (
          <HwpStylePreview html={renderedHtml} />
        )}
      </div>
      {!compactLayout && (
        <div
          className="journal-pane-resizer template-pane-resizer"
          role="separator"
          aria-label="필드 설정 너비 조절"
          onPointerDown={beginTemplatePaneResize('editor')}
        />
      )}

      <div className="panel template-editor-panel template-inspector-panel">
        <PanelTitle
          title="필드 / 설정"
          description="선택한 칸에 값을 넣거나 템플릿 정보를 관리합니다."
          actions={(
            <div className="button-cluster">
              <button type="button" onClick={resetToDefaultTemplate}>기본 복구</button>
              <button type="button" className="primary small" onClick={saveTemplate}>저장</button>
            </div>
          )}
        />
        <div className="template-meta-grid">
          <label>
            이름
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          </label>
          <label>
            그룹
            <input value={templateGroup} onChange={(event) => setTemplateGroup(event.target.value)} />
          </label>
        </div>
        <div className="template-cell-tools">
          <div>
            <span>선택 칸</span>
            <strong>{selectedTemplateCell?.label || '문서의 표 칸을 클릭하세요'}</strong>
          </div>
          <label>
            필드
            <select value={selectedFieldToken} onChange={(event) => setSelectedFieldToken(event.target.value)}>
              {journalTemplateFields.map((field) => (
                <option key={field.token} value={field.token}>{field.group} · {field.label}</option>
              ))}
            </select>
          </label>
          <div className="template-cell-tool-actions">
            <button type="button" onClick={() => updateSelectedCell('replace')}>칸 교체</button>
            <button type="button" onClick={() => updateSelectedCell('append')}>뒤에 추가</button>
            <button type="button" onClick={() => updateSelectedCell('clear')}>칸 비우기</button>
            <button type="button" onClick={fitSelectedTableWidth}>표 폭 맞춤</button>
          </div>
        </div>
        <div className="field-bank">
          {Object.entries(fieldGroups).map(([group, fields]) => (
            <div key={group}>
              <strong>{group}</strong>
              <div>
                {fields.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    className={selectedFieldToken === field.token ? 'active' : ''}
                    onClick={() => insertField(field.token)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <details className="template-code-details">
          <summary>고급 HTML 코드</summary>
          <textarea
            ref={textareaRef}
            className="template-code"
            value={templateHtml}
            onChange={(event) => setTemplateHtml(event.target.value)}
          />
        </details>
        <p className="editor-message">{message}</p>
      </div>
    </section>
  );
}

function JournalCreateWorkspace({
  snapshot,
  onGenerated
}: {
  snapshot: DashboardSnapshot;
  onGenerated: (message: string) => void;
}) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState<number | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(`누락 날짜를 확인한 뒤 생성 버튼을 누르면 ${getDataProviderLabel()}에 저장됩니다.`);
  const expected = useMemo(() => expectedWeekdays(year, month), [year, month]);
  const existing = useMemo(() => new Set(safeRows(snapshot.journals).map((journal) => journal.date)), [snapshot.journals]);
  const missing = expected.filter((date) => !existing.has(date));
  const createMissingJournals = async () => {
    if (!missing.length || saving) return;
    setSaving(true);
    setMessage('운영일지를 생성하는 중입니다.');
    try {
      const journals = missing.map((date) => buildJournalFromSnapshot(date, snapshot));
      const summary = await saveGeneratedJournals(journals);
      const nextMessage = `${summary.created}건 생성 완료. 기존 일지는 건드리지 않았습니다.`;
      setMessage(nextMessage);
      onGenerated(nextMessage);
    } catch (error) {
      setMessage(`일지 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="statistics-workspace">
      <div className="panel stats-toolbar">
        <div>
          <h2>일지 생성</h2>
          <p>스프레드시트의 “일지 생성” 흐름과 동일하게 기간을 고르고 누락 날짜를 먼저 확인합니다.</p>
        </div>
        <div className="stats-filters">
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {yearOptions.map((option) => <option key={option} value={option}>{option}년</option>)}
          </select>
          <select value={month} onChange={(event) => setMonth(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
            <option value="all">연간</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((option) => (
              <option key={option} value={option}>{option}월</option>
            ))}
          </select>
          <button className="action-button primary" type="button" onClick={createMissingJournals} disabled={!missing.length || saving}>
            {saving ? '생성 중...' : '누락 운영일 생성'}
          </button>
        </div>
      </div>

      <section className="stats-grid secondary">
        <StatCard label="기대 운영일" value={`${expected.length}일`} />
        <StatCard label="생성됨" value={`${expected.length - missing.length}일`} />
        <StatCard label="누락" value={`${missing.length}일`} tone={missing.length ? 'warning' : ''} />
        <StatCard label="기준" value={month === 'all' ? '연간' : `${month}월`} />
      </section>

      <div className="panel quality-panel">
        <h2>누락 날짜</h2>
        <p>{message}</p>
        <div className="missing-dates">
          {missing.slice(0, 180).map((date) => <span key={date}>{date}</span>)}
          {!missing.length && <span>누락 없음</span>}
        </div>
      </div>
    </section>
  );
}

type ProgramPlanActionIcon = 'file' | 'folder' | 'hash' | 'label';

const programPlanSamples = [
  {
    id: 'annual-plan',
    title: '연간 프로그램 계획',
    subtitle: '기초학습, 문화체험, 미술활동 연간 운영 흐름',
    meta: '2026',
    status: '기본',
    description: '연간 운영 방향, 월별 프로그램, 담당자 배치 기준을 한 번에 정리하는 계획입니다.'
  },
  {
    id: 'basic-learning',
    title: '기초학습 지도 계획',
    subtitle: '저학년 수학·국어 보충 / 주 2회',
    meta: '학기중',
    status: '작성중',
    description: '참여 아동별 학습 수준과 보충 과제를 운영일지 업무내용과 연결할 예정입니다.'
  },
  {
    id: 'fun-art',
    title: 'FUN FUN 미술프로그램',
    subtitle: '창의미술 / 담당 김성은 / 고학년 중심',
    meta: '방학중',
    status: '검토',
    description: '프로그램 계획, 일지, 평가까지 이어지는 대표 샘플 계획입니다.'
  },
  {
    id: 'sports-play',
    title: '신체활동 프로그램',
    subtitle: '실내 놀이·체육 / 안전지도 포함',
    meta: '월간',
    status: '초안',
    description: '하절기와 동절기 활동 제한을 고려해 대체 활동까지 함께 관리합니다.'
  }
];

const programPlanQuickActions: Array<{
  icon: ProgramPlanActionIcon;
  label: string;
  helper: string;
}> = [
  { icon: 'file', label: '새 계획서 만들기', helper: '프로그램명, 목표, 대상, 일정 입력' },
  { icon: 'folder', label: '새 분류 만들기', helper: '방학중, 학기중, 특화사업 그룹화' },
  { icon: 'hash', label: '태그 추가', helper: '기초학습, 미술, 체육 같은 검색 태그' },
  { icon: 'label', label: '라벨 추가', helper: '진행중, 평가필요, 제출완료 상태 표시' }
];

function ProgramSearchIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ProgramFolderIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function ProgramFilePlusIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ProgramFolderPlusIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProgramHashIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

function ProgramTagIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function ProgramActionIcon({ icon }: { icon: ProgramPlanActionIcon }) {
  if (icon === 'folder') return <ProgramFolderPlusIcon />;
  if (icon === 'hash') return <ProgramHashIcon />;
  if (icon === 'label') return <ProgramTagIcon />;
  return <ProgramFilePlusIcon />;
}

function ProgramPlansWorkspace() {
  const [query, setQuery] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(programPlanSamples[0].id);

  const filteredPlans = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return programPlanSamples;
    return programPlanSamples.filter((plan) => (
      `${plan.title} ${plan.subtitle} ${plan.meta} ${plan.status}`.toLowerCase().includes(normalized)
    ));
  }, [query]);

  const selectedPlan = programPlanSamples.find((plan) => plan.id === selectedPlanId) || filteredPlans[0] || programPlanSamples[0];

  return (
    <section className="program-plans-workspace">
      <div className="program-command-card">
        <div className="program-search-row">
          <ProgramSearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="프로그램 계획 검색..."
          />
        </div>

        <div className="program-command-section">
          <div className="program-section-title">최근 계획</div>
          <div className="program-command-list">
            {filteredPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`program-command-item ${selectedPlan.id === plan.id ? 'active' : ''}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <ProgramFolderIcon />
                <span>
                  <strong>{plan.title}</strong>
                  <em>{plan.subtitle}</em>
                </span>
                <small>{plan.meta}</small>
              </button>
            ))}
            {!filteredPlans.length && (
              <div className="program-empty-command">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="program-command-section">
          <div className="program-section-title">빠른 작업</div>
          <div className="program-command-list">
            {programPlanQuickActions.map((action) => (
              <button key={action.label} type="button" className="program-command-item action">
                <ProgramActionIcon icon={action.icon} />
                <span>
                  <strong>{action.label}</strong>
                  <em>{action.helper}</em>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel program-plan-detail-panel">
        <span className="eyebrow">프로그램 계획</span>
        <div className="program-detail-head">
          <div>
            <h2>{selectedPlan.title}</h2>
            <p>{selectedPlan.description}</p>
          </div>
          <span className="program-status-pill">{selectedPlan.status}</span>
        </div>
        <div className="program-plan-metrics">
          <div>
            <span>분류</span>
            <strong>{selectedPlan.meta}</strong>
          </div>
          <div>
            <span>담당</span>
            <strong>미지정</strong>
          </div>
          <div>
            <span>연동</span>
            <strong>운영일지 준비</strong>
          </div>
        </div>
        <div className="program-plan-next">
          <strong>다음 연결</strong>
          <span>계획서 입력, 대상 아동, 담당자, 프로그램 일지, 평가 항목을 순서대로 붙이면 됩니다.</span>
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

        {snapshot && view === 'journalStats' && <StatisticsWorkspace snapshot={snapshot} />}

        {snapshot && view === 'journalCreate' && (
          <JournalCreateWorkspace
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
          <ChildAttendanceWorkspace
            snapshot={snapshot}
            onSaved={handleDataChanged}
          />
        )}

        {snapshot && view === 'journalPrint' && (
          <JournalEditPage
            PreviewModeTabs={PreviewModeTabs}
            RhwpEditorPane={RhwpEditorPane}
            snapshot={snapshot}
            onSaved={handleDataChanged}
          />
        )}

        {snapshot && view === 'templateManager' && <JournalTemplateWorkspace snapshot={snapshot} />}

        {view === 'programPlans' && <ProgramPlansWorkspace />}

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
