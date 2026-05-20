function readStaffEducationStoredBundle_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceSheetName = getStaffEducationSourceSheetName_();
  let stored = readDataStoreJson_('staff_education', normalizedYear);
  const statusInfo = {
    year: normalizedYear,
    sourceSheetName: sourceSheetName,
    hadStoredRows: hasStoredDataRows_(stored),
    sourceSheetFound: false,
    sourceSheetHasRows: false,
    autoSyncAttempted: false,
    autoSyncSucceeded: false,
    autoSyncErrorMessage: '',
    rowCount: hasStoredDataRows_(stored) ? stored.rows.length : 0,
    state: hasStoredDataRows_(stored) ? 'ready' : 'missing',
  };

  if (!hasStoredDataRows_(stored)) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sourceSheet = spreadsheet.getSheetByName(sourceSheetName);
      statusInfo.sourceSheetFound = !!sourceSheet;
      statusInfo.sourceSheetHasRows = !!(sourceSheet && sourceSheet.getLastRow() > 1);
      if (statusInfo.sourceSheetHasRows) {
        statusInfo.autoSyncAttempted = true;
        syncStaffEducationImportByYear_(normalizedYear);
        stored = readDataStoreJson_('staff_education', normalizedYear);
        statusInfo.autoSyncSucceeded = hasStoredDataRows_(stored);
        statusInfo.rowCount = statusInfo.autoSyncSucceeded ? stored.rows.length : 0;
        statusInfo.state = statusInfo.autoSyncSucceeded ? 'synced' : 'year_empty';
      } else {
        statusInfo.state = statusInfo.sourceSheetFound ? 'source_empty' : 'source_missing';
      }
    } catch (error) {
      statusInfo.autoSyncAttempted = true;
      statusInfo.autoSyncErrorMessage = error.message;
      statusInfo.state = 'sync_failed';
      Logger.log('readStaffEducationStoredBundle_ auto sync failed: %s', error.message);
    }
  }
  return {
    stored: stored,
    summaryByDate: stored ? readStaffEducationSummaryByDateFromStored_(stored, normalizedYear) : {},
    countByDate: stored ? readStaffEducationCountByDateFromStored_(stored, normalizedYear) : {},
    statusInfo: statusInfo,
  };
}

function syncStaffEducationImportForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveStaffEducationWorkingYear_(spreadsheet);
  const result = syncStaffEducationImportByYear_(selectedYear);
  SpreadsheetApp.getUi().alert(
    "'" + result.sheetName + "' 시트로 교육 실적 데이터를 가져왔습니다.\n" +
    '대상 연도: ' + result.year + '\n' +
    '가져온 행 수: ' + result.rowCount
  );
}

function applyStaffEducationToLogDataForWorkingYear() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveStaffEducationWorkingYear_(spreadsheet);
  const result = applyStaffEducationToLogDataByYear_(selectedYear);
  SpreadsheetApp.getUi().alert(
    "'" + result.logSheetName + "' 시트에 교육 실적 데이터를 반영했습니다.\n" +
    '대상 연도: ' + result.year + '\n' +
    '수정된 행 수: ' + result.updatedCount + '\n' +
    '추가된 행 수: ' + result.insertedCount
  );
}

function syncStaffEducationImportByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceSheetName = getStaffEducationSourceSheetName_();
  const sourceSheet = spreadsheet.getSheetByName(sourceSheetName);

  if (!sourceSheet) {
    throw new Error("'" + sourceSheetName + "' 시트를 찾을 수 없습니다.");
  }

  const rows = buildStaffEducationImportRows_(sourceSheet, normalizedYear);
  const headers = [
    '연도',
    '성명',
    '직위',
    '교육구분',
    '교육명',
    '필수시간',
    '이수시간',
    '날짜',
    '유형',
    '장소',
    '결과보고',
    '비고',
    '원본행',
  ];

  writeDataStoreJson_('staff_education', normalizedYear, {
    headers: headers,
    rows: rows,
    sourceSheetName: sourceSheetName,
  });

  return {
    year: normalizedYear,
    rowCount: rows.length,
    sheetName: sourceSheetName,
  };
}

function applyStaffEducationToLogDataByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;
  const educationBundle = readStaffEducationStoredBundle_(normalizedYear);
  const stored = educationBundle.stored;

  if (!stored || !stored.rows || !stored.rows.length) {
    return {
      year: normalizedYear,
      logSheetName: logSheet ? logSheet.getName() : getLogDataSheetNameByYear_(normalizedYear),
      updatedCount: 0,
      insertedCount: 0,
      skippedReason: '교육 데이터 없음',
    };
  }

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  if (fieldMap.STAFF_CHANGES === null || fieldMap.STAFF_CHANGES === undefined) {
    throw new Error("'" + logSheet.getName() + "' 시트에서 종사자변동사항 컬럼을 찾을 수 없습니다.");
  }

  const educationSummaryByDate = educationBundle.summaryByDate;
  const dateKeys = Object.keys(educationSummaryByDate);

  if (!dateKeys.length) {
    return {
      year: normalizedYear,
      logSheetName: logSheet.getName(),
      updatedCount: 0,
      insertedCount: 0,
      skippedReason: '교육 데이터 없음',
    };
  }

  const updateContext = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, dateKeys);
  let updatedCount = 0;
  if (!updateContext.hasTargets) {
    return {
      year: normalizedYear,
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
    const summary = educationSummaryByDate[dateKey] || {};
    const existingStaffChanges = valueOrEmpty_(currentRow[fieldMap.STAFF_CHANGES]).trim();

    applyManagerAndStaffWorkerToRowValues_(currentRow, fieldMap, dateKey, normalizedYear);
    const staffChangesWithOffline = mergeStaffEducationText_(existingStaffChanges, summary.offlineText, '집합');
    setRowValueByFieldMap_(
      currentRow,
      fieldMap,
      'STAFF_CHANGES',
      mergeStaffEducationText_(staffChangesWithOffline, summary.onlineText, '온라인')
    );

    setLogSheetBatchRowValues_(updateContext, rowInfo, currentRow);
    updatedCount += 1;
  });

  commitLogSheetBatchUpdate_(logSheet, updateContext);
  sortLogDataSheetByDate_(logSheet, fieldMap);

  return {
    year: normalizedYear,
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
    insertedCount: updateContext.insertedCount,
  };
}

function applyStaffEducationToLogDataByDates_(dates, selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, normalizedYear);
  const logSheet = logDataResult.sheet;
  const educationBundle = readStaffEducationStoredBundle_(normalizedYear);
  const stored = educationBundle.stored;

  if (!stored || !stored.rows || !stored.rows.length) {
    return {
      logSheetName: logSheet ? logSheet.getName() : getLogDataSheetNameByYear_(normalizedYear),
      updatedCount: 0,
      insertedCount: 0,
      appliedCount: 0,
      skippedReason: '교육 데이터 없음',
    };
  }

  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(normalizedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  if (fieldMap.STAFF_CHANGES === null || fieldMap.STAFF_CHANGES === undefined) {
    throw new Error("'" + logSheet.getName() + "' 시트에서 종사자변동사항 컬럼을 찾을 수 없습니다.");
  }

  const requestedLookup = buildRequestedDateLookup_(dates);
  const educationSummaryByDate = educationBundle.summaryByDate;
  const dateKeys = filterDateKeysByLookup_(educationSummaryByDate, requestedLookup);

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
    const summary = educationSummaryByDate[dateKey] || {};
    const existingStaffChanges = valueOrEmpty_(currentRow[fieldMap.STAFF_CHANGES]).trim();

    applyManagerAndStaffWorkerToRowValues_(currentRow, fieldMap, dateKey, normalizedYear);
    const staffChangesWithOffline = mergeStaffEducationText_(existingStaffChanges, summary.offlineText, '집합');
    setRowValueByFieldMap_(
      currentRow,
      fieldMap,
      'STAFF_CHANGES',
      mergeStaffEducationText_(staffChangesWithOffline, summary.onlineText, '온라인')
    );

    setLogSheetBatchRowValues_(updateContext, rowInfo, currentRow);
    updatedCount += 1;
  });

  commitLogSheetBatchUpdate_(logSheet, updateContext);
  formatLogDataSheet_(logSheet);

  return {
    logSheetName: logSheet.getName(),
    updatedCount: updatedCount,
    insertedCount: updateContext.insertedCount,
    appliedCount: dateKeys.length,
  };
}

