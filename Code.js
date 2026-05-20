const LOG_PRINT_CONFIG = Object.freeze({
  MENU_NAME: '🌿 운영일지',
  MENU_ITEM_NAME: '날짜 검색/인쇄',
  TEMPLATE_SYNC_MENU_ITEM_NAME: '템플릿 동기화',
  TEMPLATE_FORMAT_MENU_ITEM_NAME: '템플릿 제목 서식 적용',
  AUTOMATION_SETTINGS_MENU_ITEM_NAME: '자동화설정 시트 만들기',
  ATTENDANCE_STATS_MENU_ITEM_NAME: '통계 데이터 새로고침',
  ATTENDANCE_APPLY_MENU_ITEM_NAME: '통계 -> 일지데이터 반영',
  ANNUAL_LEAVE_IMPORT_MENU_ITEM_NAME: '연차 데이터 새로고침',
  ANNUAL_LEAVE_APPLY_MENU_ITEM_NAME: '연차 -> 일지데이터 반영',
  STAFF_EDUCATION_IMPORT_MENU_ITEM_NAME: '교육 데이터 새로고침',
  STAFF_EDUCATION_APPLY_MENU_ITEM_NAME: '교육 -> 일지데이터 반영',
  HOUSEKEEPING_HIDE_MENU_ITEM_NAME: '중간 시트 삭제',
  ATTENDANCE_UNMATCHED_MENU_ITEM_NAME: '미매칭 학생 보기',
  ATTENDANCE_STATS_DIALOG_MENU_ITEM_NAME: '통계보기',
  DIALOG_TITLE: '운영일지 일괄 인쇄',
  SEARCH_TITLE: '운영일지 검색',
  TEMPLATE_SHEET_NAME: '템플릿',
  TEMPLATE_SECOND_SHEET_NAME: '템플릿2',
  TEMPLATE_SCHEMA_SHEET_NAME: '_TEMPLATE_SCHEMA',
  DATA_STORE_SHEET_NAME: '_DATA_STORE',
  AUTOMATION_SETTINGS_SHEET_NAME: '자동화설정',
  CHILD_LIST_SHEET_NAME: '아동리스트',
  EXITED_CHILD_LIST_SHEET_NAME: '대기&퇴소 아동 리스트',
  ANNUAL_LEAVE_SOURCE_SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1MQYT3ZHR6LBJTQxFtAA2-1OcpbYGz6TrtlsF2Y4kCqE/edit',
  ATTENDANCE_DEFAULT_YEAR: 2026,
  HEADER_ROW: 1,
  DATA_START_ROW: 3,
  ALLOW_POSITIONAL_FALLBACK: true,
  DEFAULT_TIME_ZONE: 'Asia/Seoul',
  BUILD_VERSION: '2026-04-14 22:12',
  DIALOG_WIDTH: 1100,
  DIALOG_HEIGHT: 900,
  SEARCH_DIALOG_WIDTH: 1200,
  SEARCH_DIALOG_HEIGHT: 900,
  TEMPLATE_MARKER_TEXT_COLOR: '#ffffff',
  TEMPLATE_MARKER_NOTE_PREFIX: 'DATA_BINDING',
  TEMPLATE_REQUIRED_ROWS: 23,
  TEMPLATE_REQUIRED_COLUMNS: 16,
  REQUIRE_Q7T7: false,
});

const COL = Object.freeze({
  DATE: 0,
  OPERATING_HOURS: 1,
  MANAGER: 2,
  MALE_PRESCHOOL: 3,
  MALE_OUT_OF_SCHOOL: 4,
  MALE_ELEMENTARY: 5,
  MALE_MIDDLE: 6,
  MALE_HIGH: 7,
  MALE_OTHER: 8,
  FEMALE_PRESCHOOL: 9,
  FEMALE_OUT_OF_SCHOOL: 10,
  FEMALE_ELEMENTARY: 11,
  FEMALE_MIDDLE: 12,
  FEMALE_HIGH: 13,
  FEMALE_OTHER: 14,
  STAFF_WORKER: 15,
  STAFF_TEACHER: 16,
  STAFF_PUBLIC: 17,
  STAFF_OTHER: 18,
  STAFF_CHANGES: 19,
  CHILD_CHANGES: 20,
  WORK_1: 21,
  WORK_2: 22,
  WORK_3: 23,
  WORK_4: 24,
  WORK_5: 25,
  WORK_6: 26,
  WORK_7: 27,
});

const LOG_MISC_NOTES_COLUMN_INDEX = 27; // AB열: 인쇄 양식 마지막 '기타' 내용

const CHILD_MALE_FIELDS = Object.freeze([
  'MALE_PRESCHOOL',
  'MALE_OUT_OF_SCHOOL',
  'MALE_ELEMENTARY',
  'MALE_MIDDLE',
  'MALE_HIGH',
  'MALE_OTHER',
]);

const CHILD_FEMALE_FIELDS = Object.freeze([
  'FEMALE_PRESCHOOL',
  'FEMALE_OUT_OF_SCHOOL',
  'FEMALE_ELEMENTARY',
  'FEMALE_MIDDLE',
  'FEMALE_HIGH',
  'FEMALE_OTHER',
]);

const WORK_COLS = Object.freeze([
  COL.WORK_1,
  COL.WORK_2,
  COL.WORK_3,
  COL.WORK_4,
  COL.WORK_5,
  COL.WORK_6,
]);

const LOG_DETAIL_FIELD_DEFINITIONS = Object.freeze([
  Object.freeze({ fieldKey: 'CHILD_SPECIAL_COUNSELING', label: '아동 특이사항 및 개별 상담', category: '아동관리' }),
  Object.freeze({ fieldKey: 'FACILITY_SAFETY_HYGIENE', label: '시설 안전 및 위생 점검', category: '시설/행정' }),
  Object.freeze({ fieldKey: 'SUPPLIES_ENVIRONMENT', label: '공용 물품 및 환경 정리', category: '시설/행정' }),
  Object.freeze({ fieldKey: 'STAFF_EDUCATION_TRIP', label: '종사자 교육 및 출장', category: '종사자' }),
]);

const LOG_DATA_LAYOUT_TEMPLATE_SHEET_NAME = '25년 일지데이터';
const LOG_DATA_MANUAL_PROTECTED_FIELD_KEYS = Object.freeze(['WORK_1', 'WORK_2']);

const HEADER_FIELD_RULES = Object.freeze({
  DATE: Object.freeze(['일자', '일 자', '날짜', '작성일']),
  OPERATING_HOURS: Object.freeze([
    '운영시간',
    '운영 시간',
    '운영시각',
    '운영시간(학기중)',
    '운영시간(학기 중)',
    '운영시간(방학중)',
    '운영시간(방학 중)',
    '운영 시간(학기중)',
    '운영 시간(학기 중)',
    '운영 시간(방학중)',
    '운영 시간(방학 중)'
  ]),
  MANAGER: Object.freeze(['담당자', '담당자명', '담당교사', '담당']),
  MALE_PRESCHOOL: Object.freeze(['남취학전', '남 취학전', '남아취학전', '취학전남']),
  MALE_OUT_OF_SCHOOL: Object.freeze(['남탈학교', '남 탈학교', '남아탈학교', '탈학교남']),
  MALE_ELEMENTARY: Object.freeze(['남초등', '남 초등', '남아초등', '초등남']),
  MALE_MIDDLE: Object.freeze(['남중등', '남 중등', '남아중등', '중등남']),
  MALE_HIGH: Object.freeze(['남고등', '남 고등', '남아고등', '고등남']),
  MALE_OTHER: Object.freeze(['남기타', '남 기타', '남아기타', '기타남']),
  FEMALE_PRESCHOOL: Object.freeze(['여취학전', '여 취학전', '여아취학전', '취학전여']),
  FEMALE_OUT_OF_SCHOOL: Object.freeze(['여탈학교', '여 탈학교', '여아탈학교', '탈학교여']),
  FEMALE_ELEMENTARY: Object.freeze(['여초등', '여 초등', '여아초등', '초등여']),
  FEMALE_MIDDLE: Object.freeze(['여중등', '여 중등', '여아중등', '중등여']),
  FEMALE_HIGH: Object.freeze(['여고등', '여 고등', '여아고등', '고등여']),
  FEMALE_OTHER: Object.freeze(['여기타', '여 기타', '여아기타', '기타여']),
  STAFF_WORKER: Object.freeze(['종사자수', '종사자인원', '교사현황종사자']),
  STAFF_TEACHER: Object.freeze(['교사수', '교사인원', '교사현황교사']),
  STAFF_PUBLIC: Object.freeze(['공익수', '공익인원', '교사현황공익']),
  STAFF_OTHER: Object.freeze(['교사현황기타', '기타인원', '기타수']),
  STAFF_CHANGES: Object.freeze(['종사자변동', '종사자변동사항', '일일변동종사자', '변동사항종사자']),
  CHILD_CHANGES: Object.freeze(['이용아동변동', '이용아동변동사항', '일일변동이용아동', '변동사항이용아동']),
});

const OPTIONAL_HEADER_FIELD_RULES = Object.freeze({
  MEAL_BREAKFAST: Object.freeze(['조식', '급식현황조식', '급식조식']),
  MEAL_LUNCH: Object.freeze(['중식', '급식현황중식', '급식중식']),
  MEAL_DINNER: Object.freeze(['석식', '급식현황석식', '급식석식']),
  ATTENDANCE_CAPACITY: Object.freeze(['정원', '아동출석정원', '출석정원']),
  ATTENDANCE_CURRENT: Object.freeze(['현원', '아동출석현원', '출석현원']),
  ATTENDANCE_PRESENT: Object.freeze(['출석', '아동출석출석']),
  ATTENDANCE_OFFICIAL: Object.freeze(['공결', '아동출석공결']),
  ATTENDANCE_ALTERNATIVE: Object.freeze(['대체출석', '아동출석대체출석']),
  ATTENDANCE_ABSENT: Object.freeze(['결석', '아동출석결석']),
  ATTENDANCE_OTHER: Object.freeze(['출석기타', '아동출석기타', '기타출석']),
  VISITOR_REASON: Object.freeze(['방문자및사유', '방문자 사유', '방문자및사유내용', '방문자']),
  CHILD_SPECIAL_COUNSELING: Object.freeze(['아동특이사항및개별상담', '아동 특이사항 및 개별 상담', '아동특이사항', '개별상담', '아동관리']),
  FACILITY_SAFETY_HYGIENE: Object.freeze(['시설안전및위생점검', '시설 안전 및 위생 점검', '시설안전점검', '위생점검', '시설행정']),
  SUPPLIES_ENVIRONMENT: Object.freeze(['공용물품및환경정리', '공용 물품 및 환경 정리', '공용물품관리', '환경정리']),
  STAFF_EDUCATION_TRIP: Object.freeze(['종사자교육및출장', '종사자 교육 및 출장', '종사자교육', '종사자출장', '교육출장']),
  MISC_NOTES: Object.freeze(['기타', '기타사항', '비고']),
});

const OPTIONAL_NUMBER_FIELDS = Object.freeze([
  'MEAL_BREAKFAST',
  'MEAL_LUNCH',
  'MEAL_DINNER',
  'ATTENDANCE_CAPACITY',
  'ATTENDANCE_CURRENT',
  'ATTENDANCE_PRESENT',
  'ATTENDANCE_OFFICIAL',
  'ATTENDANCE_ALTERNATIVE',
  'ATTENDANCE_ABSENT',
  'ATTENDANCE_OTHER',
]);

const WORK_HEADER_EXACT_ALIASES = Object.freeze([
  '업무내용',
  '업무 내용',
  '업무',
  '작업내용',
]);

const WORK_HEADER_PATTERNS = Object.freeze([
  /^업무내용\d+$/,
  /^업무\d+$/,
  /^작업내용\d+$/,
]);

const DEFAULT_LOG_MANAGER_RULES = Object.freeze([
  Object.freeze({ start: '2024-01-01', end: '2024-12-31', name: '황민주' }),
  Object.freeze({ start: '2025-01-01', end: '2025-07-31', name: '김성은' }),
  Object.freeze({ start: '2025-08-01', end: '2026-12-31', name: '최하은' }),
]);

const MANAGER_EXCLUDED_POSITIONS = Object.freeze([
  '시설장',
  '센터장',
]);

let automationSettingsMemo_ = null;
let dataStoreRowsMemo_ = null;
let dataStoreJsonMemo_ = null;
const TEMPLATE_PREVIEW_WORKSPACE_PROPERTY_KEY = 'TEMPLATE_PREVIEW_WORKSPACE';
const TEMPLATE_PREVIEW_PDF_CACHE_PROPERTY_PREFIX = 'TEMPLATE_PREVIEW_PDF_CACHE_';
const TEMPLATE_PREVIEW_PDF_CACHE_TTL_MS = 1000 * 60 * 10;
const TEMPLATE_SYNC_VERSION_PROPERTY_KEY = 'TEMPLATE_SYNC_VERSION';
const ONE_TIME_INTERMEDIATE_CLEANUP_PROPERTY_KEY = 'ONE_TIME_INTERMEDIATE_CLEANUP_DONE';

function formatTemplateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);

  if (!sheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트를 찾을 수 없습니다.");
  }

  const maxRows = sheet.getMaxRows();
  const maxColumns = sheet.getMaxColumns();

  if (maxRows < LOG_PRINT_CONFIG.TEMPLATE_REQUIRED_ROWS) {
    sheet.insertRowsAfter(maxRows, LOG_PRINT_CONFIG.TEMPLATE_REQUIRED_ROWS - maxRows);
  }

  if (maxColumns < LOG_PRINT_CONFIG.TEMPLATE_REQUIRED_COLUMNS) {
    sheet.insertColumnsAfter(maxColumns, LOG_PRINT_CONFIG.TEMPLATE_REQUIRED_COLUMNS - maxColumns);
  }

  if (sheet.isSheetHidden()) {
    sheet.showSheet();
  }

  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);

  sheet.getRange('A1:I1')
    .setFontSize(25)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  SpreadsheetApp.flush();
}

function buildAttendanceStats(selectedYear, suppressAlert) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear);
  const sourceResult = resolvedYear
    ? getAttendanceSourceSheetByYear_(spreadsheet, resolvedYear)
    : getAttendanceSourceSheetFromActiveOrConfig_(spreadsheet);
  const sourceSheet = sourceResult.sheet;

  if (!sourceSheet) {
    if (!suppressAlert) {
      SpreadsheetApp.getUi().alert(
        '출석부 원본 시트를 찾지 못했습니다.\n' +
        '원인: ' + (sourceResult.errorMessage || '알 수 없는 오류')
      );
    }
    return;
  }

  if (!spreadsheet.getSheetByName(LOG_PRINT_CONFIG.CHILD_LIST_SHEET_NAME)) {
    if (!suppressAlert) {
      SpreadsheetApp.getUi().alert("'" + LOG_PRINT_CONFIG.CHILD_LIST_SHEET_NAME + "' 시트가 없습니다.");
    }
    return;
  }

  const targetYear = extractAttendanceYearFromSheetName_(sourceSheet.getName()) || resolvedYear || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const childLookup = buildCombinedChildLookup_(spreadsheet, targetYear);
  const normalizedRows = buildAttendanceNormalizedRows_(sourceSheet);
  const statsResult = buildAttendanceStatsRowsFromNormalizedData_(normalizedRows, childLookup);
  const statsRows = statsResult.statsRows;
  clearAttendanceYearCache_(targetYear);
  writeDataStoreJson_('attendance_stats', targetYear, {
    sourceSheetName: sourceSheet.getName(),
    officialCountsAsPresent: true,
    statsRows: statsRows,
    unmatchedRows: statsResult.unmatchedRows,
  });

  if (!suppressAlert) {
      SpreadsheetApp.getUi().alert(
      "_DATA_STORE에 " +
      statsRows.length + '일 집계를 생성했습니다.\n' +
      '대상 출석부: ' + sourceSheet.getName()
    );
  }

  return {
    year: targetYear,
    sheetName: sourceSheet.getName(),
    statsSheetName: getAttendanceStatsSheetNameByYear_(targetYear),
    unmatchedSheetName: getAttendanceUnmatchedSheetNameByYear_(targetYear),
    dayCount: statsRows.length,
    unmatchedCount: statsResult.unmatchedRows.length,
  };
}

function applyAttendanceStatsToLogData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveAttendanceDialogYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, selectedYear);
  const dataSheet = logDataResult.sheet;

  if (!dataSheet) {
    SpreadsheetApp.getUi().alert(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
    return;
  }

  ensureVisibleAttendanceColumnsInLogSheet_(dataSheet);

  const statsRows = readAttendanceStatsRowsByYear_(selectedYear);
  if (!statsRows.length) {
    SpreadsheetApp.getUi().alert('반영할 출석 통계 데이터가 없습니다.');
    return;
  }

  const result = applyAttendanceStatsRowsToLogSheet_(dataSheet, statsRows);
  sortLogDataSheetByDate_(dataSheet, getFieldMap_(dataSheet));

  SpreadsheetApp.flush();
  formatLogDataSheet_(dataSheet);
  SpreadsheetApp.getUi().alert(
    "'" + dataSheet.getName() + "' 시트에 출석 통계를 반영했습니다.\n" +
    '업데이트: ' + result.updatedCount + '건\n' +
    '추가: ' + result.insertedCount + '건'
  );
}

function applyAttendanceStatsToLogDataByDates(dates, selectedYear, operatingMode, operatingManualText) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const dataSheet = logDataResult.sheet;

  if (!dataSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
  }

  ensureVisibleAttendanceColumnsInLogSheet_(dataSheet);

  const dateLookup = {};
  (dates || []).forEach(function(date) {
    const normalized = normalizeDateKey_(date);
    if (normalized) {
      dateLookup[normalized] = true;
    }
  });

  const statsRows = readAttendanceStatsRowsByYear_(resolvedYear).filter(function(item) {
    return dateLookup[item.date];
  });

  if (!statsRows.length) {
    throw new Error('선택한 날짜의 출석 통계가 없습니다.');
  }

  const result = applyAttendanceStatsRowsToLogSheet_(dataSheet, statsRows);
  const operatingHoursText = buildOperatingHoursText_(operatingMode, operatingManualText);
  if (operatingHoursText) {
    applyOperatingHoursToLogDataByDates(dates, resolvedYear, operatingMode, operatingManualText);
  } else {
    if (result.insertedCount > 0) {
      sortLogDataSheetByDate_(dataSheet, getFieldMap_(dataSheet));
    }
    SpreadsheetApp.flush();
  }
  formatLogDataSheet_(dataSheet);
  return {
    updatedCount: result.updatedCount,
    insertedCount: result.insertedCount,
    appliedCount: statsRows.length,
    operatingHours: operatingHoursText,
  };
}

function normalizeIntegrationOptions_(options) {
  const safeOptions = options || {};
  return {
    attendance: safeOptions.attendance !== false,
    staff: safeOptions.staff !== false,
    nonstaff: safeOptions.nonstaff !== false,
    education: safeOptions.education !== false,
    annual: safeOptions.annual !== false,
    program: safeOptions.program !== false,
  };
}

function buildOperatingDateLookup_(dates, startDate, endDate) {
  const lookup = {};
  (dates || []).forEach(function(date) {
    const dateKey = normalizeDateKey_(date);
    if (!dateKey) {
      return;
    }
    if (startDate && dateKey < startDate) {
      return;
    }
    if (endDate && dateKey > endDate) {
      return;
    }
    lookup[dateKey] = true;
  });
  return lookup;
}

function normalizeRowNumbers_(rowNumbers) {
  return uniqueNumbers_((rowNumbers || []).map(function(rowNumber) {
    return Number(rowNumber);
  }).filter(function(rowNumber) {
    return Number.isInteger(rowNumber) && rowNumber >= LOG_PRINT_CONFIG.DATA_START_ROW;
  })).sort(function(a, b) {
    return a - b;
  });
}

function buildRequestedDateLookup_(dates) {
  const lookup = {};
  (dates || []).forEach(function(date) {
    const dateKey = normalizeDateKey_(date);
    if (dateKey) {
      lookup[dateKey] = true;
    }
  });
  return lookup;
}

function filterDateKeysByLookup_(dateValueMap, requestedLookup) {
  return Object.keys(dateValueMap || {}).filter(function(dateKey) {
    return !requestedLookup || !Object.keys(requestedLookup).length || !!requestedLookup[dateKey];
  });
}

function buildStaffAttendanceChangesText_(staffComposition) {
  const seen = {};
  const names = (staffComposition && staffComposition.availableStaff || []).map(function(item) {
    const name = valueOrEmpty_(item && item.name).trim();
    const key = normalizeStaffRosterPersonNameKey_(name);
    if (!name || seen[key || name]) return '';
    seen[key || name] = true;
    return formatStaffNameWithPosition_(name, item && item.position);
  }).filter(function(label) {
    if (!label) return false;
    return true;
  });
  return names.length ? ('출근 : ' + names.join(', ') + ' / ' + names.length + '명') : '';
}

function mergeStaffAttendanceChangesText_(existingText, attendanceText) {
  const lines = valueOrEmpty_(existingText)
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean)
    .filter(function(line) { return !/^출근\s*:/.test(line); });
  if (attendanceText) lines.unshift(attendanceText);
  return lines.join('\n');
}

function mergeNonStaffOtherVisitorReasonText_(existingText, generatedText) {
  const generated = valueOrEmpty_(generatedText).trim();
  const generatedLinePattern = /^(교사|공익|시니어|강사|멘토|자원봉사자|근로장학생|기타)\s*:/;
  const manualParts = valueOrEmpty_(existingText)
    .split(/\s*·\s*|\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean)
    .filter(function(line) { return !generatedLinePattern.test(line); });
  if (generated) {
    manualParts.push(generated);
  }
  return manualParts.join(' · ');
}

function mergeNonStaffRoleWorkText_(existingText, generatedText) {
  const generatedLines = valueOrEmpty_(generatedText)
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean);
  const generatedLinePattern = /^\*\s*(?:비종사자\s*업무\s*-\s*)?\[[^\]]+\]\s*.+$/;
  const manualLines = valueOrEmpty_(existingText)
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean)
    .filter(function(line) {
      return !generatedLinePattern.test(line);
    });
  return manualLines.concat(generatedLines).join('\n');
}

function applyNonStaffRoleWorkToRowValues_(rowValues, fieldMap, dateKey, selectedYear) {
  if (fieldMap.WORK_1 === null || fieldMap.WORK_1 === undefined) {
    return;
  }
  const generatedWorkText = buildNonStaffRoleWorkTextForDate_(dateKey, selectedYear);
  const currentWorkText = getOptionalRowFieldValue_(rowValues, fieldMap, 'WORK_1');
  const nextWorkText = mergeNonStaffRoleWorkText_(currentWorkText, generatedWorkText);
  setRowValueByFieldMap_(rowValues, fieldMap, 'WORK_1', nextWorkText);
}

function applyManagerAndStaffWorkerToRowValues_(rowValues, fieldMap, dateKey, selectedYear, options) {
  const managerName = resolveManagerNameForDate_(dateKey, selectedYear);
  const staffComposition = resolveStaffCompositionForDate_(dateKey, selectedYear);
  const staffWorkerCount = staffComposition.worker;
  const annualLeaveText = getAnnualLeaveStaffChangesTextForDate_(dateKey, selectedYear);
  const staffEnabled = !options || options.staff !== false;
  const nonStaffEnabled = !options || options.nonstaff !== false;

  setRowValueByFieldMap_(rowValues, fieldMap, 'DATE', dateKey);
  if (managerName) {
    setRowValueByFieldMap_(rowValues, fieldMap, 'MANAGER', managerName);
  }
  if (staffEnabled && staffWorkerCount !== '') {
    setRowValueByFieldMap_(rowValues, fieldMap, 'STAFF_WORKER', staffWorkerCount);
  }
  if (nonStaffEnabled) {
    setOptionalRowField_(rowValues, fieldMap, 'STAFF_TEACHER', staffComposition.teacher, true);
    setOptionalRowField_(rowValues, fieldMap, 'STAFF_PUBLIC', staffComposition.public, true);
    setOptionalRowField_(rowValues, fieldMap, 'STAFF_OTHER', staffComposition.other, true);
    const nonStaffOtherText = buildNonStaffVisitorTextForDate_(dateKey, selectedYear);
    const currentVisitorReason = getOptionalRowFieldValue_(rowValues, fieldMap, 'VISITOR_REASON');
    const nextVisitorReason = mergeNonStaffOtherVisitorReasonText_(currentVisitorReason, nonStaffOtherText);
    setOptionalRowField_(rowValues, fieldMap, 'VISITOR_REASON', nextVisitorReason, false);
    applyNonStaffRoleWorkToRowValues_(rowValues, fieldMap, dateKey, selectedYear);
  }
  if (staffEnabled) {
    const existingStaffChanges = valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_CHANGES')).trim();
    const attendanceText = buildStaffAttendanceChangesText_(staffComposition);
    const withAttendance = mergeStaffAttendanceChangesText_(existingStaffChanges, attendanceText);
    const nextStaffChanges = mergeAnnualLeaveStaffChangesText_(withAttendance, annualLeaveText);
    if (nextStaffChanges) {
      setRowValueByFieldMap_(rowValues, fieldMap, 'STAFF_CHANGES', nextStaffChanges);
    }
  }
}

function applyStaffRosterToLogDataByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const rowCount = Math.max(0, logSheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  if (!rowCount) {
    return {
      year: resolvedYear,
      logSheetName: logSheet.getName(),
      updatedCount: 0,
    };
  }

  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const range = logSheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, rowCount, requiredColumns);
  const values = range.getValues();
  let updatedCount = 0;
  const nextValues = values.map(function(row) {
    const dateKey = normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]);
    if (!dateKey) {
      return row;
    }
    const nextRow = row.slice();
    applyManagerAndStaffWorkerToRowValues_(nextRow, fieldMap, dateKey, resolvedYear);
    updatedCount += 1;
    return nextRow;
  });

  range.setValues(nextValues);
  sortLogDataSheetByDate_(logSheet, fieldMap);
  formatLogDataSheet_(logSheet);
  clearAttendanceYearCache_(resolvedYear);

  return {
    year: resolvedYear,
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
  };
}

function applyStaffRosterToLogDataFor2024() {
  const result = applyStaffRosterToLogDataByYear_(2024);
  SpreadsheetApp.getUi().alert(
    '24년 종사자 현황 반영 완료',
    result.logSheetName + '에 ' + result.updatedCount + '건을 반영했습니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return result;
}

function applyStaffRosterToLogDataByDates_(dates, selectedYear, options) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const dateKeys = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  if (!dateKeys.length) {
    return { updatedCount: 0, insertedCount: 0, appliedCount: 0 };
  }

  const context = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys);
  const rowNumbers = dateKeys.map(function(dateKey) {
    return context.dateRowMap[dateKey];
  }).filter(Boolean);
  if (!rowNumbers.length) {
    return { updatedCount: 0, insertedCount: 0, appliedCount: 0 };
  }

  const minRow = Math.min.apply(null, rowNumbers);
  const maxRow = Math.max.apply(null, rowNumbers);
  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const values = getSheetValuesWithPadding_(logSheet, minRow, maxRow - minRow + 1, requiredColumns);
  let updatedCount = 0;
  dateKeys.forEach(function(dateKey) {
    const rowNumber = context.dateRowMap[dateKey];
    if (!rowNumber) return;
    const rowIndex = rowNumber - minRow;
    const row = (values[rowIndex] || new Array(requiredColumns).fill('')).slice();
    applyManagerAndStaffWorkerToRowValues_(row, fieldMap, dateKey, resolvedYear, options);
    values[rowIndex] = row;
    updatedCount += 1;
  });

  logSheet.getRange(minRow, 1, maxRow - minRow + 1, requiredColumns).setValues(values);
  clearAttendanceYearCache_(resolvedYear);
  return {
    updatedCount: updatedCount,
    insertedCount: context.insertedCount || 0,
    appliedCount: updatedCount,
  };
}

function applyStaffRosterToLogDataForYears2024To2026() {
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    try {
      const result = applyStaffRosterToLogDataByYear_(year);
      return {
        year: year,
        logSheetName: result.logSheetName,
        updatedCount: Number(result.updatedCount) || 0,
        errorMessage: '',
      };
    } catch (error) {
      return {
        year: year,
        logSheetName: '',
        updatedCount: 0,
        errorMessage: error && error.message ? error.message : String(error),
      };
    }
  });

  const lines = ['24~26년 종사자/비종사자 현황 반영 결과'];
  results.forEach(function(item) {
    if (item.errorMessage) {
      lines.push(item.year + '년: 실패 - ' + item.errorMessage);
    } else {
      lines.push(item.year + '년: ' + item.logSheetName + ' ' + item.updatedCount + '건 반영');
    }
  });
  try {
    SpreadsheetApp.getUi().alert(lines.join('\n'));
  } catch (error) {
    Logger.log('applyStaffRosterToLogDataForYears2024To2026 alert skipped: %s', error.message);
  }
  return { results: results };
}

function applyStaffChangesTextWithPositionToLogDataByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const staffChangesIndex = fieldMap.STAFF_CHANGES;
  if (staffChangesIndex === null || staffChangesIndex === undefined) {
    throw new Error("'" + logSheet.getName() + "' 시트에서 종사자 변동 칼럼을 찾지 못했습니다.");
  }
  const rowCount = Math.max(0, logSheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  if (!rowCount) {
    return { year: resolvedYear, logSheetName: logSheet.getName(), updatedCount: 0 };
  }

  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const values = getSheetValuesWithPadding_(logSheet, LOG_PRINT_CONFIG.DATA_START_ROW, rowCount, requiredColumns);
  const staffChangesValues = [];
  let updatedCount = 0;

  values.forEach(function(row) {
    const dateKey = normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]);
    if (!dateKey) {
      staffChangesValues.push([row[staffChangesIndex] || '']);
      return;
    }
    const existingStaffChanges = valueOrEmpty_(row[staffChangesIndex]).trim();
    const staffComposition = resolveStaffCompositionForDate_(dateKey, resolvedYear);
    const attendanceText = buildStaffAttendanceChangesText_(staffComposition);
    const annualLeaveText = getAnnualLeaveStaffChangesTextForDate_(dateKey, resolvedYear);
    const withAttendance = mergeStaffAttendanceChangesText_(existingStaffChanges, attendanceText);
    const nextStaffChanges = mergeAnnualLeaveStaffChangesText_(withAttendance, annualLeaveText);
    staffChangesValues.push([nextStaffChanges]);
    if (nextStaffChanges !== existingStaffChanges) {
      updatedCount += 1;
    }
  });

  logSheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, staffChangesIndex + 1, staffChangesValues.length, 1)
    .setValues(staffChangesValues);
  clearAttendanceYearCache_(resolvedYear);
  return {
    year: resolvedYear,
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
  };
}

function applyStaffChangesTextWithPositionToLogDataForYears2024To2026() {
  const years = [2024, 2025, 2026];
  return {
    results: years.map(function(year) {
      try {
        return Object.assign({ errorMessage: '' }, applyStaffChangesTextWithPositionToLogDataByYear_(year));
      } catch (error) {
        return {
          year: year,
          logSheetName: '',
          updatedCount: 0,
          errorMessage: error && error.message ? error.message : String(error),
        };
      }
    }),
  };
}

function inspectLogDataStaffChangesSamplesJson(selectedYear, dates) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const requestedYear = normalizeAttendanceYear_(selectedYear);
  const years = requestedYear ? [requestedYear] : [2024, 2025, 2026];
  const requestedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean));

  const results = years.map(function(year) {
    const logDataResult = resolveLogDataSheet_(spreadsheet, year);
    const logSheet = logDataResult.sheet;
    if (!logSheet) {
      return {
        year: year,
        logSheetName: '',
        errorMessage: logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(year) + "' 시트가 없습니다."),
        rows: [],
      };
    }

    const fieldMap = getFieldMap_(logSheet);
    const dateRowMap = buildLogDataDateRowMap_(logSheet, fieldMap);
    const sampleDates = (requestedDates.length ? requestedDates : Object.keys(dateRowMap).sort().slice(0, 5))
      .filter(function(dateKey) {
        return normalizeAttendanceYear_(dateKey.slice(0, 4)) === year;
      });
    const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
    const rows = sampleDates.map(function(dateKey) {
      const rowNumber = dateRowMap[dateKey];
      if (!rowNumber) {
        return {
          date: dateKey,
          rowNumber: null,
          staffWorker: '',
          staffChanges: '',
          errorMessage: '해당 날짜 행 없음',
        };
      }
      const rowValues = getSheetValuesWithPadding_(logSheet, rowNumber, 1, requiredColumns)[0] || [];
      return {
        date: dateKey,
        rowNumber: rowNumber,
        manager: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'MANAGER')).trim(),
        staffWorker: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_WORKER')).trim(),
        staffTeacher: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_TEACHER')).trim(),
        staffPublic: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_PUBLIC')).trim(),
        staffOther: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_OTHER')).trim(),
        staffChanges: valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_CHANGES')).trim(),
        errorMessage: '',
      };
    });

    return {
      year: year,
      logSheetName: logSheet.getName(),
      errorMessage: '',
      rows: rows,
    };
  });

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: results,
  }, null, 2);
}

function parseStaffAttendanceChangesCount_(staffChangesText) {
  const text = valueOrEmpty_(staffChangesText).trim();
  const line = text.split(/\r?\n/).map(function(item) { return item.trim(); }).filter(Boolean).find(function(item) {
    return /^출근\s*:/.test(item);
  }) || '';
  if (!line) {
    return {
      line: '',
      names: [],
      declaredCount: 0,
      nameCount: 0,
    };
  }
  const match = line.match(/^출근\s*:\s*(.*?)\s*\/\s*(\d+)\s*명/);
  const namesText = match ? match[1] : line.replace(/^출근\s*:\s*/, '');
  const seen = {};
  const names = namesText.split(/\s*,\s*/).map(function(name) {
    return valueOrEmpty_(name).trim();
  }).filter(function(name) {
    if (!name || seen[name]) return false;
    seen[name] = true;
    return true;
  });
  return {
    line: line,
    names: names,
    declaredCount: match ? toNumber_(match[2]) : names.length,
    nameCount: names.length,
  };
}

