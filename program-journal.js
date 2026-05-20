function getProgramJournalSheetNameByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return String(normalizedYear).slice(-2) + '년 프로그램 일지';
}

let programJournalBundleMemo_ = {};
let programJournalAnalysisSavedMemo_ = {};

function inspectProgramJournalSheet(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolved = resolveProgramJournalSheet_(
    spreadsheet,
    normalizeAttendanceYear_(selectedYear) || resolveWorkingYear_(spreadsheet) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR
  );
  const sheet = resolved.sheet;

  if (!sheet) {
    Logger.log('시트를 찾을 수 없습니다: %s', getProgramJournalSheetNameByYear_(resolved.year));
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const sampleRows = Math.min(8, lastRow);
  const values = sampleRows > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, sampleRows, lastColumn).getDisplayValues()
    : [];
  const headerRowIndex = values.length ? detectProgramJournalHeaderRow_(values) : 0;

  Logger.log('=== 기본 정보 ===');
  Logger.log('시트명: %s', sheet.getName());
  Logger.log('연도: %s', resolved.year);
  Logger.log('최종 행: %s', lastRow);
  Logger.log('최종 열: %s', lastColumn);
  Logger.log('추정 헤더 행: %s', headerRowIndex + 1);

  if (values.length) {
    const headers = values[headerRowIndex] || [];
    const headerIndexMap = buildProgramJournalHeaderIndexMap_(headers);
    Logger.log('=== 추정 헤더 ===');
    Logger.log(JSON.stringify(headers));
    Logger.log('=== 헤더 인식 결과 ===');
    Logger.log(JSON.stringify(headerIndexMap));
  }

  Logger.log('=== 1~%s행 샘플 ===', sampleRows);
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    Logger.log('%s행: %s', rowIndex + 1, JSON.stringify(values[rowIndex]));
  }
}

function inspect2024ProgramJournalSheet() {
  inspectProgramJournalSheet(2024);
}

function inspect2025ProgramJournalSheet() {
  inspectProgramJournalSheet(2025);
}

function inspect2026ProgramJournalSheet() {
  inspectProgramJournalSheet(2026);
}

function normalizeProgramJournalDateKey_(value, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const direct = normalizeAssistantDateKey_(value) || normalizeDateKey_(value);
  if (/^20\d{2}-\d{2}-\d{2}$/.test(direct)) {
    return direct;
  }

  const rawValue = valueOrEmpty_(value).trim();
  if (!rawValue) {
    return '';
  }

  const cleaned = rawValue
    .replace(/\([^)]*\)/g, '')
    .replace(/[./]/g, '-')
    .replace(/\s+/g, '')
    .replace(/년/g, '-')
    .replace(/월/g, '-')
    .replace(/일/g, '')
    .replace(/[월화수목금토일]$/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');

  let match = cleaned.match(/^(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return [
      String(normalizedYear),
      match[1].padStart(2, '0'),
      match[2].padStart(2, '0'),
    ].join('-');
  }

  match = cleaned.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return [
      String(2000 + Number(match[1])),
      match[2].padStart(2, '0'),
      match[3].padStart(2, '0'),
    ].join('-');
  }

  match = cleaned.match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (match) {
    return [match[1], match[2], match[3]].join('-');
  }

  match = cleaned.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (match) {
    return [
      String(2000 + Number(match[1])),
      match[2],
      match[3],
    ].join('-');
  }

  return direct;
}

function resolveProgramJournalSheet_(spreadsheet, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const exactSheet = spreadsheet.getSheetByName(getProgramJournalSheetNameByYear_(normalizedYear));
  if (exactSheet) {
    return {
      year: normalizedYear,
      sheet: exactSheet,
      errorMessage: '',
    };
  }

  const fallbackSheet = spreadsheet.getSheets().find(function(sheet) {
    const name = String(sheet.getName() || '').trim();
    const year = extractAttendanceYearFromNamedSheet_(name, '프로그램 일지');
    return year === normalizedYear;
  }) || null;

  return {
    year: normalizedYear,
    sheet: fallbackSheet,
    errorMessage: fallbackSheet ? '' : "'" + getProgramJournalSheetNameByYear_(normalizedYear) + "' 시트가 없습니다.",
  };
}

