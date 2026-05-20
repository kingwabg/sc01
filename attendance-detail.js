function buildAttendanceDetailRowsByDate_(normalizedRows, childLookup) {
  const grouped = {};

  (normalizedRows || []).forEach(function(row) {
    const date = valueOrEmpty_(row[0]).trim();
    const name = valueOrEmpty_(row[1]).trim();
    const school = valueOrEmpty_(row[2]).trim();
    const schoolLevel = valueOrEmpty_(row[3]).trim();
    const status = valueOrEmpty_(row[4]).trim();
    const checkIn = valueOrEmpty_(row[5]).trim();
    const checkOut = valueOrEmpty_(row[6]).trim();

    if (!date || !name || !status) {
      return;
    }

    const child = findChildRecord_(childLookup, name, school);
    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push({
      date: date,
      name: name,
      school: school,
      schoolLevel: child && child.schoolLevel ? child.schoolLevel : schoolLevel,
      gender: child && child.gender ? child.gender : '',
      status: status,
      checkIn: checkIn,
      checkOut: checkOut,
      matched: !!(child && child.gender),
    });
  });

  Object.keys(grouped).forEach(function(date) {
    grouped[date].sort(function(left, right) {
      if (left.matched !== right.matched) {
        return left.matched ? 1 : -1;
      }
      if (left.name !== right.name) {
        return left.name < right.name ? -1 : 1;
      }
      return left.school < right.school ? -1 : 1;
    });
  });

  return grouped;
}

function getAttendanceDetailRowsByYearAndDate(selectedYear, date) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const normalizedDate = normalizeDateKey_(date);
  const detailCacheKey = getAttendanceDetailCacheKey_(normalizedYear, normalizedDate);
  const cachedRows = getAttendanceCacheJson_(detailCacheKey);

  if (cachedRows) {
    return cachedRows;
  }

  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;

  if (!sourceSheet || !normalizedDate) {
    return [];
  }

  const childLookup = buildCombinedChildLookup_(spreadsheet, normalizedYear);
  const rows = buildAttendanceDetailRowsForDate_(sourceSheet, normalizedDate, childLookup);
  putAttendanceCacheJson_(detailCacheKey, rows, 900);
  return rows;
}

function getAttendanceDetailRowsByYearAndDates(selectedYear, dates) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  const detailCacheKey = getAttendanceDetailCacheKey_(normalizedYear, normalizedDates.join('|'));
  const cachedRows = getAttendanceCacheJson_(detailCacheKey);

  if (cachedRows) {
    return cachedRows;
  }

  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;
  if (!sourceSheet || !normalizedDates.length) {
    return [];
  }

  const childLookup = buildCombinedChildLookup_(spreadsheet, normalizedYear);
  const normalizedRows = buildAttendanceNormalizedRows_(sourceSheet);
  const targetDates = {};
  const grouped = {};

  normalizedDates.forEach(function(date) {
    targetDates[date] = true;
  });

  normalizedRows.forEach(function(row) {
    const rowDate = valueOrEmpty_(row[0]).trim();
    const name = valueOrEmpty_(row[1]).trim();
    const school = valueOrEmpty_(row[2]).trim();
    const status = valueOrEmpty_(row[4]).trim();

    if (!targetDates[rowDate] || !name) {
      return;
    }

    const child = findChildRecord_(childLookup, name, school);
    const key = name + '|' + school;
    if (!grouped[key]) {
      grouped[key] = {
        name: name,
        school: school,
        schoolLevel: child && child.schoolLevel ? child.schoolLevel : detectSchoolLevel_(school),
        gender: child && child.gender ? child.gender : '',
        present: 0,
        official: 0,
        absent: 0,
        other: 0,
        matched: !!(child && child.gender),
      };
    }

    if (status === '출석') {
      grouped[key].present += 1;
    } else if (status === '공결') {
      grouped[key].official += 1;
    } else if (status === '결석') {
      grouped[key].absent += 1;
    } else {
      grouped[key].other += 1;
    }
  });

  const rows = Object.keys(grouped).map(function(key) {
    return grouped[key];
  }).sort(function(left, right) {
    if (left.matched !== right.matched) {
      return left.matched ? -1 : 1;
    }
    if (left.school !== right.school) {
      return left.school < right.school ? -1 : 1;
    }
    return left.name < right.name ? -1 : 1;
  });

  putAttendanceCacheJson_(detailCacheKey, rows, 900);
  return rows;
}

