function inspectStaffRequiredEducationSheetLower() {
  const fileUrl = 'https://docs.google.com/spreadsheets/d/1iy5O6Qen4EKW30EqYvTbzZNkmA5SL-ZdZgUh5mu5Wx4/edit?gid=1189984134#gid=1189984134';
  const sheetName = '종사자 필수,의무교육 시간';

  const ss = SpreadsheetApp.openByUrl(fileUrl);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: %s', sheetName);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  Logger.log('=== 기본 정보 ===');
  Logger.log('파일명: %s', ss.getName());
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('최종 행: %s', lastRow);
  Logger.log('최종 열: %s', lastColumn);

  const startRow = Math.max(1, lastRow - 80);
  const numRows = lastRow - startRow + 1;
  const sampleCols = Math.min(16, Math.max(lastColumn, 1));

  Logger.log('=== 하단 샘플 (%s~%s행) ===', startRow, lastRow);
  const values = sheet.getRange(startRow, 1, numRows, sampleCols).getDisplayValues();

  for (let r = 0; r < values.length; r += 1) {
    Logger.log('%s행: %s', startRow + r, JSON.stringify(values[r]));
  }
}