function buildProgramJournalHeaderIndexMap_(headers) {
  const indexMap = {};
  const aliasesByField = getProgramJournalFieldAliases_();

  function assign(key, aliases) {
    indexMap[key] = findHeaderIndex_(buildHeaderLookup_(headers), aliases);
  }

  Object.keys(aliasesByField).forEach(function(fieldKey) {
    assign(fieldKey, aliasesByField[fieldKey]);
  });

  return indexMap;
}

function getProgramJournalFieldAliases_() {
  return {
    DATE: ['일자', '날짜', '일시', '실시일', '진행일', '활동일', '실시날짜', '진행날짜', '수업일자'],
    TITLE: ['프로그램명', '프로그램', '활동명', '수업명', '행사명', '프로그램명(활동명)', '활동주제', '제목'],
    CONTENT: ['내용', '활동내용', '프로그램내용', '세부내용', '활동', '실시내용', '주요내용'],
    TARGET: ['대상', '참여대상', '참여대상자', '참여대상(학년)', '대상학년'],
    COUNT: ['참여인원', '인원', '참석인원', '참여자수', '참가인원', '참여학생수'],
    NAME_LIST: ['참여자 명단', '참여자명단', '참여자', '참가자', '참석자', '이용아동', '학생명단', '참여아동', '참여아동명단', '참여학생명단', '대상자'],
    TEACHER: ['담당', '강사', '진행자', '담당자', '지도자', '진행교사'],
    NOTE: ['비고', '메모', '특이사항', '참고사항']
  };
}

function detectProgramJournalHeaderRow_(values) {
  const aliasesByField = getProgramJournalFieldAliases_();
  let best = null;
  const maxScanRows = Math.min(values.length, 10);

  for (let rowIndex = 0; rowIndex < maxScanRows; rowIndex += 1) {
    const headers = values[rowIndex] || [];
    const lookup = buildHeaderLookup_(headers);
    let score = 0;
    let requiredHits = 0;

    Object.keys(aliasesByField).forEach(function(fieldKey) {
      const found = findHeaderIndex_(lookup, aliasesByField[fieldKey]);
      if (found !== null) {
        score += (fieldKey === 'DATE' || fieldKey === 'TITLE' || fieldKey === 'CONTENT') ? 3 : 1;
        if (fieldKey === 'DATE' || fieldKey === 'TITLE' || fieldKey === 'CONTENT') {
          requiredHits += 1;
        }
      }
    });

    if (!best || score > best.score || (score === best.score && requiredHits > best.requiredHits)) {
      best = {
        rowIndex: rowIndex,
        score: score,
        requiredHits: requiredHits
      };
    }
  }

  if (!best || best.score < 3 || best.requiredHits < 2) {
    return 0;
  }

  return best.rowIndex;
}

function buildRecognizedFieldList_(headerIndexMap) {
  return Object.keys(headerIndexMap || {}).filter(function(key) {
    return headerIndexMap[key] !== null && headerIndexMap[key] !== undefined;
  });
}

