function buildTemplateDrivenPreviewTemplate_() {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      :root {
        --paper-width: 210mm;
        --paper-height: 297mm;
        --paper-margin-top: 10mm;
        --paper-margin-right: 10mm;
        --paper-margin-bottom: 10mm;
        --paper-margin-left: 10mm;
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
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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
        background: #5f6368;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .status {
        margin-left: 12px;
        color: #fff;
        font-size: 13px;
      }

      .docs {
        padding: 18px 0 30px;
        overflow-x: auto;
      }

      .docs .sheet-table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .docs .sheet-scale-box {
        width: 100%;
        overflow: visible;
        position: relative;
      }

      .docs .sheet-scale-frame {
        transform: scale(var(--sheet-scale, 1));
        transform-origin: top left;
      }

      .docs .sheet-table td {
        max-width: none;
        overflow: visible;
        white-space: normal;
        word-break: keep-all;
        overflow-wrap: anywhere;
      }

      .docs table,
      .docs th,
      .docs td {
        border-color: #9b9b9b !important;
      }

      .docs th {
        background: #d9d9d9 !important;
      }

      .page {
        width: var(--paper-width);
        margin: 0 auto 18px;
      }

      .page-inner {
        width: var(--paper-width);
        min-height: var(--paper-height);
        margin: 0 auto;
        padding: var(--paper-margin-top) var(--paper-margin-right) var(--paper-margin-bottom) var(--paper-margin-left);
        background: #fff;
        box-shadow: 0 0 14px rgba(0, 0, 0, 0.35);
        overflow: hidden;
      }

      .paper-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.42);
        z-index: 1300;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }

      .paper-dialog {
        width: min(620px, 100%);
        max-height: calc(100vh - 36px);
        overflow-y: auto;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.28);
        color: #0f172a;
      }

      .paper-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 38px;
        padding: 0 14px;
        border-bottom: 1px solid #cbd5e1;
        background: #e8eefb;
        font-size: 15px;
        font-weight: 800;
      }

      .paper-close {
        border: 0;
        background: transparent;
        color: #475569;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
      }

      .paper-body {
        padding: 14px 16px 16px;
      }

      .paper-section {
        margin-bottom: 12px;
        padding: 14px;
        border: 1px solid #d1d5db;
        background: #fff;
      }

      .paper-section-title {
        margin: 0 0 10px;
        color: #3157b7;
        font-size: 13px;
        font-weight: 800;
      }

      .paper-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 18px;
      }

      .paper-field {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr) 34px;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #475569;
      }

      .paper-field input {
        width: 100%;
        height: 30px;
        border: 1px solid #c4c9d4;
        padding: 0 8px;
        text-align: right;
        font: inherit;
        color: #111827;
      }

      .paper-select {
        height: 30px;
        min-width: 126px;
        border: 1px solid #c4c9d4;
        background: #fff;
        padding: 0 8px;
        font: inherit;
      }

      .paper-choice-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .paper-choice {
        min-width: 74px;
        height: 70px;
        border: 1px solid #d1d5db;
        background: #f8fafc;
        color: #475569;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      .paper-choice.active {
        border-color: #5b7cda;
        background: #eef3ff;
        color: #1d4ed8;
        font-weight: 800;
      }

      .paper-preview-wrap {
        display: flex;
        justify-content: center;
        padding: 10px;
        border: 1px dashed #cbd5e1;
        background: #f8fafc;
      }

      .paper-preview {
        width: 92px;
        height: 130px;
        padding: 8px;
        background: #fff;
        border: 1px solid #94a3b8;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      }

      .paper-preview-content {
        width: 100%;
        height: 100%;
        border: 1px solid #2563eb;
        background: repeating-linear-gradient(
          to bottom,
          rgba(37, 99, 235, 0.08),
          rgba(37, 99, 235, 0.08) 5px,
          transparent 5px,
          transparent 10px
        );
      }

      .paper-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
      }

      .page-number {
        text-align: right;
        padding: 6px 4px 0 0;
        font-size: 10px;
        color: #666;
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

      .boot-debug.hidden {
        display: none;
      }

      .fatal-error {
        display: none;
        width: min(1000px, calc(100% - 32px));
        margin: 12px auto 0;
        padding: 14px 16px;
        border-radius: 12px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .editor-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.42);
        z-index: 1200;
      }

      .editor-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: min(560px, 100vw);
        height: 100vh;
        background: #f8fafc;
        box-shadow: -8px 0 24px rgba(15, 23, 42, 0.18);
        padding: 22px 22px 28px;
        overflow-y: auto;
      }

      .editor-title {
        font-size: 18px;
        font-weight: 800;
        margin: 0 0 6px;
        color: #0f172a;
      }

      .editor-subtitle {
        font-size: 12px;
        color: #4b5563;
        margin-bottom: 14px;
      }

      .editor-group {
        margin-bottom: 12px;
      }

      .editor-section {
        margin: 14px 0;
        padding: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
      }

      .editor-section-title {
        margin: 0 0 12px;
        font-size: 13px;
        font-weight: 800;
        color: #334155;
      }

      .editor-group label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 4px;
      }

      .editor-input,
      .editor-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 9px 11px;
        font-size: 13px;
        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
        background: #fff;
        color: #111827;
      }

      .editor-input:focus,
      .editor-textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        outline: none;
      }

      .editor-textarea {
        min-height: 76px;
        resize: vertical;
      }

      .editor-textarea.guidance {
        min-height: 58px;
      }

      .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }

      .editor-actions .btn {
        margin: 0;
      }

      @media print {
        body {
          background: #fff;
        }

        .toolbar {
          display: none;
        }

        .page-actions,
        .paper-backdrop,
        .editor-backdrop {
          display: none !important;
        }

        .docs {
          padding: 0;
        }

        .page {
          width: var(--paper-width);
          margin: 0;
          page-break-after: always;
        }

        .page:last-child {
          page-break-after: auto;
        }

        .page-inner {
          width: var(--paper-width);
          min-height: var(--paper-height);
          box-shadow: none;
          overflow: visible;
        }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button class="btn" onclick="window.print()">인쇄</button>
      <button class="btn" id="toolbarPaperBtn" type="button">편집 용지</button>
      <button class="btn" id="toolbarEditBtn" type="button">간단 수정</button>
      <span class="status" id="status"></span>
    </div>
    <div class="boot-debug" id="bootDebug">운영일지 준비 중...</div>
    <div class="fatal-error" id="fatalError"></div>
    <div class="docs" id="docs"></div>
    <div id="templatePayload" data-boot-info="<?!= bootInfoBase64 ?>" data-request-payload="<?!= requestPayloadBase64 ?>" hidden></div>
    <div class="paper-backdrop" id="paperBackdrop">
      <div class="paper-dialog" onclick="event.stopPropagation()">
        <div class="paper-head">
          <span>편집 용지</span>
          <button class="paper-close" id="paperCloseBtn" type="button" aria-label="닫기">&times;</button>
        </div>
        <div class="paper-body">
          <div class="paper-section">
            <div class="paper-section-title">용지 종류</div>
            <select class="paper-select" id="paperPreset">
              <option value="a4">A4</option>
              <option value="custom">사용자 정의</option>
            </select>
            <div class="paper-grid" style="margin-top:10px">
              <label class="paper-field"><span>폭</span><input id="paperWidth" type="number" step="0.1" min="1"><span>mm</span></label>
              <label class="paper-field"><span>길이</span><input id="paperHeight" type="number" step="0.1" min="1"><span>mm</span></label>
            </div>
          </div>
          <div class="paper-grid">
            <div class="paper-section">
              <div class="paper-section-title">용지 방향</div>
              <div class="paper-choice-row">
                <button class="paper-choice active" id="paperPortrait" type="button" data-orientation="portrait">세로</button>
                <button class="paper-choice" id="paperLandscape" type="button" data-orientation="landscape">가로</button>
              </div>
            </div>
            <div class="paper-section">
              <div class="paper-section-title">미리보기</div>
              <div class="paper-preview-wrap">
                <div class="paper-preview" id="paperMiniPreview">
                  <div class="paper-preview-content" id="paperMiniContent"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="paper-section">
            <div class="paper-section-title">용지 여백</div>
            <div class="paper-grid">
              <label class="paper-field"><span>위쪽</span><input id="paperMarginTop" type="number" step="0.1" min="0"><span>mm</span></label>
              <label class="paper-field"><span>아래쪽</span><input id="paperMarginBottom" type="number" step="0.1" min="0"><span>mm</span></label>
              <label class="paper-field"><span>왼쪽</span><input id="paperMarginLeft" type="number" step="0.1" min="0"><span>mm</span></label>
              <label class="paper-field"><span>오른쪽</span><input id="paperMarginRight" type="number" step="0.1" min="0"><span>mm</span></label>
            </div>
          </div>
          <div class="paper-actions">
            <button class="btn" style="background:#6b7280" id="paperCancelBtn" type="button">취소</button>
            <button class="btn" id="paperApplyBtn" type="button">확인</button>
          </div>
        </div>
      </div>
    </div>
    <div class="editor-backdrop" id="editorBackdrop">
      <div class="editor-panel" onclick="event.stopPropagation()">
        <div class="editor-title">간단 수정</div>
        <div class="editor-subtitle" id="editorSubtitle"></div>
        <div class="editor-group"><label for="editorManager">담당자</label><input class="editor-input" id="editorManager"></div>
        <div class="editor-section">
          <div class="editor-section-title">지도 및 협의내용</div>
          <div class="editor-group"><label for="editorGuidanceLife">생활지도</label><textarea class="editor-textarea guidance" id="editorGuidanceLife"></textarea></div>
          <div class="editor-group"><label for="editorGuidanceHygiene">위생지도</label><textarea class="editor-textarea guidance" id="editorGuidanceHygiene"></textarea></div>
          <div class="editor-group"><label for="editorGuidanceSafety">안전지도</label><textarea class="editor-textarea guidance" id="editorGuidanceSafety"></textarea></div>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">변동 및 메모</div>
          <div class="editor-group"><label for="editorStaffChanges">종사자 변동</label><textarea class="editor-textarea" id="editorStaffChanges"></textarea></div>
          <div class="editor-group"><label for="editorChildChanges">이용아동 변동</label><textarea class="editor-textarea" id="editorChildChanges"></textarea></div>
          <div class="editor-group"><label for="editorVisitorReason">방문자</label><textarea class="editor-textarea" id="editorVisitorReason"></textarea></div>
          <div class="editor-group"><label for="editorMiscNotes">기타사항</label><textarea class="editor-textarea" id="editorMiscNotes"></textarea></div>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">업무 내용</div>
          <div class="editor-group"><label for="editorChildSpecialCounseling">아동 특이사항 및 개별 상담</label><textarea class="editor-textarea" id="editorChildSpecialCounseling"></textarea></div>
          <div class="editor-group"><label for="editorFacilitySafetyHygiene">시설 안전 및 위생 점검</label><textarea class="editor-textarea" id="editorFacilitySafetyHygiene"></textarea></div>
          <div class="editor-group"><label for="editorSuppliesEnvironment">공용 물품 및 환경 정리</label><textarea class="editor-textarea" id="editorSuppliesEnvironment"></textarea></div>
          <div class="editor-group"><label for="editorStaffEducationTrip">종사자 교육 및 출장</label><textarea class="editor-textarea" id="editorStaffEducationTrip"></textarea></div>
          <div class="editor-group"><label for="editorWork1">업무 1</label><textarea class="editor-textarea" id="editorWork1"></textarea></div>
          <div class="editor-group"><label for="editorWork2">업무 2</label><textarea class="editor-textarea" id="editorWork2"></textarea></div>
          <div class="editor-group"><label for="editorWork3">업무 3</label><textarea class="editor-textarea" id="editorWork3"></textarea></div>
          <div class="editor-group"><label for="editorWork4">업무 4</label><textarea class="editor-textarea" id="editorWork4"></textarea></div>
          <div class="editor-group"><label for="editorWork5">업무 5</label><textarea class="editor-textarea" id="editorWork5"></textarea></div>
          <div class="editor-group"><label for="editorWork6">업무 6</label><textarea class="editor-textarea" id="editorWork6"></textarea></div>
          <div class="editor-group"><label for="editorWork7">업무 7</label><textarea class="editor-textarea" id="editorWork7"></textarea></div>
        </div>
        <div class="editor-section">
          <div class="editor-section-title">프로그램</div>
          <div class="editor-group"><label for="editorProgramTitle">프로그램명</label><textarea class="editor-textarea" id="editorProgramTitle"></textarea></div>
          <div class="editor-group"><label for="editorProgramParticipants">참석자 명단</label><textarea class="editor-textarea" id="editorProgramParticipants"></textarea></div>
        </div>
        <div class="editor-actions">
          <button class="btn" style="background:#6b7280" id="editorCancelBtn" type="button">닫기</button>
          <button class="btn" id="editorSaveBtn" type="button">저장</button>
        </div>
      </div>
    </div>

    <script>
      function decodeBase64Unicode(base64Value) {
        const normalized = String(base64Value || '').replace(/-/g, '+').replace(/_/g, '/');
        if (!normalized) return '';
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, function(char) {
          return char.charCodeAt(0);
        });
        if (typeof TextDecoder !== 'undefined') {
          return new TextDecoder('utf-8').decode(bytes);
        }
        let escaped = '';
        bytes.forEach(function(byte) {
          escaped += '%' + ('0' + byte.toString(16)).slice(-2);
        });
        return decodeURIComponent(escaped);
      }

      function showFatalError(error) {
        const box = document.getElementById('fatalError');
        const docs = document.getElementById('docs');
        const boot = document.getElementById('bootDebug');
        const status = document.getElementById('status');
        const message = error && error.message ? error.message : String(error || '알 수 없는 오류');
        if (box) {
          box.style.display = 'block';
          box.textContent = '운영일지 미리보기를 표시하지 못했습니다.\\n' + message;
        }
        if (boot) {
          boot.textContent = '운영일지 준비 실패\\n' + message;
        }
        if (status) {
          status.textContent = '불러오기 실패';
        }
        if (docs) {
          docs.innerHTML = '';
        }
      }

      function hideBootDebug() {
        const boot = document.getElementById('bootDebug');
        if (boot) {
          boot.classList.add('hidden');
        }
      }

      let currentState = {
        reports: [],
        selectedYear: '',
        autoPrint: false,
        editingReportIndex: -1
      };

      let paperSettings = {
        width: 210,
        height: 297,
        orientation: 'portrait',
        marginTop: 10,
        marginRight: 10,
        marginBottom: 10,
        marginLeft: 10
      };

      const defaultGuidance = {
        life: '1. 인사 생활화, 2. 센터 규칙 지키기, 3. 공용 물품 관리, 4. 자기 주도적 정리',
        hygiene: '수시로 손 씻기 및 소독',
        safety: '1. 실내 정숙 보행 2. 등하원 교통안전, 3. 즉시 귀가 원칙, 4. 비상시 대처'
      };

      function toPaperNumber(value, fallback) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
      }

      function getPaperStorageKey() {
        return 'logPrintPaperSettings';
      }

      function loadPaperSettings() {
        try {
          const stored = JSON.parse(localStorage.getItem(getPaperStorageKey()) || '{}');
          paperSettings = Object.assign({}, paperSettings, {
            width: toPaperNumber(stored.width, paperSettings.width),
            height: toPaperNumber(stored.height, paperSettings.height),
            orientation: stored.orientation === 'landscape' ? 'landscape' : 'portrait',
            marginTop: toPaperNumber(stored.marginTop, paperSettings.marginTop),
            marginRight: toPaperNumber(stored.marginRight, paperSettings.marginRight),
            marginBottom: toPaperNumber(stored.marginBottom, paperSettings.marginBottom),
            marginLeft: toPaperNumber(stored.marginLeft, paperSettings.marginLeft)
          });
        } catch (error) {
          paperSettings = Object.assign({}, paperSettings);
        }
      }

      function savePaperSettings() {
        try {
          localStorage.setItem(getPaperStorageKey(), JSON.stringify(paperSettings));
        } catch (error) {
          // Browser storage can be unavailable in some embedded contexts.
        }
      }

      function setPaperRootVariables() {
        const root = document.documentElement;
        const width = paperSettings.orientation === 'landscape' ? paperSettings.height : paperSettings.width;
        const height = paperSettings.orientation === 'landscape' ? paperSettings.width : paperSettings.height;
        root.style.setProperty('--paper-width', width + 'mm');
        root.style.setProperty('--paper-height', height + 'mm');
        root.style.setProperty('--paper-margin-top', paperSettings.marginTop + 'mm');
        root.style.setProperty('--paper-margin-right', paperSettings.marginRight + 'mm');
        root.style.setProperty('--paper-margin-bottom', paperSettings.marginBottom + 'mm');
        root.style.setProperty('--paper-margin-left', paperSettings.marginLeft + 'mm');
        updatePrintPageStyle(width, height);
        fitPreviewSheets();
      }

      function updatePrintPageStyle(width, height) {
        let style = document.getElementById('dynamicPaperStyle');
        if (!style) {
          style = document.createElement('style');
          style.id = 'dynamicPaperStyle';
          document.head.appendChild(style);
        }
        style.textContent = '@page { size: ' + width + 'mm ' + height + 'mm; margin: 0; }';
      }

      function syncPaperDialogFields() {
        const widthInput = document.getElementById('paperWidth');
        if (!widthInput) return;
        document.getElementById('paperPreset').value = paperSettings.width === 210 && paperSettings.height === 297 ? 'a4' : 'custom';
        widthInput.value = paperSettings.width.toFixed(1);
        document.getElementById('paperHeight').value = paperSettings.height.toFixed(1);
        document.getElementById('paperMarginTop').value = paperSettings.marginTop.toFixed(1);
        document.getElementById('paperMarginRight').value = paperSettings.marginRight.toFixed(1);
        document.getElementById('paperMarginBottom').value = paperSettings.marginBottom.toFixed(1);
        document.getElementById('paperMarginLeft').value = paperSettings.marginLeft.toFixed(1);
        document.getElementById('paperPortrait').classList.toggle('active', paperSettings.orientation !== 'landscape');
        document.getElementById('paperLandscape').classList.toggle('active', paperSettings.orientation === 'landscape');
        updatePaperMiniPreview();
      }

      function updatePaperMiniPreview() {
        const preview = document.getElementById('paperMiniPreview');
        const content = document.getElementById('paperMiniContent');
        if (!preview || !content) return;
        const width = paperSettings.orientation === 'landscape' ? paperSettings.height : paperSettings.width;
        const height = paperSettings.orientation === 'landscape' ? paperSettings.width : paperSettings.height;
        const maxWidth = 132;
        const maxHeight = 132;
        const scale = Math.min(maxWidth / width, maxHeight / height);
        preview.style.width = Math.max(width * scale, 40) + 'px';
        preview.style.height = Math.max(height * scale, 40) + 'px';
        preview.style.paddingTop = Math.max(paperSettings.marginTop * scale, 1) + 'px';
        preview.style.paddingRight = Math.max(paperSettings.marginRight * scale, 1) + 'px';
        preview.style.paddingBottom = Math.max(paperSettings.marginBottom * scale, 1) + 'px';
        preview.style.paddingLeft = Math.max(paperSettings.marginLeft * scale, 1) + 'px';
      }

      function collectPaperDialogFields() {
        paperSettings.width = toPaperNumber(document.getElementById('paperWidth').value, 210);
        paperSettings.height = toPaperNumber(document.getElementById('paperHeight').value, 297);
        paperSettings.marginTop = toPaperNumber(document.getElementById('paperMarginTop').value, 0);
        paperSettings.marginRight = toPaperNumber(document.getElementById('paperMarginRight').value, 0);
        paperSettings.marginBottom = toPaperNumber(document.getElementById('paperMarginBottom').value, 0);
        paperSettings.marginLeft = toPaperNumber(document.getElementById('paperMarginLeft').value, 0);
      }

      function openPaperDialog() {
        syncPaperDialogFields();
        document.getElementById('paperBackdrop').style.display = 'flex';
      }

      function closePaperDialog() {
        document.getElementById('paperBackdrop').style.display = 'none';
      }

      function applyPaperDialog() {
        collectPaperDialogFields();
        setPaperRootVariables();
        savePaperSettings();
        closePaperDialog();
      }

      function fitPreviewSheets() {
        const docs = document.getElementById('docs');
        if (!docs) return;
        Array.prototype.forEach.call(docs.querySelectorAll('.sheet-scale-box'), function(box) {
          const frame = box.querySelector('.sheet-scale-frame');
          if (!frame) return;
          frame.style.transform = 'scale(1)';
          box.style.height = 'auto';
          const availableWidth = Math.max(box.clientWidth || 0, 1);
          const designWidth = Number(frame.getAttribute('data-design-width')) || frame.scrollWidth || frame.offsetWidth || availableWidth;
          const actualWidth = Math.max(designWidth, frame.scrollWidth || 0, frame.offsetWidth || 0);
          const scale = Math.max(Math.min(1, availableWidth / Math.max(actualWidth, 1)), 0.45);
          frame.style.transform = 'scale(' + scale.toFixed(4) + ')';
          box.style.height = Math.ceil((frame.scrollHeight || frame.offsetHeight || 0) * scale) + 'px';
        });
      }

      function populateEditor(report) {
        document.getElementById('editorSubtitle').textContent = (report && report.date ? report.date : '') + (report && report.manager ? ' / ' + report.manager : '');
        document.getElementById('editorManager').value = report && report.manager || '';
        document.getElementById('editorGuidanceLife').value = report && report.guidanceLife || defaultGuidance.life;
        document.getElementById('editorGuidanceHygiene').value = report && report.guidanceHygiene || defaultGuidance.hygiene;
        document.getElementById('editorGuidanceSafety').value = report && report.guidanceSafety || defaultGuidance.safety;
        document.getElementById('editorStaffChanges').value = report && report.staffChanges || '';
        document.getElementById('editorChildChanges').value = report && report.childChanges || '';
        document.getElementById('editorVisitorReason').value = report && report.visitorReason || '';
        document.getElementById('editorMiscNotes').value = report && report.miscNotes || '';
        document.getElementById('editorChildSpecialCounseling').value = report && report.childSpecialCounseling || '';
        document.getElementById('editorFacilitySafetyHygiene').value = report && report.facilitySafetyHygiene || '';
        document.getElementById('editorSuppliesEnvironment').value = report && report.suppliesEnvironment || '';
        document.getElementById('editorStaffEducationTrip').value = report && report.staffEducationTrip || '';
        const works = report && Array.isArray(report.works) ? report.works : [];
        for (let index = 0; index < 7; index += 1) {
          document.getElementById('editorWork' + (index + 1)).value = works[index] || '';
        }
        document.getElementById('editorProgramTitle').value = report && report.programTitle || '';
        document.getElementById('editorProgramParticipants').value = report && report.programParticipants || '';
      }

      function closeEditor() {
        currentState.editingReportIndex = -1;
        document.getElementById('editorBackdrop').style.display = 'none';
      }

      function openEditor(reportIndex) {
        const report = currentState.reports[reportIndex];
        if (!report) {
          return;
        }
        currentState.editingReportIndex = reportIndex;
        populateEditor(report);
        document.getElementById('editorBackdrop').style.display = 'block';
      }

      function collectEditorValues(report) {
        const nextReport = JSON.parse(JSON.stringify(report || {}));
        nextReport.manager = document.getElementById('editorManager').value || '';
        nextReport.guidanceLife = document.getElementById('editorGuidanceLife').value || defaultGuidance.life;
        nextReport.guidanceHygiene = document.getElementById('editorGuidanceHygiene').value || defaultGuidance.hygiene;
        nextReport.guidanceSafety = document.getElementById('editorGuidanceSafety').value || defaultGuidance.safety;
        nextReport.staffChanges = document.getElementById('editorStaffChanges').value || '';
        nextReport.childChanges = document.getElementById('editorChildChanges').value || '';
        nextReport.visitorReason = document.getElementById('editorVisitorReason').value || '';
        nextReport.miscNotes = document.getElementById('editorMiscNotes').value || '';
        nextReport.childSpecialCounseling = document.getElementById('editorChildSpecialCounseling').value || '';
        nextReport.facilitySafetyHygiene = document.getElementById('editorFacilitySafetyHygiene').value || '';
        nextReport.suppliesEnvironment = document.getElementById('editorSuppliesEnvironment').value || '';
        nextReport.staffEducationTrip = document.getElementById('editorStaffEducationTrip').value || '';
        if (!Array.isArray(nextReport.works)) {
          nextReport.works = [];
        }
        for (let index = 0; index < 7; index += 1) {
          nextReport.works[index] = document.getElementById('editorWork' + (index + 1)).value || '';
        }
        nextReport.programTitle = document.getElementById('editorProgramTitle').value || '';
        nextReport.programParticipants = document.getElementById('editorProgramParticipants').value || '';
        return nextReport;
      }

      function rerenderCurrentReports(statusMessage) {
        const status = document.getElementById('status');
        if (status) {
          status.textContent = statusMessage || '미리보기 갱신 중...';
        }
        google.script.run
          .withSuccessHandler(function(result) {
            const safeResult = result || {};
            currentState.reports = safeResult.reports || currentState.reports;
            currentState.selectedYear = safeResult.selectedYear || currentState.selectedYear;
            currentState.autoPrint = !!safeResult.autoPrint;
            document.getElementById('docs').innerHTML = safeResult.pagesHtml || '';
            fitPreviewSheets();
            if (status) {
              status.textContent = '저장 완료';
            }
            closeEditor();
          })
          .withFailureHandler(function(error) {
            showFatalError(error);
          })
          .renderTemplateDrivenPreviewHtmlFromReports(
            currentState.reports || [],
            currentState.selectedYear || '',
            !!currentState.autoPrint
          );
      }

      function saveEditor() {
        if (currentState.editingReportIndex < 0) {
          return;
        }
        const status = document.getElementById('status');
        const nextReports = (currentState.reports || []).slice();
        nextReports[currentState.editingReportIndex] = collectEditorValues(nextReports[currentState.editingReportIndex]);
        if (status) {
          status.textContent = '저장 중...';
        }
        google.script.run
          .withSuccessHandler(function() {
            currentState.reports = nextReports;
            rerenderCurrentReports('미리보기 갱신 중...');
          })
          .withFailureHandler(function(error) {
            showFatalError(error);
          })
          .savePreviewEdits({
            reports: nextReports,
            year: currentState.selectedYear || ''
          });
      }

      function bootstrapPreview() {
        const payload = document.getElementById('templatePayload');
        const boot = document.getElementById('bootDebug');
        const status = document.getElementById('status');
        const docs = document.getElementById('docs');

        try {
          if (boot) {
            boot.textContent += '\\n브라우저 스크립트 시작됨';
          }

          const bootInfoRaw = decodeBase64Unicode(String(payload ? payload.getAttribute('data-boot-info') : ''));
          if (boot) {
            boot.textContent += '\\n서버 데이터 요약: ' + bootInfoRaw;
          }

          const requestPayloadRaw = decodeBase64Unicode(String(payload ? payload.getAttribute('data-request-payload') : ''));
          const requestPayload = JSON.parse(requestPayloadRaw || '{}');

          if (status) {
            status.textContent = '데이터 불러오는 중...';
          }
          if (boot) {
            boot.textContent = '운영일지 데이터 불러오는 중...';
          }

          google.script.run
            .withSuccessHandler(function(result) {
              try {
                const safeResult = result || {};
                if (!safeResult.pagesHtml) {
                  throw new Error('렌더링할 페이지 HTML이 비어 있습니다.');
                }
                currentState.reports = safeResult.reports || [];
                currentState.selectedYear = safeResult.selectedYear || '';
                currentState.autoPrint = !!safeResult.autoPrint;
                if (docs) {
                  docs.innerHTML = safeResult.pagesHtml;
                }
                fitPreviewSheets();
                if (status) {
                  status.textContent = '데이터 로드 완료';
                }
                if (boot) {
                  boot.textContent = '운영일지 데이터 로드 완료';
                }
                hideBootDebug();
                if (safeResult.autoPrint && !window.__autoPrintTriggered) {
                  window.__autoPrintTriggered = true;
                  setTimeout(function() {
                    window.print();
                  }, 300);
                }
              } catch (renderError) {
                showFatalError(renderError);
              }
            })
            .withFailureHandler(function(error) {
              showFatalError(error);
            })
            .getTemplateDrivenPreviewHtmlPayload(
              requestPayload.rowNumbers || [],
              requestPayload.selectedYear || '',
              !!requestPayload.autoPrint
            );
        } catch (error) {
          showFatalError(error);
        }
      }

      window.addEventListener('error', function(event) {
        showFatalError(event && event.error ? event.error : new Error(event.message || '브라우저 오류'));
      });

      window.addEventListener('unhandledrejection', function(event) {
        const reason = event && event.reason ? event.reason : new Error('알 수 없는 비동기 오류');
        showFatalError(reason);
      });

      window.addEventListener('resize', fitPreviewSheets);

      document.addEventListener('click', function(event) {
        const editButton = event.target.closest('.preview-edit-btn');
        if (editButton) {
          openEditor(Number(editButton.getAttribute('data-report-index')));
          return;
        }
        if (event.target.id === 'toolbarPaperBtn') {
          openPaperDialog();
          return;
        }
        if (event.target.id === 'paperBackdrop' || event.target.id === 'paperCloseBtn' || event.target.id === 'paperCancelBtn') {
          closePaperDialog();
          return;
        }
        if (event.target.id === 'paperApplyBtn') {
          applyPaperDialog();
          return;
        }
        if (event.target && event.target.dataset && event.target.dataset.orientation) {
          paperSettings.orientation = event.target.dataset.orientation === 'landscape' ? 'landscape' : 'portrait';
          syncPaperDialogFields();
          return;
        }
        if (event.target.id === 'toolbarEditBtn') {
          if (Array.isArray(currentState.reports) && currentState.reports.length) {
            openEditor(0);
          }
          return;
        }
        if (event.target.id === 'editorBackdrop' || event.target.id === 'editorCancelBtn') {
          closeEditor();
          return;
        }
        if (event.target.id === 'editorSaveBtn') {
          saveEditor();
        }
      });

      document.addEventListener('input', function(event) {
        if (!event.target || event.target.id.indexOf('paper') !== 0) {
          return;
        }
        collectPaperDialogFields();
        updatePaperMiniPreview();
      });

      document.addEventListener('change', function(event) {
        if (event.target && event.target.id === 'paperPreset') {
          if (event.target.value === 'a4') {
            paperSettings.width = 210;
            paperSettings.height = 297;
            syncPaperDialogFields();
          }
        }
      });

      loadPaperSettings();
      setPaperRootVariables();
      bootstrapPreview();
    </script>
  </body>
</html>`;
}
