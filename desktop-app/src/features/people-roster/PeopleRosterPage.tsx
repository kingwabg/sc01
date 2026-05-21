import { useMemo, useState } from 'react';
import type { Person } from '../../types';
import { compareTableValues, normalizeFilterText, SortableHeader, uniqueFilterOptions, usePersistentColumnWidths } from '../../shared/ui/data-table';
import type { SortDirection } from '../../shared/ui/data-table';

type PeopleSortKey = 'index' | 'name' | 'role' | 'category' | 'status' | 'startedAt' | 'endedAt' | 'dutyText';

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

export function PeopleRosterPage({ rows, title = '인력 데이터', storageKey = 'people' }: { rows: Person[]; title?: string; storageKey?: string }) {
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