function getAttendanceStudentMonthlySummaryByYear(selectedYear, name, school, dates) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const studentName = valueOrEmpty_(name).trim();
  const studentSchool = valueOrEmpty_(school).trim();
  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  const dateScopeKey = normalizedDates.join('|');
  const cacheKey = getAttendanceStudentCacheKey_(normalizedYear, studentName, studentSchool + '|' + dateScopeKey);
  const cached = getAttendanceCacheJson_(cacheKey);

  if (cached) {
    return cached;
  }

  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;
  if (!sourceSheet || !studentName) {
    return {
      profile: {
        name: studentName,
        school: studentSchool,
        gender: '',
        schoolLevel: '',
      },
      summary: {
        totalDays: 0,
        present: 0,
        official: 0,
        alternative: 0,
        absent: 0,
        other: 0,
        lastAbsentDate: '',
        attendanceRate: 0,
      },
      rows: [],
      recentLogs: [],
    };
  }

  const childLookup = buildCombinedChildLookup_(spreadsheet, normalizedYear);
  const normalizedRows = buildAttendanceNormalizedRows_(sourceSheet);
  const student = findChildRecord_(childLookup, studentName, studentSchool);
  const targetSchoolInfo = normalizeSchoolAndGrade_(studentSchool, '');
  const monthBuckets = {};
  const summary = {
    totalDays: 0,
    present: 0,
    official: 0,
    alternative: 0,
    absent: 0,
    other: 0,
    lastAbsentDate: '',
    attendanceRate: 0,
  };
  const recentLogs = [];
  const targetDateLookup = {};

  normalizedDates.forEach(function(date) {
    targetDateLookup[date] = true;
  });

  normalizedRows.forEach(function(row) {
    const rowDate = valueOrEmpty_(row[0]).trim();
    const rowName = valueOrEmpty_(row[1]).trim();
    const rowSchool = valueOrEmpty_(row[2]).trim();
    const rowStatus = valueOrEmpty_(row[4]).trim();
    const rowSchoolInfo = normalizeSchoolAndGrade_(rowSchool, '');

    if (!rowDate || !rowName || rowName !== studentName) {
      return;
    }

    if (normalizedDates.length && !targetDateLookup[rowDate]) {
      return;
    }

    if (studentSchool) {
      const sameSchool =
        rowSchool === studentSchool ||
        rowSchoolInfo.school === targetSchoolInfo.school;
      if (!sameSchool) {
        return;
      }
    }

    const yearMonth = rowDate.slice(0, 7);
    if (!monthBuckets[yearMonth]) {
      monthBuckets[yearMonth] = {
        yearMonth: yearMonth,
        totalDays: 0,
        present: 0,
        official: 0,
        alternative: 0,
        absent: 0,
        other: 0,
        attendanceRate: 0,
      };
    }

    const bucket = monthBuckets[yearMonth];
    bucket.totalDays += 1;
    summary.totalDays += 1;
    if (rowStatus === '출석') {
      bucket.present += 1;
      summary.present += 1;
    } else if (rowStatus === '공결') {
      bucket.present += 1;
      summary.present += 1;
      bucket.official += 1;
      summary.official += 1;
    } else if (rowStatus === '대체출석') {
      bucket.alternative += 1;
      summary.alternative += 1;
    } else if (rowStatus === '결석') {
      bucket.absent += 1;
      summary.absent += 1;
      if (!summary.lastAbsentDate || rowDate > summary.lastAbsentDate) {
        summary.lastAbsentDate = rowDate;
      }
    } else {
      bucket.other += 1;
      summary.other += 1;
    }

    recentLogs.push({
      date: rowDate,
      status: rowStatus,
      checkIn: valueOrEmpty_(row[5]).trim(),
      checkOut: valueOrEmpty_(row[6]).trim(),
    });
  });

  summary.attendanceRate = summary.totalDays
    ? Math.round((summary.present / summary.totalDays) * 1000) / 10
    : 0;

  const result = {
    profile: {
      name: studentName,
      school: studentSchool,
      gender: student && student.gender ? student.gender : '',
      schoolLevel: student && student.schoolLevel ? student.schoolLevel : detectSchoolLevel_(studentSchool),
    },
    summary: summary,
    rows: Object.keys(monthBuckets).sort().map(function(key) {
      const bucket = monthBuckets[key];
      bucket.attendanceRate = bucket.totalDays
        ? Math.round((bucket.present / bucket.totalDays) * 1000) / 10
        : 0;
      return bucket;
    }),
    recentLogs: recentLogs.sort(function(left, right) {
      return left.date < right.date ? 1 : -1;
    }).slice(0, 5),
  };

  putAttendanceCacheJson_(cacheKey, result, 900);
  return result;
}