function inspectStaffWorkerConsistency2024To2026Json() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const logDataResult = resolveLogDataSheet_(spreadsheet, year);
    const logSheet = logDataResult.sheet;
    if (!logSheet) {
      return {
        year: year,
        logSheetName: '',
        totalRows: 0,
        mismatchCount: 0,
        mismatches: [],
        errorMessage: logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(year) + "' 시트가 없습니다."),
      };
    }

    const fieldMap = getFieldMap_(logSheet);
    const rowCount = Math.max(0, logSheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
    const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
    const values = rowCount
      ? getSheetValuesWithPadding_(logSheet, LOG_PRINT_CONFIG.DATA_START_ROW, rowCount, requiredColumns)
      : [];
    const mismatches = [];
    values.forEach(function(row, index) {
      const dateKey = normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]);
      if (!dateKey) return;
      const storedWorker = toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_WORKER'));
      const staffChanges = valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_CHANGES')).trim();
      const parsed = parseStaffAttendanceChangesCount_(staffChanges);
      const calculatedWorker = toNumber_(resolveStaffCompositionForDate_(dateKey, year).worker);
      const hasMismatch =
        storedWorker !== calculatedWorker ||
        parsed.nameCount !== calculatedWorker ||
        parsed.declaredCount !== calculatedWorker;
      if (hasMismatch) {
        mismatches.push({
          date: dateKey,
          rowNumber: LOG_PRINT_CONFIG.DATA_START_ROW + index,
          storedWorker: storedWorker,
          calculatedWorker: calculatedWorker,
          nameCount: parsed.nameCount,
          declaredCount: parsed.declaredCount,
          names: parsed.names,
          line: parsed.line,
        });
      }
    });

    return {
      year: year,
      logSheetName: logSheet.getName(),
      totalRows: values.filter(function(row) {
        return !!(normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]));
      }).length,
      mismatchCount: mismatches.length,
      mismatches: mismatches.slice(0, 50),
      errorMessage: '',
    };
  });

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: results,
  }, null, 2);
}

function inspectOutOfYearLogDataRowsJson() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const logDataResult = resolveLogDataSheet_(spreadsheet, year);
    const logSheet = logDataResult.sheet;
    if (!logSheet) {
      return {
        year: year,
        logSheetName: '',
        outOfYearCount: 0,
        rows: [],
        errorMessage: logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(year) + "' 시트가 없습니다."),
      };
    }
    const fieldMap = getFieldMap_(logSheet);
    const lastRow = logSheet.getLastRow();
    if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
      return {
        year: year,
        logSheetName: logSheet.getName(),
        outOfYearCount: 0,
        rows: [],
        errorMessage: '',
      };
    }
    const values = logSheet
      .getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, 1)
      .getDisplayValues();
    const rows = [];
    values.forEach(function(row, index) {
      const dateKey = normalizeAssistantDateKey_(row[0]) || normalizeDateKey_(row[0]);
      if (!dateKey) return;
      const rowYear = normalizeAttendanceYear_(dateKey.slice(0, 4));
      if (rowYear && rowYear !== year) {
        rows.push({
          rowNumber: LOG_PRINT_CONFIG.DATA_START_ROW + index,
          date: dateKey,
        });
      }
    });
    return {
      year: year,
      logSheetName: logSheet.getName(),
      outOfYearCount: rows.length,
      rows: rows.slice(0, 100),
      errorMessage: '',
    };
  });
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: results,
  }, null, 2);
}

function cleanupOutOfYearLogDataRowsForYears2024To2026() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const logDataResult = resolveLogDataSheet_(spreadsheet, year);
    const logSheet = logDataResult.sheet;
    if (!logSheet) {
      return {
        year: year,
        logSheetName: '',
        deletedCount: 0,
        deletedRows: [],
        errorMessage: logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(year) + "' 시트가 없습니다."),
      };
    }
    const fieldMap = getFieldMap_(logSheet);
    const lastRow = logSheet.getLastRow();
    if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
      return {
        year: year,
        logSheetName: logSheet.getName(),
        deletedCount: 0,
        deletedRows: [],
        errorMessage: '',
      };
    }
    const values = logSheet
      .getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, 1)
      .getDisplayValues();
    const rowsToDelete = [];
    values.forEach(function(row, index) {
      const dateKey = normalizeAssistantDateKey_(row[0]) || normalizeDateKey_(row[0]);
      if (!dateKey) return;
      const rowYear = normalizeAttendanceYear_(dateKey.slice(0, 4));
      if (rowYear && rowYear !== year) {
        rowsToDelete.push({
          rowNumber: LOG_PRINT_CONFIG.DATA_START_ROW + index,
          date: dateKey,
        });
      }
    });
    rowsToDelete.slice().reverse().forEach(function(item) {
      logSheet.deleteRow(item.rowNumber);
    });
    if (rowsToDelete.length) {
      sortLogDataSheetByDate_(logSheet, fieldMap);
      formatLogDataSheet_(logSheet);
      clearAttendanceYearCache_(year);
    }
    return {
      year: year,
      logSheetName: logSheet.getName(),
      deletedCount: rowsToDelete.length,
      deletedRows: rowsToDelete,
      errorMessage: '',
    };
  });
  return {
    results: results,
  };
}

function refreshRosterAndLogDataForYears2024To2026() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const item = {
      year: year,
      rosterCount: 0,
      annualLeaveAppliedCount: 0,
      logUpdatedCount: 0,
      errorMessage: '',
    };

    try {
      staffRosterBundleMemo_[year] = null;
      const bundle = getStaffRosterBundleByYear_(year);
      prepareStaffRosterBundleForDisplayYear_(year, bundle, true);
      item.rosterCount = Number(bundle && bundle.entries && bundle.entries.length) || 0;

      try {
        const annualResult = syncAndApplyAnnualLeaveToStaffRosterForYears_([year]);
        const annualItem = annualResult && annualResult.results && annualResult.results[0];
        if (annualItem && annualItem.errorMessage) {
          item.annualLeaveErrorMessage = annualItem.errorMessage;
        } else {
          item.annualLeaveAppliedCount = Number(annualItem && annualItem.appliedDateCount) || 0;
        }
      } catch (annualError) {
        item.annualLeaveErrorMessage = annualError && annualError.message ? annualError.message : String(annualError);
      }

      const latestBundle = getStaffRosterBundleByYear_(year);
      prepareStaffRosterBundleForDisplayYear_(year, latestBundle, true);
      const logResult = applyStaffRosterToLogDataByYear_(year);
      item.logUpdatedCount = Number(logResult && logResult.updatedCount) || 0;
      item.logSheetName = valueOrEmpty_(logResult && logResult.logSheetName);
    } catch (error) {
      item.errorMessage = error && error.message ? error.message : String(error);
    }

    return item;
  });

  const lines = ['24~26 데이터 전체 반영 결과'];
  results.forEach(function(item) {
    if (item.errorMessage) {
      lines.push(item.year + '년: 실패 - ' + item.errorMessage);
      return;
    }
    lines.push(
      item.year + '년: 현황 ' + item.rosterCount + '명 / 연가 ' +
      item.annualLeaveAppliedCount + '건 / 일지 ' + item.logUpdatedCount + '건'
    );
    if (item.annualLeaveErrorMessage) {
      lines.push('  연가 확인 필요: ' + item.annualLeaveErrorMessage);
    }
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return { results: results };
}

function runApplyStaffRosterToLogDataFor2024() {
  return applyStaffRosterToLogDataByYear_(2024);
}

function updateManagerRulesForRequestedYears_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = ensureAutomationSettingsSheet_(spreadsheet);
  const sheet = result.sheet;
  const desiredRows = [
    ['MANAGER_RULE', 'RULE_2024', '2024-01-01|2024-12-31|황민주', '형식: 시작일|종료일|담당자'],
    ['MANAGER_RULE', 'RULE_2025_H1', '2025-01-01|2025-07-31|김성은', '형식: 시작일|종료일|담당자'],
    ['MANAGER_RULE', 'RULE_2025_H2', '2025-08-01|2026-12-31|최하은', '형식: 시작일|종료일|담당자'],
    ['STAMP', '황민주', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
    ['STAMP', '김성은', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
  ];
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 4)).getDisplayValues()
    : [];
  const rowMap = {};
  values.forEach(function(row, index) {
    const section = valueOrEmpty_(row[0]).trim();
    const key = valueOrEmpty_(row[1]).trim();
    if (section && key) {
      rowMap[section + '::' + key] = index + 2;
    }
  });

  let updatedCount = 0;
  desiredRows.forEach(function(row) {
    const mapKey = row[0] + '::' + row[1];
    const rowNumber = rowMap[mapKey];
    if (rowNumber) {
      const nextValue = row[0] === 'STAMP'
        ? (valueOrEmpty_(sheet.getRange(rowNumber, 3).getDisplayValue()).trim() || row[2])
        : row[2];
      sheet.getRange(rowNumber, 1, 1, 4).setValues([[row[0], row[1], nextValue, row[3]]]);
      updatedCount += 1;
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([row]);
      updatedCount += 1;
    }
  });

  clearAutomationSettingsMemo_();
  return {
    sheetName: sheet.getName(),
    updatedCount: updatedCount,
  };
}

function refreshLogManagersForYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const sheet = logDataResult.sheet;
  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return {
      year: normalizedYear,
      sheetName: sheet.getName(),
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  const columnCount = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const values = getSheetValuesWithPadding_(sheet, LOG_PRINT_CONFIG.DATA_START_ROW, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, columnCount);
  const dateDisplayValues = sheet
    .getRange(LOG_PRINT_CONFIG.DATA_START_ROW, COL.DATE + 1, values.length, 1)
    .getDisplayValues()
    .map(function(row) {
      return row[0];
    });
  let updatedCount = 0;
  let skippedCount = 0;
  values.forEach(function(row, index) {
    const dateKey = normalizeDateKey_(dateDisplayValues[index]) || normalizeDateKey_(row[COL.DATE]);
    if (!dateKey || String(dateKey).indexOf(String(normalizedYear) + '-') !== 0) {
      skippedCount += 1;
      return;
    }
    const nextManager = resolveManagerNameForDate_(dateKey, normalizedYear);
    if (!nextManager) {
      skippedCount += 1;
      return;
    }
    const currentManager = valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'MANAGER')).trim();
    if (currentManager !== nextManager) {
      setRowValueByFieldMap_(row, fieldMap, 'MANAGER', nextManager);
      updatedCount += 1;
    }
  });

  sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, values.length, columnCount).setValues(values);
  clearAttendanceYearCache_(normalizedYear);
  return {
    year: normalizedYear,
    sheetName: sheet.getName(),
    updatedCount: updatedCount,
    skippedCount: skippedCount,
  };
}

function updateManagerRulesAndLogManagers2024To2026() {
  const settingsResult = updateManagerRulesForRequestedYears_();
  staffRosterCompositionMemo_ = {};
  annualLeaveSupportMemo_ = {};
  clearAutomationSettingsMemo_();
  const results = [2024, 2025, 2026].map(function(year) {
    return refreshLogManagersForYear_(year);
  });
  SpreadsheetApp.flush();
  return {
    settings: settingsResult,
    results: results,
  };
}

function createLogDataRowsByDateRange(selectedYear, startDate, endDate, runtimeOptions) {
  return withYearWriteLock_(selectedYear, '일지 생성', function() {
    return createLogDataRowsByDateRangeUnlocked_(selectedYear, startDate, endDate, runtimeOptions);
  });
}

function createLogDataRowsByDateRangeUnlocked_(selectedYear, startDate, endDate, runtimeOptions) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const normalizedStart = normalizeDateKey_(startDate);
  const normalizedEnd = normalizeDateKey_(endDate || startDate);
  const safeRuntimeOptions = runtimeOptions || {};

  if (!normalizedStart || !normalizedEnd) {
    throw new Error('생성할 시작일과 종료일을 입력해 주세요.');
  }
  if (normalizedStart > normalizedEnd) {
    throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
  }

  const dateKeys = buildLogCreationDateKeys_(resolvedYear, normalizedStart, normalizedEnd);
  if (!dateKeys.length) {
    return {
      year: resolvedYear,
      sheetName: getLogDataSheetNameByYear_(resolvedYear),
      requestedStartDate: normalizedStart,
      requestedEndDate: normalizedEnd,
      createdCount: 0,
      existingCount: 0,
      skippedCount: 0,
      createdDates: [],
      message: '생성할 운영일이 없습니다. 주말/공휴일 또는 선택 연도 밖 날짜만 포함되어 있습니다.',
    };
  }

  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  ensureVisibleAttendanceColumnsInLogSheet_(logSheet);
  ensureLogDetailColumnsInLogSheet_(logSheet);
  const fieldMap = getFieldMap_(logSheet);
  const beforeDateRowMap = buildLogDataDateRowMap_(logSheet, fieldMap);
  const context = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys);
  const createdDates = [];
  let existingCount = 0;

  dateKeys.forEach(function(dateKey) {
    const rowInfo = getLogSheetBatchRowValues_(context, dateKey);
    if (!rowInfo) {
      return;
    }
    const rowValues = rowInfo.values;
    if (beforeDateRowMap[dateKey]) {
      existingCount += 1;
    } else {
      createdDates.push(dateKey);
    }
    const currentDateKey = normalizeDateKey_(getOptionalRowFieldValue_(rowValues, fieldMap, 'DATE'));
    if (!currentDateKey) {
      setRowValueByFieldMap_(rowValues, fieldMap, 'DATE', dateKey);
    }
    setLogSheetBatchRowValues_(context, rowInfo, rowValues);
  });

  commitLogSheetBatchUpdate_(logSheet, context);
  let integrationResult = null;
  let integrationError = '';
  const shouldIntegrate = safeRuntimeOptions.integrate !== false;
  const integrationDates = shouldIntegrate
    ? (safeRuntimeOptions.applyExisting === false ? createdDates : dateKeys)
    : [];

  if (integrationDates.length) {
    const operatingMode = valueOrEmpty_(safeRuntimeOptions.operatingMode).trim();
    const operatingManualText = valueOrEmpty_(safeRuntimeOptions.operatingManualText).trim();
    const operatingStartDate = normalizeDateKey_(safeRuntimeOptions.operatingStartDate) || normalizedStart;
    const operatingEndDate = normalizeDateKey_(safeRuntimeOptions.operatingEndDate) || normalizedEnd;
    try {
      integrationResult = applyIntegratedStatsToLogDataByDatesUnlocked_(
        integrationDates,
        resolvedYear,
        operatingMode,
        operatingManualText,
        normalizeIntegrationOptions_(safeRuntimeOptions.options || safeRuntimeOptions.integrationOptions || {}),
        operatingStartDate,
        operatingEndDate
      );
    } catch (error) {
      integrationError = error && error.message ? error.message : String(error);
    }
  }
  clearAttendanceYearCache_(resolvedYear);
  SpreadsheetApp.flush();

  return {
    year: resolvedYear,
    sheetName: logSheet.getName(),
    requestedStartDate: normalizedStart,
    requestedEndDate: normalizedEnd,
    targetCount: dateKeys.length,
    createdCount: createdDates.length,
    existingCount: existingCount,
    skippedCount: countDateRangeDays_(normalizedStart, normalizedEnd) - dateKeys.length,
    createdDates: createdDates,
    integrationTargetCount: integrationDates.length,
    integratedCount: integrationResult ? integrationResult.appliedCount : 0,
    integrationError: integrationError,
    integrationResult: integrationResult,
  };
}

function buildLogCreationDateKeys_(selectedYear, startDate, endDate) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const start = parseDateKeyAsKstDate_(startDate);
  const end = parseDateKeyAsKstDate_(endDate);
  const holidayLookup = getKnownHolidayLookupForYear_(normalizedYear);
  const dateKeys = [];

  if (!start || !end) {
    return dateKeys;
  }

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor.getTime() <= end.getTime()) {
    const dateKey = Utilities.formatDate(cursor, LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd');
    if (String(dateKey).indexOf(String(normalizedYear) + '-') === 0 &&
        !isWeekendDateKey_(dateKey) &&
        !holidayLookup[dateKey]) {
      dateKeys.push(dateKey);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dateKeys;
}

function countDateRangeDays_(startDate, endDate) {
  const start = parseDateKeyAsKstDate_(startDate);
  const end = parseDateKeyAsKstDate_(endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function getKnownHolidayLookupForYear_(selectedYear) {
  const year = String(normalizeAttendanceYear_(selectedYear) || '');
  const holidayMap = {
    2024: {
      '2024-01-01': true, '2024-02-09': true, '2024-02-12': true, '2024-03-01': true,
      '2024-04-10': true, '2024-05-06': true, '2024-05-15': true, '2024-06-06': true,
      '2024-08-15': true, '2024-09-16': true, '2024-09-17': true, '2024-09-18': true,
      '2024-10-03': true, '2024-10-09': true, '2024-12-25': true,
    },
    2025: {
      '2025-01-01': true, '2025-01-27': true, '2025-01-28': true, '2025-01-29': true,
      '2025-01-30': true, '2025-03-03': true, '2025-05-05': true, '2025-05-06': true,
      '2025-06-06': true, '2025-08-15': true, '2025-10-03': true, '2025-10-06': true,
      '2025-10-07': true, '2025-10-08': true, '2025-10-09': true, '2025-12-25': true,
    },
    2026: {
      '2026-01-01': true, '2026-02-16': true, '2026-02-17': true, '2026-02-18': true,
      '2026-03-02': true, '2026-05-05': true, '2026-05-25': true, '2026-06-03': true,
      '2026-06-06': true, '2026-08-17': true, '2026-09-24': true, '2026-09-25': true,
      '2026-09-26': true, '2026-10-05': true, '2026-10-09': true, '2026-12-25': true,
    },
  };
  return holidayMap[year] || {};
}

function buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys) {
  const safeDateKeys = uniqueStrings_(dateKeys || []).filter(Boolean).sort();
  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  ensureSheetCapacity_(logSheet, Math.max(logSheet.getMaxRows(), LOG_PRINT_CONFIG.DATA_START_ROW), requiredColumns);
  const dateRowMap = buildLogDataDateRowMap_(logSheet, fieldMap);
  const missingDateKeys = [];
  let insertedCount = 0;

  safeDateKeys.forEach(function(dateKey) {
    if (!dateRowMap[dateKey]) {
      missingDateKeys.push(dateKey);
    }
  });

  if (missingDateKeys.length) {
    ensureSheetCapacity_(logSheet, Math.max(logSheet.getLastRow() + missingDateKeys.length, LOG_PRINT_CONFIG.DATA_START_ROW), requiredColumns);
    const appendedRows = appendEmptyLogDataRows_(logSheet, fieldMap, missingDateKeys.length);
    missingDateKeys.forEach(function(dateKey, index) {
      dateRowMap[dateKey] = appendedRows[index];
      insertedCount += 1;
    });
  }

  const targetRows = safeDateKeys
    .map(function(dateKey) { return dateRowMap[dateKey]; })
    .filter(Boolean)
    .sort(function(left, right) { return left - right; });

  if (!targetRows.length) {
    return {
      requiredColumns: requiredColumns,
      dateRowMap: dateRowMap,
      insertedCount: insertedCount,
      hasTargets: false,
      blockValues: [],
      minRow: 0,
      maxRow: 0,
    };
  }

  const minRow = targetRows[0];
  const maxRow = targetRows[targetRows.length - 1];
  ensureSheetCapacity_(logSheet, maxRow, requiredColumns);
  return {
    requiredColumns: requiredColumns,
    dateRowMap: dateRowMap,
    insertedCount: insertedCount,
    hasTargets: true,
    minRow: minRow,
    maxRow: maxRow,
    blockValues: getSheetValuesWithPadding_(logSheet, minRow, maxRow - minRow + 1, requiredColumns),
  };
}

function getLogSheetBatchRowValues_(context, dateKey) {
  if (!context || !context.hasTargets) {
    return null;
  }
  const rowNumber = context.dateRowMap[dateKey];
  if (!rowNumber) {
    return null;
  }
  const blockIndex = rowNumber - context.minRow;
  return {
    rowNumber: rowNumber,
    blockIndex: blockIndex,
    values: (context.blockValues[blockIndex] || new Array(context.requiredColumns).fill('')).slice(),
  };
}

function setLogSheetBatchRowValues_(context, rowInfo, rowValues) {
  if (!context || !rowInfo) {
    return;
  }
  context.blockValues[rowInfo.blockIndex] = rowValues;
}

function commitLogSheetBatchUpdate_(logSheet, context) {
  if (!context || !context.hasTargets || !context.blockValues.length) {
    return;
  }
  ensureSheetCapacity_(logSheet, context.maxRow, context.requiredColumns);
  logSheet.getRange(context.minRow, 1, context.blockValues.length, context.requiredColumns).setValues(context.blockValues);
}

function hasStoredDataRows_(stored) {
  return !!(stored && stored.rows && stored.rows.length);
}

function readAnnualLeaveStoredBundle_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('annual_leave', normalizedYear);
  return {
    stored: stored,
    textByDate: stored ? readAnnualLeaveSummaryByDateFromStored_(stored, normalizedYear) : {},
    countByDate: stored ? readAnnualLeaveCountByDateFromStored_(stored, normalizedYear) : {},
  };
}

function getAnnualLeaveStaffChangesTextForDate_(dateKey, selectedYear) {
  const normalizedDate = normalizeDateKey_(dateKey);
  if (!normalizedDate) {
    return '';
  }
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    normalizeAttendanceYear_(normalizedDate.slice(0, 4)) ||
    LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const annualLeaveBundle = readAnnualLeaveStoredBundle_(normalizedYear);
  return valueOrEmpty_(annualLeaveBundle && annualLeaveBundle.textByDate && annualLeaveBundle.textByDate[normalizedDate]).trim();
}

function previewIntegratedStatsToLogDataByDates(dates, selectedYear, operatingMode, operatingManualText, options, operatingStartDate, operatingEndDate) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const normalizedOptions = normalizeIntegrationOptions_(options);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  const rawDateKeys = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();

  if (!rawDateKeys.length) {
    throw new Error('미리볼 날짜가 없습니다.');
  }

  const weekdayDateKeys = filterOutWeekendDateKeys_(rawDateKeys);
  if (!weekdayDateKeys.length) {
    throw new Error('선택한 날짜가 모두 주말이라 일지 작성 대상이 없습니다.');
  }

  const fieldMap = getFieldMap_(logSheet);
  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const dateRowMap = buildLogDataDateRowMap_(logSheet, fieldMap);
  const existingRowNumbers = weekdayDateKeys.map(function(dateKey) {
    return dateRowMap[dateKey];
  }).filter(Boolean);
  const existingRowsByDate = {};

  if (existingRowNumbers.length) {
    const minRow = Math.min.apply(null, existingRowNumbers);
    const maxRow = Math.max.apply(null, existingRowNumbers);
    const blockValues = getSheetValuesWithPadding_(logSheet, minRow, maxRow - minRow + 1, requiredColumns);
    weekdayDateKeys.forEach(function(dateKey) {
      const rowNumber = dateRowMap[dateKey];
      if (!rowNumber) {
        return;
      }
      existingRowsByDate[dateKey] = (blockValues[rowNumber - minRow] || new Array(requiredColumns).fill('')).slice();
    });
  }

  const statsByDate = {};
  if (normalizedOptions.attendance) {
    readAttendanceStatsRowsByYear_(resolvedYear).forEach(function(item) {
      if (item && item.date) {
        statsByDate[item.date] = item;
      }
    });
  }

  const annualLeaveBundle = normalizedOptions.annual ? readAnnualLeaveStoredBundle_(resolvedYear) : null;
  const educationBundle = normalizedOptions.education ? readStaffEducationStoredBundle_(resolvedYear) : null;
  const programByDate = normalizedOptions.program ? readProgramJournalSummaryByDate_(resolvedYear) : {};
  const annualLeaveByDate = annualLeaveBundle ? annualLeaveBundle.textByDate : {};
  const educationByDate = educationBundle ? educationBundle.summaryByDate : {};

  const operatingHoursText = buildOperatingHoursText_(operatingMode, operatingManualText);
  const operatingDateLookup = operatingHoursText
    ? buildOperatingDateLookup_(weekdayDateKeys, normalizeDateKey_(operatingStartDate), normalizeDateKey_(operatingEndDate))
    : {};

  const previewRows = weekdayDateKeys.map(function(dateKey) {
      const currentRow = (existingRowsByDate[dateKey] || new Array(requiredColumns).fill('')).slice();
      let nextRow = currentRow.slice();
      const rowNotes = [];
      const hasAttendance = !!statsByDate[dateKey];
      const annualLeaveText = annualLeaveByDate[dateKey] || '';
      const educationSummary = educationByDate[dateKey] || {};
      const programItems = programByDate[dateKey] || [];
      const programTitle = buildProgramJournalTitleText_(programItems);

    if (hasAttendance) {
      nextRow = buildUpdatedLogRowValuesFromStats_(nextRow, fieldMap, statsByDate[dateKey], normalizedOptions);
      rowNotes.push('아동출결');
    }

    if (operatingDateLookup[dateKey]) {
      nextRow = applyOperatingHoursToRowValues_(nextRow, fieldMap, operatingHoursText);
      rowNotes.push('운영');
    }

    if (normalizedOptions.staff || normalizedOptions.nonstaff) {
      applyManagerAndStaffWorkerToRowValues_(nextRow, fieldMap, dateKey, resolvedYear, normalizedOptions);
      if (normalizedOptions.staff) rowNotes.push('종사자');
      if (normalizedOptions.nonstaff) rowNotes.push('비 종사자');
    }

    if (annualLeaveText) {
      const existingStaffChanges = valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'STAFF_CHANGES')).trim();
      applyManagerAndStaffWorkerToRowValues_(nextRow, fieldMap, dateKey, resolvedYear, normalizedOptions);
      setRowValueByFieldMap_(nextRow, fieldMap, 'STAFF_CHANGES', mergeAnnualLeaveStaffChangesText_(existingStaffChanges, annualLeaveText));
    }

    if (educationSummary.offlineText || educationSummary.onlineText) {
      applyManagerAndStaffWorkerToRowValues_(nextRow, fieldMap, dateKey, resolvedYear, normalizedOptions);
      const existingStaffChanges = valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'STAFF_CHANGES')).trim();
      const staffChangesWithOffline = mergeStaffEducationText_(existingStaffChanges, educationSummary.offlineText, '집합');
      setRowValueByFieldMap_(nextRow, fieldMap, 'STAFF_CHANGES', mergeStaffEducationText_(staffChangesWithOffline, educationSummary.onlineText, '온라인'));
      rowNotes.push('종사자 교육');
    }

      if (programItems.length) {
        rowNotes.push('프로그램');
      }

    return {
      date: dateKey,
      actions: rowNotes.join(', ') || '-',
      attendanceCurrent: toNumber_(getOptionalRowFieldValue_(nextRow, fieldMap, 'ATTENDANCE_CURRENT')),
      attendancePresent: toNumber_(getOptionalRowFieldValue_(nextRow, fieldMap, 'ATTENDANCE_PRESENT')),
      attendanceOfficial: toNumber_(getOptionalRowFieldValue_(nextRow, fieldMap, 'ATTENDANCE_OFFICIAL')),
      attendanceAbsent: toNumber_(getOptionalRowFieldValue_(nextRow, fieldMap, 'ATTENDANCE_ABSENT')),
      operatingHours: valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'OPERATING_HOURS')).trim(),
        manager: valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'MANAGER')).trim(),
        staffWorker: valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'STAFF_WORKER')).trim(),
        staffChanges: valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'STAFF_CHANGES')).trim(),
        work1: valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'WORK_1')).trim(),
        programTitle: programTitle,
      };
    });

  return {
    year: resolvedYear,
    dateCount: previewRows.length,
    skippedWeekendCount: rawDateKeys.length - weekdayDateKeys.length,
    rows: previewRows,
    operatingHours: operatingHoursText,
    options: normalizedOptions,
  };
}

function applyIntegratedStatsToLogDataByDates(dates, selectedYear, operatingMode, operatingManualText, options, operatingStartDate, operatingEndDate) {
  return withYearWriteLock_(selectedYear, '일지데이터 반영', function() {
    return applyIntegratedStatsToLogDataByDatesUnlocked_(dates, selectedYear, operatingMode, operatingManualText, options, operatingStartDate, operatingEndDate);
  });
}

function applyIntegratedStatsToLogDataByDatesUnlocked_(dates, selectedYear, operatingMode, operatingManualText, options, operatingStartDate, operatingEndDate) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const normalizedOptions = normalizeIntegrationOptions_(options);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  ensureVisibleAttendanceColumnsInLogSheet_(logSheet);
  ensureLogDetailColumnsInLogSheet_(logSheet);

  const rawDateKeys = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();

  if (!rawDateKeys.length) {
    throw new Error('반영할 날짜가 없습니다.');
  }

  const dateKeys = filterOutWeekendDateKeys_(rawDateKeys);
  if (!dateKeys.length) {
    throw new Error('선택한 날짜가 모두 주말이라 일지 작성 대상이 없습니다.');
  }

  let attendanceAppliedCount = 0;
  let staffAppliedCount = 0;
  let nonStaffAppliedCount = 0;
  let annualAppliedCount = 0;
  let educationAppliedCount = 0;
  let programAppliedCount = 0;
  let updatedCount = 0;
  let insertedCount = 0;
  const operatingHoursText = buildOperatingHoursText_(operatingMode, operatingManualText);

  if (normalizedOptions.attendance) {
    const attendanceLookup = {};
    dateKeys.forEach(function(dateKey) {
      attendanceLookup[dateKey] = true;
    });
    const statsRows = readAttendanceStatsRowsByYear_(resolvedYear).filter(function(item) {
      return attendanceLookup[item.date];
    });
    if (statsRows.length) {
      const attendanceResult = applyAttendanceStatsRowsToLogSheet_(logSheet, statsRows);
      updatedCount += attendanceResult.updatedCount;
      insertedCount += attendanceResult.insertedCount;
      attendanceAppliedCount = statsRows.length;
    }
  }

  if (operatingHoursText) {
    const operatingDates = Object.keys(buildOperatingDateLookup_(dateKeys, normalizeDateKey_(operatingStartDate), normalizeDateKey_(operatingEndDate)));
    if (operatingDates.length) {
      applyOperatingHoursToLogDataByDates(operatingDates, resolvedYear, operatingMode, operatingManualText, {
        deferFlush: true,
      });
    }
  }

  if (normalizedOptions.attendance || normalizedOptions.staff || normalizedOptions.nonstaff) {
    const rosterResult = applyStaffRosterToLogDataByDates_(dateKeys, resolvedYear, normalizedOptions);
    updatedCount += rosterResult.updatedCount;
    insertedCount += rosterResult.insertedCount;
    if (normalizedOptions.staff) staffAppliedCount = rosterResult.appliedCount;
    if (normalizedOptions.nonstaff) nonStaffAppliedCount = rosterResult.appliedCount;
  }

  if (normalizedOptions.annual) {
    const annualResult = applyAnnualLeaveToLogDataByDates_(dateKeys, resolvedYear);
    updatedCount += annualResult.updatedCount;
    insertedCount += annualResult.insertedCount;
    annualAppliedCount = annualResult.appliedCount;
  }

  if (normalizedOptions.education) {
    const educationResult = applyStaffEducationToLogDataByDates_(dateKeys, resolvedYear);
    updatedCount += educationResult.updatedCount;
    insertedCount += educationResult.insertedCount;
    educationAppliedCount = educationResult.appliedCount;
  }

  if (normalizedOptions.program) {
      const programResult = applyProgramJournalToLogDataByDates_(dateKeys, resolvedYear, {
        deferSort: true,
        deferFlush: true,
      });
      updatedCount += programResult.updatedCount;
      insertedCount += programResult.insertedCount;
      programAppliedCount = programResult.appliedCount;
      replaceProgramAppliedDatesForSelection_(resolvedYear, dateKeys, programResult.appliedDates || []);
    }

  removeAttendanceHiddenDates_(resolvedYear, dateKeys);

  if (insertedCount > 0) {
    sortLogDataSheetByDate_(logSheet, getFieldMap_(logSheet));
  }
  SpreadsheetApp.flush();
  formatLogDataSheet_(logSheet);
  clearAttendanceYearCache_(resolvedYear);

  return {
    year: resolvedYear,
    updatedCount: updatedCount,
    insertedCount: insertedCount,
    appliedCount: dateKeys.length,
    skippedWeekendCount: rawDateKeys.length - dateKeys.length,
    attendanceAppliedCount: attendanceAppliedCount,
    staffAppliedCount: staffAppliedCount,
    nonStaffAppliedCount: nonStaffAppliedCount,
    annualAppliedCount: annualAppliedCount,
    educationAppliedCount: educationAppliedCount,
    programAppliedCount: programAppliedCount,
    operatingHours: operatingHoursText,
  };
}

const LINKED_LOG_DATA_ATTENDANCE_FIELD_KEYS_ = Object.freeze([
  'DATE',
  'MALE_PRESCHOOL',
  'MALE_OUT_OF_SCHOOL',
  'MALE_ELEMENTARY',
  'MALE_MIDDLE',
  'MALE_HIGH',
  'MALE_OTHER',
  'FEMALE_PRESCHOOL',
  'FEMALE_OUT_OF_SCHOOL',
  'FEMALE_ELEMENTARY',
  'FEMALE_MIDDLE',
  'FEMALE_HIGH',
  'FEMALE_OTHER',
  'ATTENDANCE_CAPACITY',
  'ATTENDANCE_CURRENT',
  'ATTENDANCE_PRESENT',
  'ATTENDANCE_OFFICIAL',
  'ATTENDANCE_ALTERNATIVE',
  'ATTENDANCE_ABSENT',
  'ATTENDANCE_OTHER',
  'CHILD_CHANGES',
]);

const LINKED_LOG_DATA_MEAL_FIELD_KEYS_ = Object.freeze([
  'MEAL_BREAKFAST',
  'MEAL_LUNCH',
  'MEAL_DINNER',
]);

const LINKED_LOG_DATA_NUMERIC_COMPARE_FIELDS_ = Object.freeze({
  MALE_PRESCHOOL: true,
  MALE_OUT_OF_SCHOOL: true,
  MALE_ELEMENTARY: true,
  MALE_MIDDLE: true,
  MALE_HIGH: true,
  MALE_OTHER: true,
  FEMALE_PRESCHOOL: true,
  FEMALE_OUT_OF_SCHOOL: true,
  FEMALE_ELEMENTARY: true,
  FEMALE_MIDDLE: true,
  FEMALE_HIGH: true,
  FEMALE_OTHER: true,
  ATTENDANCE_CAPACITY: true,
  ATTENDANCE_CURRENT: true,
  ATTENDANCE_PRESENT: true,
  ATTENDANCE_OFFICIAL: true,
  ATTENDANCE_ALTERNATIVE: true,
  ATTENDANCE_ABSENT: true,
  ATTENDANCE_OTHER: true,
  MEAL_BREAKFAST: true,
  MEAL_LUNCH: true,
  MEAL_DINNER: true,
});

