let staffRosterBundleMemo_ = {};
let staffRosterCompositionMemo_ = {};
let staffRosterAttendanceDbMemo_ = {};
let staffRosterAnalysisSavedMemo_ = {};
let annualLeaveSupportMemo_ = {};
const STAFF_ROSTER_CACHE_VERSION = 'viewer-email-v1';
const STAFF_ROSTER_MASTER_STORE_TYPE = 'staff_roster_master';
const STAFF_ROSTER_MASTER_VERSION = 'master-v1';
const STAFF_ROSTER_DB_SHEET_NAME = 'DB_STAFF';
const STAFF_ROSTER_DB_VERSION = 'staff-db-v1';
const STAFF_ROSTER_DB_HEADERS = Object.freeze([
  'dbKey',
  'year',
  'sourceType',
  'sourceSheet',
  'sourceRowNumber',
  'name',
  'updatedAt',
  'deletedAt',
  'json',
]);
const STAFF_ATTENDANCE_DB_SHEET_NAME = 'DB_ATTENDANCE';
const STAFF_ATTENDANCE_DB_VERSION = 'attendance-db-v1';
const STAFF_ATTENDANCE_DB_HEADERS = Object.freeze([
  'id',
  'year',
  'yearMonth',
  'date',
  'sourceType',
  'sourceRowNumber',
  'personKey',
  'name',
  'status',
  'startTime',
  'endTime',
  'memo',
  'updatedAt',
  'deletedAt',
]);
const STAFF_ATTENDANCE_SYNC_QUEUE_SHEET_NAME = 'DB_ATTENDANCE_QUEUE';
const STAFF_ATTENDANCE_SYNC_QUEUE_TRIGGER_HANDLER = 'processStaffRosterAttendancePatchQueueTrigger';
const STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS = Object.freeze([
  'queueId',
  'clientId',
  'queuedAt',
  'status',
  'selectedYear',
  'dashboardType',
  'activeId',
  'payloadJson',
  'processedAt',
  'errorMessage',
  'retryCount',
]);

function getStaffRosterHeaderAliases_() {
  return {
    displayOrder: ['번호', '순번', '정렬번호', '표시순서'],
    name: ['성명', '이름', '직원명', '종사자명', '교사명', '이 름'],
    email: ['이메일', '계정이메일', '계정 이메일', '메일', '로그인계정', '로그인 계정', 'Google 계정', '구글계정', '구글 계정'],
    position: ['직위', '직책', '직급', '담당업무', '직무', '직책/직위'],
    roleText: ['역할', '활동내용', '담당역할', '운영일지업무', '운영일지 업무', '주요업무', '주요 업무'],
    joinDate: ['입사일', '입사 날짜', '근무시작일', '시작일', '채용일', '근무 시작일'],
    exitDate: ['퇴사일', '퇴사 날짜', '근무종료일', '종료일', '퇴직일', '근무 종료일'],
    group: ['구분', '구성', '소속'],
    classification: ['분류', '직군', '직종'],
    status: ['상태', '재직상태', '근무상태', '재직 여부', '근무 여부'],
    attendanceStatus: ['출결상태', '출결 상태', '출석상태', '출석 상태'],
    attendanceDays: ['출석일수', '출석 일수', '출석수', '출석'],
    absenceDays: ['결석일수', '결석 일수', '결석수', '결석'],
    attendanceMemo: ['출결메모', '출결 메모', '출결비고', '출결 비고', '확인 메모'],
    dailyAttendanceJson: ['일별출결', '일별 출결', '날짜별출결', '날짜별 출결', '출결상세', '출결 상세'],
    leaveCarryover: ['연차이월', '연차 이월', '이월연차', '이월 연차'],
    leaveManualAdjustment: ['연차조정', '연차 조정', '수동조정', '수동 조정'],
    leaveMemo: ['연차메모', '연차 메모', '연차비고', '연차 비고'],
    coopMembershipFee: ['양산애협동조합 가입비', '양산애사회적협동조합 가입비', '협동조합 가입비', '가입비', '가입비(10만원)', '가입비 10만원'],
    coopMembershipFeeDate: ['양산애협동조합 가입비 납부일', '양산애사회적협동조합 가입비 납부일', '협동조합 가입비 납부일', '가입비 납부일', '가입비 일자', '가입비 날짜'],
    criminalRecordCheckDate: ['범죄경력 조회일', '범죄경력조회일', '범죄 경력 조회일'],
    abusePreventionPledge: ['학대 금지 서약서', '학대금지서약서', '아동학대 금지 서약서', '아동학대금지서약서'],
    abusePreventionPledgeDate: ['학대 금지서약서 일정일', '학대 금지서약서 일정', '학대금지서약서 일정일', '학대금지서약서 일정', '학대 금지서약서 날짜'],
    abusePreventionPledgeStatus: ['학대 금지서약서 완료여부', '학대금지서약서 완료여부', '학대 금지서약서 상태', '학대금지서약서 상태'],
    sexCrimeDisabilityCheck: ['성범죄 장애인 2부 경력 조회', '성범죄, 장애인 2부 경력 조회', '성범죄 장애인 경력 조회', '성범죄경력조회', '장애인학대경력조회'],
    sexCrimeDisabilityCheckDate: ['성범죄 장애인 학대경력 조회일', '성범죄, 장애인 학대경력 조회일', '성범죄 장애인 조회일', '성범죄 장애인 경력 조회일', '성범죄 장애인 2부 경력 조회일'],
    sexCrimeDisabilityCheckStatus: ['성범죄 장애인 학대경력 조회 완료여부', '성범죄 장애인 완료여부', '성범죄 장애인 조회 완료여부', '성범죄 장애인 상태'],
    healthCheckDate: ['건강검진일', '건강검진 일자', '건강 검진일'],
    healthCheckStatus: ['건강검진 완료여부', '건강검진 상태', '건강 검진 완료여부'],
    tuberculosisCheckDate: ['결핵검진일', '결핵 검진일', '건강검진 결핵검진일', '건강검진, 결핵검진일(필수)', '건강검진 결핵검진일 필수'],
    stampUrl: ['도장', '도장이미지', '도장 이미지', '도장URL', '도장 URL', '결재도장', '결재 도장'],
  };
}

function syncAnnualLeaveImportForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const result = syncAnnualLeaveImportByYear_(selectedYear);

  SpreadsheetApp.getUi().alert(
    "'" + result.sheetName + "' 시트로 연차 데이터를 가져왔습니다.\n" +
    '가져온 건수: ' + result.rowCount + '건'
  );
}

function syncAndApplyAnnualLeaveForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const result = syncAndApplyAnnualLeaveForYears_([selectedYear]);
  const item = (result.results || [])[0] || {};
  if (item.errorMessage) {
    SpreadsheetApp.getUi().alert(
      selectedYear + '년 연차 동기화/반영 실패\n' + item.errorMessage
    );
    return result;
  }
  SpreadsheetApp.getUi().alert(
    selectedYear + '년 연차 데이터를 동기화하고 일지데이터에 반영했습니다.\n' +
    '가져온 건수: ' + (item.importedRowCount || 0) + '건\n' +
    '업데이트: ' + (item.updatedCount || 0) + '건\n' +
    '추가: ' + (item.insertedCount || 0) + '건'
  );
  return result;
}

function syncAndApplyAnnualLeaveForConfiguredYears() {
  const result = syncAndApplyAnnualLeaveForYears_([2024, 2025, 2026]);
  const lines = ['연차 24~26년 동기화/반영 결과'];
  (result.results || []).forEach(function(item) {
    if (item.errorMessage) {
      lines.push(
        item.year + '년: 실패 - ' + item.errorMessage
      );
      return;
    }
    lines.push(
      item.year + '년: 가져오기 ' + (item.importedRowCount || 0) + '건 / 업데이트 ' +
      (item.updatedCount || 0) + '건 / 추가 ' + (item.insertedCount || 0) + '건'
    );
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function buildAnnualLeaveToStaffRosterApplyAlertLines_(title, result) {
  const lines = [title];
  (result.results || []).forEach(function(item) {
    if (item.errorMessage) {
      lines.push(item.year + '년: 실패 - ' + item.errorMessage);
      return;
    }
    lines.push(
      item.year + '년: ' + ((item.importSourceLabel || '저장본') + ' ' + (item.importedRowCount || 0) + '건') +
      ' / 연가 ' + (item.leaveDateCount || 0) + '건 / 반영 ' + (item.appliedDateCount || 0) +
      '건 / 수정 ' + (item.updatedStaffCount || 0) + '명'
    );
    if (item.autoCreatedStaffCount) {
      lines.push(
        '  자동생성: ' + item.autoCreatedStaffCount + '명'
        + (item.autoCreatedStaffNames && item.autoCreatedStaffNames.length
          ? ' (' + item.autoCreatedStaffNames.join(', ') + ')'
          : '')
      );
    }
    if (item.unmatchedNames && item.unmatchedNames.length) {
      lines.push('  미매칭: ' + item.unmatchedNames.slice(0, 12).join(', ') + (item.unmatchedNames.length > 12 ? ' 외 ' + (item.unmatchedNames.length - 12) + '명' : ''));
    }
  });
  return lines;
}

function applyAnnualLeaveToStaffRosterForConfiguredYears() {
  const result = applyAnnualLeaveToStaffRosterForYears_([2024, 2025, 2026]);
  SpreadsheetApp.getUi().alert(buildAnnualLeaveToStaffRosterApplyAlertLines_(
    '연가 24~26년 -> 종사자 현황 빠른 반영 결과',
    result
  ).join('\n'));
  return result;
}

function applyAnnualLeaveToStaffRosterFor2025WithAlert() {
  const result = applyAnnualLeaveToStaffRosterForYears_([2025]);
  SpreadsheetApp.getUi().alert(buildAnnualLeaveToStaffRosterApplyAlertLines_(
    '연가 2025년 -> 종사자 현황 반영 결과',
    result
  ).join('\n'));
  return result;
}

function syncAndApplyAnnualLeaveToStaffRosterForConfiguredYears() {
  return applyAnnualLeaveToStaffRosterForConfiguredYears();
}

function applyAnnualLeaveToStaffRosterForYears_(years, options) {
  const settings = options || {};
  const forceSync = !!settings.forceSync;
  assertStaffRosterAdmin_();
  const normalizedYears = uniqueNumbers_((years || []).map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const results = [];

  normalizedYears.forEach(function(year) {
    const item = {
      year: year,
      importedRowCount: 0,
      importSource: '',
      importSourceLabel: '',
      leaveDateCount: 0,
      appliedDateCount: 0,
      updatedStaffCount: 0,
      autoCreatedStaffCount: 0,
      autoCreatedStaffNames: [],
      unmatchedNames: [],
      errorMessage: '',
    };

    try {
      const storedPayload = readDataStoreJson_('annual_leave', year);
      const hasStoredPayload = !!(storedPayload && storedPayload.rows && storedPayload.rows.length);
      let importResult = null;
      if (forceSync || !hasStoredPayload) {
        importResult = syncAnnualLeaveImportByYear_(year);
        item.importSource = 'sync';
        item.importSourceLabel = '동기화';
        item.importedRowCount = Number(importResult && importResult.rowCount) || 0;
      } else {
        item.importSource = 'stored';
        item.importSourceLabel = '저장본';
        item.importedRowCount = Number(storedPayload.rows.length) || 0;
      }
      const applyResult = applyAnnualLeaveToStaffRosterByYear_(year);
      item.leaveDateCount = Number(applyResult && applyResult.leaveDateCount) || 0;
      item.appliedDateCount = Number(applyResult && applyResult.appliedDateCount) || 0;
      item.updatedStaffCount = Number(applyResult && applyResult.updatedStaffCount) || 0;
      item.autoCreatedStaffCount = Number(applyResult && applyResult.autoCreatedStaffCount) || 0;
      item.autoCreatedStaffNames = applyResult && applyResult.autoCreatedStaffNames ? applyResult.autoCreatedStaffNames : [];
      item.unmatchedNames = applyResult && applyResult.unmatchedNames ? applyResult.unmatchedNames : [];
    } catch (error) {
      item.errorMessage = error.message;
    }

    results.push(item);
  });

  return { results: results };
}

function syncAndApplyAnnualLeaveToStaffRosterForYears_(years) {
  return applyAnnualLeaveToStaffRosterForYears_(years, { forceSync: true });
}

function applyAnnualLeaveToLogDataForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const result = applyAnnualLeaveToLogDataByYear_(selectedYear);

  SpreadsheetApp.getUi().alert(
    "'" + result.logSheetName + "' 시트에 연차 데이터를 반영했습니다.\n" +
    '업데이트: ' + result.updatedCount + '건\n' +
    '추가: ' + result.insertedCount + '건'
  );
}

function syncAndApplyAnnualLeaveForYears_(years) {
  const normalizedYears = uniqueNumbers_((years || []).map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const results = [];

  normalizedYears.forEach(function(year) {
    const item = {
      year: year,
      importedRowCount: 0,
      updatedCount: 0,
      insertedCount: 0,
      errorMessage: '',
    };

    try {
      const importResult = syncAnnualLeaveImportByYear_(year);
      const applyResult = applyAnnualLeaveToLogDataByYear_(year);
      clearAttendanceYearCache_(year);
      item.importedRowCount = Number(importResult && importResult.rowCount) || 0;
      item.updatedCount = Number(applyResult && applyResult.updatedCount) || 0;
      item.insertedCount = Number(applyResult && applyResult.insertedCount) || 0;
      item.logSheetName = applyResult && applyResult.logSheetName ? applyResult.logSheetName : getLogDataSheetNameByYear_(year);
    } catch (error) {
      item.errorMessage = error.message;
    }

    results.push(item);
  });

  return { results: results };
}

function syncAnnualLeaveImportByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceSpreadsheet = getAnnualLeaveSourceSpreadsheet_();
  const sourceSheetName = getAnnualLeaveSourceSheetNameByYear_(normalizedYear);
  const sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    throw new Error("'" + sourceSheetName + "' 시트를 원본 파일에서 찾을 수 없습니다.");
  }

  const sourceRange = sourceSheet.getDataRange();
  const values = sourceRange.getDisplayValues();
  writeDataStoreJson_('annual_leave', normalizedYear, {
    headers: values[0] || [],
    rows: values.slice(1),
    sourceSheetName: sourceSheetName,
  });
  clearAttendanceYearCache_(normalizedYear);

  return {
    sheetName: LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME,
    rowCount: Math.max(values.length - 1, 0),
  };
}

function applyAnnualLeaveToLogDataByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;
  const annualLeaveBundle = readAnnualLeaveStoredBundle_(normalizedYear);
  const stored = annualLeaveBundle.stored;

  if (!stored || !stored.rows || !stored.rows.length) {
    throw new Error('연차 저장 데이터가 없습니다. 먼저 연차 가져오기를 실행해주세요.');
  }

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const staffChangesIndex = fieldMap.STAFF_CHANGES;

  if (staffChangesIndex === null || staffChangesIndex === undefined) {
    throw new Error("'" + logSheet.getName() + "' 시트에서 종사자변동사항 컬럼을 찾을 수 없습니다.");
  }

  const annualLeaveByDate = annualLeaveBundle.textByDate;
  const dateKeys = Object.keys(annualLeaveByDate).filter(function(dateKey) {
    return normalizeAttendanceYear_(String(dateKey).slice(0, 4)) === normalizedYear;
  });

  if (!dateKeys.length) {
    throw new Error('반영할 연차 데이터가 없습니다.');
  }

  const updateContext = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys);
  let updatedCount = 0;
  if (!updateContext.hasTargets) {
    return {
      logSheetName: logSheet.getName(),
      updatedCount: 0,
      insertedCount: updateContext.insertedCount,
    };
  }

  dateKeys.forEach(function(dateKey) {
    const rowInfo = getLogSheetBatchRowValues_(updateContext, dateKey);
    if (!rowInfo) {
      return;
    }
    const currentRow = rowInfo.values;
    const existingText = valueOrEmpty_(currentRow[staffChangesIndex]).trim();
    const annualLeaveText = annualLeaveByDate[dateKey];

    applyManagerAndStaffWorkerToRowValues_(currentRow, fieldMap, dateKey, normalizedYear);
    const mergedText = mergeAnnualLeaveStaffChangesText_(
      valueOrEmpty_(currentRow[staffChangesIndex] || existingText).trim(),
      annualLeaveText
    );
    setRowValueByFieldMap_(currentRow, fieldMap, 'STAFF_CHANGES', mergedText);
    setLogSheetBatchRowValues_(updateContext, rowInfo, currentRow);
    updatedCount += 1;
  });

  commitLogSheetBatchUpdate_(logSheet, updateContext);
  sortLogDataSheetByDate_(logSheet, fieldMap);
  formatLogDataSheet_(logSheet);
  clearAttendanceYearCache_(normalizedYear);

  return {
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
    insertedCount: updateContext.insertedCount,
  };
}

function applyAnnualLeaveToLogDataByDates_(dates, selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;
  const annualLeaveBundle = readAnnualLeaveStoredBundle_(normalizedYear);
  const stored = annualLeaveBundle.stored;

  if (!stored || !stored.rows || !stored.rows.length) {
    throw new Error('연차 저장 데이터가 없습니다. 먼저 연차 가져오기를 실행해주세요.');
  }

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const staffChangesIndex = fieldMap.STAFF_CHANGES;
  if (staffChangesIndex === null || staffChangesIndex === undefined) {
    throw new Error("'" + logSheet.getName() + "' 시트에서 종사자변동사항 컬럼을 찾을 수 없습니다.");
  }

  const requestedLookup = buildRequestedDateLookup_(dates);
  const annualLeaveByDate = annualLeaveBundle.textByDate;
  const dateKeys = filterDateKeysByLookup_(annualLeaveByDate, requestedLookup).filter(function(dateKey) {
    return normalizeAttendanceYear_(String(dateKey).slice(0, 4)) === normalizedYear;
  });

  if (!dateKeys.length) {
    return {
      logSheetName: logSheet.getName(),
      updatedCount: 0,
      insertedCount: 0,
      appliedCount: 0,
    };
  }

  const updateContext = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys);
  let updatedCount = 0;
  if (!updateContext.hasTargets) {
    return {
      logSheetName: logSheet.getName(),
      updatedCount: 0,
      insertedCount: updateContext.insertedCount,
      appliedCount: 0,
    };
  }

  dateKeys.forEach(function(dateKey) {
    const rowInfo = getLogSheetBatchRowValues_(updateContext, dateKey);
    if (!rowInfo) {
      return;
    }
    const currentRow = rowInfo.values;
    const existingText = valueOrEmpty_(currentRow[staffChangesIndex]).trim();
    const annualLeaveText = annualLeaveByDate[dateKey];

    applyManagerAndStaffWorkerToRowValues_(currentRow, fieldMap, dateKey, normalizedYear);
    const mergedText = mergeAnnualLeaveStaffChangesText_(
      valueOrEmpty_(currentRow[staffChangesIndex] || existingText).trim(),
      annualLeaveText
    );
    setRowValueByFieldMap_(currentRow, fieldMap, 'STAFF_CHANGES', mergedText);
    setLogSheetBatchRowValues_(updateContext, rowInfo, currentRow);
    updatedCount += 1;
  });

  commitLogSheetBatchUpdate_(logSheet, updateContext);
  clearAttendanceYearCache_(normalizedYear);

  return {
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
    insertedCount: updateContext.insertedCount,
    appliedCount: dateKeys.length,
  };
}

function getAnnualLeaveSourceSpreadsheet_() {
  const sourceUrl = getAnnualLeaveSourceUrl_();
  if (!sourceUrl) {
    throw new Error('연차 원본 파일 URL이 설정되지 않았습니다. 통계보기에서 연차 링크를 저장해주세요.');
  }
  return SpreadsheetApp.openByUrl(sourceUrl);
}

