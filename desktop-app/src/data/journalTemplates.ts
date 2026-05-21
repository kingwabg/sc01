import type { AttendanceEntry, JournalEntry, Person } from '../types';

export const journalTemplateFields = [
  { label: '날짜', token: '{{날짜}}', group: '기본' },
  { label: '운영시간', token: '{{운영시간}}', group: '기본' },
  { label: '담당자', token: '{{담당자}}', group: '기본' },
  { label: '담당자 도장', token: '{{담당자도장}}', group: '결재' },
  { label: '팀장 도장', token: '{{팀장도장}}', group: '결재' },
  { label: '센터장 도장', token: '{{센터장도장}}', group: '결재' },
  { label: '정원', token: '{{정원}}', group: '아동현황' },
  { label: '현원', token: '{{현원}}', group: '아동현황' },
  { label: '출석', token: '{{출석}}', group: '아동현황' },
  { label: '공결', token: '{{공결}}', group: '아동현황' },
  { label: '대체출석', token: '{{대체출석}}', group: '아동현황' },
  { label: '결석', token: '{{결석}}', group: '아동현황' },
  { label: '출석 기타', token: '{{출석기타}}', group: '아동현황' },
  { label: '남 취학전', token: '{{남_취학전}}', group: '성별/학년' },
  { label: '남 탈학교', token: '{{남_탈학교}}', group: '성별/학년' },
  { label: '남 초등학교', token: '{{남_초등학교}}', group: '성별/학년' },
  { label: '남 중학교', token: '{{남_중학교}}', group: '성별/학년' },
  { label: '남 고등학교', token: '{{남_고등학교}}', group: '성별/학년' },
  { label: '남 기타', token: '{{남_기타}}', group: '성별/학년' },
  { label: '남 계', token: '{{남_계}}', group: '성별/학년' },
  { label: '여 취학전', token: '{{여_취학전}}', group: '성별/학년' },
  { label: '여 탈학교', token: '{{여_탈학교}}', group: '성별/학년' },
  { label: '여 초등학교', token: '{{여_초등학교}}', group: '성별/학년' },
  { label: '여 중학교', token: '{{여_중학교}}', group: '성별/학년' },
  { label: '여 고등학교', token: '{{여_고등학교}}', group: '성별/학년' },
  { label: '여 기타', token: '{{여_기타}}', group: '성별/학년' },
  { label: '여 계', token: '{{여_계}}', group: '성별/학년' },
  { label: '조식', token: '{{조식}}', group: '급식' },
  { label: '중식', token: '{{중식}}', group: '급식' },
  { label: '석식', token: '{{석식}}', group: '급식' },
  { label: '종사자수', token: '{{종사자수}}', group: '인력' },
  { label: '교사수', token: '{{교사수}}', group: '인력' },
  { label: '공익수', token: '{{공익수}}', group: '인력' },
  { label: '기타수', token: '{{기타수}}', group: '인력' },
  { label: '지도 및 협의사항', token: '{{지도및협의사항}}', group: '통합관리' },
  { label: '종사자명단', token: '{{종사자명단}}', group: '통합관리' },
  { label: '아동변동', token: '{{아동변동}}', group: '통합관리' },
  { label: '방문자명단', token: '{{방문자명단}}', group: '통합관리' },
  { label: '시설', token: '{{시설}}', group: '통합관리' },
  { label: '업무내용', token: '{{업무내용}}', group: '업무' },
  { label: '기타', token: '{{기타}}', group: '업무' }
];