function isWeekendDateKey_(dateKey) {
  const parsedDate = parseDateKeyAsKstDate_(dateKey);
  if (!parsedDate) {
    return false;
  }
  const day = parsedDate.getDay();
  return day === 0 || day === 6;
}

function removeBlankWeekendLogRowsForYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet || logSheet.getLastRow() < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return { removedCount: 0, removedDates: [] };
  }

  const fieldMap = getFieldMap_(logSheet);
  const rowCount = logSheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1;
  const columnCount = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const values = getSheetValuesWithPadding_(logSheet, LOG_PRINT_CONFIG.DATA_START_ROW, rowCount, columnCount);
  const rowsToDelete = [];

  values.forEach(function(row, index) {
    const dateKey = normalizeDateKey_(row[fieldMap.DATE]);
    if (!dateKey || !isWeekendDateKey_(dateKey)) {
      return;
    }

    const hasOtherValue = row.some(function(value, columnIndex) {
      if (columnIndex === fieldMap.DATE) {
        return false;
      }
      return valueOrEmpty_(value).trim() !== '';
    });
    if (!hasOtherValue) {
      rowsToDelete.push({
        rowNumber: LOG_PRINT_CONFIG.DATA_START_ROW + index,
        date: dateKey,
      });
    }
  });

  rowsToDelete.sort(function(left, right) {
    return right.rowNumber - left.rowNumber;
  }).forEach(function(item) {
    logSheet.deleteRow(item.rowNumber);
  });

  return {
    removedCount: rowsToDelete.length,
    removedDates: rowsToDelete.map(function(item) { return item.date; }).sort(),
  };
}

function auditAndApplyLinkedLogDataForYears2024To2026() {
  const years = [2024, 2025, 2026];
  return {
    results: years.map(function(year) {
      return auditAndApplyLinkedLogDataForYear(year);
    }),
  };
}

function auditAndApplyLinkedLogDataForYear(selectedYear) {
  return withYearWriteLock_(selectedYear, '연동 데이터 점검/적용', function() {
    return auditAndApplyLinkedLogDataForYearUnlocked_(selectedYear);
  });
}

function auditAndApplyLinkedLogDataForYearUnlocked_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  ensureVisibleAttendanceColumnsInLogSheet_(logSheet);
  ensureLogDetailColumnsInLogSheet_(logSheet);
  const fieldMap = getFieldMap_(logSheet);
  const statsByDate = {};
  readAttendanceStatsRowsByYear_(normalizedYear).forEach(function(stats) {
    const dateKey = normalizeDateKey_(stats && stats.date);
    if (!dateKey) {
      return;
    }
    stats.date = dateKey;
    statsByDate[dateKey] = stats;
  });

  const educationBundle = readStaffEducationStoredBundle_(normalizedYear);
  const educationByDate = educationBundle.summaryByDate || {};
  const programByDate = readProgramJournalSummaryByDate_(normalizedYear) || {};
  const programDates = filterOutWeekendDateKeys_(Object.keys(programByDate).filter(function(dateKey) {
    return programByDate[dateKey] && programByDate[dateKey].length;
  }).sort());
  const targetDates = filterOutWeekendDateKeys_(uniqueStrings_(
    Object.keys(statsByDate)
      .concat(Object.keys(educationByDate || {}))
      .concat(programDates)
  ).filter(Boolean).sort());
  const cleanupResult = removeBlankWeekendLogRowsForYear_(normalizedYear);

  const result = {
    year: normalizedYear,
    logSheetName: logSheet.getName(),
    targetDateCount: targetDates.length,
    insertedCount: 0,
    changedRowCount: 0,
    attendanceSourceCount: Object.keys(statsByDate).length,
    attendanceAppliedCount: 0,
    childStatusFixedCount: 0,
    mealFixedCount: 0,
    educationSourceCount: Object.keys(educationByDate || {}).length,
    educationAppliedCount: 0,
    programSourceCount: programDates.length,
    programAppliedCount: 0,
    programFixedCount: 0,
    removedWeekendBlankRowsCount: cleanupResult.removedCount,
    changedSamples: [],
  };

  if (!targetDates.length) {
    clearAttendanceYearCache_(normalizedYear);
    return result;
  }

  const context = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, targetDates);
  result.insertedCount = context.insertedCount || 0;

  if (context.hasTargets) {
    targetDates.forEach(function(dateKey) {
      const rowInfo = getLogSheetBatchRowValues_(context, dateKey);
      if (!rowInfo) {
        return;
      }

      const originalRow = rowInfo.values.slice();
      let nextRow = rowInfo.values.slice();
      setRowValueByFieldMap_(nextRow, fieldMap, 'DATE', dateKey);

      const stats = statsByDate[dateKey];
      if (stats) {
        const beforeAttendance = nextRow.slice();
        nextRow = buildUpdatedLogRowValuesFromStats_(nextRow, fieldMap, stats, {
          staff: false,
          nonstaff: false,
        });
        if (rowValuesDifferForFields_(beforeAttendance, nextRow, fieldMap, LINKED_LOG_DATA_ATTENDANCE_FIELD_KEYS_)) {
          result.attendanceAppliedCount += 1;
        }
        if (rowValuesDifferForFields_(beforeAttendance, nextRow, fieldMap, [
          'ATTENDANCE_OFFICIAL',
          'ATTENDANCE_ABSENT',
          'CHILD_CHANGES',
        ])) {
          result.childStatusFixedCount += 1;
        }
      }

      const operatingHours = valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'OPERATING_HOURS')).trim();
      if (detectOperatingMode_(operatingHours)) {
        const beforeMeal = nextRow.slice();
        nextRow = applyOperatingHoursToRowValues_(nextRow, fieldMap, operatingHours);
        if (rowValuesDifferForFields_(beforeMeal, nextRow, fieldMap, LINKED_LOG_DATA_MEAL_FIELD_KEYS_)) {
          result.mealFixedCount += 1;
        }
      }

      const educationSummary = educationByDate[dateKey] || {};
      if (educationSummary.offlineText || educationSummary.onlineText) {
        const beforeEducation = nextRow.slice();
        const existingStaffChanges = valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'STAFF_CHANGES')).trim();
        const staffChangesWithOffline = mergeStaffEducationText_(existingStaffChanges, educationSummary.offlineText, '집합');
        setRowValueByFieldMap_(
          nextRow,
          fieldMap,
          'STAFF_CHANGES',
          mergeStaffEducationText_(staffChangesWithOffline, educationSummary.onlineText, '온라인')
        );
        if (rowValuesDifferForFields_(beforeEducation, nextRow, fieldMap, ['STAFF_CHANGES'])) {
          result.educationAppliedCount += 1;
        }
      }

      const linkedFieldKeys = LINKED_LOG_DATA_ATTENDANCE_FIELD_KEYS_
        .concat(LINKED_LOG_DATA_MEAL_FIELD_KEYS_)
        .concat(['STAFF_CHANGES']);
      const changedFieldKeys = getChangedFieldKeysForRow_(
        originalRow,
        nextRow,
        fieldMap,
        linkedFieldKeys
      );

      if (changedFieldKeys.length) {
        setLogSheetBatchRowValues_(context, rowInfo, nextRow);
        result.changedRowCount += 1;
        if (result.changedSamples.length < 10) {
          result.changedSamples.push({
            date: dateKey,
            rowNumber: rowInfo.rowNumber,
            fields: changedFieldKeys,
            fieldsText: changedFieldKeys.join(', '),
          });
        }
      }
    });

    commitLogSheetBatchUpdate_(logSheet, context);
  }

  const previousProgramAppliedLookup = {};
  readProgramAppliedDates_(normalizedYear).forEach(function(dateKey) {
    previousProgramAppliedLookup[dateKey] = true;
  });
  const programDateLookup = {};
  programDates.forEach(function(dateKey) {
    programDateLookup[dateKey] = true;
  });
  const missingProgramDates = programDates.filter(function(dateKey) {
    return !previousProgramAppliedLookup[dateKey];
  });
  const staleProgramDates = Object.keys(previousProgramAppliedLookup).filter(function(dateKey) {
    return !programDateLookup[dateKey];
  });
  writeProgramAppliedDates_(normalizedYear, programDates);
  result.programAppliedCount = programDates.length;
  result.programFixedCount = missingProgramDates.length + staleProgramDates.length;

  SpreadsheetApp.flush();
  clearAttendanceYearCache_(normalizedYear);
  return result;
}

function applyOperatingHoursToLogDataByDates(dates, selectedYear, mode, manualText, runtimeOptions) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const dataSheet = logDataResult.sheet;

  if (!dataSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
  }
  ensureVisibleAttendanceColumnsInLogSheet_(dataSheet);
  ensureLogDetailColumnsInLogSheet_(dataSheet);
  const fieldMap = getFieldMap_(dataSheet);
  const dateColumnIndex = fieldMap.DATE == null ? COL.DATE : fieldMap.DATE;
  const operatingColumnIndex = fieldMap.OPERATING_HOURS == null ? COL.OPERATING_HOURS : fieldMap.OPERATING_HOURS;

  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();

  if (!normalizedDates.length) {
    throw new Error('운영시간을 반영할 날짜가 없습니다.');
  }

  const operatingHoursText = buildOperatingHoursText_(mode, manualText);
  if (!operatingHoursText) {
    throw new Error('운영시간 입력값이 비어 있습니다.');
  }

  const lastRow = dataSheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return {
      appliedCount: 0,
      skippedCount: normalizedDates.length,
      skippedDates: normalizedDates,
      insertedCount: 0,
      operatingHours: operatingHoursText,
      sheetName: dataSheet.getName(),
      targetColumn: columnNumberToLetter_(operatingColumnIndex + 1),
      firstAppliedDate: '',
      firstAppliedRow: null,
      firstAppliedA1Notation: '',
    };
  }

  const rowCount = lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1;
  const dateValues = dataSheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, dateColumnIndex + 1, rowCount, 1).getValues();
  const dateRowMap = {};

  dateValues.forEach(function(row, index) {
    const dateKey = normalizeDateKey_(row[0]);
    if (dateKey) {
      dateRowMap[dateKey] = LOG_PRINT_CONFIG.DATA_START_ROW + index;
    }
  });

  const skippedDates = normalizedDates.filter(function(dateKey) {
    return !dateRowMap[dateKey];
  });
  const targetDates = normalizedDates.filter(function(dateKey) {
    return !!dateRowMap[dateKey];
  });

  let mealUpdatedCount = 0;
  if (targetDates.length) {
    const targetRows = targetDates.map(function(dateKey) {
      return dateRowMap[dateKey];
    }).filter(Boolean).sort(function(left, right) {
      return left - right;
    });
    const minRow = targetRows[0];
    const maxRow = targetRows[targetRows.length - 1];
    const requiredColumns = Math.max(dataSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
    const blockValues = getSheetValuesWithPadding_(dataSheet, minRow, maxRow - minRow + 1, requiredColumns);

    targetDates.forEach(function(dateKey) {
      const rowNumber = dateRowMap[dateKey];
      if (!rowNumber) {
        return;
      }
      const blockIndex = rowNumber - minRow;
      const beforeRow = (blockValues[blockIndex] || new Array(requiredColumns).fill('')).slice();
      const nextRow = applyOperatingHoursToRowValues_(beforeRow, fieldMap, operatingHoursText);
      if (rowValuesDifferForFields_(beforeRow, nextRow, fieldMap, ['MEAL_BREAKFAST', 'MEAL_LUNCH', 'MEAL_DINNER'])) {
        mealUpdatedCount += 1;
      }
      blockValues[blockIndex] = nextRow;
    });

    dataSheet.getRange(minRow, 1, blockValues.length, requiredColumns).setValues(blockValues);
  }

  const firstAppliedDate = targetDates[0] || '';
  const firstAppliedRow = firstAppliedDate ? dateRowMap[firstAppliedDate] || null : null;
  const firstAppliedRange = firstAppliedRow ? dataSheet.getRange(firstAppliedRow, operatingColumnIndex + 1) : null;

  if (!(runtimeOptions && runtimeOptions.deferFlush)) {
    SpreadsheetApp.flush();
    formatLogDataSheet_(dataSheet);
    clearAttendanceYearCache_(resolvedYear);
  }
  return {
    appliedCount: targetDates.length,
    skippedCount: skippedDates.length,
    skippedDates: skippedDates,
    insertedCount: 0,
    mealUpdatedCount: mealUpdatedCount,
    operatingHours: operatingHoursText,
    sheetName: dataSheet.getName(),
    targetColumn: columnNumberToLetter_(operatingColumnIndex + 1),
    firstAppliedDate: firstAppliedDate,
    firstAppliedRow: firstAppliedRow,
    firstAppliedA1Notation: firstAppliedRange ? firstAppliedRange.getA1Notation() : '',
  };
}

function filterOutWeekendDateKeys_(dateKeys) {
  return uniqueStrings_((dateKeys || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).filter(function(dateKey) {
    const parsedDate = parseDateKeyAsKstDate_(dateKey);
    if (!parsedDate) {
      return false;
    }
    const day = parsedDate.getDay();
    return day !== 0 && day !== 6;
  }).sort();
}

function applyOperatingHoursToLogDataByRange(selectedYear, startDate, endDate, mode, manualText) {
  return withYearWriteLock_(selectedYear, '운영시간 반영', function() {
    return applyOperatingHoursToLogDataByRangeUnlocked_(selectedYear, startDate, endDate, mode, manualText);
  });
}

function applyOperatingHoursToLogDataByRangeUnlocked_(selectedYear, startDate, endDate, mode, manualText) {
  const normalizedStart = normalizeDateKey_(startDate);
  const normalizedEnd = normalizeDateKey_(endDate);
  if (!normalizedStart || !normalizedEnd) {
    throw new Error('운영 시작일과 종료일을 입력해 주세요.');
  }
  if (normalizedStart > normalizedEnd) {
    throw new Error('운영 시작일이 종료일보다 늦을 수 없습니다.');
  }

  const dates = [];
  let cursor = parseDateKeyAsKstDate_(normalizedStart);
  const end = parseDateKeyAsKstDate_(normalizedEnd);
  if (!cursor || !end) {
    throw new Error('운영 기간 날짜를 해석하지 못했습니다.');
  }

  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatDate_(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  const result = applyOperatingHoursToLogDataByDates(dates, selectedYear, mode, manualText);
  return Object.assign({}, result, {
    startDate: normalizedStart,
    endDate: normalizedEnd,
  });
}

function createWriteOperationId_(year, actionName) {
  const safeYear = normalizeAttendanceYear_(year) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 1000000).toString(36);
  return [safeYear, valueOrEmpty_(actionName).replace(/\s+/g, '_'), timestamp, random].join('-');
}

function withYearWriteLock_(selectedYear, actionName, callback, options) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const operationName = valueOrEmpty_(actionName).trim() || '저장 작업';
  const operationId = createWriteOperationId_(normalizedYear, operationName);
  const startedAt = new Date();
  const lockOptions = options || {};
  const lock = LockService.getDocumentLock();
  const locked = lock.tryLock(30000);

  if (!locked) {
    throw new Error('다른 저장 작업이 아직 진행 중입니다. 잠시 후 다시 시도해주세요. (' + operationName + ')');
  }

  try {
    const result = callback(operationId) || {};
    const revisionInfo = lockOptions.bumpRevision === false
      ? getAttendanceDataRevisionInfo_(normalizedYear)
      : bumpAttendanceDataRevision_(normalizedYear, operationName, operationId);
    if (typeof result === 'object' && !Array.isArray(result)) {
      result.operationId = operationId;
      result.operationName = operationName;
      result.lockedYear = normalizedYear;
      result.startedAt = Utilities.formatDate(startedAt, Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
      result.finishedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
      Object.assign(result, revisionInfo);
    }
    return result;
  } finally {
    lock.releaseLock();
  }
}


function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function hideIntermediateSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = hideIntermediateSheets_(spreadsheet);

  SpreadsheetApp.getUi().alert(
    '중간 시트를 정리했습니다.\n' +
    '삭제: ' + result.deletedCount + '개\n' +
    '숨김 유지: ' + result.hiddenCount + '개'
  );
}

function hideIntermediateSheets_(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  let hiddenCount = 0;
  let deletedCount = 0;

  sheets.forEach(function(sheet) {
    const sheetName = sheet.getName();
    if (!shouldHideIntermediateSheet_(sheetName)) {
      return;
    }
    if (sheetName === LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME) {
      if (!sheet.isSheetHidden()) {
        sheet.hideSheet();
        hiddenCount += 1;
      }
      return;
    }
    spreadsheet.deleteSheet(sheet);
    deletedCount += 1;
  });

  const dataStoreSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME);
  if (dataStoreSheet && !dataStoreSheet.isSheetHidden()) {
    dataStoreSheet.hideSheet();
    hiddenCount += 1;
  }

  return {
    deletedCount: deletedCount,
    hiddenCount: hiddenCount,
  };
}

function shouldHideIntermediateSheet_(sheetName) {
  const name = String(sheetName || '').trim();

  if (!name) {
    return false;
  }

  return /^(\d{2}년\s*출석통계|\d{2}년\s*출석미매칭)$/.test(name) ||
    /^연차가져오기_(20\d{2})$/.test(name) ||
    /^교육실적가져오기_(20\d{2})$/.test(name) ||
    name === LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME ||
    name === 'DB_STAFF';
}

function buildDataStoreKey_(type, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return type + ':' + normalizedYear;
}

function ensureDataStoreSheet_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet, LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, 5).setValues([['key', 'type', 'year', 'updatedAt', 'json']]);
    sheet.hideSheet();
  }
  return sheet;
}

function clearDataStoreMemo_() {
  dataStoreRowsMemo_ = null;
  dataStoreJsonMemo_ = null;
}

function getDataStoreRows_(spreadsheet) {
  if (dataStoreRowsMemo_) {
    return dataStoreRowsMemo_;
  }

  const sheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    dataStoreRowsMemo_ = [];
    return dataStoreRowsMemo_;
  }

  dataStoreRowsMemo_ = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues();
  return dataStoreRowsMemo_;
}

function chunkDataStoreJsonText_(jsonText) {
  const text = String(jsonText || '');
  const chunkSize = 45000;
  if (!text) {
    return [''];
  }
  const chunks = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }
  return chunks;
}

function writeDataStoreJson_(type, selectedYear, payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureDataStoreSheet_(spreadsheet);
  const key = buildDataStoreKey_(type, selectedYear);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const values = getDataStoreRows_(spreadsheet);

  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const chunks = chunkDataStoreJsonText_(JSON.stringify(payload || {}));
  const rowValues = chunks.map(function(chunk) {
    return [
      key,
      type,
      String(normalizedYear),
      updatedAt,
      chunk,
    ];
  });

  const retainedRows = (values || []).filter(function(row) {
    return valueOrEmpty_(row[0]).trim() !== key;
  });
  const nextRows = retainedRows.concat(rowValues);
  const previousRowCount = values.length;

  if (previousRowCount > 0) {
    sheet.getRange(2, 1, previousRowCount, 5).clearContent();
  }
  if (nextRows.length) {
    sheet.getRange(2, 1, nextRows.length, 5).setValues(nextRows);
  }
  if (previousRowCount > nextRows.length) {
    sheet.getRange(nextRows.length + 2, 1, previousRowCount - nextRows.length, 5).clearContent();
  }

  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  clearDataStoreMemo_();
}

function readDataStoreJson_(type, selectedYear) {
  const key = buildDataStoreKey_(type, selectedYear);
  if (!dataStoreJsonMemo_) {
    dataStoreJsonMemo_ = {};
  }
  if (Object.prototype.hasOwnProperty.call(dataStoreJsonMemo_, key)) {
    return dataStoreJsonMemo_[key];
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const values = getDataStoreRows_(spreadsheet);
  if (!values.length) {
    dataStoreJsonMemo_[key] = null;
    return null;
  }

  const chunks = [];
  for (let index = 0; index < values.length; index += 1) {
    if (valueOrEmpty_(values[index][0]).trim() !== key) {
      continue;
    }
    chunks.push(values[index][4] || '');
  }

  if (chunks.length) {
    try {
      dataStoreJsonMemo_[key] = JSON.parse(chunks.join('') || '{}');
      return dataStoreJsonMemo_[key];
    } catch (error) {
      Logger.log('readDataStoreJson_ parse failed: %s', error.message);
      dataStoreJsonMemo_[key] = null;
      return null;
    }
  }

  dataStoreJsonMemo_[key] = null;
  return null;
}

const TEMPLATE_MANAGER_STORE_TYPE = 'template_manager_library';
const TEMPLATE_MANAGER_STORE_YEAR = 2026;

function getTemplateManagerLibrary() {
  return getTemplateManagerLibrary_();
}

function saveTemplateManagerItem(payload) {
  const library = getTemplateManagerLibrary_();
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const safePayload = payload || {};
  let id = valueOrEmpty_(safePayload.id).trim();
  const templates = Array.isArray(library.templates) ? library.templates.slice() : [];
  const selectedTemplate = templates.find(function(item) {
    return valueOrEmpty_(item && item.id).trim() === id;
  });
  if (!id || (selectedTemplate && selectedTemplate.isBuiltin)) {
    id = 'tmpl_' + Utilities.getUuid().replace(/-/g, '').slice(0, 14);
  }
  const name = valueOrEmpty_(safePayload.name).trim() || '이름 없는 템플릿';
  const groupPath = normalizeTemplateManagerGroupPath_(safePayload.groupPath) || '프로그램/프로그램계획';
  const html = String(safePayload.html == null ? '' : safePayload.html);
  const existingIndex = templates.findIndex(function(item) {
    return valueOrEmpty_(item && item.id).trim() === id && !item.isBuiltin;
  });
  const previous = existingIndex >= 0 ? templates[existingIndex] : {};
  const nextItem = {
    id: id,
    name: name,
    groupPath: groupPath,
    html: html,
    createdAt: previous.createdAt || now,
    updatedAt: now,
    isBuiltin: false,
  };
  if (existingIndex >= 0) {
    templates[existingIndex] = nextItem;
  } else {
    templates.push(nextItem);
  }
  const nextLibrary = Object.assign({}, library, {
    version: 'template-manager-v1',
    groups: getTemplateManagerDefaultGroups_(),
    templates: templates,
    defaultTemplateId: library.defaultTemplateId || getTemplateManagerDefaultTemplates_()[0].id,
    selectedTemplateId: nextItem.id,
    updatedAt: now,
  });
  writeTemplateManagerLibrary_(nextLibrary);
  return nextLibrary;
}

function deleteTemplateManagerItem(templateId) {
  const id = valueOrEmpty_(templateId).trim();
  if (!id) {
    throw new Error('삭제할 템플릿을 선택해주세요.');
  }
  const library = getTemplateManagerLibrary_();
  const target = (library.templates || []).find(function(item) {
    return valueOrEmpty_(item && item.id).trim() === id;
  });
  if (target && target.isBuiltin) {
    throw new Error('기본 제공 템플릿은 삭제할 수 없습니다. 복제 후 수정해주세요.');
  }
  const templates = (Array.isArray(library.templates) ? library.templates : []).filter(function(item) {
    return valueOrEmpty_(item && item.id).trim() !== id;
  });
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const nextLibrary = Object.assign({}, library, {
    templates: templates,
    defaultTemplateId: library.defaultTemplateId === id ? getTemplateManagerDefaultTemplates_()[0].id : library.defaultTemplateId,
    updatedAt: now,
  });
  writeTemplateManagerLibrary_(nextLibrary);
  return nextLibrary;
}

function cloneTemplateManagerItem(templateId) {
  const id = valueOrEmpty_(templateId).trim();
  if (!id) {
    throw new Error('복제할 템플릿을 선택해주세요.');
  }
  const library = getTemplateManagerLibrary_();
  const source = (library.templates || []).find(function(item) {
    return valueOrEmpty_(item && item.id).trim() === id;
  });
  if (!source) {
    throw new Error('선택한 템플릿을 찾지 못했습니다.');
  }
  return saveTemplateManagerItem({
    name: valueOrEmpty_(source.name).trim() + ' 복사본',
    groupPath: source.groupPath,
    html: source.html,
  });
}

function setTemplateManagerDefaultItem(templateId) {
  const id = valueOrEmpty_(templateId).trim();
  const library = getTemplateManagerLibrary_();
  const exists = (library.templates || []).some(function(item) {
    return valueOrEmpty_(item && item.id).trim() === id;
  });
  if (!exists) {
    throw new Error('기본으로 지정할 템플릿을 선택해주세요.');
  }
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const nextLibrary = Object.assign({}, library, {
    defaultTemplateId: id,
    updatedAt: now,
  });
  writeTemplateManagerLibrary_(nextLibrary);
  return nextLibrary;
}

function resetTemplateManagerLibrary() {
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const nextLibrary = {
    version: 'template-manager-v1',
    groups: getTemplateManagerDefaultGroups_(),
    templates: [],
    defaultTemplateId: getTemplateManagerDefaultTemplates_()[0].id,
    updatedAt: now,
  };
  writeTemplateManagerLibrary_(nextLibrary);
  return getTemplateManagerLibrary_();
}

function getTemplateManagerLibrary_() {
  const stored = readDataStoreJson_(TEMPLATE_MANAGER_STORE_TYPE, TEMPLATE_MANAGER_STORE_YEAR) || {};
  const builtins = getTemplateManagerDefaultTemplates_();
  const customTemplates = normalizeTemplateManagerItems_(stored.templates).filter(function(item) {
    return !item.isBuiltin;
  });
  const customIdLookup = {};
  customTemplates.forEach(function(item) {
    customIdLookup[item.id] = true;
  });
  const templates = builtins.filter(function(item) {
    return !customIdLookup[item.id];
  }).concat(customTemplates);
  const defaultTemplateId = valueOrEmpty_(stored.defaultTemplateId).trim() || builtins[0].id;
  return {
    version: 'template-manager-v1',
    groups: getTemplateManagerDefaultGroups_(),
    fields: getTemplateManagerDefaultFields_(),
    templates: templates,
    defaultTemplateId: defaultTemplateId,
    updatedAt: valueOrEmpty_(stored.updatedAt).trim(),
  };
}

function writeTemplateManagerLibrary_(library) {
  const safeLibrary = library || {};
  writeDataStoreJson_(TEMPLATE_MANAGER_STORE_TYPE, TEMPLATE_MANAGER_STORE_YEAR, {
    version: 'template-manager-v1',
    groups: getTemplateManagerDefaultGroups_(),
    templates: normalizeTemplateManagerItems_(safeLibrary.templates).filter(function(item) {
      return !item.isBuiltin;
    }),
    defaultTemplateId: valueOrEmpty_(safeLibrary.defaultTemplateId).trim() || getTemplateManagerDefaultTemplates_()[0].id,
    updatedAt: valueOrEmpty_(safeLibrary.updatedAt).trim(),
  });
}

function normalizeTemplateManagerGroupPath_(value) {
  return String(value == null ? '' : value)
    .split(/[>/]/)
    .map(function(part) { return valueOrEmpty_(part).trim(); })
    .filter(Boolean)
    .join('/');
}

function normalizeTemplateManagerItems_(items) {
  return (Array.isArray(items) ? items : []).map(function(item) {
    const id = valueOrEmpty_(item && item.id).trim();
    const name = valueOrEmpty_(item && item.name).trim();
    if (!id || !name) {
      return null;
    }
    return {
      id: id,
      name: name,
      groupPath: normalizeTemplateManagerGroupPath_(item && item.groupPath) || '프로그램/프로그램계획',
      html: String(item && item.html == null ? '' : item.html),
      createdAt: valueOrEmpty_(item && item.createdAt).trim(),
      updatedAt: valueOrEmpty_(item && item.updatedAt).trim(),
      isBuiltin: item && item.isBuiltin === true,
    };
  }).filter(Boolean);
}

function getTemplateManagerDefaultTemplates_() {
  return [
    {
      id: 'builtin_daily_basic',
      name: '기본 운영일지',
      groupPath: '일지',
      html: buildTemplateManagerDailyBasicHtml_(),
      createdAt: '',
      updatedAt: '',
      isBuiltin: true,
    },
    {
      id: 'builtin_program_plan',
      name: '프로그램계획 기본템플릿',
      groupPath: '프로그램/프로그램계획',
      html: '<div style="font-family:Malgun Gothic,sans-serif;font-size:12px;line-height:1.6"><h2 style="text-align:center">프로그램 계획서</h2><table style="width:100%;border-collapse:collapse"><tr><th style="border:1px solid #999;background:#d9d9d9;padding:6px">일자</th><td style="border:1px solid #999;padding:6px">{{날짜}}</td></tr><tr><th style="border:1px solid #999;background:#d9d9d9;padding:6px">프로그램</th><td style="border:1px solid #999;padding:6px">{{프로그램명}}</td></tr><tr><th style="border:1px solid #999;background:#d9d9d9;padding:6px">참여자</th><td style="border:1px solid #999;padding:6px">{{프로그램참여자}}</td></tr><tr><th style="border:1px solid #999;background:#d9d9d9;padding:6px">내용</th><td style="border:1px solid #999;padding:6px;min-height:160px">{{업무내용}}</td></tr></table></div>',
      createdAt: '',
      updatedAt: '',
      isBuiltin: true,
    },
  ];
}

function getTemplateManagerDefaultFields_() {
  return [
    { group: '기본정보', fields: [
      { label: '날짜', token: '{{날짜}}' },
      { label: '운영시간', token: '{{운영시간}}' },
      { label: '담당자', token: '{{담당자}}' },
    ] },
    { group: '아동현황', fields: [
      { label: '정원', token: '{{정원}}' },
      { label: '현원', token: '{{현원}}' },
      { label: '출석', token: '{{출석}}' },
      { label: '공결', token: '{{공결}}' },
      { label: '대체출석', token: '{{대체출석}}' },
      { label: '결석', token: '{{결석}}' },
      { label: '기타출석', token: '{{기타출석}}' },
      { label: '남 초등학교', token: '{{남_초등학교}}' },
      { label: '여 초등학교', token: '{{여_초등학교}}' },
    ] },
    { group: '급식/인력', fields: [
      { label: '조식', token: '{{조식}}' },
      { label: '중식', token: '{{중식}}' },
      { label: '석식', token: '{{석식}}' },
      { label: '종사자수', token: '{{종사자수}}' },
      { label: '교사수', token: '{{교사수}}' },
      { label: '공익수', token: '{{공익수}}' },
      { label: '기타인원', token: '{{기타인원}}' },
    ] },
    { group: '관리/업무', fields: [
      { label: '생활지도', token: '{{생활지도}}' },
      { label: '위생지도', token: '{{위생지도}}' },
      { label: '안전지도', token: '{{안전지도}}' },
      { label: '종사자', token: '{{종사자}}' },
      { label: '아동', token: '{{아동}}' },
      { label: '방문자', token: '{{방문자}}' },
      { label: '시설', token: '{{시설}}' },
      { label: '업무내용', token: '{{업무내용}}' },
      { label: '기타', token: '{{기타}}' },
    ] },
    { group: '프로그램', fields: [
      { label: '프로그램명', token: '{{프로그램명}}' },
      { label: '프로그램참여자', token: '{{프로그램참여자}}' },
    ] },
  ];
}

function buildTemplateManagerDailyBasicHtml_() {
  return [
    '<style>',
    '.log-wrap{width:100%;font-family:"맑은 고딕",Malgun Gothic,sans-serif;font-size:10.5px;color:#111827}',
    'table{width:100%;border-collapse:collapse;table-layout:fixed}',
    'td,th{border:1px solid #9b9b9b;padding:4px 5px;text-align:center;vertical-align:middle;word-break:break-all;overflow-wrap:anywhere;line-height:1.22}',
    '.gray{background:#d9d9d9;font-weight:700}.white{background:#fff}.left{text-align:left}.title-table{margin:0 auto 16px;background:#fff}.title{font-size:24px;font-weight:800;line-height:1.18}.approval-label{width:20px;font-size:9px;line-height:1.15;padding:0}.approval-head{width:58px;height:16px;font-size:9px;padding:0 2px}.approval-stamp-cell{width:58px;height:42px;padding:2px}.stamp-box{width:34px;height:34px;margin:0 auto}.small-label{font-size:9.2px;letter-spacing:-0.5px;line-height:1.12}.work-label{height:250px;font-weight:700}.work-content{height:250px;text-align:left;vertical-align:top;padding:7px 8px;line-height:1.45}',
    '</style>',
    '<div class="log-wrap">',
    '<table class="title-table"><tr><td rowspan="2" class="white"><div class="title">운영일지(아동)</div></td><td rowspan="2" class="gray approval-label">결<br>재</td><td class="gray approval-head">담당자</td><td class="gray approval-head">팀장</td><td class="gray approval-head">센터장</td></tr><tr><td class="white approval-stamp-cell"><div class="stamp-box">{{담당자도장}}</div></td><td class="white approval-stamp-cell"><div class="stamp-box">{{팀장도장}}</div></td><td class="white approval-stamp-cell"><div class="stamp-box">{{센터장도장}}</div></td></tr></table>',
    '<table><colgroup><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.18%"></colgroup>',
    '<tr><td colspan="2" class="gray">일자</td><td colspan="4" class="white">{{날짜}}</td><td colspan="2" class="gray">운영시간</td><td colspan="3" class="white">{{운영시간}}</td><td class="gray">담당자</td><td colspan="2" class="white">{{담당자}}</td></tr>',
    '<tr><td rowspan="3" class="gray">아동<br>현황<br><span style="font-size:9px">(취약구분)</span></td><td class="gray">성별</td><td class="gray">취학전</td><td class="gray">탈학교</td><td class="gray">초등<br>학교</td><td class="gray">중학교</td><td class="gray">고등<br>학교</td><td class="gray">기타</td><td class="gray">계</td><td colspan="2" rowspan="3" class="gray">급식현황</td><td class="gray">조식</td><td colspan="2">{{조식}}</td></tr>',
    '<tr><td class="gray">남</td><td>{{남_취학전}}</td><td>{{남_탈학교}}</td><td>{{남_초등학교}}</td><td>{{남_중학교}}</td><td>{{남_고등학교}}</td><td>{{남_기타}}</td><td>{{남_계}}</td><td class="gray">중식</td><td colspan="2">{{중식}}</td></tr>',
    '<tr><td class="gray">여</td><td>{{여_취학전}}</td><td>{{여_탈학교}}</td><td>{{여_초등학교}}</td><td>{{여_중학교}}</td><td>{{여_고등학교}}</td><td>{{여_기타}}</td><td>{{여_계}}</td><td class="gray">석식</td><td colspan="2">{{석식}}</td></tr>',
    '<tr><td rowspan="2" class="gray">아동<br>출석<br><span style="font-size:9px">(출석구분)</span></td><td class="gray">정원</td><td class="gray">현원</td><td class="gray">출석</td><td class="gray">공결</td><td class="gray">대체<br>출석</td><td class="gray">결석</td><td class="gray">기타</td><td colspan="2" rowspan="2" class="gray">교사현황</td><td class="gray">종사자</td><td class="gray">교사</td><td class="gray">공익</td><td class="gray">기타</td></tr>',
    '<tr><td>{{정원}}</td><td>{{현원}}</td><td>{{출석}}</td><td>{{공결}}</td><td>{{대체출석}}</td><td>{{결석}}</td><td>{{기타출석}}</td><td>{{종사자수}}</td><td>{{교사수}}</td><td>{{공익수}}</td><td>{{기타인원}}</td></tr>',
    '<tr><td class="gray small-label">지도 및<br>협의사항</td><td colspan="13" class="left"><strong>생활지도 :</strong> {{생활지도}}<br><strong>위생지도 :</strong> {{위생지도}}<br><strong>안전지도 :</strong> {{안전지도}}</td></tr>',
    '<tr><td colspan="14" class="gray">통합 관리</td></tr><tr><td class="gray">종사자</td><td colspan="13" class="left">{{종사자}}</td></tr><tr><td class="gray">아동</td><td colspan="13" class="left">{{아동}}</td></tr><tr><td class="gray">방문자</td><td colspan="13" class="left">{{방문자}}</td></tr><tr><td class="gray">시설</td><td colspan="13" class="left">{{시설}}</td></tr>',
    '<tr><td class="gray work-label">업무<br>내용</td><td colspan="13" class="work-content">{{업무내용}}</td></tr><tr><td class="gray">기타</td><td colspan="13" class="left">{{기타}}</td></tr></table></div>'
  ].join('');
}

function getTemplateManagerDefaultGroups_() {
  return [
    { id: 'pre-records', label: '사전기록묶음', children: [
      { id: 'diagnosis', label: '진단관리', children: [] },
      { id: 'personal-plan', label: '개인상세발달사', children: [] },
    ] },
    { id: 'journal', label: '일지', children: [] },
    { id: 'operation', label: '운영관리', children: [] },
    { id: 'program', label: '프로그램', children: [
      { id: 'annual-program-plan', label: '연간사업계획', children: [] },
      { id: 'program-evaluation', label: '프로그램평가', children: [] },
      { id: 'program-plan', label: '프로그램계획', children: [] },
      { id: 'program-journal', label: '프로그램일지', children: [] },
    ] },
    { id: 'education-info', label: '교육정보', children: [] },
    { id: 'service-records', label: '서비스제공기록', children: [] },
    { id: 'health', label: '건강관리', children: [] },
    { id: 'meal', label: '급식관리', children: [] },
    { id: 'self-reliance', label: '자립지원', children: [] },
    { id: 'service-referral', label: '서비스의뢰기록', children: [] },
    { id: 'abuse-shelter', label: '학대아동쉼터', children: [] },
  ];
}

function getAttendanceDataRevisionInfo_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('attendance_revision', normalizedYear) || {};
  const revision = Math.max(0, Number(stored.revision) || 0);

  return {
    revision: revision,
    revisionUpdatedAt: valueOrEmpty_(stored.updatedAt),
    revisionAction: valueOrEmpty_(stored.actionName),
    revisionOperationId: valueOrEmpty_(stored.operationId),
  };
}