function getStaffEducationSourceSheetName_() {
  return '종사자 필수,의무교육 시간';
}

function getStaffEducationImportSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return '교육실적가져오기_' + normalizedYear;
}

function resolveStaffEducationWorkingYear_(spreadsheet) {
  const activeSheet = spreadsheet.getActiveSheet();
  const activeSheetName = activeSheet ? activeSheet.getName() : '';
  const importMatch = String(activeSheetName || '').match(/^교육실적가져오기_(20\d{2})$/);

  if (importMatch) {
    return Number(importMatch[1]);
  }

  const logDataYear = extractAttendanceYearFromNamedSheet_(activeSheetName, '일지데이터');
  if (logDataYear) {
    return logDataYear;
  }

  return resolveWorkingYear_(spreadsheet);
}

function readStaffEducationSummaryByDate_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return {};
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headerIndexMap = buildHeaderIndexMap_(values[0]);
  const dateIndex = headerIndexMap['날짜'];
  const nameIndex = headerIndexMap['성명'];
  const educationNameIndex = headerIndexMap['교육명'];
  const hoursIndex = headerIndexMap['이수시간'];
  const typeIndex = headerIndexMap['유형'];

  if ([dateIndex, nameIndex, educationNameIndex, hoursIndex].some(function(index) {
    return index === null || index === undefined;
  })) {
    throw new Error("'" + sheet.getName() + "' 시트에서 교육 집계에 필요한 컬럼을 찾을 수 없습니다.");
  }

  const buckets = {};

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const dateKey = normalizeDateKey_(row[dateIndex]);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const educationName = valueOrEmpty_(row[educationNameIndex]).trim();
    const hours = normalizeStaffEducationHours_(row[hoursIndex]);
    const type = normalizeStaffEducationType_(typeIndex === null || typeIndex === undefined ? '' : row[typeIndex]);

    if (!dateKey || !name || !educationName || hours <= 0) {
      continue;
    }

    if (!buckets[dateKey]) {
      buckets[dateKey] = {
        offlineEntries: [],
        onlineEntries: [],
      };
    }

    const item = {
      name: name,
      educationName: educationName,
      hours: hours,
    };

    if (type === 'offline') {
      buckets[dateKey].offlineEntries.push(item);
    } else if (type === 'online') {
      buckets[dateKey].onlineEntries.push(item);
    }
  }

  const result = {};
  Object.keys(buckets).forEach(function(dateKey) {
    result[dateKey] = {
      offlineText: formatStaffEducationSummaryText_('집합', buckets[dateKey].offlineEntries),
      onlineText: formatStaffEducationSummaryText_('온라인', buckets[dateKey].onlineEntries),
    };
  });

  return result;
}

function readStaffEducationSummaryByDateFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;

  if (!headers.length || !rows.length) {
    return {};
  }

  const headerIndexMap = buildHeaderIndexMap_(headers);
  const yearIndex = headerIndexMap['연도'];
  const dateIndex = headerIndexMap['날짜'];
  const nameIndex = headerIndexMap['성명'];
  const educationNameIndex = headerIndexMap['교육명'];
  const hoursIndex = headerIndexMap['이수시간'];
  const typeIndex = headerIndexMap['유형'];

  if ([dateIndex, nameIndex, educationNameIndex, hoursIndex].some(function(index) {
    return index === null || index === undefined;
  })) {
    throw new Error('교육 저장 데이터에서 필요한 컬럼을 찾을 수 없습니다.');
  }

  const buckets = {};

  rows.forEach(function(row) {
    const rowYear = yearIndex === null || yearIndex === undefined ? normalizedYear : normalizeAttendanceYear_(row[yearIndex]);
    if (rowYear && rowYear !== normalizedYear) {
      return;
    }
    const dateKey = normalizeDateKey_(row[dateIndex]);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const educationName = valueOrEmpty_(row[educationNameIndex]).trim();
    const hours = normalizeStaffEducationHours_(row[hoursIndex]);
    const type = normalizeStaffEducationType_(typeIndex === null || typeIndex === undefined ? '' : row[typeIndex]);

    if (!dateKey || !name || !educationName || hours <= 0) {
      return;
    }

    if (!buckets[dateKey]) {
      buckets[dateKey] = {
        offlineEntries: [],
        onlineEntries: [],
      };
    }

    const item = {
      name: name,
      educationName: educationName,
      hours: hours,
    };

    if (type === 'offline') {
      buckets[dateKey].offlineEntries.push(item);
    } else if (type === 'online') {
      buckets[dateKey].onlineEntries.push(item);
    }
  });

  const result = {};
  Object.keys(buckets).forEach(function(dateKey) {
    result[dateKey] = {
      offlineText: formatStaffEducationSummaryText_('집합', buckets[dateKey].offlineEntries),
      onlineText: formatStaffEducationSummaryText_('온라인', buckets[dateKey].onlineEntries),
    };
  });

  return result;
}