function getAnnualLeaveSourceUrl_() {
  const properties = PropertiesService.getDocumentProperties();
  const storedUrl = String(properties.getProperty('ANNUAL_LEAVE_SOURCE_SPREADSHEET_URL') || '').trim();
  if (storedUrl) {
    return storedUrl;
  }
  return String(LOG_PRINT_CONFIG.ANNUAL_LEAVE_SOURCE_SPREADSHEET_URL || '').trim();
}

function saveAnnualLeaveSourceUrlFromDialog(url) {
  const safeUrl = String(url || '').trim();
  PropertiesService.getDocumentProperties().setProperty('ANNUAL_LEAVE_SOURCE_SPREADSHEET_URL', safeUrl);
  return { url: safeUrl };
}

function getAnnualLeaveSourceSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return '연차_' + normalizedYear;
}

function getAnnualLeaveImportSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return '연차가져오기_' + normalizedYear;
}

function inspectAnnualLeaveSourceSheetForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return inspectAnnualLeaveSourceSheet(resolveWorkingYear_(spreadsheet));
}

function inspectAnnualLeave2024SourceSheet() {
  return inspectAnnualLeaveSourceSheet(2024);
}

function inspectAnnualLeave2025SourceSheet() {
  return inspectAnnualLeaveSourceSheet(2025);
}

function inspectAnnualLeave2026SourceSheet() {
  return inspectAnnualLeaveSourceSheet(2026);
}

function inspectAnnualLeaveSourceSheet(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceSpreadsheet = getAnnualLeaveSourceSpreadsheet_();
  const sourceSheetName = getAnnualLeaveSourceSheetNameByYear_(normalizedYear);
  const sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    Logger.log('연차 원본 시트를 찾을 수 없습니다: %s', sourceSheetName);
    return {
      year: normalizedYear,
      sheetName: sourceSheetName,
      found: false,
    };
  }

  const lastRow = sourceSheet.getLastRow();
  const lastColumn = sourceSheet.getLastColumn();
  const sampleRows = Math.min(8, lastRow);
  const values = sampleRows > 0
    ? sourceSheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues()
    : [];
  const headers = values[0] || [];
  const headerIndexMap = buildHeaderIndexMap_(headers);
  const recognized = {
    연도: headerIndexMap['연도'],
    성명: headerIndexMap['성명'],
    직위: headerIndexMap['직위'],
    사용날짜: headerIndexMap['사용날짜'],
    사용값: headerIndexMap['사용값'],
    구분: headerIndexMap['구분'],
  };
  let summaryPreview = {};
  try {
    summaryPreview = readAnnualLeaveSummaryByDate_(sourceSheet, normalizedYear);
  } catch (error) {
    summaryPreview = { _error: error.message };
  }

  Logger.log('=== 연차 원본 기본 정보 ===');
  Logger.log('연도: %s', normalizedYear);
  Logger.log('시트명: %s', sourceSheet.getName());
  Logger.log('최종 행: %s', lastRow);
  Logger.log('최종 열: %s', lastColumn);
  Logger.log('원본 링크: %s', sourceSpreadsheet.getUrl());
  Logger.log('=== 헤더 ===');
  Logger.log('%s', JSON.stringify(headers));
  Logger.log('=== 헤더 인식 결과 ===');
  Logger.log('%s', JSON.stringify(recognized));
  Logger.log('=== 1~%s행 샘플 ===', sampleRows);
  values.forEach(function(row, index) {
    Logger.log('%s행: %s', index + 1, JSON.stringify(row));
  });
  Logger.log('=== 일자별 연차 요약 샘플 ===');
  Logger.log('%s', JSON.stringify(Object.keys(summaryPreview).slice(0, 10).reduce(function(result, key) {
    result[key] = summaryPreview[key];
    return result;
  }, {})));

  return {
    year: normalizedYear,
    sheetName: sourceSheet.getName(),
    found: true,
    lastRow: lastRow,
    lastColumn: lastColumn,
    headers: headers,
    recognized: recognized,
    summaryPreview: summaryPreview,
  };
}

function readAnnualLeaveSummaryByDate_(sheet, selectedYear) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return {};
  }
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headerIndexMap = buildHeaderIndexMap_(values[0]);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  if ([dateIndex, nameIndex, valueIndex].some(function(index) { return index === null || index === undefined; })) {
    throw new Error("'" + sheet.getName() + "' 시트에서 연차 집계에 필요한 컬럼(성명/사용날짜/사용값)을 찾을 수 없습니다.");
  }
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const buckets = {};
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) continue;
    const dateKey = normalizeAnnualLeaveDateKeyForYear_(row[dateIndex], normalizedYear);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const usedValue = normalizeAnnualLeaveUsedValue_(row[valueIndex]);
    if (!dateKey || !name || !usedValue) continue;
    if (!buckets[dateKey]) buckets[dateKey] = [];
    buckets[dateKey].push({ name: name, usedValue: usedValue });
  }
  const result = {};
  Object.keys(buckets).forEach(function(dateKey) {
    result[dateKey] = formatAnnualLeaveSummaryText_(buckets[dateKey], normalizedYear);
  });
  return result;
}

function readAnnualLeaveSummaryByDateFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  const values = [headers].concat(rows);
  if (!headers.length || values.length < 2) return {};
  const headerIndexMap = buildHeaderIndexMap_(headers);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  if ([dateIndex, nameIndex, valueIndex].some(function(index) { return index === null || index === undefined; })) {
    throw new Error('연차 저장 데이터에서 필요한 컬럼(성명/사용날짜/사용값)을 찾을 수 없습니다.');
  }
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const buckets = {};
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) continue;
    const dateKey = normalizeAnnualLeaveDateKeyForYear_(row[dateIndex], normalizedYear);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const usedValue = normalizeAnnualLeaveUsedValue_(row[valueIndex]);
    if (!dateKey || !name || !usedValue) continue;
    if (!buckets[dateKey]) buckets[dateKey] = [];
    buckets[dateKey].push({ name: name, usedValue: usedValue });
  }
  const result = {};
  Object.keys(buckets).forEach(function(dateKey) {
    result[dateKey] = formatAnnualLeaveSummaryText_(buckets[dateKey], normalizedYear);
  });
  return result;
}

function parseAnnualLeaveDateValue_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) return '';
  const directKey = normalizeDateKey_(text);
  if (directKey) return directKey;
  const match = text.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!match) return '';
  return [match[1], ('0' + match[2]).slice(-2), ('0' + match[3]).slice(-2)].join('-');
}

function normalizeAnnualLeaveDateKeyForYear_(value, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear);
  let dateKey = normalizeDateKey_(parseAnnualLeaveDateValue_(value));
  if (!dateKey && normalizedYear) {
    const text = valueOrEmpty_(value).trim();
    const monthDayMatch = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/) ||
      text.match(/^(\d{1,2})[.\-/](\d{1,2})$/);
    if (monthDayMatch) {
      dateKey = normalizedYear + '-' + ('0' + monthDayMatch[1]).slice(-2) + '-' + ('0' + monthDayMatch[2]).slice(-2);
    }
  }
  if (!dateKey || !normalizedYear) {
    return dateKey;
  }

  const dateYear = normalizeAttendanceYear_(dateKey.slice(0, 4));
  if (!dateYear || dateYear === normalizedYear) {
    return dateKey;
  }

  return '';
}

function normalizeAnnualLeaveUsedValue_(value) {
  const numberValue = Number(value);
  if (!isNaN(numberValue) && numberValue > 0) return numberValue;
  const text = valueOrEmpty_(value).trim();
  if (!text) return 0;
  const compact = text.replace(/\s+/g, '');
  if (/반차/.test(compact)) {
    return 0.5;
  }
  const numericMatch = compact.match(/(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    const parsedNumber = Number(numericMatch[1]);
    return !isNaN(parsedNumber) && parsedNumber > 0 ? parsedNumber : 0;
  }
  if (/연가|연차|월차|휴가/.test(compact)) {
    return 1;
  }
  const parsed = Number(compact);
  return isNaN(parsed) ? 0 : parsed;
}

function buildStaffPositionLookupForYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const lookup = {};
  try {
    const bundle = getStaffRosterBundleByYear_(normalizedYear);
    (bundle && bundle.staffInfo && bundle.staffInfo.entries || []).forEach(function(entry) {
      const name = valueOrEmpty_(entry && entry.name).trim();
      const key = normalizeAnnualLeavePersonKey_(name);
      const position = valueOrEmpty_(entry && entry.position).trim();
      if (key && position && !lookup[key]) {
        lookup[key] = position;
      }
    });
  } catch (error) {
    Logger.log('buildStaffPositionLookupForYear_ failed: %s', error.message);
  }
  return lookup;
}

function formatStaffNameWithPosition_(name, position) {
  const safeName = valueOrEmpty_(name).trim();
  const safePosition = valueOrEmpty_(position).trim();
  return safeName && safePosition ? safeName + '(' + safePosition + ')' : safeName;
}

function formatStaffAnnualLeaveNameWithPosition_(name, position, usedValue) {
  const safeName = valueOrEmpty_(name).trim();
  const safePosition = valueOrEmpty_(position).trim();
  const usedLabel = formatAnnualLeaveUsedValueLabel_(usedValue);
  const usedText = usedLabel === '반차' ? usedLabel : (usedLabel + '일');
  if (safeName && safePosition) {
    return safeName + '(' + safePosition + ' / ' + usedText + ')';
  }
  return safeName ? safeName + '(' + usedText + ')' : '';
}

function formatAnnualLeaveSummaryText_(entries, selectedYear) {
  const positionLookup = buildStaffPositionLookupForYear_(selectedYear);
  const entryByPerson = {};
  (entries || []).forEach(function(entry) {
    if (!entry || !hasDisplayValue_(entry.name) || !(Number(entry.usedValue) > 0)) {
      return;
    }
    const personKey = normalizeAnnualLeavePersonKey_(entry.name) || String(entry.name || '').trim();
    if (!entryByPerson[personKey]) {
      entryByPerson[personKey] = {
        name: entry.name,
        usedValue: 0,
      };
    }
    entryByPerson[personKey].usedValue = Math.min(1, Number(entryByPerson[personKey].usedValue) + Number(entry.usedValue));
  });
  const safeEntries = Object.keys(entryByPerson).sort().map(function(personKey) {
    return entryByPerson[personKey];
  }).filter(function(entry) {
    return Number(entry.usedValue) > 0;
  });
  if (!safeEntries.length) return '';
  const labels = safeEntries.map(function(entry) {
    const personKey = normalizeAnnualLeavePersonKey_(entry.name);
    return formatStaffAnnualLeaveNameWithPosition_(entry.name, positionLookup[personKey], entry.usedValue);
  }).filter(function(label) {
    return !!label;
  });
  return '연차 : ' + labels.join(', ') + ' / ' + safeEntries.length + '명';
}

function formatAnnualLeaveUsedValueLabel_(value) {
  const numericValue = Number(value) || 0;
  if (Math.abs(numericValue - 0.5) < 0.000001) return '반차';
  if (Math.abs(numericValue - Math.round(numericValue)) < 0.000001) return String(Math.round(numericValue));
  return String(numericValue);
}

function mergeAnnualLeaveStaffChangesText_(existingText, annualLeaveText) {
  const lines = valueOrEmpty_(existingText)
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean)
    .filter(function(line) { return !/^연차\s*:/.test(line); });
  if (annualLeaveText) lines.push(annualLeaveText);
  return lines.join('\n');
}

function readAnnualLeaveInfoByDateFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  if (!headers.length || !rows.length) {
    return { leaveNamesByDate: {}, availableStaffByYear: [] };
  }
  const headerIndexMap = buildHeaderIndexMap_(headers);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const positionIndex = headerIndexMap['직위'];
  const joinDateIndex = headerIndexMap['입사일'];
  const categoryIndex = headerIndexMap['구분'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if ([dateIndex, nameIndex, valueIndex].some(function(index) { return index === null || index === undefined; })) {
    return { leaveNamesByDate: {}, availableStaffByYear: [] };
  }
  const leaveNamesByDate = {};
  const staffMap = {};
  rows.forEach(function(row) {
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) return;
    const dateKey = normalizeAnnualLeaveDateKeyForYear_(row[dateIndex], normalizedYear);
    const dateYear = dateKey ? normalizeAttendanceYear_(dateKey.slice(0, 4)) : null;
    if (dateYear && dateYear !== normalizedYear) return;
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const position = positionIndex === null || positionIndex === undefined ? '' : valueOrEmpty_(row[positionIndex]).trim();
    const joinDate = joinDateIndex === null || joinDateIndex === undefined ? '' : normalizeDateKey_(row[joinDateIndex]);
    const category = categoryIndex === null || categoryIndex === undefined ? '' : valueOrEmpty_(row[categoryIndex]).trim();
    const usedValue = normalizeAnnualLeaveUsedValue_(row[valueIndex]);
    if (name && !staffMap[name]) {
      staffMap[name] = { name: name, position: position, joinDate: joinDate, category: category };
    }
    if (!dateKey || !name || !usedValue) return;
    if (!leaveNamesByDate[dateKey]) leaveNamesByDate[dateKey] = {};
    leaveNamesByDate[dateKey][name] = true;
  });
  return {
    leaveNamesByDate: Object.keys(leaveNamesByDate).reduce(function(result, dateKey) {
      result[dateKey] = Object.keys(leaveNamesByDate[dateKey]);
      return result;
    }, {}),
    availableStaffByYear: Object.keys(staffMap).map(function(name) { return staffMap[name]; }),
  };
}

function normalizeAnnualLeavePersonKey_(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ')
    .replace(/（[^）]*）/g, ' ')
    .replace(/선생님|선생|님|교사|강사|팀장|센터장|시설장|사회복지사|생활복지사|생활지도사|공익|사회복무요원|시니어|멘토|자원봉사자|근로장학생/g, ' ')
    .replace(/[·ㆍ,\/]/g, ' ')
    .replace(/\s+/g, '')
    .trim();
}

function readAnnualLeaveDailyAttendanceByNameFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  if (!headers.length || !rows.length) {
    return { byName: {}, leaveDateCount: 0 };
  }

  const headerIndexMap = buildHeaderIndexMap_(headers);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if ([dateIndex, nameIndex, valueIndex].some(function(index) { return index === null || index === undefined; })) {
    throw new Error('연차 저장 데이터에서 필요한 컬럼(성명/사용날짜/사용값)을 찾을 수 없습니다.');
  }

  const byName = {};
  let leaveDateCount = 0;
  const leaveDateLookup = {};
  rows.forEach(function(row) {
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) {
      return;
    }

    const dateKey = normalizeAnnualLeaveDateKeyForYear_(row[dateIndex], normalizedYear);
    const dateYear = dateKey ? normalizeAttendanceYear_(dateKey.slice(0, 4)) : null;
    if (dateYear && dateYear !== normalizedYear) {
      return;
    }
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const usedValue = normalizeAnnualLeaveUsedValue_(row[valueIndex]);
    const personKey = normalizeAnnualLeavePersonKey_(name);
    if (!dateKey || !name || !personKey || !usedValue) {
      return;
    }

    if (!byName[personKey]) {
      byName[personKey] = {
        name: name,
        dates: {},
      };
    }
    const datePersonKey = personKey + '|' + dateKey;
    byName[personKey].dates[dateKey] = Math.min(1, (Number(byName[personKey].dates[dateKey]) || 0) + Number(usedValue));
    if (!leaveDateLookup[datePersonKey]) {
      leaveDateLookup[datePersonKey] = true;
      leaveDateCount += 1;
    }
  });

  return {
    byName: byName,
    leaveDateCount: leaveDateCount,
  };
}

function buildAnnualLeaveStoredPayloadFromSheet_(sheet) {
  if (!sheet) {
    return { headers: [], rows: [] };
  }
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    return { headers: [], rows: [] };
  }
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  return {
    headers: values[0] || [],
    rows: values.slice(1),
  };
}

function readAnnualLeaveStoredOrSourcePayload_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('annual_leave', normalizedYear);
  if (stored && stored.rows && stored.rows.length) {
    return stored;
  }
  try {
    const sourceSpreadsheet = getAnnualLeaveSourceSpreadsheet_();
    const sourceSheet = sourceSpreadsheet.getSheetByName(getAnnualLeaveSourceSheetNameByYear_(normalizedYear));
    return buildAnnualLeaveStoredPayloadFromSheet_(sourceSheet);
  } catch (error) {
    Logger.log('readAnnualLeaveStoredOrSourcePayload_ fallback failed: %s', error.message);
    return { headers: [], rows: [] };
  }
}

function inspectAnnualLeaveBlockingIssuesByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_('annual_leave', normalizedYear);
  const payload = readAnnualLeaveStoredOrSourcePayload_(normalizedYear);
  const parsed = payload && payload.rows && payload.rows.length
    ? readAnnualLeaveDailyAttendanceByNameFromStored_(payload, normalizedYear)
    : { byName: {}, leaveDateCount: 0 };
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const staffEntries = (bundle && bundle.staffInfo && bundle.staffInfo.entries || []).filter(function(entry) {
    return !!valueOrEmpty_(entry && entry.name).trim();
  });
  const rosterNameLookup = {};
  staffEntries.forEach(function(entry) {
    rosterNameLookup[normalizeAnnualLeavePersonKey_(entry.name)] = true;
  });

  const unmatchedAnnualNames = Object.keys(parsed.byName || {}).filter(function(personKey) {
    return !rosterNameLookup[personKey];
  }).map(function(personKey) {
    return parsed.byName[personKey] && parsed.byName[personKey].name ? parsed.byName[personKey].name : personKey;
  }).sort(function(a, b) {
    return String(a).localeCompare(String(b), 'ko');
  });

  const headerIndexMap = buildHeaderIndexMap_(payload && payload.headers ? payload.headers : []);
  const dateIndex = headerIndexMap['사용날짜'];
  const nameIndex = headerIndexMap['성명'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  const unparsedValueSamples = [];
  (payload && payload.rows || []).forEach(function(row) {
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) {
      return;
    }
    const name = valueOrEmpty_(nameIndex === null || nameIndex === undefined ? '' : row[nameIndex]).trim();
    const dateKey = normalizeAnnualLeaveDateKeyForYear_(dateIndex === null || dateIndex === undefined ? '' : row[dateIndex], normalizedYear);
    const rawValue = valueOrEmpty_(valueIndex === null || valueIndex === undefined ? '' : row[valueIndex]).trim();
    if (!name || !dateKey || !rawValue) {
      return;
    }
    if (normalizeAnnualLeaveUsedValue_(rawValue) > 0) {
      return;
    }
    if (unparsedValueSamples.length < 10) {
      unparsedValueSamples.push(name + ' / ' + dateKey + ' / ' + rawValue);
    }
  });

  return {
    year: normalizedYear,
    sourceType: stored && stored.rows && stored.rows.length ? 'data-store' : 'source-sheet',
    storedRowCount: stored && stored.rows ? stored.rows.length : 0,
    payloadRowCount: payload && payload.rows ? payload.rows.length : 0,
    staffCount: staffEntries.length,
    annualNameCount: Object.keys(parsed.byName || {}).length,
    leaveDateCount: Number(parsed.leaveDateCount) || 0,
    unmatchedAnnualNames: unmatchedAnnualNames,
    unparsedValueSamples: unparsedValueSamples,
  };
}