function bumpAttendanceDataRevision_(selectedYear, actionName, operationId) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const previous = getAttendanceDataRevisionInfo_(normalizedYear);
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const next = {
    revision: previous.revision + 1,
    updatedAt: updatedAt,
    actionName: valueOrEmpty_(actionName),
    operationId: valueOrEmpty_(operationId),
  };

  writeDataStoreJson_('attendance_revision', normalizedYear, next);

  return {
    revision: next.revision,
    revisionUpdatedAt: next.updatedAt,
    revisionAction: next.actionName,
    revisionOperationId: next.operationId,
  };
}

function readAttendanceHiddenDates_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('attendance_hidden_dates', normalizedYear);
  const rawDates = stored && Array.isArray(stored.dates) ? stored.dates : [];
  return uniqueStrings_(rawDates.map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
}

function writeAttendanceHiddenDates_(selectedYear, dates) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  writeDataStoreJson_('attendance_hidden_dates', normalizedYear, {
    dates: normalizedDates,
  });
  return normalizedDates;
}

function addAttendanceHiddenDates_(selectedYear, dates) {
  return writeAttendanceHiddenDates_(
    selectedYear,
    readAttendanceHiddenDates_(selectedYear).concat(dates || [])
  );
}

function removeAttendanceHiddenDates_(selectedYear, dates) {
  const removeLookup = {};
  uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).forEach(function(dateKey) {
    removeLookup[dateKey] = true;
  });
  return writeAttendanceHiddenDates_(
    selectedYear,
    readAttendanceHiddenDates_(selectedYear).filter(function(dateKey) {
      return !removeLookup[dateKey];
    })
  );
}

function readProgramAppliedDates_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('program_applied_dates', normalizedYear);
  const rawDates = stored && Array.isArray(stored.dates) ? stored.dates : [];
  return uniqueStrings_(rawDates.map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
}

function writeProgramAppliedDates_(selectedYear, dates) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  writeDataStoreJson_('program_applied_dates', normalizedYear, {
    dates: normalizedDates,
  });
  return normalizedDates;
}

function replaceProgramAppliedDatesForSelection_(selectedYear, selectedDates, appliedDates) {
  const selectedLookup = {};
  uniqueStrings_((selectedDates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).forEach(function(dateKey) {
    selectedLookup[dateKey] = true;
  });
  const persistedDates = readProgramAppliedDates_(selectedYear).filter(function(dateKey) {
    return !selectedLookup[dateKey];
  });
  return writeProgramAppliedDates_(selectedYear, persistedDates.concat(appliedDates || []));
}

function removeProgramAppliedDates_(selectedYear, dates) {
  const removeLookup = {};
  uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).forEach(function(dateKey) {
    removeLookup[dateKey] = true;
  });
  return writeProgramAppliedDates_(
    selectedYear,
    readProgramAppliedDates_(selectedYear).filter(function(dateKey) {
      return !removeLookup[dateKey];
    })
  );
}

function doGet(e) {
  const mode = String((e && e.parameter && e.parameter.mode) || '').trim();

  if (mode === 'maintenanceCleanup') {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const inventorySheet = spreadsheet.getSheetByName('시트현황');
    if (inventorySheet) {
      spreadsheet.deleteSheet(inventorySheet);
    }
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        deletedSheet: inventorySheet ? '시트현황' : '',
      }, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (mode === 'telegramPollingInstall') {
    const secret = String((e && e.parameter && e.parameter.telegramSecret) || '').trim();
    const expectedSecret = typeof getTelegramWebhookSecret_ === 'function' ? getTelegramWebhookSecret_() : '';
    if (expectedSecret && secret !== expectedSecret) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'invalid-secret',
        }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const result = installTelegramPollingTrigger_(true);
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (mode === 'telegramPollingRunOnce') {
    const secret = String((e && e.parameter && e.parameter.telegramSecret) || '').trim();
    const expectedSecret = typeof getTelegramWebhookSecret_ === 'function' ? getTelegramWebhookSecret_() : '';
    if (expectedSecret && secret !== expectedSecret) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'invalid-secret',
        }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const result = pollTelegramUpdates();
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (mode === 'desktopExport') {
    let result;
    try {
      result = buildDesktopBootstrapExport_(e);
    } catch (error) {
      result = {
        ok: false,
        service: 'seochang-desktop-export',
        error: error && error.message ? error.message : String(error),
      };
    }
    const callbackName = String((e && e.parameter && e.parameter.callback) || '').trim();
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(callbackName)) {
      return ContentService
        .createTextOutput(callbackName + '(' + JSON.stringify(result) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (mode === 'desktopChildDebug') {
    let result;
    try {
      result = inspectDesktopChildListExport_();
    } catch (error) {
      result = {
        ok: false,
        service: 'seochang-desktop-child-debug',
        error: error && error.message ? error.message : String(error),
      };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: 'seochang-apps-script',
      modes: ['maintenanceCleanup', 'telegramPollingInstall', 'telegramPollingRunOnce', 'desktopExport', 'desktopChildDebug'],
    }, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureVisibleAttendanceColumnsInLogSheet_(sheet) {
  const canonicalHeaders = [
    { fieldKey: 'MEAL_BREAKFAST', label: '조식' },
    { fieldKey: 'MEAL_LUNCH', label: '중식' },
    { fieldKey: 'MEAL_DINNER', label: '석식' },
    { fieldKey: 'ATTENDANCE_CAPACITY', label: '정원' },
    { fieldKey: 'ATTENDANCE_CURRENT', label: '현원' },
    { fieldKey: 'ATTENDANCE_PRESENT', label: '출석' },
    { fieldKey: 'ATTENDANCE_OFFICIAL', label: '공결' },
    { fieldKey: 'ATTENDANCE_ALTERNATIVE', label: '대체출석' },
    { fieldKey: 'ATTENDANCE_ABSENT', label: '결석' },
    { fieldKey: 'ATTENDANCE_OTHER', label: '출석기타' },
  ];
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, 1, 1, lastColumn);
  const headerValues = headerRange.getDisplayValues()[0];
  const headerLookup = buildHeaderLookup_(headerValues);
  const missingHeaders = canonicalHeaders.filter(function(item) {
    return findHeaderIndex_(headerLookup, OPTIONAL_HEADER_FIELD_RULES[item.fieldKey] || [item.label]) === null;
  });

  if (!missingHeaders.length) {
    return;
  }

  const startColumn = lastColumn + 1;
  sheet.insertColumnsAfter(lastColumn, missingHeaders.length);
  sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, startColumn, 1, missingHeaders.length)
    .setValues([missingHeaders.map(function(item) { return item.label; })])
    .setFontWeight('bold')
    .setBackground('#eef3f8')
    .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
}

function ensureLogDetailColumnsInLogSheet_(sheet) {
  if (!sheet) {
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, 1, 1, lastColumn).getDisplayValues()[0];
  const headerLookup = buildHeaderLookup_(headerValues);
  const missingHeaders = LOG_DETAIL_FIELD_DEFINITIONS.filter(function(item) {
    return findHeaderIndex_(headerLookup, OPTIONAL_HEADER_FIELD_RULES[item.fieldKey] || [item.label]) === null;
  });

  if (!missingHeaders.length) {
    return;
  }

  const startColumn = lastColumn + 1;
  sheet.insertColumnsAfter(lastColumn, missingHeaders.length);
  sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, startColumn, 1, missingHeaders.length)
    .setValues([missingHeaders.map(function(item) { return item.label; })])
    .setFontWeight('bold')
    .setBackground('#eef3f8')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  const rowCount = Math.max(0, sheet.getMaxRows() - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  if (rowCount > 0) {
    sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, startColumn, rowCount, missingHeaders.length)
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle')
      .setWrap(true);
  }
}

function ensureLogDetailColumnsForYear(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const sheet = logDataResult.sheet;

  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const beforeLastColumn = sheet.getLastColumn();
  ensureLogDetailColumnsInLogSheet_(sheet);
  SpreadsheetApp.flush();

  return {
    year: normalizedYear,
    sheetName: sheet.getName(),
    beforeLastColumn: beforeLastColumn,
    afterLastColumn: sheet.getLastColumn(),
    headers: LOG_DETAIL_FIELD_DEFINITIONS.map(function(item) {
      return item.label;
    }),
  };
}

function ensureLogDetailColumnsForYears2024To2026() {
  return [2024, 2025, 2026].map(function(year) {
    return ensureLogDetailColumnsForYear(year);
  });
}

function getMonthlyLogDetailSampleCount_(month, dateCount) {
  if (!dateCount) {
    return 0;
  }
  const peakSeasonMonths = { 1: true, 2: true, 7: true, 8: true, 12: true };
  return Math.min(dateCount, peakSeasonMonths[month] ? 3 : 2);
}

function pickMonthlyLogDetailSampleDates_(dateKeys, seedSuffix, excludedDateLookup) {
  const sortedDates = uniqueStrings_(dateKeys || []).filter(Boolean).sort();
  const groups = {};

  sortedDates.forEach(function(dateKey) {
    const monthKey = String(dateKey).slice(0, 7);
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(dateKey);
  });

  const result = {};
  Object.keys(groups).sort().forEach(function(monthKey) {
    const dates = groups[monthKey].filter(function(dateKey) {
      return !(excludedDateLookup && excludedDateLookup[dateKey]);
    });
    const month = Number(monthKey.slice(5, 7));
    const sampleCount = getMonthlyLogDetailSampleCount_(month, dates.length);
    const shuffled = seededShuffleStrings_(dates, monthKey + ':log-detail-samples:' + String(seedSuffix || 'default'));
    result[monthKey] = shuffled.slice(0, sampleCount).sort();
  });

  return result;
}

function stableStringHash_(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffleStrings_(values, seedText) {
  const seed = stableStringHash_(seedText);
  return (values || []).slice().sort(function(left, right) {
    const leftScore = stableStringHash_(seed + ':' + left);
    const rightScore = stableStringHash_(seed + ':' + right);
    if (leftScore === rightScore) {
      return String(left).localeCompare(String(right));
    }
    return leftScore - rightScore;
  });
}

function pickStableIndex_(dateKey, salt, length) {
  const size = Number(length) || 0;
  if (size <= 0) {
    return 0;
  }
  return stableStringHash_(String(dateKey || '') + ':' + String(salt || '')) % size;
}

function getChildSpecialLegacySampleTexts_() {
  return [
    '감기 증상 호소 아동 상태 확인 및 보호자에게 가정 관찰 안내',
    '건조한 날씨로 인한 목 통증 호소 아동에게 따뜻한 물 섭취와 휴식 지도',
    '한파로 인한 등하원 복장 확인 및 귀가 안전 지도',
    '무더위로 피로감을 호소한 아동에게 휴식 제공 및 수분 섭취 지도',
    '냉방 중 체온 변화가 있는 아동 관찰 및 겉옷 착용 안내',
    '장마철 젖은 양말과 의복 확인 및 감기 예방 지도',
    '환절기 비염 및 기침 증상 아동 상태 확인',
    '신학기 또래 관계 적응 상황 관찰 및 긍정적 상호작용 격려',
    '야외활동 후 손 씻기와 개인 위생 지도',
    '일교차로 컨디션 저하를 보인 아동 휴식 지도',
    '학습 집중도 및 또래 관계 변화 관찰',
    '독감 예방을 위한 손 씻기와 마스크 예절 안내',
  ];
}

function isGeneratedChildSpecialSampleText_(text) {
  const normalizedText = valueOrEmpty_(text).trim();
  if (!normalizedText) {
    return false;
  }
  if (getChildSpecialLegacySampleTexts_().some(function(sampleText) {
    return normalizedText === sampleText;
  })) {
    return true;
  }

  const generatedFragments = [
    '아동이 감기 증상을 호소하여 상태 확인 후 보호자에게 가정 관찰을 안내함.',
    '아동이 목 통증을 호소하여 따뜻한 물 섭취와 휴식을 관찰함.',
    '아동의 한파 등하원 복장을 확인하고 귀가 안전을 지도함.',
    '아동이 무더위로 피로감을 호소하여 휴식 제공 및 수분 섭취를 지도함.',
    '아동이 냉방 중 체온 변화를 보여 겉옷 착용과 상태 관찰을 진행함.',
    '아동의 장마철 젖은 양말과 의복을 확인하고 감기 예방을 지도함.',
    '아동이 환절기 비염 및 기침 증상을 보여 상태를 확인함.',
    '아동의 신학기 또래 관계 적응 상황을 관찰하고 긍정적 상호작용을 격려함.',
    '아동의 야외활동 후 손 씻기와 개인 위생을 지도함.',
    '아동이 일교차로 컨디션 저하를 보여 휴식 지도 및 상태 관찰을 진행함.',
    '아동의 학습 집중도와 또래 관계 변화를 관찰함.',
    '아동에게 독감 예방을 위한 손 씻기와 마스크 예절을 안내함.',
  ];

  return generatedFragments.some(function(fragment) {
    return normalizedText.indexOf(fragment) > -1;
  });
}

function getChildSpecialSeasonalTexts_(month) {
  if (month === 12 || month === 1 || month === 2) {
    return [
      '{name} 아동이 감기 증상을 호소하여 상태 확인 후 보호자에게 가정 관찰을 안내함.',
      '{name} 아동이 목 통증을 호소하여 따뜻한 물 섭취와 휴식을 관찰함.',
      '{name} 아동의 한파 등하원 복장을 확인하고 귀가 안전을 지도함.',
    ];
  }
  if (month === 6 || month === 7 || month === 8) {
    return [
      '{name} 아동이 무더위로 피로감을 호소하여 휴식 제공 및 수분 섭취를 지도함.',
      '{name} 아동이 냉방 중 체온 변화를 보여 겉옷 착용과 상태 관찰을 진행함.',
      '{name} 아동의 장마철 젖은 양말과 의복을 확인하고 감기 예방을 지도함.',
    ];
  }
  if (month >= 3 && month <= 5) {
    return [
      '{name} 아동이 환절기 비염 및 기침 증상을 보여 상태를 확인함.',
      '{name} 아동의 신학기 또래 관계 적응 상황을 관찰하고 긍정적 상호작용을 격려함.',
      '{name} 아동의 야외활동 후 손 씻기와 개인 위생을 지도함.',
    ];
  }
  return [
    '{name} 아동이 일교차로 컨디션 저하를 보여 휴식 지도 및 상태 관찰을 진행함.',
    '{name} 아동의 학습 집중도와 또래 관계 변화를 관찰함.',
    '{name} 아동에게 독감 예방을 위한 손 씻기와 마스크 예절을 안내함.',
  ];
}

function buildAttendancePresentNamesByDate_(spreadsheet, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;
  const namesByDate = {};

  if (!sourceSheet) {
    return namesByDate;
  }

  buildAttendanceNormalizedRows_(sourceSheet).forEach(function(row) {
    const dateKey = normalizeDateKey_(row[0]);
    const childName = valueOrEmpty_(row[1]).trim();
    const status = valueOrEmpty_(row[4]).trim();

    if (!dateKey || !childName || (status !== '출석' && status !== '대체출석')) {
      return;
    }
    if (String(dateKey).indexOf(String(normalizedYear) + '-') !== 0) {
      return;
    }
    if (!namesByDate[dateKey]) {
      namesByDate[dateKey] = [];
    }
    if (namesByDate[dateKey].indexOf(childName) === -1) {
      namesByDate[dateKey].push(childName);
    }
  });

  return namesByDate;
}

function pickAttendanceChildNameForDate_(namesByDate, dateKey, sampleIndex) {
  const names = (namesByDate && namesByDate[dateKey]) || [];
  if (!names.length) {
    return '';
  }
  return names[pickStableIndex_(dateKey, 'child-name-' + Number(sampleIndex || 0), names.length)];
}

function buildNamedChildSpecialText_(month, sampleIndex, childName, dateKey) {
  const templates = getChildSpecialSeasonalTexts_(month);
  const name = valueOrEmpty_(childName).trim();
  if (!name) {
    return '';
  }
  const templateIndex = pickStableIndex_(dateKey || (month + ':' + sampleIndex), 'child-special-template', templates.length);
  return templates[templateIndex].replace('{name}', name);
}

function getGeneratedChildSpecialDateKeysInLogSheet_(logSheet, fieldMap, selectedYear, sampleLookup) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const lastRow = logSheet.getLastRow();
  const dateKeys = [];

  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return dateKeys;
  }

  const values = getSheetValuesWithPadding_(logSheet, LOG_PRINT_CONFIG.DATA_START_ROW, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, getRequiredColumnCount_(fieldMap));
  values.forEach(function(row) {
    const dateKey = normalizeDateKey_(getOptionalRowFieldValue_(row, fieldMap, 'DATE'));
    if (!dateKey || String(dateKey).indexOf(String(normalizedYear) + '-') !== 0) {
      return;
    }
    if (sampleLookup && sampleLookup[dateKey]) {
      return;
    }
    const childSpecialText = valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'CHILD_SPECIAL_COUNSELING')).trim();
    if (isGeneratedChildSpecialSampleText_(childSpecialText)) {
      dateKeys.push(dateKey);
    }
  });

  return dateKeys;
}

function getGeneratedSuppliesEnvironmentDateKeysInLogSheet_(logSheet, fieldMap, selectedYear, sampleLookup) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const lastRow = logSheet.getLastRow();
  const dateKeys = [];

  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return dateKeys;
  }

  const values = getSheetValuesWithPadding_(logSheet, LOG_PRINT_CONFIG.DATA_START_ROW, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, getRequiredColumnCount_(fieldMap));
  values.forEach(function(row) {
    const dateKey = normalizeDateKey_(getOptionalRowFieldValue_(row, fieldMap, 'DATE'));
    if (!dateKey || String(dateKey).indexOf(String(normalizedYear) + '-') !== 0) {
      return;
    }
    if (sampleLookup && sampleLookup[dateKey]) {
      return;
    }
    const suppliesText = valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'SUPPLIES_ENVIRONMENT')).trim();
    if (isGeneratedSuppliesEnvironmentSampleText_(suppliesText)) {
      dateKeys.push(dateKey);
    }
  });

  return dateKeys;
}

function getSuppliesEnvironmentSeasonalTexts_(month) {
  if (month === 12 || month === 1 || month === 2) {
    return [
      '난방기 주변 정리 및 전열기 사용 안전 상태 확인',
      '실내 환기 후 보온 상태 확인, 공용 담요 및 방석 정리',
      '눈비로 젖은 바닥 물기 제거 및 미끄럼 예방 조치',
    ];
  }
  if (month === 6 || month === 7 || month === 8) {
    return [
      '냉방기 필터 및 실내 온도 확인, 공용 선풍기 주변 정리',
      '정수기 컵과 개인 물병 보관 상태 확인',
      '장마철 우산 보관 구역 정리 및 현관 바닥 물기 제거',
    ];
  }
  if (month >= 3 && month <= 5) {
    return [
      '학습 교구와 공용 문구류 수량 확인 및 정리',
      '창문 환기 및 교실 먼지 제거',
      '야외활동 물품 세척 및 보관 상태 확인',
    ];
  }
  return [
    '독서 및 학습 교구 정리, 파손 물품 확인',
    '환절기 환기 및 실내 습도 점검',
    '공용 사물함과 신발장 정리 상태 확인',
  ];
}

function isGeneratedSuppliesEnvironmentSampleText_(text) {
  const normalizedText = valueOrEmpty_(text).trim();
  if (!normalizedText) {
    return false;
  }

  const samples = []
    .concat(getSuppliesEnvironmentSeasonalTexts_(1))
    .concat(getSuppliesEnvironmentSeasonalTexts_(4))
    .concat(getSuppliesEnvironmentSeasonalTexts_(7))
    .concat(getSuppliesEnvironmentSeasonalTexts_(10));

  return samples.some(function(sampleText) {
    return normalizedText === sampleText;
  });
}

function buildStaffEducationTripDetailText_(summary) {
  return [valueOrEmpty_(summary && summary.offlineText).trim(), valueOrEmpty_(summary && summary.onlineText).trim()]
    .filter(Boolean)
    .join('\n');
}

function mergeUniqueMultilineText_(existingText, nextText) {
  const lines = [];
  const seen = {};
  [existingText, nextText].forEach(function(text) {
    String(text || '').split(/\r?\n/).forEach(function(line) {
      const normalized = valueOrEmpty_(line).trim();
      if (!normalized || seen[normalized]) {
        return;
      }
      seen[normalized] = true;
      lines.push(normalized);
    });
  });
  return lines.join('\n');
}

function populateLogDetailExamplesAndEducationForYear(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  ensureLogDetailColumnsInLogSheet_(logSheet);
  const fieldMap = getFieldMap_(logSheet);
  const dateRowMap = buildLogDataDateRowMap_(logSheet, fieldMap);
  const presentNamesByDate = buildAttendancePresentNamesByDate_(spreadsheet, normalizedYear);
  const existingDateKeys = Object.keys(dateRowMap)
    .filter(function(dateKey) {
      return String(dateKey).indexOf(String(normalizedYear) + '-') === 0 && !isWeekendDateKey_(dateKey);
    })
    .sort();
  const sampleCandidateDateKeys = existingDateKeys.filter(function(dateKey) {
    return !!(presentNamesByDate[dateKey] && presentNamesByDate[dateKey].length);
  });
  const childMonthlySamples = pickMonthlyLogDetailSampleDates_(sampleCandidateDateKeys, 'child-special');
  const childSampleDateLookup = {};
  Object.keys(childMonthlySamples).forEach(function(monthKey) {
    childMonthlySamples[monthKey].forEach(function(dateKey) {
      childSampleDateLookup[dateKey] = true;
    });
  });
  const suppliesMonthlySamples = pickMonthlyLogDetailSampleDates_(sampleCandidateDateKeys, 'supplies-environment', childSampleDateLookup);
  const childSampleLookup = {};
  const suppliesSampleLookup = {};

  Object.keys(childMonthlySamples).forEach(function(monthKey) {
    childMonthlySamples[monthKey].forEach(function(dateKey, index) {
      const month = Number(monthKey.slice(5, 7));
      const childName = pickAttendanceChildNameForDate_(presentNamesByDate, dateKey, index);
      childSampleLookup[dateKey] = {
        childSpecialCounseling: buildNamedChildSpecialText_(month, index, childName, dateKey),
        childName: childName,
      };
    });
  });

  Object.keys(suppliesMonthlySamples).forEach(function(monthKey) {
    suppliesMonthlySamples[monthKey].forEach(function(dateKey) {
      const month = Number(monthKey.slice(5, 7));
      const suppliesTexts = getSuppliesEnvironmentSeasonalTexts_(month);
      const suppliesIndex = pickStableIndex_(dateKey, 'supplies-environment-template', suppliesTexts.length);
      suppliesSampleLookup[dateKey] = {
        suppliesEnvironment: suppliesTexts[suppliesIndex],
      };
    });
  });

  const educationBundle = readStaffEducationStoredBundle_(normalizedYear);
  const educationByDate = educationBundle.summaryByDate || {};
  const educationDateKeys = Object.keys(educationByDate)
    .filter(function(dateKey) {
      return String(dateKey).indexOf(String(normalizedYear) + '-') === 0 &&
        !!buildStaffEducationTripDetailText_(educationByDate[dateKey]);
    })
    .sort();
  const generatedChildSpecialDateKeys = getGeneratedChildSpecialDateKeysInLogSheet_(logSheet, fieldMap, normalizedYear, childSampleLookup);
  const generatedSuppliesDateKeys = getGeneratedSuppliesEnvironmentDateKeysInLogSheet_(logSheet, fieldMap, normalizedYear, suppliesSampleLookup);
  const targetDateKeys = uniqueStrings_(Object.keys(childSampleLookup).concat(Object.keys(suppliesSampleLookup)).concat(educationDateKeys).concat(generatedChildSpecialDateKeys).concat(generatedSuppliesDateKeys)).sort();

  if (!targetDateKeys.length) {
    return {
      year: normalizedYear,
      sheetName: logSheet.getName(),
      sampleDateCount: 0,
      childSpecialUpdatedCount: 0,
      suppliesUpdatedCount: 0,
      educationTripUpdatedCount: 0,
      insertedCount: 0,
      educationDateCount: educationDateKeys.length,
      childNameAppliedCount: 0,
      childNameMissingCount: 0,
      childSpecialReplacedGenericCount: 0,
      childSpecialClearedCount: 0,
      suppliesClearedCount: 0,
      suppliesReplacedGenericCount: 0,
    };
  }

  const context = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, targetDateKeys);
  let childSpecialUpdatedCount = 0;
  let childNameAppliedCount = 0;
  let childNameMissingCount = 0;
  let childSpecialReplacedGenericCount = 0;
  let childSpecialClearedCount = 0;
  let suppliesUpdatedCount = 0;
  let suppliesClearedCount = 0;
  let suppliesReplacedGenericCount = 0;
  let educationTripUpdatedCount = 0;

  targetDateKeys.forEach(function(dateKey) {
    const rowInfo = getLogSheetBatchRowValues_(context, dateKey);
    if (!rowInfo) {
      return;
    }
    const rowValues = rowInfo.values;
    const currentDateKey = normalizeDateKey_(getOptionalRowFieldValue_(rowValues, fieldMap, 'DATE'));
    if (!currentDateKey) {
      setRowValueByFieldMap_(rowValues, fieldMap, 'DATE', dateKey);
    }

    const childSample = childSampleLookup[dateKey];
    const suppliesSample = suppliesSampleLookup[dateKey];
    const existingChildSpecial = valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'CHILD_SPECIAL_COUNSELING')).trim();
    const existingSupplies = valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'SUPPLIES_ENVIRONMENT')).trim();
    if (childSample) {
      const replaceGeneratedChildSpecial = isGeneratedChildSpecialSampleText_(existingChildSpecial);
      if (!existingChildSpecial || replaceGeneratedChildSpecial) {
        setRowValueByFieldMap_(rowValues, fieldMap, 'CHILD_SPECIAL_COUNSELING', childSample.childSpecialCounseling);
        childSpecialUpdatedCount += 1;
        if (childSample.childName) {
          childNameAppliedCount += 1;
        } else {
          childNameMissingCount += 1;
        }
        if (replaceGeneratedChildSpecial) {
          childSpecialReplacedGenericCount += 1;
        }
      }
    } else if (isGeneratedChildSpecialSampleText_(existingChildSpecial)) {
      setRowValueByFieldMap_(rowValues, fieldMap, 'CHILD_SPECIAL_COUNSELING', '');
      childSpecialClearedCount += 1;
    }

    if (suppliesSample) {
      const replaceGeneratedSupplies = isGeneratedSuppliesEnvironmentSampleText_(existingSupplies);
      if (!existingSupplies || replaceGeneratedSupplies) {
        setRowValueByFieldMap_(rowValues, fieldMap, 'SUPPLIES_ENVIRONMENT', suppliesSample.suppliesEnvironment);
        suppliesUpdatedCount += 1;
        if (replaceGeneratedSupplies) {
          suppliesReplacedGenericCount += 1;
        }
      }
    } else if (isGeneratedSuppliesEnvironmentSampleText_(existingSupplies)) {
      setRowValueByFieldMap_(rowValues, fieldMap, 'SUPPLIES_ENVIRONMENT', '');
      suppliesClearedCount += 1;
    }

    const educationText = buildStaffEducationTripDetailText_(educationByDate[dateKey]);
    if (educationText) {
      const existingText = valueOrEmpty_(getOptionalRowFieldValue_(rowValues, fieldMap, 'STAFF_EDUCATION_TRIP')).trim();
      const mergedText = mergeUniqueMultilineText_(existingText, educationText);
      if (mergedText !== existingText) {
        setRowValueByFieldMap_(rowValues, fieldMap, 'STAFF_EDUCATION_TRIP', mergedText);
        educationTripUpdatedCount += 1;
      }
    }

    setLogSheetBatchRowValues_(context, rowInfo, rowValues);
  });

  commitLogSheetBatchUpdate_(logSheet, context);
  if (context.insertedCount > 0) {
    sortLogDataSheetByDate_(logSheet, fieldMap);
  }
  clearAttendanceYearCache_(normalizedYear);
  SpreadsheetApp.flush();

  return {
    year: normalizedYear,
    sheetName: logSheet.getName(),
    sampleDateCount: Object.keys(childSampleLookup).length + Object.keys(suppliesSampleLookup).length,
    childSpecialUpdatedCount: childSpecialUpdatedCount,
    suppliesUpdatedCount: suppliesUpdatedCount,
    educationTripUpdatedCount: educationTripUpdatedCount,
    insertedCount: context.insertedCount || 0,
    educationDateCount: educationDateKeys.length,
    childNameAppliedCount: childNameAppliedCount,
    childNameMissingCount: childNameMissingCount,
    childSpecialReplacedGenericCount: childSpecialReplacedGenericCount,
    childSpecialClearedCount: childSpecialClearedCount,
    suppliesClearedCount: suppliesClearedCount,
    suppliesReplacedGenericCount: suppliesReplacedGenericCount,
  };
}

function populateLogDetailExamplesAndEducationForYears2024To2026() {
  return [2024, 2025, 2026].map(function(year) {
    return populateLogDetailExamplesAndEducationForYear(year);
  });
}

function ensureRequiredHeaderInLogSheet_(sheet, fieldKey, label) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerValues = sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, 1, 1, lastColumn).getDisplayValues()[0];
  const headerLookup = buildHeaderLookup_(headerValues);
  const aliases = HEADER_FIELD_RULES[fieldKey] || [label];
  const matchedIndex = findHeaderIndex_(headerLookup, aliases);

  if (matchedIndex !== null) {
    return matchedIndex;
  }

  const targetColumn = lastColumn + 1;
  sheet.insertColumnAfter(lastColumn);
  sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, targetColumn)
    .setValue(label)
    .setFontWeight('bold')
    .setBackground('#eef3f8')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  return targetColumn - 1;
}

