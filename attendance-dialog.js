const ATTENDANCE_DIALOG_PAYLOAD_VERSION = 'summary-v3';
const ATTENDANCE_DIALOG_DEFAULT_YEAR = 2026;

function showAttendanceStatsDialog() {
  try {
    const htmlOutput = HtmlService.createHtmlOutputFromFile('attendance-dialog-view')
      .setWidth(2400)
      .setHeight(1500);

    SpreadsheetApp.getUi().showModalDialog(htmlOutput, '출석 통계 보기');
  } catch (error) {
    SpreadsheetApp.getUi().alert('출석 통계 보기를 열지 못했습니다.\n' + error.message);
  }
}

function getAttendanceStatsDialogShellData() {
  return buildAttendanceStatsDialogShellData_();
}

function listAttendanceDialogYears_(spreadsheet) {
  const yearLookup = {};

  listAttendanceSourceSheets_(spreadsheet).forEach(function(item) {
    const year = normalizeAttendanceYear_(item && item.year);
    if (year) {
      yearLookup[year] = true;
    }
  });

  spreadsheet.getSheets().forEach(function(sheet) {
    const sheetName = sheet.getName();
    const match = String(sheetName || '').match(/^(\d{2})년\s+(출석부|일지데이터)$/);
    if (!match) {
      return;
    }
    const year = 2000 + Number(match[1]);
    if (year) {
      yearLookup[year] = true;
    }
  });

  return Object.keys(yearLookup).map(function(year) {
    return {
      year: Number(year),
      label: String(year) + '년',
    };
  }).sort(function(a, b) {
    return b.year - a.year;
  });
}

function readAttendanceStatsForDialog_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);

  return readAttendanceStatsRowsByYear_(normalizedYear).map(function(item) {
    const staffComposition = resolveStaffCompositionForDate_(item.date, normalizedYear);
    const attendanceCurrent = buildAttendanceCurrentValue_(
      item.present,
      item.official,
      item.alternative,
      item.absent,
      item.other,
      item.attendanceCurrent
    );
    return {
      date: item.date,
      malePreschool: item.malePreschool,
      maleElementary: item.maleElementary,
      maleMiddle: item.maleMiddle,
      maleHigh: item.maleHigh,
      maleOther: item.maleOther,
      femalePreschool: item.femalePreschool,
      femaleElementary: item.femaleElementary,
      femaleMiddle: item.femaleMiddle,
      femaleHigh: item.femaleHigh,
      femaleOther: item.femaleOther,
      present: item.present,
      official: item.official,
      alternative: item.alternative,
      absent: item.absent,
      other: item.other,
      attendanceCapacity: 35,
      attendanceCurrent: attendanceCurrent,
      childChanges: item.childChanges,
      unmatched: item.unmatched,
      manager: resolveManagerNameForDate_(item.date, normalizedYear),
      staffWorker: toNumber_(staffComposition.worker),
      staffTeacher: toNumber_(staffComposition.teacher),
      staffPublic: toNumber_(staffComposition.public),
      staffOther: toNumber_(staffComposition.other),
    };
  });
}

function buildAttendanceCurrentValue_(present, official, alternative, absent, other, fallbackCurrent) {
  const normalizedPresent = Number(present) || 0;
  const normalizedAlternative = Number(alternative) || 0;
  const normalizedAbsent = Number(absent) || 0;
  const normalizedOther = Number(other) || 0;
  const summedCurrent =
    normalizedPresent +
    normalizedAlternative +
    normalizedAbsent +
    normalizedOther;
  if (summedCurrent > 0) {
    return summedCurrent;
  }
  return Number(fallbackCurrent) || 0;
}

