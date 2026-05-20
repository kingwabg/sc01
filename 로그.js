function inspect25DecemberBlock() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('25년 출석부');
  if (!sheet) {
    Logger.log('25년 출석부 시트를 찾을 수 없습니다.');
    return;
  }

  const ranges = [
    'A1:AO20',
    'A880:AO935'
  ];

  ranges.forEach(function(a1) {
    const range = sheet.getRange(a1);
    const values = range.getDisplayValues();
    Logger.log('=== 범위: %s ===', a1);
    for (let r = 0; r < values.length; r += 1) {
      Logger.log('%s행: %s', range.getRow() + r, JSON.stringify(values[r]));
    }
  });
}