function applyAttendanceStatsRowsToLogSheet_(dataSheet, statsRows) {
  const fieldMap = getFieldMap_(dataSheet);
  const requiredColumns = Math.max(dataSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const existingDateRowMap = buildLogDataDateRowMap_(dataSheet, fieldMap);
  const rowsToInsert = [];
  let updatedCount = 0;
  let insertedCount = 0;

  (statsRows || []).forEach(function(stats) {
    if (existingDateRowMap[stats.date]) {
      updatedCount += 1;
      return;
    }
    rowsToInsert.push(stats.date);
  });

  if (rowsToInsert.length) {
    const appendedRows = appendEmptyLogDataRows_(dataSheet, fieldMap, rowsToInsert.length);
    rowsToInsert.forEach(function(date, index) {
      existingDateRowMap[date] = appendedRows[index];
    });
    insertedCount = rowsToInsert.length;
  }

  const targetRowNumbers = (statsRows || []).map(function(stats) {
    return existingDateRowMap[stats.date];
  }).filter(function(rowNumber) {
    return !!rowNumber;
  });

  if (!targetRowNumbers.length) {
    return {
      updatedCount: updatedCount,
      insertedCount: insertedCount,
    };
  }

  const minRow = Math.min.apply(null, targetRowNumbers);
  const maxRow = Math.max.apply(null, targetRowNumbers);
  const blockValues = getSheetValuesWithPadding_(dataSheet, minRow, maxRow - minRow + 1, requiredColumns);

  (statsRows || []).forEach(function(stats) {
    const targetRow = existingDateRowMap[stats.date];
    if (!targetRow) {
      return;
    }
    const blockIndex = targetRow - minRow;
    blockValues[blockIndex] = buildUpdatedLogRowValuesFromStats_(blockValues[blockIndex], fieldMap, stats);
  });

  dataSheet.getRange(minRow, 1, blockValues.length, requiredColumns).setValues(blockValues);

  return {
    updatedCount: updatedCount,
    insertedCount: insertedCount,
  };
}

function getAttendanceSourceSheetFromActiveOrConfig_(targetSpreadsheet) {
  const activeSheet = targetSpreadsheet.getActiveSheet();
  if (activeSheet && isAttendanceSourceSheetName_(activeSheet.getName())) {
    return {
      sheet: activeSheet,
      errorMessage: '',
    };
  }

  return {
    sheet: null,
    errorMessage: '활성 시트를 연도별 출석부 시트로 선택해주세요.',
  };
}

function listAttendanceSourceSheets_(targetSpreadsheet) {
  const sourceEntries = targetSpreadsheet.getSheets()
    .map(function(sheet) {
      const sheetName = sheet.getName();
      if (!isAttendanceSourceSheetName_(sheetName)) {
        return null;
      }

      const year = extractAttendanceYearFromSheetName_(sheetName);
      if (!year) {
        return null;
      }

      return {
        year: year,
        sheetName: sheetName,
        label: year + '년 출석부',
      };
    })
    .filter(function(item) {
      return !!item;
    })
    .sort(function(left, right) {
      return right.year - left.year;
    });

  const yearEntryMap = {};
  sourceEntries.forEach(function(item) {
    yearEntryMap[item.year] = item;
  });

  listAttendanceStoredYears_(targetSpreadsheet).forEach(function(year) {
    if (!yearEntryMap[year]) {
      yearEntryMap[year] = {
        year: year,
        sheetName: '',
        label: year + '년 통계',
      };
    }
  });

  const mergedEntries = Object.keys(yearEntryMap).map(function(key) {
    return yearEntryMap[key];
  }).sort(function(left, right) {
    return right.year - left.year;
  });

  if (mergedEntries.length) {
    return mergedEntries;
  }

  const fallbackYears = {};
  targetSpreadsheet.getSheets().forEach(function(sheet) {
    const sheetName = sheet.getName();
    const year =
      extractAttendanceYearFromSheetName_(sheetName) ||
      extractAttendanceYearFromNamedSheet_(sheetName, '출석통계') ||
      extractAttendanceYearFromNamedSheet_(sheetName, '출석미매칭') ||
      extractAttendanceYearFromNamedSheet_(sheetName, '일지데이터');

    if (!year) {
      return;
    }

    fallbackYears[year] = {
      year: year,
      sheetName: String(year).slice(-2) + '년 출석부',
      label: year + '년 출석부',
    };
  });

  return Object.keys(fallbackYears)
    .map(function(key) {
      return fallbackYears[key];
    })
    .sort(function(left, right) {
      return right.year - left.year;
    });
}

function listAttendanceStoredYears_(spreadsheet) {
  const rows = getDataStoreRows_(spreadsheet);
  const yearMap = {};

  rows.forEach(function(row) {
    if (valueOrEmpty_(row[1]).trim() !== 'attendance_stats') {
      return;
    }

    const year = normalizeAttendanceYear_(row[2] || valueOrEmpty_(row[0]).split(':')[1]);
    if (!year) {
      return;
    }

    yearMap[year] = true;
  });

  return Object.keys(yearMap).map(function(key) {
    return Number(key);
  });
}

function getAttendanceStatsSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return String(normalizedYear).slice(-2) + '년 출석통계';
}

function getAttendanceUnmatchedSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return String(normalizedYear).slice(-2) + '년 출석미매칭';
}

function resolveAttendanceDialogYear_(spreadsheet) {
  const activeSheet = spreadsheet.getActiveSheet();
  const activeSheetName = activeSheet ? activeSheet.getName() : '';
  const activeYear =
    extractAttendanceYearFromSheetName_(activeSheetName) ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '출석통계') ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '출석미매칭') ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '일지데이터');

  if (activeYear) {
    return activeYear;
  }

  const availableYears = listAttendanceSourceSheets_(spreadsheet);
  return availableYears.length ? availableYears[0].year : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
}

function extractAttendanceYearFromNamedSheet_(sheetName, suffix) {
  const match = String(sheetName || '').match(/^(\d{2})년\s+/);
  if (!match || String(sheetName || '').indexOf(suffix) === -1) {
    return null;
  }
  return 2000 + Number(match[1]);
}

function isLogDataSheetName_(sheetName) {
  return /^\d{2}년\s*일지데이터$/.test(String(sheetName || '').trim());
}

function getLogDataSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return String(normalizedYear).slice(-2) + '년 일지데이터';
}

function resolveWorkingYear_(spreadsheet) {
  const activeSheet = spreadsheet.getActiveSheet();
  const activeSheetName = activeSheet ? activeSheet.getName() : '';
  const activeYear =
    extractAttendanceYearFromSheetName_(activeSheetName) ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '출석통계') ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '출석미매칭') ||
    extractAttendanceYearFromNamedSheet_(activeSheetName, '일지데이터');

  if (activeYear) {
    return activeYear;
  }

  const attendanceYears = listAttendanceSourceSheets_(spreadsheet);
  if (attendanceYears.length) {
    return attendanceYears[0].year;
  }

  return LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
}

function resolveLogDataSheet_(spreadsheet, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const yearSheet = spreadsheet.getSheetByName(getLogDataSheetNameByYear_(normalizedYear));

  if (yearSheet) {
    return {
      sheet: yearSheet,
      year: normalizedYear,
      errorMessage: '',
    };
  }

  return {
    sheet: null,
    year: normalizedYear,
    errorMessage: "'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다.",
  };
}

function getAttendanceCache_() {
  return CacheService.getScriptCache();
}

function chunkAttendanceCacheText_(text) {
  const source = String(text || '');
  const chunkSize = 85000;
  const chunks = [];
  for (let index = 0; index < source.length; index += chunkSize) {
    chunks.push(source.slice(index, index + chunkSize));
  }
  return chunks.length ? chunks : [''];
}

function getAttendanceDialogCacheKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return 'attendance:dialog:v5:' + normalizedYear;
}

function getAttendanceDetailCacheKey_(selectedYear, date) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return 'attendance:detail:' + normalizedYear + ':' + normalizeDateKey_(date);
}

function getAttendanceStudentCacheKey_(selectedYear, name, school) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return 'attendance:student:' + normalizedYear + ':' + normalizeSearchKeyword_(name) + ':' + normalizeSearchKeyword_(school);
}

function getAttendanceLogStatusCacheKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return 'attendance:logstatus:v2:' + normalizedYear;
}

function putAttendanceCacheJson_(key, value, seconds) {
  try {
    const cache = getAttendanceCache_();
    const ttl = seconds || 600;
    const previousMetaText = cache.get(key + ':meta');
    const previousMeta = previousMetaText ? JSON.parse(previousMetaText) : null;
    const text = JSON.stringify(value);
    const chunks = chunkAttendanceCacheText_(text);
    if (chunks.length === 1 && text.length <= 85000) {
      cache.put(key, text, ttl);
      const staleKeys = [key + ':meta'];
      if (previousMeta && Number(previousMeta.chunkCount) > 0) {
        for (let index = 0; index < Number(previousMeta.chunkCount); index += 1) {
          staleKeys.push(key + ':chunk:' + index);
        }
      }
      cache.removeAll(staleKeys);
      return;
    }

    const values = {};
    chunks.forEach(function(chunk, index) {
      values[key + ':chunk:' + index] = chunk;
    });
    cache.remove(key);
    cache.putAll(values, ttl);
    cache.put(key + ':meta', JSON.stringify({
      version: 'attendance-cache-chunk-v1',
      chunkCount: chunks.length,
      cachedAt: new Date().toISOString(),
    }), ttl);
    if (previousMeta && Number(previousMeta.chunkCount) > chunks.length) {
      const staleChunkKeys = [];
      for (let index = chunks.length; index < Number(previousMeta.chunkCount); index += 1) {
        staleChunkKeys.push(key + ':chunk:' + index);
      }
      if (staleChunkKeys.length) {
        cache.removeAll(staleChunkKeys);
      }
    }
  } catch (error) {
    Logger.log('putAttendanceCacheJson_ failed: %s', error.message);
  }
}

function getAttendanceCacheJson_(key) {
  try {
    const cache = getAttendanceCache_();
    const raw = cache.get(key);
    if (raw) {
      return JSON.parse(raw);
    }
    const metaText = cache.get(key + ':meta');
    if (!metaText) {
      return null;
    }
    const meta = JSON.parse(metaText);
    if (!meta || meta.version !== 'attendance-cache-chunk-v1' || !meta.chunkCount) {
      return null;
    }
    const chunkKeys = [];
    for (let index = 0; index < Number(meta.chunkCount); index += 1) {
      chunkKeys.push(key + ':chunk:' + index);
    }
    const chunkValues = cache.getAll(chunkKeys);
    const chunks = chunkKeys.map(function(chunkKey) {
      return chunkValues[chunkKey] || '';
    });
    if (chunks.some(function(chunk) { return !chunk; })) {
      return null;
    }
    return JSON.parse(chunks.join('') || '{}');
  } catch (error) {
    Logger.log('getAttendanceCacheJson_ failed: %s', error.message);
    return null;
  }
}

function removeAttendanceCacheJson_(cache, key) {
  const keys = [key];
  try {
    const metaText = cache.get(key + ':meta');
    keys.push(key + ':meta');
    if (metaText) {
      const meta = JSON.parse(metaText);
      for (let index = 0; index < Number(meta && meta.chunkCount || 0); index += 1) {
        keys.push(key + ':chunk:' + index);
      }
    }
  } catch (error) {
    Logger.log('removeAttendanceCacheJson_ meta read failed: %s', error.message);
  }
  cache.removeAll(keys);
}

function markAttendanceDialogSnapshotStale_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  try {
    writeDataStoreJson_('attendance_dialog_snapshot', normalizedYear, {
      stale: true,
      year: normalizedYear,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    Logger.log('markAttendanceDialogSnapshotStale_ failed: %s', error.message);
  }
}

function clearAttendanceYearCache_(selectedYear, options) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const safeOptions = options || {};
  const clearStudentDetails = safeOptions.clearStudentDetails !== false;
  const markSnapshotStale = safeOptions.markSnapshotStale !== false;
  const clearTemplatePreview = safeOptions.clearTemplatePreview !== false;
  const cache = getAttendanceCache_();
  const keys = [
    getAttendanceDialogCacheKey_(normalizedYear),
    getAttendanceLogStatusCacheKey_(normalizedYear),
  ];

  try {
    removeAttendanceCacheJson_(cache, getAttendanceDialogCacheKey_(normalizedYear));
    removeAttendanceCacheJson_(cache, getAttendanceLogStatusCacheKey_(normalizedYear));
  } catch (error) {
    Logger.log('clearAttendanceYearCache_ primary cache remove failed: %s', error.message);
  }

  if (clearStudentDetails) {
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= 31; day += 1) {
        const dateKey = normalizedYear + '-' + pad2_(month) + '-' + pad2_(day);
        keys.push(getAttendanceDetailCacheKey_(normalizedYear, dateKey));
      }
    }

    try {
      const sourceSheet = getAttendanceSourceSheetByYear_(SpreadsheetApp.getActiveSpreadsheet(), normalizedYear).sheet;
      if (sourceSheet) {
        const normalizedRows = buildAttendanceNormalizedRows_(sourceSheet);
        const seenStudents = {};
        normalizedRows.forEach(function(row) {
          const studentName = valueOrEmpty_(row[1]).trim();
          const studentSchool = valueOrEmpty_(row[2]).trim();
          if (!studentName) {
            return;
          }
          const studentKey = studentName + '|' + studentSchool;
          if (seenStudents[studentKey]) {
            return;
          }
          seenStudents[studentKey] = true;
          keys.push(getAttendanceStudentCacheKey_(normalizedYear, studentName, studentSchool));
        });
      }
    } catch (error) {
      Logger.log('clearAttendanceYearCache_ student cache enumeration failed: %s', error.message);
    }
  }

  try {
    for (let index = 0; index < keys.length; index += 90) {
      cache.removeAll(keys.slice(index, index + 90));
    }
  } catch (error) {
    Logger.log('clearAttendanceYearCache_ failed: %s', error.message);
  }

  if (markSnapshotStale) {
    markAttendanceDialogSnapshotStale_(normalizedYear);
  }
  if (clearTemplatePreview) {
    clearTemplatePreviewPdfCache_(normalizedYear);
  }
}

function pad2_(value) {
  return ('0' + Number(value)).slice(-2);
}

function getAttendanceSourceSheetByYear_(targetSpreadsheet, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear);

  if (!normalizedYear) {
    return {
      sheet: null,
      errorMessage: '연도 값이 올바르지 않습니다.',
    };
  }

  const localSheetName = String(normalizedYear).slice(-2) + '년 출석부';
  const localSourceSheet = targetSpreadsheet.getSheetByName(localSheetName);

  if (localSourceSheet) {
    return {
      sheet: localSourceSheet,
      errorMessage: '',
    };
  }

  return {
    sheet: null,
    errorMessage: "'" + localSheetName + "' 시트를 찾을 수 없습니다.",
  };
}

function isAttendanceSourceSheetName_(sheetName) {
  return /^\d{2}년\s*출석부$/.test(String(sheetName || '').trim());
}

function normalizeAttendanceYear_(value) {
  const text = String(value == null ? '' : value).trim();

  if (!text) {
    return null;
  }

  const fourDigitMatch = text.match(/^(20\d{2})$/);
  if (fourDigitMatch) {
    return Number(fourDigitMatch[1]);
  }

  const twoDigitMatch = text.match(/^(\d{2})$/);
  if (twoDigitMatch) {
    return 2000 + Number(twoDigitMatch[1]);
  }

  const labeledMatch = text.match(/^(\d{2,4})년/);
  if (labeledMatch) {
    return normalizeAttendanceYear_(labeledMatch[1]);
  }

  return null;
}

function buildAttendanceNormalizedRows_(sheet) {
  const parserType = getAttendanceParserType_(sheet);

  if (parserType === 'legacy') {
    return buildAttendanceNormalizedRowsLegacy_(sheet);
  }
  if (parserType === 'hybrid') {
    return buildAttendanceNormalizedRowsHybrid_(sheet);
  }

  return buildAttendanceNormalizedRows2026_(sheet);
}

function getAttendanceParserType_(sheet) {
  const sheetName = sheet && sheet.getName ? sheet.getName() : '';
  if (/^24년 출석부$/.test(sheetName)) {
    return 'legacy';
  }
  if (/^25년 출석부$/.test(sheetName)) {
    return 'hybrid';
  }
  return 'current';
}

function buildAttendanceNormalizedRows2026_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const monthStartRows = findAttendanceMonthStartRowsCurrent_(values);
  const normalizedRows = [];

  monthStartRows.forEach(function(monthStartRow, index) {
    const nextMonthStartRow = monthStartRows[index + 1] || (lastRow + 1);
    const monthBlock = parseAttendanceMonthBlockCurrent_(values, monthStartRow, nextMonthStartRow - 1);

    if (!monthBlock || !monthBlock.dayColumns.length) {
      return;
    }

    for (let rowIndex = monthBlock.studentStartRow; rowIndex <= monthBlock.studentEndRow; rowIndex += 1) {
      const row = values[rowIndex - 1];
      const studentNumber = valueOrEmpty_(row[0]).trim();
      const studentName = valueOrEmpty_(row[1]).trim();
      const studentClass = valueOrEmpty_(row[2]).trim();

      if (!isAttendanceStudentRow_(studentNumber, studentName, studentClass)) {
        continue;
      }

      monthBlock.dayColumns.forEach(function(dayColumn) {
        const rawValue = valueOrEmpty_(row[dayColumn.columnIndex]).trim();
        const parsed = parseAttendanceCellValue_(rawValue, monthBlock.year);

        if (!parsed.hasRecord) {
          return;
        }

        const date = createAttendanceDate_(monthBlock.year, monthBlock.month, dayColumn.day);
        normalizedRows.push([
          formatDateValue_(date),
          studentName,
          studentClass,
          detectSchoolLevel_(studentClass),
          parsed.status,
          parsed.checkIn,
          parsed.checkOut,
          parsed.isPresent ? 'Y' : 'N',
          parsed.isOfficial ? 'Y' : 'N',
          parsed.isAbsent ? 'Y' : 'N',
        ]);
      });
    }
  });

  normalizedRows.sort(function(left, right) {
    const leftDate = left[0];
    const rightDate = right[0];
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? -1 : 1;
    }
    if (left[1] !== right[1]) {
      return left[1] < right[1] ? -1 : 1;
    }
    return left[2] < right[2] ? -1 : 1;
  });

  return normalizedRows;
}

function buildAttendanceNormalizedRowsLegacy_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const sheetYear = extractAttendanceYearFromSheetName_(sheet.getName()) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if (lastRow < 1 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const monthStartRows = findAttendanceMonthStartRowsLegacy_(values);
  const normalizedRows = [];

  monthStartRows.forEach(function(monthStartRow, index) {
    const nextMonthStartRow = monthStartRows[index + 1] || (lastRow + 1);
    const monthBlock = parseAttendanceMonthBlockLegacy_(values, monthStartRow, nextMonthStartRow - 1, sheetYear);

    if (!monthBlock || !monthBlock.dayColumns.length) {
      return;
    }

    for (let rowIndex = monthBlock.studentStartRow; rowIndex <= monthBlock.studentEndRow; rowIndex += 1) {
      const row = values[rowIndex - 1];
      const studentNumber = valueOrEmpty_(row[0]).trim();
      const studentName = valueOrEmpty_(row[1]).trim();
      const studentClass = valueOrEmpty_(row[2]).trim();

      if (!isAttendanceStudentRow_(studentNumber, studentName, studentClass)) {
        continue;
      }

      monthBlock.dayColumns.forEach(function(dayColumn) {
        const rawValue = valueOrEmpty_(row[dayColumn.columnIndex]).trim();
        const parsed = parseAttendanceCellValue_(rawValue, monthBlock.year);

        if (!parsed.hasRecord) {
          return;
        }

        const date = createAttendanceDate_(monthBlock.year, monthBlock.month, dayColumn.day);
        normalizedRows.push([
          formatDateValue_(date),
          studentName,
          studentClass,
          detectSchoolLevel_(studentClass),
          parsed.status,
          parsed.checkIn,
          parsed.checkOut,
          parsed.isPresent ? 'Y' : 'N',
          parsed.isOfficial ? 'Y' : 'N',
          parsed.isAbsent ? 'Y' : 'N',
        ]);
      });
    }
  });

  normalizedRows.sort(function(left, right) {
    const leftDate = left[0];
    const rightDate = right[0];
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? -1 : 1;
    }
    if (left[1] !== right[1]) {
      return left[1] < right[1] ? -1 : 1;
    }
    return left[2] < right[2] ? -1 : 1;
  });

  return normalizedRows;
}

function buildAttendanceNormalizedRowsHybrid_(sheet) {
  const mergedRows = buildAttendanceNormalizedRowsLegacy_(sheet).concat(buildAttendanceNormalizedRows2026_(sheet));
  const uniqueMap = {};

  mergedRows.forEach(function(row) {
    const key = [
      valueOrEmpty_(row[0]).trim(),
      valueOrEmpty_(row[1]).trim(),
      valueOrEmpty_(row[2]).trim(),
      valueOrEmpty_(row[4]).trim(),
      valueOrEmpty_(row[5]).trim(),
      valueOrEmpty_(row[6]).trim(),
    ].join('|');

    if (!uniqueMap[key] || getAttendanceRowQualityScore_(row) > getAttendanceRowQualityScore_(uniqueMap[key])) {
      uniqueMap[key] = row;
    }
  });

  return Object.keys(uniqueMap)
    .map(function(key) {
      return uniqueMap[key];
    })
    .sort(function(left, right) {
      const leftDate = left[0];
      const rightDate = right[0];
      if (leftDate !== rightDate) {
        return leftDate < rightDate ? -1 : 1;
      }
      if (left[1] !== right[1]) {
        return left[1] < right[1] ? -1 : 1;
      }
      return left[2] < right[2] ? -1 : 1;
    });
}

function getAttendanceRowQualityScore_(row) {
  const name = valueOrEmpty_(row[1]).trim();
  const school = valueOrEmpty_(row[2]).trim();
  const status = valueOrEmpty_(row[4]).trim();
  let score = 0;

  if (name && name !== '#REF!') {
    score += 3;
  }
  if (school && school !== '#REF!') {
    score += 3;
  }
  if (status === '출석' || status === '공결' || status === '대체출석' || status === '결석') {
    score += 2;
  }

  return score;
}

function getAttendanceNormalizedHeaders_() {
  return [
    '날짜',
    '이름',
    '소속',
    '학교급',
    '상태',
    '입실시간',
    '퇴실시간',
    '출석',
    '공결',
    '결석',
  ];
}

function getAttendanceStatsHeaders_() {
  return [
    '날짜',
    '남취학전',
    '남초등',
    '남중등',
    '남고등',
    '남기타',
    '여취학전',
    '여초등',
    '여중등',
    '여고등',
    '여기타',
    '출석',
    '공결',
    '대체출석',
    '결석',
    '기타',
    '이용아동변동사항',
    '미매칭',
  ];
}

function getAttendanceUnmatchedHeaders_() {
  return [
    '날짜',
    '이름',
    '소속',
    '학교급',
    '상태',
    '입실시간',
    '퇴실시간',
    '매칭키',
  ];
}

function readAttendanceStatsRows_(sheet, selectedYear) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });
  const headerIndexMap = {};

  headers.forEach(function(header, index) {
    headerIndexMap[header] = index;
  });

  ensureAttendanceStatsHeaders_(headerIndexMap, sheet.getName());

  return values.slice(1).map(function(row) {
    const date = valueOrEmpty_(row[headerIndexMap['날짜']]).trim();
    const staffComposition = date
      ? resolveStaffCompositionForDate_(date, normalizedYear)
      : { worker: 0, teacher: 0, public: 0, other: 0 };

    return {
      date: date,
      malePreschool: toNumber_(row[headerIndexMap['남취학전']]),
      maleElementary: toNumber_(row[headerIndexMap['남초등']]),
      maleMiddle: toNumber_(row[headerIndexMap['남중등']]),
      maleHigh: toNumber_(row[headerIndexMap['남고등']]),
      maleOther: toNumber_(row[headerIndexMap['남기타']]),
      femalePreschool: toNumber_(row[headerIndexMap['여취학전']]),
      femaleElementary: toNumber_(row[headerIndexMap['여초등']]),
      femaleMiddle: toNumber_(row[headerIndexMap['여중등']]),
      femaleHigh: toNumber_(row[headerIndexMap['여고등']]),
      femaleOther: toNumber_(row[headerIndexMap['여기타']]),
      present: toNumber_(row[headerIndexMap['출석']]),
      official: toNumber_(row[headerIndexMap['공결']]),
      alternative: toNumber_(row[headerIndexMap['대체출석']]),
      absent: toNumber_(row[headerIndexMap['결석']]),
      other: toNumber_(row[headerIndexMap['기타']]),
      childChanges: valueOrEmpty_(row[headerIndexMap['이용아동변동사항']]).trim(),
      unmatched: toNumber_(row[headerIndexMap['미매칭']]),
      staffWorker: toNumber_(staffComposition.worker),
      staffTeacher: toNumber_(staffComposition.teacher),
      staffPublic: toNumber_(staffComposition.public),
      staffOther: toNumber_(staffComposition.other),
      officialCountsAsPresent: false,
    };
  }).filter(function(item) {
    return hasDisplayValue_(item.date);
  });
}

function ensureAttendanceStatsHeaders_(headerIndexMap, sheetName) {
  const requiredHeaders = [
    '날짜',
    '남취학전',
    '남초등',
    '남중등',
    '남고등',
    '남기타',
    '여취학전',
    '여초등',
    '여중등',
    '여고등',
    '여기타',
    '출석',
    '공결',
    '대체출석',
    '결석',
    '기타',
    '이용아동변동사항',
    '미매칭',
  ];
  const missingHeaders = requiredHeaders.filter(function(header) {
    return headerIndexMap[header] === null || headerIndexMap[header] === undefined;
  });

  if (missingHeaders.length) {
    throw new Error("'" + sheetName + "' 시트에 통계 헤더가 누락되었습니다: " + missingHeaders.join(', '));
  }
}

function readAttendanceStatsRowsByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('attendance_stats', normalizedYear);

  if (stored && stored.statsRows && stored.statsRows.length) {
    const officialCountsAsPresent = stored.officialCountsAsPresent === true;
    return (stored.statsRows || []).map(function(row) {
      const date = valueOrEmpty_(row[0]).trim();
      const staffComposition = date
        ? resolveStaffCompositionForDate_(date, normalizedYear)
        : { worker: 0, teacher: 0, public: 0, other: 0 };
      const official = toNumber_(row[12]);

      return {
        date: date,
        malePreschool: toNumber_(row[1]),
        maleElementary: toNumber_(row[2]),
        maleMiddle: toNumber_(row[3]),
        maleHigh: toNumber_(row[4]),
        maleOther: toNumber_(row[5]),
        femalePreschool: toNumber_(row[6]),
        femaleElementary: toNumber_(row[7]),
        femaleMiddle: toNumber_(row[8]),
        femaleHigh: toNumber_(row[9]),
        femaleOther: toNumber_(row[10]),
        present: toNumber_(row[11]) + (officialCountsAsPresent ? 0 : official),
        official: official,
        alternative: toNumber_(row[13]),
        absent: toNumber_(row[14]),
        other: toNumber_(row[15]),
        childChanges: valueOrEmpty_(row[16]).trim(),
        unmatched: toNumber_(row[17]),
        staffWorker: toNumber_(staffComposition.worker),
        staffTeacher: toNumber_(staffComposition.teacher),
        staffPublic: toNumber_(staffComposition.public),
        staffOther: toNumber_(staffComposition.other),
        officialCountsAsPresent: officialCountsAsPresent,
      };
    }).filter(function(item) {
      return hasDisplayValue_(item.date);
    });
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(getAttendanceStatsSheetNameByYear_(normalizedYear));
  return sheet ? readAttendanceStatsRows_(sheet, normalizedYear) : [];
}

function readAnnualLeaveCountByDateFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  if (!headers.length || !rows.length) {
    return {};
  }

  const headerIndexMap = buildHeaderIndexMap_(headers);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if ([dateIndex, nameIndex, valueIndex].some(function(index) {
    return index === null || index === undefined;
  })) {
    return {};
  }

  const buckets = {};
  rows.forEach(function(row) {
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) {
      return;
    }
    const dateKey = normalizeAnnualLeaveDateKeyForYear_(row[dateIndex], normalizedYear);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const usedValue = normalizeAnnualLeaveUsedValue_(row[valueIndex]);
    if (!dateKey || !name || !usedValue) {
      return;
    }
    if (!buckets[dateKey]) {
      buckets[dateKey] = {};
    }
    buckets[dateKey][name] = true;
  });

  const result = {};
  Object.keys(buckets).forEach(function(dateKey) {
    result[dateKey] = Object.keys(buckets[dateKey]).length;
  });
  return result;
}

function buildCombinedChildLookup_(spreadsheet, selectedYear) {
  const lookup = {};
  const targetYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sheetNames = [
    LOG_PRINT_CONFIG.CHILD_LIST_SHEET_NAME,
    LOG_PRINT_CONFIG.EXITED_CHILD_LIST_SHEET_NAME,
  ];

  sheetNames.forEach(function(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return;
    }

    extractChildRecordsFromSheet_(sheet, targetYear).forEach(function(record) {
      addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, record.school, record.grade), record);
      addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, record.normalizedSchool, record.normalizedGrade), record);
      record.schoolAliases.forEach(function(aliasSchool) {
        addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, aliasSchool, record.grade), record);
        addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, aliasSchool, ''), record);
      });
      addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, record.school, ''), record);
      addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, record.normalizedSchool, ''), record);
      addChildLookupRecord_(lookup, buildChildLookupKey_(record.name, '', ''), record);
    });
  });

  return lookup;
}

function extractChildRecordsFromSheet_(sheet, selectedYear) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const targetYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if (lastRow < 4 || lastColumn < 10) {
    return [];
  }

  const values = sheet.getRange(4, 1, lastRow - 3, lastColumn).getDisplayValues();
  const records = [];

  values.forEach(function(row) {
    const numberText = valueOrEmpty_(row[0]).trim();
    const name = valueOrEmpty_(row[1]).trim();
    const gender = normalizeGender_(row[2]);
    const birthDate = valueOrEmpty_(row[6]).trim();
    const school = valueOrEmpty_(row[8]).trim();
    const grade = valueOrEmpty_(row[9]).trim();
    const leaveDate = valueOrEmpty_(row[22]).trim();

    if (!isChildListDataRow_(numberText, name, school, grade)) {
      return;
    }

    const schoolProfile = resolveChildAcademicProfileByYear_(birthDate, school, grade, targetYear);
    records.push({
      name: name,
      gender: gender,
      school: school,
      grade: schoolProfile.grade || grade,
      birthDate: birthDate,
      age: schoolProfile.age,
      normalizedSchool: schoolProfile.normalizedSchool,
      normalizedGrade: schoolProfile.grade,
      schoolLevel: schoolProfile.schoolLevel,
      schoolAliases: schoolProfile.schoolAliases,
      leaveDate: leaveDate,
    });
  });

  return records;
}

function isChildListDataRow_(numberText, name, school, grade) {
  if (!name) {
    return false;
  }

  if (!/^\d+$/.test(String(numberText || ''))) {
    return false;
  }

  const reservedNames = {
    '이름': true,
    '대기아동': true,
    '퇴소자아동': true,
  };

  if (reservedNames[normalizeSearchKeyword_(name)]) {
    return false;
  }

  return hasDisplayValue_(school) || hasDisplayValue_(grade);
}

function addChildLookupRecord_(lookup, key, record) {
  if (!key) {
    return;
  }

  if (!lookup[key]) {
    lookup[key] = [];
  }

  lookup[key].push(record);
}

function buildChildLookupKey_(name, school, grade) {
  const normalizedName = normalizeSearchKeyword_(name);
  const normalizedSchool = normalizeSearchKeyword_(school);
  const normalizedGrade = normalizeGradeKey_(grade);
  return normalizedName + '|' + normalizedSchool + '|' + normalizedGrade;
}

function normalizeGender_(value) {
  const text = valueOrEmpty_(value).trim();

  if (text === '남') {
    return '남';
  }
  if (text === '여') {
    return '여';
  }

  return '';
}

function resolveChildAcademicProfileByYear_(birthDate, school, grade, selectedYear) {
  const targetYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedSchoolInfo = normalizeSchoolAndGrade_(school, grade);
  const academicGrade = inferAcademicGradeByYear_(birthDate, grade, targetYear);
  const schoolLevel = detectSchoolLevelByAcademicGrade_(academicGrade) || detectSchoolLevelFromChildRow_(school, grade);
  const schoolAliases = buildSchoolAliasesForYear_(normalizedSchoolInfo.school, academicGrade);

  return {
    age: calculateChildAgeByYear_(birthDate, targetYear),
    grade: academicGrade ? String(academicGrade) : normalizedSchoolInfo.grade,
    normalizedSchool: normalizedSchoolInfo.school,
    schoolLevel: schoolLevel,
    schoolAliases: schoolAliases,
  };
}

function parseBirthYear_(birthDate) {
  const text = valueOrEmpty_(birthDate).trim();
  if (!text) {
    return null;
  }

  const compact = text.replace(/[^\d]/g, '');
  if (compact.length < 4) {
    return null;
  }

  const year = Number(compact.slice(0, 4));
  return year >= 1900 && year <= 2100 ? year : null;
}

function calculateChildAgeByYear_(birthDate, selectedYear) {
  const birthYear = parseBirthYear_(birthDate);
  const targetYear = normalizeAttendanceYear_(selectedYear);
  if (!birthYear || !targetYear) {
    return '';
  }
  return String(targetYear - birthYear + 1);
}

function inferAcademicGradeByYear_(birthDate, fallbackGrade, selectedYear) {
  const targetYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const birthYear = parseBirthYear_(birthDate);
  if (birthYear) {
    const gradeByBirthYear = targetYear - birthYear - 6;
    return gradeByBirthYear > 0 ? gradeByBirthYear : 0;
  }

  const normalizedFallback = normalizeGradeKey_(fallbackGrade);
  if (!normalizedFallback || !/^\d+$/.test(normalizedFallback)) {
    return 0;
  }

  const currentGrade = Number(normalizedFallback);
  const shiftedGrade = currentGrade - (LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR - targetYear);
  return shiftedGrade > 0 ? shiftedGrade : 0;
}

function detectSchoolLevelByAcademicGrade_(academicGrade) {
  const gradeNumber = Number(academicGrade || 0);
  if (!gradeNumber) {
    return '';
  }
  if (gradeNumber >= 1 && gradeNumber <= 6) {
    return '초등';
  }
  if (gradeNumber >= 7 && gradeNumber <= 9) {
    return '중등';
  }
  if (gradeNumber >= 10 && gradeNumber <= 12) {
    return '고등';
  }
  return '기타';
}