function readAttendanceStatsForDialogFromLogData_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    return [];
  }

  const fieldMap = getFieldMap_(logSheet);
  const lastRow = logSheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return [];
  }

  const columnCount = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const rows = getSheetValuesWithPadding_(
    logSheet,
    LOG_PRINT_CONFIG.DATA_START_ROW,
    lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1,
    columnCount
  );

  return rows.map(function(row) {
    const dateKey = normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]);
    if (!dateKey) {
      return null;
    }

    const present = toNumber_(row[fieldMap.ATTENDANCE_PRESENT]);
    const official = toNumber_(row[fieldMap.ATTENDANCE_OFFICIAL]);
    const alternative = toNumber_(row[fieldMap.ATTENDANCE_ALTERNATIVE]);
    const absent = toNumber_(row[fieldMap.ATTENDANCE_ABSENT]);
    const other = toNumber_(row[fieldMap.ATTENDANCE_OTHER]);
    const fallbackCurrent = toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_CURRENT'));
    const staffComposition = resolveStaffCompositionForDate_(dateKey, normalizedYear);

    return {
      date: dateKey,
      malePreschool: toNumber_(row[fieldMap[CHILD_MALE_FIELDS[0]]]),
      maleElementary: toNumber_(row[fieldMap[CHILD_MALE_FIELDS[1]]]),
      maleMiddle: toNumber_(row[fieldMap[CHILD_MALE_FIELDS[2]]]),
      maleHigh: toNumber_(row[fieldMap[CHILD_MALE_FIELDS[3]]]),
      maleOther: toNumber_(row[fieldMap[CHILD_MALE_FIELDS[4]]]),
      femalePreschool: toNumber_(row[fieldMap[CHILD_FEMALE_FIELDS[0]]]),
      femaleElementary: toNumber_(row[fieldMap[CHILD_FEMALE_FIELDS[1]]]),
      femaleMiddle: toNumber_(row[fieldMap[CHILD_FEMALE_FIELDS[2]]]),
      femaleHigh: toNumber_(row[fieldMap[CHILD_FEMALE_FIELDS[3]]]),
      femaleOther: toNumber_(row[fieldMap[CHILD_FEMALE_FIELDS[4]]]),
      present: present,
      official: official,
      alternative: alternative,
      absent: absent,
      other: other,
      attendanceCapacity: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_CAPACITY')),
      attendanceCurrent: buildAttendanceCurrentValue_(present, official, alternative, absent, other, fallbackCurrent),
      childChanges: valueOrEmpty_(row[fieldMap.CHILD_CHANGES]).trim(),
      unmatched: 0,
      manager: resolveManagerNameForDate_(dateKey, normalizedYear),
      staffWorker: toNumber_(staffComposition.worker),
      staffTeacher: toNumber_(staffComposition.teacher),
      staffPublic: toNumber_(staffComposition.public),
      staffOther: toNumber_(staffComposition.other),
    };
  }).filter(function(item) {
    return !!item;
  });
}

function buildAttendanceStatsDialogShellData_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const availableYears = listAttendanceDialogYears_(spreadsheet);
  const activeYear = resolveWorkingYear_(spreadsheet);
  const hasDefaultYear = availableYears.some(function(item) {
    return item.year === ATTENDANCE_DIALOG_DEFAULT_YEAR;
  });
  const fallbackYear = hasDefaultYear
    ? ATTENDANCE_DIALOG_DEFAULT_YEAR
    : (availableYears.length ? availableYears[0].year : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  const selectedYear = activeYear === ATTENDANCE_DIALOG_DEFAULT_YEAR ? activeYear : fallbackYear;
  return {
    availableYears: availableYears,
    selectedYear: selectedYear,
    buildVersion: LOG_PRINT_CONFIG.BUILD_VERSION,
    selectedSheetName: '',
    statsSheetName: getAttendanceStatsSheetNameByYear_(selectedYear),
    unmatchedSheetName: getAttendanceUnmatchedSheetNameByYear_(selectedYear),
    sourceErrorMessage: '',
    rows: [],
    detailsByDate: {},
    summary: {},
    availableMonths: [],
    warnings: [],
    annualLeaveSourceUrl: getAnnualLeaveSourceUrl_(),
    statusMessage: String(selectedYear || '') + '년 통계를 불러오는 중입니다...',
  };
}

function hasRowDisplayValueByField_(row, fieldMap, fieldKey) {
  const columnIndex = fieldMap[fieldKey];
  if (columnIndex === null || columnIndex === undefined) {
    return false;
  }
  return hasDisplayValue_(row[columnIndex]);
}

