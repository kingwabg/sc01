function buildEditablePreviewTemplate_() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 0;
        background: #525659;
        color: #000;
        font-size: 11px;
        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      }

      .toolbar {
        position: sticky;
        top: 0;
        width: 100%;
        padding: 12px;
        background: #333;
        text-align: center;
        z-index: 1000;
      }

      .btn {
        padding: 10px 18px;
        margin: 0 4px;
        border: 0;
        border-radius: 4px;
        background: #1a73e8;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .btn.secondary {
        background: #5f6368;
      }

      .status {
        margin-left: 12px;
        color: #fff;
        font-size: 13px;
      }
      
      .fatal-error {
        display: none;
        width: min(1000px, calc(100% - 32px));
        margin: 18px auto 0;
        padding: 14px 16px;
        border-radius: 12px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .boot-debug {
        width: min(1000px, calc(100% - 32px));
        margin: 12px auto 0;
        padding: 10px 14px;
        border-radius: 10px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1d4ed8;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
      }

      .docs {
        padding: 18px 0 30px;
      }

      .page {
        width: 210mm;
        margin: 0 auto 18px;
        padding: 0;
      }

      .page-inner {
        width: 190mm;
        min-height: 277mm;
        margin: 0 auto;
        background: #fff;
        box-shadow: 0 0 14px rgba(0, 0, 0, 0.35);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: -1px;
      }

      th,
      td {
        border: 1px solid #9b9b9b;
        text-align: center;
        vertical-align: middle;
        padding: 4px 5px;
        word-break: keep-all;
        overflow-wrap: anywhere;
        line-height: 1.22;
      }

      th {
        background: #d9d9d9;
        font-weight: 400;
      }

      input,
      textarea {
        width: 100%;
        border: 0;
        outline: none;
        font: inherit;
        background: transparent;
        text-align: center;
        resize: none;
        padding: 2px;
        appearance: none;
        -webkit-appearance: none;
        border-radius: 0;
      }

      input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
        -webkit-appearance: none;
        text-align: center !important;
      }

      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .text-left,
      .text-left input,
      .text-left textarea {
        text-align: left !important;
      }

      .title-row td {
        height: 76px;
      }

      .title-cell {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .title-spacer {
        background: #fff;
        padding: 6px;
      }

      .approval-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
      }

      .approval-table th,
      .approval-table td {
        border: 1px solid #9b9b9b;
        padding: 0;
      }

      .approval-table th {
        height: 20px;
        font-size: 10px;
        font-weight: 700;
        background: #d9d9d9;
      }

      .approval-table td {
        height: 48px;
        vertical-align: top;
      }

      .approval-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 4px 2px;
      }

      .approval-stamp {
        max-width: 100%;
        max-height: 34px;
        object-fit: contain;
        display: block;
      }

      .approval-fallback {
        width: 100%;
        height: 100%;
      }

      .info-table th,
      .info-table td {
        height: 25px;
      }

      .section-table th,
      .section-table td {
        height: 21px;
      }

      .guide-row td {
        text-align: left;
        padding-left: 12px;
      }

      .guide-row textarea {
        min-height: 30px;
        line-height: 1.45;
        text-align: left;
      }

      .work-row td {
        height: 25px !important;
      }

      .compact-input {
        padding-top: 1px;
        padding-bottom: 1px;
      }

      .sheet-block {
        border-top: 1px solid transparent;
      }

      .merged-box {
        padding-left: 10px;
        padding-right: 10px;
      }

      .visitor-box textarea,
      .notes-box textarea,
      .work-row textarea {
        min-height: 100%;
      }

      .visitor-box {
        vertical-align: top;
        padding-top: 8px;
      }

      .notes-box {
        vertical-align: top;
        padding-top: 6px;
      }

      .page-number {
        text-align: right;
        padding: 6px 4px 0 0;
        font-size: 10px;
        color: #666;
      }

      @media print {
        body {
          background: #fff;
        }

        .toolbar {
          display: none;
        }

        .docs {
          padding: 0;
        }

        .page {
          width: auto;
          margin: 0;
          page-break-after: always;
        }

        .page:last-child {
          page-break-after: auto;
        }

        .page-inner {
          width: auto;
          min-height: auto;
          box-shadow: none;
        }

        th,
        td {
          border: 1px solid #000;
        }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" onclick="saveAll()">저장</button>
      <button class="btn secondary" onclick="window.print()">인쇄</button>
      <span class="status" id="status"></span>
    </div>
    <div class="boot-debug" id="bootDebug">화면 준비 중...</div>
    <div class="fatal-error" id="fatalError"></div>
    <div class="docs" id="docs"></div>

    <script>
      const initialData = <?!= initialDataJson ?>;
      const layout = initialData.layoutConfig || {};

      function escapeHtml(value) {
        return value == null ? '' : String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function toValue(value) {
        return value == null ? '' : String(value);
      }

      function defaultGuidance(field) {
        const defaults = {
          guidanceLife: '1. 인사 생활화, 2. 센터 규칙 지키기, 3. 공용 물품 관리, 4. 자기 주도적 정리',
          guidanceHygiene: '수시로 손 씻기 및 소독',
          guidanceSafety: '1. 실내 정숙 보행 2. 등하원 교통안전, 3. 즉시 귀가 원칙, 4. 비상시 대처'
        };
        return defaults[field] || '';
      }

      function showFatalError(error) {
        const box = document.getElementById('fatalError');
        const docs = document.getElementById('docs');
        const boot = document.getElementById('bootDebug');
        const message = error && error.message ? error.message : String(error || '알 수 없는 오류');
        if (box) {
          box.style.display = 'block';
          box.textContent = '화면 미리보기를 표시하지 못했습니다.\\n' + message;
        }
        if (boot) {
          boot.textContent += '\\n오류: ' + message;
        }
        if (docs) {
          docs.innerHTML = '';
        }
        const status = document.getElementById('status');
        if (status) {
          status.textContent = '화면 미리보기 실패';
        }
      }

      function calculateTotal(values) {
        return values.reduce(function(total, value) {
          const numberValue = Number(value);
          return total + (Number.isFinite(numberValue) ? numberValue : 0);
        }, 0);
      }

      function getColumnWidths() {
        const widths = Array.isArray(layout.columnWidths) && layout.columnWidths.length
          ? layout.columnWidths.slice(0, 15)
          : Array(15).fill(50);

        while (widths.length < 15) {
          widths.push(50);
        }

        return widths;
      }

      function makeColGroup() {
        const widths = getColumnWidths();
        const totalWidth = widths.reduce(function(total, value) {
          return total + value;
        }, 0) || 1;

        return '<colgroup>' + widths.map(function(width) {
          return '<col style="width:' + ((width / totalWidth) * 100).toFixed(4) + '%">';
        }).join('') + '</colgroup>';
      }

      function rowStyle(height) {
        return 'style="height:' + height + 'px"';
      }

      function renderApprovalSlots(slots) {
        const normalizedSlots = Array.isArray(slots) ? slots : [];
        if (!normalizedSlots.length) {
          return '';
        }

        const headerHtml = normalizedSlots.map(function(slot) {
          return '<th>' + escapeHtml(slot.label || '') + '</th>';
        }).join('');

        const bodyHtml = normalizedSlots.map(function(slot) {
          const stampUrl = toValue(slot.stampUrl || '');
          const stampHtml = stampUrl
            ? '<img class="approval-stamp" src="' + escapeHtml(stampUrl) + '" alt="' + escapeHtml(slot.label || '') + ' 도장">'
            : '<div class="approval-fallback">&nbsp;</div>';

          return '<td><div class="approval-slot">' + stampHtml + '</div></td>';
        }).join('');

        return '<table class="approval-table"><tr>' + headerHtml + '</tr><tr>' + bodyHtml + '</tr></table>';
      }

      function render() {
        const html = initialData.reports.map(function(report, reportIndex) {
          const maleTotal = calculateTotal(report.maleCounts);
          const femaleTotal = calculateTotal(report.femaleCounts);
          const works = (report.works || []).slice();
          const approvalHtml = renderApprovalSlots(report.approvalSlots);

          while (works.length < 7) {
            works.push('');
          }

          return \`
            <div class="page" data-report-index="\${reportIndex}">
              <div class="page-inner">
                <table>
                  \${makeColGroup()}
                  <tr class="title-row" \${rowStyle(100)}>
                    <td colspan="9" class="title-cell">운영일지(아동)</td>
                    <td colspan="6" class="title-spacer">\${approvalHtml}</td>
                  </tr>
                </table>

                <table class="info-table">
                  \${makeColGroup()}
                  <tr \${rowStyle(25)}>
                    <th colspan="2">일자</th>
                    <td colspan="3" class="compact-input"><input data-field="date" value="\${escapeHtml(report.date)}"></td>
                    <th colspan="3">운영시간</th>
                    <td colspan="3" class="compact-input"><input data-field="operatingHours" value="\${escapeHtml(report.operatingHours)}"></td>
                    <th colspan="2">담당자</th>
                    <td colspan="2" class="compact-input"><input data-field="manager" value="\${escapeHtml(report.manager)}"></td>
                  </tr>
                </table>

                <table class="section-table sheet-block">
                  \${makeColGroup()}
                  <tr \${rowStyle(40)}>
                    <th rowspan="3">아동현황<br>(취학구분)</th>
                    <th>소계</th>
                    <th>취학전</th>
                    <th>탈학교</th>
                    <th>초등학교</th>
                    <th>중학교</th>
                    <th>고등학교</th>
                    <th>기타</th>
                    <th>계</th>
                    <th rowspan="3" colspan="2">급식현황</th>
                    <th colspan="2">조식</th>
                    <td colspan="2" class="compact-input"><input type="number" data-field="mealBreakfast" value="\${escapeHtml(toValue(report.mealBreakfast))}"></td>
                  </tr>
                  <tr \${rowStyle(40)}>
                    <th>남</th>
                    \${report.maleCounts.map(function(value, index) {
                      return '<td><input type="number" data-field="maleCounts.' + index + '" value="' + escapeHtml(toValue(value)) + '"></td>';
                    }).join('')}
                    <td class="compact-input">\${maleTotal}</td>
                    <th colspan="2">중식</th>
                    <td colspan="2" class="compact-input"><input type="number" data-field="mealLunch" value="\${escapeHtml(toValue(report.mealLunch))}"></td>
                  </tr>
                  <tr \${rowStyle(40)}>
                    <th>여</th>
                    \${report.femaleCounts.map(function(value, index) {
                      return '<td><input type="number" data-field="femaleCounts.' + index + '" value="' + escapeHtml(toValue(value)) + '"></td>';
                    }).join('')}
                    <td class="compact-input">\${femaleTotal}</td>
                    <th colspan="2">석식</th>
                    <td colspan="2" class="compact-input"><input type="number" data-field="mealDinner" value="\${escapeHtml(toValue(report.mealDinner))}"></td>
                  </tr>
                </table>

                <table class="section-table sheet-block">
                  \${makeColGroup()}
                  <tr \${rowStyle(40)}>
                    <th rowspan="2">아동출석<br>(출석구분)</th>
                    <th>정원</th>
                    <th>현원</th>
                    <th>출석</th>
                    <th>공결</th>
                    <th>대체출석</th>
                    <th>결석</th>
                    <th>기타</th>
                    <td rowspan="2">&nbsp;</td>
                    <th rowspan="2" colspan="2">교사현황</th>
                    <th>종사자</th>
                    <th>교사</th>
                    <th>공익</th>
                    <th>기타</th>
                  </tr>
                  <tr \${rowStyle(40)}>
                    <td class="compact-input"><input type="number" data-field="attendanceCapacity" value="\${escapeHtml(toValue(report.attendanceCapacity))}"></td>
                    <td class="compact-input">\${escapeHtml(toValue(report.attendanceCurrent)) || '&nbsp;'}</td>
                    <td class="compact-input">\${escapeHtml(toValue(report.attendancePresent)) || '&nbsp;'}</td>
                    <td class="compact-input"><input type="number" data-field="attendanceOfficial" value="\${escapeHtml(toValue(report.attendanceOfficial))}"></td>
                    <td class="compact-input"><input type="number" data-field="attendanceAlternative" value="\${escapeHtml(toValue(report.attendanceAlternative))}"></td>
                    <td class="compact-input"><input type="number" data-field="attendanceAbsent" value="\${escapeHtml(toValue(report.attendanceAbsent))}"></td>
                    <td class="compact-input"><input type="number" data-field="attendanceOther" value="\${escapeHtml(toValue(report.attendanceOther))}"></td>
                    <td class="compact-input"><input type="number" data-field="staffWorker" value="\${escapeHtml(toValue(report.staffWorker))}"></td>
                    <td class="compact-input"><input type="number" data-field="staffTeacher" value="\${escapeHtml(toValue(report.staffTeacher))}"></td>
                    <td class="compact-input"><input type="number" data-field="staffPublic" value="\${escapeHtml(toValue(report.staffPublic))}"></td>
                    <td class="compact-input"><input type="number" data-field="staffOther" value="\${escapeHtml(toValue(report.staffOther))}"></td>
                  </tr>
                </table>

                <table class="section-table sheet-block">
                  \${makeColGroup()}
                  <tr class="guide-row">
                    <th style="font-size:9.2px;line-height:1.12;letter-spacing:-0.5px;">지도 및<br><span style="white-space:nowrap;">협의사항</span></th>
                    <td colspan="14" class="text-left merged-box">
                      생활지도 : <textarea rows="1" data-field="guidanceLife">\${escapeHtml(report.guidanceLife || defaultGuidance('guidanceLife'))}</textarea><br>
                      위생지도 : <textarea rows="1" data-field="guidanceHygiene">\${escapeHtml(report.guidanceHygiene || defaultGuidance('guidanceHygiene'))}</textarea><br>
                      안전지도 : <textarea rows="1" data-field="guidanceSafety">\${escapeHtml(report.guidanceSafety || defaultGuidance('guidanceSafety'))}</textarea>
                    </td>
                  </tr>
                </table>

                <table class="section-table sheet-block">
                  \${makeColGroup()}
                  <tr>
                    <th colspan="15">통합 관리</th>
                  </tr>
                  <tr>
                    <th>종사자</th>
                    <td colspan="14" class="text-left notes-box merged-box">
                      <div>변동사항</div>
                      <textarea rows="2" data-field="staffChanges">\${escapeHtml(report.staffChanges)}</textarea>
                      <div>교육/출장</div>
                      <textarea rows="2" data-field="staffEducationTrip">\${escapeHtml(report.staffEducationTrip)}</textarea>
                    </td>
                  </tr>
                  <tr>
                    <th>아동</th>
                    <td colspan="14" class="text-left notes-box merged-box">
                      <div>출결/변동</div>
                      <textarea rows="2" data-field="childChanges">\${escapeHtml(report.childChanges)}</textarea>
                      <div>특이사항</div>
                      <textarea rows="2" data-field="childSpecialCounseling">\${escapeHtml(report.childSpecialCounseling)}</textarea>
                    </td>
                  </tr>
                  <tr>
                    <th style="white-space:nowrap;font-size:11px;">방문자</th>
                    <td colspan="14" class="text-left visitor-box merged-box"><textarea rows="1" data-field="visitorReason">\${escapeHtml(report.visitorReason)}</textarea></td>
                  </tr>
                  <tr>
                    <th>시설</th>
                    <td colspan="14" class="text-left notes-box merged-box">
                      <div>안전/위생</div>
                      <textarea rows="2" data-field="facilitySafetyHygiene">\${escapeHtml(report.facilitySafetyHygiene)}</textarea>
                      <div>물품/환경</div>
                      <textarea rows="2" data-field="suppliesEnvironment">\${escapeHtml(report.suppliesEnvironment)}</textarea>
                    </td>
                  </tr>
                  <tr class="work-row">
                    <th>업무<br>내용</th>
                    <td colspan="14" class="text-left notes-box merged-box"><textarea rows="10" data-field="works.0">\${escapeHtml(works.join('\\n'))}</textarea></td>
                  </tr>
                  <tr>
                    <th>기타</th>
                    <td colspan="14" class="text-left notes-box merged-box"><textarea rows="2" data-field="miscNotes">\${escapeHtml(report.miscNotes)}</textarea></td>
                  </tr>
                </table>

              </div>
            </div>
          \`;
        }).join('');

        document.getElementById('docs').innerHTML = html;
        if (initialData.autoPrint && !window.__autoPrintTriggered) {
          window.__autoPrintTriggered = true;
          setTimeout(function() {
            window.print();
          }, 300);
        }
      }

      function setByPath(target, path, value) {
        const parts = path.split('.');
        let current = target;

        for (let index = 0; index < parts.length - 1; index += 1) {
          const key = parts[index];
          if (current[key] == null) {
            current[key] = {};
          }
          current = current[key];
        }

        current[parts[parts.length - 1]] = value;
      }

      function collectReports() {
        return Array.from(document.querySelectorAll('.page')).map(function(pageElement) {
          const reportIndex = Number(pageElement.getAttribute('data-report-index'));
          const source = initialData.reports[reportIndex];
          const copy = JSON.parse(JSON.stringify(source));

          pageElement.querySelectorAll('[data-field]').forEach(function(input) {
            setByPath(copy, input.getAttribute('data-field'), input.value);
          });

          return copy;
        });
      }

      function saveAll() {
        const status = document.getElementById('status');
        const reports = collectReports();
        status.textContent = '저장 중...';

        google.script.run
          .withSuccessHandler(function(result) {
            initialData.reports = reports;
            status.textContent = '저장 완료 (' + result.savedCount + '건)';
            render();
          })
          .withFailureHandler(function(error) {
            status.textContent = '저장 실패: ' + error.message;
          })
          .savePreviewEdits({ reports: reports, year: initialData.selectedYear || '' });
      }

      render();
    </script>
  </body>
</html>`;
}