function buildSchoolAliasesForYear_(normalizedSchool, academicGrade) {
  const aliases = {};
  const schoolText = valueOrEmpty_(normalizedSchool).trim();
  if (schoolText) {
    aliases[schoolText] = true;
  }

  const root = schoolText.replace(/(초|중|고)$/, '');
  const suffix = getSchoolSuffixByAcademicGrade_(academicGrade);
  if (root && suffix) {
    aliases[root + suffix] = true;
  }

  return Object.keys(aliases);
}

function getSchoolSuffixByAcademicGrade_(academicGrade) {
  const gradeNumber = Number(academicGrade || 0);
  if (gradeNumber >= 1 && gradeNumber <= 6) {
    return '초';
  }
  if (gradeNumber >= 7 && gradeNumber <= 9) {
    return '중';
  }
  if (gradeNumber >= 10 && gradeNumber <= 12) {
    return '고';
  }
  return '';
}

function detectSchoolLevelFromChildRow_(school, grade) {
  const schoolText = valueOrEmpty_(school);
  const gradeText = valueOrEmpty_(grade);
  const combined = schoolText + ' ' + gradeText;

  if (combined.indexOf('유치') > -1 || combined.indexOf('취학전') > -1) {
    return '취학전';
  }
  if (schoolText.indexOf('초') > -1) {
    return '초등';
  }
  if (schoolText.indexOf('중') > -1) {
    return '중등';
  }
  if (schoolText.indexOf('고') > -1) {
    return '고등';
  }

  return '기타';
}

function normalizeSchoolAndGrade_(school, grade) {
  const schoolText = valueOrEmpty_(school).trim();
  const gradeText = valueOrEmpty_(grade).trim();
  const combined = (schoolText + ' ' + gradeText).replace(/\s+/g, ' ').trim();
  const gradeMatch = combined.match(/(\d+)\s*(학년)?$/);
  let normalizedGrade = '';
  let normalizedSchool = schoolText;

  if (gradeMatch) {
    normalizedGrade = String(Number(gradeMatch[1]));
  }

  if (schoolText) {
    normalizedSchool = schoolText.replace(/\s+/g, '');
    normalizedSchool = normalizedSchool.replace(/(\d+)\s*(학년)?$/, '');
  } else if (combined) {
    normalizedSchool = combined.replace(/\s+/g, '').replace(/(\d+)\s*(학년)?$/, '');
  }

  normalizedSchool = normalizedSchool.trim();

  return {
    school: normalizedSchool,
    grade: normalizedGrade,
  };
}

function normalizeGradeKey_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }
  const match = text.match(/(\d+)/);
  return match ? String(Number(match[1])) : normalizeSearchKeyword_(text);
}

function buildAttendanceStatsRowsFromNormalizedData_(rows, childLookup) {
  if (!rows || !rows.length) {
    return {
      statsRows: [],
      unmatchedRows: [],
    };
  }

  const statsByDate = {};
  const unmatchedRows = [];

  rows.forEach(function(row) {
    const date = valueOrEmpty_(row[0]).trim();
    const name = valueOrEmpty_(row[1]).trim();
    const school = valueOrEmpty_(row[2]).trim();
    const status = valueOrEmpty_(row[4]).trim();

    if (!date || !name || !status) {
      return;
    }

    if (!statsByDate[date]) {
      statsByDate[date] = createAttendanceStatsBucket_();
    }

    const bucket = statsByDate[date];
    const child = findChildRecord_(childLookup, name, school);

    if (status === '출석' || status === '공결') {
      bucket.present += 1;
      if (!child || !child.gender) {
        bucket.unmatched += 1;
        unmatchedRows.push([
          date,
          name,
          school,
          valueOrEmpty_(row[3]).trim(),
          status,
          valueOrEmpty_(row[5]).trim(),
          valueOrEmpty_(row[6]).trim(),
          normalizeSearchKeyword_(name) + ' | ' + normalizeSearchKeyword_(school),
        ]);
      } else {
        incrementGenderSchoolLevel_(bucket, child.gender, child.schoolLevel);
      }
      if (status === '공결') {
        bucket.official += 1;
        bucket.officialNames.push(name);
      }
      return;
    }

    if (status === '대체출석') {
      bucket.alternative += 1;
      bucket.alternativeNames.push(name);
      return;
    }

    if (status === '결석') {
      bucket.absent += 1;
      bucket.absentNames.push(name);
      return;
    }

    bucket.other += 1;
    bucket.otherNames.push(name);
  });

  return {
    statsRows: Object.keys(statsByDate)
      .sort()
      .map(function(date) {
        const bucket = statsByDate[date];
        return [
          date,
          bucket.malePreschool,
          bucket.maleElementary,
          bucket.maleMiddle,
          bucket.maleHigh,
          bucket.maleOther,
          bucket.femalePreschool,
          bucket.femaleElementary,
          bucket.femaleMiddle,
          bucket.femaleHigh,
          bucket.femaleOther,
          bucket.present,
          bucket.official,
          bucket.alternative,
          bucket.absent,
          bucket.other,
          formatAttendanceChildChangesText_(bucket),
          bucket.unmatched,
        ];
      }),
    unmatchedRows: unmatchedRows.sort(function(left, right) {
      if (left[0] !== right[0]) {
        return left[0] < right[0] ? -1 : 1;
      }
      if (left[1] !== right[1]) {
        return left[1] < right[1] ? -1 : 1;
      }
      return left[2] < right[2] ? -1 : 1;
    }),
  };
}

function openLogDataRowForDate(selectedYear, targetDate, targetFieldKey) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);

  if (!logDataResult.sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트를 찾지 못했습니다."));
  }

  const dateKey = normalizeDateKey_(targetDate);
  if (!dateKey) {
    throw new Error('이동할 날짜를 해석하지 못했습니다.');
  }

  const sheet = logDataResult.sheet;
  const fieldMap = getFieldMap_(sheet);
  const dateRowMap = buildLogDataDateRowMap_(sheet, fieldMap);
  const rowNumber = dateRowMap[dateKey];

  if (!rowNumber) {
    throw new Error(dateKey + ' 날짜의 운영일지가 없습니다. 먼저 날짜 일지 작성을 실행해주세요.');
  }

  const resolvedFieldKey = valueOrEmpty_(targetFieldKey).trim();
  const targetColumnIndex = resolvedFieldKey === 'OPERATING_HOURS'
    ? COL.OPERATING_HOURS
    : (
      resolvedFieldKey &&
      fieldMap[resolvedFieldKey] !== null &&
      fieldMap[resolvedFieldKey] !== undefined
        ? fieldMap[resolvedFieldKey]
        : (fieldMap.DATE != null ? fieldMap.DATE : 0)
    );
  const targetColumn = targetColumnIndex + 1;
  const targetRange = sheet.getRange(rowNumber, targetColumn);

  spreadsheet.setActiveSheet(sheet, true);
  targetRange.activate();
  SpreadsheetApp.flush();

  return {
    year: normalizedYear,
    sheetName: sheet.getName(),
    rowNumber: rowNumber,
    a1Notation: targetRange.getA1Notation(),
    date: dateKey,
  };
}

function deleteLogDataRowsByDates(selectedYear, dates) {
  return withYearWriteLock_(selectedYear, '일지데이터 삭제', function() {
    return deleteLogDataRowsByDatesUnlocked_(selectedYear, dates);
  });
}

function deleteLogDataRowsByDatesUnlocked_(selectedYear, dates) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);

  if (!logDataResult.sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트를 찾지 못했습니다."));
  }

  const dateKeys = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();

  if (!dateKeys.length) {
    throw new Error('삭제할 날짜가 없습니다.');
  }

  const sheet = logDataResult.sheet;
  const fieldMap = getFieldMap_(sheet);
  const dateRowMap = buildLogDataDateRowMap_(sheet, fieldMap);
  const rowEntries = dateKeys.map(function(dateKey) {
    return {
      date: dateKey,
      rowNumber: dateRowMap[dateKey] || 0,
    };
  });
  const deleteTargets = rowEntries
    .filter(function(item) { return item.rowNumber > 0; })
    .sort(function(left, right) { return right.rowNumber - left.rowNumber; });

  deleteTargets.forEach(function(item) {
    sheet.deleteRow(item.rowNumber);
  });

  const hiddenDates = addAttendanceHiddenDates_(normalizedYear, dateKeys);
  removeProgramAppliedDates_(normalizedYear, dateKeys);

  SpreadsheetApp.flush();
  clearAttendanceYearCache_(normalizedYear);

  return {
    year: normalizedYear,
    sheetName: sheet.getName(),
    requestedCount: dateKeys.length,
    deletedCount: deleteTargets.length,
    hiddenCount: hiddenDates.length,
    missingDates: rowEntries
      .filter(function(item) { return !item.rowNumber; })
      .map(function(item) { return item.date; }),
  };
}

function buildLogDataDateRowMap_(sheet, fieldMap) {
  const lastRow = sheet.getLastRow();
  const dateRowMap = {};

  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return dateRowMap;
  }

  const values = getSheetValuesWithPadding_(sheet, LOG_PRINT_CONFIG.DATA_START_ROW, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1, getRequiredColumnCount_(fieldMap));

  values.forEach(function(row, index) {
    const dateKey = normalizeDateKey_(row[fieldMap.DATE]);
    if (dateKey) {
      dateRowMap[dateKey] = LOG_PRINT_CONFIG.DATA_START_ROW + index;
    }
  });

  return dateRowMap;
}

function appendEmptyLogDataRow_(sheet, fieldMap) {
  const requiredColumns = Math.max(sheet.getMaxColumns(), getRequiredColumnCount_(fieldMap));
  const newRow = Math.max(sheet.getLastRow() + 1, LOG_PRINT_CONFIG.DATA_START_ROW);
  ensureSheetCapacity_(sheet, newRow, requiredColumns);
  sheet.getRange(newRow, 1, 1, requiredColumns).setValues([new Array(requiredColumns).fill('')]);
  return newRow;
}

function appendEmptyLogDataRows_(sheet, fieldMap, count) {
  const safeCount = Math.max(0, Number(count) || 0);
  if (!safeCount) {
    return [];
  }

  const requiredColumns = Math.max(sheet.getMaxColumns(), getRequiredColumnCount_(fieldMap));
  const startRow = Math.max(sheet.getLastRow() + 1, LOG_PRINT_CONFIG.DATA_START_ROW);
  const emptyRows = Array.from({ length: safeCount }, function() {
    return new Array(requiredColumns).fill('');
  });

  ensureSheetCapacity_(sheet, startRow + safeCount - 1, requiredColumns);
  sheet.getRange(startRow, 1, safeCount, requiredColumns).setValues(emptyRows);

  return emptyRows.map(function(_, index) {
    return startRow + index;
  });
}

function isProtectedLogDataLayoutSheet_(sheet) {
  if (!sheet) {
    return false;
  }
  const sheetName = String(sheet.getName() || '').trim();
  return /^\d{2}년\s*일지데이터$/.test(sheetName);
}

function shouldPreserveLogDataLayout_(sheet, options) {
  if (options && options.forceLayoutUpdate === true) {
    return false;
  }
  return isProtectedLogDataLayoutSheet_(sheet);
}

function sortLogDataSheetByDate_(sheet, fieldMap, options) {
  if (shouldPreserveLogDataLayout_(sheet, options)) {
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return;
  }

  const requiredColumns = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const rowCount = lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1;
  const values = getSheetValuesWithPadding_(sheet, LOG_PRINT_CONFIG.DATA_START_ROW, rowCount, requiredColumns);

  values.sort(function(left, right) {
    const leftKey = normalizeDateKey_(left[fieldMap.DATE]);
    const rightKey = normalizeDateKey_(right[fieldMap.DATE]);

    if (!leftKey && !rightKey) {
      return 0;
    }
    if (!leftKey) {
      return 1;
    }
    if (!rightKey) {
      return -1;
    }
    if (leftKey === rightKey) {
      return 0;
    }
    return leftKey < rightKey ? -1 : 1;
  });

  sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, values.length, requiredColumns).setValues(values);
}

function writeAttendanceStatsToLogRow_(sheet, rowNumber, fieldMap, stats) {
  const requiredColumns = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const currentRowValues = getSheetValuesWithPadding_(sheet, rowNumber, 1, requiredColumns)[0] || new Array(requiredColumns).fill('');
  const nextRowValues = buildUpdatedLogRowValuesFromStats_(currentRowValues, fieldMap, stats);
  sheet.getRange(rowNumber, 1, 1, requiredColumns).setValues([nextRowValues]);
}

function buildUpdatedLogRowValuesFromStats_(rowValues, fieldMap, stats, options) {
  const nextRowValues = (rowValues || []).slice();
  const safeOptions = options || {};
  const staffEnabled = safeOptions.staff !== false;
  const nonStaffEnabled = safeOptions.nonstaff !== false;
  const managerName = resolveManagerNameForDate_(stats.date, stats.date ? stats.date.slice(0, 4) : '');
  const staffComposition = resolveStaffCompositionForDate_(stats.date, stats.date ? stats.date.slice(0, 4) : '');
  const staffWorkerCount = staffComposition.worker;
  const maleOutOfSchool = toNumber_(stats.maleOutOfSchool);
  const maleOther = toNumber_(stats.maleOther);
  const femaleOutOfSchool = toNumber_(stats.femaleOutOfSchool);
  const femaleOther = toNumber_(stats.femaleOther);
  const malePresentTotal =
    toNumber_(stats.malePreschool) +
    maleOutOfSchool +
    toNumber_(stats.maleElementary) +
    toNumber_(stats.maleMiddle) +
    toNumber_(stats.maleHigh) +
    maleOther;
  const femalePresentTotal =
    toNumber_(stats.femalePreschool) +
    femaleOutOfSchool +
    toNumber_(stats.femaleElementary) +
    toNumber_(stats.femaleMiddle) +
    toNumber_(stats.femaleHigh) +
    femaleOther;
  const attendanceOfficial = toNumber_(stats.official);
  const attendancePresent = malePresentTotal + femalePresentTotal + (stats && stats.officialCountsAsPresent === false ? attendanceOfficial : 0);
  const attendanceAlternative = toNumber_(stats.alternative);
  const attendanceOther = toNumber_(stats.other) + toNumber_(stats.unmatched);
  const attendanceAbsent = toNumber_(stats.absent);
  const attendanceCurrent = attendancePresent + attendanceAlternative + attendanceAbsent + attendanceOther;
  const mealTarget = Math.max(attendanceCurrent - attendanceOfficial, 0);
  const operatingHoursValue = valueOrEmpty_(nextRowValues[fieldMap.OPERATING_HOURS]).trim();
  const operatingMode = detectOperatingMode_(operatingHoursValue);

  setRowValueByFieldMap_(nextRowValues, fieldMap, 'DATE', stats.date);
  if (staffEnabled && managerName) {
    setRowValueByFieldMap_(nextRowValues, fieldMap, 'MANAGER', managerName);
  }
  if (staffEnabled && staffWorkerCount !== '') {
    setRowValueByFieldMap_(nextRowValues, fieldMap, 'STAFF_WORKER', staffWorkerCount);
  }
  if (nonStaffEnabled) {
    setOptionalRowField_(nextRowValues, fieldMap, 'STAFF_TEACHER', staffComposition.teacher, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'STAFF_PUBLIC', staffComposition.public, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'STAFF_OTHER', staffComposition.other, true);
    const nonStaffOtherText = buildNonStaffVisitorTextForDate_(stats.date, stats.date ? stats.date.slice(0, 4) : '');
    const currentVisitorReason = getOptionalRowFieldValue_(nextRowValues, fieldMap, 'VISITOR_REASON');
    const nextVisitorReason = mergeNonStaffOtherVisitorReasonText_(currentVisitorReason, nonStaffOtherText);
    setOptionalRowField_(nextRowValues, fieldMap, 'VISITOR_REASON', nextVisitorReason, false);
    applyNonStaffRoleWorkToRowValues_(nextRowValues, fieldMap, stats.date, stats.date ? stats.date.slice(0, 4) : '');
  }
  if (staffEnabled) {
    const existingStaffChanges = valueOrEmpty_(getOptionalRowFieldValue_(nextRowValues, fieldMap, 'STAFF_CHANGES')).trim();
    const attendanceText = buildStaffAttendanceChangesText_(staffComposition);
    let nextStaffChanges = mergeStaffAttendanceChangesText_(existingStaffChanges, attendanceText);
    const annualLeaveText = getAnnualLeaveStaffChangesTextForDate_(stats.date, stats.date ? stats.date.slice(0, 4) : '');
    nextStaffChanges = mergeAnnualLeaveStaffChangesText_(nextStaffChanges, annualLeaveText);
    if (nextStaffChanges) {
      setRowValueByFieldMap_(nextRowValues, fieldMap, 'STAFF_CHANGES', nextStaffChanges);
    }
  }
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_PRESCHOOL', toNumber_(stats.malePreschool));
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_OUT_OF_SCHOOL', maleOutOfSchool);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_ELEMENTARY', stats.maleElementary);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_MIDDLE', stats.maleMiddle);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_HIGH', stats.maleHigh);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'MALE_OTHER', maleOther);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_PRESCHOOL', toNumber_(stats.femalePreschool));
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_OUT_OF_SCHOOL', femaleOutOfSchool);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_ELEMENTARY', stats.femaleElementary);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_MIDDLE', stats.femaleMiddle);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_HIGH', stats.femaleHigh);
  setRowValueByFieldMap_(nextRowValues, fieldMap, 'FEMALE_OTHER', femaleOther);

  setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_BREAKFAST', 0, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_CAPACITY', 35, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_CURRENT', attendanceCurrent, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_PRESENT', attendancePresent, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_OFFICIAL', attendanceOfficial, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_ALTERNATIVE', attendanceAlternative, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_ABSENT', attendanceAbsent, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'ATTENDANCE_OTHER', attendanceOther, true);
  setOptionalRowField_(nextRowValues, fieldMap, 'CHILD_CHANGES', valueOrEmpty_(stats.childChanges).trim(), false);

  if (operatingMode === 'vacation') {
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_LUNCH', mealTarget, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_DINNER', 0, true);
  } else if (operatingMode === 'school') {
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_LUNCH', 0, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_DINNER', mealTarget, true);
  }

  return nextRowValues;
}

function buildOperatingHoursText_(mode, manualText) {
  const normalizedMode = valueOrEmpty_(mode).trim();
  if (normalizedMode === 'school') {
    return getAutomationSettingValue_('GENERAL', 'OPERATING_HOURS_SCHOOL', '학기중 (10:00 ~ 19:00)');
  }
  if (normalizedMode === 'vacation') {
    return getAutomationSettingValue_('GENERAL', 'OPERATING_HOURS_VACATION', '방학중 (10:00 ~ 19:00)');
  }
  if (normalizedMode === 'manual') {
    return valueOrEmpty_(manualText).trim();
  }
  return valueOrEmpty_(manualText).trim();
}

function applyOperatingHoursToRowValues_(rowValues, fieldMap, operatingHoursText) {
  const nextRowValues = (rowValues || []).slice();
  const text = valueOrEmpty_(operatingHoursText).trim();
  if (!text) {
    return nextRowValues;
  }

  setRowValueByFieldMap_(nextRowValues, fieldMap, 'OPERATING_HOURS', text);
  setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_BREAKFAST', 0, true);

  const attendanceCurrent = toNumber_(getOptionalRowFieldValue_(nextRowValues, fieldMap, 'ATTENDANCE_CURRENT'));
  const attendanceOfficial = toNumber_(getOptionalRowFieldValue_(nextRowValues, fieldMap, 'ATTENDANCE_OFFICIAL'));
  const mealTarget = Math.max(attendanceCurrent - attendanceOfficial, 0);
  const operatingMode = detectOperatingMode_(text);

  if (operatingMode === 'vacation') {
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_LUNCH', mealTarget, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_DINNER', 0, true);
  } else if (operatingMode === 'school') {
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_LUNCH', 0, true);
    setOptionalRowField_(nextRowValues, fieldMap, 'MEAL_DINNER', mealTarget, true);
  }

  return nextRowValues;
}

function getOptionalRowFieldValue_(rowValues, fieldMap, fieldKey) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return '';
  }
  return rowValues[columnIndex];
}

function setRowValueByFieldMap_(rowValues, fieldMap, fieldKey, value) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return;
  }
  rowValues[columnIndex] = value;
}

function setOptionalRowField_(rowValues, fieldMap, fieldKey, value, isNumber) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return;
  }
  rowValues[columnIndex] = isNumber ? toNumber_(value) : (value == null ? '' : value);
}

function normalizeLogCellCompareValue_(value, fieldKey) {
  if (fieldKey === 'DATE') {
    return normalizeDateKey_(value) || valueOrEmpty_(value).trim();
  }
  if (LINKED_LOG_DATA_NUMERIC_COMPARE_FIELDS_[fieldKey]) {
    return String(toNumber_(value));
  }
  if (value instanceof Date) {
    return normalizeDateKey_(value);
  }
  return valueOrEmpty_(value).trim();
}

function rowValuesDifferForFields_(beforeRow, afterRow, fieldMap, fieldKeys) {
  return (fieldKeys || []).some(function(fieldKey) {
    const columnIndex = fieldMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined) {
      return false;
    }
    return normalizeLogCellCompareValue_(beforeRow[columnIndex], fieldKey) !==
      normalizeLogCellCompareValue_(afterRow[columnIndex], fieldKey);
  });
}

function getChangedFieldKeysForRow_(beforeRow, afterRow, fieldMap, fieldKeys) {
  return (fieldKeys || []).filter(function(fieldKey) {
    const columnIndex = fieldMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined) {
      return false;
    }
    return normalizeLogCellCompareValue_(beforeRow[columnIndex], fieldKey) !==
      normalizeLogCellCompareValue_(afterRow[columnIndex], fieldKey);
  });
}

function normalizeDateKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd');
  }

  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }

  const koreanDateMatch = text.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanDateMatch) {
    return [
      koreanDateMatch[1],
      ('0' + koreanDateMatch[2]).slice(-2),
      ('0' + koreanDateMatch[3]).slice(-2),
    ].join('-');
  }

  const dashedDateMatch = text.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (dashedDateMatch) {
    return [
      dashedDateMatch[1],
      ('0' + dashedDateMatch[2]).slice(-2),
      ('0' + dashedDateMatch[3]).slice(-2),
    ].join('-');
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd');
  }

  return text;
}

function parseDateKeyAsKstDate_(value) {
  const normalized = normalizeDateKey_(value);
  if (!normalized) {
    return null;
  }

  const match = String(normalized).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function createAttendanceStatsBucket_() {
  return {
    malePreschool: 0,
    maleElementary: 0,
    maleMiddle: 0,
    maleHigh: 0,
    maleOther: 0,
    femalePreschool: 0,
    femaleElementary: 0,
    femaleMiddle: 0,
    femaleHigh: 0,
    femaleOther: 0,
    present: 0,
    official: 0,
    alternative: 0,
    absent: 0,
    other: 0,
    unmatched: 0,
    officialNames: [],
    alternativeNames: [],
    absentNames: [],
    otherNames: [],
  };
}

function formatAttendanceChildChangesText_(bucket) {
  const lines = [];
  const groups = [
    { label: '공결', names: bucket.officialNames || [] },
    { label: '대체출석', names: bucket.alternativeNames || [] },
    { label: '결석', names: bucket.absentNames || [] },
    { label: '기타', names: bucket.otherNames || [] },
  ];

  groups.forEach(function(group) {
    const names = uniqueStrings_(group.names || []);
    if (!names.length) {
      return;
    }
    lines.push(group.label + ' : ' + names.join(', ') + ' / ' + names.length + '명');
  });

  return lines.join('\n');
}

function uniqueStrings_(values) {
  const lookup = {};
  return (values || []).filter(function(value) {
    const key = valueOrEmpty_(value).trim();
    if (!key || lookup[key]) {
      return false;
    }
    lookup[key] = true;
    return true;
  }).map(function(value) {
    return valueOrEmpty_(value).trim();
  });
}

function uniqueNumbers_(values) {
  const lookup = {};
  return (values || []).filter(function(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || lookup[numberValue]) {
      return false;
    }
    lookup[numberValue] = true;
    return true;
  }).map(function(value) {
    return Number(value);
  });
}

function readCellValueByFieldMap_(sheet, rowNumber, fieldMap, fieldKey) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return '';
  }
  return valueOrEmpty_(sheet.getRange(rowNumber, columnIndex + 1).getDisplayValue()).trim();
}

function detectOperatingMode_(value) {
  const text = valueOrEmpty_(value).replace(/\s+/g, '');
  if (text.indexOf('방학중') > -1) {
    return 'vacation';
  }
  if (text.indexOf('학기중') > -1) {
    return 'school';
  }
  return '';
}

function findChildRecord_(lookup, name, school) {
  const normalizedInfo = normalizeSchoolAndGrade_(school, '');
  const candidateKeys = [
    buildChildLookupKey_(name, school, normalizedInfo.grade),
    buildChildLookupKey_(name, normalizedInfo.school, normalizedInfo.grade),
    buildChildLookupKey_(name, school, ''),
    buildChildLookupKey_(name, normalizedInfo.school, ''),
    buildChildLookupKey_(name, '', ''),
  ];

  for (let index = 0; index < candidateKeys.length; index += 1) {
    const matches = lookup[candidateKeys[index]] || [];
    if (matches.length === 1) {
      return matches[0];
    }
  }

  for (let index = 0; index < candidateKeys.length; index += 1) {
    const matches = lookup[candidateKeys[index]] || [];
    if (matches.length) {
      return matches[0];
    }
  }

  return null;
}

function incrementGenderSchoolLevel_(bucket, gender, schoolLevel) {
  if (gender === '남') {
    if (schoolLevel === '취학전') {
      bucket.malePreschool += 1;
    } else if (schoolLevel === '초등') {
      bucket.maleElementary += 1;
    } else if (schoolLevel === '중등') {
      bucket.maleMiddle += 1;
    } else if (schoolLevel === '고등') {
      bucket.maleHigh += 1;
    } else {
      bucket.maleOther += 1;
    }
    return;
  }

  if (gender === '여') {
    if (schoolLevel === '취학전') {
      bucket.femalePreschool += 1;
    } else if (schoolLevel === '초등') {
      bucket.femaleElementary += 1;
    } else if (schoolLevel === '중등') {
      bucket.femaleMiddle += 1;
    } else if (schoolLevel === '고등') {
      bucket.femaleHigh += 1;
    } else {
      bucket.femaleOther += 1;
    }
  }
}

function isAttendanceStudentRow_(studentNumber, studentName, studentClass) {
  const normalizedName = valueOrEmpty_(studentName).trim();
  const normalizedClass = valueOrEmpty_(studentClass).trim();
  const normalizedNumber = valueOrEmpty_(studentNumber).trim();
  const reservedNames = {
    '이름': true,
    '번호': true,
    '일자': true,
    '반': true,
    '학교': true,
    '출석': true,
    '공결': true,
    '결석': true,
    '확정': true,
  };

  if (!normalizedName || !normalizedClass) {
    return false;
  }

  if (reservedNames[normalizedName]) {
    return false;
  }

  if (normalizedNumber && !/^\d+$/.test(normalizedNumber)) {
    return false;
  }

  return true;
}

function detectSchoolLevel_(studentClass) {
  const text = valueOrEmpty_(studentClass);

  if (text.indexOf('유치') > -1 || text.indexOf('취학전') > -1) {
    return '취학전';
  }
  if (text.indexOf('초') > -1) {
    return '초등';
  }
  if (text.indexOf('중') > -1) {
    return '중등';
  }
  if (text.indexOf('고') > -1) {
    return '고등';
  }

  return '기타';
}

function createAttendanceDate_(year, month, day) {
  return new Date(year, month - 1, day);
}

function columnNumberToLetter_(columnNumber) {
  let result = '';
  let current = columnNumber;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function formatAttendanceNormalizedSheet_(sheet, columnCount, rowCount) {
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);

  if (rowCount > 0) {
    sheet.getRange(2, 1, rowCount, columnCount)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');

    sheet.getRange(2, 2, rowCount, 1).setHorizontalAlignment('left');
    sheet.getRange(2, 3, rowCount, 1).setHorizontalAlignment('left');
  }
}

function formatAttendanceStatsSheet_(sheet, columnCount, rowCount) {
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);

  if (rowCount > 0) {
    sheet.getRange(2, 1, rowCount, columnCount)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');
  }
}

function formatAttendanceUnmatchedSheet_(sheet, columnCount, rowCount) {
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columnCount);

  if (rowCount > 0) {
    sheet.getRange(2, 1, rowCount, columnCount)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');
    sheet.getRange(2, 2, rowCount, 2).setHorizontalAlignment('left');
  }
}

function formatLogDataSheet_(sheet, options) {
  if (!sheet) {
    return;
  }
  if (shouldPreserveLogDataLayout_(sheet, options)) {
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const rowCount = Math.max(0, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  const headerRange = sheet.getRange(LOG_PRINT_CONFIG.HEADER_ROW, 1, 1, lastColumn);
  const fieldMap = getFieldMap_(sheet);
  const numericFieldPrefixes = [
    'MALE_',
    'FEMALE_',
    'STAFF_',
    'ATTENDANCE_',
    'MEAL_',
  ];
  const fixedLeftAlignFieldKeys = [
    'MANAGER',
    'STAFF_CHANGES',
    'CHILD_CHANGES',
    'WORK_1',
    'WORK_2',
    'WORK_3',
    'WORK_4',
    'WORK_5',
    'WORK_6',
    'WORK_7',
    'CHILD_SPECIAL_COUNSELING',
    'FACILITY_SAFETY_HYGIENE',
    'SUPPLIES_ENVIRONMENT',
    'STAFF_EDUCATION_TRIP',
    'MISC_NOTES',
  ];
  const fixedColumnWidths = {
    DATE: 120,
    OPERATING_HOURS: 170,
    MANAGER: 110,
    MEAL_BREAKFAST: 90,
    MEAL_LUNCH: 90,
    MEAL_DINNER: 90,
    ATTENDANCE_CAPACITY: 90,
    ATTENDANCE_CURRENT: 90,
    ATTENDANCE_PRESENT: 90,
    ATTENDANCE_OFFICIAL: 90,
    ATTENDANCE_ALTERNATIVE: 90,
    ATTENDANCE_ABSENT: 90,
    ATTENDANCE_OTHER: 90,
    STAFF_WORKER: 90,
    STAFF_TEACHER: 90,
    STAFF_PUBLIC: 90,
    STAFF_OTHER: 90,
    STAFF_CHANGES: 240,
    CHILD_CHANGES: 240,
    WORK_1: 220,
    WORK_2: 190,
    WORK_3: 190,
    WORK_4: 190,
    WORK_5: 190,
    WORK_6: 190,
    WORK_7: 190,
    CHILD_SPECIAL_COUNSELING: 260,
    FACILITY_SAFETY_HYGIENE: 260,
    SUPPLIES_ENVIRONMENT: 260,
    STAFF_EDUCATION_TRIP: 260,
    MISC_NOTES: 280,
  };

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  headerRange
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#1e40af')
    .setFontColor('#ffffff')
    .setWrap(true)
    .setBorder(true, true, true, true, false, false, '#9ca3af', SpreadsheetApp.BorderStyle.SOLID);

  if (rowCount <= 0) {
    return;
  }

  const dataRange = sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, rowCount, lastColumn);
  dataRange
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(false)
    .setBorder(true, true, true, true, false, false, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);

  const backgrounds = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const color = rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
    backgrounds.push(new Array(lastColumn).fill(color));
  }
  dataRange.setBackgrounds(backgrounds);

  Object.keys(fieldMap).forEach(function(fieldKey) {
    const columnIndex = fieldMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined || !Number.isInteger(columnIndex)) {
      return;
    }

    const columnNumber = columnIndex + 1;
    if (columnNumber < 1 || columnNumber > lastColumn) {
      return;
    }

    if (fixedLeftAlignFieldKeys.indexOf(fieldKey) !== -1) {
      sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, columnNumber, rowCount, 1)
        .setHorizontalAlignment('left')
        .setVerticalAlignment('middle');
      if (fieldKey === 'WORK_1' || fieldKey === 'WORK_2' || fieldKey === 'WORK_3' || fieldKey === 'WORK_4' || fieldKey === 'WORK_5' || fieldKey === 'WORK_6' || fieldKey === 'WORK_7' || fieldKey === 'CHILD_SPECIAL_COUNSELING' || fieldKey === 'FACILITY_SAFETY_HYGIENE' || fieldKey === 'SUPPLIES_ENVIRONMENT' || fieldKey === 'STAFF_EDUCATION_TRIP') {
        sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, columnNumber, rowCount, 1).setWrap(true);
      }
      return;
    }

    const isNumeric = numericFieldPrefixes.some(function(prefix) {
      return fieldKey.indexOf(prefix) === 0;
    });
    if (isNumeric) {
      sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, columnNumber, rowCount, 1).setHorizontalAlignment('right');
    }
  });

  ['STAFF_CHANGES', 'CHILD_CHANGES', 'WORK_1', 'WORK_2', 'WORK_3', 'WORK_4', 'WORK_5', 'WORK_6', 'WORK_7', 'CHILD_SPECIAL_COUNSELING', 'FACILITY_SAFETY_HYGIENE', 'SUPPLIES_ENVIRONMENT', 'STAFF_EDUCATION_TRIP', 'MISC_NOTES'].forEach(function(fieldKey) {
    const columnIndex = fieldMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined || !Number.isInteger(columnIndex) || columnIndex >= lastColumn) {
      return;
    }
    sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, columnIndex + 1, rowCount, 1).setWrap(true);
  });

  Object.keys(fixedColumnWidths).forEach(function(fieldKey) {
    const columnIndex = fieldMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined || !Number.isInteger(columnIndex)) {
      return;
    }
    const width = fixedColumnWidths[fieldKey];
    if (width && width > 0) {
      sheet.setColumnWidth(columnIndex + 1, width);
    }
  });

  sheet.autoResizeColumns(1, lastColumn);
  sheet.getBandings().forEach(function(banding) {
    banding.remove();
  });
}