function buildProgramJournalSummaryByDateFromValues_(values, selectedYear) {
  if (!values || !values.length) {
    return {};
  }

  const headerRowIndex = detectProgramJournalHeaderRow_(values);
  const headers = values[headerRowIndex] || [];
  const headerIndexMap = buildProgramJournalHeaderIndexMap_(headers);
  if (headerIndexMap.DATE === null || (headerIndexMap.TITLE === null && headerIndexMap.CONTENT === null)) {
    return {};
  }

  const summaryByDate = {};

  values.slice(headerRowIndex + 1).forEach(function(row) {
    const dateKey = normalizeProgramJournalDateKey_(row[headerIndexMap.DATE], selectedYear);
    if (!dateKey) {
      return;
    }

    const title = headerIndexMap.TITLE !== null ? valueOrEmpty_(row[headerIndexMap.TITLE]).trim() : '';
    const content = headerIndexMap.CONTENT !== null ? valueOrEmpty_(row[headerIndexMap.CONTENT]).trim() : '';
    const target = headerIndexMap.TARGET !== null ? valueOrEmpty_(row[headerIndexMap.TARGET]).trim() : '';
    const count = headerIndexMap.COUNT !== null ? valueOrEmpty_(row[headerIndexMap.COUNT]).trim() : '';
    const nameList = headerIndexMap.NAME_LIST !== null ? valueOrEmpty_(row[headerIndexMap.NAME_LIST]).trim() : '';
    const teacher = headerIndexMap.TEACHER !== null ? valueOrEmpty_(row[headerIndexMap.TEACHER]).trim() : '';
    const note = headerIndexMap.NOTE !== null ? valueOrEmpty_(row[headerIndexMap.NOTE]).trim() : '';

    const programName = title || content;
    if (!programName) {
      return;
    }
    if (!summaryByDate[dateKey]) {
      summaryByDate[dateKey] = [];
    }

    const participantParts = [];
    if (nameList) {
      participantParts.push(nameList);
    }
    if (target) {
      participantParts.push(target);
    }
    if (count) {
      participantParts.push('참여 ' + count);
    }
    if (teacher) {
      participantParts.push('담당 ' + teacher);
    }
    if (note && note !== programName) {
      participantParts.push(note);
    }

      const item = {
        title: programName,
        participants: participantParts.join(' / ').trim(),
        rawText: [programName].concat(participantParts).filter(Boolean).join(' / ')
      };

    const exists = summaryByDate[dateKey].some(function(existing) {
      return existing && existing.title === item.title && existing.participants === item.participants;
    });
    if (!exists) {
      summaryByDate[dateKey].push(item);
    }
  });

  return summaryByDate;
}

function buildProgramJournalAnalysisPayload_(resolved, values) {
  const sheet = resolved.sheet;
  const normalizedYear = resolved.year;
  const headerRowIndex = values.length ? detectProgramJournalHeaderRow_(values) : 0;
  const headers = values.length ? (values[headerRowIndex] || []) : [];
  const headerIndexMap = buildProgramJournalHeaderIndexMap_(headers);
  const recognizedFields = buildRecognizedFieldList_(headerIndexMap);
  const recommendedFields = ['DATE', 'TITLE', 'NAME_LIST', 'TARGET', 'COUNT', 'TEACHER'];
  const summaryByDate = buildProgramJournalSummaryByDateFromValues_(values, normalizedYear);
  const sampleDates = Object.keys(summaryByDate).sort().slice(0, 7);
  const sampleItems = sampleDates.map(function(dateKey) {
    const items = summaryByDate[dateKey] || [];
    return {
      date: dateKey,
      count: items.length,
      titles: items.map(function(item) {
        return item.title;
      }).filter(Boolean),
      participants: items.map(function(item) {
        return item.participants;
      }).filter(Boolean).slice(0, 3)
    };
  });

  return {
    year: normalizedYear,
    sheetName: sheet.getName(),
    found: true,
    analyzedAt: new Date().toISOString(),
    headerRowNumber: headerRowIndex + 1,
    headers: headers,
    headerIndexMap: headerIndexMap,
    recognizedFields: recognizedFields,
    missingRecommendedFields: recommendedFields.filter(function(fieldKey) {
      return recognizedFields.indexOf(fieldKey) === -1;
    }),
    rowCount: Math.max(values.length - 1, 0),
    dateCount: Object.keys(summaryByDate).length,
    sampleDates: sampleDates,
    sampleItems: sampleItems
  };
}

function saveProgramJournalAnalysisIfNeeded_(selectedYear, payload) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (programJournalAnalysisSavedMemo_[normalizedYear]) {
    return;
  }
  writeDataStoreJson_('program_journal_analysis', normalizedYear, payload);
  programJournalAnalysisSavedMemo_[normalizedYear] = true;
}