function buildStaffEducationImportRows_(sheet, selectedYear) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 16);

  if (lastRow < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const rows = [];
  let currentStaff = null;
  let currentSection = '';
  let pendingPosition = '';

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];

    if (!currentStaff && isStaffEducationStandaloneNameRow_(row)) {
      const parsedStandaloneStaff = parseStaffEducationStandaloneNameRow_(row);
      currentStaff = parsedStandaloneStaff;
      pendingPosition = parsedStandaloneStaff.position;
      currentSection = '';
      continue;
    }

    if (isStaffEducationPersonHeaderRow_(row)) {
      currentStaff = parseStaffEducationPersonHeaderRow_(row);
      if (!currentStaff.position && pendingPosition) {
        currentStaff.position = pendingPosition;
      }
      pendingPosition = currentStaff.position || '';
      currentSection = '';
      continue;
    }

    if (!currentStaff) {
      continue;
    }

    if (isStaffEducationTableHeaderRow_(row)) {
      continue;
    }

    const sectionLabel = valueOrEmpty_(row[0]).trim();
    if (sectionLabel === '필수교육' || sectionLabel === '법정 \n의무교육' || sectionLabel === '법정 의무교육' || sectionLabel === '선택교육') {
      currentSection = sectionLabel.replace(/\s+/g, ' ').trim();
    }

    const dateKey = normalizeDateKey_(parseStaffEducationDateValue_(row[4]));
    if (!dateKey) {
      continue;
    }

    const rowYear = normalizeAttendanceYear_(dateKey.slice(0, 4));
    if (rowYear && rowYear !== normalizedYear) {
      continue;
    }

    const educationName = valueOrEmpty_(row[1]).trim();
    const completedHours = normalizeStaffEducationHours_(row[3]);

    if (!educationName || completedHours <= 0) {
      continue;
    }

    rows.push([
      String(normalizedYear),
      currentStaff.name,
      currentStaff.position,
      currentSection,
      educationName,
      valueOrEmpty_(row[2]).trim(),
      completedHours,
      dateKey,
      valueOrEmpty_(row[5]).trim(),
      valueOrEmpty_(row[6]).trim(),
      valueOrEmpty_(row[9]).trim(),
      valueOrEmpty_(row[10]).trim(),
      String(rowIndex + 1),
    ]);
  }

  return rows.sort(function(left, right) {
    if (left[7] !== right[7]) {
      return left[7] < right[7] ? -1 : 1;
    }
    if (left[1] !== right[1]) {
      return left[1] < right[1] ? -1 : 1;
    }
    return left[4] < right[4] ? -1 : 1;
  });
}

function isStaffEducationPersonHeaderRow_(row) {
  const nameCell = valueOrEmpty_(row[0]).trim();
  const joinDateCell = valueOrEmpty_(row[1]).trim();

  if (!nameCell || !joinDateCell) {
    return false;
  }

  if (nameCell === '구분' || nameCell.indexOf('퇴사자') !== -1) {
    return false;
  }

  return /^입사일/.test(joinDateCell);
}

function isStaffEducationStandaloneNameRow_(row) {
  const nameCell = valueOrEmpty_(row[0]).trim();
  if (!nameCell || nameCell === '구분') {
    return false;
  }

  const firstParts = nameCell.split(/\r?\n/).map(function(part) {
    return part.trim();
  }).filter(Boolean);

  if (!firstParts.length) {
    return false;
  }

  return /사회복지사|시설장|팀장|복지사|생활복지사|종사자/.test(nameCell);
}