function readAttendanceUnmatchedRows_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const stored = readDataStoreJson_('attendance_stats', normalizedYear);

  if (stored && stored.unmatchedRows && stored.unmatchedRows.length) {
    return stored.unmatchedRows.map(function(row) {
      return {
        date: valueOrEmpty_(row[0]).trim(),
        name: valueOrEmpty_(row[1]).trim(),
        school: valueOrEmpty_(row[2]).trim(),
        schoolLevel: valueOrEmpty_(row[3]).trim(),
        status: valueOrEmpty_(row[4]).trim(),
        checkIn: valueOrEmpty_(row[5]).trim(),
        checkOut: valueOrEmpty_(row[6]).trim(),
        matchKey: valueOrEmpty_(row[7]).trim(),
      };
    });
  }

  const sheet = spreadsheet.getSheetByName(getAttendanceUnmatchedSheetNameByYear_(normalizedYear));
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues().map(function(row) {
    return {
      date: valueOrEmpty_(row[0]).trim(),
      name: valueOrEmpty_(row[1]).trim(),
      school: valueOrEmpty_(row[2]).trim(),
      schoolLevel: valueOrEmpty_(row[3]).trim(),
      status: valueOrEmpty_(row[4]).trim(),
      checkIn: valueOrEmpty_(row[5]).trim(),
      checkOut: valueOrEmpty_(row[6]).trim(),
      matchKey: valueOrEmpty_(row[7]).trim(),
    };
  });
}

function applyTemplateMarkers() {
  const templateSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  const markers = getTemplateMarkerMap_();

  markers.forEach(function(marker) {
    if (!isMarkerRangeInBounds_(templateSheet, marker.a1)) {
      return;
    }
    const range = templateSheet.getRange(marker.a1);
    range
      .setValue(marker.code)
      .setFontColor(LOG_PRINT_CONFIG.TEMPLATE_MARKER_TEXT_COLOR)
      .setNote(buildTemplateMarkerNote_(marker));
  });

  SpreadsheetApp.flush();
  logTemplateMarkerMap_();
}

function clearTemplateMarkers() {
  const templateSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  getTemplateMarkerMap_().forEach(function(marker) {
    if (!isMarkerRangeInBounds_(templateSheet, marker.a1)) {
      return;
    }
    const range = templateSheet.getRange(marker.a1);
    if (String(range.getValue()).trim() === marker.code) {
      range.clearContent();
    }
    range.clearNote();
  });

  SpreadsheetApp.flush();
}

function hideTemplateLastColumn() {
  const templateSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  const targetColumn = 16;
  if (templateSheet.getMaxColumns() < targetColumn) {
    return;
  }

  templateSheet.hideColumns(targetColumn);
  SpreadsheetApp.flush();
}

function analyzeTemplateSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  const schemaSheet = getOrCreateTemplateSchemaSheet_(spreadsheet);
  const lastRow = templateSheet.getLastRow();
  const lastColumn = templateSheet.getLastColumn();
  const snapshotAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE,
    'yyyy-MM-dd HH:mm:ss'
  );

  schemaSheet.clearContents();
  schemaSheet.clearFormats();
  schemaSheet.getRange(1, 1, 1, 8).setValues([[
    'section',
    'key',
    'a1',
    'value',
    'extra1',
    'extra2',
    'extra3',
    'snapshotAt'
  ]]);

  const rows = [];
  rows.push(['meta', 'sheetName', '', templateSheet.getName(), '', '', '', snapshotAt]);
  rows.push(['meta', 'lastRow', '', String(lastRow), '', '', '', snapshotAt]);
  rows.push(['meta', 'lastColumn', '', String(lastColumn), '', '', '', snapshotAt]);

  if (lastRow > 0 && lastColumn > 0) {
    const dataRange = templateSheet.getRange(1, 1, lastRow, lastColumn);
    const values = dataRange.getDisplayValues();
    const backgrounds = dataRange.getBackgrounds();
    const fontWeights = dataRange.getFontWeights();
    const horizontalAlignments = dataRange.getHorizontalAlignments();
    const verticalAlignments = dataRange.getVerticalAlignments();

    templateSheet.getDataRange().getMergedRanges().forEach(function(range) {
      rows.push([
        'merged',
        range.getA1Notation(),
        range.getA1Notation(),
        '',
        String(range.getNumRows()),
        String(range.getNumColumns()),
        '',
        snapshotAt
      ]);
    });

    for (let row = 1; row <= lastRow; row += 1) {
      rows.push([
        'row',
        'height',
        'R' + row,
        String(templateSheet.getRowHeight(row)),
        '',
        '',
        '',
        snapshotAt
      ]);
    }

    for (let column = 1; column <= lastColumn; column += 1) {
      rows.push([
        'column',
        'width',
        columnToLetter_(column) + ':' + columnToLetter_(column),
        String(templateSheet.getColumnWidth(column)),
        '',
        '',
        '',
        snapshotAt
      ]);
    }

    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < values[rowIndex].length; columnIndex += 1) {
        const value = values[rowIndex][columnIndex];
        if (!hasDisplayValue_(value)) {
          continue;
        }

        const a1 = templateSheet.getRange(rowIndex + 1, columnIndex + 1).getA1Notation();
        rows.push([
          'cell',
          a1,
          a1,
          value,
          backgrounds[rowIndex][columnIndex],
          fontWeights[rowIndex][columnIndex],
          horizontalAlignments[rowIndex][columnIndex] + '/' + verticalAlignments[rowIndex][columnIndex],
          snapshotAt
        ]);
      }
    }
  }

  if (rows.length) {
    schemaSheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }

  formatTemplateSchemaSheet_(schemaSheet, rows.length + 1);
  schemaSheet.hideSheet();
  SpreadsheetApp.flush();
}

function rebuildTemplateMarkersFromSchema() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  const schemaSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  if (!schemaSheet || schemaSheet.getLastRow() < 2) {
    throw new Error('먼저 템플릿 분석 저장을 실행해주세요.');
  }

  const schemaMeta = readTemplateSchemaMeta_(schemaSheet);
  const markers = readTemplateMarkerMapFromSchema_(schemaSheet);
  const skipped = [];

  markers.forEach(function(marker) {
    if (!isMarkerWithinSchemaBounds_(marker.a1, schemaMeta)) {
      skipped.push(marker.code + ' ' + marker.a1);
      return;
    }

    if (!isMarkerRangeInBounds_(templateSheet, marker.a1)) {
      skipped.push(marker.code + ' ' + marker.a1);
      return;
    }

    const range = templateSheet.getRange(marker.a1);
    range
      .setValue(marker.code)
      .setFontColor(LOG_PRINT_CONFIG.TEMPLATE_MARKER_TEXT_COLOR)
      .setNote(buildTemplateMarkerNote_(marker));
  });

  SpreadsheetApp.flush();

  if (skipped.length) {
    Logger.log('Skipped markers: %s', skipped.join(', '));
  }

  hideTemplateSchemaSheet_();
}

function buildTemplateMappingTable() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const schemaSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);

  if (!schemaSheet || schemaSheet.getLastRow() < 2) {
    throw new Error('먼저 템플릿 분석 저장을 실행해주세요.');
  }

  const mappingStartRow = findOrCreateMappingSection_(schemaSheet);
  const markerMap = getTemplateMarkerMap_();
  const formulaCells = getTemplateFormulaCellMap_();
  const schemaMeta = readTemplateSchemaMeta_(schemaSheet);
  const rows = [];

  markerMap.forEach(function(marker) {
    if (!isMarkerWithinSchemaBounds_(marker.a1, schemaMeta)) {
      return;
    }

    rows.push([
      'mapping',
      marker.code,
      marker.a1,
      marker.label,
      marker.fieldKey,
      'input',
      '',
      'Y',
      ''
    ]);
  });

  formulaCells.forEach(function(item) {
    if (!isMarkerWithinSchemaBounds_(item.a1, schemaMeta)) {
      return;
    }

    rows.push([
      'mapping',
      item.code,
      item.a1,
      item.label,
      item.fieldKey,
      'formula',
      item.formula,
      'Y',
      ''
    ]);
  });

  rows.sort(function(a, b) {
    return a[2].localeCompare(b[2]);
  });

  clearMappingSection_(schemaSheet, mappingStartRow);

  schemaSheet.getRange(mappingStartRow, 1, 1, 9).setValues([[
    'section',
    'code',
    'a1',
    'label',
    'fieldKey',
    'type',
    'formula',
    'active',
    'note'
  ]]);

  if (rows.length) {
    schemaSheet.getRange(mappingStartRow + 1, 1, rows.length, 9).setValues(rows);
  }

  formatTemplateSchemaSheet_(schemaSheet, Math.max(schemaSheet.getLastRow(), mappingStartRow + rows.length));
  hideTemplateSchemaSheet_();
}

function buildTemplateSuggestions() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  const schemaSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);

  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트가 없습니다.");
  }

  if (!schemaSheet || schemaSheet.getLastRow() < 2) {
    throw new Error('먼저 템플릿 분석 저장을 실행해주세요.');
  }

  const suggestionStartRow = findOrCreateSuggestionSection_(schemaSheet);
  const suggestions = suggestTemplateInputCells_(templateSheet);

  clearSuggestionSection_(schemaSheet, suggestionStartRow);
  schemaSheet.getRange(suggestionStartRow, 1, 1, 8).setValues([[
    'section',
    'code',
    'a1',
    'label',
    'fieldKey',
    'basis',
    'source',
    'note'
  ]]);

  if (suggestions.length) {
    schemaSheet.getRange(suggestionStartRow + 1, 1, suggestions.length, 8).setValues(suggestions.map(function(item) {
      return [
        'suggestion',
        item.code,
        item.a1,
        item.label,
        item.fieldKey,
        item.basis,
        item.source,
        item.note || ''
      ];
    }));
  }

  formatTemplateSchemaSheet_(schemaSheet, Math.max(schemaSheet.getLastRow(), suggestionStartRow + suggestions.length));
  hideTemplateSchemaSheet_();
}

function applySuggestionsToMapping() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const schemaSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);

  if (!schemaSheet || schemaSheet.getLastRow() < 2) {
    throw new Error('먼저 템플릿 분석 저장을 실행해주세요.');
  }

  const values = schemaSheet.getDataRange().getValues();
  const mappingRows = {};
  const suggestions = {};

  values.forEach(function(row, index) {
    if (index === 0) {
      return;
    }

    const section = valueOrEmpty_(row[0]).trim();
    const code = valueOrEmpty_(row[1]).trim();
    const a1 = valueOrEmpty_(row[2]).trim();
    const label = valueOrEmpty_(row[3]).trim();
    const fieldKey = valueOrEmpty_(row[4]).trim();
    const typeOrBasis = valueOrEmpty_(row[5]).trim();

    if (section === 'mapping' && fieldKey && typeOrBasis === 'input') {
      mappingRows[fieldKey] = {
        rowIndex: index + 1,
        code: code,
        a1: a1,
        label: label
      };
    }

    if (section === 'suggestion' && fieldKey && !suggestions[fieldKey]) {
      suggestions[fieldKey] = {
        code: code,
        a1: a1,
        label: label,
        basis: typeOrBasis,
        source: valueOrEmpty_(row[6]).trim()
      };
    }
  });

  Object.keys(suggestions).forEach(function(fieldKey) {
    const mapping = mappingRows[fieldKey];
    const suggestion = suggestions[fieldKey];

    if (!mapping) {
      return;
    }

    schemaSheet.getRange(mapping.rowIndex, 2, 1, 3).setValues([[
      suggestion.code || mapping.code,
      suggestion.a1 || mapping.a1,
      suggestion.label || mapping.label
    ]]);
  });

  SpreadsheetApp.flush();
  hideTemplateSchemaSheet_();
}

function logTemplateMarkerMap_() {
  Logger.log('=== TEMPLATE MARKER MAP ===');
  getTemplateMarkerMap_().forEach(function(marker) {
    Logger.log('%s | %s | %s | %s', marker.code, marker.fieldKey, marker.label, marker.a1);
  });
}

function buildTemplateMarkerNote_(marker) {
  return [
    LOG_PRINT_CONFIG.TEMPLATE_MARKER_NOTE_PREFIX,
    'code=' + marker.code,
    'field=' + marker.fieldKey,
    'label=' + marker.label,
    'cell=' + marker.a1
  ].join('\n');
}

function getTemplateMarkerMap_() {
  return [
    { code: 'AA1', fieldKey: 'DATE', label: '일자', a1: 'C2' },
    { code: 'AA2', fieldKey: 'OPERATING_HOURS', label: '운영시간', a1: 'I2' },
    { code: 'AA3', fieldKey: 'MANAGER', label: '담당자', a1: 'O2' },

    { code: 'AB1', fieldKey: 'MALE_PRESCHOOL', label: '남취학전', a1: 'C4' },
    { code: 'AB2', fieldKey: 'MALE_OUT_OF_SCHOOL', label: '남탈학교', a1: 'D4' },
    { code: 'AB3', fieldKey: 'MALE_ELEMENTARY', label: '남초등', a1: 'E4' },
    { code: 'AB4', fieldKey: 'MALE_MIDDLE', label: '남중등', a1: 'F4' },
    { code: 'AB5', fieldKey: 'MALE_HIGH', label: '남고등', a1: 'G4' },
    { code: 'AB6', fieldKey: 'MALE_OTHER', label: '남기타', a1: 'H4' },
    { code: 'AC1', fieldKey: 'FEMALE_PRESCHOOL', label: '여취학전', a1: 'C5' },
    { code: 'AC2', fieldKey: 'FEMALE_OUT_OF_SCHOOL', label: '여탈학교', a1: 'D5' },
    { code: 'AC3', fieldKey: 'FEMALE_ELEMENTARY', label: '여초등', a1: 'E5' },
    { code: 'AC4', fieldKey: 'FEMALE_MIDDLE', label: '여중등', a1: 'F5' },
    { code: 'AC5', fieldKey: 'FEMALE_HIGH', label: '여고등', a1: 'G5' },
    { code: 'AC6', fieldKey: 'FEMALE_OTHER', label: '여기타', a1: 'H5' },

    { code: 'AD1', fieldKey: 'MEAL_BREAKFAST', label: '조식', a1: 'O3' },
    { code: 'AD2', fieldKey: 'MEAL_LUNCH', label: '중식', a1: 'O4' },
    { code: 'AD3', fieldKey: 'MEAL_DINNER', label: '석식', a1: 'O5' },

    { code: 'AE1', fieldKey: 'ATTENDANCE_CAPACITY', label: '정원', a1: 'B7' },
    { code: 'AE2', fieldKey: 'ATTENDANCE_OFFICIAL', label: '공결', a1: 'E7' },
    { code: 'AE3', fieldKey: 'ATTENDANCE_ALTERNATIVE', label: '대체출석', a1: 'F7' },
    { code: 'AE4', fieldKey: 'ATTENDANCE_ABSENT', label: '결석', a1: 'G7' },
    { code: 'AE5', fieldKey: 'ATTENDANCE_OTHER', label: '출석기타', a1: 'H7' },

    { code: 'AF1', fieldKey: 'STAFF_WORKER', label: '종사자수', a1: 'L8' },
    { code: 'AF2', fieldKey: 'STAFF_TEACHER', label: '교사수', a1: 'M7' },
    { code: 'AF3', fieldKey: 'STAFF_PUBLIC', label: '공익수', a1: 'O7' },
    { code: 'AF4', fieldKey: 'STAFF_OTHER', label: '기타수', a1: 'P7' },

    { code: 'AG1', fieldKey: 'VISITOR_REASON', label: '방문자및사유', a1: 'B8' },

    { code: 'AH1', fieldKey: 'STAFF_CHANGES', label: '종사자변동', a1: 'B15' },

    { code: 'AI1', fieldKey: 'WORK_1', label: '업무1', a1: 'B17' },
    { code: 'AI2', fieldKey: 'WORK_2', label: '업무2', a1: 'B18' },
    { code: 'AI3', fieldKey: 'WORK_3', label: '업무3', a1: 'B19' },
    { code: 'AI4', fieldKey: 'WORK_4', label: '업무4', a1: 'B20' },
    { code: 'AI5', fieldKey: 'WORK_5', label: '업무5', a1: 'B21' },
    { code: 'AI6', fieldKey: 'WORK_6_7', label: '업무6~7', a1: 'B22' },

    { code: 'AJ1', fieldKey: 'MISC_NOTES', label: '기타사항', a1: 'B23' }
  ];
}

function getTemplateSecondMarkerMap_() {
  return [
    { code: 'PB1', fieldKey: 'PROGRAM_TITLE', label: '프로그램명', a1: 'C1' },
    { code: 'PB2', fieldKey: 'PROGRAM_PARTICIPANTS', label: '참석자 명단', a1: 'I1' }
  ];
}

function inspectTemplate2ProgramZones() {
  inspectTemplate2ProgramZonesInternal_();
}

function suggestSecondTemplateInputCells_(templateSheet) {
  const lastRow = templateSheet.getLastRow();
  const lastColumn = templateSheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) {
    return getTemplateSecondMarkerMap_();
  }

  const values = templateSheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const mergedRanges = templateSheet.getDataRange().getMergedRanges();
  const suggestions = [];

  function pushSuggestion(marker, suggestedA1, basis, source, note) {
    if (!suggestedA1 || !isMarkerRangeInBounds_(templateSheet, suggestedA1)) {
      return;
    }
    suggestions.push({
      code: marker.code,
      a1: suggestedA1,
      label: marker.label,
      fieldKey: marker.fieldKey,
      basis: basis,
      source: source,
      note: note || ''
    });
  }

  function findBestInputCellAroundLabel_(labelCell) {
    if (!labelCell) {
      return '';
    }
    const bounds = getMergedBoundsAtCell_(labelCell.row, labelCell.column, mergedRanges);
    const rightColumn = bounds.endColumn + 1;
    const belowRow = bounds.endRow + 1;
    const rightInBounds = isMarkerRangeInBounds_(templateSheet, rowColumnToA1_(labelCell.row, rightColumn));
    const belowInBounds = isMarkerRangeInBounds_(templateSheet, rowColumnToA1_(belowRow, labelCell.column));

    function cellScore(rowNumber, columnNumber) {
      if (rowNumber < 1 || columnNumber < 1 || rowNumber > lastRow || columnNumber > lastColumn) {
        return -1;
      }
      const value = valueOrEmpty_(values[rowNumber - 1][columnNumber - 1]).trim();
      if (!value) {
        return 3;
      }
      if (normalizeHeader_(value) === normalizeHeader_(labelCell.value)) {
        return 0;
      }
      return 1;
    }

    const rightScore = rightInBounds ? cellScore(labelCell.row, rightColumn) : -1;
    const belowScore = belowInBounds ? cellScore(belowRow, labelCell.column) : -1;

    if (rightScore >= belowScore && rightInBounds) {
      return rowColumnToA1_(labelCell.row, rightColumn);
    }
    if (belowInBounds) {
      return rowColumnToA1_(belowRow, labelCell.column);
    }
    return rightInBounds ? rowColumnToA1_(labelCell.row, rightColumn) : '';
  }

  const markers = getTemplateSecondMarkerMap_();
  markers.forEach(function(marker) {
    if (isMarkerRangeInBounds_(templateSheet, marker.a1)) {
      pushSuggestion(marker, marker.a1, 'current', 'default-map', '현재 기본 매핑 위치');
    }
  });

  const titleCell = findCellByAliases_(values, ['프로그램명', '프로그램 명'], null, 4);
  if (titleCell) {
    const suggestedA1 = findBestInputCellAroundLabel_(titleCell);
    pushSuggestion(markers[0], suggestedA1, 'label-near', titleCell.value, '프로그램명 입력칸');
  }

  const participantsCell = findCellByAliases_(
    values,
    ['참석자 명단', '참석자명단', '참여자 명단', '참여자명단', '참석자', '참여자'],
    null,
    4
  );
  if (participantsCell) {
    const suggestedA1 = findBestInputCellAroundLabel_(participantsCell);
    pushSuggestion(markers[1], suggestedA1, 'label-near', participantsCell.value, '참석자 명단 입력칸');
  }

  return uniqueSuggestions_(suggestions).map(function(item) {
    return {
      code: item.code,
      a1: item.a1,
      label: item.label,
      fieldKey: item.fieldKey
    };
  });
}

function getEffectiveSecondTemplateMarkerMap_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const secondSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SECOND_SHEET_NAME);
  if (!secondSheet) {
    return getTemplateSecondMarkerMap_();
  }

  const suggested = suggestSecondTemplateInputCells_(secondSheet);
  return Array.isArray(suggested) && suggested.length ? suggested : getTemplateSecondMarkerMap_();
}

function applyTemplateMarkerNotesToSheet_(sheet, markers, options) {
  const safeOptions = options || {};
  const writeMarkerCode = !!safeOptions.writeMarkerCode;
  (markers || []).forEach(function(marker) {
    if (!marker || !marker.a1 || !marker.fieldKey) {
      return;
    }
    if (!isMarkerRangeInBounds_(sheet, marker.a1)) {
      return;
    }
    const range = sheet.getRange(marker.a1);
    range.setNote(buildTemplateMarkerNote_(marker));
    if (writeMarkerCode) {
      range
        .setValue(marker.code)
        .setFontColor(LOG_PRINT_CONFIG.TEMPLATE_MARKER_TEXT_COLOR);
    }
  });
}

function clearTemplateSecondBindingNotes_(sheet) {
  if (!sheet) {
    return;
  }

  const maxRows = sheet.getMaxRows();
  const maxColumns = sheet.getMaxColumns();
  if (maxRows < 1 || maxColumns < 1) {
    return;
  }

  const range = sheet.getRange(1, 1, maxRows, maxColumns);
  const notes = range.getNotes();
  let changed = false;

  for (let rowIndex = 0; rowIndex < notes.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < notes[rowIndex].length; columnIndex += 1) {
      const note = String(notes[rowIndex][columnIndex] || '');
      if (!note) {
        continue;
      }
      if (note.indexOf('field=PROGRAM_TITLE') !== -1 || note.indexOf('field=PROGRAM_PARTICIPANTS') !== -1) {
        notes[rowIndex][columnIndex] = '';
        changed = true;
      }
    }
  }

  if (changed) {
    range.setNotes(notes);
  }
}

function ensureSecondTemplateBindings_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const secondSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SECOND_SHEET_NAME);
  if (!secondSheet) {
    return false;
  }
  clearTemplateSecondBindingNotes_(secondSheet);
  applyTemplateMarkerNotesToSheet_(secondSheet, getEffectiveSecondTemplateMarkerMap_(), {
    writeMarkerCode: false,
  });
  return true;
}

function repairTemplate2Bindings() {
  const applied = ensureSecondTemplateBindings_();
  SpreadsheetApp.getUi().alert(
    applied
      ? '템플릿2 바인딩을 다시 맞췄습니다.'
      : '템플릿2 시트를 찾지 못했습니다.'
  );
}

function getTemplateFormulaCellMap_() {
  return [
    { code: 'F01', fieldKey: 'MALE_TOTAL', label: '남계', a1: 'I4', formula: '=COUNT(C4:H4)' },
    { code: 'F02', fieldKey: 'FEMALE_TOTAL', label: '여계', a1: 'I5', formula: '=COUNT(C5:H5)' },
    { code: 'F03', fieldKey: 'ATTENDANCE_PRESENT', label: '출석', a1: 'D7', formula: '=SUM(I4:I5)' },
    { code: 'F04', fieldKey: 'ATTENDANCE_CURRENT', label: '현원', a1: 'C7', formula: '=D7' }
  ];
}

function isMarkerRangeInBounds_(sheet, a1Notation) {
  const match = String(a1Notation || '').match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return false;
  }

  const columnNumber = columnLetterToNumber_(match[1]);
  const rowNumber = Number(match[2]);

  return (
    rowNumber >= 1 &&
    columnNumber >= 1 &&
    rowNumber <= sheet.getMaxRows() &&
    columnNumber <= sheet.getMaxColumns()
  );
}

function columnLetterToNumber_(letters) {
  return String(letters || '').split('').reduce(function(total, char) {
    return total * 26 + (char.charCodeAt(0) - 64);
  }, 0);
}

function columnToLetter_(columnNumber) {
  let number = columnNumber;
  let result = '';

  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }

  return result;
}

function getOrCreateTemplateSchemaSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);
  }

  return sheet;
}

function hideTemplateSchemaSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);
  if (sheet) {
    sheet.hideSheet();
  }
}

function findOrCreateMappingSection_(schemaSheet) {
  const values = schemaSheet.getDataRange().getValues();

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    if (values[rowIndex][0] === 'section' && values[rowIndex][1] === 'code' && values[rowIndex][4] === 'fieldKey') {
      return rowIndex + 1;
    }
  }

  return Math.max(schemaSheet.getLastRow() + 3, 2);
}

function clearMappingSection_(schemaSheet, startRow) {
  const lastRow = schemaSheet.getLastRow();
  if (lastRow >= startRow) {
    schemaSheet.getRange(startRow, 1, lastRow - startRow + 1, 9).clearContent();
  }
}

function findOrCreateSuggestionSection_(schemaSheet) {
  const values = schemaSheet.getDataRange().getValues();

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    if (values[rowIndex][0] === 'section' && values[rowIndex][1] === 'code' && values[rowIndex][5] === 'basis') {
      return rowIndex + 1;
    }
  }

  return Math.max(schemaSheet.getLastRow() + 3, 2);
}

function clearSuggestionSection_(schemaSheet, startRow) {
  const lastRow = schemaSheet.getLastRow();
  if (lastRow >= startRow) {
    schemaSheet.getRange(startRow, 1, lastRow - startRow + 1, 8).clearContent();
  }
}

function readTemplateMarkerMapFromSchema_(schemaSheet) {
  const values = schemaSheet.getDataRange().getValues();
  const markers = [];

  values.forEach(function(row, index) {
    if (index === 0) {
      return;
    }

    if (row[0] !== 'mapping') {
      return;
    }

    const code = valueOrEmpty_(row[1]).trim();
    const a1 = valueOrEmpty_(row[2]).trim();
    const label = valueOrEmpty_(row[3]).trim();
    const fieldKey = valueOrEmpty_(row[4]).trim();
    const type = valueOrEmpty_(row[5]).trim().toLowerCase();
    const active = valueOrEmpty_(row[7]).trim().toUpperCase();

    if (!code || !a1 || !fieldKey) {
      return;
    }

    if (type !== 'input') {
      return;
    }

    if (active && active !== 'Y') {
      return;
    }

    markers.push({
      code: code,
      a1: a1,
      label: label,
      fieldKey: fieldKey,
    });
  });

  return markers.length ? markers : getTemplateMarkerMap_();
}

function suggestTemplateInputCells_(templateSheet) {
  const lastRow = templateSheet.getLastRow();
  const lastColumn = templateSheet.getLastColumn();
  const values = templateSheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const mergedRanges = templateSheet.getDataRange().getMergedRanges();
  const suggestions = [];

  function pushSuggestion(marker, suggestedA1, basis, source, note) {
    if (!suggestedA1 || !isMarkerRangeInBounds_(templateSheet, suggestedA1)) {
      return;
    }

    suggestions.push({
      code: marker.code,
      a1: suggestedA1,
      label: marker.label,
      fieldKey: marker.fieldKey,
      basis: basis,
      source: source,
      note: note || ''
    });
  }

  const markers = getTemplateMarkerMap_();

  markers.forEach(function(marker) {
    if (isMarkerRangeInBounds_(templateSheet, marker.a1)) {
      pushSuggestion(marker, marker.a1, 'current', 'default-map', '현재 기본 매핑 위치');
    }
  });

  const topInfoRules = [
    { code: 'AA1', fieldKey: 'DATE', label: '일자', aliases: ['일자', '일 자'], strategy: 'right' },
    { code: 'AA2', fieldKey: 'OPERATING_HOURS', label: '운영시간', aliases: ['운영시간', '운영 시간'], strategy: 'right' },
    { code: 'AA3', fieldKey: 'MANAGER', label: '담당자', aliases: ['담당자'], strategy: 'right' },
    { code: 'AD1', fieldKey: 'MEAL_BREAKFAST', label: '조식', aliases: ['조식'], strategy: 'right' },
    { code: 'AD2', fieldKey: 'MEAL_LUNCH', label: '중식', aliases: ['중식'], strategy: 'right' },
    { code: 'AD3', fieldKey: 'MEAL_DINNER', label: '석식', aliases: ['석식'], strategy: 'right' },
    { code: 'AG1', fieldKey: 'VISITOR_REASON', label: '방문자및사유', aliases: ['방문자및사유', '방문자및사유내용', '방문자'], strategy: 'right' },
    { code: 'AH1', fieldKey: 'STAFF_CHANGES', label: '종사자변동', aliases: ['종사자'], strategy: 'right' },
    { code: 'AJ1', fieldKey: 'MISC_NOTES', label: '기타사항', aliases: ['기타', '기타사항'], strategy: 'right' }
  ];

  topInfoRules.forEach(function(rule) {
    const found = findCellByAliases_(values, rule.aliases);
    if (!found) {
      return;
    }

    const bounds = getMergedBoundsAtCell_(found.row, found.column, mergedRanges);
    const suggestedRow = found.row;
    const suggestedColumn = bounds.endColumn + 1;
    pushSuggestion(rule, rowColumnToA1_(suggestedRow, suggestedColumn), 'label-right', found.value, '라벨 오른쪽 첫 칸');
  });

  const staffRules = [
    { code: 'AF1', fieldKey: 'STAFF_WORKER', label: '종사자수', aliases: ['종사자'] },
    { code: 'AF2', fieldKey: 'STAFF_TEACHER', label: '교사수', aliases: ['교사'] },
    { code: 'AF3', fieldKey: 'STAFF_PUBLIC', label: '공익수', aliases: ['공익'] },
    { code: 'AF4', fieldKey: 'STAFF_OTHER', label: '기타수', aliases: ['기타'] }
  ];

  staffRules.forEach(function(rule) {
    const found = findCellByAliases_(values, rule.aliases, 6);
    if (!found) {
      return;
    }
    pushSuggestion(rule, rowColumnToA1_(found.row + 1, found.column), 'label-below', found.value, '라벨 아래 칸');
  });

  const attendanceRules = [
    { code: 'AE1', fieldKey: 'ATTENDANCE_CAPACITY', label: '정원', aliases: ['정원'] },
    { code: 'AE2', fieldKey: 'ATTENDANCE_OFFICIAL', label: '공결', aliases: ['공결'] },
    { code: 'AE3', fieldKey: 'ATTENDANCE_ALTERNATIVE', label: '대체출석', aliases: ['대체출석'] },
    { code: 'AE4', fieldKey: 'ATTENDANCE_ABSENT', label: '결석', aliases: ['결석'] },
    { code: 'AE5', fieldKey: 'ATTENDANCE_OTHER', label: '출석기타', aliases: ['기타'] }
  ];

  attendanceRules.forEach(function(rule) {
    const found = findCellByAliases_(values, rule.aliases, 6, 6);
    if (!found) {
      return;
    }
    pushSuggestion(rule, rowColumnToA1_(found.row + 1, found.column), 'header-below', found.value, '출석 헤더 아래 칸');
  });

  const maleRow = findCellByAliases_(values, ['남']);
  const femaleRow = findCellByAliases_(values, ['여']);
  const categoryRules = [
    { code: 'AB1', fieldKey: 'MALE_PRESCHOOL', label: '남취학전', categoryAliases: ['취학전'], gender: 'male' },
    { code: 'AB2', fieldKey: 'MALE_OUT_OF_SCHOOL', label: '남탈학교', categoryAliases: ['탈학교'], gender: 'male' },
    { code: 'AB3', fieldKey: 'MALE_ELEMENTARY', label: '남초등', categoryAliases: ['초등학교', '초등'], gender: 'male' },
    { code: 'AB4', fieldKey: 'MALE_MIDDLE', label: '남중등', categoryAliases: ['중학교', '중학'], gender: 'male' },
    { code: 'AB5', fieldKey: 'MALE_HIGH', label: '남고등', categoryAliases: ['고등학교', '고등'], gender: 'male' },
    { code: 'AB6', fieldKey: 'MALE_OTHER', label: '남기타', categoryAliases: ['기타'], gender: 'male' },
    { code: 'AC1', fieldKey: 'FEMALE_PRESCHOOL', label: '여취학전', categoryAliases: ['취학전'], gender: 'female' },
    { code: 'AC2', fieldKey: 'FEMALE_OUT_OF_SCHOOL', label: '여탈학교', categoryAliases: ['탈학교'], gender: 'female' },
    { code: 'AC3', fieldKey: 'FEMALE_ELEMENTARY', label: '여초등', categoryAliases: ['초등학교', '초등'], gender: 'female' },
    { code: 'AC4', fieldKey: 'FEMALE_MIDDLE', label: '여중등', categoryAliases: ['중학교', '중학'], gender: 'female' },
    { code: 'AC5', fieldKey: 'FEMALE_HIGH', label: '여고등', categoryAliases: ['고등학교', '고등'], gender: 'female' },
    { code: 'AC6', fieldKey: 'FEMALE_OTHER', label: '여기타', categoryAliases: ['기타'], gender: 'female' }
  ];

  categoryRules.forEach(function(rule) {
    const headerCell = findCellByAliases_(values, rule.categoryAliases, 3, 3);
    const genderCell = rule.gender === 'male' ? maleRow : femaleRow;
    if (!headerCell || !genderCell) {
      return;
    }
    pushSuggestion(
      rule,
      rowColumnToA1_(genderCell.row, headerCell.column),
      'matrix',
      genderCell.value + '+' + headerCell.value,
      '성별 행과 항목 열의 교차 셀'
    );
  });

  const workLabels = ['업무 내용'];
  const workCell = findCellByAliases_(values, workLabels);
  if (workCell) {
    const workBounds = getMergedBoundsAtCell_(workCell.row, workCell.column, mergedRanges);
    for (let index = 0; index < 6; index += 1) {
      const row = workCell.row + index;
      const markerCode = 'AI' + (index + 1);
      const fieldKey = index < 5 ? 'WORK_' + (index + 1) : 'WORK_6_7';
      pushSuggestion(
        { code: markerCode, fieldKey: fieldKey, label: fieldKey },
        rowColumnToA1_(row, workBounds.endColumn + 1),
        'block-right',
        workCell.value,
        '업무 내용 라벨 오른쪽 줄'
      );
    }
  }

  return uniqueSuggestions_(suggestions);
}

function uniqueSuggestions_(suggestions) {
  const seen = {};
  return suggestions.filter(function(item) {
    const key = [item.code, item.a1, item.basis].join('|');
    if (seen[key]) {
      return false;
    }
    seen[key] = true;
    return true;
  });
}