function inspectAnnualLeaveBlockingIssuesForYears2024To2026WithAlert() {
  const results = [2024, 2025, 2026].map(function(year) {
    try {
      return inspectAnnualLeaveBlockingIssuesByYear_(year);
    } catch (error) {
      return {
        year: year,
        errorMessage: error && error.message ? error.message : String(error),
      };
    }
  });
  const lines = ['연가 출결 방해 요인 진단'];
  results.forEach(function(item) {
    if (item.errorMessage) {
      lines.push(item.year + '년: 실패 - ' + item.errorMessage);
      return;
    }
    lines.push(
      item.year + '년: 원본=' + item.sourceType +
      ' / 저장행=' + item.storedRowCount +
      ' / 사용행=' + item.payloadRowCount +
      ' / 종사자=' + item.staffCount +
      ' / 연가이름=' + item.annualNameCount +
      ' / 연가일수=' + item.leaveDateCount
    );
    if (item.unmatchedAnnualNames && item.unmatchedAnnualNames.length) {
      lines.push('  이름 미매칭: ' + item.unmatchedAnnualNames.slice(0, 8).join(', ') + (item.unmatchedAnnualNames.length > 8 ? ' 외 ' + (item.unmatchedAnnualNames.length - 8) + '명' : ''));
    }
    if (item.unparsedValueSamples && item.unparsedValueSamples.length) {
      lines.push('  사용값 해석 실패 샘플: ' + item.unparsedValueSamples.join(' | '));
    }
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return { results: results };
}

function inspectAnnualLeaveBlockingIssuesForYears2024To2026Json() {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: [2024, 2025, 2026].map(function(year) {
      try {
        const issue = inspectAnnualLeaveBlockingIssuesByYear_(year);
        const merge = inspectStaffRosterAnnualLeaveMergeByYear_(year);
        return {
          issue: issue,
          mergeRows: (merge.rows || []).map(function(row) {
            return {
              annualName: row.annualName,
              annualDateCount: row.annualDateCount,
              matchingEntries: (row.matchingEntries || []).map(function(entry) {
                return {
                  name: entry.name,
                  rowNumber: entry.rowNumber,
                  baseCount: entry.baseCount,
                  mergedLeaveCount: entry.mergedLeaveCount,
                  mergedLeaveDates: entry.mergedLeaveDates,
                };
              }),
            };
          }),
        };
      } catch (error) {
        return {
          issue: {
            year: year,
            errorMessage: error && error.message ? error.message : String(error),
          },
          mergeRows: [],
        };
      }
    }),
  }, null, 2);
}

function inspectAnnualLeaveStoredRowsForYears2024To2026Json() {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: [2024, 2025, 2026].map(function(year) {
      const normalizedYear = normalizeAttendanceYear_(year) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
      const stored = readDataStoreJson_('annual_leave', normalizedYear);
      const headers = stored && stored.headers ? stored.headers : [];
      const rows = stored && stored.rows ? stored.rows : [];
      const headerIndexMap = buildHeaderIndexMap_(headers);
      const dateIndex = headerIndexMap['사용날짜'];
      const nameIndex = headerIndexMap['성명'];
      const valueIndex = headerIndexMap['사용값'];
      const yearIndex = headerIndexMap['연도'];
      const parsedSamples = rows.slice(0, 12).map(function(row, index) {
        const rawYear = yearIndex === null || yearIndex === undefined ? '' : row[yearIndex];
        const rawName = nameIndex === null || nameIndex === undefined ? '' : row[nameIndex];
        const rawDate = dateIndex === null || dateIndex === undefined ? '' : row[dateIndex];
        const rawValue = valueIndex === null || valueIndex === undefined ? '' : row[valueIndex];
        const parsedDate = normalizeAnnualLeaveDateKeyForYear_(rawDate, normalizedYear);
        return {
          rowNumber: index + 2,
          rawYear: rawYear,
          parsedYear: normalizeAttendanceYear_(rawYear),
          rawName: rawName,
          rawDate: rawDate,
          parsedDate: parsedDate,
          parsedDateYear: parsedDate ? normalizeAttendanceYear_(parsedDate.slice(0, 4)) : null,
          rawValue: rawValue,
          parsedValue: normalizeAnnualLeaveUsedValue_(rawValue),
        };
      });
      return {
        year: normalizedYear,
        headers: headers,
        indexes: {
          year: yearIndex,
          name: nameIndex,
          date: dateIndex,
          value: valueIndex,
        },
        rowCount: rows.length,
        samples: parsedSamples,
      };
    }),
  }, null, 2);
}

function inspectWangSihyeongAnnualLeave20241231Json() {
  const selectedYear = 2024;
  const targetName = '왕시형';
  const targetDateKey = '2024-12-31';
  const stored = readDataStoreJson_('annual_leave', selectedYear);
  const headers = stored && stored.headers ? stored.headers : [];
  const rows = stored && stored.rows ? stored.rows : [];
  const headerIndexMap = buildHeaderIndexMap_(headers);
  const nameIndex = headerIndexMap['성명'];
  const dateIndex = headerIndexMap['사용날짜'];
  const valueIndex = headerIndexMap['사용값'];
  const yearIndex = headerIndexMap['연도'];
  const matchedAnnualRows = rows.map(function(row, index) {
    const rawName = nameIndex === null || nameIndex === undefined ? '' : row[nameIndex];
    const rawDate = dateIndex === null || dateIndex === undefined ? '' : row[dateIndex];
    const parsedDate = normalizeAnnualLeaveDateKeyForYear_(rawDate, selectedYear);
    return {
      rowNumber: index + 2,
      rawYear: yearIndex === null || yearIndex === undefined ? '' : row[yearIndex],
      rawName: rawName,
      rawDate: rawDate,
      parsedDate: parsedDate,
      rawValue: valueIndex === null || valueIndex === undefined ? '' : row[valueIndex],
      parsedValue: valueIndex === null || valueIndex === undefined ? 0 : normalizeAnnualLeaveUsedValue_(row[valueIndex]),
    };
  }).filter(function(item) {
    return normalizeAnnualLeavePersonKey_(item.rawName) === normalizeAnnualLeavePersonKey_(targetName)
      && item.parsedDate === targetDateKey;
  });
  const annualLeaveByName = getAnnualLeaveDailyAttendanceByNameForRoster_(selectedYear);
  const annualPerson = annualLeaveByName[normalizeAnnualLeavePersonKey_(targetName)] || null;
  const bundle = getStaffRosterBundleByYear_(selectedYear);
  const staffEntries = (bundle && bundle.staffInfo && bundle.staffInfo.entries || []).filter(function(entry) {
    return normalizeAnnualLeavePersonKey_(entry && entry.name) === normalizeAnnualLeavePersonKey_(targetName);
  });
  const staffRows = staffEntries.map(function(entry) {
    const dailyMap = parseStaffRosterDailyAttendanceJson_(entry && entry.dailyAttendanceJson);
    const mergedMap = parseStaffRosterDailyAttendanceJson_(mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_(
      entry && entry.dailyAttendanceJson,
      entry && entry.name,
      annualLeaveByName
    ));
    return {
      rowNumber: entry && entry.sourceRowNumber,
      name: entry && entry.name,
      position: entry && entry.position,
      joinDate: entry && entry.joinDate,
      exitDate: entry && entry.exitDate,
      currentItem: dailyMap[targetDateKey] || null,
      mergedItem: mergedMap[targetDateKey] || null,
      currentLeaveDates: Object.keys(dailyMap || {}).filter(function(dateKey) {
        return isAnnualLeaveAttendanceItem_(dailyMap[dateKey]);
      }).sort(),
      mergedLeaveDates: Object.keys(mergedMap || {}).filter(function(dateKey) {
        return isAnnualLeaveAttendanceItem_(mergedMap[dateKey]);
      }).sort(),
    };
  });
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    year: selectedYear,
    targetName: targetName,
    targetDate: targetDateKey,
    annualRowsForTargetDate: matchedAnnualRows,
    annualStoredValueForDate: annualPerson && annualPerson.dates ? annualPerson.dates[targetDateKey] || 0 : 0,
    annualAllDatesForName: annualPerson && annualPerson.dates ? annualPerson.dates : {},
    staffRows: staffRows,
  }, null, 2);
}

function inspectStaffRosterAnnualLeaveMergeByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const annualLeaveByName = getAnnualLeaveDailyAttendanceByNameForRoster_(normalizedYear);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const staffEntries = (bundle && bundle.staffInfo && bundle.staffInfo.entries || []).filter(function(entry) {
    return !!valueOrEmpty_(entry && entry.name).trim();
  });

  const rows = Object.keys(annualLeaveByName || {}).sort().map(function(personKey) {
    const annualPerson = annualLeaveByName[personKey];
    const matchingEntries = staffEntries.filter(function(entry) {
      return normalizeAnnualLeavePersonKey_(entry && entry.name) === personKey;
    });
    const mergedEntries = matchingEntries.map(function(entry) {
      const mergedJson = mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_(entry && entry.dailyAttendanceJson, entry && entry.name, annualLeaveByName);
      const mergedMap = parseStaffRosterDailyAttendanceJson_(mergedJson);
      const leaveDates = Object.keys(mergedMap).filter(function(dateKey) {
        return isAnnualLeaveAttendanceItem_(mergedMap[dateKey]);
      }).sort();
      return {
        name: valueOrEmpty_(entry && entry.name).trim(),
        rowNumber: Number(entry && entry.sourceRowNumber) || 0,
        mergedLeaveCount: leaveDates.length,
        mergedLeaveDates: leaveDates.slice(0, 10),
        baseCount: Object.keys(parseStaffRosterDailyAttendanceJson_(entry && entry.dailyAttendanceJson)).length,
      };
    });
    return {
      annualName: annualPerson && annualPerson.name ? annualPerson.name : personKey,
      annualDateCount: Object.keys(annualPerson && annualPerson.dates || {}).length,
      matchingEntries: mergedEntries,
    };
  });

  return {
    year: normalizedYear,
    rows: rows,
  };
}

function inspectStaffRosterAnnualLeaveMergeFor2025WithAlert() {
  const result = inspectStaffRosterAnnualLeaveMergeByYear_(2025);
  const lines = ['2025년 종사자 연가 머지 진단'];
  (result.rows || []).forEach(function(item) {
    if (!item.matchingEntries.length) {
      lines.push(item.annualName + ': 종사자 현황 매칭 없음 / 연가 ' + item.annualDateCount + '건');
      return;
    }
    item.matchingEntries.forEach(function(entry) {
      lines.push(
        item.annualName + ': 행 ' + entry.rowNumber +
        ' / 원본출결 ' + entry.baseCount +
        ' / 머지연가 ' + entry.mergedLeaveCount +
        ' / 연가샘플 ' + (entry.mergedLeaveDates.length ? entry.mergedLeaveDates.join(', ') : '(없음)')
      );
    });
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function parseStaffRosterDailyAttendanceJson_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeStaffRosterDailyAttendanceItem_(value) {
  if (value && typeof value === 'object') {
    return {
      status: valueOrEmpty_(value.status || '출석').trim() || '출석',
      memo: valueOrEmpty_(value.memo).trim(),
      startTime: valueOrEmpty_(value.startTime).trim(),
      endTime: valueOrEmpty_(value.endTime).trim(),
    };
  }
  return {
    status: valueOrEmpty_(value || '출석').trim() || '출석',
    memo: '',
    startTime: '',
    endTime: '',
  };
}

function stringifyStaffRosterDailyAttendanceMap_(map) {
  const normalized = {};
  Object.keys(map || {}).sort().forEach(function(dateKey) {
    if (map[dateKey]) {
      normalized[dateKey] = normalizeStaffRosterDailyAttendanceItem_(map[dateKey]);
    }
  });
  return JSON.stringify(normalized);
}

function normalizeStaffAttendanceDbSourceType_(sourceType) {
  return String(sourceType || '').trim().toLowerCase() === 'nonstaff' ? 'nonstaff' : 'staff';
}

function normalizeStaffAttendancePersonNameKey_(name) {
  return String(name || '').replace(/\s+/g, '').trim().toLowerCase();
}

function getStaffAttendanceDbPersonKeyFromValues_(sourceType, sourceRowNumber, name) {
  const normalizedType = normalizeStaffAttendanceDbSourceType_(sourceType);
  const rowNumber = Number(sourceRowNumber) || 0;
  if (rowNumber) {
    return normalizedType + ':row:' + rowNumber;
  }
  const nameKey = normalizeStaffAttendancePersonNameKey_(name);
  return nameKey ? normalizedType + ':name:' + nameKey : '';
}

function getStaffAttendanceDbPersonKey_(entry) {
  return getStaffAttendanceDbPersonKeyFromValues_(
    entry && entry.sourceType,
    entry && entry.sourceRowNumber,
    entry && entry.name
  );
}

function getStaffAttendanceDbPersonKeyCandidates_(entry) {
  const candidates = {};
  const primary = getStaffAttendanceDbPersonKey_(entry);
  if (primary) candidates[primary] = true;
  const nameKey = getStaffAttendanceDbPersonKeyFromValues_(
    entry && entry.sourceType,
    0,
    entry && entry.name
  );
  if (nameKey) candidates[nameKey] = true;
  return candidates;
}

function buildStaffAttendanceDbId_(selectedYear, entry, dateKey) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const personKey = getStaffAttendanceDbPersonKey_(entry);
  const normalizedDate = normalizeDateKey_(dateKey);
  return [STAFF_ATTENDANCE_DB_VERSION, normalizedYear, personKey, normalizedDate].join(':');
}

function ensureStaffAttendanceDbSheet_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet || SpreadsheetApp.getActiveSpreadsheet(), STAFF_ATTENDANCE_DB_SHEET_NAME);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, STAFF_ATTENDANCE_DB_HEADERS.length).setValues([STAFF_ATTENDANCE_DB_HEADERS.slice()]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), STAFF_ATTENDANCE_DB_HEADERS.length)).getDisplayValues()[0];
    const needsHeader = STAFF_ATTENDANCE_DB_HEADERS.some(function(header, index) {
      return valueOrEmpty_(currentHeaders[index]).trim() !== header;
    });
    if (needsHeader) {
      sheet.getRange(1, 1, 1, STAFF_ATTENDANCE_DB_HEADERS.length).setValues([STAFF_ATTENDANCE_DB_HEADERS.slice()]);
    }
  }
  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function toStaffAttendanceDbRowValues_(selectedYear, entry, dateKey, value) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedItem = normalizeStaffRosterDailyAttendanceItem_(value);
  const sourceType = normalizeStaffAttendanceDbSourceType_(entry && entry.sourceType);
  const sourceRowNumber = Number(entry && entry.sourceRowNumber) || 0;
  const name = valueOrEmpty_(entry && entry.name).trim();
  const personKey = getStaffAttendanceDbPersonKey_(entry);
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  return [
    buildStaffAttendanceDbId_(normalizedYear, entry, normalizedDate),
    String(normalizedYear),
    normalizedDate.slice(0, 7),
    normalizedDate,
    sourceType,
    sourceRowNumber,
    personKey,
    name,
    normalizedItem.status,
    normalizedItem.startTime,
    normalizedItem.endTime,
    normalizedItem.memo,
    updatedAt,
    '',
  ];
}

function getStaffAttendanceDbDataRows_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAFF_ATTENDANCE_DB_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, STAFF_ATTENDANCE_DB_HEADERS.length).getDisplayValues();
}

function getStaffAttendanceDbRows_(selectedYear, includeDeleted) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return getStaffAttendanceDbDataRows_().map(function(row, index) {
    return {
      rowNumber: index + 2,
      id: valueOrEmpty_(row[0]).trim(),
      year: normalizeAttendanceYear_(row[1]),
      yearMonth: valueOrEmpty_(row[2]).trim(),
      date: normalizeDateKey_(row[3]),
      sourceType: normalizeStaffAttendanceDbSourceType_(row[4]),
      sourceRowNumber: Number(row[5]) || 0,
      personKey: valueOrEmpty_(row[6]).trim(),
      name: valueOrEmpty_(row[7]).trim(),
      status: valueOrEmpty_(row[8]).trim(),
      startTime: valueOrEmpty_(row[9]).trim(),
      endTime: valueOrEmpty_(row[10]).trim(),
      memo: valueOrEmpty_(row[11]).trim(),
      updatedAt: valueOrEmpty_(row[12]).trim(),
      deletedAt: valueOrEmpty_(row[13]).trim(),
    };
  }).filter(function(item) {
    return item.year === normalizedYear && item.date && (includeDeleted || !item.deletedAt);
  });
}

function readStaffAttendanceDbMapForEntry_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const personKey = getStaffAttendanceDbPersonKey_(entry);
  if (!personKey) {
    return {};
  }
  const memoKey = normalizedYear + ':' + personKey;
  if (staffRosterAttendanceDbMemo_[memoKey]) {
    return Object.assign({}, staffRosterAttendanceDbMemo_[memoKey]);
  }

  const candidates = getStaffAttendanceDbPersonKeyCandidates_(entry);
  const map = {};
  getStaffAttendanceDbRows_(normalizedYear, false).forEach(function(row) {
    if (!candidates[row.personKey]) {
      return;
    }
    map[row.date] = {
      status: row.status || '출석',
      memo: row.memo,
      startTime: row.startTime,
      endTime: row.endTime,
    };
  });
  staffRosterAttendanceDbMemo_[memoKey] = Object.assign({}, map);
  return map;
}

function hydrateStaffRosterEntryDailyAttendanceFromDb_(entry, selectedYear) {
  if (!entry) {
    return entry;
  }
  const baseMap = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson);
  const dbMap = readStaffAttendanceDbMapForEntry_(selectedYear, entry);
  const mergedMap = Object.assign({}, baseMap, dbMap);
  if (!Object.keys(mergedMap).length) {
    return entry;
  }
  return Object.assign({}, entry, {
    dailyAttendanceJson: stringifyStaffRosterDailyAttendanceMap_(mergedMap),
  });
}

function readStaffAttendanceDbMapsForEntries_(selectedYear, entries) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const list = (entries || []).filter(function(entry) {
    return entry && getStaffAttendanceDbPersonKey_(entry);
  });
  if (!list.length) {
    return {};
  }

  const dbMapsByPrimaryKey = {};
  const candidateToPrimaryKey = {};
  const nameCandidateCounts = {};

  list.forEach(function(entry) {
    const nameKey = getStaffAttendanceDbPersonKeyFromValues_(
      entry && entry.sourceType,
      0,
      entry && entry.name
    );
    if (nameKey) {
      nameCandidateCounts[nameKey] = (nameCandidateCounts[nameKey] || 0) + 1;
    }
  });

  list.forEach(function(entry) {
    const primaryKey = getStaffAttendanceDbPersonKey_(entry);
    if (!primaryKey) return;
    dbMapsByPrimaryKey[primaryKey] = {};
    const candidates = getStaffAttendanceDbPersonKeyCandidates_(entry);
    Object.keys(candidates).forEach(function(candidateKey) {
      const nameOnlyKey = getStaffAttendanceDbPersonKeyFromValues_(
        entry && entry.sourceType,
        0,
        entry && entry.name
      );
      if (candidateKey === nameOnlyKey && nameCandidateCounts[candidateKey] > 1) {
        return;
      }
      candidateToPrimaryKey[candidateKey] = primaryKey;
    });
  });

  getStaffAttendanceDbRows_(normalizedYear, false).forEach(function(row) {
    const primaryKey = candidateToPrimaryKey[row.personKey];
    if (!primaryKey || !row.date) {
      return;
    }
    dbMapsByPrimaryKey[primaryKey][row.date] = {
      status: row.status || '출석',
      memo: row.memo,
      startTime: row.startTime,
      endTime: row.endTime,
    };
  });

  Object.keys(dbMapsByPrimaryKey).forEach(function(primaryKey) {
    staffRosterAttendanceDbMemo_[normalizedYear + ':' + primaryKey] = Object.assign({}, dbMapsByPrimaryKey[primaryKey]);
  });

  return dbMapsByPrimaryKey;
}

function hydrateStaffRosterEntriesDailyAttendanceFromDb_(entries, selectedYear) {
  const dbMapsByPrimaryKey = readStaffAttendanceDbMapsForEntries_(selectedYear, entries);
  return (entries || []).map(function(entry) {
    if (!entry) {
      return entry;
    }
    const primaryKey = getStaffAttendanceDbPersonKey_(entry);
    const baseMap = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson);
    const dbMap = primaryKey ? (dbMapsByPrimaryKey[primaryKey] || {}) : {};
    const mergedMap = Object.assign({}, baseMap, dbMap);
    if (!Object.keys(mergedMap).length) {
      return entry;
    }
    return Object.assign({}, entry, {
      dailyAttendanceJson: stringifyStaffRosterDailyAttendanceMap_(mergedMap),
    });
  });
}