function getProgramJournalBundleByYear_(selectedYear) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolved = resolveProgramJournalSheet_(spreadsheet, selectedYear);
  const normalizedYear = resolved.year;
  if (programJournalBundleMemo_[normalizedYear]) {
    return programJournalBundleMemo_[normalizedYear];
  }

  if (!resolved.sheet) {
    const emptyPayload = {
      year: normalizedYear,
      sheetName: '',
      found: false,
      message: resolved.errorMessage || '프로그램 일지 시트를 찾지 못했습니다.',
      analyzedAt: new Date().toISOString(),
      headers: [],
      headerIndexMap: {},
      rowCount: 0,
      dateCount: 0,
      sampleDates: [],
      sampleItems: []
    };
    const emptyBundle = {
      year: normalizedYear,
      sheet: null,
      values: [],
      summaryByDate: {},
      analysis: emptyPayload
    };
    programJournalBundleMemo_[normalizedYear] = emptyBundle;
    saveProgramJournalAnalysisIfNeeded_(normalizedYear, emptyPayload);
    return emptyBundle;
  }

  const sheet = resolved.sheet;
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const values = lastRow > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues()
    : [];
  const summaryByDate = buildProgramJournalSummaryByDateFromValues_(values, normalizedYear);
  const analysis = buildProgramJournalAnalysisPayload_(resolved, values);
  const bundle = {
    year: normalizedYear,
    sheet: sheet,
    values: values,
    summaryByDate: summaryByDate,
    analysis: analysis
  };
  programJournalBundleMemo_[normalizedYear] = bundle;
  saveProgramJournalAnalysisIfNeeded_(normalizedYear, analysis);
  return bundle;
}

function inspectProgramJournalByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const bundle = getProgramJournalBundleByYear_(normalizedYear);
  saveProgramJournalAnalysisIfNeeded_(normalizedYear, bundle.analysis);
  return bundle.analysis;
}

function inspectProgramJournalByYearJson(selectedYear) {
  return JSON.stringify(inspectProgramJournalByYear_(selectedYear), null, 2);
}

function readProgramJournalSummaryByDate_(selectedYear) {
  return getProgramJournalBundleByYear_(selectedYear).summaryByDate;
}

function getProgramJournalTextsForDate_(programByDate, dateValue) {
  const normalizedDate = normalizeAssistantDateKey_(dateValue) || normalizeDateKey_(dateValue);
  if (!normalizedDate) {
    return [];
  }
  return ((programByDate && programByDate[normalizedDate]) || []).map(function(item) {
    return item && item.rawText ? item.rawText : valueOrEmpty_(item).trim();
  }).filter(Boolean);
}

function getProgramJournalItemsForDate_(programByDate, dateValue) {
  const normalizedDate = normalizeAssistantDateKey_(dateValue) || normalizeDateKey_(dateValue);
  if (!normalizedDate) {
    return [];
  }
  return ((programByDate && programByDate[normalizedDate]) || []).map(function(item) {
    if (item && typeof item === 'object') {
      return {
        title: valueOrEmpty_(item.title).trim(),
        participants: valueOrEmpty_(item.participants).trim(),
        rawText: valueOrEmpty_(item.rawText).trim()
      };
    }
    return {
      title: valueOrEmpty_(item).trim(),
      participants: '',
      rawText: valueOrEmpty_(item).trim()
    };
  }).filter(function(item) {
    return item.title || item.participants || item.rawText;
  });
}