function findCellByAliases_(values, aliases, fixedRow, minRow) {
  const normalizedAliases = aliases.map(function(alias) {
    return normalizeHeader_(alias);
  });

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const rowNumber = rowIndex + 1;
    if (fixedRow && rowNumber !== fixedRow) {
      continue;
    }
    if (minRow && rowNumber < minRow) {
      continue;
    }

    for (let columnIndex = 0; columnIndex < values[rowIndex].length; columnIndex += 1) {
      const value = values[rowIndex][columnIndex];
      const normalizedValue = normalizeHeader_(value);
      if (!normalizedValue) {
        continue;
      }

      if (normalizedAliases.indexOf(normalizedValue) !== -1) {
        return {
          row: rowNumber,
          column: columnIndex + 1,
          value: value
        };
      }
    }
  }

  return null;
}

function getMergedBoundsAtCell_(rowNumber, columnNumber, mergedRanges) {
  for (let index = 0; index < mergedRanges.length; index += 1) {
    const range = mergedRanges[index];
    const startRow = range.getRow();
    const endRow = startRow + range.getNumRows() - 1;
    const startColumn = range.getColumn();
    const endColumn = startColumn + range.getNumColumns() - 1;

    if (
      rowNumber >= startRow &&
      rowNumber <= endRow &&
      columnNumber >= startColumn &&
      columnNumber <= endColumn
    ) {
      return {
        startRow: startRow,
        endRow: endRow,
        startColumn: startColumn,
        endColumn: endColumn
      };
    }
  }

  return {
    startRow: rowNumber,
    endRow: rowNumber,
    startColumn: columnNumber,
    endColumn: columnNumber
  };
}

function rowColumnToA1_(rowNumber, columnNumber) {
  return columnToLetter_(columnNumber) + String(rowNumber);
}

function formatTemplateSchemaSheet_(sheet, totalRows) {
  const lastRow = Math.max(totalRows, 1);
  const lastColumn = 8;

  sheet.getBandings().forEach(function(banding) {
    banding.remove();
  });

  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn)
    .setBackground('#dbeafe')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).setVerticalAlignment('middle');
    sheet.getRange(2, 1, lastRow - 1, lastColumn).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  }

  sheet.autoResizeColumns(1, lastColumn);
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 240);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 180);
  sheet.setColumnWidth(8, 150);
}

function readTemplateSchemaMeta_(schemaSheet) {
  const values = schemaSheet.getDataRange().getValues();
  const meta = {
    lastRow: 0,
    lastColumn: 0,
  };

  values.forEach(function(row, index) {
    if (index === 0) {
      return;
    }

    if (row[0] !== 'meta') {
      return;
    }

    if (row[1] === 'lastRow') {
      meta.lastRow = Number(row[3]) || 0;
    }

    if (row[1] === 'lastColumn') {
      meta.lastColumn = Number(row[3]) || 0;
    }
  });

  return meta;
}

function isMarkerWithinSchemaBounds_(a1Notation, schemaMeta) {
  const match = String(a1Notation || '').match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    return false;
  }

  const columnNumber = columnLetterToNumber_(match[1]);
  const rowNumber = Number(match[2]);

  return (
    rowNumber >= 1 &&
    columnNumber >= 1 &&
    rowNumber <= schemaMeta.lastRow &&
    columnNumber <= schemaMeta.lastColumn
  );
}

function showLogPreview() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = spreadsheet.getActiveSheet();
  const logDataResult = resolveLogDataSheet_(spreadsheet);
  const dataSheet = logDataResult.sheet;

  if (!dataSheet) {
    ui.alert(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
    return;
  }

  if (!activeSheet || activeSheet.getSheetId() !== dataSheet.getSheetId()) {
    ui.alert("'" + dataSheet.getName() + "' 시트에서 인쇄할 행을 먼저 선택해주세요.");
    return;
  }

  if (LOG_PRINT_CONFIG.REQUIRE_Q7T7 && !validateQ7T7_(activeSheet)) {
    ui.alert('Q7:T7에 유효한 값을 입력하세요. 예: 2025, 1, 1, 5');
    return;
  }

  const activeRange = activeSheet.getActiveRange();
  const selection = getPrintableSelection_(activeRange);

  if (!selection) {
    ui.alert('인쇄할 데이터(3행 이후의 날짜가 있는 행)를 드래그하여 선택해주세요.');
    return;
  }

  try {
    ensureLogDetailColumnsInLogSheet_(activeSheet);
    const fieldMap = getFieldMap_(activeSheet);
    const columnCount = Math.max(activeSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
    const rows = getSheetValuesWithPadding_(activeSheet, selection.startRow, selection.numRows, columnCount);

    const reports = rows
      .map(function(row, index) {
        return {
          rowNumber: selection.startRow + index,
          row: row,
        };
      })
      .filter(function(item) {
        return hasRequiredDate_(item.row, fieldMap);
      })
      .map(function(item, index) {
        return createEditableReportViewModel_(item.row, fieldMap, item.rowNumber, index + 1);
      });

    if (!reports.length) {
      ui.alert('선택한 범위에 출력할 데이터가 없습니다.');
      return;
    }

    const settings = getAutomationSettings_();
    const reportsWithApproval = reports.map(function(report) {
      report.approvalSlots = buildApprovalSlotsForReport_(report, settings);
      return report;
    });
    const template = HtmlService.createTemplate(buildEditablePreviewTemplate_());
    const initialDataJson = JSON.stringify({
      reports: reportsWithApproval,
      pageCount: reportsWithApproval.length,
      selectedYear: logDataResult.year || '',
      layoutConfig: getTemplateColumnLayoutConfig_(),
    });
    template.initialDataJson = initialDataJson;
    template.initialDataJsonEscaped = initialDataJson.replace(/<\//g, '<\\/');

    const htmlOutput = template.evaluate()
      .setWidth(LOG_PRINT_CONFIG.DIALOG_WIDTH)
      .setHeight(LOG_PRINT_CONFIG.DIALOG_HEIGHT);

    ui.showModalDialog(htmlOutput, LOG_PRINT_CONFIG.DIALOG_TITLE);
  } catch (error) {
    Logger.log('showLogPreview failed: %s\n%s', error.message, error.stack || '');
    ui.alert('미리보기 실패: ' + error.message);
  }
}

function validateQ7T7_(sheet) {
  const values = sheet.getRange('Q7:T7').getValues()[0];
  const q = Number(values[0]);
  const r = Number(values[1]);
  const s = Number(values[2]);
  const t = Number(values[3]);

  return (
    !isNaN(q) && values[0] !== '' &&
    !isNaN(r) && values[1] !== '' &&
    !isNaN(s) && values[2] !== '' &&
    !isNaN(t) && values[3] !== ''
  );
}

function getPrintableSelection_(range) {
  if (!range) {
    return null;
  }

  const firstRow = Math.max(range.getRow(), LOG_PRINT_CONFIG.DATA_START_ROW);
  const lastRow = range.getLastRow();

  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return null;
  }

  return {
    startRow: firstRow,
    numRows: lastRow - firstRow + 1,
  };
}

function hasRequiredDate_(row, fieldMap) {
  return hasDisplayValue_(row[fieldMap.DATE]);
}

function createEditableReportViewModel_(row, fieldMap, rowNumber, pageNumber) {
  const miscNotesRaw = valueOrEmpty_(row[LOG_MISC_NOTES_COLUMN_INDEX]);
  const dateKey = normalizeDateKey_(row[fieldMap.DATE]);
  const selectedYear = dateKey ? dateKey.slice(0, 4) : '';
  const visitorReason = mergeNonStaffOtherVisitorReasonText_(
    getOptionalTextValue_(row, fieldMap, 'VISITOR_REASON'),
    buildNonStaffVisitorTextForDate_(dateKey, selectedYear)
  );
  const works = getWorksValues_(row, fieldMap);
  works[0] = mergeNonStaffRoleWorkText_(
    works[0],
    buildNonStaffRoleWorkTextForDate_(dateKey, selectedYear)
  );
  return {
    rowNumber: rowNumber,
    pageNumber: pageNumber,
    date: formatDateValue_(row[fieldMap.DATE]),
    operatingHours: valueOrEmpty_(row[fieldMap.OPERATING_HOURS]),
    manager: valueOrEmpty_(row[fieldMap.MANAGER]),
    maleCounts: CHILD_MALE_FIELDS.map(function(fieldKey) {
      return toNumber_(row[fieldMap[fieldKey]]);
    }),
    femaleCounts: CHILD_FEMALE_FIELDS.map(function(fieldKey) {
      return toNumber_(row[fieldMap[fieldKey]]);
    }),
    staffWorker: toNumber_(row[fieldMap.STAFF_WORKER]),
    staffTeacher: toNumber_(row[fieldMap.STAFF_TEACHER]),
    staffPublic: toNumber_(row[fieldMap.STAFF_PUBLIC]),
    staffOther: toNumber_(row[fieldMap.STAFF_OTHER]),
    staffChanges: valueOrEmpty_(row[fieldMap.STAFF_CHANGES]),
    childChanges: valueOrEmpty_(row[fieldMap.CHILD_CHANGES]),
    mealBreakfast: getOptionalNumberValue_(row, fieldMap, 'MEAL_BREAKFAST'),
    mealLunch: getOptionalNumberValue_(row, fieldMap, 'MEAL_LUNCH'),
    mealDinner: getOptionalNumberValue_(row, fieldMap, 'MEAL_DINNER'),
    attendanceCapacity: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_CAPACITY'),
    attendanceCurrent: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_CURRENT'),
    attendancePresent: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_PRESENT'),
    attendanceOfficial: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_OFFICIAL'),
    attendanceAlternative: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_ALTERNATIVE'),
    attendanceAbsent: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_ABSENT'),
    attendanceOther: getOptionalNumberValue_(row, fieldMap, 'ATTENDANCE_OTHER'),
    visitorReason: visitorReason,
    childSpecialCounseling: getOptionalTextValue_(row, fieldMap, 'CHILD_SPECIAL_COUNSELING'),
    facilitySafetyHygiene: getOptionalTextValue_(row, fieldMap, 'FACILITY_SAFETY_HYGIENE'),
    suppliesEnvironment: getOptionalTextValue_(row, fieldMap, 'SUPPLIES_ENVIRONMENT'),
    staffEducationTrip: getOptionalTextValue_(row, fieldMap, 'STAFF_EDUCATION_TRIP'),
    miscNotesRaw: miscNotesRaw,
    miscNotes: stripProgramJournalMarkerFromNotes_(miscNotesRaw),
    guidanceLife: DEFAULT_GUIDANCE_TEXT.life,
    guidanceHygiene: DEFAULT_GUIDANCE_TEXT.hygiene,
    guidanceSafety: DEFAULT_GUIDANCE_TEXT.safety,
    works: works,
    programTexts: [],
    hasProgramPage: false,
  };
}

function stripProgramJournalMarkerFromNotes_(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(function(line) {
      return valueOrEmpty_(line).trim();
    })
    .filter(function(line) {
      return line && line.indexOf('프로그램일지:') !== 0;
    })
    .join('\n');
}

function getReportsByRowNumbers_(rowNumbers, selectedYear) {
  SpreadsheetApp.flush();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logDataResult = resolveLogDataSheet_(spreadsheet, selectedYear);
  const sheet = logDataResult.sheet;
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || logDataResult.year || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
  }

  ensureLogDetailColumnsInLogSheet_(sheet);
  const fieldMap = getFieldMap_(sheet);
  const columnCount = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const uniqueRowNumbers = normalizeRowNumbers_(rowNumbers);

  if (!uniqueRowNumbers.length) {
    return [];
  }

  const firstRow = uniqueRowNumbers[0];
  const lastRow = uniqueRowNumbers[uniqueRowNumbers.length - 1];
  const blockRows = getSheetValuesWithPadding_(sheet, firstRow, lastRow - firstRow + 1, columnCount);
  let programByDate = {};
  try {
    programByDate = readProgramJournalSummaryByDate_(resolvedYear) || {};
  } catch (error) {
    Logger.log('getReportsByRowNumbers_ skipped program journal lookup: %s', error && error.message ? error.message : error);
    programByDate = {};
  }

  return uniqueRowNumbers
    .map(function(rowNumber) {
      return {
        rowNumber: rowNumber,
        row: blockRows[rowNumber - firstRow],
      };
    })
    .filter(function(item) {
      return hasRequiredDate_(item.row, fieldMap);
    })
    .map(function(item, index) {
      const report = createEditableReportViewModel_(item.row, fieldMap, item.rowNumber, index + 1);
      const programItems = getProgramJournalItemsForDate_(programByDate, item.row[fieldMap.DATE]);
      report.programTexts = getProgramJournalTextsForDate_(programByDate, item.row[fieldMap.DATE]);
      report.programItems = programItems;
      report.programTitle = buildProgramJournalTitleText_(programItems);
      report.programParticipants = buildProgramJournalParticipantsText_(programItems);
      report.hasProgramPage = report.programTexts.length > 0;
      return report;
    });
}




function getTemplateSheetCellWidthPx_(sheet, startColumn, colspan) {
  let total = 0;
  for (let column = startColumn; column < startColumn + Math.max(colspan || 1, 1); column += 1) {
    total += sheet.getColumnWidth(column);
  }
  return total;
}

function getTemplateSheetCellHeightPx_(sheet, startRow, rowspan) {
  let total = 0;
  for (let row = startRow; row < startRow + Math.max(rowspan || 1, 1); row += 1) {
    total += sheet.getRowHeight(row);
  }
  return total;
}

function extractDriveFileIdFromValue_(value) {
  const rawValue = valueOrEmpty_(value).trim();
  if (!rawValue) {
    return '';
  }

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = rawValue.match(patterns[index]);
    if (match && match[1]) {
      return match[1];
    }
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(rawValue)) {
    return rawValue;
  }

  return '';
}

function exportSpreadsheetAsPdfBlob_(spreadsheetId, fileName) {
  const url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export'
    + '?format=pdf'
    + '&size=A4'
    + '&portrait=true'
    + '&fitw=true'
    + '&sheetnames=false'
    + '&printtitle=false'
    + '&pagenumbers=false'
    + '&gridlines=false'
    + '&fzr=false'
    + '&attachment=false'
    + '&top_margin=0.40'
    + '&bottom_margin=0.40'
    + '&left_margin=0.40'
    + '&right_margin=0.40';

  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('PDF 내보내기에 실패했습니다. (' + response.getResponseCode() + ') ' + response.getContentText());
  }

  return response.getBlob().setName(fileName || 'preview.pdf');
}

function getFieldMap_(sheet) {
  const optionalFieldMap = Object.keys(OPTIONAL_HEADER_FIELD_RULES).reduce(function(result, fieldKey) {
    result[fieldKey] = null;
    return result;
  }, {});
  const fieldMap = Object.assign({}, COL, optionalFieldMap, { WORKS: WORK_COLS.slice() });
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    return fieldMap;
  }

  const headerValues = sheet
    .getRange(LOG_PRINT_CONFIG.HEADER_ROW, 1, 1, lastColumn)
    .getDisplayValues()[0];

  const headerLookup = buildHeaderLookup_(headerValues);
  const missingLabels = [];

  Object.keys(HEADER_FIELD_RULES).forEach(function(fieldKey) {
    const matchedIndex = findHeaderIndex_(headerLookup, HEADER_FIELD_RULES[fieldKey]);
    if (matchedIndex === null) {
      if (!LOG_PRINT_CONFIG.ALLOW_POSITIONAL_FALLBACK) {
        missingLabels.push(getFieldLabel_(fieldKey));
      }
      return;
    }

    fieldMap[fieldKey] = matchedIndex;
  });

  Object.keys(OPTIONAL_HEADER_FIELD_RULES).forEach(function(fieldKey) {
    const matchedIndex = findHeaderIndex_(headerLookup, OPTIONAL_HEADER_FIELD_RULES[fieldKey]);
    if (matchedIndex !== null) {
      fieldMap[fieldKey] = matchedIndex;
    }
  });

  fieldMap.MISC_NOTES = LOG_MISC_NOTES_COLUMN_INDEX;

  const workIndexes = findWorkIndexes_(headerValues);
  if (workIndexes.length) {
    fieldMap.WORKS = workIndexes.filter(function(index) {
      return index !== LOG_MISC_NOTES_COLUMN_INDEX;
    });
  } else if (!LOG_PRINT_CONFIG.ALLOW_POSITIONAL_FALLBACK) {
    missingLabels.push('업무 내용');
  }

  if (missingLabels.length) {
    throw new Error(
      '1행 헤더에서 필요한 항목을 찾지 못했습니다: ' +
      missingLabels.join(', ') +
      '. 헤더명을 확인하거나 HEADER_FIELD_RULES 후보명을 추가해주세요.'
    );
  }

  return fieldMap;
}

function buildHeaderLookup_(headerValues) {
  return headerValues.reduce(function(lookup, headerValue, index) {
    const normalized = normalizeHeader_(headerValue);
    if (!normalized) {
      return lookup;
    }

    if (!lookup[normalized]) {
      lookup[normalized] = [];
    }

    lookup[normalized].push(index);
    return lookup;
  }, {});
}

function buildHeaderIndexMap_(headerValues) {
  return (headerValues || []).reduce(function(indexMap, headerValue, index) {
    const rawHeader = valueOrEmpty_(headerValue).trim();
    const normalizedHeader = normalizeHeader_(headerValue);

    if (rawHeader && indexMap[rawHeader] === undefined) {
      indexMap[rawHeader] = index;
    }

    if (normalizedHeader && indexMap[normalizedHeader] === undefined) {
      indexMap[normalizedHeader] = index;
    }

    return indexMap;
  }, {});
}

function findHeaderIndex_(headerLookup, aliases) {
  for (let index = 0; index < aliases.length; index += 1) {
    const normalizedAlias = normalizeHeader_(aliases[index]);
    const matchedIndexes = headerLookup[normalizedAlias];
    if (matchedIndexes && matchedIndexes.length) {
      return matchedIndexes[0];
    }
  }

  return null;
}

function findWorkIndexes_(headerValues) {
  return headerValues.reduce(function(indexes, headerValue, index) {
    const normalizedHeader = normalizeHeader_(headerValue);
    if (!normalizedHeader) {
      return indexes;
    }

    const isExactMatch = WORK_HEADER_EXACT_ALIASES.some(function(alias) {
      return normalizeHeader_(alias) === normalizedHeader;
    });

    const isPatternMatch = WORK_HEADER_PATTERNS.some(function(pattern) {
      return pattern.test(normalizedHeader);
    });

    if (isExactMatch || isPatternMatch) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function normalizeHeader_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣]/g, '');
}

function getFieldLabel_(fieldKey) {
  const firstAlias = HEADER_FIELD_RULES[fieldKey] && HEADER_FIELD_RULES[fieldKey][0];
  return firstAlias || fieldKey;
}

function getRequiredColumnCount_(fieldMap) {
  const allIndexes = Object.keys(fieldMap || {})
    .filter(function(fieldKey) {
      return fieldKey !== 'WORKS';
    })
    .map(function(fieldKey) {
      return fieldMap[fieldKey];
    })
    .concat(fieldMap.WORKS || [])
    .filter(function(index) {
      return Number.isInteger(index) && index >= 0;
    });

  const maxIndex = allIndexes.reduce(function(currentMax, index) {
    return Math.max(currentMax, index);
  }, -1);

  return maxIndex + 1;
}

function formatDateValue_(value) {
  if (value instanceof Date) {
    const timeZone = Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE;
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  return value === null || value === '' ? '' : String(value);
}

function formatDate_(value) {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    return '';
  }

  const timeZone = Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE;
  return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
}

function hasDisplayValue_(value) {
  return value !== '' && value !== null && String(value).trim() !== '';
}

function toNumber_(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function sumNumbers_(numbers) {
  return numbers.reduce(function(total, numberValue) {
    return total + numberValue;
  }, 0);
}

function valueOrEmpty_(value) {
  return value === null || value === undefined ? '' : String(value);
}

function getOptionalNumberValue_(row, fieldMap, fieldKey) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return '';
  }
  return toNumber_(row[columnIndex]);
}

function getOptionalTextValue_(row, fieldMap, fieldKey) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return '';
  }
  return valueOrEmpty_(row[columnIndex]);
}

function writeOptionalField_(sheet, rowNumber, fieldMap, fieldKey, value, isNumber) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return;
  }

  sheet.getRange(rowNumber, columnIndex + 1).setValue(isNumber ? toNumber_(value) : (value || ''));
}

function getAssistantSheetStatus(selectedYear, targetDate, lookbackDays) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logDataResult = resolveLogDataSheet_(spreadsheet, selectedYear);

  if (!logDataResult.sheet) {
    throw new Error(logDataResult.errorMessage || '운영일지 시트를 찾을 수 없습니다.');
  }

  const sheet = logDataResult.sheet;
  const fieldMap = getFieldMap_(sheet);
  const safeLookbackDays = Math.max(1, Number(lookbackDays) || 3);
  const resolvedTargetDate = normalizeAssistantDateKey_(targetDate) || normalizeAssistantDateKey_(new Date());
  const requiredColumns = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const lastRow = sheet.getLastRow();
  const dataRowCount = Math.max(0, lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  const dataRows = dataRowCount > 0
    ? sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, dataRowCount, requiredColumns).getDisplayValues()
    : [];
  const rowEntries = dataRows.map(function(row, index) {
    return buildAssistantRowEntry_(row, fieldMap, LOG_PRINT_CONFIG.DATA_START_ROW + index);
  });
  const targetRowIndex = rowEntries.findIndex(function(entry) {
    return entry.date === resolvedTargetDate;
  });
  const latestRowIndex = findAssistantLatestRowIndex_(rowEntries);
  const effectiveRowIndex = targetRowIndex >= 0 ? targetRowIndex : latestRowIndex;
  const targetEntry = targetRowIndex >= 0 ? rowEntries[targetRowIndex] : null;
  const effectiveEntry = effectiveRowIndex >= 0 ? rowEntries[effectiveRowIndex] : null;
  const recentEntries = buildAssistantRecentEntries_(rowEntries, effectiveRowIndex, safeLookbackDays);
  const alerts = buildAssistantAlerts_(targetEntry, effectiveEntry, recentEntries);

  return {
    spreadsheetName: spreadsheet.getName(),
    sheetName: sheet.getName(),
    year: logDataResult.year,
    targetDate: resolvedTargetDate,
    generatedAt: new Date().toISOString(),
    matchMode: targetEntry ? 'target-date' : 'latest-row',
    rowStats: {
      lastRow: lastRow,
      dataRowCount: dataRowCount,
      workColumnCount: (fieldMap.WORKS || []).length,
    },
    targetRow: targetEntry,
    effectiveRow: effectiveEntry,
    recentRows: recentEntries,
    alerts: alerts,
  };
}

function getAssistantSheetStatusJson(selectedYear, targetDate, lookbackDays) {
  return JSON.stringify(getAssistantSheetStatus(selectedYear, targetDate, lookbackDays));
}

function getAssistantTodayStatusJson() {
  return getAssistantSheetStatusJson(null, null, 3);
}

function saveAssistantTodayStatusSnapshot() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const status = getAssistantSheetStatus(selectedYear, null, 3);
  writeDataStoreJson_('assistant_status', selectedYear, status);
  return status;
}

function saveAssistantDailyBrief() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const status = getAssistantSheetStatus(selectedYear, null, 3);
  const brief = buildAssistantDailyBrief_(status);
  writeDataStoreJson_('assistant_brief', selectedYear, brief);
  return brief;
}

function saveAssistantStatusAndBrief() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const status = getAssistantSheetStatus(selectedYear, null, 3);
  const brief = buildAssistantDailyBrief_(status);
  const telegramMessage = buildAssistantTelegramMessage_(brief);
  writeDataStoreJson_('assistant_status', selectedYear, status);
  writeDataStoreJson_('assistant_brief', selectedYear, brief);
  writeDataStoreJson_('assistant_telegram', selectedYear, {
    generatedAt: new Date().toISOString(),
    message: telegramMessage,
  });
  return {
    status: status,
    brief: brief,
    telegramMessage: telegramMessage,
  };
}

function getAssistantStoredStatus(selectedYear) {
  return readDataStoreJson_('assistant_status', selectedYear);
}

function getAssistantStoredBrief(selectedYear) {
  return readDataStoreJson_('assistant_brief', selectedYear);
}

function getAssistantStoredTelegramMessage(selectedYear) {
  return readDataStoreJson_('assistant_telegram', selectedYear);
}

function getAssistantTodayTelegramMessage() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const status = getAssistantSheetStatus(selectedYear, null, 3);
  const brief = buildAssistantDailyBrief_(status);
  return buildAssistantTelegramMessage_(brief);
}

function saveAssistantTelegramDraft() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const message = getAssistantTodayTelegramMessage();
  const payload = {
    generatedAt: new Date().toISOString(),
    message: message,
  };
  writeDataStoreJson_('assistant_telegram', selectedYear, payload);
  return payload;
}

function buildAssistantRowEntry_(row, fieldMap, rowNumber) {
  const workIndexes = fieldMap.WORKS || [];
  const works = workIndexes.map(function(columnIndex, index) {
    return {
      slot: index + 1,
      value: valueOrEmpty_(row[columnIndex]).trim(),
    };
  });
  const filledWorks = works
    .filter(function(item) {
      return item.value !== '';
    })
    .map(function(item) {
      return item.value;
    });
  const emptyWorkSlots = works
    .filter(function(item) {
      return item.value === '';
    })
    .map(function(item) {
      return item.slot;
    });

  return {
    rowNumber: rowNumber,
    date: normalizeAssistantDateKey_(row[fieldMap.DATE]),
    manager: getOptionalTextValue_(row, fieldMap, 'MANAGER'),
    staffChanges: getOptionalTextValue_(row, fieldMap, 'STAFF_CHANGES'),
    childChanges: getOptionalTextValue_(row, fieldMap, 'CHILD_CHANGES'),
    works: filledWorks,
    emptyWorkSlots: emptyWorkSlots,
    workSummary: {
      filledCount: filledWorks.length,
      emptyCount: emptyWorkSlots.length,
    },
    missingFields: buildAssistantMissingFields_(row, fieldMap, emptyWorkSlots),
  };
}

function buildAssistantMissingFields_(row, fieldMap, emptyWorkSlots) {
  const missing = [];

  if (!hasDisplayValue_(row[fieldMap.DATE])) {
    missing.push('date');
  }

  if (!hasDisplayValue_(row[fieldMap.MANAGER])) {
    missing.push('manager');
  }

  if ((emptyWorkSlots || []).length) {
    missing.push('work');
  }

  return missing;
}

function buildAssistantRecentEntries_(rowEntries, targetRowIndex, lookbackDays) {
  if (!rowEntries.length) {
    return [];
  }

  const endIndex = targetRowIndex >= 0 ? targetRowIndex : rowEntries.length - 1;
  const startIndex = Math.max(0, endIndex - lookbackDays + 1);
  return rowEntries.slice(startIndex, endIndex + 1);
}

function findAssistantLatestRowIndex_(rowEntries) {
  for (let index = rowEntries.length - 1; index >= 0; index -= 1) {
    const entry = rowEntries[index];
    if (entry && (entry.date || entry.manager || entry.works.length || entry.staffChanges || entry.childChanges)) {
      return index;
    }
  }

  return rowEntries.length ? rowEntries.length - 1 : -1;
}

function buildAssistantAlerts_(targetEntry, effectiveEntry, recentEntries) {
  const alerts = [];

  if (!targetEntry) {
    alerts.push('target-row-missing');
  }

  if (!effectiveEntry) {
    return alerts;
  }

  if (!effectiveEntry.manager) {
    alerts.push('manager-missing');
  }

  if (effectiveEntry.emptyWorkSlots.length) {
    alerts.push('work-slots-missing');
  }

  const recentWithoutTarget = recentEntries.filter(function(entry) {
    return entry.rowNumber !== effectiveEntry.rowNumber;
  });
  const hasRecentWork = recentWithoutTarget.some(function(entry) {
    return entry.workSummary.filledCount > 0;
  });

  if (effectiveEntry.workSummary.filledCount === 0 && hasRecentWork) {
    alerts.push(targetEntry ? 'today-work-empty-but-recent-exists' : 'latest-work-empty-but-recent-exists');
  }

  return alerts;
}

function normalizeAssistantDateKey_(value) {
  if (value instanceof Date) {
    const timeZone = Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE;
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  const rawValue = valueOrEmpty_(value).trim();
  if (!rawValue) {
    return '';
  }

  const normalized = rawValue
    .replace(/[./]/g, '-')
    .replace(/\s+/g, '')
    .replace(/년/g, '-')
    .replace(/월/g, '-')
    .replace(/일/g, '')
    .replace(/[월화수목금토일]$/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');

  const parts = normalized.split('-').filter(function(part) {
    return part !== '';
  });

  if (parts.length === 3) {
    const yearText = parts[0];
    const yearNumber = Number(yearText);
    const normalizedYear = String(Number.isFinite(yearNumber) && yearText.length <= 2 ? (yearNumber <= 49 ? 2000 + yearNumber : 1900 + yearNumber) : yearText).padStart(4, '0');
    return [
      normalizedYear,
      parts[1].padStart(2, '0'),
      parts[2].padStart(2, '0'),
    ].join('-');
  }

  return rawValue;
}

function buildAssistantDailyBrief_(status) {
  const targetRow = status && status.targetRow ? status.targetRow : null;
  const effectiveRow = status && status.effectiveRow ? status.effectiveRow : targetRow;
  const recentRows = status && status.recentRows ? status.recentRows : [];
  const alerts = status && status.alerts ? status.alerts : [];
  const recentSummary = recentRows.map(function(row) {
    return {
      date: row.date,
      manager: row.manager,
      workCount: row.workSummary ? row.workSummary.filledCount : 0,
      hasStaffChanges: !!row.staffChanges,
      hasChildChanges: !!row.childChanges,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    targetDate: status ? status.targetDate : '',
    sheetName: status ? status.sheetName : '',
    matchMode: status ? status.matchMode : '',
    alerts: alerts,
    summary: buildAssistantSummaryText_(targetRow, effectiveRow, alerts, status ? status.matchMode : ''),
    actions: buildAssistantActionItems_(targetRow, effectiveRow, alerts, status ? status.matchMode : ''),
    targetRow: effectiveRow ? {
      rowNumber: effectiveRow.rowNumber,
      date: effectiveRow.date,
      manager: effectiveRow.manager,
      works: effectiveRow.works || [],
      emptyWorkSlots: effectiveRow.emptyWorkSlots || [],
      staffChanges: effectiveRow.staffChanges || '',
      childChanges: effectiveRow.childChanges || '',
    } : null,
    recentRows: recentSummary,
  };
}

function buildAssistantSummaryText_(targetRow, effectiveRow, alerts, matchMode) {
  if (!effectiveRow) {
    return '오늘 운영일지 행을 찾지 못했습니다.';
  }

  const summaryParts = [];
  if (matchMode === 'latest-row' && !targetRow) {
    summaryParts.push('오늘 행 없음, 최근 작성행 기준');
  }

  summaryParts.push('업무 ' + (effectiveRow.workSummary ? effectiveRow.workSummary.filledCount : 0) + '건 입력');

  if (effectiveRow.date) {
    summaryParts.push('기준 행 ' + effectiveRow.date);
  }

  if (effectiveRow.manager) {
    summaryParts.push('담당자 ' + effectiveRow.manager);
  }

  if (effectiveRow.childChanges) {
    summaryParts.push('아동변동 있음');
  }

  if (effectiveRow.staffChanges) {
    summaryParts.push('종사자변동 있음');
  }

  if ((alerts || []).indexOf('work-slots-missing') >= 0) {
    summaryParts.push('업무 빈칸 존재');
  }

  return summaryParts.join(' / ');
}

function buildAssistantActionItems_(targetRow, effectiveRow, alerts, matchMode) {
  const actions = [];

  if (!effectiveRow) {
    actions.push('오늘 날짜 운영일지 행이 있는지 먼저 확인');
    return actions;
  }

  if (matchMode === 'latest-row' && !targetRow) {
    actions.push('오늘 날짜 행이 없으므로 최신 작성행 이후 일지 작성 여부 확인');
  }

  if (!effectiveRow.manager) {
    actions.push('담당자 칸 확인');
  }

  if ((alerts || []).indexOf('work-slots-missing') >= 0) {
    actions.push('비어 있는 업무 칸 보완');
  }

  if (effectiveRow.childChanges && !effectiveRow.works.length) {
    actions.push('아동 변동에 대한 업무 기록 추가');
  }

  if (effectiveRow.staffChanges && !effectiveRow.works.length) {
    actions.push('종사자 변동에 대한 업무 기록 추가');
  }

  if (!actions.length) {
    actions.push('추가 확인 필요 없음');
  }

  return actions;
}

function buildAssistantTelegramMessage_(brief) {
  const safeBrief = brief || {};
  const alerts = safeBrief.alerts || [];
  const actions = safeBrief.actions || [];
  const recentRows = safeBrief.recentRows || [];
  const targetRow = safeBrief.targetRow || null;
  const lines = [];

  lines.push('[운영비서 제안]');
  lines.push('기준일: ' + valueOrEmpty_(safeBrief.targetDate));

  if (safeBrief.summary) {
    lines.push('요약: ' + safeBrief.summary);
  }

  if (targetRow) {
    if (safeBrief.matchMode === 'latest-row' && targetRow.date) {
      lines.push('최근 작성 행 기준: ' + targetRow.date);
    }

    lines.push('오늘 상태: 업무 ' + (targetRow.works || []).length + '건 입력');

    if (targetRow.emptyWorkSlots && targetRow.emptyWorkSlots.length) {
      lines.push('빈 업무칸: ' + targetRow.emptyWorkSlots.join(', '));
    }

    if (targetRow.childChanges) {
      lines.push('아동변동: ' + targetRow.childChanges);
    }

    if (targetRow.staffChanges) {
      lines.push('종사자변동: ' + targetRow.staffChanges);
    }
  } else {
    lines.push('오늘 운영일지 행을 찾지 못했습니다.');
  }

  if (actions.length) {
    lines.push('');
    lines.push('지금 필요한 액션:');
    actions.forEach(function(action, index) {
      lines.push((index + 1) + '. ' + action);
    });
  }

  if (alerts.length) {
    lines.push('');
    lines.push('경고: ' + alerts.join(', '));
  }

  if (recentRows.length) {
    lines.push('');
    lines.push('최근 흐름:');
    recentRows.forEach(function(row) {
      lines.push('- ' + row.date + ' / 업무 ' + row.workCount + '건' + (row.manager ? ' / 담당 ' + row.manager : ''));
    });
  }

  return lines.join('\n').trim();
}