function getAttendanceStudentIndexByYear(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const cacheKey = getAttendanceStudentCacheKey_(normalizedYear, '__index__', 'all');
  const cached = getAttendanceCacheJson_(cacheKey);

  if (cached) {
    return cached;
  }

  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, normalizedYear);
  const sourceSheet = sourceResult.sheet;
  if (!sourceSheet) {
    return {};
  }

  const childLookup = buildCombinedChildLookup_(spreadsheet, normalizedYear);
  const normalizedRows = buildAttendanceNormalizedRows_(sourceSheet);
  const index = {};

  normalizedRows.forEach(function(row) {
    const rowDate = valueOrEmpty_(row[0]).trim();
    const rowName = valueOrEmpty_(row[1]).trim();
    const rowSchool = valueOrEmpty_(row[2]).trim();
    const rowStatus = valueOrEmpty_(row[4]).trim();
    if (!rowDate || !rowName) {
      return;
    }

    const key = rowName + '|' + rowSchool;
    const child = findChildRecord_(childLookup, rowName, rowSchool);
    if (!index[key]) {
      index[key] = {
        profile: {
          name: rowName,
          school: rowSchool,
          gender: child && child.gender ? child.gender : '',
          schoolLevel: child && child.schoolLevel ? child.schoolLevel : detectSchoolLevel_(rowSchool),
        },
        logs: [],
      };
    }

    index[key].logs.push({
      date: rowDate,
      status: rowStatus,
      checkIn: valueOrEmpty_(row[5]).trim(),
      checkOut: valueOrEmpty_(row[6]).trim(),
    });
  });

  putAttendanceCacheJson_(cacheKey, index, 900);
  return index;
}

function buildAttendanceDetailRowsForDate_(sheet, normalizedDate, childLookup) {
  const targetDate = new Date(normalizedDate);
  if (isNaN(targetDate.getTime())) {
    return [];
  }

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 1 || lastColumn < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const parserType = getAttendanceParserType_(sheet);
  const monthStartRows = parserType === 'legacy'
    ? findAttendanceMonthStartRowsLegacy_(values)
    : findAttendanceMonthStartRowsCurrent_(values);
  const sheetYear = extractAttendanceYearFromSheetName_(sheet.getName()) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  let matchedBlock = null;

  monthStartRows.some(function(monthStartRow, index) {
    const nextMonthStartRow = monthStartRows[index + 1] || (lastRow + 1);
    const block = parserType === 'legacy'
      ? parseAttendanceMonthBlockLegacy_(values, monthStartRow, nextMonthStartRow - 1, sheetYear)
      : parseAttendanceMonthBlockCurrent_(values, monthStartRow, nextMonthStartRow - 1);

    if (!block || Number(block.year) !== year || Number(block.month) !== month) {
      return false;
    }

    const matchingDayColumn = (block.dayColumns || []).find(function(dayColumn) {
      return Number(dayColumn.day) === day;
    });

    if (!matchingDayColumn) {
      return false;
    }

    matchedBlock = {
      studentStartRow: block.studentStartRow,
      studentEndRow: block.studentEndRow,
      columnIndex: matchingDayColumn.columnIndex,
    };
    return true;
  });

  if (!matchedBlock) {
    return [];
  }

  const rows = [];
  for (let rowIndex = matchedBlock.studentStartRow; rowIndex <= matchedBlock.studentEndRow; rowIndex += 1) {
    const row = values[rowIndex - 1];
    const studentNumber = valueOrEmpty_(row[0]).trim();
    const studentName = valueOrEmpty_(row[1]).trim();
    const studentClass = valueOrEmpty_(row[2]).trim();

    if (!isAttendanceStudentRow_(studentNumber, studentName, studentClass)) {
      continue;
    }

    const parsed = parseAttendanceCellValue_(valueOrEmpty_(row[matchedBlock.columnIndex]).trim(), year);
    if (!parsed.hasRecord) {
      continue;
    }

    const child = findChildRecord_(childLookup, studentName, studentClass);
    rows.push({
      date: normalizedDate,
      name: studentName,
      school: studentClass,
      schoolLevel: child && child.schoolLevel ? child.schoolLevel : detectSchoolLevel_(studentClass),
      gender: child && child.gender ? child.gender : '',
      status: parsed.status,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      matched: !!(child && child.gender),
    });
  }

  rows.sort(function(left, right) {
    if (left.matched !== right.matched) {
      return left.matched ? 1 : -1;
    }
    if (left.name !== right.name) {
      return left.name < right.name ? -1 : 1;
    }
    return left.school < right.school ? -1 : 1;
  });

  return rows;
}