function buildLogApplyStatusByDate_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const cacheKey = getAttendanceLogStatusCacheKey_(normalizedYear);
  const cached = getAttendanceCacheJson_(cacheKey);
  if (cached && cached.byDate) {
    return cached;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;

  if (!logSheet) {
    const result = {
      exists: false,
      errorMessage: logDataResult.errorMessage || '',
      byDate: {},
    };
    putAttendanceCacheJson_(cacheKey, result, 120);
    return result;
  }

  const fieldMap = getFieldMap_(logSheet);
  const lastRow = logSheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    const result = {
      exists: true,
      errorMessage: '',
      byDate: {},
    };
    putAttendanceCacheJson_(cacheKey, result, 120);
    return result;
  }

  const requiredColumns = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const values = getSheetValuesWithPadding_(
    logSheet,
    LOG_PRINT_CONFIG.DATA_START_ROW,
    lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1,
    requiredColumns
  );
  const byDate = {};
  const programAppliedLookup = {};
  readProgramAppliedDates_(normalizedYear).forEach(function(dateKey) {
    programAppliedLookup[dateKey] = true;
  });

  values.forEach(function(row) {
    const dateKey = normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]);
    if (!dateKey) {
      return;
    }

    const childFields = CHILD_MALE_FIELDS.concat(CHILD_FEMALE_FIELDS);
    const childCountsEntered = childFields.some(function(fieldKey) {
      return hasRowDisplayValueByField_(row, fieldMap, fieldKey);
    });
    const attendanceFieldsEntered = [
      'ATTENDANCE_CAPACITY',
      'ATTENDANCE_CURRENT',
      'ATTENDANCE_PRESENT',
      'ATTENDANCE_OFFICIAL',
      'ATTENDANCE_ALTERNATIVE',
      'ATTENDANCE_ABSENT',
      'ATTENDANCE_OTHER',
    ].some(function(fieldKey) {
      return hasRowDisplayValueByField_(row, fieldMap, fieldKey);
    });
    const staffChanges = valueOrEmpty_(row[fieldMap.STAFF_CHANGES]).trim();
    const workEntries = getWorksValues_(row, fieldMap).map(function(value) {
      return valueOrEmpty_(value).trim();
    });
    const operatingHours = valueOrEmpty_(row[fieldMap.OPERATING_HOURS]).trim();
    const mealBreakfast = toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'MEAL_BREAKFAST'));
    const mealLunch = toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'MEAL_LUNCH'));
    const mealDinner = toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'MEAL_DINNER'));

    byDate[dateKey] = {
      exists: true,
      attendanceApplied: childCountsEntered || attendanceFieldsEntered,
      annualLeaveApplied: staffChanges.indexOf('연차 :') !== -1,
      educationApplied: staffChanges.indexOf('집합 :') !== -1 ||
        staffChanges.indexOf('온라인 :') !== -1 ||
        workEntries.some(function(value) {
        return value.indexOf('온라인 :') !== -1;
      }),
      programApplied: !!programAppliedLookup[dateKey],
      operatingApplied: !!operatingHours,
      operatingHours: operatingHours,
      mealBreakfast: mealBreakfast,
      mealLunch: mealLunch,
      mealDinner: mealDinner,
      manager: valueOrEmpty_(row[fieldMap.MANAGER]).trim(),
      staffChanges: staffChanges,
      staffWorker: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_WORKER')),
      staffTeacher: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_TEACHER')),
      staffPublic: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_PUBLIC')),
      staffOther: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_OTHER')),
    };
  });

  const result = {
    exists: true,
    errorMessage: '',
    byDate: byDate,
  };
  putAttendanceCacheJson_(cacheKey, result, 120);
  return result;
}

function evaluateAttendanceDialogRowStatus_(row, logStatus) {
  const currentStatus = logStatus || {};
  const requiredTypes = [];
  const missingTypes = [];
  const reviewReasons = [];

  if (row.hasAttendance) {
    requiredTypes.push('아동출결');
    if (!currentStatus.attendanceApplied) {
      missingTypes.push('아동출결');
    }
  }
  if (row.hasAnnualLeave) {
    requiredTypes.push('종사자');
    if (!currentStatus.annualLeaveApplied) {
      missingTypes.push('종사자');
    }
  }
  if (row.hasEducation) {
    requiredTypes.push('종사자 교육');
    if (!currentStatus.educationApplied) {
      missingTypes.push('종사자 교육');
    }
  }
  if (row.hasProgram) {
    requiredTypes.push('프로그램');
    if (!currentStatus.programApplied) {
      missingTypes.push('프로그램');
    }
  }

  if ((Number(row.unmatched) || 0) > 0) {
    reviewReasons.push('미매칭 ' + row.unmatched + '명');
  }
  if (missingTypes.length > 0 && missingTypes.length < requiredTypes.length) {
    reviewReasons.push('일부 미반영: ' + missingTypes.join(', '));
  }

  let applyStatus = '미반영';
  if (!requiredTypes.length) {
    applyStatus = currentStatus.exists ? '반영완료' : '미반영';
  } else if (missingTypes.length === 0) {
    applyStatus = '반영완료';
  } else if (reviewReasons.length > 0) {
    applyStatus = '확인필요';
  } else {
    applyStatus = '미반영';
  }

  if ((Number(row.unmatched) || 0) > 0) {
    applyStatus = '확인필요';
  }

  let reviewReason = reviewReasons.join(' / ');
  if (!reviewReason && missingTypes.length === requiredTypes.length && missingTypes.length) {
    reviewReason = '미반영: ' + missingTypes.join(', ');
  }

  return {
    applyStatus: applyStatus,
    reviewReason: reviewReason,
  };
}

function createAttendanceDialogSupplementalRow_(dateKey) {
  return {
    date: dateKey,
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
    attendanceCapacity: 0,
    attendanceCurrent: 0,
    operatingHours: '',
    mealBreakfast: 0,
    mealLunch: 0,
    mealDinner: 0,
    childChanges: '',
    unmatched: 0,
    hasAttendance: false,
    programTexts: [],
  };
}