export const defaultJournalTemplateHtml = `<style>
  .journal-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#111827;font-family:"Malgun Gothic","맑은 고딕",sans-serif;padding:15mm 10mm 18mm;box-shadow:0 16px 45px rgba(15,23,42,.18)}
  .journal-title-table,.journal-main-table{width:100%;border-collapse:collapse;table-layout:fixed}
  .journal-title-table{margin-bottom:4mm}
  .journal-title{font-size:24px;font-weight:800;text-align:center;line-height:1.2}
  .journal-main-table td,.journal-title-table td{border:1px solid #9ca3af;padding:4px 5px;font-size:10.5px;line-height:1.3;vertical-align:middle;word-break:break-all;overflow-wrap:anywhere}
  .gray{background:#d9d9d9;font-weight:800;text-align:center}
  .white{background:#fff;text-align:center}
  .left{text-align:left}
  .approval-label{width:18px;background:#d9d9d9;text-align:center;font-weight:800}
  .approval-head{height:16px;background:#d9d9d9;text-align:center;font-weight:800;font-size:9px}
  .approval-stamp{height:42px;text-align:center;color:#dc2626;font-weight:900;font-size:12px}
  .section-title{text-align:center;font-weight:800;background:#d9d9d9}
  .work-cell{height:250px;vertical-align:top!important;padding:8px!important;line-height:1.55!important}
  .footer{text-align:center;color:#64748b;font-size:10px;margin-top:8mm}
</style>
<div class="journal-page">
  <table class="journal-title-table">
    <tbody>
      <tr>
        <td rowspan="2" class="journal-title">운영일지(아동)</td>
        <td rowspan="2" class="approval-label">결<br>재</td>
        <td class="approval-head">담당자</td>
        <td class="approval-head">팀장</td>
        <td class="approval-head">센터장</td>
      </tr>
      <tr>
        <td class="approval-stamp">{{담당자도장}}</td>
        <td class="approval-stamp">{{팀장도장}}</td>
        <td class="approval-stamp">{{센터장도장}}</td>
      </tr>
    </tbody>
  </table>

  <table class="journal-main-table">
    <colgroup>
      <col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%">
      <col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%">
      <col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%">
      <col style="width:7.14%"><col style="width:7.18%">
    </colgroup>
    <tbody>
      <tr>
        <td colspan="2" class="gray">일자</td>
        <td colspan="4" class="white">{{날짜}}</td>
        <td colspan="2" class="gray">운영시간</td>
        <td colspan="3" class="white">{{운영시간}}</td>
        <td class="gray">담당자</td>
        <td colspan="2" class="white">{{담당자}}</td>
      </tr>
      <tr>
        <td rowspan="3" class="gray">아동<br>현황<br><span style="font-size:9px">(취약구분)</span></td>
        <td class="gray">성별</td><td class="gray">취학전</td><td class="gray">탈학교</td><td class="gray">초등<br>학교</td><td class="gray">중학교</td><td class="gray">고등<br>학교</td><td class="gray">기타</td><td class="gray">계</td>
        <td colspan="2" rowspan="3" class="gray">급식현황</td><td class="gray">조식</td><td colspan="2" class="white">{{조식}}</td>
      </tr>
      <tr>
        <td class="gray">남</td><td class="white">{{남_취학전}}</td><td class="white">{{남_탈학교}}</td><td class="white">{{남_초등학교}}</td><td class="white">{{남_중학교}}</td><td class="white">{{남_고등학교}}</td><td class="white">{{남_기타}}</td><td class="white">{{남_계}}</td>
        <td class="gray">중식</td><td colspan="2" class="white">{{중식}}</td>
      </tr>
      <tr>
        <td class="gray">여</td><td class="white">{{여_취학전}}</td><td class="white">{{여_탈학교}}</td><td class="white">{{여_초등학교}}</td><td class="white">{{여_중학교}}</td><td class="white">{{여_고등학교}}</td><td class="white">{{여_기타}}</td><td class="white">{{여_계}}</td>
        <td class="gray">석식</td><td colspan="2" class="white">{{석식}}</td>
      </tr>
      <tr>
        <td rowspan="2" class="gray">아동<br>출석<br><span style="font-size:9px">(출석구분)</span></td>
        <td class="gray">정원</td><td class="gray">현원</td><td class="gray">출석</td><td class="gray">공결</td><td class="gray">대체<br>출석</td><td class="gray">결석</td><td class="gray">기타</td>
        <td colspan="2" rowspan="2" class="gray">교사현황</td><td class="gray">종사자</td><td class="gray">교사</td><td class="gray">공익</td><td class="gray">기타</td>
      </tr>
      <tr>
        <td class="white">{{정원}}</td><td class="white">{{현원}}</td><td class="white">{{출석}}</td><td class="white">{{공결}}</td><td class="white">{{대체출석}}</td><td class="white">{{결석}}</td><td class="white">{{출석기타}}</td>
        <td class="white">{{종사자수}}</td><td class="white">{{교사수}}</td><td class="white">{{공익수}}</td><td class="white">{{기타수}}</td>
      </tr>
      <tr>
        <td class="gray">지도 및<br><span style="white-space:nowrap">협의사항</span></td>
        <td colspan="13" class="left">{{지도및협의사항}}</td>
      </tr>
      <tr><td colspan="14" class="section-title">통합 관리</td></tr>
      <tr><td class="gray">종사자</td><td colspan="13" class="left">{{종사자명단}}</td></tr>
      <tr><td class="gray">아동</td><td colspan="13" class="left">{{아동변동}}</td></tr>
      <tr><td class="gray">방문자</td><td colspan="13" class="left">{{방문자명단}}</td></tr>
      <tr><td class="gray">시설</td><td colspan="13" class="left">{{시설}}</td></tr>
      <tr><td class="gray">업무<br>내용</td><td colspan="13" class="left work-cell">{{업무내용}}</td></tr>
      <tr><td class="gray">기타</td><td colspan="13" class="left">{{기타}}</td></tr>
    </tbody>
  </table>
  <div class="footer">서창지역아동센터(양산애사회적협동조합)</div>
</div>`;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asLines(value: unknown) {
  const text = String(value || '').trim();
  return text ? escapeHtml(text).replace(/\n/g, '<br>') : '&nbsp;';
}

function formatKoreanDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(`${value}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일 ${days[date.getDay()]}`;
}

function peopleSummary(rows: Person[], emptyText: string) {
  if (!rows.length) return emptyText;
  return rows.map((person) => `${person.name}${person.role ? `(${person.role})` : ''}`).join(', ');
}

function staffLeaveSummary(rows: Person[]) {
  if (!rows.length) return '';
  return `연차 : ${rows.map((person) => `${person.name}${person.role ? `(${person.role} / 1일)` : '(1일)'}`).join(', ')} / ${rows.length}명`;
}

function isWorkStatus(status: AttendanceEntry['status']) {
  return status === 'present' || status === 'official' || status === 'substitute';
}

function groupVisitors(rows: Person[], label: string) {
  if (!rows.length) return '';
  return `${label} : ${peopleSummary(rows, '-')} / ${rows.length}명`;
}

function buildAutoWorkText(journal: JournalEntry, presentNonStaff: Person[]) {
  const manualText = String(journal.workText || '').trim();
  if (manualText) return manualText;
  const nonStaffLines = presentNonStaff
    .filter((person) => person.dutyText)
    .map((person) => `* [${person.role || person.category || '활동'} ${person.name}] ${person.dutyText}`);
  return nonStaffLines.length ? nonStaffLines.join('\n') : '';
}

