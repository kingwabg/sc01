import { useEffect, useMemo, useState } from 'react';
import type { Child, ChildAttendanceEntry, ChildYearRecord, DashboardSnapshot } from '../../types';
import { deleteChildAttendanceEntry, saveChildAttendanceEntries } from '../../data/dataProvider';
import { yearOptions } from '../../app/navigation';
import { safeRows } from '../../shared/lib/arrays';
import { StatCard } from '../../shared/ui/StatCard';

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

function mergeChildForYear(child: Child, record?: ChildYearRecord): Child {
  if (!record) return child;
  return {
    ...child,
    ...record,
    id: child.id
  };
}

export function ChildAttendancePage({
  snapshot,
  onSaved
}: {
  snapshot: DashboardSnapshot;
  onSaved: (message: string) => void;
}) {
  const baseChildren = safeRows(snapshot.children);
  const childAttendance = safeRows(snapshot.childAttendance);
  const childYearRecords = safeRows(snapshot.childYearRecords);
  const availableYears = Array.from(
    new Set([
      ...yearOptions,
      ...childAttendance.map((entry) => Number(entry.date.slice(0, 4))).filter(Boolean),
      ...baseChildren.map((child) => Number(child.joinedAt.slice(0, 4))).filter(Boolean),
      ...childYearRecords.map((record) => record.year).filter(Boolean)
    ])
  ).sort();
  const [selectedYear, setSelectedYear] = useState(availableYears[availableYears.length - 1] || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const todayKey = formatDateKey(new Date());
  const range = getPeriodRange(selectedYear, selectedMonth);
  const yearRecordMap = useMemo(
    () => new Map(childYearRecords.map((record) => [`${record.childId}:${record.year}`, record])),
    [childYearRecords]
  );
  const children = useMemo(
    () => baseChildren.map((child) => mergeChildForYear(child, yearRecordMap.get(`${child.id}:${selectedYear}`))),
    [baseChildren, selectedYear, yearRecordMap]
  );
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