function mergeAttendanceDialogSupplementalData_(rowByDate, annualLeaveTextByDate, annualLeaveCountByDate, staffEducationSummaryByDate, staffEducationCountByDate, programByDate) {
  Object.keys(annualLeaveTextByDate || {}).forEach(function(dateKey) {
    if (!rowByDate[dateKey]) {
      rowByDate[dateKey] = createAttendanceDialogSupplementalRow_(dateKey);
    }
    rowByDate[dateKey].annualLeaveText = annualLeaveTextByDate[dateKey] || '';
    rowByDate[dateKey].annualLeaveCount = Number(annualLeaveCountByDate[dateKey]) || 0;
  });

  Object.keys(staffEducationSummaryByDate || {}).forEach(function(dateKey) {
    if (!rowByDate[dateKey]) {
      rowByDate[dateKey] = createAttendanceDialogSupplementalRow_(dateKey);
    }
    rowByDate[dateKey].educationOnlineText = valueOrEmpty_(staffEducationSummaryByDate[dateKey].onlineText).trim();
    rowByDate[dateKey].educationOfflineText = valueOrEmpty_(staffEducationSummaryByDate[dateKey].offlineText).trim();
    rowByDate[dateKey].educationCount = Number(staffEducationCountByDate[dateKey]) || 0;
  });

  Object.keys(programByDate || {}).forEach(function(dateKey) {
    if (!rowByDate[dateKey]) {
      rowByDate[dateKey] = createAttendanceDialogSupplementalRow_(dateKey);
    }
    rowByDate[dateKey].programTexts = (programByDate[dateKey] || []).slice();
    rowByDate[dateKey].programCount = rowByDate[dateKey].programTexts.length;
  });
}

function buildAttendanceDialogWarnings_(statsRows, annualLeaveStored, staffEducationStored, logApplyStatus, selectedYear) {
  const warnings = [];
  if (!statsRows.length) {
    warnings.push({
      scope: 'attendance',
      message: '출석 집계가 없습니다. 연도 새로고침을 눌러 다시 불러와주세요.',
    });
  }

  const annualLeaveSourceUrl = getAnnualLeaveSourceUrl_();
  if (!annualLeaveSourceUrl) {
    warnings.push({
      scope: 'annual',
      message: '연차 링크가 비어 있습니다. 링크를 저장한 뒤 다시 확인해주세요.',
    });
  } else if (!hasStoredDataRows_(annualLeaveStored)) {
    warnings.push({
      scope: 'annual',
      message: '연차 데이터가 없습니다. 링크를 확인한 뒤 연도 새로고침을 눌러주세요.',
    });
  }

  const educationWarningMessage = buildStaffEducationDialogWarningMessage_(
    staffEducationStored && staffEducationStored.statusInfo,
    selectedYear
  );
  if (educationWarningMessage) {
    warnings.push({
      scope: 'education',
      message: educationWarningMessage,
    });
  }
  if (!logApplyStatus.exists && logApplyStatus.errorMessage) {
    warnings.push({
      scope: '',
      message: logApplyStatus.errorMessage,
    });
  }

  return {
    warnings: warnings,
    annualLeaveSourceUrl: annualLeaveSourceUrl,
  };
}

function appendAttendanceDialogFallbackWarning_(warnings, fallbackSource) {
  if (fallbackSource !== 'logData') {
    return warnings || [];
  }

  const nextWarnings = Array.isArray(warnings) ? warnings.slice() : [];
  nextWarnings.unshift({
    scope: 'attendance',
    message: '출석 집계가 없어 일지데이터 기준으로 조회 중입니다.',
  });
  return nextWarnings;
}

function buildStaffEducationWarningYearLabel_(statusInfo, selectedYear) {
  const year = normalizeAttendanceYear_(
    (statusInfo && statusInfo.year) || selectedYear || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR
  ) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return String(year).slice(-2) + '년';
}

function buildStaffEducationDialogWarningMessage_(statusInfo, selectedYear) {
  const yearLabel = buildStaffEducationWarningYearLabel_(statusInfo, selectedYear);

  if (!statusInfo) {
    return yearLabel + ' 교육 데이터가 비어 있습니다. 연도 새로고침 후 다시 확인해주세요.';
  }

  if (statusInfo.state === 'ready' || statusInfo.state === 'synced') {
    return '';
  }

  if (statusInfo.state === 'source_missing') {
    return yearLabel + ' 교육 저장 데이터가 없고 원본 교육 시트를 찾지 못했습니다. 원본 시트를 확인한 뒤 연도 새로고침을 눌러주세요.';
  }

  if (statusInfo.state === 'source_empty') {
    return yearLabel + ' 교육 저장 데이터와 원본 교육 시트가 비어 있어 교육 반영은 건너뜁니다.';
  }

  if (statusInfo.state === 'year_empty') {
    return yearLabel + ' 교육 저장 데이터가 비어 원본 교육 시트를 다시 읽었지만 해당 연도 데이터가 없어 교육 반영은 건너뜁니다.';
  }

  if (statusInfo.state === 'sync_failed') {
    return yearLabel + ' 교육 저장 데이터가 비어 원본 교육 시트를 다시 읽지 못했습니다. 연도 새로고침 후 다시 확인해주세요.' +
      (statusInfo.autoSyncErrorMessage ? ' (' + statusInfo.autoSyncErrorMessage + ')' : '');
  }

  return yearLabel + ' 교육 데이터가 비어 있습니다. 연도 새로고침 후 다시 확인해주세요.';
}