function findAttendanceMonthStartRowsCurrent_(values) {
  const monthStartRows = [];

  values.forEach(function(row, index) {
    const cellA = valueOrEmpty_(row[0]).trim();
    const cellB = valueOrEmpty_(row[1]).trim();
    if (/^\d{1,2}월$/.test(cellA) || /^\d{1,2}월$/.test(cellB)) {
      monthStartRows.push(index + 1);
    }
  });

  return monthStartRows;
}

function findAttendanceMonthStartRowsLegacy_(values) {
  const monthStartRows = [];

  values.forEach(function(row, index) {
    const cellA = valueOrEmpty_(row[0]).trim();
    if (/^\d{1,2}월$/.test(cellA)) {
      monthStartRows.push(index + 1);
    }
  });

  return monthStartRows;
}

function parseAttendanceMonthBlockCurrent_(values, monthStartRow, monthEndRow) {
  const monthRow = values[monthStartRow - 1] || [];
  const monthLabel = valueOrEmpty_(monthRow[1]).trim() || valueOrEmpty_(monthRow[0]).trim();
  const monthMatch = monthLabel.match(/^(\d{1,2})월$/);

  if (!monthMatch) {
    return null;
  }

  const month = Number(monthMatch[1]);
  let dateHeaderRow = null;
  for (let rowIndex = monthStartRow; rowIndex <= Math.min(monthEndRow, monthStartRow + 8); rowIndex += 1) {
    const row = values[rowIndex - 1] || [];
    let dayHeaderCount = 0;
    row.forEach(function(cell) {
      if (/^\d{1,2}일$/.test(valueOrEmpty_(cell).trim())) {
        dayHeaderCount += 1;
      }
    });
    if (dayHeaderCount >= 5) {
      dateHeaderRow = rowIndex;
      break;
    }
  }

  if (!dateHeaderRow) {
    dateHeaderRow = monthStartRow + 4;
  }

  const studentStartRow = dateHeaderRow + 1;
  const studentEndRow = monthEndRow;
  let year = null;
  for (let rowIndex = monthStartRow; rowIndex <= Math.min(dateHeaderRow, monthStartRow + 4); rowIndex += 1) {
    const row = values[rowIndex - 1] || [];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const detectedYear = extractAttendanceYear_(row[columnIndex]);
      if (detectedYear) {
        year = detectedYear;
        break;
      }
    }
    if (year) {
      break;
    }
  }
  year = year || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dateHeaderValues = values[dateHeaderRow - 1] || [];
  const dayColumns = [];

  dateHeaderValues.forEach(function(headerValue, columnIndex) {
    const match = valueOrEmpty_(headerValue).trim().match(/^(\d{1,2})일$/);
    if (!match) {
      return;
    }

    dayColumns.push({
      day: Number(match[1]),
      columnIndex: columnIndex,
      headerLabel: match[0],
    });
  });

  return {
    year: year,
    month: month,
    dateHeaderRow: dateHeaderRow,
    studentStartRow: studentStartRow,
    studentEndRow: studentEndRow,
    dayColumns: dayColumns,
  };
}

