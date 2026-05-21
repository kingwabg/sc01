import { useMemo, useState } from 'react';
import type { AttendanceEntry, Child, ChildAttendanceEntry, DashboardSnapshot, JournalEntry, Person } from '../../types';
import { getDataProviderLabel, saveGeneratedJournals } from '../../data/dataProvider';
import { yearOptions } from '../../app/navigation';
import { safeRows } from '../../shared/lib/arrays';
import { StatCard } from '../../shared/ui/StatCard';

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

export function JournalCreatePage({
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