function buildAttendanceDialogRows_(statsRows, annualLeaveTextByDate, annualLeaveCountByDate, staffEducationSummaryByDate, staffEducationCountByDate, programByDate, logApplyStatus) {
  const rowByDate = {};

  (statsRows || []).forEach(function(row) {
    rowByDate[row.date] = Object.assign({
      annualLeaveCount: 0,
      educationCount: 0,
      annualLeaveText: '',
      educationOnlineText: '',
      educationOfflineText: '',
      programTexts: [],
      programCount: 0,
      hasAttendance: true,
    }, row);
  });

  mergeAttendanceDialogSupplementalData_(
    rowByDate,
    annualLeaveTextByDate,
    annualLeaveCountByDate,
    staffEducationSummaryByDate,
    staffEducationCountByDate,
    programByDate
  );

  return Object.keys(rowByDate).sort().map(function(dateKey) {
    const row = rowByDate[dateKey];
    const currentStatus = (logApplyStatus && logApplyStatus.byDate && logApplyStatus.byDate[dateKey]) || {};
    const resolvedYear = normalizeAttendanceYear_(dateKey.slice(0, 4)) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
    const staffComposition = resolveStaffCompositionForDate_(dateKey, resolvedYear);
    row.logExists = !!currentStatus.exists;
    row.hasAnnualLeave = !!row.annualLeaveText;
    row.hasEducation = !!row.educationOnlineText || !!row.educationOfflineText;
    row.hasProgram = !!(row.programTexts && row.programTexts.length);
    row.programLinked = !!currentStatus.programApplied;
    row.operatingHours = valueOrEmpty_(row.operatingHours || currentStatus.operatingHours || '').trim();
    row.manager = valueOrEmpty_(row.manager || resolveManagerNameForDate_(dateKey, resolvedYear) || currentStatus.manager || '').trim();
    row.staffChanges = valueOrEmpty_(currentStatus.staffChanges || '').trim();
    row.staffAttendanceText = row.staffChanges.split(/\r?\n/).map(function(line) {
      return valueOrEmpty_(line).trim();
    }).filter(function(line) {
      return /^출근\s*:/.test(line);
    })[0] || '';
    row.staffWorker = toNumber_(staffComposition.worker);
    row.staffTeacher = toNumber_(staffComposition.teacher);
    row.staffPublic = toNumber_(staffComposition.public);
    row.staffOther = toNumber_(staffComposition.other);
    row.mealBreakfast = Number(row.mealBreakfast || currentStatus.mealBreakfast || 0);
    row.mealLunch = Number(row.mealLunch || currentStatus.mealLunch || 0);
    row.mealDinner = Number(row.mealDinner || currentStatus.mealDinner || 0);
    row.programPreview = row.hasProgram
      ? valueOrEmpty_(((row.programTexts[0] && row.programTexts[0].title) || row.programTexts[0] || '')).trim()
      : '';
    row.monthKey = dateKey.slice(0, 7);
    const statusInfo = evaluateAttendanceDialogRowStatus_(row, currentStatus);
    row.applyStatus = statusInfo.applyStatus;
    row.reviewReason = statusInfo.reviewReason;
    if (row.hasProgram && row.programPreview) {
      row.reviewReason = row.reviewReason
        ? (row.reviewReason + ' / 프로그램: ' + row.programPreview)
        : ('프로그램: ' + row.programPreview);
    }
    return row;
  });
}

function buildAttendanceDialogSummary_(rows) {
  return (rows || []).reduce(function(result, row) {
    result.dateCount += 1;
    result.present += Number(row.present) || 0;
    result.official += Number(row.official) || 0;
    result.alternative += Number(row.alternative) || 0;
    result.absent += Number(row.absent) || 0;
    result.other += Number(row.other) || 0;
    result.unmatched += Number(row.unmatched) || 0;
    result.annualLeaveDays += row.hasAnnualLeave ? 1 : 0;
    result.educationDays += row.hasEducation ? 1 : 0;
    result.programDays += row.hasProgram ? 1 : 0;
    result.male +=
      (Number(row.malePreschool) || 0) +
      (Number(row.maleElementary) || 0) +
      (Number(row.maleMiddle) || 0) +
      (Number(row.maleHigh) || 0) +
      (Number(row.maleOther) || 0);
    result.female +=
      (Number(row.femalePreschool) || 0) +
      (Number(row.femaleElementary) || 0) +
      (Number(row.femaleMiddle) || 0) +
      (Number(row.femaleHigh) || 0) +
      (Number(row.femaleOther) || 0);
    return result;
  }, {
    dateCount: 0,
    present: 0,
    official: 0,
    alternative: 0,
    absent: 0,
    other: 0,
    unmatched: 0,
    male: 0,
    female: 0,
    annualLeaveDays: 0,
    educationDays: 0,
    programDays: 0,
  });
}