function parseAttendanceMonthBlockLegacy_(values, monthStartRow, monthEndRow, sheetYear) {
  const monthLabel = valueOrEmpty_(values[monthStartRow - 1][0]).trim();
  const monthMatch = monthLabel.match(/^(\d{1,2})월$/);

  if (!monthMatch) {
    return null;
  }

  const month = Number(monthMatch[1]);
  const dateHeaderRow = monthStartRow + 2;
  const studentStartRow = dateHeaderRow + 1;
  const studentEndRow = Math.max(studentStartRow, monthEndRow - 1);
  const year = sheetYear || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dateHeaderValues = values[dateHeaderRow - 1] || [];
  const dayColumns = [];

  dateHeaderValues.forEach(function(headerValue, columnIndex) {
    const match = valueOrEmpty_(headerValue).trim().match(/^(\d{1,2})$/);
    if (!match) {
      return;
    }

    dayColumns.push({
      day: Number(match[1]),
      columnIndex: columnIndex,
      headerLabel: match[0],
    });
  });

  return {
    year: year,
    month: month,
    dateHeaderRow: dateHeaderRow,
    studentStartRow: studentStartRow,
    studentEndRow: studentEndRow,
    dayColumns: dayColumns,
  };
}

function extractAttendanceYearFromSheetName_(sheetName) {
  const match = String(sheetName || '').trim().match(/(\d{2})년\s*출석부$/);
  return match ? Number('20' + match[1]) : null;
}

function extractAttendanceYear_(value) {
  const match = String(value || '').match(/(\d{4})년/);
  return match ? Number(match[1]) : null;
}

function parseAttendanceCellValue_(value, sheetYear) {
  const normalized = valueOrEmpty_(value).trim();
  const compact = normalized.replace(/\s+/g, '');
  const ignoredTokens = {
    '#REF!': true,
    '입소전': true,
    '퇴소': true,
    '설': true,
    '날': true,
    '휴': true,
    '일': true,
    '대': true,
    '체': true,
    '설날': true,
    '휴일': true,
    '대체': true,
  };

  if (!normalized) {
    return {
      hasRecord: false,
      status: '',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: false,
      isAbsent: false,
    };
  }

  if (ignoredTokens[compact]) {
    return {
      hasRecord: false,
      status: '',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: false,
      isAbsent: false,
    };
  }

  if (compact === '특별결석' || compact.indexOf('특별결석') > -1) {
    if (Number(sheetYear) === 2024) {
      return {
        hasRecord: true,
        status: '공결',
        checkIn: '',
        checkOut: '',
        isPresent: false,
        isOfficial: true,
        isAbsent: false,
      };
    }

    return {
      hasRecord: true,
      status: '결석',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: false,
      isAbsent: true,
    };
  }

  if (compact === '결석' || compact.indexOf('결석') > -1) {
    return {
      hasRecord: true,
      status: '결석',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: false,
      isAbsent: true,
    };
  }

  if (compact === '공결' || compact.indexOf('공결') > -1) {
    return {
      hasRecord: true,
      status: '공결',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: true,
      isAbsent: false,
    };
  }

  if (compact === '대체출석' || compact.indexOf('대체출석') > -1) {
    return {
      hasRecord: true,
      status: '대체출석',
      checkIn: '',
      checkOut: '',
      isPresent: false,
      isOfficial: false,
      isAbsent: false,
    };
  }

  const timeLines = normalized
    .split(/\r?\n/)
    .map(function(line) {
      return line.trim();
    })
    .filter(function(line) {
      return /^\d{1,2}:\d{2}$/.test(line);
    });

  if (timeLines.length) {
    return {
      hasRecord: true,
      status: '출석',
      checkIn: timeLines[0] || '',
      checkOut: timeLines[1] || '',
      isPresent: true,
      isOfficial: false,
      isAbsent: false,
    };
  }

  return {
    hasRecord: true,
    status: normalized,
    checkIn: '',
    checkOut: '',
    isPresent: false,
    isOfficial: compact.indexOf('공결') > -1,
    isAbsent: compact.indexOf('결석') > -1,
  };
}
