import { useState } from 'react';
import type { AttendanceEntry, DashboardSnapshot, Person } from '../../types';
import { yearOptions } from '../../app/navigation';
import { safeRows } from '../../shared/lib/arrays';
import { PanelTitle } from '../../shared/ui/PanelTitle';
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

export function StatisticsPage({ snapshot }: { snapshot: DashboardSnapshot }) {
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