function parseStaffEducationStandaloneNameRow_(row) {
  const parts = valueOrEmpty_(row[0]).split(/\r?\n/).map(function(part) {
    return part.trim();
  }).filter(Boolean);

  return {
    name: parts[0] || '',
    position: parts.slice(1).join(' ') || '',
  };
}

function parseStaffEducationPersonHeaderRow_(row) {
  const nameParts = valueOrEmpty_(row[0]).split(/\r?\n/).map(function(part) {
    return part.trim();
  }).filter(Boolean);

  return {
    name: nameParts[0] || '',
    position: nameParts.slice(1).join(' ') || '',
  };
}

function isStaffEducationTableHeaderRow_(row) {
  return valueOrEmpty_(row[0]).trim() === '구분' &&
    valueOrEmpty_(row[1]).trim() === '교육명';
}

function parseStaffEducationDateValue_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }

  const normalized = text.replace(/[.]/g, '-');
  const match = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (!match) {
    return '';
  }

  return [
    match[1],
    ('0' + match[2]).slice(-2),
    ('0' + match[3]).slice(-2),
  ].join('-');
}

function normalizeStaffEducationHours_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return 0;
  }

  const numericValue = Number(text);
  if (!isNaN(numericValue)) {
    return numericValue;
  }

  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function normalizeStaffEducationType_(value) {
  const text = valueOrEmpty_(value).replace(/\s+/g, '').trim();
  if (!text) {
    return '';
  }
  if (text.indexOf('집합') > -1) {
    return 'offline';
  }
  if (text.indexOf('온라인') > -1) {
    return 'online';
  }
  return '';
}

function formatStaffEducationSummaryText_(label, entries) {
  const safeEntries = (entries || []).filter(function(entry) {
    return entry && hasDisplayValue_(entry.name) && hasDisplayValue_(entry.educationName) && Number(entry.hours) > 0;
  });

  if (!safeEntries.length) {
    return '';
  }

  const groupedByEducation = {};
  safeEntries.forEach(function(entry) {
    const educationKey = entry.educationName + '|' + formatStaffEducationHoursLabel_(entry.hours);
    if (!groupedByEducation[educationKey]) {
      groupedByEducation[educationKey] = {
        educationName: entry.educationName,
        hoursLabel: formatStaffEducationHoursLabel_(entry.hours),
        names: {},
      };
    }
    groupedByEducation[educationKey].names[entry.name] = true;
  });

  const parts = Object.keys(groupedByEducation).sort().map(function(educationKey) {
    const item = groupedByEducation[educationKey];
    const names = Object.keys(item.names).sort();
    return item.educationName + ' ' + item.hoursLabel + '(' + names.join(', ') + ' / ' + names.length + '명)';
  });

  return label + ' : ' + parts.join(', ');
}

function formatStaffEducationHoursLabel_(hours) {
  const numericHours = Number(hours) || 0;
  if (Math.abs(numericHours - Math.round(numericHours)) < 0.000001) {
    return Math.round(numericHours) + '시간';
  }
  return String(numericHours) + '시간';
}

function mergeStaffEducationText_(existingText, nextText, label) {
  const labelPattern = new RegExp('^' + label + '\\s*:');
  const lines = valueOrEmpty_(existingText)
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(Boolean)
    .filter(function(line) { return !labelPattern.test(line); });

  if (nextText) {
    lines.push(nextText);
  }

  return lines.join('\n');
}

function readStaffEducationCountByDateFromStored_(storedPayload, selectedYear) {
  const headers = storedPayload && storedPayload.headers ? storedPayload.headers : [];
  const rows = storedPayload && storedPayload.rows ? storedPayload.rows : [];
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!headers.length || !rows.length) {
    return {};
  }

  const headerIndexMap = buildHeaderIndexMap_(headers);
  const yearIndex = headerIndexMap['연도'];
  const dateIndex = headerIndexMap['날짜'];
  const nameIndex = headerIndexMap['성명'];
  const hoursIndex = headerIndexMap['이수시간'];

  if ([dateIndex, nameIndex, hoursIndex].some(function(index) {
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
    const dateKey = normalizeDateKey_(row[dateIndex]);
    const name = valueOrEmpty_(row[nameIndex]).trim();
    const hours = normalizeStaffEducationHours_(row[hoursIndex]);
    if (!dateKey || !name || hours <= 0) {
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
