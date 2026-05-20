function inspectTemplateSheetByName_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: ' + sheetName);
    return;
  }

  const dataRange = sheet.getDataRange();
  const mergedRanges = dataRange.getMergedRanges();
  let effectiveLastRow = Math.max(sheet.getLastRow(), 1);
  let effectiveLastColumn = Math.max(sheet.getLastColumn(), 1);
  mergedRanges.forEach(function(range) {
    effectiveLastRow = Math.max(effectiveLastRow, range.getLastRow());
    effectiveLastColumn = Math.max(effectiveLastColumn, range.getLastColumn());
  });

  const range = sheet.getRange(1, 1, effectiveLastRow, effectiveLastColumn);
  const values = range.getDisplayValues();
  const backgrounds = range.getBackgrounds();
  const fontWeights = range.getFontWeights();
  const horizontalAlignments = range.getHorizontalAlignments();
  const verticalAlignments = range.getVerticalAlignments();

  Logger.log('=== 기본 정보 ===');
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('최종 행: %s', sheet.getLastRow());
  Logger.log('최종 열: %s', sheet.getLastColumn());
  Logger.log('실효 행: %s', effectiveLastRow);
  Logger.log('실효 열: %s', effectiveLastColumn);
  Logger.log('최대 행: %s', sheet.getMaxRows());
  Logger.log('최대 열: %s', sheet.getMaxColumns());

  Logger.log('=== 병합 셀 ===');
  mergedRanges.forEach(function(r) {
    Logger.log('병합: %s', r.getA1Notation());
  });

  Logger.log('=== 열 너비 ===');
  for (let c = 1; c <= effectiveLastColumn; c++) {
    Logger.log('열 %s width=%s', c, sheet.getColumnWidth(c));
  }

  Logger.log('=== 행 높이 ===');
  for (let r = 1; r <= effectiveLastRow; r++) {
    Logger.log('행 %s height=%s', r, sheet.getRowHeight(r));
  }

  Logger.log('=== 셀 정보 ===');
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const a1 = sheet.getRange(r + 1, c + 1).getA1Notation();
      const value = values[r][c];
      if (value !== '') {
        Logger.log(
          '%s | 값="%s" | 배경=%s | 굵기=%s | 가로정렬=%s | 세로정렬=%s',
          a1,
          value,
          backgrounds[r][c],
          fontWeights[r][c],
          horizontalAlignments[r][c],
          verticalAlignments[r][c]
        );
      }
    }
  }
}

function inspectTemplateSheet() {
  inspectTemplateSheetByName_('템플릿');
}

function inspectTemplate2Sheet() {
  inspectTemplateSheetByName_('템플릿2');
}

function inspectTemplate2ProgramZonesInternal_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('템플릿2');

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: 템플릿2');
    return;
  }

  const titleSeed = sheet.getRange('C1:E1');
  const participantSeed = sheet.getRange('I1:O1');

  function logZoneSeries(seedRange, label) {
    const startRow = seedRange.getRow();
    const startColumn = seedRange.getColumn();
    const width = seedRange.getNumColumns();
    const maxRows = sheet.getLastRow();
    const seedMergedA1 = seedRange.getMergedRanges().map(function(range) {
      return range.getA1Notation();
    });

    Logger.log('=== %s 시작 영역 ===', label);
    Logger.log('기준 범위: %s', seedRange.getA1Notation());
    Logger.log('기준 병합: %s', JSON.stringify(seedMergedA1));

    for (let row = startRow; row <= Math.min(Math.max(maxRows, startRow), startRow + 12); row += 1) {
      const range = sheet.getRange(row, startColumn, 1, width);
      const values = range.getDisplayValues()[0];
      const notes = range.getNotes()[0];
      const merged = range.getMergedRanges().map(function(item) {
        return item.getA1Notation();
      });
      const hasContent = values.some(function(value) { return String(value || '').trim() !== ''; });
      const hasNotes = notes.some(function(note) { return String(note || '').trim() !== ''; });
      const styleSummary = {
        rowHeight: sheet.getRowHeight(row),
        backgrounds: range.getBackgrounds()[0],
        aligns: range.getHorizontalAlignments()[0]
      };
      Logger.log(
        '%s %s행 | 범위=%s | 값=%s | 노트=%s | 병합=%s | 스타일=%s | 내용있음=%s | 노트있음=%s',
        label,
        row,
        range.getA1Notation(),
        JSON.stringify(values),
        JSON.stringify(notes),
        JSON.stringify(merged),
        JSON.stringify(styleSummary),
        hasContent,
        hasNotes
      );
    }
  }

  Logger.log('=== 템플릿2 프로그램 영역 정밀 로그 ===');
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('최종 행: %s', sheet.getLastRow());
  Logger.log('최대 행: %s', sheet.getMaxRows());
  Logger.log('최종 열: %s', sheet.getLastColumn());
  Logger.log('최대 열: %s', sheet.getMaxColumns());
  logZoneSeries(titleSeed, '프로그램명');
  logZoneSeries(participantSeed, '참석자 명단');
}