function replaceStaffAttendanceDbMapsForEntries_(selectedYear, entryMaps) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const items = (entryMaps || []).filter(function(item) {
    return item && item.entry && getStaffAttendanceDbPersonKey_(item.entry);
  });
  if (!items.length) return { savedCount: 0, removedCount: 0 };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureStaffAttendanceDbSheet_(spreadsheet);
  const currentRows = getStaffAttendanceDbDataRows_();
  const targetPersonKeys = {};
  items.forEach(function(item) {
    const candidates = getStaffAttendanceDbPersonKeyCandidates_(item.entry);
    Object.keys(candidates).forEach(function(key) {
      targetPersonKeys[key] = true;
    });
  });

  let removedCount = 0;
  const retainedRows = currentRows.filter(function(row) {
    const rowYear = normalizeAttendanceYear_(row[1]);
    const rowPersonKey = valueOrEmpty_(row[6]).trim();
    const remove = rowYear === normalizedYear && targetPersonKeys[rowPersonKey];
    if (remove) {
      removedCount += 1;
    }
    return !remove;
  });

  const attendanceRows = [];
  items.forEach(function(item) {
    const entry = item.entry;
    const dailyAttendanceMap = item.map || {};
    Object.keys(dailyAttendanceMap || {}).sort().forEach(function(dateKey) {
      const normalizedDate = normalizeDateKey_(dateKey);
      if (!normalizedDate || String(normalizedDate).indexOf(String(normalizedYear) + '-') !== 0) {
        return;
      }
      if (dailyAttendanceMap[dateKey]) {
        attendanceRows.push(toStaffAttendanceDbRowValues_(
          normalizedYear,
          entry,
          normalizedDate,
          dailyAttendanceMap[dateKey]
        ));
      }
    });
  });
  const nextRows = retainedRows.concat(attendanceRows);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, STAFF_ATTENDANCE_DB_HEADERS.length).clearContent();
  }
  if (nextRows.length) {
    sheet.getRange(2, 1, nextRows.length, STAFF_ATTENDANCE_DB_HEADERS.length).setValues(nextRows);
  }

  staffRosterAttendanceDbMemo_ = {};
  staffRosterCompositionMemo_ = {};
  return {
    savedCount: attendanceRows.length,
    removedCount: removedCount,
  };
}

function replaceStaffAttendanceDbMapForEntry_(selectedYear, entry, dailyAttendanceMap) {
  return replaceStaffAttendanceDbMapsForEntries_(selectedYear, [{
    entry: entry,
    map: dailyAttendanceMap,
  }]);
}

function patchStaffAttendanceDbMapForEntry_(selectedYear, entry, changesMap, removedDateKeys) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const personKey = getStaffAttendanceDbPersonKey_(entry);
  if (!personKey) {
    return { insertedCount: 0, updatedCount: 0, removedCount: 0 };
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureStaffAttendanceDbSheet_(spreadsheet);
  const idRange = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    : null;

  function findRowNumberById_(id) {
    if (!idRange || !id) {
      return 0;
    }
    const matched = idRange
      .createTextFinder(id)
      .matchEntireCell(true)
      .findNext();
    return matched ? matched.getRow() : 0;
  }

  const now = new Date().toISOString();
  const removedLookup = {};
  let removedCount = 0;
  (removedDateKeys || []).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || String(normalizedDate).indexOf(String(normalizedYear) + '-') !== 0 || removedLookup[normalizedDate]) {
      return;
    }
    removedLookup[normalizedDate] = true;
    const rowNumber = findRowNumberById_(buildStaffAttendanceDbId_(normalizedYear, entry, normalizedDate));
    if (rowNumber) {
      sheet.getRange(rowNumber, STAFF_ATTENDANCE_DB_HEADERS.length).setValue(now);
      removedCount += 1;
    }
  });

  const appendRows = [];
  let updatedCount = 0;
  Object.keys(changesMap || {}).sort().forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || String(normalizedDate).indexOf(String(normalizedYear) + '-') !== 0) {
      return;
    }
    const values = toStaffAttendanceDbRowValues_(normalizedYear, entry, normalizedDate, changesMap[dateKey]);
    const rowNumber = removedLookup[normalizedDate]
      ? 0
      : findRowNumberById_(buildStaffAttendanceDbId_(normalizedYear, entry, normalizedDate));
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, STAFF_ATTENDANCE_DB_HEADERS.length).setValues([values]);
      updatedCount += 1;
    } else {
      appendRows.push(values);
    }
  });

  if (appendRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appendRows.length, STAFF_ATTENDANCE_DB_HEADERS.length).setValues(appendRows);
  }

  staffRosterAttendanceDbMemo_ = {};
  staffRosterCompositionMemo_ = {};
  try {
    clearAttendanceYearCache_(normalizedYear, {
      clearStudentDetails: false,
      markSnapshotStale: false,
      clearTemplatePreview: false,
    });
  } catch (error) {
    Logger.log('patchStaffAttendanceDbMapForEntry_ cache clear failed: %s', error.message);
  }
  return {
    insertedCount: appendRows.length,
    updatedCount: updatedCount,
    removedCount: removedCount,
  };
}

function formatStaffAttendanceSyncQueueDate_(date) {
  return Utilities.formatDate(
    date || new Date(),
    Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE,
    'yyyy-MM-dd HH:mm:ss'
  );
}

function ensureStaffAttendanceSyncQueueSheet_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet || SpreadsheetApp.getActiveSpreadsheet(), STAFF_ATTENDANCE_SYNC_QUEUE_SHEET_NAME);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.length).setValues([STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.slice()]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.length)).getDisplayValues()[0];
    const needsHeader = STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.some(function(header, index) {
      return valueOrEmpty_(currentHeaders[index]).trim() !== header;
    });
    if (needsHeader) {
      sheet.getRange(1, 1, 1, STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.length).setValues([STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.slice()]);
    }
  }
  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function normalizeStaffAttendanceSyncQueueStatus_(value) {
  const text = valueOrEmpty_(value).trim().toLowerCase();
  if (text === 'done' || text === 'failed' || text === 'processing') return text;
  return 'pending';
}

function buildStaffAttendanceSyncQueueId_(clientId) {
  return [
    'attendance-sync',
    Utilities.getUuid(),
    valueOrEmpty_(clientId).trim().slice(0, 24),
  ].filter(Boolean).join(':');
}

function ensureStaffAttendanceSyncQueueTrigger_() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(function(trigger) {
    return trigger && trigger.getHandlerFunction && trigger.getHandlerFunction() === STAFF_ATTENDANCE_SYNC_QUEUE_TRIGGER_HANDLER;
  });
  if (exists) {
    return { ok: true, installed: false };
  }
  ScriptApp.newTrigger(STAFF_ATTENDANCE_SYNC_QUEUE_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(1)
    .create();
  return { ok: true, installed: true };
}

function installStaffRosterAttendanceQueueTrigger() {
  assertStaffRosterAdmin_();
  const result = ensureStaffAttendanceSyncQueueTrigger_();
  SpreadsheetApp.getUi().alert(
    result.installed
      ? '출결 서버 저장 큐 트리거를 설치했습니다.'
      : '출결 서버 저장 큐 트리거가 이미 설치되어 있습니다.'
  );
}

function setupStaffRosterAttendanceQueueTrigger() {
  assertStaffRosterAdmin_();
  return ensureStaffAttendanceSyncQueueTrigger_();
}

function assertStaffRosterAttendanceQueuePayloadAllowed_(payload) {
  const normalizedType = normalizeStaffRosterDashboardType_(
    payload && (payload.sourceType || payload.dashboardType || getStaffRosterSourceTypeBySheetName_(payload.sourceSheet))
  );
  assertStaffRosterManageAccessForSourceType_(normalizedType);
  return normalizedType;
}

function enqueueStaffRosterAttendancePatchQueueBatch(input) {
  const payload = input || {};
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const nowText = formatStaffAttendanceSyncQueueDate_(new Date());
  const results = [];
  const rows = [];

  rawItems.forEach(function(item) {
    const clientId = valueOrEmpty_(item && item.clientId).trim() || Utilities.getUuid();
    const patchPayload = item && item.payload ? item.payload : item;
    try {
      if (!patchPayload || typeof patchPayload !== 'object') {
        throw new Error('저장할 출결 데이터가 없습니다.');
      }
      const normalizedType = assertStaffRosterAttendanceQueuePayloadAllowed_(patchPayload);
      const selectedYear = normalizeAttendanceYear_(patchPayload.selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
      const changes = patchPayload.changes && typeof patchPayload.changes === 'object' && !Array.isArray(patchPayload.changes)
        ? Object.keys(patchPayload.changes).length
        : 0;
      const removed = Array.isArray(patchPayload.removedDates) ? patchPayload.removedDates.length : 0;
      if (!changes && !removed) {
        throw new Error('변경된 출결 날짜가 없습니다.');
      }
      const queueId = buildStaffAttendanceSyncQueueId_(clientId);
      rows.push([
        queueId,
        clientId,
        nowText,
        'pending',
        String(selectedYear),
        normalizedType,
        valueOrEmpty_(item && item.activeId).trim(),
        JSON.stringify(Object.assign({}, patchPayload, {
          selectedYear: selectedYear,
          sourceType: normalizedType,
        })),
        '',
        '',
        '0',
      ]);
      results.push({
        clientId: clientId,
        ok: true,
        queued: true,
        queueId: queueId,
      });
    } catch (error) {
      results.push({
        clientId: clientId,
        ok: false,
        queued: false,
        message: error && error.message ? error.message : String(error || '출결 서버 접수 실패'),
      });
    }
  });

  if (rows.length) {
    const lock = LockService.getDocumentLock();
    lock.waitLock(10000);
    try {
      const sheet = ensureStaffAttendanceSyncQueueSheet_(SpreadsheetApp.getActiveSpreadsheet());
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }
  }

  const trigger = {
    ok: true,
    installed: false,
    skipped: true,
    message: '저장 요청 안에서 서버 큐를 즉시 처리합니다.',
  };
  let processed = null;
  if (rows.length) {
    try {
      processed = processStaffRosterAttendancePatchQueue({
        limit: rows.length,
        maxMillis: 60000,
      });
    } catch (error) {
      processed = {
        ok: false,
        message: error && error.message ? error.message : String(error || '즉시 처리 실패'),
      };
    }
  }

  return {
    ok: results.every(function(row) { return row && row.ok; }),
    totalCount: results.length,
    queuedCount: results.filter(function(row) { return row && row.ok; }).length,
    trigger: trigger,
    processed: processed,
    acceptedAt: nowText,
    results: results,
  };
}

function readStaffAttendanceSyncQueueRows_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAFF_ATTENDANCE_SYNC_QUEUE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, STAFF_ATTENDANCE_SYNC_QUEUE_HEADERS.length)
    .getDisplayValues()
    .map(function(row, index) {
      return {
        rowNumber: index + 2,
        queueId: valueOrEmpty_(row[0]).trim(),
        clientId: valueOrEmpty_(row[1]).trim(),
        queuedAt: valueOrEmpty_(row[2]).trim(),
        status: normalizeStaffAttendanceSyncQueueStatus_(row[3]),
        selectedYear: normalizeAttendanceYear_(row[4]),
        dashboardType: normalizeStaffRosterDashboardType_(row[5]),
        activeId: valueOrEmpty_(row[6]).trim(),
        payloadJson: valueOrEmpty_(row[7]).trim(),
        processedAt: valueOrEmpty_(row[8]).trim(),
        errorMessage: valueOrEmpty_(row[9]).trim(),
        retryCount: Number(row[10]) || 0,
      };
    });
}

function processStaffRosterAttendancePatchQueue(input) {
  const opts = input || {};
  const limit = Math.max(1, Math.min(Number(opts.limit) || 25, 100));
  const maxMillis = Math.max(5000, Math.min(Number(opts.maxMillis) || 240000, 330000));
  const startedAt = Date.now();
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) {
    return { ok: false, locked: true, processedCount: 0, failedCount: 0 };
  }

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureStaffAttendanceSyncQueueSheet_(spreadsheet);
    const rows = readStaffAttendanceSyncQueueRows_();
    const targets = rows.filter(function(row) {
      if (!row || !row.queueId || !row.payloadJson) return false;
      if (row.status === 'done') return false;
      if (row.status === 'processing' && row.processedAt) return false;
      return row.retryCount < 5;
    }).slice(0, limit);

    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    targets.forEach(function(row) {
      if (Date.now() - startedAt > maxMillis) {
        return;
      }
      const rowNumber = Number(row.rowNumber) || 0;
      const nextRetryCount = Number(row.retryCount) || 0;
      try {
        sheet.getRange(rowNumber, 4, 1, 8).setValues([[
          'processing',
          String(row.selectedYear || ''),
          row.dashboardType || '',
          row.activeId || '',
          row.payloadJson || '',
          '',
          '',
          String(nextRetryCount),
        ]]);
        const patchPayload = JSON.parse(row.payloadJson);
        const saveResult = saveStaffRosterAttendancePatch(patchPayload);
        const processedAt = formatStaffAttendanceSyncQueueDate_(new Date());
        sheet.getRange(rowNumber, 4, 1, 8).setValues([[
          'done',
          String(row.selectedYear || ''),
          row.dashboardType || '',
          row.activeId || '',
          row.payloadJson || '',
          processedAt,
          JSON.stringify(saveResult || {}).slice(0, 4000),
          String(nextRetryCount),
        ]]);
        processedCount += 1;
        results.push({
          queueId: row.queueId,
          clientId: row.clientId,
          ok: true,
          result: saveResult,
        });
      } catch (error) {
        const processedAt = formatStaffAttendanceSyncQueueDate_(new Date());
        const message = error && error.message ? error.message : String(error || '출결 큐 처리 실패');
        sheet.getRange(rowNumber, 4, 1, 8).setValues([[
          'failed',
          String(row.selectedYear || ''),
          row.dashboardType || '',
          row.activeId || '',
          row.payloadJson || '',
          processedAt,
          message.slice(0, 4000),
          String(nextRetryCount + 1),
        ]]);
        failedCount += 1;
        results.push({
          queueId: row.queueId,
          clientId: row.clientId,
          ok: false,
          message: message,
        });
      }
    });

    return {
      ok: failedCount === 0,
      processedCount: processedCount,
      failedCount: failedCount,
      remainingCount: Math.max(targets.length - processedCount - failedCount, 0),
      results: results,
    };
  } finally {
    lock.releaseLock();
  }
}

function processStaffRosterAttendancePatchQueueTrigger() {
  return processStaffRosterAttendancePatchQueue({
    limit: 50,
    maxMillis: 300000,
  });
}

function processStaffRosterAttendancePatchQueueMenu() {
  assertStaffRosterAdmin_();
  const result = processStaffRosterAttendancePatchQueue({
    limit: 100,
    maxMillis: 300000,
  });
  SpreadsheetApp.getUi().alert([
    '출결 서버 저장 큐 처리 결과',
    '처리: ' + (Number(result.processedCount) || 0) + '건',
    '실패: ' + (Number(result.failedCount) || 0) + '건',
    result.locked ? '다른 저장 작업이 진행 중입니다.' : '',
  ].filter(Boolean).join('\n'));
}

function getStaffRosterDailyAttendanceMapForEntry_(entry, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return Object.assign(
    {},
    parseStaffRosterDailyAttendanceJson_(entry && entry.dailyAttendanceJson),
    readStaffAttendanceDbMapForEntry_(normalizedYear, entry)
  );
}

function stripStaffRosterDailyAttendanceJsonFromBundle_(bundle) {
  ['staffInfo', 'nonStaffInfo'].forEach(function(infoKey) {
    (bundle && bundle[infoKey] && bundle[infoKey].entries || []).forEach(function(entry) {
      entry.dailyAttendanceJson = '';
    });
  });
  bundle.entries = (bundle && bundle.staffInfo && bundle.staffInfo.entries || [])
    .concat(bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
  return bundle;
}

function migrateStaffRosterDailyAttendanceToDbByYear(selectedYear, stripFromStaffDb) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const entries = (bundle && bundle.entries || []).filter(function(entry) {
    return entry && entry.name;
  });
  let personCount = 0;
  let dateCount = 0;
  const entryMaps = [];

  entries.forEach(function(entry) {
    const baseMap = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson);
    if (!Object.keys(baseMap).length) {
      return;
    }
    personCount += 1;
    dateCount += Object.keys(baseMap).length;
    entryMaps.push({
      entry: entry,
      map: baseMap,
    });
  });

  if (entryMaps.length) {
    replaceStaffAttendanceDbMapsForEntries_(normalizedYear, entryMaps);
  }

  if (stripFromStaffDb !== false && personCount) {
    stripStaffRosterDailyAttendanceJsonFromBundle_(bundle);
    const savedBundle = saveStaffRosterMasterByYear_(normalizedYear, bundle);
    saveStaffRosterCacheByYear_(normalizedYear, savedBundle);
    staffRosterBundleMemo_[normalizedYear] = savedBundle;
    staffRosterAnalysisSavedMemo_[normalizedYear] = null;
    saveStaffRosterAnalysisIfNeeded_(normalizedYear, savedBundle.analysis);
  }

  return {
    year: normalizedYear,
    migratedPeople: personCount,
    migratedDates: dateCount,
    strippedFromStaffDb: stripFromStaffDb !== false && personCount > 0,
  };
}

function migrateStaffRosterDailyAttendanceToDb2024To2026() {
  return [2024, 2025, 2026].map(function(year) {
    return migrateStaffRosterDailyAttendanceToDbByYear(year, true);
  });
}

function migrateStaffRosterDailyAttendanceToDbMenu() {
  const results = migrateStaffRosterDailyAttendanceToDb2024To2026();
  const lines = results.map(function(result) {
    return result.year + '년: ' +
      result.migratedPeople + '명 / ' +
      result.migratedDates + '일 출결 이관' +
      (result.strippedFromStaffDb ? ' / 기존 JSON 정리' : '');
  });
  SpreadsheetApp.getUi().alert('출결 DB 분리 작업을 완료했습니다.\n\n' + lines.join('\n'));
  return results;
}

function inspectStaffAttendanceDbSummary2024To2026() {
  const rows = getStaffAttendanceDbDataRows_();
  const summary = {};
  [2024, 2025, 2026].forEach(function(year) {
    summary[year] = {
      rows: 0,
      people: {},
      activeRows: 0,
      deletedRows: 0,
    };
  });
  rows.forEach(function(row) {
    const year = normalizeAttendanceYear_(row[1]);
    if (!summary[year]) return;
    const personKey = valueOrEmpty_(row[6]).trim();
    summary[year].rows += 1;
    if (valueOrEmpty_(row[13]).trim()) {
      summary[year].deletedRows += 1;
    } else {
      summary[year].activeRows += 1;
    }
    if (personKey) {
      summary[year].people[personKey] = true;
    }
  });
  return [2024, 2025, 2026].map(function(year) {
    return {
      year: year,
      rows: summary[year].rows,
      activeRows: summary[year].activeRows,
      deletedRows: summary[year].deletedRows,
      people: Object.keys(summary[year].people).length,
    };
  });
}

function buildAnnualLeaveAttendanceItem_(usedValue) {
  const label = formatAnnualLeaveUsedValueLabel_(usedValue);
  return {
    status: '연가',
    memo: '',
    startTime: '',
    endTime: '',
    leaveValue: label,
  };
}

function isAnnualLeaveAttendanceItem_(item) {
  const normalized = normalizeStaffRosterDailyAttendanceItem_(item);
  return /연가|연차/.test(normalized.status) || /연가|연차/.test(normalized.memo);
}

function canAnnualLeaveReplaceAttendanceItem_(item) {
  if (!item) {
    return true;
  }
  if (isAnnualLeaveAttendanceItem_(item)) {
    return true;
  }
  const normalized = normalizeStaffRosterDailyAttendanceItem_(item);
  return /^(출석|활동|재직)$/.test(normalized.status);
}