function applyProgramJournalToLogDataByDates_(dates, selectedYear, runtimeOptions) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const programBundle = getProgramJournalBundleByYear_(resolvedYear);
  saveProgramJournalAnalysisIfNeeded_(resolvedYear, programBundle.analysis);
  const programByDate = programBundle.summaryByDate;
  const dateKeys = uniqueStrings_((dates || []).map(function(date) {
    return normalizeAssistantDateKey_(date) || normalizeDateKey_(date);
  }).filter(Boolean)).sort();
  const targetDates = dateKeys.filter(function(dateKey) {
    return !!(programByDate[dateKey] && programByDate[dateKey].length);
  });

  if (!targetDates.length) {
    return {
      updatedCount: 0,
      insertedCount: 0,
      appliedCount: 0,
    };
  }

  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const logSheet = logDataResult.sheet;
  if (!logSheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(resolvedYear) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(logSheet);
  const context = buildLogSheetBatchUpdateContext_(logSheet, fieldMap, targetDates);
  let updatedCount = 0;

  targetDates.forEach(function(dateKey) {
    const rowInfo = getLogSheetBatchRowValues_(context, dateKey);
    if (!rowInfo) {
      return;
    }

    const nextRow = rowInfo.values.slice();
    applyManagerAndStaffWorkerToRowValues_(nextRow, fieldMap, dateKey, resolvedYear);
    const existingNotes = valueOrEmpty_(getOptionalRowFieldValue_(nextRow, fieldMap, 'MISC_NOTES')).trim();
    const nextNotes = stripProgramJournalMarkerFromNotes_(existingNotes);
    if (nextNotes !== existingNotes) {
      setRowValueByFieldMap_(nextRow, fieldMap, 'MISC_NOTES', nextNotes);
      updatedCount += 1;
    }
    setLogSheetBatchRowValues_(context, rowInfo, nextRow);
  });

  commitLogSheetBatchUpdate_(logSheet, context);
  if (!(runtimeOptions && runtimeOptions.deferSort) && (context.insertedCount || 0) > 0) {
    sortLogDataSheetByDate_(logSheet, getFieldMap_(logSheet));
  }
  if (!(runtimeOptions && runtimeOptions.deferFlush)) {
    SpreadsheetApp.flush();
    formatLogDataSheet_(logSheet);
  }

  return {
    updatedCount: updatedCount,
    insertedCount: context.insertedCount || 0,
    appliedCount: targetDates.length,
    appliedDates: targetDates,
  };
}

function buildProgramJournalMarkerText_(programItems) {
  const titles = uniqueStrings_((programItems || []).map(function(item) {
    return valueOrEmpty_(item && item.title).trim();
  }).filter(Boolean));

  if (!titles.length) {
    return '';
  }

  if (titles.length <= 2) {
    return '프로그램일지: ' + titles.join(', ');
  }

  return '프로그램일지: ' + titles.slice(0, 2).join(', ') + ' 외 ' + (titles.length - 2) + '건';
}

function mergeProgramJournalMarkerIntoNotes_(existingText, programItems) {
  const baseText = valueOrEmpty_(existingText).trim();
  const markerText = buildProgramJournalMarkerText_(programItems);
  if (!markerText) {
    return baseText.split(/\r?\n/).map(function(line) {
      return valueOrEmpty_(line).trim();
    }).filter(function(line) {
      return line && line.indexOf('프로그램일지:') !== 0;
    }).join('\n');
  }
  const preservedLines = baseText.split(/\r?\n/).map(function(line) {
    return valueOrEmpty_(line).trim();
  }).filter(function(line) {
    return line && line.indexOf('프로그램일지:') !== 0;
  });
  preservedLines.push(markerText);
  return uniqueStrings_(preservedLines).join('\n');
}

function buildProgramJournalTitleText_(programItems) {
  const titles = uniqueStrings_((programItems || []).map(function(item) {
    return valueOrEmpty_(item && item.title).trim();
  }).filter(Boolean));
  return titles.join('\n');
}

function buildProgramJournalParticipantsText_(programItems) {
  return (programItems || []).map(function(item) {
    const title = valueOrEmpty_(item && item.title).trim();
    const participants = valueOrEmpty_(item && item.participants).trim();
    if (title && participants) {
      return '[' + title + ']\n' + participants;
    }
    return participants || title;
  }).filter(Boolean).join('\n\n');
}