function buildAttendanceDialogDetailsByDate_(rows) {
  const detailsByDate = {};
  (rows || []).forEach(function(row) {
    const dateKey = valueOrEmpty_(row && row.date).trim();
    if (!dateKey) {
      return;
    }
    detailsByDate[dateKey] = {
      annualLeaveText: valueOrEmpty_(row.annualLeaveText).trim(),
      educationOnlineText: valueOrEmpty_(row.educationOnlineText).trim(),
      educationOfflineText: valueOrEmpty_(row.educationOfflineText).trim(),
      programTexts: (row.programTexts || []).map(function(item) {
        if (item && typeof item === 'object') {
          return {
            title: valueOrEmpty_(item.title).trim(),
            participants: valueOrEmpty_(item.participants).trim(),
            rawText: valueOrEmpty_(item.rawText).trim(),
          };
        }
        return {
          title: valueOrEmpty_(item).trim(),
          participants: '',
          rawText: valueOrEmpty_(item).trim(),
        };
      }).filter(function(item) {
        return item.title || item.participants || item.rawText;
      }),
    };
  });
  return detailsByDate;
}

function filterAttendanceDialogRowsByHiddenDates_(rows, hiddenDates) {
  const hiddenLookup = {};
  uniqueStrings_((hiddenDates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).forEach(function(dateKey) {
    hiddenLookup[dateKey] = true;
  });
  return (rows || []).filter(function(row) {
    const dateKey = valueOrEmpty_(row && row.date).trim();
    return !!dateKey && !hiddenLookup[dateKey];
  });
}

function isUsableAttendanceDialogCachedData_(data) {
  return !!(
    data &&
    !data.stale &&
    data.payloadVersion === ATTENDANCE_DIALOG_PAYLOAD_VERSION &&
    Array.isArray(data.rows) &&
    data.rows.length > 0 &&
    data.rows.every(function(row) {
      return row && row.monthKey && row.applyStatus;
    })
  );
}

function withAttendanceDialogRuntimeFields_(data, availableYears, normalizedYear, cacheSource) {
  const result = Object.assign({}, data || {});
  delete result.detailsByDate;
  result.rows = refreshAttendanceDialogRowsRuntimeFields_(result.rows || [], normalizedYear);
  result.summary = buildAttendanceDialogSummary_(result.rows);
  result.availableMonths = uniqueStrings_(result.rows.map(function(row) {
    return row.monthKey;
  }));

  return Object.assign(result, {
    availableYears: availableYears,
    selectedYear: normalizedYear,
    cacheSource: cacheSource || '',
    detailsByDate: {},
  });
}

function refreshAttendanceDialogRowsRuntimeFields_(rows, normalizedYear) {
  return (rows || []).map(function(row) {
    const nextRow = Object.assign({}, row || {});
    const dateKey = valueOrEmpty_(nextRow.date).trim();
    if (!dateKey) {
      return nextRow;
    }
    nextRow.attendanceCurrent = buildAttendanceCurrentValue_(
      nextRow.present,
      nextRow.official,
      nextRow.alternative,
      nextRow.absent,
      nextRow.other,
      nextRow.attendanceCurrent
    );
    nextRow.monthKey = nextRow.monthKey || dateKey.slice(0, 7);
    return nextRow;
  });
}

function hasMatchingAttendanceDialogRevision_(data, revisionInfo) {
  if (!data || !revisionInfo || typeof data.revision === 'undefined') {
    return false;
  }
  return Number(data.revision) === Number(revisionInfo.revision);
}

function createAttendanceDialogTiming_(normalizedYear) {
  const timings = [];
  const totalStartedAt = Date.now();
  let previousMark = totalStartedAt;

  return {
    mark: function(label) {
      const now = Date.now();
      timings.push(label + '=' + (now - previousMark) + 'ms');
      previousMark = now;
    },
    done: function(source) {
      Logger.log(
        'Attendance dialog load %s [%s] total=%sms | %s',
        normalizedYear,
        source || 'build',
        Date.now() - totalStartedAt,
        timings.join(' | ')
      );
    },
  };
}

function writeAttendanceDialogSnapshot_(normalizedYear, dialogData) {
  try {
    writeDataStoreJson_('attendance_dialog_snapshot', normalizedYear, Object.assign({}, dialogData, {
      stale: false,
      snapshotSavedAt: new Date().toISOString(),
    }));
  } catch (error) {
    Logger.log('writeAttendanceDialogSnapshot_ failed: %s', error.message);
  }
}

function buildAttendanceStatsDialogDataByYear(selectedYear) {
  const totalStartedAt = Date.now();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const availableYears = listAttendanceDialogYears_(spreadsheet);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    (availableYears.length ? availableYears[0].year : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  const timing = createAttendanceDialogTiming_(normalizedYear);
  timing.mark('years');
  const revisionInfo = getAttendanceDataRevisionInfo_(normalizedYear);
  const dialogCacheKey = getAttendanceDialogCacheKey_(normalizedYear);
  const cachedDialogData = getAttendanceCacheJson_(dialogCacheKey);

  if (isUsableAttendanceDialogCachedData_(cachedDialogData) &&
      hasMatchingAttendanceDialogRevision_(cachedDialogData, revisionInfo)) {
    timing.mark('scriptCache');
    timing.done('script-cache');
    return withAttendanceDialogRuntimeFields_(cachedDialogData, availableYears, normalizedYear, 'script-cache');
  }

  const storedSnapshot = readDataStoreJson_('attendance_dialog_snapshot', normalizedYear);
  if (isUsableAttendanceDialogCachedData_(storedSnapshot) &&
      hasMatchingAttendanceDialogRevision_(storedSnapshot, revisionInfo)) {
    const snapshotData = withAttendanceDialogRuntimeFields_(storedSnapshot, availableYears, normalizedYear, 'data-store');
    putAttendanceCacheJson_(dialogCacheKey, snapshotData, 900);
    timing.mark('dataStoreSnapshot');
    timing.done('data-store');
    return snapshotData;
  }

  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;
  const statsSheetName = getAttendanceStatsSheetNameByYear_(normalizedYear);
  const unmatchedSheetName = getAttendanceUnmatchedSheetNameByYear_(normalizedYear);
  let statsRows = readAttendanceStatsForDialog_(normalizedYear);
  let fallbackSource = '';
  if (!statsRows.length) {
    statsRows = readAttendanceStatsForDialogFromLogData_(normalizedYear);
    if (statsRows.length) {
      fallbackSource = 'logData';
    }
  }
  timing.mark('attendanceStats');
  const annualLeaveBundle = readAnnualLeaveStoredBundle_(normalizedYear);
  const annualLeaveStored = annualLeaveBundle.stored;
  const annualLeaveTextByDate = annualLeaveBundle.textByDate;
  const annualLeaveCountByDate = annualLeaveBundle.countByDate;
  timing.mark('annualLeave');
  const staffEducationBundle = readStaffEducationStoredBundle_(normalizedYear);
  const staffEducationStored = staffEducationBundle.stored;
  const staffEducationSummaryByDate = staffEducationBundle.summaryByDate;
  const staffEducationCountByDate = staffEducationBundle.countByDate;
  timing.mark('staffEducation');
  const programByDate = readProgramJournalSummaryByDate_(normalizedYear);
  timing.mark('programJournal');
  const logApplyStatus = buildLogApplyStatusByDate_(normalizedYear);
  timing.mark('logStatus');
  const hiddenDates = readAttendanceHiddenDates_(normalizedYear);
  timing.mark('hiddenDates');
  const warningInfo = buildAttendanceDialogWarnings_(statsRows, annualLeaveStored, staffEducationStored, logApplyStatus, normalizedYear);
  warningInfo.warnings = appendAttendanceDialogFallbackWarning_(warningInfo.warnings, fallbackSource);
  statsRows = buildAttendanceDialogRows_(
    statsRows,
    annualLeaveTextByDate,
    annualLeaveCountByDate,
    staffEducationSummaryByDate,
    staffEducationCountByDate,
    programByDate,
    logApplyStatus
  );
  statsRows = filterAttendanceDialogRowsByHiddenDates_(statsRows, hiddenDates);
  const summary = buildAttendanceDialogSummary_(statsRows);
  timing.mark('mergeRows');

  const dialogData = Object.assign({
    availableYears: availableYears,
    selectedYear: normalizedYear,
    payloadVersion: ATTENDANCE_DIALOG_PAYLOAD_VERSION,
    buildVersion: LOG_PRINT_CONFIG.BUILD_VERSION,
    selectedSheetName: sourceSheet ? sourceSheet.getName() : '',
    statsSheetName: statsSheetName,
    unmatchedSheetName: unmatchedSheetName,
    sourceErrorMessage: sourceResult.errorMessage || '',
    rows: statsRows,
    detailsByDate: {},
    summary: summary,
    hiddenDates: hiddenDates,
    availableMonths: uniqueStrings_(statsRows.map(function(row) {
      return row.monthKey;
    })),
    warnings: warningInfo.warnings,
    annualLeaveSourceUrl: warningInfo.annualLeaveSourceUrl,
  }, revisionInfo);

  putAttendanceCacheJson_(dialogCacheKey, dialogData, 900);
  writeAttendanceDialogSnapshot_(normalizedYear, dialogData);
  timing.mark('cacheWrite');
  timing.done(fallbackSource ? 'build:' + fallbackSource : 'build');
  Logger.log('Attendance dialog rows %s count=%s total=%sms', normalizedYear, statsRows.length, Date.now() - totalStartedAt);

  return dialogData;
}

function refreshAttendanceStatsDialogDataByYear(selectedYear) {
  return withYearWriteLock_(selectedYear, '연도 새로고침', function(operationId) {
    const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
    clearAttendanceYearCache_(normalizedYear);
    const result = buildAttendanceStats(normalizedYear, true);
    bumpAttendanceDataRevision_(normalizedYear, '연도 새로고침', operationId);
    clearAttendanceYearCache_(normalizedYear);
    const data = buildAttendanceStatsDialogDataByYear(normalizedYear);

    if (result && result.sheetName) {
      data.statusMessage = result.sheetName + ' 기준으로 ' + result.dayCount + '일 통계를 다시 생성했습니다.';
    }

    return data;
  }, { bumpRevision: false });
}

function inspectAttendanceDialogCacheStatusJson(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const revisionInfo = getAttendanceDataRevisionInfo_(normalizedYear);
  const cacheKey = getAttendanceDialogCacheKey_(normalizedYear);
  const cache = getAttendanceCache_();
  const raw = cache.get(cacheKey);
  const metaText = cache.get(cacheKey + ':meta');
  let meta = null;
  let chunkLengths = [];
  if (metaText) {
    try {
      meta = JSON.parse(metaText);
      const keys = [];
      for (let index = 0; index < Number(meta && meta.chunkCount || 0); index += 1) {
        keys.push(cacheKey + ':chunk:' + index);
      }
      const chunks = cache.getAll(keys);
      chunkLengths = keys.map(function(key) {
        return String(chunks[key] || '').length;
      });
    } catch (error) {
      meta = { error: error.message };
    }
  }
  const cached = getAttendanceCacheJson_(cacheKey);
  const stored = readDataStoreJson_('attendance_dialog_snapshot', normalizedYear);
  return JSON.stringify({
    year: normalizedYear,
    revision: revisionInfo.revision,
    rawLength: raw ? raw.length : 0,
    meta: meta,
    chunkLengths: chunkLengths,
    cachedSourceUsable: isUsableAttendanceDialogCachedData_(cached),
    cachedRevision: cached && cached.revision,
    cachedRows: cached && cached.rows ? cached.rows.length : 0,
    storedUsable: isUsableAttendanceDialogCachedData_(stored),
    storedRevision: stored && stored.revision,
    storedRows: stored && stored.rows ? stored.rows.length : 0,
    storedStale: !!(stored && stored.stale),
  }, null, 2);
}

function inspectAttendanceDialogLoadTimingJson(selectedYear) {
  const marks = [];
  const startedAt = Date.now();
  let previous = startedAt;
  function mark(label) {
    const now = Date.now();
    marks.push({ label: label, ms: now - previous });
    previous = now;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const availableYears = listAttendanceDialogYears_(spreadsheet);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) ||
    (availableYears.length ? availableYears[0].year : LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR);
  mark('years');
  const revisionInfo = getAttendanceDataRevisionInfo_(normalizedYear);
  mark('revision');
  const cacheKey = getAttendanceDialogCacheKey_(normalizedYear);
  const cachedDialogData = getAttendanceCacheJson_(cacheKey);
  mark('scriptCacheRead');
  let source = '';
  let rows = [];
  if (isUsableAttendanceDialogCachedData_(cachedDialogData) &&
      hasMatchingAttendanceDialogRevision_(cachedDialogData, revisionInfo)) {
    source = 'script-cache';
    rows = withAttendanceDialogRuntimeFields_(cachedDialogData, availableYears, normalizedYear, source).rows || [];
    mark('runtimeFields');
  } else {
    const storedSnapshot = readDataStoreJson_('attendance_dialog_snapshot', normalizedYear);
    mark('dataStoreRead');
    if (isUsableAttendanceDialogCachedData_(storedSnapshot) &&
        hasMatchingAttendanceDialogRevision_(storedSnapshot, revisionInfo)) {
      source = 'data-store';
      rows = withAttendanceDialogRuntimeFields_(storedSnapshot, availableYears, normalizedYear, source).rows || [];
      mark('runtimeFields');
    } else {
      source = 'build-required';
    }
  }
  return JSON.stringify({
    year: normalizedYear,
    source: source,
    rowCount: rows.length,
    totalMs: Date.now() - startedAt,
    marks: marks,
  }, null, 2);
}
