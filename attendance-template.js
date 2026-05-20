function showAttendanceUnmatchedDialog() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveAttendanceDialogYear_(spreadsheet);
  const rows = readAttendanceUnmatchedRows_(selectedYear);
  const template = HtmlService.createTemplate(buildAttendanceUnmatchedTemplate_());
  template.initialDataJson = JSON.stringify({
    rows: rows,
  });

  const htmlOutput = template.evaluate()
    .setWidth(980)
    .setHeight(760);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '미매칭 학생 보기');
}


function buildAttendanceUnmatchedTemplate_() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 18px;
        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
        background: #f4f7fb;
        color: #1f2937;
      }
      .panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .card {
        background: #fff;
        border: 1px solid #e5edf5;
        border-radius: 16px;
        padding: 16px 18px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
      .title {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .subtitle {
        margin-top: 6px;
        font-size: 13px;
        color: #64748b;
      }
      .summary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 8px 12px;
        border-radius: 999px;
        background: #fff7ed;
        color: #9a3412;
        font-size: 12px;
        font-weight: 700;
      }
      .table-wrap {
        max-height: 560px;
        overflow: auto;
        border: 1px solid #e5edf5;
        border-radius: 14px;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      th, td {
        padding: 10px 8px;
        border-bottom: 1px solid #edf2f7;
        text-align: center;
        vertical-align: middle;
        font-size: 12px;
        word-break: break-word;
      }
      th {
        position: sticky;
        top: 0;
        background: #fffaf0;
        color: #7c2d12;
        font-weight: 700;
        z-index: 1;
      }
      td.text-left {
        text-align: left;
      }
      tbody tr:hover {
        background: #fffaf5;
      }
      .empty {
        padding: 40px 16px;
        text-align: center;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="card">
        <div class="title">미매칭 학생 보기</div>
        <div class="subtitle">출석은 기록됐지만 아동리스트와 연결되지 않은 학생만 모아 보여줍니다.</div>
        <div class="summary" id="summary"></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 104px;">날짜</th>
                <th style="width: 90px;">이름</th>
                <th>소속</th>
                <th style="width: 70px;">학교급</th>
                <th style="width: 60px;">상태</th>
                <th style="width: 70px;">입실</th>
                <th style="width: 70px;">퇴실</th>
                <th style="width: 160px;">매칭키</th>
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
      </div>
    </div>

    <script>
      const initialData = <?!= initialDataJson ?>;

      function esc(value) {
        return value == null ? '' : String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function escAttr(value) {
        return esc(value);
      }

      function render() {
        const rows = initialData.rows || [];
        document.getElementById('summary').textContent = '총 ' + rows.length + '건';

        const tbody = document.getElementById('rows');
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="8" class="empty">현재 미매칭 학생이 없습니다.</td></tr>';
          return;
        }

        tbody.innerHTML = rows.map(function(row) {
          return [
            '<tr>',
            '<td>' + esc(row.date) + '</td>',
            '<td>' + esc(row.name) + '</td>',
            '<td class="text-left">' + esc(row.school) + '</td>',
            '<td>' + esc(row.schoolLevel) + '</td>',
            '<td>' + esc(row.status) + '</td>',
            '<td>' + esc(row.checkIn) + '</td>',
            '<td>' + esc(row.checkOut) + '</td>',
            '<td>' + esc(row.matchKey) + '</td>',
            '</tr>'
          ].join('');
        }).join('');
      }

      render();
    </script>
  </body>
</html>`;
}

function buildAttendanceStatsDialogTemplate_() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --border-light: #f1f5f9;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --success: #059669;
      --success-light: #ecfdf5;
      --warning: #d97706;
      --warning-light: #fffbeb;
      --danger: #dc2626;
      --danger-light: #fef2f2;
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
    }

    body {
      font-family: 'Pretendard', 'Inter', 'Malgun Gothic', '맑은 고딕', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-primary);
      font-size: 13px;
      line-height: 1.5;
      overflow: hidden;
      height: 100vh;
    }

    /* ── LAYOUT ── */
    .app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* ── TOPBAR ── */
    .topbar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      height: 48px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -0.03em;
      white-space: nowrap;
      color: #fff;
    }
    .topbar-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
      animation: blink 2.4s ease-in-out infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: .4; }
    }
    .topbar-sep {
      width: 1px; height: 18px;
      background: rgba(255,255,255,.14);
      flex: 0 0 auto;
    }
    .topbar-year {
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.16);
      color: #fff;
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      height: 28px;
      min-width: 90px;
    }
    .topbar-year option { background: #1e293b; }
    .topbar-spacer { flex: 1; }
    .topbar-pills {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .topbar-pill {
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.1);
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,.7);
      white-space: nowrap;
    }
    .topbar-status {
      font-size: 10px;
      color: rgba(255,255,255,.45);
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .topbar-btn {
      height: 26px;
      padding: 0 9px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.07);
      color: rgba(255,255,255,.8);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: background .12s;
    }
    .topbar-btn:hover { background: rgba(255,255,255,.14); }
    .topbar-btn:active { transform: translateY(1px); }
    .topbar-btn.accent {
      background: #2563eb;
      border-color: #3b82f6;
      color: #fff;
    }
    .topbar-btn.accent:hover { background: #1d4ed8; }
    .topbar-btn.is-busy,
    .fbtn.is-busy {
      pointer-events: none;
      opacity: .92;
    }
    .topbar-btn.is-busy::before,
    .fbtn.is-busy::before {
      content: '';
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 6px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      vertical-align: -1px;
      animation: spin .7s linear infinite;
    }
    .topbar-btn:disabled,
    .fbtn:disabled {
      opacity: .6;
      cursor: wait;
      pointer-events: none;
    }

    /* ── LOADING BANNER ── */
    .loading-banner {
      display: none;
      align-items: center;
      gap: 9px;
      padding: 7px 14px;
      background: #1d4ed8;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .loading-banner.active { display: flex; }
    .loading-spinner {
      width: 13px; height: 13px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff;
      animation: spin .65s linear infinite;
      flex: 0 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-title { font-weight: 800; }
    .loading-text { opacity: .75; margin-left: 2px; }

    /* ── WARNING BAR ── */
    .warning-list {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      padding: 5px 14px;
      background: #fffbeb;
      border-bottom: 1px solid #fde68a;
      flex-shrink: 0;
    }
    .warning-list:empty { display: none; }

    /* ── FILTER BAR ── */
    .filter-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 14px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .filter-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .05em;
      white-space: nowrap;
    }
    .filter-bar select,
    .filter-bar input[type="date"],
    .filter-bar input[type="text"] {
      height: 26px;
      padding: 0 7px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--surface);
      outline: none;
      font-family: inherit;
      transition: border-color .12s, box-shadow .12s;
    }
    .filter-bar select:focus,
    .filter-bar input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(37,99,235,.1);
    }
    .filter-bar select { min-width: 76px; cursor: pointer; }
    .filter-bar input[type="date"] { min-width: 120px; }
    .filter-bar input[type="text"] { min-width: 130px; }
    .filter-sep {
      width: 1px; height: 16px;
      background: var(--border);
      flex: 0 0 auto;
    }
    .filter-range-sep {
      font-size: 11px;
      color: var(--text-muted);
      flex: 0 0 auto;
    }

    /* chip checkboxes */
    .chip-group { display: flex; align-items: center; gap: 3px; }
    .chip-label {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all .12s;
      user-select: none;
      line-height: 1;
    }
    .chip-label input[type="checkbox"] { display: none; }
    .chip-label.on {
      background: var(--accent-light);
      border-color: #93c5fd;
      color: var(--accent);
    }
    .chip-label.chip-warn {
      border-color: #fcd34d;
      color: #d97706;
      background: #fffbeb;
    }
    .chip-label.on.chip-warn {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #d97706;
    }
    .chip-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 900;
      color: #d97706;
      margin-left: 1px;
      line-height: 1;
    }

    /* filter modal button */
    .filter-modal-btn { font-weight: 700; }
    .filter-modal-btn.active { background: var(--accent-light); border-color: #93c5fd; color: var(--accent); }
    .filter-active-pills { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .filter-active-pill {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px; border-radius: 999px;
      background: var(--accent-light); border: 1px solid #93c5fd;
      color: var(--accent); font-size: 11px; font-weight: 600;
    }

    /* filter modal overlay */
    .fmodal-backdrop {
      display: none; position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,.25);
    }
    .fmodal-backdrop.open { display: block; }
    .fmodal {
      display: none; position: fixed; top: 56px; left: 12px;
      z-index: 1001; width: 380px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: 0 8px 24px rgba(0,0,0,.15);
      flex-direction: column; overflow: hidden;
    }
    .fmodal.open { display: flex; }
    .fmodal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--border);
    }
    .fmodal-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .fmodal-close {
      background: none; border: none; cursor: pointer;
      font-size: 14px; color: var(--text-secondary); padding: 0 2px; line-height: 1;
    }
    .fmodal-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
    .fmodal-section-label {
      font-size: 10px; font-weight: 700; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px;
    }
    .fmodal-btn-group { display: flex; flex-wrap: wrap; gap: 5px; }
    .fmbtn {
      padding: 5px 11px; border-radius: 999px;
      border: 1px solid var(--border); background: var(--bg);
      font-size: 12px; font-weight: 600; color: var(--text-secondary);
      cursor: pointer; transition: all .1s; line-height: 1.3;
    }
    .fmbtn:hover { border-color: #93c5fd; color: var(--accent); background: var(--accent-light); }
    .fmbtn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .fmbtn.in-range { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
    .fmbtn-reset { margin-left: 0; }
    .fmbtn-apply { background: var(--accent); border-color: var(--accent); color: #fff; margin-left: auto; }
    .fmbtn-apply:hover { opacity: .9; }
    .fmodal-custom-range { display: none; flex-direction: column; gap: 8px; }
    .fmodal-custom-range.visible { display: flex; }
    .fm-date-inputs { display: flex; align-items: flex-end; gap: 8px; }
    .fm-date-field { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .fm-date-label { font-size: 10px; font-weight: 600; color: var(--text-secondary); }
    .fm-date-input { width: 100%; height: 32px; padding: 0 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; font-family: inherit; color: var(--text-primary); background: #fff; cursor: pointer; }
    .fm-date-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px #dbeafe; }
    .fm-date-sep { font-size: 14px; color: var(--text-muted); padding-bottom: 6px; }
    .fmodal-date-row { display: flex; align-items: center; gap: 6px; }
    .fmodal-date-input {
      flex: 1; height: 28px; padding: 0 6px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); font-size: 12px;
      background: var(--bg); color: var(--text-primary);
    }
    /* calendar widget */
    .fm-cal { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .fm-cal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .fm-cal-nav {
      background: none; border: none; cursor: pointer; font-size: 16px;
      color: var(--text-secondary); padding: 0 4px; line-height: 1;
    }
    .fm-cal-nav:hover { color: var(--accent); }
    .fm-cal-title { font-size: 12px; font-weight: 700; color: var(--text-primary); }
    .fm-cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr);
      background: var(--bg);
    }
    .fm-cal-dow {
      text-align: center; font-size: 10px; font-weight: 700;
      color: var(--text-secondary); padding: 4px 0;
      background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .fm-cal-dow:first-child { color: #ef4444; }
    .fm-cal-dow:last-child { color: #3b82f6; }
    .fm-cal-day {
      text-align: center; font-size: 11px; padding: 5px 2px;
      cursor: pointer; border-radius: 4px; margin: 1px;
      color: var(--text-primary); transition: background .1s;
    }
    .fm-cal-day:hover:not(.empty) { background: var(--accent-light); color: var(--accent); }
    .fm-cal-day.empty { cursor: default; }
    .fm-cal-day.start, .fm-cal-day.end { background: var(--accent); color: #fff; border-radius: 4px; }
    .fm-cal-day.in-range { background: #dbeafe; color: #1d4ed8; border-radius: 0; }
    .fm-cal-day.start { border-radius: 4px 0 0 4px; }
    .fm-cal-day.end { border-radius: 0 4px 4px 0; }
    .fm-cal-day.start.end { border-radius: 4px; }
    .fm-cal-day.today { font-weight: 700; text-decoration: underline; }
    .fm-cal-range-info {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; color: var(--text-secondary); padding: 2px 0;
    }
    .fm-cal-range-text { font-weight: 600; color: var(--text-primary); }
    .fm-cal-clear {
      background: none; border: none; cursor: pointer; font-size: 11px;
      color: var(--text-secondary); padding: 0; text-decoration: underline;
    }
    .fm-cal-clear:hover { color: #ef4444; }
    .fmodal-footer {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 14px; border-top: 1px solid var(--border);
    }

    .fbtn {
      height: 26px;
      padding: 0 9px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: all .12s;
    }
    .fbtn:hover { background: var(--bg); border-color: #94a3b8; color: var(--text-primary); }
    .fbtn:active { transform: translateY(1px); }

    /* ── ADVANCED PANEL ── */
    .advanced-panel {
      display: none;
      flex-shrink: 0;
      padding: 8px 14px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      gap: 10px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .advanced-panel.open { display: flex; }
    .adv-group { display: flex; flex-direction: column; gap: 3px; }
    .adv-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .adv-row { display: flex; align-items: center; gap: 5px; }
    .adv-group select,
    .adv-group input[type="date"],
    .adv-group input[type="text"] {
      height: 26px;
      padding: 0 7px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      color: var(--text-primary);
      background: #fff;
      outline: none;
      font-family: inherit;
    }
    .adv-group select:focus,
    .adv-group input:focus { border-color: var(--accent); }
    .adv-group select { min-width: 170px; }
    .adv-group input[type="text"] { min-width: 220px; }
    .adv-group input[type="date"] { min-width: 120px; }
    .adv-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .integration-status { font-size: 11px; color: var(--text-muted); align-self: center; }
    .hidden-operating-controls { display: none; }

    .opmodal-backdrop {
      display: none; position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,.25);
    }
    .opmodal-backdrop.open { display: block; }
    .opmodal {
      display: none; position: fixed; top: 72px; left: 50%; transform: translateX(-50%);
      z-index: 1001; width: 420px; max-width: calc(100vw - 24px);
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: 0 10px 28px rgba(0,0,0,.16);
      overflow: hidden;
    }
    .opmodal.open { display: block; }
    .opmodal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; border-bottom: 1px solid var(--border);
    }
    .opmodal-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .opmodal-close {
      background: none; border: none; cursor: pointer; color: var(--text-secondary);
      font-size: 14px; line-height: 1; padding: 0 2px;
    }
    .opmodal-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .opmodal-row { display: flex; flex-direction: column; gap: 4px; }
    .opmodal-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
    .opmodal-input, .opmodal-select {
      width: 100%; height: 34px; padding: 0 8px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); font-size: 12px; font-family: inherit;
      color: var(--text-primary); background: #fff;
    }
    .opmodal-text {
      width: 100%; min-height: 74px; padding: 8px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); font-size: 12px; font-family: inherit;
      color: var(--text-primary); background: #fff; resize: vertical;
    }
    .opmodal-help { font-size: 11px; color: var(--text-muted); line-height: 1.45; }
    .opmodal-footer {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 14px; border-top: 1px solid var(--border);
    }

    /* ── SUMMARY STRIP ── */
    .summary-strip {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }
    .summary-strip.aggregate-hidden,
    .overview-strip.aggregate-hidden {
      display: none;
    }
    .sum-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 6px;
      border-right: 1px solid var(--border-light);
      text-align: center;
    }
    .sum-card:last-child { border-right: none; }
    .sum-label {
      font-size: 9px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .sum-value {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: var(--text-primary);
      line-height: 1.1;
      margin-top: 1px;
    }
    .sum-card.c-blue .sum-value { color: #2563eb; }
    .sum-card.c-green .sum-value { color: #059669; }
    .sum-card.c-amber .sum-value { color: #d97706; }
    .sum-card.c-red .sum-value { color: #dc2626; }
    .overview-strip {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: 1.2fr 1.1fr 1.4fr;
      gap: 8px;
      padding: 8px 14px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
    }
    .overview-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      min-width: 0;
    }
    .overview-title {
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 6px;
    }
    .overview-line {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.55;
      word-break: keep-all;
    }
    .overview-line strong {
      color: var(--text-primary);
      font-weight: 800;
    }
    .overview-line + .overview-line { margin-top: 3px; }
    .overview-report {
      white-space: pre-wrap;
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.6;
      word-break: keep-all;
    }

    /* ── MAIN SCROLL AREA ── */
    .main {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    /* ── SECTION ── */
    .section {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .sec-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 14px 5px;
    }
    .sec-title { font-size: 12px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
    .sec-sub { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
    .sec-actions { display: flex; align-items: center; gap: 5px; }

    /* ── TABLE ── */
    .table-wrap {
      overflow: auto;
      border-top: 1px solid var(--border-light);
    }
    .main-table-wrap {
      height: clamp(520px, 62vh, 760px);
      max-height: none !important;
    }
    .preview-table-wrap {
      max-height: 240px !important;
    }
    table {
      width: max-content;
      min-width: 1380px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 6px 5px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      font-size: 9px;
      font-weight: 800;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .04em;
      text-align: center;
      white-space: nowrap;
    }
    td {
      padding: 6px 5px;
      border-bottom: 1px solid var(--border-light);
      font-size: 11px;
      text-align: center;
      color: var(--text-primary);
      vertical-align: middle;
      height: 34px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    td.text-left { text-align: left; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr.selectable-row { cursor: pointer; }
    tbody tr.active-row { background: #eff6ff !important; }

    /* ── BADGES / PILLS ── */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 800;
      white-space: nowrap;
    }
    .badge.ok  { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge.review { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    .badge.pending { background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; }

    /* backwards compat pill class */
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 10px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-secondary);
    }
    .pill.ok  { background: #ecfdf5; border-color: #a7f3d0; color: #059669; }
    .pill.review { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .pill.pending { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }
    .pill.warning { background: #fffbeb; border-color: #fcd34d; color: #d97706; }

    /* ── SELECTION BAR (bottom of app, outside scroll) ── */
    .selection-action-bar {
      display: none;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 14px;
      background: #0f172a;
      color: #fff;
      border-top: 1px solid rgba(255,255,255,.08);
      box-shadow: 0 -4px 16px rgba(0,0,0,.18);
    }
    .selection-action-bar.active { display: flex; }
    .selection-action-title { font-size: 12px; font-weight: 800; color: #fff; }
    .selection-action-subtitle { font-size: 10px; color: rgba(255,255,255,.55); margin-top: 1px; }
    .selection-action-buttons { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }

    /* ── PREVIEW CARD ── */
    .preview-card { display: none; }
    .preview-card.active { display: block; }
    .card-body { display: block; }
    .collapsed .card-body { display: none; }
    .student-panel.collapsed .student-panel-body { display: none; }

    /* ── DETAIL SECTION ── */
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
      gap: 10px;
      padding: 10px 14px;
    }
    .detail-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      max-height: 150px;
    }
    .detail-meta {
      margin-bottom: 7px;
      padding: 7px 9px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg);
      font-size: 11px;
      line-height: 1.55;
      color: var(--text-secondary);
    }
    .detail-meta-row + .detail-meta-row {
      margin-top: 5px;
      padding-top: 5px;
      border-top: 1px dashed var(--border);
    }
    .detail-meta-label { font-weight: 800; color: var(--text-primary); margin-right: 5px; }

    /* ── STUDENT PANEL ── */
    .student-panel {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .student-panel-head {
      padding: 10px 12px 8px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      background: #f8fafc;
    }
    .student-panel-head-main { min-width: 0; }
    .student-panel-title { font-size: 13px; font-weight: 800; color: var(--text-primary); }
    .student-panel-subtitle { margin-top: 2px; font-size: 10px; color: var(--text-muted); }
    .student-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
    .student-panel-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .student-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
    }
    .student-summary-card {
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg);
      border: 1px solid var(--border);
    }
    .student-summary-label { font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .student-summary-value { margin-top: 2px; font-size: 15px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.03em; }
    .student-table-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      max-height: 180px;
      margin-bottom: 6px;
    }

    /* ── MISC ── */
    .program-cell { text-align: center; font-weight: 800; font-size: 11px; }
    .program-cell.ok { color: var(--success); }
    .program-cell.pending { color: var(--warning); }
    .preview-line { display: block; line-height: 1.35; white-space: pre-wrap; }
    .preview-program { color: var(--accent); font-size: 10px; }
    .preview-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 14px 0;
    }
    .preview-summary { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
    .preview-text { font-size: 11px; color: var(--text-muted); align-self: center; }
    .empty { padding: 24px 14px; text-align: center; color: var(--text-muted); font-size: 11px; }
    .review-note {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 1.2;
      color: var(--text-secondary);
      text-align: left;
    }
    .collapse-button {
      height: 24px;
      padding: 0 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 10px;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      font-family: inherit;
    }
    .name-button {
      border: 0;
      background: transparent;
      color: var(--accent);
      padding: 0;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      text-decoration: underline;
      text-decoration-color: transparent;
      transition: text-decoration-color .12s;
    }
    .name-button:hover { text-decoration-color: var(--accent); }
    .match-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      padding: 2px 5px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 800;
    }
    .match-badge.ok { background: #ecfdf5; color: #059669; }
    .match-badge.bad { background: #fef2f2; color: #dc2626; }
    .status { font-size: 10px; color: rgba(255,255,255,.5); }
    .operating-hours-cell {
      white-space: nowrap;
      word-break: keep-all;
      font-size: 11px;
    }

    /* loading state overlay */
    .panel.is-loading .table-wrap,
    .panel.is-loading .detail-grid {
      opacity: 0.45;
      pointer-events: none;
      transition: opacity .18s;
    }

    @media (max-width: 1100px) {
      .summary-strip { grid-template-columns: repeat(3, 1fr); }
      .overview-strip { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      .student-summary-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 760px) {
      .summary-strip { grid-template-columns: repeat(2, 1fr); }
      .filter-bar { gap: 4px; }
    }
  </style>
</head>
<body>
<div class="app panel">

  <!-- TOPBAR -->
  <header class="topbar">
    <div class="topbar-brand">
      <div class="topbar-dot"></div>
      운영일지 통계
    </div>
    <div class="topbar-sep"></div>
    <select id="yearSelect" class="topbar-year"></select>
    <div class="topbar-spacer"></div>
    <div class="topbar-pills">
      <span class="topbar-pill" id="buildSummary"></span>
      <span class="topbar-pill" id="periodSummary"></span>
      <span class="topbar-pill" id="countSummary"></span>
      <span class="topbar-pill" id="selectionSummary"></span>
    </div>
    <div class="topbar-sep"></div>
    <span class="topbar-status status" id="status"></span>
    <div class="topbar-sep"></div>
    <button class="topbar-btn" id="btnSizeNormal">보통</button>
    <button class="topbar-btn" id="btnSizeWide">넓게</button>
    <button class="topbar-btn" id="btnSizeMax">최대</button>
  </header>

  <!-- LOADING -->
  <div class="loading-banner" id="loadingBanner" aria-live="polite" aria-busy="false">
    <div class="loading-spinner" aria-hidden="true"></div>
    <span class="loading-title" id="loadingTitle">통계를 불러오는 중</span>
    <span class="loading-text" id="loadingText">잠시만 기다려주세요.</span>
  </div>

  <!-- WARNINGS -->
  <div class="warning-list" id="warningList"></div>

  <!-- hidden inputs kept for existing JS functions -->
  <div style="display:none">
    <select id="monthSelect"></select>
    <select id="datePreset">
      <option value="today">당일</option>
      <option value="week">주간</option>
      <option value="month">월간</option>
      <option value="quarter">분기별</option>
      <option value="half">반기별</option>
      <option value="year">연간</option>
      <option value="all">전체</option>
      <option value="q1">1분기</option>
      <option value="q2">2분기</option>
      <option value="q3">3분기</option>
      <option value="q4">4분기</option>
      <option value="half1">상반기</option>
      <option value="half2">하반기</option>
      <option value="custom">직접 입력</option>
    </select>
    <input id="filterStartDate" type="date">
    <input id="filterEndDate" type="date">
    <input type="checkbox" id="typeAttendance" checked>
    <input type="checkbox" id="typeEducation" checked>
    <input type="checkbox" id="typeAnnual" checked>
    <input type="checkbox" id="typeProgram" checked>
  </div>

  <!-- FILTER BAR -->
  <div class="filter-bar">
    <button class="fbtn filter-modal-btn" id="filterModalBtn">필터 ▾</button>
    <div class="filter-active-pills" id="filterActivePills"></div>
    <div class="filter-sep"></div>
    <input id="dateSearch" type="text" placeholder="날짜 검색 (예: 01-02)">
    <div class="filter-sep"></div>
    <div class="chip-group">
      <label class="chip-label on" id="chipAttendance"><input type="checkbox" id="visChipAttendance">출석</label>
      <label class="chip-label on" id="chipEducation"><input type="checkbox" id="visChipEducation">교육</label>
      <label class="chip-label on" id="chipAnnual"><input type="checkbox" id="visChipAnnual">연차</label>
      <label class="chip-label on" id="chipProgram"><input type="checkbox" id="visChipProgram">프로그램</label>
    </div>
    <div class="filter-sep"></div>
    <button class="fbtn" id="btnToggleAdvanced">고급 ▾</button>
  </div>

  <!-- FILTER MODAL -->
  <div class="fmodal-backdrop" id="filterModalBackdrop"></div>
  <div class="fmodal" id="filterModal">
    <div class="fmodal-header">
      <span class="fmodal-title">필터</span>
      <button class="fmodal-close" id="filterModalClose">✕</button>
    </div>
    <div class="fmodal-body">

      <div class="fmodal-section-label">기간</div>
      <div class="fmodal-btn-group" id="fmPresetGroup">
        <button class="fmbtn" data-preset="year">연간</button>
        <button class="fmbtn" data-preset="month">월간</button>
        <button class="fmbtn" data-preset="week">주간</button>
        <button class="fmbtn" data-preset="today">당일</button>
        <button class="fmbtn" data-preset="q1">1분기</button>
        <button class="fmbtn" data-preset="q2">2분기</button>
        <button class="fmbtn" data-preset="q3">3분기</button>
        <button class="fmbtn" data-preset="q4">4분기</button>
        <button class="fmbtn" data-preset="custom">직접 입력</button>
      </div>

      <div class="fmodal-section-label">월</div>
      <div class="fmodal-btn-group" id="fmMonthGroup">
        <button class="fmbtn" data-month="">전체</button>
        <button class="fmbtn" data-month="01">1월</button>
        <button class="fmbtn" data-month="02">2월</button>
        <button class="fmbtn" data-month="03">3월</button>
        <button class="fmbtn" data-month="04">4월</button>
        <button class="fmbtn" data-month="05">5월</button>
        <button class="fmbtn" data-month="06">6월</button>
        <button class="fmbtn" data-month="07">7월</button>
        <button class="fmbtn" data-month="08">8월</button>
        <button class="fmbtn" data-month="09">9월</button>
        <button class="fmbtn" data-month="10">10월</button>
        <button class="fmbtn" data-month="11">11월</button>
        <button class="fmbtn" data-month="12">12월</button>
      </div>

      <div class="fmodal-custom-range" id="fmCustomRange">
        <div class="fmodal-section-label">날짜 범위</div>
        <div class="fm-date-inputs">
          <div class="fm-date-field">
            <label class="fm-date-label">시작 날짜</label>
            <input type="date" id="fmStartDate" class="fm-date-input">
          </div>
          <span class="fm-date-sep">~</span>
          <div class="fm-date-field">
            <label class="fm-date-label">종료 날짜</label>
            <input type="date" id="fmEndDate" class="fm-date-input">
          </div>
        </div>
        <div class="fm-cal">
          <div class="fm-cal-header">
            <button class="fm-cal-nav" id="fmCalPrev">&lsaquo;</button>
            <span class="fm-cal-title" id="fmCalTitle"></span>
            <button class="fm-cal-nav" id="fmCalNext">&rsaquo;</button>
          </div>
          <div class="fm-cal-grid" id="fmCalGrid"></div>
        </div>
        <div class="fm-cal-range-info">
          <span class="fm-cal-range-text" id="fmCalRangeText">날짜를 선택하세요</span>
          <button class="fm-cal-clear" id="fmCalClearBtn">초기화</button>
        </div>
      </div>

    </div>
  <div class="fmodal-footer">
      <button class="fmbtn fmbtn-reset" id="fmResetBtn">초기화</button>
      <button class="fmbtn fmbtn-apply" id="fmApplyBtn">적용</button>
    </div>
  </div>

  <!-- OPERATING HOURS MODAL -->
  <div class="opmodal-backdrop" id="operatingModalBackdrop"></div>
  <div class="opmodal" id="operatingModal">
    <div class="opmodal-header">
      <span class="opmodal-title">운영시간 수정</span>
      <button class="opmodal-close" id="operatingModalClose">✕</button>
    </div>
    <div class="opmodal-body">
      <div class="opmodal-row">
        <label class="opmodal-label" for="modalOperatingStartDate">운영 시작일</label>
        <input class="opmodal-input" id="modalOperatingStartDate" type="date">
      </div>
      <div class="opmodal-row">
        <label class="opmodal-label" for="modalOperatingEndDate">운영 종료일</label>
        <input class="opmodal-input" id="modalOperatingEndDate" type="date">
      </div>
      <div class="opmodal-row">
        <label class="opmodal-label" for="modalOperatingMode">운영시간</label>
        <select class="opmodal-select" id="modalOperatingMode">
          <option value="">변경 안 함</option>
          <option value="school">학기중 (10:00~19:00)</option>
          <option value="vacation">방학중 (10:00~19:00)</option>
          <option value="manual">수동 입력</option>
        </select>
      </div>
      <div class="opmodal-row">
        <label class="opmodal-label" for="modalOperatingManualText">수동 입력</label>
        <textarea class="opmodal-text" id="modalOperatingManualText" placeholder="예: 학기중 (10:00 ~ 19:00)" disabled></textarea>
      </div>
      <div class="opmodal-help">선택 연도의 운영일지 데이터에 지정한 기간만큼 운영시간을 일괄 반영합니다.</div>
    </div>
    <div class="opmodal-footer">
      <button class="fbtn" id="btnResetOperatingModal">초기화</button>
      <button class="fbtn" id="btnApplyOperatingModal">적용</button>
    </div>
  </div>

  <!-- ADVANCED PANEL -->
  <div class="advanced-panel" id="advancedPanel">
    <div class="adv-group hidden-operating-controls">
      <div class="adv-label">운영 시작일</div>
      <input id="operatingStartDate" type="date">
    </div>
    <div class="adv-group hidden-operating-controls">
      <div class="adv-label">운영 종료일</div>
      <input id="operatingEndDate" type="date">
    </div>
    <div class="adv-group hidden-operating-controls">
      <div class="adv-label">운영시간</div>
      <select id="operatingMode">
        <option value="">변경 안 함</option>
        <option value="school">학기중 (10:00~19:00)</option>
        <option value="vacation">방학중 (10:00~19:00)</option>
        <option value="manual">수동 입력</option>
      </select>
    </div>
    <div class="adv-group hidden-operating-controls">
      <div class="adv-label">수동 입력</div>
      <input id="operatingManualText" type="text" placeholder="예: 학기중 (10:00~19:00)" disabled>
    </div>
    <div class="adv-group">
      <div class="adv-label">연차 링크</div>
      <div class="adv-row">
        <input id="annualLeaveSourceUrl" type="text" placeholder="연차 통합파일 링크">
        <button class="fbtn" id="btnSaveAnnualUrl">저장</button>
      </div>
    </div>
    <div class="adv-group">
      <div class="adv-label">고급 기능</div>
      <div class="adv-actions" id="advActions">
        <button class="fbtn" id="btnReloadYear">연도 새로고침</button>
        <button class="fbtn" id="btnToggleAggregate">집계</button>
        <button class="fbtn" id="btnEditOperatingHours">운영시간 수정</button>
      </div>
    </div>
    <span class="integration-status" id="advIntegrationStatus"></span>
  </div>

  <!-- SUMMARY STRIP -->
  <div class="summary-strip aggregate-hidden" id="summaryStrip">
    <div class="sum-card c-blue">
      <div class="sum-label">집계 날짜</div>
      <div class="sum-value" id="summaryDateCount">0</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">총 출석</div>
      <div class="sum-value" id="summaryPresent">0</div>
    </div>
    <div class="sum-card c-amber">
      <div class="sum-label">총 공결</div>
      <div class="sum-value" id="summaryOfficial">0</div>
    </div>
    <div class="sum-card c-red">
      <div class="sum-label">총 결석</div>
      <div class="sum-value" id="summaryAbsent">0</div>
    </div>
    <div class="sum-card">
      <div class="sum-label">남아 합계</div>
      <div class="sum-value" id="summaryMale">0</div>
    </div>
    <div class="sum-card c-green">
      <div class="sum-label">여아 합계</div>
      <div class="sum-value" id="summaryFemale">0</div>
    </div>
  </div>

  <div class="overview-strip aggregate-hidden" id="overviewStrip">
    <section class="overview-card">
      <div class="overview-title">운영 개요</div>
      <div class="overview-line" id="overviewPeriodLine">집계 기간: <strong>-</strong></div>
      <div class="overview-line" id="overviewCalendarLine">전체 일수 - / 주말 -</div>
      <div class="overview-line" id="overviewHolidayLine">빨간날: -</div>
      <div class="overview-line" id="overviewOperatingLine">기대 운영일수: <strong>-</strong></div>
      <div class="overview-line" id="overviewLogLine">운영일지 작성: <strong>-</strong></div>
      <div class="overview-line" id="overviewGapLine">누락 <strong>-</strong> / 미완성 <strong>-</strong></div>
    </section>
    <section class="overview-card">
      <div class="overview-title">출석 분석</div>
      <div class="overview-line" id="overviewAttendanceRateLine">출석률: <strong>-</strong></div>
      <div class="overview-line" id="overviewAbsenceRateLine">결석률: <strong>-</strong></div>
      <div class="overview-line" id="overviewGenderLine">남아 - / 여아 -</div>
      <div class="overview-line" id="overviewAverageLine">일평균 출석 <strong>-</strong> / 결석 -</div>
    </section>
    <section class="overview-card">
      <div class="overview-title">누락일자</div>
      <div class="overview-report" id="overviewReportText">집계를 열면 누락일자가 표시됩니다.</div>
    </section>
  </div>

  <!-- SCROLLABLE MAIN -->
  <div class="main">

    <!-- MAIN TABLE -->
    <div class="section">
      <div class="sec-head">
        <div>
          <div class="sec-title">날짜별 집계</div>
          <div class="sec-sub">날짜를 체크해 작업 대상을 고르고, 행을 눌러 아래 상세를 탐색합니다.</div>
        </div>
      </div>
      <div class="table-wrap main-table-wrap">
        <table>
          <thead>
              <tr>
                <th style="width:30px;"><input type="checkbox" id="checkAll"></th>
                <th style="width:118px;">날짜</th>
                <th style="width:148px;">운영시간</th>
                <th style="width:72px;">담당자</th>
                <th style="width:46px;">정원</th>
                <th style="width:46px;">현원</th>
                <th style="width:46px;">조식</th>
                <th style="width:46px;">중식</th>
                <th style="width:46px;">석식</th>
                <th style="width:46px;">출석</th>
                <th style="width:46px;">결석</th>
                <th style="width:46px;">공결</th>
                <th style="width:46px;">교육</th>
                <th style="width:46px;">연차</th>
              <th style="width:62px;">프로그램</th>
              <th style="width:52px;">미매칭</th>
              <th style="width:52px;">종사자</th>
              <th style="width:52px;">교사</th>
              <th style="width:52px;">공익</th>
              <th style="width:52px;">기타</th>
              <th style="width:72px;">상태</th>
              <th>확인 메모</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>

    <!-- PREVIEW SECTION (테이블 아래) -->
    <div class="section preview-card" id="previewCard">
      <div class="preview-head">
        <div>
          <div class="sec-title">반영 미리보기</div>
          <div class="sec-sub">현재 선택 기준으로 일지데이터에 들어갈 값을 먼저 확인합니다.</div>
          <div class="preview-summary" id="previewSummary"></div>
        </div>
        <div class="sec-actions">
          <span class="preview-text" id="previewMeta">미리보기를 실행하면 이곳에 요약이 표시됩니다.</span>
          <button class="collapse-button" id="previewToggleButton">접기</button>
        </div>
      </div>
      <div class="card-body" id="previewBody">
        <div class="table-wrap preview-table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:84px;">날짜</th>
                <th style="width:74px;">적용항목</th>
                <th style="width:46px;">현원</th>
                <th style="width:46px;">출석</th>
                <th style="width:46px;">공결</th>
                <th style="width:46px;">결석</th>
                <th style="width:120px;">운영시간</th>
                <th style="width:58px;">담당자</th>
                <th style="width:54px;">종사자수</th>
                <th>종사자변동</th>
                <th>업무1/프로그램</th>
              </tr>
            </thead>
            <tbody id="previewRows">
              <tr><td colspan="11" class="empty">미리보기를 실행해주세요.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- DETAIL SECTION -->
    <div class="section">
      <div class="sec-head">
        <div>
          <div class="sec-title" id="detailTitle">선택 기간 아동 목록</div>
          <div class="sec-sub" id="detailSubtitle">현재 필터된 기간에 등장한 아동과 집계를 표시합니다.</div>
        </div>
        <div class="sec-actions">
          <button class="collapse-button" id="studentPanelToggleButton">접기</button>
        </div>
      </div>
      <div class="detail-grid">
        <div>
          <div class="detail-meta" id="detailMeta" style="display:none;"></div>
          <div class="detail-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:76px;">이름</th>
                  <th>소속</th>
                  <th style="width:50px;">성별</th>
                  <th style="width:58px;">학교급</th>
                  <th style="width:50px;">출석</th>
                  <th style="width:50px;">공결</th>
                  <th style="width:50px;">결석</th>
                  <th style="width:60px;">매칭</th>
                </tr>
              </thead>
              <tbody id="detailRows"></tbody>
            </table>
          </div>
        </div>
        <div class="student-panel">
          <div class="student-panel-head">
            <div class="student-panel-head-main">
              <div class="student-panel-title" id="studentTitle">학생 이력</div>
              <div class="student-panel-subtitle" id="studentSubtitle">상세 기록에서 이름을 누르면 연월별 출석 이력이 표시됩니다.</div>
              <div class="student-meta" id="studentMeta"></div>
            </div>
          </div>
          <div class="student-panel-body">
            <div class="student-summary-grid">
              <div class="student-summary-card"><div class="student-summary-label">대상일수</div><div class="student-summary-value" id="studentTotalDays">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">총 출석</div><div class="student-summary-value" id="studentPresent">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">출석률</div><div class="student-summary-value" id="studentAttendanceRate">0%</div></div>
              <div class="student-summary-card"><div class="student-summary-label">총 공결</div><div class="student-summary-value" id="studentOfficial">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">총 결석</div><div class="student-summary-value" id="studentAbsent">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">대체출석</div><div class="student-summary-value" id="studentAlternative">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">기타</div><div class="student-summary-value" id="studentOther">0</div></div>
              <div class="student-summary-card"><div class="student-summary-label">최근결석일</div><div class="student-summary-value" id="studentLastAbsent" style="font-size:11px;">-</div></div>
            </div>
            <div class="student-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:78px;">최근일자</th>
                    <th style="width:54px;">상태</th>
                    <th style="width:52px;">입실</th>
                    <th style="width:52px;">퇴실</th>
                  </tr>
                </thead>
                <tbody id="studentRecentRows"></tbody>
              </table>
            </div>
            <div class="student-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:64px;">연월</th>
                    <th style="width:46px;">대상</th>
                    <th style="width:42px;">출석</th>
                    <th style="width:50px;">출석률</th>
                    <th style="width:42px;">공결</th>
                    <th style="width:52px;">대체</th>
                    <th style="width:42px;">결석</th>
                    <th style="width:42px;">기타</th>
                  </tr>
                </thead>
                <tbody id="studentRows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- .main -->

  <!-- SELECTION BAR (앱 하단 고정, 스크롤 영역 바깥) -->
  <div class="selection-action-bar" id="selectionActionBar">
    <div>
      <div class="selection-action-title" id="selectionActionTitle">선택한 날짜 0건</div>
      <div class="selection-action-subtitle">날짜를 선택하면 여기서 바로 일지를 작성하고 인쇄할 수 있습니다.</div>
    </div>
    <div class="selection-action-buttons">
      <button class="topbar-btn accent" id="actionApplySelected">선택 날짜 일지 작성</button>
      <button class="topbar-btn" id="actionEditSelectedLog">선택 날짜 데이터 수정</button>
      <button class="topbar-btn" id="actionDeleteSelectedLog">선택 날짜 데이터 삭제</button>
      <button class="topbar-btn" id="actionPrintLogs">일지 인쇄</button>
      <button class="topbar-btn" id="actionPreviewApply">작성 전 미리보기</button>
    </div>
  </div>

</div><!-- .app.panel -->
  <script>
    /* ── NEW UI HELPERS ── */
    function syncChip(labelId, checkbox) {
      var label = document.getElementById(labelId);
      if (label) label.classList.toggle('on', checkbox.checked);
    }

    function updateChipDataStatus() {
      var warnings = (state && state.warnings) || [];
      var summary = (state && state.summary) || {};
      var hasAnnualWarn = warnings.some(function(w) { return w && w.scope === 'annual'; });
      var hasEducationWarn = warnings.some(function(w) { return w && w.scope === 'education'; });
      var hasProgramData = (summary.programDays || 0) > 0;
      var hasAttendanceData = (summary.dateCount || 0) > 0;

      setChipDataBadge_('chipAttendance', !hasAttendanceData);
      setChipDataBadge_('chipAnnual', hasAnnualWarn);
      setChipDataBadge_('chipEducation', hasEducationWarn);
      setChipDataBadge_('chipProgram', !hasProgramData);
    }

    function setChipDataBadge_(chipId, hasIssue) {
      var label = document.getElementById(chipId);
      if (!label) return;
      var existing = label.querySelector('.chip-badge');
      if (hasIssue) {
        if (!existing) {
          var badge = document.createElement('span');
          badge.className = 'chip-badge';
          badge.textContent = '!';
          label.appendChild(badge);
        }
        label.classList.add('chip-warn');
      } else {
        if (existing) existing.parentNode.removeChild(existing);
        label.classList.remove('chip-warn');
      }
    }

    function toggleAdvancedPanel() {
      var panel = document.getElementById('advancedPanel');
      if (panel) panel.classList.toggle('open');
    }

    function toggleAggregatePanel() {
      var summaryStrip = document.getElementById('summaryStrip');
      var overviewStrip = document.getElementById('overviewStrip');
      var button = document.getElementById('btnToggleAggregate');
      if (!summaryStrip || !overviewStrip) return;
      var isOpen = summaryStrip.classList.contains('aggregate-hidden');
      summaryStrip.classList.toggle('aggregate-hidden', !isOpen);
      overviewStrip.classList.toggle('aggregate-hidden', !isOpen);
      if (button) button.classList.toggle('active', isOpen);
    }

    /* ── FILTER MODAL ── */
    var fmState = { preset: 'year', month: '' };

    function openFilterModal() {
      fmState.preset = document.getElementById('datePreset').value || 'all';
      fmState.month = '';
      var monthVal = document.getElementById('monthSelect').value || '';
      if (monthVal) fmState.month = String(monthVal).slice(-2);
      document.getElementById('fmStartDate').value = document.getElementById('filterStartDate').value || '';
      document.getElementById('fmEndDate').value = document.getElementById('filterEndDate').value || '';
      fmSyncButtons();
      document.getElementById('filterModalBackdrop').classList.add('open');
      document.getElementById('filterModal').classList.add('open');
    }

    function closeFilterModal() {
      document.getElementById('filterModalBackdrop').classList.remove('open');
      document.getElementById('filterModal').classList.remove('open');
    }

    function fmSelectPreset(preset) {
      fmState.preset = preset;
      if (preset !== 'month') fmState.month = '';
      fmSyncButtons();
    }

    function fmSelectMonth(month) {
      fmState.month = month;
      if (month) fmState.preset = 'month';
      fmSyncButtons();
    }

    function fmSyncButtons() {
      document.querySelectorAll('#fmPresetGroup .fmbtn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === fmState.preset);
      });
      document.querySelectorAll('#fmMonthGroup .fmbtn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-month') === fmState.month);
      });
      var quarterMonthMap = { q1: ['01','02','03'], q2: ['04','05','06'], q3: ['07','08','09'], q4: ['10','11','12'] };
      var inRangeMonths = quarterMonthMap[fmState.preset] || [];
      document.querySelectorAll('#fmMonthGroup .fmbtn').forEach(function(btn) {
        var m = btn.getAttribute('data-month');
        btn.classList.toggle('in-range', !!m && inRangeMonths.indexOf(m) !== -1);
      });
      var customRange = document.getElementById('fmCustomRange');
      if (fmState.preset === 'custom') { customRange.classList.add('visible'); fmCalOpen(); }
      else customRange.classList.remove('visible');
    }

    function fmApply() {
      var year = Number(document.getElementById('yearSelect').value || state.selectedYear || new Date().getFullYear());
      var monthSelect = document.getElementById('monthSelect');
      var presetSelect = document.getElementById('datePreset');
      if (fmState.month) {
        var monthKey = year + '-' + fmState.month;
        monthSelect.innerHTML = '<option value="' + monthKey + '">' + monthKey + '</option>';
        monthSelect.value = monthKey;
      } else {
        monthSelect.innerHTML = '<option value=""></option>';
        monthSelect.value = '';
      }
      presetSelect.value = fmState.preset;
      if (fmState.preset === 'custom') {
        document.getElementById('filterStartDate').value = document.getElementById('fmStartDate').value || '';
        document.getElementById('filterEndDate').value = document.getElementById('fmEndDate').value || '';
        handleFilterDateChange();
      } else {
        applyDatePreset(fmState.preset);
      }
      updateFilterActivePills();
      closeFilterModal();
    }

    function fmReset() {
      fmState = { preset: 'year', month: '' };
      fmSyncButtons();
      fmCalClear();
    }

    function resetFiltersForYearChange() {
      const monthSelect = document.getElementById('monthSelect');
      const presetSelect = document.getElementById('datePreset');
      const startInput = document.getElementById('filterStartDate');
      const endInput = document.getElementById('filterEndDate');
      const fmStartInput = document.getElementById('fmStartDate');
      const fmEndInput = document.getElementById('fmEndDate');

      if (monthSelect) {
        monthSelect.value = '';
      }
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      if (fmStartInput) fmStartInput.value = '';
      if (fmEndInput) fmEndInput.value = '';

      fmReset();
      renderMonthOptions();

      const nextMonthValue = monthSelect ? (monthSelect.value || '') : '';
      const nextPreset = nextMonthValue ? 'month' : 'year';

      if (presetSelect) {
        presetSelect.value = nextPreset;
      }
      state.activePreset = nextPreset;
      fmState.preset = nextPreset;
      fmState.month = nextMonthValue ? String(nextMonthValue).slice(-2) : '';
      fmSyncButtons();
      applyDatePreset(nextPreset);
      updateFilterActivePills();
      closeFilterModal();
    }

    /* ── CALENDAR WIDGET ── */
    var fmCal = { year: new Date().getFullYear(), month: new Date().getMonth(), start: '', end: '', picking: 'start' };

    function fmCalOpen() {
      var today = new Date();
      fmCal.year = today.getFullYear();
      fmCal.month = today.getMonth();
      var existing = document.getElementById('fmStartDate').value;
      if (existing) { var d = new Date(existing); fmCal.year = d.getFullYear(); fmCal.month = d.getMonth(); }
      fmCal.start = document.getElementById('fmStartDate').value || '';
      fmCal.end = document.getElementById('fmEndDate').value || '';
      fmCal.picking = fmCal.start ? 'end' : 'start';
      fmCalRender();
    }

    function fmCalMove(dir) {
      fmCal.month += dir;
      if (fmCal.month > 11) { fmCal.month = 0; fmCal.year++; }
      if (fmCal.month < 0) { fmCal.month = 11; fmCal.year--; }
      fmCalRender();
    }

    function fmCalSelectDay(dateStr) {
      if (!dateStr) return;
      if (!fmCal.start || fmCal.picking === 'start') {
        fmCal.start = dateStr; fmCal.end = ''; fmCal.picking = 'end';
      } else {
        if (dateStr < fmCal.start) { fmCal.end = fmCal.start; fmCal.start = dateStr; }
        else fmCal.end = dateStr;
        fmCal.picking = 'start';
      }
      document.getElementById('fmStartDate').value = fmCal.start;
      document.getElementById('fmEndDate').value = fmCal.end;
      fmCalRender();
    }

    function fmCalClear() {
      fmCal.start = ''; fmCal.end = ''; fmCal.picking = 'start';
      document.getElementById('fmStartDate').value = '';
      document.getElementById('fmEndDate').value = '';
      fmCalRender();
    }

    function fmCalRender() {
      var DAYS = ['일','월','화','수','목','금','토'];
      var title = document.getElementById('fmCalTitle');
      var grid = document.getElementById('fmCalGrid');
      var rangeText = document.getElementById('fmCalRangeText');
      if (!title || !grid) return;
      title.textContent = fmCal.year + '년 ' + (fmCal.month + 1) + '월';
      var today = new Date(); var todayStr = formatDateInputValue(today);
      var firstDay = new Date(fmCal.year, fmCal.month, 1).getDay();
      var daysInMonth = new Date(fmCal.year, fmCal.month + 1, 0).getDate();
      var html = DAYS.map(function(d) { return '<div class="fm-cal-dow">' + d + '</div>'; }).join('');
      for (var i = 0; i < firstDay; i++) html += '<div class="fm-cal-day empty"></div>';
      for (var d = 1; d <= daysInMonth; d++) {
        var ds = fmCal.year + '-' + String(fmCal.month + 1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        var cls = 'fm-cal-day';
        if (ds === todayStr) cls += ' today';
        if (ds === fmCal.start) cls += ' start';
        if (ds === fmCal.end) cls += ' end';
        if (fmCal.start && fmCal.end && ds > fmCal.start && ds < fmCal.end) cls += ' in-range';
        html += '<div class="' + cls + '" data-date="' + ds + '">' + d + '</div>';
      }
      grid.innerHTML = html;
      if (fmCal.start && fmCal.end) rangeText.textContent = fmCal.start + ' ~ ' + fmCal.end;
      else if (fmCal.start) rangeText.textContent = fmCal.start + ' ~ 종료일 선택';
      else rangeText.textContent = '날짜를 선택하세요';
    }

    function syncModalChips() {
      [['visChipAttendance','chipAttendance','typeAttendance'],
       ['visChipEducation','chipEducation','typeEducation'],
       ['visChipAnnual','chipAnnual','typeAnnual'],
       ['visChipProgram','chipProgram','typeProgram']].forEach(function(trio) {
        var vis = document.getElementById(trio[0]);
        var label = document.getElementById(trio[1]);
        var hidden = document.getElementById(trio[2]);
        if (!vis || !label || !hidden) return;
        vis.checked = hidden.checked;
        label.classList.toggle('on', hidden.checked);
      });
    }

    function updateFilterActivePills() {
      var pills = document.getElementById('filterActivePills');
      var btn = document.getElementById('filterModalBtn');
      var parts = [];
      var preset = document.getElementById('datePreset').value || '';
      var presetLabel = getPresetLabel(preset);
      var monthVal = document.getElementById('monthSelect').value || '';
      var start = document.getElementById('filterStartDate').value || '';
      var end = document.getElementById('filterEndDate').value || '';
      if (monthVal) parts.push(String(monthVal).slice(-3).replace('-', '') + '월');
      else if (preset && preset !== 'all') parts.push(presetLabel);
      if (preset === 'custom' && (start || end)) parts.push((start || '?') + ' ~ ' + (end || '?'));
      pills.innerHTML = parts.map(function(p) {
        return '<span class="filter-active-pill">' + p + '</span>';
      }).join('');
      btn.classList.toggle('active', parts.length > 0);
    }

    /* ── ORIGINAL SCRIPT (preserved) ── */
    let state = {
      availableYears: [],
      selectedYear: '',
      rows: [],
      detailsByDate: {},
      summary: {},
      warnings: [],
      availableMonths: [],
      statusMessage: '통계를 준비하고 있습니다. 잠시만 기다려주세요.'
    };
    let activeDetailDate = '';
    let activeStudentKey = '';
    let previewCollapsed = false;
    let studentPanelCollapsed = true;
    let loadingState = { active: false, message: '' };
    let previewState = { key: '', data: null };
    let actionBusyKey = '';
    let yearRequestToken = 0;
    const actionButtonLabelCache = {};

    function setDialogSize(mode) {
      if (typeof google === 'undefined' || !google.script || !google.script.host) return;
      if (mode === 'max') { google.script.host.setWidth(1800); google.script.host.setHeight(1120); return; }
      if (mode === 'wide') { google.script.host.setWidth(1600); google.script.host.setHeight(1050); return; }
      google.script.host.setWidth(1400);
      google.script.host.setHeight(960);
    }

    function togglePreviewCollapse() {
      previewCollapsed = !previewCollapsed;
      updatePreviewCollapseState();
    }

    function updatePreviewCollapseState() {
      const card = document.getElementById('previewCard');
      const button = document.getElementById('previewToggleButton');
      if (!card || !button) return;
      card.classList.toggle('collapsed', previewCollapsed);
      button.textContent = previewCollapsed ? '펼치기' : '접기';
    }

    function toggleStudentPanelCollapse() {
      studentPanelCollapsed = !studentPanelCollapsed;
      updateStudentPanelCollapseState();
    }

    function updateStudentPanelCollapseState() {
      const panel = document.querySelector('.student-panel');
      const button = document.getElementById('studentPanelToggleButton');
      if (!panel || !button) return;
      panel.classList.toggle('collapsed', studentPanelCollapsed);
      button.textContent = studentPanelCollapsed ? '펼치기' : '접기';
    }

    function setStatus(message) {
      document.getElementById('status').textContent = message || '';
    }

      function getSelectionActionButtons() {
        return [
          document.getElementById('actionApplySelected'),
          document.getElementById('actionEditSelectedLog'),
          document.getElementById('actionDeleteSelectedLog'),
          document.getElementById('actionPrintLogs'),
          document.getElementById('actionPreviewApply')
        ].filter(Boolean);
      }

    function setActionBusy(buttonId, busyText) {
      actionBusyKey = buttonId || '';
      getSelectionActionButtons().forEach(function(button) {
        if (!button) return;
        if (!actionButtonLabelCache[button.id]) {
          actionButtonLabelCache[button.id] = button.textContent;
        }
        const isTarget = button.id === buttonId;
        button.disabled = !!buttonId;
        button.classList.toggle('is-busy', isTarget);
        button.textContent = isTarget ? busyText : actionButtonLabelCache[button.id];
      });
    }

    function clearActionBusy() {
      actionBusyKey = '';
      getSelectionActionButtons().forEach(function(button) {
        if (!button) return;
        button.disabled = false;
        button.classList.remove('is-busy');
        if (actionButtonLabelCache[button.id]) {
          button.textContent = actionButtonLabelCache[button.id];
        }
      });
    }

    function setLoading(active, message) {
      loadingState.active = !!active;
      loadingState.message = message || '';
      const panel = document.querySelector('.panel');
      const banner = document.getElementById('loadingBanner');
      const loadingTitle = document.getElementById('loadingTitle');
      const loadingText = document.getElementById('loadingText');
      if (panel) panel.classList.toggle('is-loading', loadingState.active);
      if (!banner || !loadingTitle || !loadingText) return;
      banner.classList.toggle('active', loadingState.active);
      banner.setAttribute('aria-busy', loadingState.active ? 'true' : 'false');
      loadingTitle.textContent = loadingState.active ? '통계를 불러오는 중입니다' : '';
      loadingText.textContent = loadingState.active
        ? (loadingState.message || '잠시만 기다려주세요. 날짜별 집계를 준비하고 있습니다.')
        : '';
    }

    function renderYearOptions() {
      const select = document.getElementById('yearSelect');
      let years = state.availableYears || [];
      if (!years.length && state.selectedYear) {
        years = [{ year: state.selectedYear, label: String(state.selectedYear) + '년 출석부' }];
      }
      if (!years.length) {
        select.innerHTML = '<option value="">출석부 없음</option>';
        select.disabled = true;
        return;
      }
      select.disabled = false;
      select.innerHTML = years.map(function(item) {
        const selected = Number(item.year) === Number(state.selectedYear) ? ' selected' : '';
        return '<option value="' + item.year + '"' + selected + '>' + esc(item.label || (item.year + '년')) + '</option>';
      }).join('');
    }

    function renderMonthOptions() {
      const select = document.getElementById('monthSelect');
      const months = [''].concat(state.availableMonths || []);
      const currentValue = select.value || '';
      select.innerHTML = months.map(function(value) {
        const label = value ? value.replace('-', '년 ') + '월' : '전체';
        const selected = value === currentValue ? ' selected' : '';
        return '<option value="' + value + '"' + selected + '>' + esc(label) + '</option>';
      }).join('');
      if (currentValue && months.indexOf(currentValue) === -1) {
        select.value = '';
      }
    }

    function getTypeFilters() {
      return {
        attendance: document.getElementById('typeAttendance').checked,
        education: document.getElementById('typeEducation').checked,
        annual: document.getElementById('typeAnnual').checked,
        program: document.getElementById('typeProgram').checked,
      };
    }

    function parseDateInputValue(value) {
      if (!value) return null;
      const date = new Date(String(value) + 'T00:00:00');
      return isNaN(date.getTime()) ? null : date;
    }

    function formatDateInputValue(date) {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }

    function formatKoreanDateLabel_(value) {
      const text = String(value || '').trim();
      const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return text;
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (isNaN(date.getTime())) return text;
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      return Number(match[1]) + '년 ' + Number(match[2]) + '월 ' + Number(match[3]) + '일 ' + weekdays[date.getDay()];
    }

    function uniqueStringsClient(values) {
      const seen = {};
      return (values || []).filter(function(value) {
        const key = String(value || '');
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      });
    }

    function setDateInputRange(start, end) {
      document.getElementById('filterStartDate').value = start ? formatDateInputValue(start) : '';
      document.getElementById('filterEndDate').value = end ? formatDateInputValue(end) : '';
    }

    function setOperatingRange(start, end) {
      document.getElementById('operatingStartDate').value = start ? formatDateInputValue(start) : '';
      document.getElementById('operatingEndDate').value = end ? formatDateInputValue(end) : '';
    }

    function syncOperatingRangeFromFilters() {
      document.getElementById('operatingStartDate').value = document.getElementById('filterStartDate').value || '';
      document.getElementById('operatingEndDate').value = document.getElementById('filterEndDate').value || '';
    }

    function handleFilterDateChange() {
      var preset = document.getElementById('datePreset');
      if (preset && preset.value !== 'custom') preset.value = 'custom';
      state.activePreset = 'custom';
      syncOperatingRangeFromFilters();
      render();
    }

    function getAvailableRowDates() {
      return uniqueStringsClient((state.rows || []).map(function(row) {
        return String(row && row.date || '').trim();
      }).filter(Boolean)).sort();
    }

    function getReferenceDateForPreset() {
      const filteredDates = getFilteredRows().map(function(row) { return String(row.date || '').trim(); }).filter(Boolean).sort();
      const sourceDates = filteredDates.length ? filteredDates : getAvailableRowDates();
      const preferredDate = activeDetailDate && String(activeDetailDate || '').trim();
      const candidate = preferredDate || (sourceDates.length ? sourceDates[sourceDates.length - 1] : '');
      return parseDateInputValue(candidate);
    }

    function getQuarterStartMonth(monthIndex) {
      return Math.floor(Number(monthIndex || 0) / 3) * 3;
    }

    function formatMonthLabel(monthIndex) {
      return (Number(monthIndex || 0) + 1) + '월';
    }

    function getPresetLabel(preset) {
      const map = {
        today: '당일',
        week: '주간',
        month: '월간',
        quarter: '분기별',
        half: '반기별',
        year: '연간',
        all: '전체',
        q1: '1분기',
        q2: '2분기',
        q3: '3분기',
        q4: '4분기',
        half1: '상반기',
        half2: '하반기',
        custom: '직접 입력'
      };
      return map[String(preset || '')] || '기간';
    }

    function getActivePeriodSummary() {
      const preset = String((document.getElementById('datePreset') || {}).value || state.activePreset || '');
      const start = (document.getElementById('filterStartDate') || {}).value || '';
      const end = (document.getElementById('filterEndDate') || {}).value || '';
      const monthValue = (document.getElementById('monthSelect') || {}).value || '';
      const dateRangeText = start && end ? (start + ' ~ ' + end) : (start || end || '-');

      if (preset === 'month' && monthValue) {
        return '기간: 월간 (' + monthValue + ')';
      }
      if (preset === 'quarter' && start) {
        const month = Number(String(start).slice(5, 7)) - 1;
        const quarter = Math.floor(month / 3) + 1;
        return '기간: 분기별 (' + quarter + '분기 / ' + dateRangeText + ')';
      }
      if (preset === 'half' && start) {
        const month = Number(String(start).slice(5, 7));
        const halfLabel = month <= 6 ? '상반기' : '하반기';
        return '기간: 반기별 (' + halfLabel + ' / ' + dateRangeText + ')';
      }
      if (preset === 'week') {
        return '기간: 주간 (' + dateRangeText + ')';
      }
      if (preset === 'today') {
        return '기간: 당일 (' + dateRangeText + ')';
      }
      if (preset === 'year' || preset === 'all' || preset === 'custom' || /^q\d$/.test(preset) || /^half\d$/.test(preset)) {
        return '기간: ' + getPresetLabel(preset) + ' (' + dateRangeText + ')';
      }
      return '기간: ' + getPresetLabel(preset) + (dateRangeText !== '-' ? ' (' + dateRangeText + ')' : '');
    }

    function buildRangeForPreset(preset) {
      const selectedYear = Number(document.getElementById('yearSelect').value || state.selectedYear || 0) || new Date().getFullYear();
      const monthValue = document.getElementById('monthSelect').value || '';
      const monthIndex = monthValue ? Number(String(monthValue).split('-')[1]) - 1 : null;
      const referenceDate = getReferenceDateForPreset() || new Date(selectedYear, 11, 31);
      let start = null, end = null;
      if (preset === 'today') {
        start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
        end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      } else if (preset === 'week') {
        const day = referenceDate.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + mondayOffset);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      } else if (preset === 'month' && monthIndex != null && !isNaN(monthIndex)) {
        start = new Date(selectedYear, monthIndex, 1);
        end = new Date(selectedYear, monthIndex + 1, 0);
      } else if (preset === 'month') {
        start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      } else if (preset === 'quarter') {
        const quarterStart = getQuarterStartMonth(referenceDate.getMonth());
        start = new Date(referenceDate.getFullYear(), quarterStart, 1);
        end = new Date(referenceDate.getFullYear(), quarterStart + 3, 0);
      } else if (preset === 'half') {
        const halfStart = referenceDate.getMonth() < 6 ? 0 : 6;
        start = new Date(referenceDate.getFullYear(), halfStart, 1);
        end = new Date(referenceDate.getFullYear(), halfStart + 6, 0);
      } else if (preset === 'q1') { start = new Date(selectedYear, 0, 1); end = new Date(selectedYear, 2, 31); }
      else if (preset === 'q2') { start = new Date(selectedYear, 3, 1); end = new Date(selectedYear, 5, 30); }
      else if (preset === 'q3') { start = new Date(selectedYear, 6, 1); end = new Date(selectedYear, 8, 30); }
      else if (preset === 'q4') { start = new Date(selectedYear, 9, 1); end = new Date(selectedYear, 11, 31); }
      else if (preset === 'half1') { start = new Date(selectedYear, 0, 1); end = new Date(selectedYear, 5, 30); }
      else if (preset === 'half2') { start = new Date(selectedYear, 6, 1); end = new Date(selectedYear, 11, 31); }
      else if (preset === 'all' || preset === 'year') { start = new Date(selectedYear, 0, 1); end = new Date(selectedYear, 11, 31); }
      return { start: start, end: end };
    }

    function applyDatePreset(preset) {
      state.activePreset = preset || '';
      if (preset !== 'month') {
        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect) {
          monthSelect.value = '';
        }
      }
      if (preset === 'custom') { render(); return; }
      const range = buildRangeForPreset(preset);
      setDateInputRange(range.start, range.end);
      setOperatingRange(range.start, range.end);
      render();
    }

    function syncDateRangeFromMonth() {
      const monthValue = document.getElementById('monthSelect').value || '';
      const presetSelect = document.getElementById('datePreset');
      if (monthValue) {
        presetSelect.value = 'month';
        applyDatePreset('month');
        return;
      }
      if (presetSelect.value === 'month') {
        presetSelect.value = 'year';
        applyDatePreset('year');
        return;
      }
      render();
    }

    function getFilteredRows() {
      const rows = state.rows || [];
      const monthValue = document.getElementById('monthSelect').value || '';
      const dateSearch = (document.getElementById('dateSearch').value || '').trim();
      const filterStartDate = document.getElementById('filterStartDate').value || '';
      const filterEndDate = document.getElementById('filterEndDate').value || '';
      const typeFilters = getTypeFilters();
      const enabledTypeCount = [typeFilters.attendance, typeFilters.education, typeFilters.annual, typeFilters.program].filter(Boolean).length;
      return rows.filter(function(row) {
        if (monthValue && row.monthKey !== monthValue) return false;
        if (filterStartDate && String(row.date || '') < filterStartDate) return false;
        if (filterEndDate && String(row.date || '') > filterEndDate) return false;
        if (dateSearch) {
          const normalizedSearch = dateSearch.replace(/\./g, '-').replace(/\s+/g, '');
          const normalizedDate = String(row.date || '').replace(/\s+/g, '');
          if (normalizedDate.indexOf(normalizedSearch) === -1 && String(row.monthKey || '').indexOf(normalizedSearch) === -1) return false;
        }
        if (enabledTypeCount) {
          const matchesType =
            (typeFilters.attendance && row.hasAttendance) ||
            (typeFilters.education && row.hasEducation) ||
            (typeFilters.annual && row.hasAnnualLeave) ||
            (typeFilters.program && row.hasProgram);
          if (!matchesType) return false;
        }
        return true;
      });
    }

    function buildActiveFilterDescription() {
      const parts = [];
      const monthValue = document.getElementById('monthSelect').value || '';
      const dateSearch = (document.getElementById('dateSearch').value || '').trim();
      const filterStartDate = document.getElementById('filterStartDate').value || '';
      const filterEndDate = document.getElementById('filterEndDate').value || '';
      const typeFilters = getTypeFilters();

      if (state.activePreset) {
        parts.push(getPresetLabel(state.activePreset));
      }
      if (monthValue) {
        parts.push(monthValue + '월');
      }
      if (filterStartDate || filterEndDate) {
        parts.push((filterStartDate || '-') + ' ~ ' + (filterEndDate || '-'));
      }
      if (dateSearch) {
        parts.push('날짜 검색: ' + dateSearch);
      }

      const typeLabels = [];
      if (typeFilters.attendance) typeLabels.push('출석');
      if (typeFilters.education) typeLabels.push('교육');
      if (typeFilters.annual) typeLabels.push('연차');
      if (typeFilters.program) typeLabels.push('프로그램');
      if (typeLabels.length && typeLabels.length < 4) {
        parts.push('유형: ' + typeLabels.join(', '));
      }

      return parts.join(' / ');
    }

    function buildRowsEmptyMessage(filteredRows) {
      const allRows = state.rows || [];
      const warnings = getVisibleWarnings();

      if (state.lastLoadError) {
        return '연도 데이터를 불러오지 못했습니다. ' + state.lastLoadError;
      }

      if (!allRows.length) {
        const warningText = warnings.map(function(item) {
          return item && item.message ? item.message : '';
        }).filter(Boolean).join(' / ');
        return warningText || state.sourceErrorMessage || state.statusMessage || '연도 데이터가 없습니다.';
      }

      if (!filteredRows.length) {
        const filterDescription = buildActiveFilterDescription();
        return filterDescription
          ? ('현재 필터 기준으로 표시할 데이터가 없습니다. (' + filterDescription + ')')
          : '현재 조건에 맞는 데이터가 없습니다.';
      }

      return '조건에 맞는 통계 데이터가 없습니다.';
    }

    function buildSummary(rows) {
      const summary = rows.reduce(function(result, row) {
        result.dateCount += 1;
        result.present += Number(row.present) || 0;
        result.official += Number(row.official) || 0;
        result.absent += Number(row.absent) || 0;
        result.male +=
          (Number(row.malePreschool) || 0) + (Number(row.maleElementary) || 0) +
          (Number(row.maleMiddle) || 0) + (Number(row.maleHigh) || 0) + (Number(row.maleOther) || 0);
        result.female +=
          (Number(row.femalePreschool) || 0) + (Number(row.femaleElementary) || 0) +
          (Number(row.femaleMiddle) || 0) + (Number(row.femaleHigh) || 0) + (Number(row.femaleOther) || 0);
        if (row.logExists) result.logCreatedDays += 1;
        if (row.logExists && row.applyStatus !== '반영완료') result.logIncompleteDays += 1;
        if (!row.logExists) result.logMissingDays += 1;
        return result;
      }, {
        dateCount: 0,
        present: 0,
        official: 0,
        absent: 0,
        male: 0,
        female: 0,
        logCreatedDays: 0,
        logIncompleteDays: 0,
        logMissingDays: 0
      });

      summary.totalRegistered = summary.present + summary.official + summary.absent;
      summary.attendanceRate = summary.totalRegistered ? Math.round((summary.present / summary.totalRegistered) * 1000) / 10 : 0;
      summary.absenceRate = summary.totalRegistered ? Math.round((summary.absent / summary.totalRegistered) * 1000) / 10 : 0;
      summary.officialRate = summary.totalRegistered ? Math.round((summary.official / summary.totalRegistered) * 1000) / 10 : 0;
      summary.genderTotal = summary.male + summary.female;
      summary.maleRate = summary.genderTotal ? Math.round((summary.male / summary.genderTotal) * 1000) / 10 : 0;
      summary.femaleRate = summary.genderTotal ? Math.round((summary.female / summary.genderTotal) * 1000) / 10 : 0;
      summary.avgPresent = summary.dateCount ? Math.round((summary.present / summary.dateCount) * 10) / 10 : 0;
      summary.avgAbsent = summary.dateCount ? Math.round((summary.absent / summary.dateCount) * 10) / 10 : 0;
      return summary;
    }

    function buildCountSummaryText(rows, summary) {
      const rowCount = rows.length || 0;
      const created = summary && typeof summary.logCreatedDays === 'number' ? summary.logCreatedDays : 0;
      const expected = summary && typeof summary.dateCount === 'number' ? summary.dateCount : 0;
      if (!expected) {
        return '집계: ' + rowCount + '건';
      }
      return '집계: ' + rowCount + '건 · 일지 ' + created + '/' + expected;
    }

    const OVERVIEW_HOLIDAY_MAP = {
      '2024': {
        '2024-01-01': '신정',
        '2024-02-09': '설날 연휴',
        '2024-02-10': '설날',
        '2024-02-11': '설날 연휴',
        '2024-02-12': '설날 대체공휴일',
        '2024-03-01': '삼일절',
        '2024-04-10': '제22대 국회의원선거',
        '2024-05-05': '어린이날',
        '2024-05-06': '어린이날 대체공휴일',
        '2024-05-15': '부처님오신날',
        '2024-06-06': '현충일',
        '2024-08-15': '광복절',
        '2024-09-16': '추석 연휴',
        '2024-09-17': '추석',
        '2024-09-18': '추석 연휴',
        '2024-10-03': '개천절',
        '2024-10-09': '한글날',
        '2024-12-25': '성탄절'
      },
      '2025': {
        '2025-01-01': '신정',
        '2025-01-27': '임시공휴일',
        '2025-01-28': '설날 연휴',
        '2025-01-29': '설날',
        '2025-01-30': '설날 연휴',
        '2025-03-01': '삼일절',
        '2025-03-03': '삼일절 대체공휴일',
        '2025-05-05': '어린이날·부처님오신날',
        '2025-05-06': '대체공휴일',
        '2025-06-03': '제21대 대통령선거',
        '2025-06-06': '현충일',
        '2025-08-15': '광복절',
        '2025-10-03': '개천절',
        '2025-10-05': '추석 연휴',
        '2025-10-06': '추석',
        '2025-10-07': '추석 연휴',
        '2025-10-08': '추석 대체공휴일',
        '2025-10-09': '한글날',
        '2025-12-25': '성탄절'
      },
      '2026': {
        '2026-01-01': '신정',
        '2026-02-16': '설날 연휴',
        '2026-02-17': '설날',
        '2026-02-18': '설날 연휴',
        '2026-03-01': '삼일절',
        '2026-03-02': '삼일절 대체공휴일',
        '2026-05-05': '어린이날',
        '2026-05-24': '부처님오신날',
        '2026-05-25': '부처님오신날 대체공휴일',
        '2026-06-06': '현충일',
        '2026-08-15': '광복절',
        '2026-08-17': '광복절 대체공휴일',
        '2026-09-24': '추석 연휴',
        '2026-09-25': '추석',
        '2026-09-26': '추석 연휴',
        '2026-10-03': '개천절',
        '2026-10-05': '개천절 대체공휴일',
        '2026-10-09': '한글날',
        '2026-12-25': '성탄절'
      }
    };

    function parseDateKeyLocal_(value) {
      if (!value) return null;
      const text = String(value).trim();
      const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return isNaN(date.getTime()) ? null : date;
    }

    function formatDateKeyLocal_(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) return '';
      return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
    }

    function getOverviewPeriodBounds_(rows) {
      const startInput = document.getElementById('filterStartDate');
      const endInput = document.getElementById('filterEndDate');
      const monthSelect = document.getElementById('monthSelect');
      const startDate = parseDateInputValue(startInput && startInput.value);
      const endDate = parseDateInputValue(endInput && endInput.value);

      if (startDate && endDate) {
        return { start: startDate, end: endDate };
      }

      const monthValue = monthSelect && monthSelect.value ? String(monthSelect.value).trim() : '';
      if (/^\d{4}-\d{2}$/.test(monthValue)) {
        const parts = monthValue.split('-');
        const year = Number(parts[0]);
        const monthIndex = Number(parts[1]) - 1;
        return {
          start: new Date(year, monthIndex, 1),
          end: new Date(year, monthIndex + 1, 0)
        };
      }

      const dates = (rows || []).map(function(row) {
        return parseDateKeyLocal_(row && row.date);
      }).filter(Boolean).sort(function(left, right) {
        return left.getTime() - right.getTime();
      });

      if (!dates.length) {
        return { start: null, end: null };
      }

      return {
        start: dates[0],
        end: dates[dates.length - 1]
      };
    }

    function getTodayLocalDate_() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function capOverviewBoundsToToday_(bounds) {
      if (!bounds || !bounds.start || !bounds.end) {
        return bounds || { start: null, end: null };
      }
      const selectedYear = Number(state.selectedYear || 0);
      const today = getTodayLocalDate_();
      if (selectedYear && selectedYear === today.getFullYear() && bounds.end.getTime() > today.getTime()) {
        return {
          start: bounds.start,
          end: today
        };
      }
      return bounds;
    }

    function buildHolidayEntriesForRange_(startDate, endDate) {
      if (!startDate || !endDate) return [];
      const holidayEntries = [];
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const yearMaps = OVERVIEW_HOLIDAY_MAP || {};
      while (current.getTime() <= endDate.getTime()) {
        const dateKey = formatDateKeyLocal_(current);
        const yearMap = yearMaps[String(current.getFullYear())] || {};
        if (yearMap[dateKey]) {
          holidayEntries.push({
            date: dateKey,
            label: yearMap[dateKey]
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return holidayEntries;
    }

    function buildOverviewSummary(rows, summary) {
      const dates = rows.map(function(row) { return String(row.date || ''); }).filter(Boolean).sort();
      const periodText = dates.length ? (dates[0] + ' ~ ' + dates[dates.length - 1]) : '-';
      const yearLabel = String(state.selectedYear || '');
      const monthKeyLookup = {};
      rows.forEach(function(row) {
        if (row && row.monthKey) monthKeyLookup[row.monthKey] = true;
      });
      const monthKeys = Object.keys(monthKeyLookup).sort();
      const monthLabel = monthKeys.length === 1
        ? (monthKeys[0] + ' 집계').replace('-', '년 ')
        : (yearLabel ? (yearLabel + '년 집계') : '집계');
      const bounds = capOverviewBoundsToToday_(getOverviewPeriodBounds_(rows));
      const holidayEntries = buildHolidayEntriesForRange_(bounds.start, bounds.end);
      const holidayLookup = {};
      holidayEntries.forEach(function(item) {
        holidayLookup[item.date] = item.label;
      });
      const rowByDate = {};
      rows.forEach(function(row) {
        const dateKey = String((row && row.date) || '').trim();
        if (dateKey) {
          rowByDate[dateKey] = row;
        }
      });

      let totalDays = 0;
      let weekendDays = 0;
      let operatingDays = 0;
      let logCreatedDays = 0;
      let logIncompleteDays = 0;
      const missingDates = [];
      const incompleteDates = [];
      if (bounds.start && bounds.end) {
        const cursor = new Date(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate());
        while (cursor.getTime() <= bounds.end.getTime()) {
          totalDays += 1;
          const dateKey = formatDateKeyLocal_(cursor);
          const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
          const isHoliday = !!holidayLookup[dateKey];
          if (isWeekend) {
            weekendDays += 1;
          }
          if (!isWeekend && !isHoliday) {
            operatingDays += 1;
            const matchedRow = rowByDate[dateKey];
            if (matchedRow && matchedRow.logExists) {
              logCreatedDays += 1;
              if (matchedRow.applyStatus !== '반영완료') {
                logIncompleteDays += 1;
                incompleteDates.push(dateKey);
              }
            } else {
              missingDates.push(dateKey);
            }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      const logMissingDays = Math.max(0, operatingDays - logCreatedDays);
      const calendarText = bounds.start && bounds.end
        ? ('전체 일수 <strong>' + totalDays + '일</strong> / 주말 <strong>' + weekendDays + '일</strong>')
        : '전체 일수 - / 주말 -';
      const holidayText = holidayEntries.length
        ? ('빨간날: <strong>' + holidayEntries.length + '일</strong> (' + holidayEntries.map(function(item) {
          return item.date + ' ' + item.label;
        }).join(', ') + ')')
        : '빨간날: 없음';

      return {
        periodText: periodText,
        monthLabel: monthLabel,
        calendarText: calendarText,
        holidayText: holidayText,
        holidayDays: holidayEntries.length,
        totalDays: totalDays,
        weekendDays: weekendDays,
        operatingDays: operatingDays,
        logCreatedDays: logCreatedDays,
        logMissingDays: logMissingDays,
        logIncompleteDays: logIncompleteDays,
        missingDates: missingDates,
        incompleteDates: incompleteDates,
        attendanceRate: summary.attendanceRate || 0,
        absenceRate: summary.absenceRate || 0,
        officialRate: summary.officialRate || 0,
        maleRate: summary.maleRate || 0,
        femaleRate: summary.femaleRate || 0,
        avgPresent: summary.avgPresent || 0,
        avgAbsent: summary.avgAbsent || 0,
        reportText: [
          '[' + monthLabel + ' 출석 결산]',
          '집계 기간: ' + periodText,
          '전체 일수: ' + totalDays + '일 / 주말: ' + weekendDays + '일 / 빨간날: ' + holidayEntries.length + '일',
          '기대 운영일수: ' + operatingDays + '일 / 운영일지 작성: ' + logCreatedDays + '일',
          '출석률: ' + (summary.attendanceRate || 0) + '% / 결석률: ' + (summary.absenceRate || 0) + '%',
          '남아: ' + (summary.male || 0) + '명 (' + (summary.maleRate || 0) + '%) / 여아: ' + (summary.female || 0) + '명 (' + (summary.femaleRate || 0) + '%)',
          '일평균 출석: ' + (summary.avgPresent || 0) + '명 / 결석: ' + (summary.avgAbsent || 0) + '명'
        ].join('\\n')
      };
    }

    function buildOperationalGapWarnings(summary) {
      const warnings = [];
      if (!summary) return warnings;
      if ((summary.logMissingDays || 0) > 0) {
        warnings.push({
          message: '운영일지 누락: 기대 운영일수 ' + (summary.operatingDays || 0) + '일 중 ' + (summary.logMissingDays || 0) + '일이 아직 생성되지 않았습니다.'
        });
      }
      if ((summary.logIncompleteDays || 0) > 0) {
        warnings.push({
          message: '운영일지 미완성: 생성된 일지 중 ' + (summary.logIncompleteDays || 0) + '일은 아직 반영완료 상태가 아닙니다.'
        });
      }
      return warnings;
    }

    function setElementText(id, text) {
      const element = document.getElementById(id);
      if (!element) return;
      element.textContent = text == null ? '' : String(text);
    }

    function setElementHtml(id, html) {
      const element = document.getElementById(id);
      if (!element) return;
      element.innerHTML = html == null ? '' : String(html);
    }

    function buildMissingDatesSummaryText(overview) {
      if (!overview) {
        return '누락일자를 불러오지 못했습니다.';
      }
      const lines = [];
      if (overview.missingDates && overview.missingDates.length) {
        lines.push('누락: ' + overview.missingDates.join(', '));
      } else {
        lines.push('누락: 없음');
      }
      if (overview.incompleteDates && overview.incompleteDates.length) {
        lines.push('미완성: ' + overview.incompleteDates.join(', '));
      } else {
        lines.push('미완성: 없음');
      }
      return lines.join('\\n');
    }

    function normalizeWarningEntries(rawWarnings) {
      return (rawWarnings || []).map(function(item) {
        if (!item) return null;
        if (typeof item === 'string') return { scope: '', message: item };
        const message = String(item.message || '').trim();
        if (!message) return null;
        return { scope: String(item.scope || '').trim(), message: message };
      }).filter(Boolean);
    }

    function getVisibleWarnings() {
      const typeFilters = getTypeFilters();
      return normalizeWarningEntries(state.warnings).filter(function(item) {
        if (!item.scope) return true;
        if (item.scope === 'attendance') return typeFilters.attendance;
        if (item.scope === 'education') return typeFilters.education;
        if (item.scope === 'annual') return typeFilters.annual;
        if (item.scope === 'program') return typeFilters.program;
        return true;
      });
    }

    function toggleOperatingManual() {
      const mode = document.getElementById('operatingMode').value;
      const manualInput = document.getElementById('operatingManualText');
      manualInput.disabled = mode !== 'manual';
    }

    function toggleOperatingModalManual() {
      const mode = document.getElementById('modalOperatingMode').value;
      const manualInput = document.getElementById('modalOperatingManualText');
      manualInput.disabled = mode !== 'manual';
    }

    function resetOperatingControls() {
      document.getElementById('operatingStartDate').value = '';
      document.getElementById('operatingEndDate').value = '';
      document.getElementById('operatingMode').value = '';
      document.getElementById('operatingManualText').value = '';
      toggleOperatingManual();
    }

    function syncOperatingModalFromHiddenControls() {
      document.getElementById('modalOperatingStartDate').value = document.getElementById('operatingStartDate').value || '';
      document.getElementById('modalOperatingEndDate').value = document.getElementById('operatingEndDate').value || '';
      document.getElementById('modalOperatingMode').value = document.getElementById('operatingMode').value || '';
      document.getElementById('modalOperatingManualText').value = document.getElementById('operatingManualText').value || '';
      toggleOperatingModalManual();
    }

    function syncHiddenOperatingControlsFromModal() {
      document.getElementById('operatingStartDate').value = document.getElementById('modalOperatingStartDate').value || '';
      document.getElementById('operatingEndDate').value = document.getElementById('modalOperatingEndDate').value || '';
      document.getElementById('operatingMode').value = document.getElementById('modalOperatingMode').value || '';
      document.getElementById('operatingManualText').value = document.getElementById('modalOperatingManualText').value || '';
      toggleOperatingManual();
    }

    function openOperatingModal() {
      if (!document.getElementById('operatingStartDate').value && !document.getElementById('operatingEndDate').value) {
        syncOperatingRangeFromFilters();
      }
      syncOperatingModalFromHiddenControls();
      document.getElementById('operatingModalBackdrop').classList.add('open');
      document.getElementById('operatingModal').classList.add('open');
    }

    function closeOperatingModal() {
      document.getElementById('operatingModalBackdrop').classList.remove('open');
      document.getElementById('operatingModal').classList.remove('open');
    }

    function resetOperatingModal() {
      document.getElementById('modalOperatingStartDate').value = '';
      document.getElementById('modalOperatingEndDate').value = '';
      document.getElementById('modalOperatingMode').value = '';
      document.getElementById('modalOperatingManualText').value = '';
      toggleOperatingModalManual();
    }

    function applyOperatingModal() {
      const startDate = document.getElementById('modalOperatingStartDate').value || '';
      const endDate = document.getElementById('modalOperatingEndDate').value || '';
      const mode = document.getElementById('modalOperatingMode').value || '';
      const manualText = document.getElementById('modalOperatingManualText').value || '';

      if (!startDate || !endDate) {
        setStatus('운영 시작일과 종료일을 입력해 주세요.');
        return;
      }
      if (!mode) {
        setStatus('운영시간 유형을 선택해 주세요.');
        return;
      }
      if (mode === 'manual' && !String(manualText || '').trim()) {
        setStatus('수동 입력 내용을 입력해 주세요.');
        return;
      }

      syncHiddenOperatingControlsFromModal();
      setStatus('운영시간을 일괄 적용하는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          closeOperatingModal();
          const summaryText = '운영시간 적용 완료: ' + result.appliedCount + '일' +
            (result && result.skippedCount ? ' / 무시 ' + result.skippedCount + '일' : '') +
            (result && result.sheetName ? ' / ' + result.sheetName : '') +
            (result && result.firstAppliedA1Notation ? ' / ' + result.firstAppliedA1Notation : '');
          setStatus(summaryText);
          if (result && result.firstAppliedDate) {
            google.script.run
              .withSuccessHandler(function(openResult) {
                if (openResult && openResult.sheetName) {
                  setStatus(summaryText + ' / 확인 위치: ' + openResult.sheetName + ' ' + (openResult.a1Notation || ''));
                }
              })
                .withFailureHandler(function() {
                  // 이동 실패는 적용 실패보다 덜 중요하므로 상태를 덮지 않습니다.
                })
                .openLogDataRowForDate(state.selectedYear, result.firstAppliedDate, 'OPERATING_HOURS');
            }
          })
        .withFailureHandler(function(error) {
          setStatus('운영시간 적용 실패: ' + error.message);
        })
        .applyOperatingHoursToLogDataByRange(state.selectedYear, startDate, endDate, mode, manualText);
    }

    function updateData(nextData) {
      state = nextData || {};
      state.lastLoadError = '';
      activeDetailDate = '';
      previewState = { key: '', data: null };
      state.activePreset = state.activePreset || '';
      safeRender();
    }

    function getOperationRequestOptions() {
      return {
        attendance: document.getElementById('typeAttendance').checked,
        education: document.getElementById('typeEducation').checked,
        annual: document.getElementById('typeAnnual').checked,
        program: document.getElementById('typeProgram').checked
      };
    }

    function getOperationDateRange() {
      return {
        start: document.getElementById('operatingStartDate').value || '',
        end: document.getElementById('operatingEndDate').value || ''
      };
    }

    function getOperationRequestDates() {
      const selectedDates = getSelectedDates();
      if (selectedDates.length) return selectedDates.slice().sort();
      return getFilteredRows().map(function(row) { return row.date; }).filter(Boolean).sort();
    }

    function buildPreviewRequestKey() {
      const options = getOperationRequestOptions();
      const operatingRange = getOperationDateRange();
      const operatingMode = document.getElementById('operatingMode').value || '';
      const operatingManualText = document.getElementById('operatingManualText').value || '';
      return JSON.stringify({
        year: state.selectedYear,
        dates: getOperationRequestDates(),
        options: options,
        operatingMode: operatingMode,
        operatingManualText: operatingManualText,
        operatingStartDate: operatingRange.start,
        operatingEndDate: operatingRange.end
      });
    }

    function renderPreviewPanel() {
      const previewCard = document.getElementById('previewCard');
      const previewRows = document.getElementById('previewRows');
      const previewSummary = document.getElementById('previewSummary');
      const previewMeta = document.getElementById('previewMeta');
      if (!previewState.data || previewState.key !== buildPreviewRequestKey()) {
        previewCard.classList.remove('active');
        previewSummary.innerHTML = '';
        previewMeta.textContent = '미리보기를 실행하면 이곳에 요약이 표시됩니다.';
        previewRows.innerHTML = '<tr><td colspan="11" class="empty">미리보기를 실행해주세요.</td></tr>';
        return;
      }
      const data = previewState.data;
      const rows = data.rows || [];
      previewCard.classList.add('active');
        previewSummary.innerHTML = [
          '<div class="pill">대상 날짜: ' + esc(data.dateCount || 0) + '건</div>',
          ((data.skippedWeekendCount || 0) ? '<div class="pill">주말 제외: ' + esc(data.skippedWeekendCount) + '건</div>' : ''),
          '<div class="pill">출석 반영: ' + esc(data.options && data.options.attendance ? '예' : '아니오') + '</div>',
          '<div class="pill">교육 반영: ' + esc(data.options && data.options.education ? '예' : '아니오') + '</div>',
          '<div class="pill">연차 반영: ' + esc(data.options && data.options.annual ? '예' : '아니오') + '</div>',
          '<div class="pill">프로그램 반영: ' + esc(data.options && data.options.program ? '예' : '아니오') + '</div>'
        ].filter(Boolean).join('');
      previewMeta.textContent = data.operatingHours
        ? '운영시간 적용: ' + data.operatingHours
        : '운영시간은 변경하지 않습니다.';
      if (!rows.length) {
        previewRows.innerHTML = '<tr><td colspan="11" class="empty">미리볼 반영 대상이 없습니다.</td></tr>';
        return;
      }
      previewRows.innerHTML = rows.map(function(row) {
        return [
          '<tr>',
          '<td>' + esc(row.date) + '</td>',
          '<td>' + esc(row.actions || '-') + '</td>',
          '<td>' + esc(row.attendanceCurrent || 0) + '</td>',
          '<td>' + esc(row.attendancePresent || 0) + '</td>',
          '<td>' + esc(row.attendanceOfficial || 0) + '</td>',
          '<td>' + esc(row.attendanceAbsent || 0) + '</td>',
          '<td>' + esc(row.operatingHours || '-') + '</td>',
          '<td>' + esc(row.manager || '-') + '</td>',
          '<td>' + esc(row.staffWorker || '-') + '</td>',
          '<td class="text-left">' + esc(row.staffChanges || '-') + '</td>',
          '<td class="text-left">' + [
            row.work1 ? '<span class="preview-line">' + esc(row.work1) + '</span>' : '',
            row.programTitle ? '<span class="preview-line preview-program">프로그램: ' + esc(row.programTitle) + '</span>' : ''
          ].filter(Boolean).join('') + ((row.work1 || row.programTitle) ? '' : '-') + '</td>',
          '</tr>'
        ].join('');
      }).join('');
    }

    function safeRender() {
      try {
        render();
        if (state.statusMessage) setStatus(state.statusMessage);
        else setStatus('');
      } catch (error) {
        setStatus('화면 렌더링 실패: ' + error.message);
      const tbody = document.getElementById('rows');
      if (tbody) tbody.innerHTML = '<tr><td colspan="17" class="empty">화면 렌더링 실패: ' + esc(error.message) + '</td></tr>';
      }
    }

    function render() {
      renderYearOptions();
      renderMonthOptions();
      toggleOperatingManual();
      updatePreviewCollapseState();
      updateStudentPanelCollapseState();

      const rows = getFilteredRows();
      const summary = buildSummary(rows);
      const warningList = document.getElementById('warningList');
      setElementText('buildSummary', '버전: ' + (state.buildVersion || '-'));
      setElementText('periodSummary', getActivePeriodSummary());
      setElementText('countSummary', buildCountSummaryText(rows, summary));
      setElementText('summaryDateCount', summary.dateCount || 0);
      setElementText('summaryPresent', summary.present || 0);
      setElementText('summaryOfficial', summary.official || 0);
      setElementText('summaryAbsent', summary.absent || 0);
      setElementText('summaryMale', summary.male || 0);
      setElementText('summaryFemale', summary.female || 0);
      try {
        const overview = buildOverviewSummary(rows, summary);
        setElementHtml('overviewPeriodLine', '집계 기간: <strong>' + esc(overview.periodText) + '</strong>');
        setElementHtml('overviewCalendarLine', overview.calendarText);
        setElementHtml('overviewHolidayLine', overview.holidayText);
        setElementHtml('overviewOperatingLine', '기대 운영일수: <strong>' + esc(String(overview.operatingDays)) + '일</strong>');
        setElementHtml('overviewLogLine', '운영일지 작성: <strong>' + esc(String(overview.logCreatedDays)) + '일</strong>');
        setElementHtml('overviewGapLine', '누락 <strong>' + esc(String(overview.logMissingDays)) + '일</strong> / 미완성 <strong>' + esc(String(overview.logIncompleteDays)) + '일</strong>');
        setElementHtml('overviewAttendanceRateLine', '출석률: <strong>' + esc(String(overview.attendanceRate)) + '%</strong> / 공결 ' + esc(String(overview.officialRate)) + '%');
        setElementHtml('overviewAbsenceRateLine', '결석률: <strong>' + esc(String(overview.absenceRate)) + '%</strong>');
        setElementHtml('overviewGenderLine', '남아 ' + esc(String(overview.maleRate)) + '% / 여아 ' + esc(String(overview.femaleRate)) + '%');
        setElementHtml('overviewAverageLine', '일평균 출석 <strong>' + esc(String(overview.avgPresent)) + '명</strong> / 결석 ' + esc(String(overview.avgAbsent)) + '명');
        setElementText('overviewReportText', buildMissingDatesSummaryText(overview));
      } catch (overviewError) {
        setElementText('overviewReportText', '누락일자를 불러오지 못했습니다: ' + overviewError.message);
      }
      const annualLeaveSourceUrl = document.getElementById('annualLeaveSourceUrl');
      if (annualLeaveSourceUrl) {
        annualLeaveSourceUrl.value = state.annualLeaveSourceUrl || '';
      }
      const visibleWarnings = getVisibleWarnings().concat(buildOperationalGapWarnings(summary));
      if (warningList) {
        warningList.innerHTML = visibleWarnings.map(function(item) {
          return '<div class="pill warning">' + esc(item.message) + '</div>';
        }).join('');
      }
      updateChipDataStatus();
      updateFilterActivePills();
      syncModalChips();
      updateSelectionSummary();
      renderPreviewPanel();

        const tbody = document.getElementById('rows');
        if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="21" class="empty">' + esc(buildRowsEmptyMessage(rows)) + '</td></tr>';
          renderDetail([]);
          return;
        }

      tbody.innerHTML = rows.map(function(row) {
        const statusClass = row.applyStatus === '반영완료' ? 'ok'
          : (row.applyStatus === '확인필요' ? 'review' : 'pending');
          return [
            '<tr class="selectable-row" data-date="' + row.date + '">',
            '<td><input type="checkbox" class="row-check" data-date="' + row.date + '"></td>',
            '<td>' + esc(formatKoreanDateLabel_(row.date)) + '</td>',
            '<td class="operating-hours-cell">' + esc(row.operatingHours || '-') + '</td>',
            '<td>' + esc(row.manager || '-') + '</td>',
            '<td>' + esc(row.attendanceCapacity || 0) + '</td>',
            '<td>' + esc(row.attendanceCurrent || 0) + '</td>',
            '<td>' + esc(row.mealBreakfast || 0) + '</td>',
            '<td>' + esc(row.mealLunch || 0) + '</td>',
            '<td>' + esc(row.mealDinner || 0) + '</td>',
            '<td>' + row.present + '</td>',
            '<td>' + row.absent + '</td>',
            '<td>' + row.official + '</td>',
            '<td>' + (row.educationCount || 0) + '</td>',
            '<td>' + (row.annualLeaveCount || 0) + '</td>',
            '<td class="program-cell ' + ((row.programCount || 0) ? (row.programLinked ? 'ok' : 'pending') : '') + '" title="' + esc(row.programPreview || '') + '">' +
            ((row.programCount || 0) ? ((row.programCount || 0) + (row.programLinked ? '✓' : '!')) : '0') +
          '</td>',
          '<td>' + toSafeInt_(row.unmatched) + '</td>',
          '<td>' + toSafeInt_(row.staffWorker) + '</td>',
          '<td>' + toSafeInt_(row.staffTeacher) + '</td>',
          '<td>' + toSafeInt_(row.staffPublic) + '</td>',
          '<td>' + toSafeInt_(row.staffOther) + '</td>',
          '<td><span class="badge ' + statusClass + '">' + esc(row.applyStatus || '미반영') + '</span></td>',
          '<td><div class="review-note" title="' + esc(row.reviewReason || '-') + '">' + esc(row.reviewReason || '-') + '</div></td>',
          '</tr>'
        ].join('');
      }).join('');

      document.querySelectorAll('.row-check').forEach(function(checkbox) {
        checkbox.addEventListener('click', function(e) { e.stopPropagation(); });
        checkbox.addEventListener('change', updateSelectionSummary);
      });

      document.querySelectorAll('.selectable-row').forEach(function(row) {
        row.addEventListener('click', function(event) {
          activeDetailDate = row.getAttribute('data-date') || '';
          highlightActiveRow();
          renderDetail(getFilteredRows());
        });
      });

      const hasActiveDetailDate = rows.some(function(row) { return row.date === activeDetailDate; });
      if (!hasActiveDetailDate) activeDetailDate = rows[0].date;
      highlightActiveRow();
      renderDetail(getFilteredRows());
    }

    function esc(value) {
      return value == null ? '' : String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toSafeInt_(value) {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function getSelectedDates() {
      return Array.from(document.querySelectorAll('.row-check:checked')).map(function(checkbox) {
        return checkbox.getAttribute('data-date');
      });
    }

    function getDetailTargetRows() { return getFilteredRows(); }

    function updateSelectionSummary() {
      const selectedCount = getSelectedDates().length;
      document.getElementById('selectionSummary').textContent = '선택: ' + selectedCount + '건';
      const actionBar = document.getElementById('selectionActionBar');
      const actionTitle = document.getElementById('selectionActionTitle');
      if (actionBar && actionTitle) {
        actionBar.classList.toggle('active', selectedCount > 0);
        actionTitle.textContent = '선택한 날짜 ' + selectedCount + '건';
      }
      renderPreviewPanel();
    }

    function highlightActiveRow() {
      document.querySelectorAll('.selectable-row').forEach(function(row) {
        row.classList.toggle('active-row', row.getAttribute('data-date') === activeDetailDate);
      });
    }

    function renderDetail(rows) {
      const detailTitle = document.getElementById('detailTitle');
      const detailSubtitle = document.getElementById('detailSubtitle');
      const detailMeta = document.getElementById('detailMeta');
      const tbody = document.getElementById('detailRows');
      state.detailsByRange = state.detailsByRange || {};
      const filteredRows = rows || [];
      const dateKeys = uniqueStringsClient(filteredRows.map(function(row) { return row.date; }).filter(Boolean)).sort();
      const rangeKey = dateKeys.join('|');
      const rangeRows = rangeKey ? (state.detailsByRange[rangeKey] || []) : [];

      if (!dateKeys.length) {
        detailTitle.textContent = '선택 기간 아동 목록';
        detailSubtitle.textContent = '현재 필터에서 표시할 아동 기록이 없습니다.';
        if (detailMeta) { detailMeta.style.display = 'none'; detailMeta.innerHTML = ''; }
        tbody.innerHTML = '<tr><td colspan="8" class="empty">선택된 날짜가 없습니다.</td></tr>';
        activeStudentKey = '';
        renderStudentSummary(null);
        return;
      }

      const firstDate = dateKeys[0];
      const lastDate = dateKeys[dateKeys.length - 1];
      detailTitle.textContent = dateKeys.length === 1 ? firstDate + ' 아동 목록' : firstDate + ' ~ ' + lastDate + ' 아동 목록';
      detailSubtitle.textContent = '현재 선택된 기간 기준 아동별 출석/공결/결석 집계입니다.';

      if (detailMeta) {
        const detailDateKey = activeDetailDate || firstDate;
        const detailInfo = (state.detailsByDate && state.detailsByDate[detailDateKey]) || {};
        const programItems = Array.isArray(detailInfo.programTexts) ? detailInfo.programTexts : [];
        const metaRows = [];
        if (programItems.length) {
          metaRows.push(
            '<div class="detail-meta-row"><span class="detail-meta-label">프로그램</span>' +
            programItems.map(function(item) {
              const title = esc(item.title || item.rawText || '');
              const participants = esc(item.participants || '');
              return title + (participants ? ' - ' + participants : '');
            }).join('<br>') + '</div>'
          );
        }
        if (detailInfo.annualLeaveText) {
          metaRows.push('<div class="detail-meta-row"><span class="detail-meta-label">연차</span>' + esc(detailInfo.annualLeaveText) + '</div>');
        }
        if (detailInfo.educationOfflineText || detailInfo.educationOnlineText) {
          const educationParts = [];
          if (detailInfo.educationOfflineText) educationParts.push('집합: ' + esc(detailInfo.educationOfflineText));
          if (detailInfo.educationOnlineText) educationParts.push('온라인: ' + esc(detailInfo.educationOnlineText));
          metaRows.push('<div class="detail-meta-row"><span class="detail-meta-label">교육</span>' + educationParts.join('<br>') + '</div>');
        }
        detailMeta.innerHTML = metaRows.join('');
        detailMeta.style.display = metaRows.length ? 'block' : 'none';
      }

      if (!state.detailsByRange[rangeKey]) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty">상세 기록을 불러오는 중입니다.</td></tr>';
        google.script.run
          .withSuccessHandler(function(result) {
            state.detailsByRange[rangeKey] = result || [];
            renderDetail(filteredRows);
          })
          .withFailureHandler(function(error) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty">상세 불러오기 실패: ' + esc(error.message) + '</td></tr>';
          })
          .getAttendanceDetailRowsByYearAndDates(state.selectedYear, dateKeys);
        return;
      }

      if (!rangeRows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty">선택한 날짜의 상세 기록이 없습니다.</td></tr>';
        activeStudentKey = '';
        renderStudentSummary(null);
        return;
      }

      tbody.innerHTML = rangeRows.map(function(row) {
        return [
          '<tr>',
          '<td><button class="name-button student-link" data-name="' + escAttr(row.name) + '" data-school="' + escAttr(row.school) + '">' + esc(row.name) + '</button></td>',
          '<td>' + esc(row.school) + '</td>',
          '<td>' + esc(row.gender || '-') + '</td>',
          '<td>' + esc(row.schoolLevel || '-') + '</td>',
          '<td>' + esc(row.present || 0) + '</td>',
          '<td>' + esc(row.official || 0) + '</td>',
          '<td>' + esc(row.absent || 0) + '</td>',
          '<td><span class="match-badge ' + (row.matched ? 'ok' : 'bad') + '">' + (row.matched ? '매칭' : '미매칭') + '</span></td>',
          '</tr>'
        ].join('');
      }).join('');

      document.querySelectorAll('.student-link').forEach(function(button) {
        button.addEventListener('click', function(event) {
          event.stopPropagation();
          openStudentSummary(button.getAttribute('data-name') || '', button.getAttribute('data-school') || '');
        });
      });

      const hasActiveStudent = rangeRows.some(function(row) {
        return buildStudentKey(row.name, row.school) === activeStudentKey;
      });
      if (hasActiveStudent) {
        const activeRow = rangeRows.find(function(row) { return buildStudentKey(row.name, row.school) === activeStudentKey; });
        if (activeRow) openStudentSummary(activeRow.name, activeRow.school);
      } else {
        activeStudentKey = '';
        renderStudentSummary(null);
      }
    }

    function buildStudentKey(name, school) { return String(name || '') + '|' + String(school || ''); }

    function renderStudentSummary(data) {
      const title = document.getElementById('studentTitle');
      const subtitle = document.getElementById('studentSubtitle');
      const meta = document.getElementById('studentMeta');
      const rowsBody = document.getElementById('studentRows');
      if (!data || !data.profile || !data.profile.name) {
        title.textContent = '학생 이력';
        subtitle.textContent = '상세 기록에서 이름을 누르면 연월별 출석 이력이 표시됩니다.';
        meta.innerHTML = '';
        document.getElementById('studentTotalDays').textContent = '0';
        document.getElementById('studentPresent').textContent = '0';
        document.getElementById('studentAttendanceRate').textContent = '0%';
        document.getElementById('studentOfficial').textContent = '0';
        document.getElementById('studentAbsent').textContent = '0';
        document.getElementById('studentAlternative').textContent = '0';
        document.getElementById('studentOther').textContent = '0';
        document.getElementById('studentLastAbsent').textContent = '-';
        document.getElementById('studentRecentRows').innerHTML = '<tr><td colspan="4" class="empty">선택된 학생이 없습니다.</td></tr>';
        rowsBody.innerHTML = '<tr><td colspan="8" class="empty">선택된 학생이 없습니다.</td></tr>';
        return;
      }
      title.textContent = data.profile.name + ' 이력';
      subtitle.textContent = state.selectedYear + '년 월별 출석/공결/결석 집계입니다.';
      meta.innerHTML = [
        '<div class="pill">소속: ' + esc(data.profile.school || '-') + '</div>',
        '<div class="pill">성별: ' + esc(data.profile.gender || '-') + '</div>',
        '<div class="pill">학교급: ' + esc(data.profile.schoolLevel || '-') + '</div>'
      ].join('');
      document.getElementById('studentTotalDays').textContent = String((data.summary && data.summary.totalDays) || 0);
      document.getElementById('studentPresent').textContent = String((data.summary && data.summary.present) || 0);
      document.getElementById('studentAttendanceRate').textContent = String((data.summary && data.summary.attendanceRate) || 0) + '%';
      document.getElementById('studentOfficial').textContent = String((data.summary && data.summary.official) || 0);
      document.getElementById('studentAbsent').textContent = String((data.summary && data.summary.absent) || 0);
      document.getElementById('studentAlternative').textContent = String((data.summary && data.summary.alternative) || 0);
      document.getElementById('studentOther').textContent = String((data.summary && data.summary.other) || 0);
      document.getElementById('studentLastAbsent').textContent = (data.summary && data.summary.lastAbsentDate) || '-';
      const recentRows = data.recentLogs || [];
      const recentBody = document.getElementById('studentRecentRows');
      if (!recentRows.length) {
        recentBody.innerHTML = '<tr><td colspan="4" class="empty">최근 기록이 없습니다.</td></tr>';
      } else {
        recentBody.innerHTML = recentRows.map(function(row) {
          return ['<tr>', '<td>' + esc(row.date || '-') + '</td>', '<td>' + esc(row.status || '-') + '</td>',
            '<td>' + esc(row.checkIn || '-') + '</td>', '<td>' + esc(row.checkOut || '-') + '</td>', '</tr>'].join('');
        }).join('');
      }
      const rows = data.rows || [];
      if (!rows.length) {
        rowsBody.innerHTML = '<tr><td colspan="8" class="empty">해당 학생의 월별 기록이 없습니다.</td></tr>';
        return;
      }
      rowsBody.innerHTML = rows.map(function(row) {
        return ['<tr>', '<td>' + esc(row.yearMonth) + '</td>', '<td>' + esc(row.totalDays) + '</td>',
          '<td>' + esc(row.present) + '</td>', '<td>' + esc(row.attendanceRate) + '%</td>',
          '<td>' + esc(row.official) + '</td>', '<td>' + esc(row.alternative) + '</td>',
          '<td>' + esc(row.absent) + '</td>', '<td>' + esc(row.other) + '</td>', '</tr>'].join('');
      }).join('');
    }

    function buildStudentSummaryFromIndex(studentData, selectedDates) {
      if (!studentData || !studentData.profile) return null;
      const logs = studentData.logs || [];
      const selectedLookup = {};
      (selectedDates || []).forEach(function(date) { selectedLookup[date] = true; });
      const scopedLogs = logs.filter(function(log) { return !selectedDates.length || !!selectedLookup[log.date]; });
      const summary = { totalDays: 0, present: 0, official: 0, alternative: 0, absent: 0, other: 0, lastAbsentDate: '', attendanceRate: 0 };
      const monthBuckets = {};
      scopedLogs.forEach(function(log) {
        const yearMonth = String(log.date || '').slice(0, 7);
        if (!yearMonth) return;
        if (!monthBuckets[yearMonth]) {
          monthBuckets[yearMonth] = { yearMonth: yearMonth, totalDays: 0, present: 0, official: 0, alternative: 0, absent: 0, other: 0, attendanceRate: 0 };
        }
        const bucket = monthBuckets[yearMonth];
        bucket.totalDays += 1; summary.totalDays += 1;
        if (log.status === '출석') { bucket.present += 1; summary.present += 1; }
        else if (log.status === '공결') { bucket.official += 1; summary.official += 1; }
        else if (log.status === '대체출석') { bucket.alternative += 1; summary.alternative += 1; }
        else if (log.status === '결석') {
          bucket.absent += 1; summary.absent += 1;
          if (!summary.lastAbsentDate || log.date > summary.lastAbsentDate) summary.lastAbsentDate = log.date;
        } else { bucket.other += 1; summary.other += 1; }
      });
      summary.attendanceRate = summary.totalDays ? Math.round((summary.present / summary.totalDays) * 1000) / 10 : 0;
      const rows = Object.keys(monthBuckets).sort().map(function(key) {
        const bucket = monthBuckets[key];
        bucket.attendanceRate = bucket.totalDays ? Math.round((bucket.present / bucket.totalDays) * 1000) / 10 : 0;
        return bucket;
      });
      const recentLogs = scopedLogs.slice().sort(function(l, r) { return l.date < r.date ? 1 : -1; }).slice(0, 5);
      return { profile: studentData.profile, summary: summary, rows: rows, recentLogs: recentLogs };
    }

    function openStudentSummary(name, school) {
      const studentKey = buildStudentKey(name, school);
      const selectedDates = getFilteredRows().map(function(row) { return row.date; }).sort();
      const scopedStudentKey = studentKey + '|' + selectedDates.join('|');
      activeStudentKey = studentKey;
      state.studentSummaries = state.studentSummaries || {};
      const cached = state.studentSummaries[scopedStudentKey];
      if (cached) { renderStudentSummary(cached); return; }
      state.studentIndex = state.studentIndex || null;
      renderStudentSummary({
        profile: { name: name, school: school, gender: '', schoolLevel: '' },
        summary: { totalDays: 0, present: 0, attendanceRate: 0, official: 0, alternative: 0, absent: 0, other: 0, lastAbsentDate: '' },
        rows: [], recentLogs: []
      });
      document.getElementById('studentSubtitle').textContent = '학생 이력을 불러오는 중입니다.';
      const renderFromIndex = function(index) {
        const studentData = index ? index[studentKey] : null;
        const scopedSummary = buildStudentSummaryFromIndex(studentData, selectedDates);
        state.studentSummaries[scopedStudentKey] = scopedSummary;
        if (activeStudentKey === studentKey) renderStudentSummary(scopedSummary);
      };
      if (state.studentIndex) { renderFromIndex(state.studentIndex); return; }
      google.script.run
        .withSuccessHandler(function(result) { state.studentIndex = result || {}; renderFromIndex(state.studentIndex); })
        .withFailureHandler(function(error) {
          if (activeStudentKey === studentKey) {
            document.getElementById('studentSubtitle').textContent = '학생 이력 불러오기 실패: ' + error.message;
          }
        })
        .getAttendanceStudentIndexByYear(state.selectedYear);
    }

    function setAll(checked) {
      document.querySelectorAll('.row-check').forEach(function(checkbox) { checkbox.checked = checked; });
      updateSelectionSummary();
    }

      function toggleAll() {
        const all = Array.from(document.querySelectorAll('.row-check'));
        const shouldCheck = all.some(function(checkbox) { return !checkbox.checked; });
        all.forEach(function(checkbox) { checkbox.checked = shouldCheck; });
        document.getElementById('checkAll').checked = shouldCheck;
        updateSelectionSummary();
      }

      function resolveEditTargetDate() {
        const dates = getSelectedDates();
        if (!dates.length) {
          return '';
        }
        if (dates.length === 1) {
          return dates[0];
        }
        if (activeDetailDate && dates.indexOf(activeDetailDate) !== -1) {
          return activeDetailDate;
        }
        return '';
      }

      function editSelectedLogData() {
        const dates = getSelectedDates();
        if (!dates.length) {
          setStatus('수정할 날짜가 없습니다.');
          return;
        }
        const targetDate = resolveEditTargetDate();
        if (!targetDate) {
          setStatus('수정할 날짜 1건만 선택하거나, 행 하나를 눌러 기준 날짜를 정해주세요.');
          return;
        }
        setActionBusy('actionEditSelectedLog', '이동 중...');
        setStatus(targetDate + ' 운영일지로 이동하는 중...');
        google.script.run
          .withSuccessHandler(function(result) {
            clearActionBusy();
            setStatus((result && result.sheetName ? result.sheetName : '일지데이터') + ' ' + (result && result.a1Notation ? result.a1Notation : '') + '로 이동했습니다.');
            if (google && google.script && google.script.host && typeof google.script.host.close === 'function') {
              google.script.host.close();
            }
          })
          .withFailureHandler(function(error) {
            clearActionBusy();
            setStatus('데이터 수정 위치 이동 실패: ' + (error && error.message ? error.message : '알 수 없는 오류'));
          })
          .openLogDataRowForDate(state.selectedYear, targetDate);
      }

      function deleteSelectedLogData() {
        const dates = getSelectedDates();
        if (!dates.length) {
          setStatus('삭제할 날짜가 없습니다.');
          return;
        }
        const message = '선택한 날짜 ' + dates.length + '건의 일지데이터를 삭제할까요?\n삭제된 데이터는 통계보기에서 다시 날짜 일지 작성을 해야 복구됩니다.';
        if (!window.confirm(message)) {
          setStatus('삭제를 취소했습니다.');
          return;
        }
        setActionBusy('actionDeleteSelectedLog', '삭제 중...');
        setStatus('선택 날짜 데이터를 삭제하는 중...');
        google.script.run
          .withSuccessHandler(function(result) {
            clearActionBusy();
            const missingCount = result && result.missingDates ? result.missingDates.length : 0;
            setStatus('선택 날짜 데이터 삭제 완료: ' + ((result && result.deletedCount) || 0) + '건' +
              (missingCount ? ' / 이미 없음 ' + missingCount + '건' : ''));
            changeYear(state.selectedYear);
          })
          .withFailureHandler(function(error) {
            clearActionBusy();
            setStatus('선택 날짜 데이터 삭제 실패: ' + (error && error.message ? error.message : '알 수 없는 오류'));
          })
          .deleteLogDataRowsByDates(state.selectedYear, dates);
      }

      function applySelected() {
        const dates = getOperationRequestDates();
        if (!dates.length) { setStatus('선택한 날짜가 없습니다.'); return; }
        setActionBusy('actionApplySelected', '작성 중...');
      setStatus('선택 날짜를 반영하는 중...');
      const operatingMode = document.getElementById('operatingMode').value || '';
      const operatingManualText = document.getElementById('operatingManualText').value || '';
      const options = getOperationRequestOptions();
      const operatingRange = getOperationDateRange();
      google.script.run
          .withSuccessHandler(function(result) {
            clearActionBusy();
            setStatus('일지 작성 완료: ' + result.appliedCount + '건' +
              ((result.skippedWeekendCount || 0) ? ' / 주말 제외 ' + result.skippedWeekendCount + '건' : '') +
              (result.operatingHours ? ' / ' + result.operatingHours : '') +
              ' / 출석 ' + result.attendanceAppliedCount +
            ' / 연차 ' + result.annualAppliedCount +
            ' / 교육 ' + result.educationAppliedCount +
            ' / 프로그램 ' + result.programAppliedCount);
          changeYear(state.selectedYear);
        })
        .withFailureHandler(function(error) { clearActionBusy(); setStatus('일지 작성 실패: ' + error.message); })
        .applyIntegratedStatsToLogDataByDates(dates, state.selectedYear, operatingMode, operatingManualText, options, operatingRange.start, operatingRange.end);
    }

    function applyAll() {
      const allDates = getOperationRequestDates();
      if (!allDates.length) { setStatus('반영할 통계 데이터가 없습니다.'); return; }
      setStatus('전체 날짜를 반영하는 중...');
      const operatingMode = document.getElementById('operatingMode').value || '';
      const operatingManualText = document.getElementById('operatingManualText').value || '';
      const options = getOperationRequestOptions();
      const operatingRange = getOperationDateRange();
        google.script.run
          .withSuccessHandler(function(result) {
            setStatus('전체 날짜 일지 작성 완료: ' + result.appliedCount + '건' +
              ((result.skippedWeekendCount || 0) ? ' / 주말 제외 ' + result.skippedWeekendCount + '건' : '') +
              (result.operatingHours ? ' / ' + result.operatingHours : '') +
              ' / 출석 ' + result.attendanceAppliedCount +
            ' / 연차 ' + result.annualAppliedCount +
            ' / 교육 ' + result.educationAppliedCount +
            ' / 프로그램 ' + result.programAppliedCount);
          changeYear(state.selectedYear);
        })
        .withFailureHandler(function(error) { setStatus('전체 날짜 일지 작성 실패: ' + error.message); })
        .applyIntegratedStatsToLogDataByDates(allDates, state.selectedYear, operatingMode, operatingManualText, options, operatingRange.start, operatingRange.end);
    }

    function previewApply() {
      const dates = getOperationRequestDates();
      if (!dates.length) { setStatus('미리볼 날짜가 없습니다.'); return; }
      setActionBusy('actionPreviewApply', '준비 중...');
      const operatingMode = document.getElementById('operatingMode').value || '';
      const operatingManualText = document.getElementById('operatingManualText').value || '';
      const options = getOperationRequestOptions();
      const operatingRange = getOperationDateRange();
      const requestKey = buildPreviewRequestKey();
      setStatus('반영 전 미리보기를 준비하는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          clearActionBusy();
          previewState = { key: requestKey, data: result || null };
          renderPreviewPanel();
          setStatus('미리보기 준비 완료');
        })
        .withFailureHandler(function(error) {
          clearActionBusy();
          previewState = { key: '', data: null };
          renderPreviewPanel();
          setStatus('미리보기 실패: ' + error.message);
        })
        .previewIntegratedStatsToLogDataByDates(dates, state.selectedYear, operatingMode, operatingManualText, options, operatingRange.start, operatingRange.end);
    }

    function previewLogDocuments(autoPrint) {
      const dates = getOperationRequestDates();
      if (!dates.length) { setStatus(autoPrint ? '인쇄할 날짜가 없습니다.' : '미리보기할 날짜가 없습니다.'); return; }
      setActionBusy('actionPrintLogs', autoPrint ? '창 여는 중...' : '준비 중...');
      setStatus(autoPrint ? '운영일지 인쇄를 준비하는 중...' : '운영일지 미리보기를 준비하는 중...');
      google.script.run
        .withSuccessHandler(function() {
          clearActionBusy();
          setStatus(autoPrint ? '운영일지 인쇄 창을 열었습니다.' : '운영일지 미리보기가 열렸습니다.');
        })
        .withFailureHandler(function(error) {
          clearActionBusy();
          setStatus((autoPrint ? '인쇄' : '미리보기') + ' 실패: ' + error.message);
        })
        .previewLogsByDates(dates, state.selectedYear, !!autoPrint);
    }

    function openLoadingPopupWindow() {
      const popup = window.open('', '_blank');
      if (!popup) return null;
      try {
        popup.document.open();
        popup.document.write(['<!DOCTYPE html><html><head><meta charset="utf-8"><title>편집용 템플릿 준비 중</title>',
          '<style>body{font-family:"Malgun Gothic",sans-serif;margin:0;padding:32px;background:#f8fafc;color:#0f172a;}',
          '.card{max-width:720px;margin:40px auto;padding:28px 30px;border-radius:18px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.12);}',
          'h1{margin:0 0 12px;font-size:26px;}p{margin:0 0 10px;line-height:1.7;color:#475569;}</style></head><body>',
          '<div class="card"><h1>편집용 템플릿 준비 중</h1>',
          '<p>선택한 날짜로 편집용 템플릿 파일을 만드는 중입니다.</p>',
          '<p>잠시만 기다려주세요.</p></div></body></html>'].join(''));
        popup.document.close();
      } catch (error) { console.warn(error); }
      return popup;
    }

    function navigateOrRenderPopupLink(popup, url) {
      if (!popup || !url) return;
      try { popup.location.replace(url); popup.focus(); return; } catch (error) { console.warn(error); }
      try {
        popup.document.open();
        popup.document.write(['<!DOCTYPE html><html><head><meta charset="utf-8"><title>편집용 템플릿 열기</title>',
          '<style>body{font-family:"Malgun Gothic",sans-serif;margin:0;padding:32px;background:#f8fafc;color:#0f172a;}',
          '.card{max-width:760px;margin:40px auto;padding:28px 30px;border-radius:18px;background:#fff;box-shadow:0 20px 50px rgba(15,23,42,.12);}',
          'h1{margin:0 0 12px;font-size:26px;}p{margin:0 0 14px;line-height:1.7;color:#475569;}',
          'a.button{display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;}',
          '.url{margin-top:16px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;word-break:break-all;color:#334155;}',
          '</style></head><body><div class="card"><h1>편집용 템플릿 열기</h1>',
          '<p>자동 이동이 막혀서 직접 열 수 있게 링크를 준비했습니다.</p>',
          '<a class="button" href="' + escAttr(url) + '" target="_self">편집용 템플릿 열기</a>',
          '<div class="url">' + esc(url) + '</div></div></body></html>'].join(''));
        popup.document.close(); popup.focus();
      } catch (error) { console.warn(error); }
    }

    function openTemplateEditWorkspace() {
      const dates = getOperationRequestDates();
      if (!dates.length) { setStatus('편집용 시트를 만들 날짜가 없습니다.'); return; }
      const popup = openLoadingPopupWindow();
      setStatus('편집용 템플릿 시트를 만드는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          if (popup && result && result.url) navigateOrRenderPopupLink(popup, result.url);
          setStatus('편집용 템플릿 시트 생성 완료: ' + ((result && result.rowCount) || 0) + '건');
        })
        .withFailureHandler(function(error) {
          if (popup && !popup.closed) popup.close();
          setStatus('편집용 템플릿 시트 생성 실패: ' + error.message);
        })
        .createTemplateEditWorkspaceByDates(dates, state.selectedYear);
    }

    function reopenTemplateEditWorkspace() {
      const popup = openLoadingPopupWindow();
      setStatus('마지막 편집본을 다시 여는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          if (popup && result && result.url) navigateOrRenderPopupLink(popup, result.url);
          const suffix = result && result.rowCount ? ' / ' + result.rowCount + '건' : '';
          setStatus('마지막 편집본 열기 완료: ' + ((result && result.name) || '편집본') + suffix);
        })
        .withFailureHandler(function(error) {
          if (popup && !popup.closed) popup.close();
          setStatus('마지막 편집본 열기 실패: ' + error.message);
        })
        .getTemplateEditWorkspaceSessionInfo(state.selectedYear);
    }

    function applyTemplateEditWorkspace() {
      setStatus('편집본을 원본 일지데이터에 반영하는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          const cleanedUp = result && result.cleanedUp ? ' / 편집본 자동 정리됨' : '';
          setStatus('편집본 반영 완료: ' + ((result && result.appliedCount) || 0) + '건' + cleanedUp);
          changeYear(state.selectedYear);
        })
        .withFailureHandler(function(error) { setStatus('편집본 반영 실패: ' + error.message); })
        .applyTemplateEditWorkspaceToLogData(state.selectedYear);
    }

    function changeYear(year, forceRefresh) {
      if (!year) { setLoading(false); return; }
      yearRequestToken += 1;
      const requestToken = yearRequestToken;
      const yearSelect = document.getElementById('yearSelect');
      if (yearSelect && String(yearSelect.value) !== String(year)) {
        yearSelect.value = String(year);
      }
      setStatus(year + '년 통계를 ' + (forceRefresh ? '새로 읽는' : '불러오는') + ' 중...');
      setLoading(true, year + '년 통계를 ' + (forceRefresh ? '새로 읽고' : '불러오고') + ' 있습니다. 잠시만 기다려주세요.');
      const request = google.script.run
        .withSuccessHandler(function(result) {
          if (requestToken !== yearRequestToken) {
            return;
          }
          try {
            activeStudentKey = '';
            updateData(result || {});
            resetFiltersForYearChange();
            setLoading(false);
            const loadedRows = Array.isArray(state.rows) ? state.rows.length : 0;
            setStatus(year + '년 통계 ' + loadedRows + '건을 불러왔습니다.');
          } catch (handlerError) {
              setLoading(false);
              state.lastLoadError = handlerError && handlerError.message ? handlerError.message : '알 수 없는 오류';
              setStatus('연도 데이터 후처리 실패: ' + state.lastLoadError);
              const tbody = document.getElementById('rows');
              if (tbody) {
          tbody.innerHTML = '<tr><td colspan="17" class="empty">연도 데이터 후처리 실패: ' + esc(state.lastLoadError) + '</td></tr>';
              }
            }
        })
        .withFailureHandler(function(error) {
          if (requestToken !== yearRequestToken) {
            return;
          }
            setLoading(false);
            state.lastLoadError = error && error.message ? error.message : '알 수 없는 오류';
            setStatus('연도 변경 실패: ' + state.lastLoadError);
            const tbody = document.getElementById('rows');
            if (tbody) {
          tbody.innerHTML = '<tr><td colspan="17" class="empty">연도 변경 실패: ' + esc(state.lastLoadError) + '</td></tr>';
            }
          });
      if (forceRefresh) { request.refreshAttendanceStatsDialogDataByYear(year); return; }
      request.buildAttendanceStatsDialogDataByYear(year);
    }

    function reloadSelectedYear() {
      const select = document.getElementById('yearSelect');
      if (!select || !select.value) { setStatus('새로고침할 연도를 선택해주세요.'); return; }
      changeYear(select.value, true);
    }

    function saveAnnualLeaveSourceUrl() {
      const url = document.getElementById('annualLeaveSourceUrl').value || '';
      setStatus('연차 링크를 저장하는 중...');
      google.script.run
        .withSuccessHandler(function(result) {
          state.annualLeaveSourceUrl = (result && result.url) || '';
          setStatus('연차 링크 저장 완료');
        })
        .withFailureHandler(function(error) { setStatus('연차 링크 저장 실패: ' + error.message); })
        .saveAnnualLeaveSourceUrlFromDialog(url);
    }

    function bindFilterModalEvents() {
      var el = function(id) { return document.getElementById(id); };

      var btnFilter = el('filterModalBtn');
      if (btnFilter) btnFilter.addEventListener('click', openFilterModal);

      var backdrop = el('filterModalBackdrop');
      if (backdrop) backdrop.addEventListener('click', closeFilterModal);

      var btnClose = el('filterModalClose');
      if (btnClose) btnClose.addEventListener('click', closeFilterModal);

      var btnApply = el('fmApplyBtn');
      if (btnApply) btnApply.addEventListener('click', fmApply);

      var btnReset = el('fmResetBtn');
      if (btnReset) btnReset.addEventListener('click', fmReset);

      var calPrev = el('fmCalPrev');
      if (calPrev) calPrev.addEventListener('click', function() { fmCalMove(-1); });

      var calNext = el('fmCalNext');
      if (calNext) calNext.addEventListener('click', function() { fmCalMove(1); });

      var calClear = el('fmCalClearBtn');
      if (calClear) calClear.addEventListener('click', fmCalClear);

      var fmStartDate = el('fmStartDate');
      if (fmStartDate) fmStartDate.addEventListener('change', function() {
        fmCal.start = fmStartDate.value || '';
        if (fmCal.start) { var d = new Date(fmCal.start); fmCal.year = d.getFullYear(); fmCal.month = d.getMonth(); }
        if (fmCal.end && fmCal.end < fmCal.start) { fmCal.end = ''; el('fmEndDate').value = ''; }
        fmCal.picking = fmCal.start ? 'end' : 'start';
        fmCalRender();
      });
      var fmEndDate = el('fmEndDate');
      if (fmEndDate) fmEndDate.addEventListener('change', function() {
        fmCal.end = fmEndDate.value || '';
        if (fmCal.end && fmCal.start && fmCal.end < fmCal.start) { fmCal.start = fmCal.end; fmCal.end = ''; el('fmStartDate').value = fmCal.start; el('fmEndDate').value = ''; }
        fmCal.picking = 'start';
        fmCalRender();
      });

      document.querySelectorAll('#fmPresetGroup .fmbtn').forEach(function(btn) {
        btn.addEventListener('click', function() { fmSelectPreset(btn.getAttribute('data-preset')); });
      });

      document.querySelectorAll('#fmMonthGroup .fmbtn').forEach(function(btn) {
        btn.addEventListener('click', function() { fmSelectMonth(btn.getAttribute('data-month')); });
      });

      var yearSelect = el('yearSelect');
      if (yearSelect) yearSelect.addEventListener('change', function() { changeYear(yearSelect.value); });

      var btnSizeNormal = el('btnSizeNormal');
      if (btnSizeNormal) btnSizeNormal.addEventListener('click', function() { setDialogSize('normal'); });
      var btnSizeWide = el('btnSizeWide');
      if (btnSizeWide) btnSizeWide.addEventListener('click', function() { setDialogSize('wide'); });
      var btnSizeMax = el('btnSizeMax');
      if (btnSizeMax) btnSizeMax.addEventListener('click', function() { setDialogSize('max'); });

      var monthSelect = el('monthSelect');
      if (monthSelect) monthSelect.addEventListener('change', syncDateRangeFromMonth);

      var datePreset = el('datePreset');
      if (datePreset) datePreset.addEventListener('change', function() { applyDatePreset(datePreset.value); });

      var filterStartDate = el('filterStartDate');
      if (filterStartDate) filterStartDate.addEventListener('change', handleFilterDateChange);
      var filterEndDate = el('filterEndDate');
      if (filterEndDate) filterEndDate.addEventListener('change', handleFilterDateChange);

      var dateSearch = el('dateSearch');
      if (dateSearch) dateSearch.addEventListener('input', render);

      var btnToggleAdvanced = el('btnToggleAdvanced');
      if (btnToggleAdvanced) btnToggleAdvanced.addEventListener('click', toggleAdvancedPanel);

      var operatingMode = el('operatingMode');
      if (operatingMode) operatingMode.addEventListener('change', toggleOperatingManual);
      var modalOperatingMode = el('modalOperatingMode');
      if (modalOperatingMode) modalOperatingMode.addEventListener('change', toggleOperatingModalManual);

      var operatingBackdrop = el('operatingModalBackdrop');
      if (operatingBackdrop) operatingBackdrop.addEventListener('click', closeOperatingModal);
      var operatingClose = el('operatingModalClose');
      if (operatingClose) operatingClose.addEventListener('click', closeOperatingModal);
      var btnEditOperatingHours = el('btnEditOperatingHours');
      if (btnEditOperatingHours) btnEditOperatingHours.addEventListener('click', openOperatingModal);
      var btnResetOperatingModal = el('btnResetOperatingModal');
      if (btnResetOperatingModal) btnResetOperatingModal.addEventListener('click', resetOperatingModal);
      var btnApplyOperatingModal = el('btnApplyOperatingModal');
      if (btnApplyOperatingModal) btnApplyOperatingModal.addEventListener('click', applyOperatingModal);

      var btnSaveAnnualUrl = el('btnSaveAnnualUrl');
      if (btnSaveAnnualUrl) btnSaveAnnualUrl.addEventListener('click', saveAnnualLeaveSourceUrl);

      var checkAll = el('checkAll');
      if (checkAll) checkAll.addEventListener('change', function() { setAll(checkAll.checked); });

      var previewToggleButton = el('previewToggleButton');
      if (previewToggleButton) previewToggleButton.addEventListener('click', togglePreviewCollapse);

      var studentPanelToggleButton = el('studentPanelToggleButton');
      if (studentPanelToggleButton) studentPanelToggleButton.addEventListener('click', toggleStudentPanelCollapse);

      var actionApplySelected = el('actionApplySelected');
      if (actionApplySelected) actionApplySelected.addEventListener('click', applySelected);
      var actionEditSelectedLog = el('actionEditSelectedLog');
      if (actionEditSelectedLog) actionEditSelectedLog.addEventListener('click', editSelectedLogData);
      var actionDeleteSelectedLog = el('actionDeleteSelectedLog');
      if (actionDeleteSelectedLog) actionDeleteSelectedLog.addEventListener('click', deleteSelectedLogData);
      var actionPrintLogs = el('actionPrintLogs');
      if (actionPrintLogs) actionPrintLogs.addEventListener('click', function() { previewLogDocuments(true); });
      var actionPreviewApply = el('actionPreviewApply');
      if (actionPreviewApply) actionPreviewApply.addEventListener('click', previewApply);

      var fmCalGrid = el('fmCalGrid');
      if (fmCalGrid) fmCalGrid.addEventListener('click', function(e) {
        var day = e.target.getAttribute('data-date');
        if (day) fmCalSelectDay(day);
      });

      var btnReloadYear = el('btnReloadYear');
      if (btnReloadYear) btnReloadYear.addEventListener('click', reloadSelectedYear);
      var btnToggleAggregate = el('btnToggleAggregate');
      if (btnToggleAggregate) btnToggleAggregate.addEventListener('click', toggleAggregatePanel);
      var btnApplyAll = el('btnApplyAll');
      if (btnApplyAll) btnApplyAll.addEventListener('click', applyAll);
      var btnPreviewApply = el('btnPreviewApply');
      if (btnPreviewApply) btnPreviewApply.addEventListener('click', previewApply);
      var btnOpenTemplate = el('btnOpenTemplate');
      if (btnOpenTemplate) btnOpenTemplate.addEventListener('click', openTemplateEditWorkspace);
      var btnReopenTemplate = el('btnReopenTemplate');
      if (btnReopenTemplate) btnReopenTemplate.addEventListener('click', reopenTemplateEditWorkspace);
      var btnApplyTemplate = el('btnApplyTemplate');
      if (btnApplyTemplate) btnApplyTemplate.addEventListener('click', applyTemplateEditWorkspace);

      [['visChipAttendance','chipAttendance','typeAttendance'],
       ['visChipEducation','chipEducation','typeEducation'],
       ['visChipAnnual','chipAnnual','typeAnnual'],
       ['visChipProgram','chipProgram','typeProgram']].forEach(function(trio) {
        var vis = el(trio[0]);
        if (!vis) return;
        vis.checked = true;
        vis.addEventListener('change', function() {
          var hidden = el(trio[2]);
          if (hidden) hidden.checked = vis.checked;
          syncChip(trio[1], vis);
          render();
        });
      });
    }

    function initializeDialog() {
      const initialPreset = state.activePreset || (document.getElementById('monthSelect').value ? 'month' : 'year');
      document.getElementById('datePreset').value = initialPreset;
      state.activePreset = initialPreset;
      applyDatePreset(initialPreset);
      toggleOperatingManual();
      bindFilterModalEvents();
      safeRender();
      setLoading(true, state.statusMessage || '통계를 준비하고 있습니다. 잠시만 기다려주세요.');
      google.script.run
        .withSuccessHandler(function(shellData) {
          try {
            updateData(shellData || {});
            const initialYear = state.selectedYear || (state.availableYears && state.availableYears.length
              ? String(state.availableYears[0].year || '') : '');
            if (!initialYear) {
              setLoading(false);
              setStatus('표시할 연도가 없습니다.');
              return;
            }
            changeYear(initialYear, false);
          } catch (shellError) {
              setLoading(false);
              const message = shellError && shellError.message ? shellError.message : '알 수 없는 오류';
              setStatus('초기 셸 적용 실패: ' + message);
              const tbody = document.getElementById('rows');
              if (tbody) {
          tbody.innerHTML = '<tr><td colspan="17" class="empty">초기 셸 적용 실패: ' + esc(message) + '</td></tr>';
              }
            }
          })
        .withFailureHandler(function(error) {
            setLoading(false);
            const message = error && error.message ? error.message : '알 수 없는 오류';
            setStatus('초기 통계 불러오기 실패: ' + message);
            const tbody = document.getElementById('rows');
            if (tbody) {
          tbody.innerHTML = '<tr><td colspan="17" class="empty">초기 통계 불러오기 실패: ' + esc(message) + '</td></tr>';
            }
          })
        .getAttendanceStatsDialogShellData();
    }

    function escAttr(value) { return esc(value).replace(/"/g, '&quot;'); }

    initializeDialog();
  </script>
</body>
</html>`;
}
