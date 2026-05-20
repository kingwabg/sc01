function inspectExitedChildListSheetDetailed() {
  const sheetName = '대기&퇴소 아동 리스트';
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: ' + sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const sampleRows = Math.min(10, lastRow);

  Logger.log('=== 기본 정보 ===');
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('최종 행: %s', lastRow);
  Logger.log('최종 열: %s', lastColumn);

  Logger.log('=== 1~10행 샘플 ===');
  const values = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();
  const backgrounds = sheet.getRange(1, 1, sampleRows, lastColumn).getBackgrounds();
  const fontWeights = sheet.getRange(1, 1, sampleRows, lastColumn).getFontWeights();

  for (let r = 0; r < values.length; r += 1) {
    Logger.log('%s행: %s', r + 1, JSON.stringify(values[r]));
  }

  Logger.log('=== 값 있는 셀(1~10행) ===');
  for (let r = 0; r < values.length; r += 1) {
    for (let c = 0; c < values[r].length; c += 1) {
      const value = values[r][c];
      if (value !== '' && value !== null) {
        const a1 = sheet.getRange(r + 1, c + 1).getA1Notation();
        Logger.log(
          '%s | 값=\"%s\" | 배경=%s | 굵기=%s',
          a1,
          value,
          backgrounds[r][c],
          fontWeights[r][c]
        );
      }
    }
  }
}
