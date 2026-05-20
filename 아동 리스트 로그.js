function inspectChildListSheet() {
  const sheetName = '아동리스트'; // 실제 시트명으로 바꿔주세요
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: ' + sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  Logger.log('=== 기본 정보 ===');
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('최종 행: %s', lastRow);
  Logger.log('최종 열: %s', lastColumn);

  Logger.log('=== 1~5행 샘플 ===');
  const sampleRows = Math.min(5, lastRow);
  const values = sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues();

  for (let r = 0; r < values.length; r += 1) {
    Logger.log('%s행: %s', r + 1, JSON.stringify(values[r]));
  }
}