export function renderJournalTemplate(
  html: string,
  journal: JournalEntry,
  staff: Person[],
  nonStaff: Person[],
  attendance: AttendanceEntry[] = []
) {
  const peopleById = new Map([...staff, ...nonStaff].map((person) => [person.id, person]));
  const dayAttendance = attendance.filter((entry) => entry.date === journal.date);
  const hasDayAttendance = dayAttendance.length > 0;
  const presentStaff = hasDayAttendance
    ? dayAttendance.filter((entry) => entry.personKind === 'staff' && isWorkStatus(entry.status)).map((entry) => peopleById.get(entry.personId)).filter(Boolean) as Person[]
    : staff.slice(0, journal.staffCount || staff.length);
  const leaveStaff = hasDayAttendance
    ? dayAttendance.filter((entry) => entry.personKind === 'staff' && entry.status === 'leave').map((entry) => peopleById.get(entry.personId)).filter(Boolean) as Person[]
    : [];
  const presentNonStaff = hasDayAttendance
    ? dayAttendance.filter((entry) => entry.personKind === 'nonStaff' && isWorkStatus(entry.status)).map((entry) => peopleById.get(entry.personId)).filter(Boolean) as Person[]
    : nonStaff.filter((person) => ['교사', '공익', '기타'].includes(person.category));
  const teacherRows = presentNonStaff.filter((person) => person.category === '교사');
  const publicRows = presentNonStaff.filter((person) => person.category === '공익');
  const otherRows = presentNonStaff.filter((person) => person.category !== '교사' && person.category !== '공익');
  const teacherCount = hasDayAttendance ? teacherRows.length : (journal.teacherCount || teacherRows.length);
  const publicCount = hasDayAttendance ? publicRows.length : (journal.publicServiceCount || publicRows.length);
  const otherCount = hasDayAttendance ? otherRows.length : (journal.otherVisitorCount || otherRows.length);
  const staffCount = hasDayAttendance ? presentStaff.length : journal.staffCount;
  const staffLines = [
    `출근 : ${peopleSummary(presentStaff, '-')} / ${staffCount || presentStaff.length}명`,
    staffLeaveSummary(leaveStaff)
  ].filter(Boolean).join('<br>');
  const visitorLines = [
    groupVisitors(teacherRows, '교사'),
    groupVisitors(publicRows, '공익'),
    groupVisitors(otherRows, '기타')
  ].filter(Boolean).join(' · ');
  const workText = buildAutoWorkText(journal, presentNonStaff);
  const defaultGuidanceText = [
    '<strong>생활지도 :</strong> 1. 인사 생활화, 2. 센터 규칙 지키기, 3. 공용 물품 관리, 4. 자기 주도적 정리',
    '<strong>위생지도 :</strong> 수시로 손 씻기 및 소독',
    '<strong>안전지도 :</strong> 1. 실내 정숙 보행 2. 등하원 교통안전, 3. 즉시 귀가 원칙, 4. 비상시 대처'
  ].join('<br>');
  const values: Record<string, string | number> = {
    날짜: formatKoreanDate(journal.date),
    운영시간: journal.operatingHours || '-',
    담당자: journal.manager || '-',
    담당자도장: '담당자<br>도장',
    팀장도장: '팀장<br>도장',
    센터장도장: '센터장<br>도장',
    정원: journal.capacity,
    현원: journal.enrolled,
    출석: journal.presentChildren,
    공결: 0,
    대체출석: 0,
    결석: journal.absentChildren,
    출석기타: 0,
    조식: 0,
    중식: journal.enrolled || 0,
    석식: 0,
    종사자수: staffCount,
    교사수: teacherCount,
    공익수: publicCount,
    기타수: otherCount,
    지도및협의사항: journal.guidanceText ? asLines(journal.guidanceText) : defaultGuidanceText,
    종사자명단: journal.staffText ? asLines(journal.staffText) : (staffLines || '&nbsp;'),
    방문자명단: journal.visitorText ? asLines(journal.visitorText) : (visitorLines || '&nbsp;'),
    아동변동: journal.childText ? asLines(journal.childText) : (journal.absentChildren ? `결석 ${journal.absentChildren}명` : '&nbsp;'),
    시설: journal.facilityText ? asLines(journal.facilityText) : '&nbsp;',
    업무내용: asLines(workText),
    기타: journal.otherText ? asLines(journal.otherText) : '&nbsp;',
    남_취학전: 0,
    남_탈학교: 0,
    남_초등학교: 0,
    남_중학교: 0,
    남_고등학교: 0,
    남_기타: 0,
    남_계: Math.floor(journal.enrolled / 2),
    여_취학전: 0,
    여_탈학교: 0,
    여_초등학교: 0,
    여_중학교: 0,
    여_고등학교: 0,
    여_기타: 0,
    여_계: Math.max(0, journal.enrolled - Math.floor(journal.enrolled / 2))
  };

  return Object.keys(values).reduce((result, key) => {
    return result.split(`{{${key}}}`).join(String(values[key]));
  }, html);
}