function getAnnualLeaveDailyAttendanceByNameForRoster_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readAnnualLeaveStoredOrSourcePayload_(normalizedYear);
  if (!stored || !stored.rows || !stored.rows.length) {
    return {};
  }
  try {
    return readAnnualLeaveDailyAttendanceByNameFromStored_(stored, normalizedYear).byName || {};
  } catch (error) {
    Logger.log('getAnnualLeaveDailyAttendanceByNameForRoster_ failed: %s', error.message);
    return {};
  }
}

function mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_(dailyAttendanceJson, name, annualLeaveByName) {
  const personKey = normalizeAnnualLeavePersonKey_(name);
  const annualPerson = personKey && annualLeaveByName ? annualLeaveByName[personKey] : null;
  if (!annualPerson || !annualPerson.dates) {
    return valueOrEmpty_(dailyAttendanceJson);
  }

  const dailyAttendanceMap = parseStaffRosterDailyAttendanceJson_(dailyAttendanceJson);
  Object.keys(annualPerson.dates || {}).sort().forEach(function(dateKey) {
    const annualItem = buildAnnualLeaveAttendanceItem_(annualPerson.dates[dateKey]);
    const current = dailyAttendanceMap[dateKey];
    if (canAnnualLeaveReplaceAttendanceItem_(current)) {
      dailyAttendanceMap[dateKey] = annualItem;
      return;
    }

    const normalizedCurrent = normalizeStaffRosterDailyAttendanceItem_(current);
    if (!isAnnualLeaveAttendanceItem_(normalizedCurrent)) {
      normalizedCurrent.status = '연가';
    }
    dailyAttendanceMap[dateKey] = normalizedCurrent;
  });

  return stringifyStaffRosterDailyAttendanceMap_(dailyAttendanceMap);
}

function buildStaffRosterAnnualLeaveRowContexts_(sheet, headerInfo, ensuredHeader) {
  const headerIndexMap = ensuredHeader.headerIndexMap || {};
  const headerRowNumber = Number(ensuredHeader.headerRowNumber) || Number(headerInfo && headerInfo.headerRowNumber) || 1;
  const lastRow = Number(headerInfo && headerInfo.lastRow) || sheet.getLastRow();
  const lastColumn = Math.max(Number(ensuredHeader.lastColumn) || 0, sheet.getLastColumn());
  const rowCount = Math.max(lastRow - headerRowNumber, 0);
  if (!rowCount) {
    return [];
  }

  const values = sheet.getRange(headerRowNumber + 1, 1, rowCount, lastColumn).getDisplayValues();
  const contexts = [];
  values.forEach(function(row, index) {
    const nameIndex = headerIndexMap.name;
    const name = nameIndex === null || nameIndex === undefined ? '' : valueOrEmpty_(row[nameIndex]).trim();
    const personKey = normalizeAnnualLeavePersonKey_(name);
    if (!name || !personKey || isStaffRosterHeaderLikeValue_(name)) {
      return;
    }

    const positionIndex = headerIndexMap.position;
    const statusIndex = headerIndexMap.status;
    const joinDateIndex = headerIndexMap.joinDate;
    const exitDateIndex = headerIndexMap.exitDate;
    const dailyAttendanceIndex = headerIndexMap.dailyAttendanceJson;
    contexts.push({
      rowNumber: headerRowNumber + 1 + index,
      name: name,
      personKey: personKey,
      position: positionIndex === null || positionIndex === undefined ? '' : valueOrEmpty_(row[positionIndex]).trim(),
      status: statusIndex === null || statusIndex === undefined ? '' : valueOrEmpty_(row[statusIndex]).trim(),
      joinDate: joinDateIndex === null || joinDateIndex === undefined ? '' : normalizeRosterDateValue_(row[joinDateIndex]),
      exitDate: exitDateIndex === null || exitDateIndex === undefined ? '' : normalizeRosterDateValue_(row[exitDateIndex]),
      dailyAttendanceJson: dailyAttendanceIndex === null || dailyAttendanceIndex === undefined ? '' : valueOrEmpty_(row[dailyAttendanceIndex]).trim(),
    });
  });
  return contexts;
}

function selectStaffRosterAnnualLeaveTargetRow_(contexts, dateKey) {
  const safeContexts = contexts || [];
  if (!safeContexts.length) {
    return null;
  }
  const activeContexts = safeContexts.filter(function(context) {
    const joinDate = normalizeDateKey_(context && context.joinDate);
    const exitDate = normalizeDateKey_(context && context.exitDate);
    const status = valueOrEmpty_(context && context.status).trim();
    if (joinDate && dateKey && joinDate > dateKey) {
      return false;
    }
    if (exitDate && dateKey && exitDate < dateKey) {
      return false;
    }
    if (!exitDate && status && /퇴|종료/.test(status)) {
      return false;
    }
    return true;
  });
  const candidates = activeContexts.length ? activeContexts : safeContexts;
  return candidates.slice().sort(function(a, b) {
    const leftJoin = normalizeDateKey_(a && a.joinDate);
    const rightJoin = normalizeDateKey_(b && b.joinDate);
    if (leftJoin !== rightJoin) {
      return String(rightJoin || '').localeCompare(String(leftJoin || ''));
    }
    return (Number(b && b.rowNumber) || 0) - (Number(a && a.rowNumber) || 0);
  })[0] || null;
}

function buildAnnualLeaveStaffInfoLookupByPersonKey_(availableStaffByYear) {
  const lookup = {};
  (availableStaffByYear || []).forEach(function(item) {
    const key = normalizeAnnualLeavePersonKey_(item && item.name);
    if (!key || lookup[key]) {
      return;
    }
    lookup[key] = {
      name: valueOrEmpty_(item && item.name).trim(),
      position: valueOrEmpty_(item && item.position).trim(),
      joinDate: normalizeRosterDateValue_(item && item.joinDate),
      category: valueOrEmpty_(item && item.category).trim(),
    };
  });
  return lookup;
}

function getFirstAnnualLeaveDateKey_(annualPerson) {
  return Object.keys(annualPerson && annualPerson.dates || {})
    .filter(Boolean)
    .sort()[0] || '';
}

function buildMissingStaffRosterEntryFromAnnualLeave_(personKey, annualPerson, annualLeaveInfoLookup, selectedYear, rowNumber, annualLeaveByName) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const annualInfo = annualLeaveInfoLookup && annualLeaveInfoLookup[personKey] ? annualLeaveInfoLookup[personKey] : {};
  const name = valueOrEmpty_(annualInfo.name).trim() || valueOrEmpty_(annualPerson && annualPerson.name).trim() || personKey;
  const joinDate = normalizeRosterDateValue_(annualInfo.joinDate)
    || getFirstAnnualLeaveDateKey_(annualPerson)
    || (normalizedYear + '-01-01');
  return normalizeStaffRosterCacheEntry_(Object.assign({}, {
    displayOrder: '',
    name: name,
    email: '',
    position: valueOrEmpty_(annualInfo.position).trim() || valueOrEmpty_(annualInfo.category).trim(),
    joinDate: joinDate,
    exitDate: '',
    group: '',
    classification: '',
    category: '',
    status: '재직',
    attendanceStatus: '',
    attendanceDays: '',
    absenceDays: '',
    attendanceMemo: '',
    dailyAttendanceJson: mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_('', name, annualLeaveByName),
    leaveCarryover: '',
    leaveManualAdjustment: '',
    leaveMemo: '연가 데이터 기반 자동 생성',
    sourceType: 'staff',
    sourceSheet: '종사자',
    sourceRowNumber: rowNumber,
  }), 'staff', '종사자');
}

function ensureAnnualLeaveStaffEntriesInBundle_(selectedYear, bundle, annualLeaveByName, annualLeaveInfo) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!bundle || !annualLeaveByName || !Object.keys(annualLeaveByName).length) {
    return { insertedCount: 0, insertedNames: [] };
  }

  const staffInfo = getStaffRosterInfoBySourceType_(bundle, 'staff');
  const existingLookup = {};
  (staffInfo.entries || []).forEach(function(entry) {
    const personKey = normalizeAnnualLeavePersonKey_(entry && entry.name);
    if (personKey) {
      existingLookup[personKey] = true;
    }
  });

  const annualLeaveInfoLookup = buildAnnualLeaveStaffInfoLookupByPersonKey_(
    annualLeaveInfo && annualLeaveInfo.availableStaffByYear
  );
  let nextRowNumber = getNextStaffRosterMasterRowNumber_(bundle, 'staff');
  const insertedEntries = [];

  Object.keys(annualLeaveByName).sort().forEach(function(personKey) {
    if (!personKey || existingLookup[personKey]) {
      return;
    }
    const annualPerson = annualLeaveByName[personKey];
    const entry = buildMissingStaffRosterEntryFromAnnualLeave_(
      personKey,
      annualPerson,
      annualLeaveInfoLookup,
      normalizedYear,
      nextRowNumber,
      annualLeaveByName
    );
    nextRowNumber += 1;
    staffInfo.entries.push(entry);
    existingLookup[personKey] = true;
    insertedEntries.push(entry);
  });

  if (insertedEntries.length) {
    bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || [])
      .concat(bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
    bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
  }

  return {
    insertedCount: insertedEntries.length,
    insertedNames: insertedEntries.map(function(entry) {
      return valueOrEmpty_(entry && entry.name).trim();
    }).filter(Boolean).sort(function(a, b) {
      return String(a).localeCompare(String(b), 'ko');
    }),
  };
}

function applyAnnualLeaveToStaffRosterByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readAnnualLeaveStoredOrSourcePayload_(normalizedYear);
  if (!stored || !stored.rows || !stored.rows.length) {
    throw new Error(normalizedYear + '년 연차 저장 데이터가 없습니다. 먼저 연차 가져오기를 실행해주세요.');
  }

  const annualLeave = readAnnualLeaveDailyAttendanceByNameFromStored_(stored, normalizedYear);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  const ensuredStaff = ensureAnnualLeaveStaffEntriesInBundle_(
    normalizedYear,
    bundle,
    annualLeave.byName,
    annualLeaveInfo
  );
  const staffInfo = bundle.staffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '종사자', 'staff');
  const rowContexts = (staffInfo.entries || []).map(function(entry, index) {
    return {
      rowNumber: Number(entry.sourceRowNumber) || index + 2,
      name: valueOrEmpty_(entry.name).trim(),
      personKey: normalizeAnnualLeavePersonKey_(entry.name),
      position: valueOrEmpty_(entry.position).trim(),
      status: valueOrEmpty_(entry.status).trim(),
      joinDate: normalizeRosterDateValue_(entry.joinDate),
      exitDate: normalizeRosterDateValue_(entry.exitDate),
      dailyAttendanceJson: valueOrEmpty_(entry.dailyAttendanceJson).trim(),
      entry: entry,
    };
  }).filter(function(context) {
    return !!context.name && !!context.personKey;
  });
  const contextsByName = {};
  rowContexts.forEach(function(context) {
    if (!contextsByName[context.personKey]) {
      contextsByName[context.personKey] = [];
    }
    contextsByName[context.personKey].push(context);
  });

  const rowUpdateMap = {};
  const rowContextLookup = {};
  rowContexts.forEach(function(context) {
    rowContextLookup[context.rowNumber] = context;
  });

  let appliedDateCount = 0;
  const unmatchedLookup = {};
  Object.keys(annualLeave.byName || {}).forEach(function(personKey) {
    const annualPerson = annualLeave.byName[personKey];
    const contexts = contextsByName[personKey] || [];
    if (!contexts.length) {
      unmatchedLookup[annualPerson.name] = true;
      return;
    }

    Object.keys(annualPerson.dates || {}).sort().forEach(function(dateKey) {
      const targetContext = selectStaffRosterAnnualLeaveTargetRow_(contexts, dateKey);
      if (!targetContext) {
        unmatchedLookup[annualPerson.name] = true;
        return;
      }
      if (!rowUpdateMap[targetContext.rowNumber]) {
        rowUpdateMap[targetContext.rowNumber] = parseStaffRosterDailyAttendanceJson_(targetContext.dailyAttendanceJson);
      }

      const current = rowUpdateMap[targetContext.rowNumber][dateKey];
      const annualItem = buildAnnualLeaveAttendanceItem_(annualPerson.dates[dateKey]);
      if (canAnnualLeaveReplaceAttendanceItem_(current)) {
        rowUpdateMap[targetContext.rowNumber][dateKey] = annualItem;
      } else {
        const normalizedCurrent = normalizeStaffRosterDailyAttendanceItem_(current);
        normalizedCurrent.status = '연가';
        rowUpdateMap[targetContext.rowNumber][dateKey] = normalizedCurrent;
      }
      appliedDateCount += 1;
    });
  });

  const updateRows = Object.keys(rowUpdateMap).map(function(rowNumber) {
    return Number(rowNumber);
  }).filter(Boolean).sort(function(a, b) { return a - b; });

  updateRows.forEach(function(rowNumber) {
    const context = rowContextLookup[rowNumber];
    if (context && context.entry) {
      context.entry.dailyAttendanceJson = stringifyStaffRosterDailyAttendanceMap_(rowUpdateMap[rowNumber]);
    }
  });

  bundle.entries = (bundle.staffInfo.entries || []).concat(bundle.nonStaffInfo.entries || []);
  bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
  saveStaffRosterMasterByYear_(normalizedYear, bundle);
  saveStaffRosterCacheByYear_(normalizedYear, bundle);
  clearStaffRosterYearCaches_(normalizedYear);
  annualLeaveSupportMemo_[normalizedYear] = null;

  return {
    year: normalizedYear,
    leaveDateCount: annualLeave.leaveDateCount,
    appliedDateCount: appliedDateCount,
    updatedStaffCount: updateRows.length,
    autoCreatedStaffCount: Number(ensuredStaff && ensuredStaff.insertedCount) || 0,
    autoCreatedStaffNames: ensuredStaff && ensuredStaff.insertedNames ? ensuredStaff.insertedNames.slice() : [],
    unmatchedNames: Object.keys(unmatchedLookup).sort(function(a, b) {
      return String(a).localeCompare(String(b), 'ko');
    }),
  };
}

function buildStaffRosterHeaderIndexMap_(headers) {
  const headerIndexMap = buildHeaderIndexMap_(headers || []);
  const aliasesMap = getStaffRosterHeaderAliases_();
  function findIndex(aliases) {
    for (let index = 0; index < aliases.length; index += 1) {
      const found = headerIndexMap[aliases[index]];
      if (found !== null && found !== undefined) {
        return found;
      }
    }
    return null;
  }

  return {
    displayOrder: findIndex(aliasesMap.displayOrder),
    name: findIndex(aliasesMap.name),
    email: findIndex(aliasesMap.email),
    position: findIndex(aliasesMap.position),
    roleText: findIndex(aliasesMap.roleText),
    joinDate: findIndex(aliasesMap.joinDate),
    exitDate: findIndex(aliasesMap.exitDate),
    group: findIndex(aliasesMap.group),
    classification: findIndex(aliasesMap.classification),
    status: findIndex(aliasesMap.status),
    attendanceStatus: findIndex(aliasesMap.attendanceStatus),
    attendanceDays: findIndex(aliasesMap.attendanceDays),
    absenceDays: findIndex(aliasesMap.absenceDays),
    attendanceMemo: findIndex(aliasesMap.attendanceMemo),
    dailyAttendanceJson: findIndex(aliasesMap.dailyAttendanceJson),
    leaveCarryover: findIndex(aliasesMap.leaveCarryover),
    leaveManualAdjustment: findIndex(aliasesMap.leaveManualAdjustment),
    leaveMemo: findIndex(aliasesMap.leaveMemo),
    coopMembershipFee: findIndex(aliasesMap.coopMembershipFee),
    coopMembershipFeeDate: findIndex(aliasesMap.coopMembershipFeeDate),
    criminalRecordCheckDate: findIndex(aliasesMap.criminalRecordCheckDate),
    abusePreventionPledge: findIndex(aliasesMap.abusePreventionPledge),
    abusePreventionPledgeDate: findIndex(aliasesMap.abusePreventionPledgeDate),
    abusePreventionPledgeStatus: findIndex(aliasesMap.abusePreventionPledgeStatus),
    sexCrimeDisabilityCheck: findIndex(aliasesMap.sexCrimeDisabilityCheck),
    sexCrimeDisabilityCheckDate: findIndex(aliasesMap.sexCrimeDisabilityCheckDate),
    sexCrimeDisabilityCheckStatus: findIndex(aliasesMap.sexCrimeDisabilityCheckStatus),
    healthCheckDate: findIndex(aliasesMap.healthCheckDate),
    healthCheckStatus: findIndex(aliasesMap.healthCheckStatus),
    tuberculosisCheckDate: findIndex(aliasesMap.tuberculosisCheckDate),
    stampUrl: findIndex(aliasesMap.stampUrl),
  };
}

function detectStaffRosterHeaderRow_(values) {
  const rows = values || [];
  const maxScanRows = Math.min(rows.length, 8);
  let best = null;

  for (let rowIndex = 0; rowIndex < maxScanRows; rowIndex += 1) {
    const headers = rows[rowIndex] || [];
    const headerIndexMap = buildStaffRosterHeaderIndexMap_(headers);
    const recognizedFields = buildRecognizedRosterFieldList_(headerIndexMap);
    const score = recognizedFields.length + (headerIndexMap.name !== null ? 2 : 0);
    if (headerIndexMap.name === null) {
      continue;
    }
    if (!best || score > best.score) {
      best = {
        rowIndex: rowIndex,
        headers: headers.slice(),
        headerIndexMap: headerIndexMap,
        score: score,
      };
    }
  }

  if (best) {
    return best;
  }

  const fallbackHeaders = rows[0] || [];
  return {
    rowIndex: 0,
    headers: fallbackHeaders.slice(),
    headerIndexMap: buildStaffRosterHeaderIndexMap_(fallbackHeaders),
    score: 0,
  };
}

function isStaffRosterHeaderLikeValue_(value) {
  const normalized = String(value || '').replace(/\s+/g, '').trim();
  if (!normalized) {
    return false;
  }
  const aliasesMap = getStaffRosterHeaderAliases_();
  return Object.keys(aliasesMap).some(function(key) {
    return (aliasesMap[key] || []).some(function(alias) {
      return normalized === String(alias || '').replace(/\s+/g, '').trim();
    });
  });
}

function isStaffRosterHeaderLikeEntry_(entry) {
  if (!entry) {
    return false;
  }
  const name = valueOrEmpty_(entry.name).trim();
  const position = valueOrEmpty_(entry.position).trim();
  const group = valueOrEmpty_(entry.group || entry.category).trim();
  const classification = valueOrEmpty_(entry.classification).trim();
  const status = valueOrEmpty_(entry.status).trim();
  const joinDate = valueOrEmpty_(entry.joinDate).trim();
  const exitDate = valueOrEmpty_(entry.exitDate).trim();

  if (isStaffRosterHeaderLikeValue_(name)) {
    return true;
  }
  const matches = [position, group, classification, status, joinDate, exitDate].filter(function(value) {
    return isStaffRosterHeaderLikeValue_(value);
  }).length;
  return matches >= 2;
}

function buildRecognizedRosterFieldList_(headerIndexMap) {
  return Object.keys(headerIndexMap || {}).filter(function(key) {
    return headerIndexMap[key] !== null && headerIndexMap[key] !== undefined;
  });
}

