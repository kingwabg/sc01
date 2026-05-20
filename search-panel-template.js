function buildSearchPanelTemplate_() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0;
        padding: 18px;
        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
        background:
          radial-gradient(circle at top left, rgba(197, 225, 255, 0.7), transparent 28%),
          linear-gradient(180deg, #eef5ff 0%, #f7f9fc 34%, #f5f7fa 100%);
        color: #1f2937;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      .panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .card {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(191, 204, 220, 0.7);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 18px 40px rgba(41, 72, 123, 0.08);
        backdrop-filter: blur(6px);
      }

      .title {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 6px;
        letter-spacing: -0.02em;
      }

      .subtitle {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 18px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }

      .field-grid.two-col {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      label {
        font-size: 12px;
        color: #5b6472;
        font-weight: 700;
      }

      input[type="date"],
      input[type="text"],
      select {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        border: 1px solid #cfd8e3;
        border-radius: 12px;
        padding: 11px 12px;
        font: inherit;
        background: #fff;
        transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
      }

      input[type="date"]:focus,
      input[type="text"]:focus,
      select:focus {
        border-color: #4f8df7;
        box-shadow: 0 0 0 4px rgba(79, 141, 247, 0.14);
        transform: translateY(-1px);
      }

      .btn-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      button {
        border: 0;
        border-radius: 12px;
        padding: 10px 14px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
      }

      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(31, 41, 55, 0.12);
      }

      .primary {
        background: linear-gradient(135deg, #1a73e8 0%, #3b82f6 100%);
        color: #fff;
      }

      .secondary {
        background: linear-gradient(135deg, #e8f0fe 0%, #dbeafe 100%);
        color: #1457c8;
      }

      .ghost {
        background: #eef3f8;
        color: #3b4754;
      }

      .muted {
        font-size: 12px;
        color: #64748b;
      }

      .status {
        font-size: 12px;
        color: #1967d2;
        min-height: 18px;
        margin-top: 4px;
      }

      .results-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .table-wrap {
        max-height: 500px;
        overflow: auto;
        border: 1px solid #dde5ef;
        border-radius: 14px;
        background: #fff;
      }

      .quick-section {
        margin-bottom: 18px;
        padding: 14px 16px;
        border: 1px solid #e5edf5;
        border-radius: 16px;
        background: linear-gradient(180deg, #fbfdff 0%, #f6f9fc 100%);
      }

      .quick-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #5b6472;
      }

      .quick-group + .quick-group {
        margin-top: 12px;
      }

      .quick-group-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .quick-hint {
        font-size: 11px;
        color: #7b8794;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 9px 12px;
        border-radius: 999px;
        background: #f3f7fb;
        color: #3f4b59;
        font-size: 12px;
        font-weight: 700;
        box-shadow: none;
      }

      .chip.active {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        color: #1247aa;
        box-shadow: inset 0 0 0 1px rgba(26, 115, 232, 0.12);
      }

      .chip.month-chip {
        min-width: 52px;
        padding: 8px 10px;
        background: #fff;
        border: 1px solid #dbe5f0;
      }

      .chip.month-chip.active {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-color: #93c5fd;
      }

      .summary-bar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }

      .summary-pill {
        padding: 9px 12px;
        border-radius: 999px;
        background: #f7fafc;
        border: 1px solid #e1e8f0;
        font-size: 12px;
        color: #475569;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
      }

      th,
      td {
        border-bottom: 1px solid #edf2f7;
        padding: 10px 8px;
        font-size: 12px;
        text-align: center;
        vertical-align: middle;
        word-break: break-word;
      }

      th {
        position: sticky;
        top: 0;
        background: #f8fbff;
        z-index: 1;
        font-weight: 700;
        color: #475569;
      }

      td.text-left {
        text-align: left;
      }

      tbody tr:hover {
        background: #f8fbff;
      }

      tbody tr.selectable-row {
        cursor: pointer;
      }

      .empty {
        padding: 28px 18px;
        text-align: center;
        color: #64748b;
      }

      .result-strong {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #111827;
      }

      .result-caption {
        font-size: 12px;
        color: #64748b;
      }

      .toolbar-note {
        margin-left: auto;
        font-size: 12px;
        color: #64748b;
      }

      @media (max-width: 960px) {
        .field-grid {
          grid-template-columns: 1fr;
        }

        .results-meta {
          flex-direction: column;
          align-items: stretch;
        }

        .toolbar-note {
          margin-left: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="card">
        <div class="title">운영일지 검색</div>
        <div class="subtitle">날짜 범위를 빠르게 선택하고, 필요한 운영일지만 골라 한 번에 인쇄할 수 있습니다.</div>

        <div class="quick-section">
          <div class="quick-group">
            <div class="quick-group-head">
              <span class="quick-label">빠른 기간 선택</span>
              <span class="quick-hint">최근 범위나 분기/반기 기준으로 바로 조회합니다.</span>
            </div>
            <div class="chip-row" id="presetChips">
              <button type="button" class="chip" data-preset="today" onclick="applyPreset('today', this)">1일</button>
              <button type="button" class="chip" data-preset="week" onclick="applyPreset('week', this)">1주일</button>
              <button type="button" class="chip" data-preset="month" onclick="applyPreset('month', this)">1개월</button>
              <button type="button" class="chip" data-preset="thisMonth" onclick="applyPreset('thisMonth', this)">이번달</button>
              <button type="button" class="chip" data-preset="lastMonth" onclick="applyPreset('lastMonth', this)">지난달</button>
              <button type="button" class="chip" data-preset="yearRolling" onclick="applyPreset('yearRolling', this)">최근 1년</button>
              <button type="button" class="chip" data-preset="quarter" onclick="applyPreset('quarter', this)">이번 분기</button>
              <button type="button" class="chip" data-preset="year" onclick="applyPreset('year', this)">올해</button>
              <button type="button" class="chip" data-preset="h1" onclick="applyPreset('h1', this)">상반기</button>
              <button type="button" class="chip" data-preset="h2" onclick="applyPreset('h2', this)">하반기</button>
              <button type="button" class="chip" data-preset="q1" onclick="applyPreset('q1', this)">1분기</button>
              <button type="button" class="chip" data-preset="q2" onclick="applyPreset('q2', this)">2분기</button>
              <button type="button" class="chip" data-preset="q3" onclick="applyPreset('q3', this)">3분기</button>
              <button type="button" class="chip" data-preset="q4" onclick="applyPreset('q4', this)">4분기</button>
            </div>
          </div>
          <div class="quick-group">
            <div class="quick-group-head">
              <span class="quick-label">월 선택</span>
              <span class="quick-hint">선택한 연도 기준으로 해당 월 전체를 조회합니다.</span>
            </div>
            <div class="chip-row" id="monthChips">
              <button type="button" class="chip month-chip" data-preset="m1" onclick="applyPreset('m1', this)">1월</button>
              <button type="button" class="chip month-chip" data-preset="m2" onclick="applyPreset('m2', this)">2월</button>
              <button type="button" class="chip month-chip" data-preset="m3" onclick="applyPreset('m3', this)">3월</button>
              <button type="button" class="chip month-chip" data-preset="m4" onclick="applyPreset('m4', this)">4월</button>
              <button type="button" class="chip month-chip" data-preset="m5" onclick="applyPreset('m5', this)">5월</button>
              <button type="button" class="chip month-chip" data-preset="m6" onclick="applyPreset('m6', this)">6월</button>
              <button type="button" class="chip month-chip" data-preset="m7" onclick="applyPreset('m7', this)">7월</button>
              <button type="button" class="chip month-chip" data-preset="m8" onclick="applyPreset('m8', this)">8월</button>
              <button type="button" class="chip month-chip" data-preset="m9" onclick="applyPreset('m9', this)">9월</button>
              <button type="button" class="chip month-chip" data-preset="m10" onclick="applyPreset('m10', this)">10월</button>
              <button type="button" class="chip month-chip" data-preset="m11" onclick="applyPreset('m11', this)">11월</button>
              <button type="button" class="chip month-chip" data-preset="m12" onclick="applyPreset('m12', this)">12월</button>
            </div>
          </div>
        </div>

        <div class="field-grid two-col">
          <div class="field">
            <label for="yearSelect">연도 선택</label>
            <select id="yearSelect" onchange="handleYearChange()"></select>
          </div>
          <div class="field">
            <label for="managerKeyword">담당자 검색</label>
            <input id="managerKeyword" type="text" placeholder="담당자 이름 일부 입력">
          </div>
        </div>

        <div class="field-grid two-col">
          <div class="field">
            <label for="startDate">시작일</label>
            <input id="startDate" type="date" value="<?!= today ?>">
          </div>
          <div class="field">
            <label for="endDate">종료일</label>
            <input id="endDate" type="date" value="<?!= today ?>">
          </div>
        </div>
        <div class="btn-row">
          <button class="primary" onclick="runSearch()">검색</button>
          <button class="ghost" onclick="resetFilters()">오늘로 초기화</button>
          <span class="toolbar-note">기간 버튼을 누르면 날짜가 자동 입력됩니다.</span>
        </div>
        <div class="status" id="status"></div>
        <div class="summary-bar">
          <div class="summary-pill" id="rangeSummary">조회 범위: 오늘</div>
          <div class="summary-pill" id="selectionSummary">선택된 문서: 0건</div>
        </div>
      </div>

      <div class="card">
        <div class="results-meta">
          <div>
            <div class="result-strong" id="resultCount">0</div>
            <div class="result-caption">검색 결과</div>
          </div>
          <div class="btn-row">
            <button class="secondary" onclick="previewSelected()">선택 인쇄</button>
            <button class="ghost" onclick="previewAll()">전체 인쇄</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 36px;"><input type="checkbox" id="checkAll" onchange="toggleAll(this.checked)"></th>
                <th style="width: 42px;">행</th>
                <th style="width: 92px;">일자</th>
                <th style="width: 84px;">운영시간</th>
                <th>담당자</th>
                <th style="width: 56px;">남</th>
                <th style="width: 56px;">여</th>
                <th style="width: 56px;">교사</th>
                <th style="width: 56px;">조식</th>
                <th style="width: 56px;">중식</th>
                <th style="width: 56px;">석식</th>
                <th style="width: 56px;">방문</th>
                <th style="width: 56px;">업무</th>
              </tr>
            </thead>
            <tbody id="resultsBody">
              <tr><td colspan="13" class="empty">검색 조건을 입력하고 조회해주세요.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <script>
      let searchResults = [];
      let activePreset = 'today';
      const todayText = '<?!= today ?>';

      function setStatus(message) {
        document.getElementById('status').textContent = message || '';
      }

      function resetFilters() {
        document.getElementById('startDate').value = todayText;
        document.getElementById('endDate').value = todayText;
        document.getElementById('managerKeyword').value = '';
        document.getElementById('yearSelect').value = String(toDate(todayText).getFullYear());
        setActivePreset('today');
        updateRangeSummary();
        setStatus('');
      }

      function getFilters() {
        return {
          startDate: document.getElementById('startDate').value,
          endDate: document.getElementById('endDate').value,
          managerKeyword: document.getElementById('managerKeyword').value
        };
      }

      function toDate(dateText) {
        const date = new Date(dateText + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
      }

      function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
      }

      function shiftDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
      }

      function shiftMonths(date, months) {
        const copy = new Date(date);
        copy.setMonth(copy.getMonth() + months);
        return copy;
      }

      function setDateRange(start, end) {
        document.getElementById('startDate').value = formatDate(start);
        document.getElementById('endDate').value = formatDate(end);
        updateRangeSummary();
      }

      function setActivePreset(preset) {
        activePreset = preset;
        document.querySelectorAll('.chip').forEach(function(chip) {
          chip.classList.toggle('active', chip.getAttribute('data-preset') === preset);
        });
      }

      function updateRangeSummary() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const managerKeyword = document.getElementById('managerKeyword').value.trim();
        const selectedYear = document.getElementById('yearSelect').value;
        const rangeText = startDate && endDate
          ? '조회 범위: ' + startDate + ' ~ ' + endDate
          : '조회 범위: 날짜 미지정';
        const withYear = selectedYear ? '기준 연도: ' + selectedYear + ' / ' + rangeText : rangeText;
        document.getElementById('rangeSummary').textContent = managerKeyword
          ? withYear + ' / 담당자: ' + managerKeyword
          : withYear;
      }

      function updateSelectionSummary() {
        const count = getSelectedRowNumbers().length;
        document.getElementById('selectionSummary').textContent = '선택된 문서: ' + count + '건';
      }

      function applyPreset(preset, button) {
        const today = toDate(todayText);
        const year = Number(document.getElementById('yearSelect').value) || today.getFullYear();
        const month = today.getMonth();
        let start;
        let end;

        if (preset === 'today') {
          const currentToday = today.getFullYear() === year ? today : new Date(year, 0, 1);
          start = currentToday;
          end = currentToday;
        } else if (preset === 'week') {
          const currentEnd = today.getFullYear() === year ? today : new Date(year, 11, 31);
          start = shiftDays(currentEnd, -6);
          end = currentEnd;
        } else if (preset === 'month') {
          const currentEnd = today.getFullYear() === year ? today : new Date(year, 11, 31);
          start = shiftMonths(currentEnd, -1);
          end = currentEnd;
        } else if (preset === 'thisMonth') {
          const referenceDate = today.getFullYear() === year ? today : new Date(year, 0, 1);
          start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
          end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
        } else if (preset === 'lastMonth') {
          const referenceDate = today.getFullYear() === year
            ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
            : new Date(year, 10, 1);
          start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
          end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
        } else if (preset === 'yearRolling') {
          const currentEnd = today.getFullYear() === year ? today : new Date(year, 11, 31);
          start = shiftMonths(currentEnd, -12);
          end = currentEnd;
        } else if (preset === 'quarter') {
          const monthBase = today.getFullYear() === year ? month : 11;
          const quarterStartMonth = Math.floor(monthBase / 3) * 3;
          start = new Date(year, quarterStartMonth, 1);
          end = new Date(year, quarterStartMonth + 3, 0);
        } else if (preset === 'h1') {
          start = new Date(year, 0, 1);
          end = new Date(year, 5, 30);
        } else if (preset === 'h2') {
          start = new Date(year, 6, 1);
          end = new Date(year, 11, 31);
        } else if (preset === 'year') {
          start = new Date(year, 0, 1);
          end = new Date(year, 11, 31);
        } else if (preset === 'q1') {
          start = new Date(year, 0, 1);
          end = new Date(year, 2, 31);
        } else if (preset === 'q2') {
          start = new Date(year, 3, 1);
          end = new Date(year, 5, 30);
        } else if (preset === 'q3') {
          start = new Date(year, 6, 1);
          end = new Date(year, 8, 30);
        } else if (preset === 'q4') {
          start = new Date(year, 9, 1);
          end = new Date(year, 11, 31);
        } else if (/^m([1-9]|1[0-2])$/.test(preset)) {
          const selectedMonth = Number(preset.replace('m', '')) - 1;
          start = new Date(year, selectedMonth, 1);
          end = new Date(year, selectedMonth + 1, 0);
        } else {
          if (today.getFullYear() === year) {
            start = today;
            end = today;
          } else {
            start = new Date(year, 0, 1);
            end = new Date(year, 0, 1);
          }
        }

        setDateRange(start, end);
        setActivePreset(preset);
        if (button) {
          button.blur();
        }
      }

      function runSearch() {
        updateRangeSummary();
        setStatus('검색 중...');

        google.script.run
          .withSuccessHandler(function(results) {
            searchResults = (results || []).slice().sort(function(a, b) {
              return String(b.date).localeCompare(String(a.date));
            });
            renderResults();
            setStatus('검색 완료');
          })
          .withFailureHandler(function(error) {
            setStatus('검색 실패: ' + error.message);
          })
          .searchLogs(getFilters());
      }

      function renderResults() {
        const tbody = document.getElementById('resultsBody');
        const resultCount = document.getElementById('resultCount');
        const checkAll = document.getElementById('checkAll');

        resultCount.textContent = String(searchResults.length);
        checkAll.checked = false;
        updateSelectionSummary();

        if (!searchResults.length) {
          tbody.innerHTML = '<tr><td colspan="13" class="empty">검색 결과가 없습니다.</td></tr>';
          return;
        }

        tbody.innerHTML = searchResults.map(function(item, index) {
          return [
            '<tr class="selectable-row" data-row-number="' + item.rowNumber + '">',
            '<td><input type="checkbox" class="row-check" data-row-number="' + item.rowNumber + '"></td>',
            '<td>' + item.rowNumber + '</td>',
            '<td>' + escapeHtml(item.date) + '</td>',
            '<td>' + escapeHtml(item.operatingHours || '') + '</td>',
            '<td class="text-left">' + escapeHtml(item.manager || '') + '</td>',
            '<td>' + item.maleTotal + '</td>',
            '<td>' + item.femaleTotal + '</td>',
            '<td>' + item.staffCount + '</td>',
            '<td>' + displayNumber(item.breakfast) + '</td>',
            '<td>' + displayNumber(item.lunch) + '</td>',
            '<td>' + displayNumber(item.dinner) + '</td>',
            '<td>' + (item.hasVisitor ? 'Y' : '-') + '</td>',
            '<td>' + item.workCount + '</td>',
            '</tr>'
          ].join('');
        }).join('');

        document.querySelectorAll('.row-check').forEach(function(checkbox) {
          checkbox.addEventListener('change', updateSelectionSummary);
        });

        document.querySelectorAll('.selectable-row').forEach(function(row) {
          row.addEventListener('click', function(event) {
            if (event.target.closest('input, button, a, label')) {
              return;
            }

            const checkbox = row.querySelector('.row-check');
            if (!checkbox) {
              return;
            }

            checkbox.checked = !checkbox.checked;
            updateSelectionSummary();
          });
        });
      }

      function escapeHtml(value) {
        return value == null ? '' : String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function displayNumber(value) {
        return value === '' || value == null ? '-' : value;
      }

      function toggleAll(checked) {
        document.querySelectorAll('.row-check').forEach(function(checkbox) {
          checkbox.checked = checked;
        });
        updateSelectionSummary();
      }

      function getSelectedRowNumbers() {
        return Array.from(document.querySelectorAll('.row-check:checked')).map(function(checkbox) {
          return Number(checkbox.getAttribute('data-row-number'));
        });
      }

      function previewSelected() {
        const selected = getSelectedRowNumbers();
        if (!selected.length) {
          setStatus('인쇄할 행을 먼저 선택해주세요.');
          return;
        }
        openPreview(selected);
      }

      function previewAll() {
        if (!searchResults.length) {
          setStatus('먼저 검색 결과를 만들어주세요.');
          return;
        }
        openPreview(searchResults.map(function(item) { return item.rowNumber; }));
      }

      function openPreview(rowNumbers) {
        setStatus('미리보기를 준비하는 중...');

        google.script.run
          .withSuccessHandler(function() {
            setStatus('미리보기가 열렸습니다.');
          })
          .withFailureHandler(function(error) {
            setStatus('미리보기 실패: ' + error.message);
          })
          .previewLogsByRowNumbers(rowNumbers);
      }

      function buildYearOptions() {
        const today = toDate(todayText);
        const currentYear = today.getFullYear();
        const years = [];
        for (let year = currentYear + 1; year >= currentYear - 7; year -= 1) {
          years.push(year);
        }

        const select = document.getElementById('yearSelect');
        select.innerHTML = years.map(function(year) {
          return '<option value="' + year + '">' + year + '년</option>';
        }).join('');
        select.value = String(currentYear);
      }

      function handleYearChange() {
        if (activePreset) {
          applyPreset(activePreset, null);
        } else {
          updateRangeSummary();
        }
      }

      document.getElementById('startDate').addEventListener('change', function() {
        setActivePreset('');
        updateRangeSummary();
      });

      document.getElementById('endDate').addEventListener('change', function() {
        setActivePreset('');
        updateRangeSummary();
      });

      document.getElementById('managerKeyword').addEventListener('input', updateRangeSummary);

      buildYearOptions();
      setActivePreset('today');
      applyPreset('today', null);
      updateRangeSummary();
      runSearch();
    </script>
  </body>
</html>`;
}