function normalizeRosterDateValue_(value) {
  if (value instanceof Date) {
    return normalizeDateKey_(value);
  }
  const rawValue = valueOrEmpty_(value).trim();
  if (!rawValue) {
    return '';
  }
  const isDateKey = function(candidate) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(candidate || '').trim());
  };
  const assistantDate = normalizeAssistantDateKey_(rawValue);
  if (isDateKey(assistantDate)) {
    return assistantDate;
  }
  const normalizedDate = normalizeDateKey_(rawValue);
  if (isDateKey(normalizedDate)) {
    return normalizedDate;
  }
  const relaxedMatch = rawValue.match(/(?:^|[^0-9])(\d{2,4})\s*(?:년|[.\-/])\s*(\d{1,2})\s*(?:월|[.\-/])\s*(\d{1,2})/);
  if (relaxedMatch) {
    const rawYear = Number(relaxedMatch[1]);
    const normalizedYear = rawYear < 100 ? (rawYear <= 49 ? 2000 + rawYear : 1900 + rawYear) : rawYear;
    return [
      String(normalizedYear).padStart(4, '0'),
      String(Number(relaxedMatch[2]) || 1).padStart(2, '0'),
      String(Number(relaxedMatch[3]) || 1).padStart(2, '0'),
    ].join('-');
  }
  const yearMonthMatch = rawValue.match(/(?:^|[^0-9])(\d{2,4})\s*(?:년|[.\-/])\s*(\d{1,2})\s*월?/);
  if (yearMonthMatch) {
    const rawYear = Number(yearMonthMatch[1]);
    const normalizedYear = rawYear < 100 ? (rawYear <= 49 ? 2000 + rawYear : 1900 + rawYear) : rawYear;
    return [
      String(normalizedYear).padStart(4, '0'),
      String(Number(yearMonthMatch[2]) || 1).padStart(2, '0'),
      '01',
    ].join('-');
  }
  return rawValue;
}

function readStaffRosterEntriesFromSheet_(sheet, sourceType) {
  if (!sheet) {
    return {
      sheetName: '',
      headers: [],
      entries: [],
      headerIndexMap: {},
      rowCount: 0,
    };
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) {
    return {
      sheetName: sheet.getName(),
      headers: [],
      entries: [],
      headerIndexMap: {},
      rowCount: 0,
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const detectedHeader = detectStaffRosterHeaderRow_(values);
  const headerRowIndex = detectedHeader.rowIndex;
  const headers = detectedHeader.headers || [];
  const headerIndexMap = detectedHeader.headerIndexMap || buildStaffRosterHeaderIndexMap_(headers);
  if (headerIndexMap.name === null) {
    return {
      sheetName: sheet.getName(),
      headers: headers,
      entries: [],
      headerIndexMap: headerIndexMap,
      rowCount: Math.max(lastRow - 1, 0),
      headerRowNumber: headerRowIndex + 1,
    };
  }

  const entries = values.slice(headerRowIndex + 1).map(function(row, index) {
    const group = headerIndexMap.group === null ? '' : valueOrEmpty_(row[headerIndexMap.group]).trim();
    const classification = headerIndexMap.classification === null ? '' : valueOrEmpty_(row[headerIndexMap.classification]).trim();
    return {
      displayOrder: headerIndexMap.displayOrder === null ? '' : valueOrEmpty_(row[headerIndexMap.displayOrder]).trim(),
      name: valueOrEmpty_(row[headerIndexMap.name]).trim(),
      email: headerIndexMap.email === null ? '' : valueOrEmpty_(row[headerIndexMap.email]).trim(),
      position: headerIndexMap.position === null ? '' : valueOrEmpty_(row[headerIndexMap.position]).trim(),
      roleText: headerIndexMap.roleText === null ? '' : valueOrEmpty_(row[headerIndexMap.roleText]).trim(),
      joinDate: headerIndexMap.joinDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.joinDate]),
      exitDate: headerIndexMap.exitDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.exitDate]),
      group: group,
      classification: classification,
      category: group || classification,
      status: headerIndexMap.status === null ? '' : valueOrEmpty_(row[headerIndexMap.status]).trim(),
      attendanceStatus: headerIndexMap.attendanceStatus === null ? '' : valueOrEmpty_(row[headerIndexMap.attendanceStatus]).trim(),
      attendanceDays: headerIndexMap.attendanceDays === null ? '' : valueOrEmpty_(row[headerIndexMap.attendanceDays]).trim(),
      absenceDays: headerIndexMap.absenceDays === null ? '' : valueOrEmpty_(row[headerIndexMap.absenceDays]).trim(),
      attendanceMemo: headerIndexMap.attendanceMemo === null ? '' : valueOrEmpty_(row[headerIndexMap.attendanceMemo]).trim(),
      dailyAttendanceJson: headerIndexMap.dailyAttendanceJson === null ? '' : valueOrEmpty_(row[headerIndexMap.dailyAttendanceJson]).trim(),
      leaveCarryover: headerIndexMap.leaveCarryover === null ? '' : valueOrEmpty_(row[headerIndexMap.leaveCarryover]).trim(),
      leaveManualAdjustment: headerIndexMap.leaveManualAdjustment === null ? '' : valueOrEmpty_(row[headerIndexMap.leaveManualAdjustment]).trim(),
      leaveMemo: headerIndexMap.leaveMemo === null ? '' : valueOrEmpty_(row[headerIndexMap.leaveMemo]).trim(),
      coopMembershipFee: headerIndexMap.coopMembershipFee === null ? '' : valueOrEmpty_(row[headerIndexMap.coopMembershipFee]).trim(),
      coopMembershipFeeDate: headerIndexMap.coopMembershipFeeDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.coopMembershipFeeDate]) || valueOrEmpty_(row[headerIndexMap.coopMembershipFeeDate]).trim(),
      criminalRecordCheckDate: headerIndexMap.criminalRecordCheckDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.criminalRecordCheckDate]) || valueOrEmpty_(row[headerIndexMap.criminalRecordCheckDate]).trim(),
      abusePreventionPledge: headerIndexMap.abusePreventionPledge === null ? '' : valueOrEmpty_(row[headerIndexMap.abusePreventionPledge]).trim(),
      abusePreventionPledgeDate: headerIndexMap.abusePreventionPledgeDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.abusePreventionPledgeDate]) || valueOrEmpty_(row[headerIndexMap.abusePreventionPledgeDate]).trim(),
      abusePreventionPledgeStatus: headerIndexMap.abusePreventionPledgeStatus === null ? '' : valueOrEmpty_(row[headerIndexMap.abusePreventionPledgeStatus]).trim(),
      sexCrimeDisabilityCheck: headerIndexMap.sexCrimeDisabilityCheck === null ? '' : valueOrEmpty_(row[headerIndexMap.sexCrimeDisabilityCheck]).trim(),
      sexCrimeDisabilityCheckDate: headerIndexMap.sexCrimeDisabilityCheckDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.sexCrimeDisabilityCheckDate]) || valueOrEmpty_(row[headerIndexMap.sexCrimeDisabilityCheckDate]).trim(),
      sexCrimeDisabilityCheckStatus: headerIndexMap.sexCrimeDisabilityCheckStatus === null ? '' : valueOrEmpty_(row[headerIndexMap.sexCrimeDisabilityCheckStatus]).trim(),
      healthCheckDate: headerIndexMap.healthCheckDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.healthCheckDate]) || valueOrEmpty_(row[headerIndexMap.healthCheckDate]).trim(),
      healthCheckStatus: headerIndexMap.healthCheckStatus === null ? '' : valueOrEmpty_(row[headerIndexMap.healthCheckStatus]).trim(),
      tuberculosisCheckDate: headerIndexMap.tuberculosisCheckDate === null ? '' : normalizeRosterDateValue_(row[headerIndexMap.tuberculosisCheckDate]) || valueOrEmpty_(row[headerIndexMap.tuberculosisCheckDate]).trim(),
      stampUrl: headerIndexMap.stampUrl === null ? '' : valueOrEmpty_(row[headerIndexMap.stampUrl]).trim(),
      sourceType: sourceType,
      sourceSheet: sheet.getName(),
      sourceRowNumber: headerRowIndex + 2 + index,
    };
  }).filter(function(entry) {
    return !!entry.name && !isStaffRosterHeaderLikeEntry_(entry);
  });

  return {
    sheetName: sheet.getName(),
    headers: headers,
    entries: entries,
    headerIndexMap: headerIndexMap,
    rowCount: Math.max(lastRow - 1, 0),
    headerRowNumber: headerRowIndex + 1,
  };
}

function getAnnualLeaveSupportByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (annualLeaveSupportMemo_[normalizedYear]) {
    return annualLeaveSupportMemo_[normalizedYear];
  }
  const annualLeaveStored = readAnnualLeaveStoredOrSourcePayload_(normalizedYear);
  const support = annualLeaveStored
    && annualLeaveStored.rows && annualLeaveStored.rows.length
    ? readAnnualLeaveInfoByDateFromStored_(annualLeaveStored, normalizedYear)
    : { leaveNamesByDate: {}, availableStaffByYear: [] };
  annualLeaveSupportMemo_[normalizedYear] = support;
  return support;
}

function buildStaffRosterAnalysisPayload_(selectedYear, staffInfo, nonStaffInfo) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const entries = staffInfo.entries.concat(nonStaffInfo.entries);
  const staffRecognized = buildRecognizedRosterFieldList_(staffInfo.headerIndexMap);
  const nonStaffRecognized = buildRecognizedRosterFieldList_(nonStaffInfo.headerIndexMap);
  const recommendedFields = ['displayOrder', 'name', 'email', 'position', 'roleText', 'joinDate', 'exitDate', 'group', 'classification', 'status', 'attendanceStatus', 'attendanceDays', 'absenceDays', 'attendanceMemo', 'dailyAttendanceJson', 'leaveCarryover', 'leaveManualAdjustment', 'leaveMemo', 'coopMembershipFeeDate', 'coopMembershipFee', 'abusePreventionPledgeDate', 'abusePreventionPledgeStatus', 'sexCrimeDisabilityCheckDate', 'sexCrimeDisabilityCheckStatus', 'healthCheckDate', 'healthCheckStatus', 'stampUrl'];
  const classificationCounts = entries.reduce(function(result, entry) {
    const bucket = classifyStaffRosterEntry_(entry);
    result[bucket] = (result[bucket] || 0) + 1;
    return result;
  }, {});
  return {
    year: normalizedYear,
    analyzedAt: new Date().toISOString(),
    sheets: [
      {
        name: staffInfo.sheetName,
        sourceType: 'staff',
        rowCount: staffInfo.rowCount,
        headerRowNumber: Number(staffInfo.headerRowNumber) || 1,
        headers: staffInfo.headers,
        headerIndexMap: staffInfo.headerIndexMap,
        recognizedFields: staffRecognized,
        missingRecommendedFields: recommendedFields.filter(function(fieldKey) {
          return staffRecognized.indexOf(fieldKey) === -1;
        }),
      },
      {
        name: nonStaffInfo.sheetName,
        sourceType: 'nonstaff',
        rowCount: nonStaffInfo.rowCount,
        headerRowNumber: Number(nonStaffInfo.headerRowNumber) || 1,
        headers: nonStaffInfo.headers,
        headerIndexMap: nonStaffInfo.headerIndexMap,
        recognizedFields: nonStaffRecognized,
        missingRecommendedFields: recommendedFields.filter(function(fieldKey) {
          return nonStaffRecognized.indexOf(fieldKey) === -1;
        }),
      }
    ],
    totalRosterCount: entries.length,
    classificationCounts: classificationCounts,
    sampleEntries: entries.slice(0, 10).map(function(entry) {
      return {
        name: entry.name,
        email: entry.email,
        position: entry.position,
        roleText: entry.roleText,
        joinDate: entry.joinDate,
        exitDate: entry.exitDate,
        group: entry.group,
        classification: entry.classification,
        category: entry.category,
        status: entry.status,
        attendanceStatus: entry.attendanceStatus,
        attendanceDays: entry.attendanceDays,
        absenceDays: entry.absenceDays,
        attendanceMemo: entry.attendanceMemo,
        dailyAttendanceJson: entry.dailyAttendanceJson,
        leaveCarryover: entry.leaveCarryover,
        leaveManualAdjustment: entry.leaveManualAdjustment,
        leaveMemo: entry.leaveMemo,
        coopMembershipFee: entry.coopMembershipFee,
        coopMembershipFeeDate: entry.coopMembershipFeeDate,
        criminalRecordCheckDate: entry.criminalRecordCheckDate,
        abusePreventionPledge: entry.abusePreventionPledge,
        abusePreventionPledgeDate: entry.abusePreventionPledgeDate,
        abusePreventionPledgeStatus: entry.abusePreventionPledgeStatus,
        sexCrimeDisabilityCheck: entry.sexCrimeDisabilityCheck,
        sexCrimeDisabilityCheckDate: entry.sexCrimeDisabilityCheckDate,
        sexCrimeDisabilityCheckStatus: entry.sexCrimeDisabilityCheckStatus,
        healthCheckDate: entry.healthCheckDate,
        healthCheckStatus: entry.healthCheckStatus,
        tuberculosisCheckDate: entry.tuberculosisCheckDate,
        stampUrl: entry.stampUrl,
        sourceType: entry.sourceType,
        bucket: classifyStaffRosterEntry_(entry),
      };
    }),
  };
}

function saveStaffRosterAnalysisIfNeeded_(selectedYear, payload) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (staffRosterAnalysisSavedMemo_[normalizedYear]) {
    return;
  }
  writeDataStoreJson_('staff_roster_analysis', normalizedYear, payload);
  staffRosterAnalysisSavedMemo_[normalizedYear] = true;
}

function normalizeStaffRosterCacheEntry_(entry, sourceType, sourceSheet) {
  const item = entry || {};
  const group = valueOrEmpty_(item.group || item.category).trim();
  const classification = valueOrEmpty_(item.classification).trim();
  const activityType = valueOrEmpty_(item.activityType || item.activity || item.role || item.position).trim();
  return {
    displayOrder: valueOrEmpty_(item.displayOrder).trim(),
    name: valueOrEmpty_(item.name).trim(),
    email: valueOrEmpty_(item.email).trim(),
    position: valueOrEmpty_(item.position).trim() || activityType,
    activityType: activityType,
    roleText: valueOrEmpty_(item.roleText || item.dutyRole || item.workRole || item.taskText || item.activityMemo).trim(),
    joinDate: normalizeRosterDateValue_(item.joinDate),
    exitDate: normalizeRosterDateValue_(item.exitDate),
    group: group,
    classification: classification,
    category: group || classification,
    status: valueOrEmpty_(item.status).trim(),
    attendanceStatus: valueOrEmpty_(item.attendanceStatus).trim(),
    attendanceDays: valueOrEmpty_(item.attendanceDays).trim(),
    absenceDays: valueOrEmpty_(item.absenceDays).trim(),
    attendanceMemo: valueOrEmpty_(item.attendanceMemo).trim(),
    dailyAttendanceJson: valueOrEmpty_(item.dailyAttendanceJson).trim(),
    leaveCarryover: valueOrEmpty_(item.leaveCarryover).trim(),
    leaveManualAdjustment: valueOrEmpty_(item.leaveManualAdjustment).trim(),
    leaveMemo: valueOrEmpty_(item.leaveMemo).trim(),
    coopMembershipFee: valueOrEmpty_(item.coopMembershipFee).trim(),
    coopMembershipFeeDate: normalizeRosterDateValue_(item.coopMembershipFeeDate) || valueOrEmpty_(item.coopMembershipFeeDate).trim(),
    criminalRecordCheckDate: normalizeRosterDateValue_(item.criminalRecordCheckDate) || valueOrEmpty_(item.criminalRecordCheckDate).trim(),
    abusePreventionPledge: valueOrEmpty_(item.abusePreventionPledge).trim(),
    abusePreventionPledgeDate: normalizeRosterDateValue_(item.abusePreventionPledgeDate) || valueOrEmpty_(item.abusePreventionPledgeDate).trim(),
    abusePreventionPledgeStatus: valueOrEmpty_(item.abusePreventionPledgeStatus).trim(),
    sexCrimeDisabilityCheck: valueOrEmpty_(item.sexCrimeDisabilityCheck).trim(),
    sexCrimeDisabilityCheckDate: normalizeRosterDateValue_(item.sexCrimeDisabilityCheckDate) || valueOrEmpty_(item.sexCrimeDisabilityCheckDate).trim(),
    sexCrimeDisabilityCheckStatus: valueOrEmpty_(item.sexCrimeDisabilityCheckStatus).trim(),
    healthCheckDate: normalizeRosterDateValue_(item.healthCheckDate) || valueOrEmpty_(item.healthCheckDate).trim(),
    healthCheckStatus: valueOrEmpty_(item.healthCheckStatus).trim(),
    tuberculosisCheckDate: normalizeRosterDateValue_(item.tuberculosisCheckDate) || valueOrEmpty_(item.tuberculosisCheckDate).trim(),
    stampUrl: valueOrEmpty_(item.stampUrl).trim(),
    sourceType: valueOrEmpty_(item.sourceType).trim().toLowerCase() || sourceType,
    sourceSheet: valueOrEmpty_(item.sourceSheet).trim() || sourceSheet,
    sourceRowNumber: Number(item.sourceRowNumber) || 0,
  };
}

function normalizeStaffRosterSheetInfoFromCache_(sheetInfo, fallbackSheetName, fallbackSourceType) {
  const info = sheetInfo || {};
  const sheetName = valueOrEmpty_(info.sheetName || fallbackSheetName);
  const sourceType = valueOrEmpty_(fallbackSourceType);
  const headers = Array.isArray(info.headers) ? info.headers.slice() : [];
  const headerIndexMap = info.headerIndexMap || buildStaffRosterHeaderIndexMap_(headers);
  const entries = Array.isArray(info.entries) ? info.entries.map(function(entry) {
    return normalizeStaffRosterCacheEntry_(entry, sourceType, sheetName);
  }).filter(function(entry) {
    return !!entry.name;
  }) : [];

  return {
    sheetName: sheetName,
    headers: headers,
    entries: entries,
    headerIndexMap: headerIndexMap,
    rowCount: Math.max(Number(info.rowCount) || entries.length, entries.length),
    headerRowNumber: Number(info.headerRowNumber) || 1,
  };
}

function buildStaffRosterBundleFromSheetInfos_(selectedYear, staffInfo, nonStaffInfo) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedStaffInfo = normalizeStaffRosterSheetInfoFromCache_(staffInfo, '종사자', 'staff');
  const normalizedNonStaffInfo = normalizeStaffRosterSheetInfoFromCache_(nonStaffInfo, '비 종사자', 'nonstaff');
  const payload = buildStaffRosterAnalysisPayload_(normalizedYear, normalizedStaffInfo, normalizedNonStaffInfo);
  return {
    year: normalizedYear,
    staffInfo: normalizedStaffInfo,
    nonStaffInfo: normalizedNonStaffInfo,
    entries: normalizedStaffInfo.entries.concat(normalizedNonStaffInfo.entries),
    analysis: payload,
  };
}

function ensureStaffRosterDbSheet_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet || SpreadsheetApp.getActiveSpreadsheet(), STAFF_ROSTER_DB_SHEET_NAME);
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([STAFF_ROSTER_DB_HEADERS.slice()]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), STAFF_ROSTER_DB_HEADERS.length)).getDisplayValues()[0];
    const needsHeader = STAFF_ROSTER_DB_HEADERS.some(function(header, index) {
      return valueOrEmpty_(currentHeaders[index]).trim() !== header;
    });
    if (needsHeader) {
      sheet.getRange(1, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([STAFF_ROSTER_DB_HEADERS.slice()]);
    }
  }
  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function buildStaffRosterDbKey_(selectedYear, sourceType, sourceRowNumber, name) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedType = String(sourceType || '').trim().toLowerCase() === 'nonstaff' ? 'nonstaff' : 'staff';
  const rowNumber = Number(sourceRowNumber) || 0;
  if (rowNumber) {
    return [STAFF_ROSTER_DB_VERSION, normalizedYear, normalizedType, rowNumber].join(':');
  }
  return [STAFF_ROSTER_DB_VERSION, normalizedYear, normalizedType, valueOrEmpty_(name).replace(/\s+/g, '').trim()].join(':');
}

function getStaffRosterDbRows_(selectedYear, includeDeleted) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(STAFF_ROSTER_DB_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, STAFF_ROSTER_DB_HEADERS.length).getDisplayValues();
  return values.map(function(row, index) {
    return {
      rowNumber: index + 2,
      dbKey: valueOrEmpty_(row[0]).trim(),
      year: normalizeAttendanceYear_(row[1]),
      sourceType: normalizeStaffRosterDashboardType_(row[2]),
      sourceSheet: valueOrEmpty_(row[3]).trim(),
      sourceRowNumber: Number(row[4]) || 0,
      name: valueOrEmpty_(row[5]).trim(),
      updatedAt: valueOrEmpty_(row[6]).trim(),
      deletedAt: valueOrEmpty_(row[7]).trim(),
      json: valueOrEmpty_(row[8]).trim(),
    };
  }).filter(function(item) {
    return item.year === normalizedYear && item.json && (includeDeleted || !item.deletedAt);
  });
}

function getStaffRosterEntryMergeKey_(entry) {
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType);
  const sourceRowNumber = Number(entry && entry.sourceRowNumber) || 0;
  if (sourceRowNumber) {
    return sourceType + ':' + sourceRowNumber;
  }
  return sourceType + ':name:' + valueOrEmpty_(entry && entry.name).replace(/\s+/g, '').trim();
}

function buildStaffRosterBundleFromDbRows_(selectedYear, dbRows) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const staffEntries = [];
  const nonStaffEntries = [];

  (dbRows || []).forEach(function(item) {
    try {
      const parsed = JSON.parse(item.json);
      const sourceType = normalizeStaffRosterDashboardType_(parsed.sourceType || item.sourceType);
      const sourceSheet = valueOrEmpty_(parsed.sourceSheet || item.sourceSheet).trim() || getStaffRosterSheetNameBySourceType_(sourceType);
      const entry = normalizeStaffRosterCacheEntry_(Object.assign({}, parsed, {
        sourceType: sourceType,
        sourceSheet: sourceSheet,
        sourceRowNumber: Number(parsed.sourceRowNumber) || item.sourceRowNumber,
      }), sourceType, sourceSheet);
      if (!entry.name) {
        return;
      }
      if (sourceType === 'nonstaff') {
        nonStaffEntries.push(entry);
      } else {
        staffEntries.push(entry);
      }
    } catch (error) {
      Logger.log('buildStaffRosterBundleFromDbRows_ parse failed: %s', error.message);
    }
  });

  return buildStaffRosterBundleFromSheetInfos_(normalizedYear, {
    sheetName: '종사자',
    headers: [],
    entries: staffEntries,
    headerIndexMap: {},
    rowCount: staffEntries.length,
    headerRowNumber: 1,
  }, {
    sheetName: '비 종사자',
    headers: [],
    entries: nonStaffEntries,
    headerIndexMap: {},
    rowCount: nonStaffEntries.length,
    headerRowNumber: 1,
  });
}

function readStaffRosterDbBundleByYear_(selectedYear) {
  const rows = getStaffRosterDbRows_(selectedYear);
  if (!rows.length) {
    return null;
  }
  return buildStaffRosterBundleFromDbRows_(selectedYear, rows);
}

function mergeStaffRosterBundleWithDbRows_(selectedYear, baseBundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dbRows = getStaffRosterDbRows_(normalizedYear, true);
  if (!dbRows.length) {
    return baseBundle;
  }
  const mergedByKey = {};
  const entries = []
    .concat(baseBundle && baseBundle.staffInfo && baseBundle.staffInfo.entries || [])
    .concat(baseBundle && baseBundle.nonStaffInfo && baseBundle.nonStaffInfo.entries || []);

  entries.forEach(function(entry) {
    const key = getStaffRosterEntryMergeKey_(entry);
    if (key) {
      mergedByKey[key] = entry;
    }
  });

  dbRows.forEach(function(row) {
    const rowKey = row.sourceRowNumber
      ? normalizeStaffRosterDashboardType_(row.sourceType) + ':' + row.sourceRowNumber
      : normalizeStaffRosterDashboardType_(row.sourceType) + ':name:' + valueOrEmpty_(row.name).replace(/\s+/g, '').trim();
    if (!rowKey) {
      return;
    }
    if (row.deletedAt) {
      delete mergedByKey[rowKey];
      return;
    }
    try {
      const parsed = JSON.parse(row.json);
      const sourceType = normalizeStaffRosterDashboardType_(parsed.sourceType || row.sourceType);
      const sourceSheet = valueOrEmpty_(parsed.sourceSheet || row.sourceSheet).trim() || getStaffRosterSheetNameBySourceType_(sourceType);
      mergedByKey[rowKey] = normalizeStaffRosterCacheEntry_(Object.assign({}, parsed, {
        sourceType: sourceType,
        sourceSheet: sourceSheet,
        sourceRowNumber: Number(parsed.sourceRowNumber) || row.sourceRowNumber,
      }), sourceType, sourceSheet);
    } catch (error) {
      Logger.log('mergeStaffRosterBundleWithDbRows_ parse failed: %s', error.message);
    }
  });

  const mergedEntries = Object.keys(mergedByKey).map(function(key) {
    return mergedByKey[key];
  }).filter(function(entry) {
    return entry && entry.name;
  });
  return buildStaffRosterBundleFromSheetInfos_(normalizedYear, {
    sheetName: '종사자',
    headers: baseBundle && baseBundle.staffInfo && baseBundle.staffInfo.headers || [],
    entries: mergedEntries.filter(function(entry) { return normalizeStaffRosterDashboardType_(entry.sourceType) === 'staff'; }),
    headerIndexMap: baseBundle && baseBundle.staffInfo && baseBundle.staffInfo.headerIndexMap || {},
    rowCount: 0,
    headerRowNumber: baseBundle && baseBundle.staffInfo && baseBundle.staffInfo.headerRowNumber || 1,
  }, {
    sheetName: '비 종사자',
    headers: baseBundle && baseBundle.nonStaffInfo && baseBundle.nonStaffInfo.headers || [],
    entries: mergedEntries.filter(function(entry) { return normalizeStaffRosterDashboardType_(entry.sourceType) === 'nonstaff'; }),
    headerIndexMap: baseBundle && baseBundle.nonStaffInfo && baseBundle.nonStaffInfo.headerIndexMap || {},
    rowCount: 0,
    headerRowNumber: baseBundle && baseBundle.nonStaffInfo && baseBundle.nonStaffInfo.headerRowNumber || 1,
  });
}

function toStaffRosterDbRowValues_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType);
  const sourceSheet = valueOrEmpty_(entry && entry.sourceSheet).trim() || getStaffRosterSheetNameBySourceType_(sourceType);
  const sourceRowNumber = Number(entry && entry.sourceRowNumber) || 0;
  const name = valueOrEmpty_(entry && entry.name).trim();
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const dbKey = buildStaffRosterDbKey_(normalizedYear, sourceType, sourceRowNumber, name);
  const normalizedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
    sourceType: sourceType,
    sourceSheet: sourceSheet,
    sourceRowNumber: sourceRowNumber,
  }), sourceType, sourceSheet);
  return [
    dbKey,
    String(normalizedYear),
    sourceType,
    sourceSheet,
    sourceRowNumber,
    name,
    updatedAt,
    '',
    JSON.stringify(normalizedEntry),
  ];
}

function writeStaffRosterDbBundle_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureStaffRosterDbSheet_(spreadsheet);
  const lastRow = sheet.getLastRow();
  const retainedRows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, STAFF_ROSTER_DB_HEADERS.length).getDisplayValues().filter(function(row) {
      return normalizeAttendanceYear_(row[1]) !== normalizedYear;
    })
    : [];
  const entries = []
    .concat(bundle && bundle.staffInfo && bundle.staffInfo.entries || [])
    .concat(bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
  const rowValues = entries.map(function(entry) {
    return toStaffRosterDbRowValues_(normalizedYear, entry);
  });
  const nextRows = retainedRows.concat(rowValues);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, STAFF_ROSTER_DB_HEADERS.length).clearContent();
  }
  if (nextRows.length) {
    sheet.getRange(2, 1, nextRows.length, STAFF_ROSTER_DB_HEADERS.length).setValues(nextRows);
  }
  const previousDataRowCount = Math.max(lastRow - 1, 0);
  if (previousDataRowCount > nextRows.length) {
    sheet.getRange(nextRows.length + 2, 1, previousDataRowCount - nextRows.length, STAFF_ROSTER_DB_HEADERS.length).clearContent();
  }
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
}

function findStaffRosterDbRowNumber_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType);
  const sourceRowNumber = Number(entry && entry.sourceRowNumber) || 0;
  const name = valueOrEmpty_(entry && entry.name).trim();
  const dbKey = buildStaffRosterDbKey_(normalizedYear, sourceType, sourceRowNumber, name);
  const rows = getStaffRosterDbRows_(normalizedYear);
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].dbKey === dbKey) {
      return rows[index].rowNumber;
    }
  }
  return 0;
}

function upsertStaffRosterDbEntry_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sheet = ensureStaffRosterDbSheet_(SpreadsheetApp.getActiveSpreadsheet());
  const rowValues = toStaffRosterDbRowValues_(normalizedYear, entry);
  const rowNumber = findStaffRosterDbRowNumber_(normalizedYear, entry);
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([rowValues]);
  }
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
}

function upsertStaffRosterDbEntries_(selectedYear, entries) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const list = (entries || []).filter(function(entry) {
    return entry && valueOrEmpty_(entry.name).trim();
  });
  if (!list.length) {
    return { updatedCount: 0, appendedCount: 0 };
  }

  const sheet = ensureStaffRosterDbSheet_(SpreadsheetApp.getActiveSpreadsheet());
  const lastRow = sheet.getLastRow();
  const existingByKey = {};
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, STAFF_ROSTER_DB_HEADERS.length).getDisplayValues();
    values.forEach(function(row, index) {
      if (normalizeAttendanceYear_(row[1]) === normalizedYear) {
        existingByKey[valueOrEmpty_(row[0]).trim()] = index + 2;
      }
    });
  }

  let updatedCount = 0;
  const appendRows = [];
  list.forEach(function(entry) {
    const rowValues = toStaffRosterDbRowValues_(normalizedYear, entry);
    const dbKey = valueOrEmpty_(rowValues[0]).trim();
    const rowNumber = existingByKey[dbKey] || 0;
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([rowValues]);
      updatedCount += 1;
    } else {
      appendRows.push(rowValues);
    }
  });
  if (appendRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appendRows.length, STAFF_ROSTER_DB_HEADERS.length).setValues(appendRows);
  }
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
  return {
    updatedCount: updatedCount,
    appendedCount: appendRows.length,
  };
}

function markStaffRosterDbEntryDeleted_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STAFF_ROSTER_DB_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }
  const rowNumber = findStaffRosterDbRowNumber_(normalizedYear, entry);
  if (!rowNumber) {
    return;
  }
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  sheet.getRange(rowNumber, 7, 1, 2).setValues([[updatedAt, updatedAt]]);
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
}

function readStaffRosterMasterByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const stored = readDataStoreJson_(STAFF_ROSTER_MASTER_STORE_TYPE, normalizedYear);
  if (!stored || stored.stale || stored.storeVersion !== STAFF_ROSTER_MASTER_VERSION) {
    return readStaffRosterDbBundleByYear_(normalizedYear);
  }
  const bundle = buildStaffRosterBundleFromSheetInfos_(normalizedYear, stored.staffInfo, stored.nonStaffInfo);
  return mergeStaffRosterBundleWithDbRows_(normalizedYear, bundle);
}

function saveStaffRosterMasterByYear_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedBundle = buildStaffRosterBundleFromSheetInfos_(
    normalizedYear,
    bundle && bundle.staffInfo,
    bundle && bundle.nonStaffInfo
  );
  writeStaffRosterDbBundle_(normalizedYear, normalizedBundle);
  writeDataStoreJson_(STAFF_ROSTER_MASTER_STORE_TYPE, normalizedYear, {
    storeVersion: STAFF_ROSTER_MASTER_VERSION,
    year: normalizedYear,
    savedAt: new Date().toISOString(),
    staffInfo: normalizedBundle.staffInfo,
    nonStaffInfo: normalizedBundle.nonStaffInfo,
  });
  return normalizedBundle;
}

function readStaffRosterCacheByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const cached = readDataStoreJson_('staff_roster_cache', normalizedYear);
  if (!cached || cached.stale) {
    return null;
  }
  if (cached.cacheVersion !== STAFF_ROSTER_CACHE_VERSION) {
    return null;
  }
  return mergeStaffRosterBundleWithDbRows_(
    normalizedYear,
    buildStaffRosterBundleFromSheetInfos_(normalizedYear, cached.staffInfo, cached.nonStaffInfo)
  );
}

function saveStaffRosterCacheByYear_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  writeDataStoreJson_('staff_roster_cache', normalizedYear, {
    cacheVersion: STAFF_ROSTER_CACHE_VERSION,
    year: normalizedYear,
    savedAt: new Date().toISOString(),
    staffInfo: bundle && bundle.staffInfo ? bundle.staffInfo : {},
    nonStaffInfo: bundle && bundle.nonStaffInfo ? bundle.nonStaffInfo : {},
  });
}

function markStaffRosterCacheStale_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  writeDataStoreJson_('staff_roster_cache', normalizedYear, {
    year: normalizedYear,
    stale: true,
    updatedAt: new Date().toISOString(),
  });
}

function buildStaffRosterBundleFreshByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = spreadsheet.getSheetByName('종사자');
  const nonStaffSheet = spreadsheet.getSheetByName('비 종사자');
  const staffInfo = readStaffRosterEntriesFromSheet_(staffSheet, 'staff');
  const nonStaffInfo = readStaffRosterEntriesFromSheet_(nonStaffSheet, 'nonstaff');
  const sheetBundle = buildStaffRosterBundleFromSheetInfos_(normalizedYear, staffInfo, nonStaffInfo);
  const bundle = mergeStaffRosterBundleWithDbRows_(normalizedYear, sheetBundle);
  const existingMaster = readStaffRosterMasterByYear_(normalizedYear);
  if (!bundle.entries.length && existingMaster) {
    staffRosterBundleMemo_[normalizedYear] = existingMaster;
    saveStaffRosterAnalysisIfNeeded_(normalizedYear, existingMaster.analysis);
    saveStaffRosterCacheByYear_(normalizedYear, existingMaster);
    return existingMaster;
  }
  staffRosterBundleMemo_[normalizedYear] = bundle;
  saveStaffRosterAnalysisIfNeeded_(normalizedYear, bundle.analysis);
  saveStaffRosterCacheByYear_(normalizedYear, bundle);
  if (bundle.entries.length || !existingMaster) {
    saveStaffRosterMasterByYear_(normalizedYear, bundle);
  }
  return bundle;
}

function getStaffRosterBundleByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (staffRosterBundleMemo_[normalizedYear]) {
    return staffRosterBundleMemo_[normalizedYear];
  }
  const masterBundle = readStaffRosterMasterByYear_(normalizedYear);
  if (masterBundle) {
    staffRosterBundleMemo_[normalizedYear] = masterBundle;
    saveStaffRosterAnalysisIfNeeded_(normalizedYear, masterBundle.analysis);
    saveStaffRosterCacheByYear_(normalizedYear, masterBundle);
    return masterBundle;
  }
  const cachedBundle = readStaffRosterCacheByYear_(normalizedYear);
  if (cachedBundle) {
    saveStaffRosterMasterByYear_(normalizedYear, cachedBundle);
    staffRosterBundleMemo_[normalizedYear] = cachedBundle;
    saveStaffRosterAnalysisIfNeeded_(normalizedYear, cachedBundle.analysis);
    return cachedBundle;
  }
  return buildStaffRosterBundleFreshByYear_(normalizedYear);
}

function inspectStaffRosterByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  saveStaffRosterAnalysisIfNeeded_(normalizedYear, bundle.analysis);
  return bundle.analysis;
}

function inspectStaffRosterByYearJson(selectedYear) {
  return JSON.stringify(inspectStaffRosterByYear_(selectedYear), null, 2);
}

function getStaffRosterEntriesByYear_(selectedYear) {
  return getStaffRosterBundleByYear_(selectedYear).entries.slice();
}

function isStaffRosterEntryInServiceOnDate_(entry, dateKey) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const name = valueOrEmpty_(entry && entry.name).trim();
  const joinDate = normalizeRosterDateValue_(entry && entry.joinDate);
  const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
  const status = valueOrEmpty_(entry && entry.status).trim();
  const category = valueOrEmpty_(entry && (entry.category || entry.group)).trim();
  if (!name || !normalizedDate) return false;
  if (joinDate && joinDate > normalizedDate) return false;
  if (exitDate && exitDate <= normalizedDate) return false;
  if (!exitDate && status && /퇴|종료|휴직/.test(status)) return false;
  if (!exitDate && category && /퇴|종료/.test(category)) return false;
  return true;
}

function getStaffRosterDailyAttendanceItemForDate_(entry, dateKey) {
  const normalizedDate = normalizeDateKey_(dateKey);
  if (!normalizedDate) return null;
  const selectedYear = normalizeAttendanceYear_(normalizedDate.slice(0, 4)) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dailyAttendanceMap = getStaffRosterDailyAttendanceMapForEntry_(entry, selectedYear);
  return dailyAttendanceMap[normalizedDate] || null;
}

function isStaffRosterDailyAttendanceActiveOnDate_(entry, dateKey) {
  const normalizedDate = normalizeDateKey_(dateKey);
  if (!normalizedDate) return false;
  const selectedYear = normalizeAttendanceYear_(normalizedDate.slice(0, 4)) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dailyAttendanceMap = getStaffRosterDailyAttendanceMapForEntry_(entry, selectedYear);
  const item = dailyAttendanceMap[normalizedDate] || null;
  if (!item) {
    return !Object.keys(dailyAttendanceMap || {}).length;
  }
  const normalized = normalizeStaffRosterDailyAttendanceItem_(item);
  const status = valueOrEmpty_(normalized.status).trim();
  const memo = valueOrEmpty_(normalized.memo).trim();
  if (/연가|연차|월차|휴가|반차|병가|결석|퇴|종료|휴직/.test(status + ' ' + memo)) {
    return false;
  }
  return /^(출석|활동|재직|위촉|근무|참여)$/.test(status) || !status;
}

function getStaffRosterPersonUniqueKey_(entry) {
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType) || 'staff';
  const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
  return nameKey ? sourceType + ':' + nameKey : '';
}

function dedupeStaffRosterEntriesByPerson_(entries) {
  const seen = {};
  return (entries || []).filter(function(entry) {
    const key = getStaffRosterPersonUniqueKey_(entry);
    if (!key) return false;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function getActiveStaffRosterEntriesForDate_(dateKey, selectedYear, leaveNames) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedLeaveLookup = buildStaffLeaveNameLookup_(leaveNames);
  const cacheKey = normalizedYear + ':' + normalizedDate + ':' + Object.keys(normalizedLeaveLookup).sort().join('|');
  if (staffRosterCompositionMemo_[cacheKey] && staffRosterCompositionMemo_[cacheKey].activeStaff) {
    return staffRosterCompositionMemo_[cacheKey].activeStaff.slice();
  }
  const activeStaff = dedupeStaffRosterEntriesByPerson_(getStaffRosterEntriesByYear_(normalizedYear).filter(function(item) {
    const name = valueOrEmpty_(item && item.name).trim();
    if (!isStaffRosterEntryInServiceOnDate_(item, normalizedDate)) return false;
    if (normalizedLeaveLookup[normalizeAnnualLeavePersonKey_(name)]) return false;
    if (!isStaffRosterDailyAttendanceActiveOnDate_(item, normalizedDate)) return false;
    return true;
    }));
  staffRosterCompositionMemo_[cacheKey] = {
    activeStaff: activeStaff.slice(),
  };
  return activeStaff;
}

function getActiveRosterEntriesFromListForDate_(entries, dateKey, leaveNames) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedLeaveLookup = buildStaffLeaveNameLookup_(leaveNames);
  return dedupeStaffRosterEntriesByPerson_((entries || []).filter(function(item) {
    const name = valueOrEmpty_(item && item.name).trim();
    if (!isStaffRosterEntryInServiceOnDate_(item, normalizedDate)) return false;
    if (normalizedLeaveLookup[normalizeAnnualLeavePersonKey_(name)]) return false;
    if (!isStaffRosterDailyAttendanceActiveOnDate_(item, normalizedDate)) return false;
    return true;
  }));
}

function classifyNonStaffCompositionBucket_(entry) {
  const classification = valueOrEmpty_(entry && entry.classification).replace(/\s+/g, '').trim();
  if (classification === '공익') {
    return 'public';
  }
  if (classification === '교사') {
    return 'teacher';
  }
  return 'other';
}

function getNonStaffOtherActivityLabel_(entry) {
  const explicitActivityType = valueOrEmpty_(
    entry && (entry.activityType || entry.activity || entry.role || entry.position)
  ).trim();
  const rawText = [
    explicitActivityType,
    entry && entry.position,
    entry && entry.group,
    entry && entry.category,
    entry && entry.classification,
  ].map(function(value) {
    return valueOrEmpty_(value).trim();
  }).filter(Boolean).join(' ');
  const compactText = rawText.replace(/\s+/g, '').trim();
  if (/시니어/.test(compactText)) return '시니어';
  if (/강사/.test(compactText)) return '강사';
  if (/멘토/.test(compactText)) return '멘토';
  if (/자원봉사/.test(compactText)) return '자원봉사자';
  if (/근로|장학/.test(compactText)) return '근로장학생';
  if (/공익|교사/.test(compactText)) return '기타';
  return explicitActivityType ||
    valueOrEmpty_(entry && entry.position).trim() ||
    valueOrEmpty_(entry && entry.group).trim() ||
    valueOrEmpty_(entry && entry.category).trim() ||
    '기타';
}

function buildNonStaffOtherGroupsFromEntries_(entries) {
  const order = ['시니어', '강사', '멘토', '자원봉사자', '근로장학생', '기타'];
  const groupMap = {};
  const dynamicOrder = [];
  (entries || []).forEach(function(entry) {
    if (classifyNonStaffCompositionBucket_(entry) !== 'other') {
      return;
    }
    const name = valueOrEmpty_(entry && entry.name).trim();
    if (!name) {
      return;
    }
    const label = getNonStaffOtherActivityLabel_(entry);
    if (!groupMap[label]) {
      groupMap[label] = {
        label: label,
        names: [],
        nameLookup: {},
      };
      dynamicOrder.push(label);
    }
    const nameKey = normalizeStaffRosterPersonNameKey_(name);
    if (nameKey && groupMap[label].nameLookup[nameKey]) {
      return;
    }
    if (nameKey) {
      groupMap[label].nameLookup[nameKey] = true;
    }
    groupMap[label].names.push(name);
  });

  return uniqueStrings_(order.concat(dynamicOrder)).map(function(label) {
    const group = groupMap[label];
    if (!group || !group.names.length) {
      return null;
    }
    return {
      label: group.label,
      names: group.names.slice(),
      count: group.names.length,
    };
  }).filter(Boolean);
}

function getNonStaffVisitorGroupLabel_(entry) {
  const bucket = classifyNonStaffCompositionBucket_(entry);
  if (bucket === 'teacher') {
    return '교사';
  }
  if (bucket === 'public') {
    return '공익';
  }
  return getNonStaffOtherActivityLabel_(entry);
}

function buildNonStaffVisitorGroupsFromEntries_(entries) {
  const order = ['교사', '공익', '시니어', '강사', '멘토', '자원봉사자', '근로장학생', '기타'];
  const groupMap = {};
  const dynamicOrder = [];
  (entries || []).forEach(function(entry) {
    const name = valueOrEmpty_(entry && entry.name).trim();
    if (!name) {
      return;
    }
    const label = getNonStaffVisitorGroupLabel_(entry);
    if (!groupMap[label]) {
      groupMap[label] = {
        label: label,
        names: [],
        nameLookup: {},
      };
      dynamicOrder.push(label);
    }
    const nameKey = normalizeStaffRosterPersonNameKey_(name);
    if (nameKey && groupMap[label].nameLookup[nameKey]) {
      return;
    }
    if (nameKey) {
      groupMap[label].nameLookup[nameKey] = true;
    }
    groupMap[label].names.push(name);
  });

  return uniqueStrings_(order.concat(dynamicOrder)).map(function(label) {
    const group = groupMap[label];
    if (!group || !group.names.length) {
      return null;
    }
    return {
      label: group.label,
      names: group.names.slice(),
      count: group.names.length,
    };
  }).filter(Boolean);
}

function formatNonStaffOtherGroupsText_(groups) {
  return (groups || []).map(function(group) {
    const label = valueOrEmpty_(group && group.label).trim() || '기타';
    const names = (group && group.names || []).map(function(name) {
      return valueOrEmpty_(name).trim();
    }).filter(Boolean);
    if (!names.length) {
      return '';
    }
    return label + ' : ' + names.join(', ') + ' / ' + names.length + '명';
  }).filter(Boolean).join(' · ');
}

function buildNonStaffOtherGroupTextForDate_(dateKey, selectedYear) {
  const composition = resolveStaffCompositionForDate_(dateKey, selectedYear);
  return formatNonStaffOtherGroupsText_(composition.otherGroups || []);
}

function buildNonStaffVisitorTextForDate_(dateKey, selectedYear) {
  const composition = resolveStaffCompositionForDate_(dateKey, selectedYear);
  return formatNonStaffOtherGroupsText_(composition.visitorGroups || []);
}

function buildNonStaffRoleWorkLinesFromEntries_(entries) {
  const seen = {};
  return (entries || []).map(function(entry) {
    const roleText = valueOrEmpty_(entry && entry.roleText).trim();
    const name = valueOrEmpty_(entry && entry.name).trim();
    if (!roleText || !name) {
      return '';
    }
    const activityType = valueOrEmpty_(entry && (entry.activityType || entry.position)).trim()
      || getNonStaffVisitorGroupLabel_(entry);
    const key = [normalizeStaffRosterPersonNameKey_(name), activityType, roleText].join('|');
    if (seen[key]) {
      return '';
    }
    seen[key] = true;
    return '* [' + activityType + ' ' + name + '] ' + roleText;
  }).filter(Boolean);
}

function buildNonStaffRoleWorkTextForDate_(dateKey, selectedYear) {
  const composition = resolveStaffCompositionForDate_(dateKey, selectedYear);
  return (composition.roleWorkLines || []).join('\n');
}

function buildStaffLeaveNameLookup_(leaveNames) {
  const lookup = {};
  (leaveNames || []).forEach(function(name) {
    const key = normalizeAnnualLeavePersonKey_(name);
    if (key) lookup[key] = true;
  });
  return lookup;
}

function isManagerFallbackExcludedStaff_(item) {
  const position = valueOrEmpty_(item && item.position).trim();
  const group = valueOrEmpty_(item && (item.group || item.category)).trim();
  const classification = valueOrEmpty_(item && item.classification).trim();
  const joinedText = [position, group, classification].join(' ');
  if (/팀장|센터장|시설장/.test(joinedText)) {
    return true;
  }
  return getManagerExcludedPositions_().indexOf(position) !== -1;
}

function classifyStaffRosterEntry_(item) {
  const sourceType = valueOrEmpty_(item && item.sourceType).trim().toLowerCase();
  const position = valueOrEmpty_(item && item.position).trim();
  const group = valueOrEmpty_(item && (item.group || item.category)).trim();
  const classification = valueOrEmpty_(item && item.classification).trim();
  const status = valueOrEmpty_(item && item.status).trim();
  const joinedText = [position, group, classification, status].join(' ');
  const classificationText = valueOrEmpty_(classification || group).replace(/\s+/g, '').trim();

  if (getManagerExcludedPositions_().indexOf(position) !== -1) {
    return 'excluded';
  }
  if (sourceType === 'nonstaff') {
    if (classificationText === '공익') {
      return 'public';
    }
    if (classificationText === '교사') {
      return 'teacher';
    }
    return 'other';
  }
  if (classificationText === '공익') {
    return 'public';
  }
  if (classificationText === '기타') {
    return 'other';
  }
  if (classificationText === '교사' || /강사/.test(classificationText)) {
    return 'teacher';
  }
  if (/공익/.test(joinedText)) {
    return 'public';
  }
  if (/교사|강사|복지사|생활복지사|사회복지사|팀장|생활지도사|돌봄교사/.test(joinedText)) {
    return 'teacher';
  }
  return 'other';
}

function resolveStaffCompositionForDate_(dateKey, selectedYear) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    (normalizedDate ? normalizeAttendanceYear_(normalizedDate.slice(0, 4)) : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  const compositionCacheKey = normalizedYear + ':' + normalizedDate + ':dashboard-source-split-v4';
  if (staffRosterCompositionMemo_[compositionCacheKey] && staffRosterCompositionMemo_[compositionCacheKey].result) {
    return Object.assign({}, staffRosterCompositionMemo_[compositionCacheKey].result, {
      availableStaff: (staffRosterCompositionMemo_[compositionCacheKey].result.availableStaff || []).slice(),
      availableManagerCandidates: (staffRosterCompositionMemo_[compositionCacheKey].result.availableManagerCandidates || []).slice(),
      leaveNames: (staffRosterCompositionMemo_[compositionCacheKey].result.leaveNames || []).slice(),
      otherGroups: (staffRosterCompositionMemo_[compositionCacheKey].result.otherGroups || []).map(function(group) {
        return Object.assign({}, group, { names: (group.names || []).slice() });
      }),
      visitorGroups: (staffRosterCompositionMemo_[compositionCacheKey].result.visitorGroups || []).map(function(group) {
        return Object.assign({}, group, { names: (group.names || []).slice() });
      }),
      roleWorkLines: (staffRosterCompositionMemo_[compositionCacheKey].result.roleWorkLines || []).slice(),
    });
  }
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  const leaveNames = (annualLeaveInfo && annualLeaveInfo.leaveNamesByDate && annualLeaveInfo.leaveNamesByDate[normalizedDate]) || [];
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const activeWorkerEntries = getActiveRosterEntriesFromListForDate_(
    bundle && bundle.staffInfo && bundle.staffInfo.entries || [],
    normalizedDate,
    leaveNames
  );
  const activeNonStaffEntries = getActiveRosterEntriesFromListForDate_(
    bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries || [],
    normalizedDate,
    leaveNames
  );

  const result = activeNonStaffEntries.reduce(function(result, item) {
    const bucket = classifyNonStaffCompositionBucket_(item);
    if (bucket === 'public') {
      result.public += 1;
    } else if (bucket === 'teacher') {
      result.teacher += 1;
    } else {
      result.other += 1;
    }
    return result;
  }, {
    worker: 0,
    teacher: 0,
    public: 0,
    other: 0,
    availableStaff: activeWorkerEntries.slice(),
    availableManagerCandidates: [],
    leaveNames: leaveNames.slice(),
    otherGroups: [],
    visitorGroups: [],
    roleWorkLines: [],
  });
  result.worker = activeWorkerEntries.length;
  result.otherGroups = buildNonStaffOtherGroupsFromEntries_(activeNonStaffEntries);
  result.visitorGroups = buildNonStaffVisitorGroupsFromEntries_(activeNonStaffEntries);
  result.roleWorkLines = buildNonStaffRoleWorkLinesFromEntries_(activeNonStaffEntries);
  result.availableManagerCandidates = result.availableStaff.filter(function(item) {
    return !isManagerFallbackExcludedStaff_(item);
  });
  staffRosterCompositionMemo_[compositionCacheKey] = {
    result: {
      worker: result.worker,
      teacher: result.teacher,
      public: result.public,
      other: result.other,
      availableStaff: result.availableStaff.slice(),
      availableManagerCandidates: result.availableManagerCandidates.slice(),
      leaveNames: result.leaveNames.slice(),
      otherGroups: (result.otherGroups || []).map(function(group) {
        return Object.assign({}, group, { names: (group.names || []).slice() });
      }),
      visitorGroups: (result.visitorGroups || []).map(function(group) {
        return Object.assign({}, group, { names: (group.names || []).slice() });
      }),
      roleWorkLines: (result.roleWorkLines || []).slice(),
    },
  };
  return result;
}

function getDefaultManagerNameByDate_(dateKey) {
  const normalizedDate = normalizeDateKey_(dateKey);
  if (!normalizedDate) return '';
  const managerRules = getAutomationSettings_().managerRules || DEFAULT_LOG_MANAGER_RULES;
  for (let index = 0; index < managerRules.length; index += 1) {
    const rule = managerRules[index];
    const startDate = rule.start || rule.startDate;
    const endDate = rule.end || rule.endDate;
    const managerName = rule.name || rule.managerName;
    if (normalizedDate >= startDate && normalizedDate <= endDate) return managerName;
  }
  return '';
}

function resolveManagerNameForDate_(dateKey, selectedYear) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    (normalizedDate ? normalizeAttendanceYear_(normalizedDate.slice(0, 4)) : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  const defaultManager = getDefaultManagerNameByDate_(normalizedDate);
  if (!defaultManager) return defaultManager;
  const composition = resolveStaffCompositionForDate_(normalizedDate, normalizedYear);
  const leaveNames = composition.leaveNames || [];
  const leaveLookup = buildStaffLeaveNameLookup_(leaveNames);
  if (!leaveLookup[normalizeAnnualLeavePersonKey_(defaultManager)]) return defaultManager;
  const fallbackStaff = (composition.availableManagerCandidates || composition.availableStaff || []).find(function(item) {
    const name = valueOrEmpty_(item && item.name).trim();
    if (!name || name === defaultManager) return false;
    if (leaveLookup[normalizeAnnualLeavePersonKey_(name)]) return false;
    return !isManagerFallbackExcludedStaff_(item);
  });
  if (fallbackStaff) return fallbackStaff.name;

  const fallbackTeamLead = (composition.availableStaff || []).find(function(item) {
    const name = valueOrEmpty_(item && item.name).trim();
    const position = valueOrEmpty_(item && item.position).trim();
    if (!name || name === defaultManager) return false;
    if (leaveLookup[normalizeAnnualLeavePersonKey_(name)]) return false;
    return /팀장/.test(position);
  });
  if (fallbackTeamLead) return fallbackTeamLead.name;

  return defaultManager;
}

function resolveStaffWorkerCountForDate_(dateKey, selectedYear) {
  return resolveStaffCompositionForDate_(dateKey, selectedYear).worker;
}

function buildStaffCompositionDiagnostics_(dateKey, selectedYear) {
  const normalizedDate = normalizeDateKey_(dateKey);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    (normalizedDate ? normalizeAttendanceYear_(normalizedDate.slice(0, 4)) : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  if (!normalizedDate) {
    throw new Error('확인할 날짜를 yyyy-mm-dd 형식으로 입력해주세요.');
  }

  staffRosterCompositionMemo_ = {};
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  const leaveNames = (annualLeaveInfo.leaveNamesByDate || {})[normalizedDate] || [];
  const leaveLookup = buildStaffLeaveNameLookup_(leaveNames);
  const seenEligibleKeys = {};
  const rowGroups = {};
  const rows = [];
  getStaffRosterEntriesByYear_(normalizedYear)
    .filter(function(entry) {
      return normalizeStaffRosterDashboardType_(entry && entry.sourceType) === 'staff';
    })
    .forEach(function(entry) {
      const name = valueOrEmpty_(entry && entry.name).trim();
      const personKey = getStaffRosterPersonUniqueKey_(entry);
      const attendanceItem = getStaffRosterDailyAttendanceItemForDate_(entry, normalizedDate);
      const normalizedAttendance = attendanceItem ? normalizeStaffRosterDailyAttendanceItem_(attendanceItem) : null;
      const inService = isStaffRosterEntryInServiceOnDate_(entry, normalizedDate);
      const annualLeave = !!leaveLookup[normalizeAnnualLeavePersonKey_(name)];
      const dailyActive = isStaffRosterDailyAttendanceActiveOnDate_(entry, normalizedDate);
      const managerFallbackExcluded = isManagerFallbackExcludedStaff_(entry);
      const eligible = !!name && inService && !annualLeave && dailyActive;
      const duplicateEligible = eligible && personKey && seenEligibleKeys[personKey];
      const counted = eligible && !duplicateEligible;
      let reason = managerFallbackExcluded ? '집계 포함(담당자 대체 후보 제외)' : '집계 포함';
      if (!name) reason = '이름 없음';
      else if (!inService) reason = '입사일/퇴사일 기준 제외';
      else if (annualLeave) reason = '연가 기준 제외';
      else if (!dailyActive) reason = '출결 상태 기준 제외';
      else if (duplicateEligible) reason = '중복 제외';
      if (eligible && personKey) {
        seenEligibleKeys[personKey] = true;
      }

      const row = {
        name: name,
        position: valueOrEmpty_(entry && entry.position).trim(),
        status: valueOrEmpty_(entry && entry.status).trim(),
        joinDate: normalizeRosterDateValue_(entry && entry.joinDate),
        exitDate: normalizeRosterDateValue_(entry && entry.exitDate),
        attendanceStatus: normalizedAttendance ? valueOrEmpty_(normalizedAttendance.status).trim() : '(출결없음)',
        attendanceMemo: normalizedAttendance ? valueOrEmpty_(normalizedAttendance.memo).trim() : '',
        counted: counted,
        reason: reason,
        duplicateCount: 1,
      };
      const groupKey = personKey || ('row:' + rows.length);
      if (rowGroups[groupKey]) {
        rowGroups[groupKey].duplicateCount += 1;
        if (!rowGroups[groupKey].counted && row.counted) {
          Object.keys(row).forEach(function(key) {
            rowGroups[groupKey][key] = row[key];
          });
          rowGroups[groupKey].duplicateCount += 1;
        }
        return;
      }
      rowGroups[groupKey] = row;
      rows.push(row);
    });
  const composition = resolveStaffCompositionForDate_(normalizedDate, normalizedYear);
  return {
    date: normalizedDate,
    year: normalizedYear,
    worker: composition.worker,
    leaveNames: leaveNames,
    included: rows.filter(function(row) { return row.counted; }),
    excluded: rows.filter(function(row) { return !row.counted; }),
  };
}

function showStaffCompositionDiagnostics() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '종사자 집계 진단',
    '종사자 숫자가 이상한 날짜를 입력하세요. 예: 2024-01-02',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const dateKey = normalizeDateKey_(response.getResponseText());
  const result = buildStaffCompositionDiagnostics_(dateKey, dateKey ? dateKey.slice(0, 4) : '');
  const includedNames = result.included.map(function(row) {
    const duplicateText = Number(row.duplicateCount) > 1 ? ', 중복 ' + row.duplicateCount + '행' : '';
    return row.name + (row.attendanceStatus ? '(' + row.attendanceStatus + duplicateText + ')' : '');
  });
  const excludedLines = result.excluded.slice(0, 20).map(function(row) {
    const duplicateText = Number(row.duplicateCount) > 1 ? ' / 중복 ' + row.duplicateCount + '행' : '';
    return '- ' + row.name + ': ' + row.reason + duplicateText +
      ' / 입사 ' + (row.joinDate || '-') +
      ' / 퇴사 ' + (row.exitDate || '-') +
      ' / 출결 ' + (row.attendanceStatus || '-');
  });
  const message = [
    result.date + ' 기준 종사자 집계: ' + result.worker + '명',
    '',
    '[포함]',
    includedNames.length ? includedNames.join(', ') : '(없음)',
    '',
    '[연가 제외]',
    result.leaveNames.length ? result.leaveNames.join(', ') : '(없음)',
    '',
    '[제외 사유]',
    excludedLines.length ? excludedLines.join('\n') : '(없음)',
  ].join('\n');
  ui.alert('종사자 집계 진단', message, ui.ButtonSet.OK);
}

function inspectStaffCompositionKeyDatesJson() {
  const dates = [
    '2024-01-02',
    '2025-01-06',
    '2026-01-06',
  ];
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: dates.map(function(dateKey) {
      return buildStaffCompositionDiagnostics_(dateKey, dateKey.slice(0, 4));
    }),
  }, null, 2);
}

function inspectDecember2024StaffCompositionJson() {
  const dates = [
    '2024-12-27',
    '2024-12-30',
    '2024-12-31',
  ];
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    results: dates.map(function(dateKey) {
      return buildStaffCompositionDiagnostics_(dateKey, 2024);
    }),
  }, null, 2);
}
