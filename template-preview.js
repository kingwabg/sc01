function getTemplateSyncVersion_() {
  return String(PropertiesService.getDocumentProperties().getProperty(TEMPLATE_SYNC_VERSION_PROPERTY_KEY) || '0').trim() || '0';
}

function touchTemplateSyncVersion_() {
  PropertiesService.getDocumentProperties().setProperty(TEMPLATE_SYNC_VERSION_PROPERTY_KEY, String(Date.now()));
}

function getTemplatePreviewPdfCachePropertyKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return TEMPLATE_PREVIEW_PDF_CACHE_PROPERTY_PREFIX + normalizedYear;
}

function readTemplatePreviewPdfCacheSession_(selectedYear) {
  const key = getTemplatePreviewPdfCachePropertyKey_(selectedYear);
  const rawValue = String(PropertiesService.getDocumentProperties().getProperty(key) || '').trim();
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    Logger.log('readTemplatePreviewPdfCacheSession_ parse failed: %s', error.message);
    return null;
  }
}

function saveTemplatePreviewPdfCacheSession_(selectedYear, session) {
  const key = getTemplatePreviewPdfCachePropertyKey_(selectedYear);
  PropertiesService.getDocumentProperties().setProperty(key, JSON.stringify(session || {}));
  return session;
}

function clearTemplatePreviewPdfCache_(selectedYear) {
  const key = getTemplatePreviewPdfCachePropertyKey_(selectedYear);
  const session = readTemplatePreviewPdfCacheSession_(selectedYear);
  if (session && session.fileId) {
    try {
      const file = DriveApp.getFileById(session.fileId);
      if (!file.isTrashed()) {
        file.setTrashed(true);
      }
    } catch (error) {
      Logger.log('clearTemplatePreviewPdfCache_ cleanup failed: %s', error.message);
    }
  }
  PropertiesService.getDocumentProperties().deleteProperty(key);
}

function clearAllTemplatePreviewPdfCaches_() {
  const properties = PropertiesService.getDocumentProperties();
  const values = properties.getProperties();
  Object.keys(values).forEach(function(key) {
    if (key.indexOf(TEMPLATE_PREVIEW_PDF_CACHE_PROPERTY_PREFIX) === 0) {
      const selectedYear = key.slice(TEMPLATE_PREVIEW_PDF_CACHE_PROPERTY_PREFIX.length);
      clearTemplatePreviewPdfCache_(selectedYear);
    }
  });
}

function getTemplatePreviewWorkspaceSession_() {
  const rawValue = String(PropertiesService.getDocumentProperties().getProperty(TEMPLATE_PREVIEW_WORKSPACE_PROPERTY_KEY) || '').trim();
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    Logger.log('getTemplatePreviewWorkspaceSession_ parse failed: %s', error.message);
    return null;
  }
}

function saveTemplatePreviewWorkspaceSession_(session) {
  PropertiesService.getDocumentProperties().setProperty(TEMPLATE_PREVIEW_WORKSPACE_PROPERTY_KEY, JSON.stringify(session || {}));
  return session;
}

function clearTemplatePreviewWorkspaceSession_() {
  PropertiesService.getDocumentProperties().deleteProperty(TEMPLATE_PREVIEW_WORKSPACE_PROPERTY_KEY);
}

function getOrCreateTemplatePreviewWorkspace_() {
  const session = getTemplatePreviewWorkspaceSession_();
  if (session && session.spreadsheetId) {
    try {
      const file = DriveApp.getFileById(session.spreadsheetId);
      if (!file.isTrashed()) {
        return {
          spreadsheet: SpreadsheetApp.openById(session.spreadsheetId),
          file: file,
          session: session,
          reused: true,
        };
      }
    } catch (error) {
      Logger.log('getOrCreateTemplatePreviewWorkspace_ reopen failed: %s', error.message);
    }
  }

  const spreadsheet = SpreadsheetApp.create('운영일지_실험미리보기_작업장');
  const file = DriveApp.getFileById(spreadsheet.getId());
  saveTemplatePreviewWorkspaceSession_({
    spreadsheetId: spreadsheet.getId(),
    url: spreadsheet.getUrl(),
    createdAt: new Date().toISOString(),
  });

  return {
    spreadsheet: spreadsheet,
    file: file,
    session: {
      spreadsheetId: spreadsheet.getId(),
      url: spreadsheet.getUrl(),
      createdAt: new Date().toISOString(),
      templateSyncVersion: '',
    },
    reused: false,
  };
}

function resetTemplatePreviewWorkspace_(workspace) {
  const sheets = workspace.getSheets();
  if (!sheets.length) {
    workspace.insertSheet('_PREVIEW_PLACEHOLDER');
    return;
  }

  const keeper = sheets[0];
  for (let index = sheets.length - 1; index >= 1; index -= 1) {
    workspace.deleteSheet(sheets[index]);
  }

  keeper.setName('_PREVIEW_PLACEHOLDER');
  keeper.clear();
  keeper.clearNotes();
  keeper.clearFormats();
  keeper.getImages().forEach(function(image) {
    try {
      image.remove();
    } catch (error) {
      Logger.log('resetTemplatePreviewWorkspace_ image cleanup failed: %s', error.message);
    }
  });
}

function getTemplatePreviewWorkspaceContentSheets_(workspace) {
  return workspace.getSheets().filter(function(sheet) {
    return sheet.getName() !== '_PREVIEW_PLACEHOLDER';
  });
}

function prepareTemplatePreviewWorkspaceSheets_(workspace, workspaceSession, templateSheet, reports, markerMap, stampBlobCache, approvalAnchorMap) {
  const safeReports = Array.isArray(reports) ? reports : [];
  const currentTemplateSyncVersion = getTemplateSyncVersion_();
  const needsFullRebuild = !workspaceSession
    || workspaceSession.templateSyncVersion !== currentTemplateSyncVersion;

  if (needsFullRebuild) {
    resetTemplatePreviewWorkspace_(workspace);
    const copiedSheets = copyTemplateSheetsIntoSpreadsheet_(templateSheet, workspace, safeReports, markerMap, stampBlobCache, approvalAnchorMap);
    workspace.getSheets().forEach(function(sheet) {
      const isCopiedSheet = copiedSheets.some(function(copiedSheet) {
        return copiedSheet.getSheetId() === sheet.getSheetId();
      });
      if (!isCopiedSheet && workspace.getSheets().length > 1) {
        workspace.deleteSheet(sheet);
      }
    });
    return {
      sheets: copiedSheets,
      rebuilt: true,
      templateSyncVersion: currentTemplateSyncVersion,
    };
  }

  let contentSheets = getTemplatePreviewWorkspaceContentSheets_(workspace);
  if (!contentSheets.length) {
    const copiedSheets = copyTemplateSheetsIntoSpreadsheet_(templateSheet, workspace, safeReports, markerMap, stampBlobCache, approvalAnchorMap);
    return {
      sheets: copiedSheets,
      rebuilt: true,
      templateSyncVersion: currentTemplateSyncVersion,
    };
  }

  while (contentSheets.length < safeReports.length) {
    const duplicated = contentSheets[contentSheets.length - 1].copyTo(workspace);
    contentSheets.push(duplicated);
  }

  while (contentSheets.length > safeReports.length && workspace.getSheets().length > 1) {
    const sheetToDelete = contentSheets.pop();
    workspace.deleteSheet(sheetToDelete);
  }

  contentSheets = getTemplatePreviewWorkspaceContentSheets_(workspace);
  contentSheets.forEach(function(sheet, index) {
    sheet.setName('_PREVIEW_TMP_' + (index + 1) + '_' + Date.now());
  });
  contentSheets.forEach(function(sheet, index) {
    sheet.setName(buildTemplatePreviewSheetName_(safeReports[index], index));
    populateTemplatePreviewSheet_(sheet, safeReports[index], markerMap, stampBlobCache, {
      deferFlush: true,
      approvalAnchorMap: approvalAnchorMap,
    });
  });

  return {
    sheets: contentSheets,
    rebuilt: false,
    templateSyncVersion: currentTemplateSyncVersion,
  };
}

function getTemplateEditWorkspacePropertyKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return 'TEMPLATE_EDIT_WORKSPACE_' + normalizedYear;
}

function saveTemplateEditWorkspaceSession_(selectedYear, session) {
  const key = getTemplateEditWorkspacePropertyKey_(selectedYear);
  PropertiesService.getDocumentProperties().setProperty(key, JSON.stringify(session || {}));
  return session;
}

function clearTemplateEditWorkspaceSession_(selectedYear) {
  const key = getTemplateEditWorkspacePropertyKey_(selectedYear);
  PropertiesService.getDocumentProperties().deleteProperty(key);
}

function getTemplateEditWorkspaceSession_(selectedYear) {
  const key = getTemplateEditWorkspacePropertyKey_(selectedYear);
  const rawValue = String(PropertiesService.getDocumentProperties().getProperty(key) || '').trim();
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    Logger.log('getTemplateEditWorkspaceSession_ parse failed: %s', error.message);
    return null;
  }
}

function getTemplateEditWorkspaceSessionInfo(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const session = getTemplateEditWorkspaceSession_(normalizedYear);
  if (!session || !session.spreadsheetId) {
    throw new Error('최근 생성된 편집용 템플릿 시트를 찾지 못했습니다. 먼저 편집용 시트를 생성해주세요.');
  }

  const file = DriveApp.getFileById(session.spreadsheetId);
  if (file.isTrashed()) {
    clearTemplateEditWorkspaceSession_(normalizedYear);
    throw new Error('마지막 편집본이 이미 삭제되었습니다. 새로 편집용 템플릿을 만들어주세요.');
  }

  return {
    spreadsheetId: session.spreadsheetId,
    url: session.url || file.getUrl(),
    name: session.name || file.getName(),
    createdAt: session.createdAt || '',
    year: normalizedYear,
    rowCount: Number(session.rowCount) || 0,
  };
}

function buildTemplateReportsByRowNumbers_(rowNumbers, selectedYear) {
  const settings = getAutomationSettings_();
  return getReportsByRowNumbers_(rowNumbers, selectedYear).map(function(report) {
    report.approvalSlots = buildApprovalSlotsForReport_(report, settings);
    return report;
  });
}

function cleanupTemplateEditWorkspaceSession_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const previousSession = getTemplateEditWorkspaceSession_(normalizedYear);
  if (previousSession && previousSession.spreadsheetId) {
    try {
      const previousFile = DriveApp.getFileById(previousSession.spreadsheetId);
      if (!previousFile.isTrashed()) {
        previousFile.setTrashed(true);
      }
    } catch (cleanupError) {
      Logger.log('cleanupTemplateEditWorkspaceSession_ failed: %s', cleanupError.message);
    }
  }
  clearTemplateEditWorkspaceSession_(normalizedYear);
}

function buildTemplateWorkspaceSessionInfo_(workspace, normalizedYear, reports, sessionTimestamp) {
  const previewDates = (reports || [])
    .map(function(report) { return normalizeDateKey_(report && report.date); })
    .filter(Boolean)
    .sort();
  const firstDateKey = previewDates[0] || '';
  const lastDateKey = previewDates[previewDates.length - 1] || '';

  return {
    spreadsheetId: workspace.getId(),
    url: workspace.getUrl(),
    name: workspace.getName(),
    createdAt: new Date().toISOString(),
    year: normalizedYear,
    rowCount: reports.length,
    firstDate: firstDateKey,
    lastDate: lastDateKey,
    previewDates: previewDates,
    sessionTimestamp: sessionTimestamp,
  };
}

function buildTemplateWorkspaceMetaRows_(reports, normalizedYear, sessionTimestamp) {
  const rows = [['sheetName', 'rowNumber', 'year', 'date', 'createdAt']];
  (reports || []).forEach(function(report, index) {
    rows.push([
      buildTemplatePreviewSheetName_(report, index),
      report.rowNumber,
      normalizedYear,
      valueOrEmpty_(report.date),
      sessionTimestamp,
    ]);
  });
  return rows;
}

function copyTemplateSheetsIntoSpreadsheet_(templateSheet, targetSpreadsheet, reports, markerMap, stampBlobCache, approvalAnchorMap) {
  const safeReports = Array.isArray(reports) ? reports : [];
  if (!safeReports.length) {
    return [];
  }

  const copiedSheets = [];
  const seedSheet = templateSheet.copyTo(targetSpreadsheet);
  copiedSheets.push(seedSheet);

  for (let index = 1; index < safeReports.length; index += 1) {
    copiedSheets.push(seedSheet.copyTo(targetSpreadsheet));
  }

  copiedSheets.forEach(function(copiedSheet, index) {
    copiedSheet.setName(buildTemplatePreviewSheetName_(safeReports[index], index));
  });

  copiedSheets.forEach(function(copiedSheet, index) {
    populateTemplatePreviewSheet_(copiedSheet, safeReports[index], markerMap, stampBlobCache, {
      skipImageReset: true,
      deferFlush: true,
      approvalAnchorMap: approvalAnchorMap,
    });
  });

  return copiedSheets;
}

function populateTemplateWorkspaceSheets_(workspace, templateSheet, reports, markerMap, stampBlobCache) {
  const copiedSheets = copyTemplateSheetsIntoSpreadsheet_(templateSheet, workspace, reports, markerMap, stampBlobCache);

  workspace.getSheets().forEach(function(sheet) {
    const isCopiedSheet = copiedSheets.some(function(copiedSheet) {
      return copiedSheet.getSheetId() === sheet.getSheetId();
    });
    if (!isCopiedSheet && workspace.getSheets().length > 1) {
      workspace.deleteSheet(sheet);
    }
  });

  return copiedSheets;
}

function readTemplateWorkspaceMetaRows_(workspace, normalizedYear) {
  const metaSheet = workspace.getSheetByName('_EDIT_META');
  if (!metaSheet) {
    throw new Error('편집용 시트의 메타 정보를 찾지 못했습니다.');
  }

  return metaSheet.getDataRange().getValues().slice(1).map(function(row) {
    return {
      sheetName: valueOrEmpty_(row[0]).trim(),
      rowNumber: Number(row[1]) || 0,
      year: normalizeAttendanceYear_(row[2]) || normalizedYear,
    };
  }).filter(function(item) {
    return item.sheetName && item.rowNumber;
  });
}

function buildEditedReportsFromWorkspace_(workspace, metaRows, normalizedYear) {
  const rowNumbers = metaRows.map(function(item) { return item.rowNumber; });
  const baseReports = getReportsByRowNumbers_(rowNumbers, normalizedYear).reduce(function(result, report) {
    result[String(report.rowNumber)] = report;
    return result;
  }, {});
  const markerMap = getEffectiveTemplateMarkerMap_();
  const reports = [];

  metaRows.forEach(function(meta) {
    const editSheet = workspace.getSheetByName(meta.sheetName);
    const baseReport = baseReports[String(meta.rowNumber)];
    if (!editSheet || !baseReport) {
      return;
    }
    const report = JSON.parse(JSON.stringify(baseReport));
    applyTemplateEditSheetValuesToReport_(report, editSheet, markerMap);
    reports.push(report);
  });

  return reports;
}

function createTemplateEditWorkspaceByDates(dates, selectedYear) {
  const resolved = resolveLogDataRowNumbersByDates_(dates, selectedYear);
  return createTemplateEditWorkspaceByRowNumbers(resolved.rowNumbers, resolved.year);
}

function createTemplateEditWorkspaceByRowNumbers(rowNumbers, selectedYear) {
  const reports = buildTemplateReportsByRowNumbers_(rowNumbers, selectedYear);

  if (!reports.length) {
    throw new Error('편집용 시트를 만들 데이터가 없습니다.');
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트를 찾을 수 없습니다.");
  }

  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  cleanupTemplateEditWorkspaceSession_(normalizedYear);

  const markerMap = getEffectiveTemplateMarkerMap_();
  const stampBlobCache = {};
  const sessionTimestamp = Utilities.formatDate(new Date(), LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyyMMdd_HHmmss');
  const previewDates = reports.map(function(report) { return normalizeDateKey_(report && report.date); }).filter(Boolean).sort();
  const firstDateKey = previewDates[0] || '';
  const lastDateKey = previewDates[previewDates.length - 1] || '';
  const dateLabel = firstDateKey && lastDateKey
    ? firstDateKey.replace(/-/g, '') + (firstDateKey === lastDateKey ? '' : '_' + lastDateKey.replace(/-/g, ''))
    : sessionTimestamp;
  const workspace = SpreadsheetApp.create('운영일지 편집_' + normalizedYear + '_' + dateLabel + '_' + reports.length + '건');
  const metaRows = buildTemplateWorkspaceMetaRows_(reports, normalizedYear, sessionTimestamp);

  try {
    populateTemplateWorkspaceSheets_(workspace, templateSheet, reports, markerMap, stampBlobCache);

    const metaSheet = workspace.insertSheet('_EDIT_META');
    metaSheet.getRange(1, 1, metaRows.length, metaRows[0].length).setValues(metaRows);
    metaSheet.hideSheet();

    SpreadsheetApp.flush();

    const session = buildTemplateWorkspaceSessionInfo_(workspace, normalizedYear, reports, sessionTimestamp);
    saveTemplateEditWorkspaceSession_(normalizedYear, session);

    return session;
  } catch (error) {
    try {
      DriveApp.getFileById(workspace.getId()).setTrashed(true);
    } catch (cleanupError) {
      Logger.log('createTemplateEditWorkspaceByRowNumbers cleanup failed: %s', cleanupError.message);
    }
    throw error;
  }
}

function applyTemplateEditWorkspaceToLogData(selectedYear) {
  return withYearWriteLock_(selectedYear, '편집본 반영', function() {
    return applyTemplateEditWorkspaceToLogDataUnlocked_(selectedYear);
  });
}

function applyTemplateEditWorkspaceToLogDataUnlocked_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const session = getTemplateEditWorkspaceSessionInfo(normalizedYear);

  const workspace = SpreadsheetApp.openById(session.spreadsheetId);
  const metaRows = readTemplateWorkspaceMetaRows_(workspace, normalizedYear);

  if (!metaRows.length) {
    throw new Error('반영할 편집 시트 정보가 없습니다.');
  }

  const reports = buildEditedReportsFromWorkspace_(workspace, metaRows, normalizedYear);

  if (!reports.length) {
    throw new Error('편집 시트에서 반영할 데이터를 읽지 못했습니다.');
  }

  const saveResult = savePreviewEditsUnlocked_({
    reports: reports,
    year: normalizedYear,
  });
  clearAttendanceYearCache_(normalizedYear);

  try {
    DriveApp.getFileById(session.spreadsheetId).setTrashed(true);
  } catch (cleanupError) {
    Logger.log('applyTemplateEditWorkspaceToLogData cleanup failed: %s', cleanupError.message);
  }
  clearTemplateEditWorkspaceSession_(normalizedYear);

  return {
    appliedCount: saveResult.savedCount || reports.length,
    workspaceUrl: session.url || '',
    workspaceName: session.name || '',
    cleanedUp: true,
  };
}

function resolveLogDataRowNumbersByDates_(dates, selectedYear) {
  SpreadsheetApp.flush();
  const normalizedDates = uniqueStrings_((dates || []).map(function(date) {
    return normalizeDateKey_(date);
  })).filter(Boolean);

  if (!normalizedDates.length) {
    throw new Error('대상 날짜가 없습니다.');
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedYear = normalizeAttendanceYear_(selectedYear) || resolveAttendanceDialogYear_(spreadsheet);
  const logDataResult = resolveLogDataSheet_(spreadsheet, resolvedYear);
  const sheet = logDataResult.sheet;

  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(sheet);
  const dateRowMap = buildLogDataDateRowMap_(sheet, fieldMap);
  const rowNumbers = normalizedDates
    .map(function(dateKey) {
      return dateRowMap[dateKey];
    })
    .filter(Boolean)
    .sort(function(a, b) {
      return a - b;
    });

  if (!rowNumbers.length) {
    throw new Error('선택한 날짜에 해당하는 일지데이터가 없습니다. 먼저 반영 후 다시 시도해주세요.');
  }

  return {
    year: resolvedYear,
    rowNumbers: rowNumbers,
  };
}

function previewLogsByDates(dates, selectedYear, autoPrint) {
  const resolved = resolveLogDataRowNumbersByDates_(dates, selectedYear);
  previewLogsByRowNumbers(resolved.rowNumbers, resolved.year, autoPrint);
}

function getTemplateDrivenPreviewHtmlPayloadByDates(dates, selectedYear, autoPrint) {
  const resolved = resolveLogDataRowNumbersByDates_(dates, selectedYear);
  return buildTemplateDrivenPreviewHtmlPayload_(resolved.rowNumbers, resolved.year, !!autoPrint);
}

function inspectFirstLogDataOnlyPreviewJson() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const years = [2026, 2025, 2024];
  for (let index = 0; index < years.length; index += 1) {
    const year = years[index];
    const logDataResult = resolveLogDataSheet_(spreadsheet, year);
    const sheet = logDataResult.sheet;
    if (!sheet || sheet.getLastRow() < LOG_PRINT_CONFIG.DATA_START_ROW) {
      continue;
    }
    const fieldMap = getFieldMap_(sheet);
    const rowCount = sheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1;
    const dateValues = sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, fieldMap.DATE + 1, rowCount, 1).getValues();
    for (let rowIndex = 0; rowIndex < dateValues.length; rowIndex += 1) {
      const dateKey = normalizeAssistantDateKey_(dateValues[rowIndex][0]) || normalizeDateKey_(dateValues[rowIndex][0]);
      if (!dateKey) {
        continue;
      }
      const rowNumber = LOG_PRINT_CONFIG.DATA_START_ROW + rowIndex;
      const payload = buildTemplateDrivenPreviewHtmlPayload_([rowNumber], year, false);
      return JSON.stringify({
        ok: true,
        year: year,
        date: dateKey,
        rowNumber: rowNumber,
        pageCount: payload.pageCount || 0,
        reportCount: payload.reports && payload.reports.length || 0,
        htmlLength: String(payload.pagesHtml || '').length,
        generatedAt: payload.generatedAt || '',
      }, null, 2);
    }
  }
  return JSON.stringify({
    ok: false,
    message: '24~26년 일지데이터에서 날짜가 있는 행을 찾지 못했습니다.',
  }, null, 2);
}

function inspectLogDataWorks20250102Json() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('25년 일지데이터');
  if (!sheet) {
    return JSON.stringify({ ok: false, message: '25년 일지데이터 시트가 없습니다.' }, null, 2);
  }
  const fieldMap = getFieldMap_(sheet);
  const dateRowMap = buildLogDataDateRowMap_(sheet, fieldMap);
  const rowNumber = dateRowMap['2025-01-02'];
  if (!rowNumber) {
    return JSON.stringify({ ok: false, message: '2025-01-02 행을 찾지 못했습니다.' }, null, 2);
  }
  const columnCount = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const headers = sheet.getRange(1, 1, 1, columnCount).getDisplayValues()[0];
  const values = sheet.getRange(rowNumber, 1, 1, columnCount).getDisplayValues()[0];
  const workIndexes = fieldMap.WORKS || [];
  const works = workIndexes.map(function(columnIndex, index) {
    return {
      slot: '업무' + (index + 1),
      column: columnNumberToLetter_(columnIndex + 1),
      header: valueOrEmpty_(headers[columnIndex]).trim(),
      value: valueOrEmpty_(values[columnIndex]),
    };
  });
  return JSON.stringify({
    ok: true,
    sheetName: sheet.getName(),
    date: '2025-01-02',
    rowNumber: rowNumber,
    selectedWorkColumns: workIndexes.map(function(columnIndex) {
      return columnNumberToLetter_(columnIndex + 1);
    }),
    works: works,
  }, null, 2);
}

function inspectPreviewWorks20250102Json() {
  const payload = getTemplateDrivenPreviewHtmlPayloadByDates(['2025-01-02'], 2025, false);
  const html = String(payload.pagesHtml || '');
  const marker = '점심식사 후 휴식';
  const markerCount = (html.match(new RegExp(marker, 'g')) || []).length;
  return JSON.stringify({
    ok: true,
    date: '2025-01-02',
    pageCount: payload.pageCount || 0,
    reportCount: payload.reports && payload.reports.length || 0,
    htmlLength: html.length,
    marker: marker,
    markerCount: markerCount,
    generatedAt: payload.generatedAt || '',
  }, null, 2);
}

function normalizeWorkTextForCleanup_(value) {
  return valueOrEmpty_(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanupDuplicateWorkColumnsIn2025LogDataJson() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('25년 일지데이터');
  if (!sheet) {
    return JSON.stringify({ ok: false, message: '25년 일지데이터 시트가 없습니다.' }, null, 2);
  }
  const fieldMap = getFieldMap_(sheet);
  const workIndexes = fieldMap.WORKS || [];
  const rowCount = Math.max(0, sheet.getLastRow() - LOG_PRINT_CONFIG.DATA_START_ROW + 1);
  if (!rowCount || workIndexes.length < 2) {
    return JSON.stringify({
      ok: true,
      sheetName: sheet.getName(),
      scannedRows: rowCount,
      clearedCount: 0,
      rows: [],
    }, null, 2);
  }
  const requiredColumns = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const range = sheet.getRange(LOG_PRINT_CONFIG.DATA_START_ROW, 1, rowCount, requiredColumns);
  const values = range.getValues();
  const clearedRows = [];
  let clearedCount = 0;

  values.forEach(function(row, rowIndex) {
    const seen = {};
    const clearedColumns = [];
    workIndexes.forEach(function(columnIndex) {
      const normalized = normalizeWorkTextForCleanup_(row[columnIndex]);
      if (!normalized) {
        return;
      }
      if (seen[normalized]) {
        row[columnIndex] = '';
        clearedCount += 1;
        clearedColumns.push(columnNumberToLetter_(columnIndex + 1));
        return;
      }
      seen[normalized] = true;
    });
    if (clearedColumns.length) {
      clearedRows.push({
        rowNumber: LOG_PRINT_CONFIG.DATA_START_ROW + rowIndex,
        date: normalizeAssistantDateKey_(row[fieldMap.DATE]) || normalizeDateKey_(row[fieldMap.DATE]) || valueOrEmpty_(row[fieldMap.DATE]),
        clearedColumns: clearedColumns,
      });
    }
  });

  if (clearedCount) {
    range.setValues(values);
    SpreadsheetApp.flush();
    clearAttendanceYearCache_(2025);
  }

  return JSON.stringify({
    ok: true,
    sheetName: sheet.getName(),
    scannedRows: rowCount,
    clearedCount: clearedCount,
    rows: clearedRows,
  }, null, 2);
}

function previewLogsByDatesExperimental(dates, selectedYear, autoPrint) {
  const resolved = resolveLogDataRowNumbersByDates_(dates, selectedYear);
  previewLogsByRowNumbersExperimental(resolved.rowNumbers, resolved.year, autoPrint);
}

function bytesToHexString_(bytes) {
  return (bytes || []).map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function buildTemplatePreviewReportSignature_(reports) {
  const safeReports = Array.isArray(reports) ? reports : [];
  const signatureJson = JSON.stringify(safeReports.map(function(report) {
    return {
      rowNumber: Number(report && report.rowNumber) || 0,
      date: valueOrEmpty_(report && report.date),
      operatingHours: valueOrEmpty_(report && report.operatingHours),
      manager: valueOrEmpty_(report && report.manager),
      maleCounts: Array.isArray(report && report.maleCounts) ? report.maleCounts.slice() : [],
      femaleCounts: Array.isArray(report && report.femaleCounts) ? report.femaleCounts.slice() : [],
      mealBreakfast: toNumber_(report && report.mealBreakfast),
      mealLunch: toNumber_(report && report.mealLunch),
      mealDinner: toNumber_(report && report.mealDinner),
      attendanceCapacity: toNumber_(report && report.attendanceCapacity),
      attendanceOfficial: toNumber_(report && report.attendanceOfficial),
      attendanceAlternative: toNumber_(report && report.attendanceAlternative),
      attendanceAbsent: toNumber_(report && report.attendanceAbsent),
      attendanceOther: toNumber_(report && report.attendanceOther),
      staffWorker: toNumber_(report && report.staffWorker),
      staffTeacher: toNumber_(report && report.staffTeacher),
      staffPublic: toNumber_(report && report.staffPublic),
      staffOther: toNumber_(report && report.staffOther),
      staffChanges: valueOrEmpty_(report && report.staffChanges),
      childChanges: valueOrEmpty_(report && report.childChanges),
      visitorReason: valueOrEmpty_(report && report.visitorReason),
      childSpecialCounseling: valueOrEmpty_(report && report.childSpecialCounseling),
      facilitySafetyHygiene: valueOrEmpty_(report && report.facilitySafetyHygiene),
      suppliesEnvironment: valueOrEmpty_(report && report.suppliesEnvironment),
      staffEducationTrip: valueOrEmpty_(report && report.staffEducationTrip),
      miscNotes: valueOrEmpty_(report && report.miscNotes),
      works: Array.isArray(report && report.works) ? report.works.slice() : [],
      approvalSlots: Array.isArray(report && report.approvalSlots)
        ? report.approvalSlots.map(function(slot) {
          return {
            label: valueOrEmpty_(slot && slot.label),
            name: valueOrEmpty_(slot && slot.name),
            stampUrl: valueOrEmpty_(slot && slot.stampUrl),
          };
        })
        : [],
    };
  }));
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    signatureJson,
    Utilities.Charset.UTF_8
  );
  return bytesToHexString_(digest);
}

function buildTemplatePreviewRequestKey_(reports, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return [
    normalizedYear,
    getTemplateSyncVersion_(),
    buildTemplatePreviewReportSignature_(reports),
  ].join('|');
}

function buildTemplatePreviewPdfFileUrls_(fileId) {
  const safeFileId = String(fileId || '').trim();
  if (!safeFileId) {
    return {
      openUrl: '',
      downloadUrl: '',
    };
  }
  return {
    openUrl: 'https://drive.google.com/uc?export=view&id=' + safeFileId,
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + safeFileId,
  };
}

function getCachedTemplatePreviewPdfResult_(reports, selectedYear, options) {
  const safeOptions = options || {};
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const requestKey = buildTemplatePreviewRequestKey_(reports, normalizedYear);
  const session = readTemplatePreviewPdfCacheSession_(normalizedYear);
  if (!session || !session.fileId || session.requestKey !== requestKey) {
    return null;
  }

  const createdAtMs = Number(session.createdAtMs) || 0;
  if (!createdAtMs || Date.now() - createdAtMs > TEMPLATE_PREVIEW_PDF_CACHE_TTL_MS) {
    clearTemplatePreviewPdfCache_(normalizedYear);
    return null;
  }

  try {
    const file = DriveApp.getFileById(session.fileId);
    if (file.isTrashed()) {
      clearTemplatePreviewPdfCache_(normalizedYear);
      return null;
    }

    const urls = buildTemplatePreviewPdfFileUrls_(session.fileId);
    const result = {
      requestKey: requestKey,
      fileId: session.fileId,
      fileName: session.fileName || 'preview.pdf',
      openUrl: urls.openUrl,
      downloadUrl: urls.downloadUrl,
      debug: Object.assign({}, session.debug || {}, {
        cacheHit: true,
      }),
    };

    if (safeOptions.includeBase64) {
      const pdfBlob = file.getBlob().setName(result.fileName);
      result.pdfBlob = pdfBlob;
    }

    return result;
  } catch (error) {
    Logger.log('getCachedTemplatePreviewPdfResult_ failed: %s', error.message);
    clearTemplatePreviewPdfCache_(normalizedYear);
    return null;
  }
}

function saveTemplatePreviewPdfCacheResult_(selectedYear, requestKey, pdfBlob, debugInfo) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const previousSession = readTemplatePreviewPdfCacheSession_(normalizedYear);
  if (previousSession && previousSession.fileId) {
    try {
      const previousFile = DriveApp.getFileById(previousSession.fileId);
      if (!previousFile.isTrashed()) {
        previousFile.setTrashed(true);
      }
    } catch (error) {
      Logger.log('saveTemplatePreviewPdfCacheResult_ old file cleanup failed: %s', error.message);
    }
  }

  const pdfFile = DriveApp.createFile(pdfBlob);
  const session = {
    requestKey: requestKey,
    fileId: pdfFile.getId(),
    fileName: pdfBlob.getName(),
    createdAtMs: Date.now(),
    debug: debugInfo || {},
  };
  saveTemplatePreviewPdfCacheSession_(normalizedYear, session);
  return session;
}

function buildTemplatePreviewPayloadFromResult_(result, includeBase64) {
  if (!result) {
    return {
      pdfBase64: '',
      fileId: '',
      openUrl: '',
      downloadUrl: '',
      fileName: '',
      debug: {},
    };
  }

  return {
    pdfBase64: includeBase64 && result.pdfBlob ? Utilities.base64Encode(result.pdfBlob.getBytes()) : '',
    fileId: result.fileId || '',
    openUrl: result.openUrl || '',
    downloadUrl: result.downloadUrl || '',
    fileName: result.fileName || '',
    debug: result.debug || {},
  };
}

function buildTemplateSheetPreviewPdf_(reports, selectedYear, options) {
  const safeOptions = options || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  if (!templateSheet) {
    throw new Error("'" + LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME + "' 시트를 찾을 수 없습니다.");
  }

  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const markerMap = getEffectiveTemplateMarkerMap_();
  const stampBlobCache = {};
  const requestKey = buildTemplatePreviewRequestKey_(reports, normalizedYear);
  const approvalAnchorMap = buildTemplatePreviewApprovalAnchorMap_(templateSheet, reports);
  const cached = getCachedTemplatePreviewPdfResult_(reports, normalizedYear, {
    includeBase64: !!safeOptions.includeBase64,
  });
  if (cached) {
    return buildTemplatePreviewPayloadFromResult_(cached, !!safeOptions.includeBase64);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const lockedCached = getCachedTemplatePreviewPdfResult_(reports, normalizedYear, {
      includeBase64: !!safeOptions.includeBase64,
    });
    if (lockedCached) {
      return buildTemplatePreviewPayloadFromResult_(lockedCached, !!safeOptions.includeBase64);
    }

    const workspaceResult = getOrCreateTemplatePreviewWorkspace_();
    const tempSpreadsheet = workspaceResult.spreadsheet;
    const workspacePrepareResult = prepareTemplatePreviewWorkspaceSheets_(
      tempSpreadsheet,
      workspaceResult.session,
      templateSheet,
      reports,
      markerMap,
      stampBlobCache,
      approvalAnchorMap
    );
    const copiedSheets = workspacePrepareResult.sheets;

    SpreadsheetApp.flush();
    Utilities.sleep(40);

    const pdfFileName = '운영일지_최종_' + normalizedYear + '_' + Utilities.formatDate(new Date(), LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyyMMdd_HHmmss') + '.pdf';
    const pdfBlob = exportSpreadsheetAsPdfBlob_(tempSpreadsheet.getId(), pdfFileName);
    const debugInfo = {
      reports: reports.length,
      sheets: copiedSheets.length,
      spreadsheetId: tempSpreadsheet.getId(),
      workspaceReused: !!workspaceResult.reused,
      workspaceRebuilt: !!workspacePrepareResult.rebuilt,
      cacheHit: false,
      transport: safeOptions.includeBase64 ? 'base64' : 'file',
    };

    saveTemplatePreviewWorkspaceSession_({
      spreadsheetId: tempSpreadsheet.getId(),
      url: tempSpreadsheet.getUrl(),
      createdAt: (workspaceResult.session && workspaceResult.session.createdAt) || new Date().toISOString(),
      templateSyncVersion: workspacePrepareResult.templateSyncVersion,
    });

    const savedSession = saveTemplatePreviewPdfCacheResult_(normalizedYear, requestKey, pdfBlob, debugInfo);
    const urls = buildTemplatePreviewPdfFileUrls_(savedSession.fileId);
    return buildTemplatePreviewPayloadFromResult_({
      pdfBlob: safeOptions.includeBase64 ? pdfBlob : null,
      fileId: savedSession.fileId,
      openUrl: urls.openUrl,
      downloadUrl: urls.downloadUrl,
      fileName: pdfFileName,
      debug: debugInfo,
    }, !!safeOptions.includeBase64);
  } finally {
    lock.releaseLock();
  }
}

function getEffectiveTemplateMarkerMap_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const schemaSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SCHEMA_SHEET_NAME);
  if (!schemaSheet) {
    return getTemplateMarkerMap_();
  }

  const schemaMeta = readTemplateSchemaMeta_(schemaSheet);
  const schemaMarkers = readTemplateMarkerMapFromSchema_(schemaSheet);
  const markers = (schemaMarkers && schemaMarkers.length ? schemaMarkers : getTemplateMarkerMap_()).filter(function(marker) {
    if (!schemaMeta.lastRow || !schemaMeta.lastColumn) {
      return true;
    }
    return isMarkerWithinSchemaBounds_(marker.a1, schemaMeta);
  });

  return markers.length ? markers : getTemplateMarkerMap_();
}

function buildTemplatePreviewSheetName_(report, index) {
  const dateKey = normalizeDateKey_(report && report.date) || ('page_' + (index + 1));
  const suffix = String(index + 1).padStart(2, '0');
  return ('미리보기_' + suffix + '_' + dateKey).slice(0, 99);
}

function buildTemplatePreviewApprovalAnchorMap_(templateSheet, reports) {
  const labels = uniqueStrings_((reports || []).reduce(function(result, report) {
    (report && Array.isArray(report.approvalSlots) ? report.approvalSlots : []).forEach(function(slot) {
      const label = normalizeApprovalLabel_(slot && slot.label);
      if (label) {
        result.push(label);
      }
    });
    return result;
  }, []));
  if (!templateSheet || !labels.length) {
    return {};
  }
  return findApprovalAnchorsInTemplateSheet_(templateSheet, labels.map(function(label) {
    return { label: label };
  }));
}

function populateTemplatePreviewSheet_(sheet, report, markerMap, stampBlobCache, options) {
  const safeOptions = options || {};
  if (!safeOptions.skipImageReset) {
    clearTemplatePreviewImages_(sheet);
  }

  (markerMap || []).forEach(function(marker) {
    if (!marker || !marker.a1 || !marker.fieldKey) {
      return;
    }
    const range = sheet.getRange(marker.a1);
    const value = getTemplatePreviewFieldValue_(report, marker.fieldKey);
    range.setValue(value);
  });

  if (!safeOptions.deferFlush) {
    SpreadsheetApp.flush();
  }
  applyApprovalStampsToTemplateSheet_(
    sheet,
    report && report.approvalSlots ? report.approvalSlots : [],
    stampBlobCache,
    safeOptions.approvalAnchorMap || null
  );
}

function clearTemplatePreviewImages_(sheet) {
  if (!sheet || typeof sheet.getImages !== 'function') {
    return;
  }

  sheet.getImages().forEach(function(image) {
    try {
      image.remove();
    } catch (error) {
      Logger.log('clearTemplatePreviewImages_ remove failed: %s', error.message);
    }
  });
}

function getTemplatePreviewFieldValue_(report, fieldKey) {
  switch (fieldKey) {
    case 'DATE': return formatPreviewDateLabel_(report && report.date);
    case 'OPERATING_HOURS': return valueOrEmpty_(report && report.operatingHours);
    case 'MANAGER': return valueOrEmpty_(report && report.manager);
    case 'MALE_PRESCHOOL': return toNumber_(report && report.maleCounts && report.maleCounts[0]);
    case 'MALE_OUT_OF_SCHOOL': return toNumber_(report && report.maleCounts && report.maleCounts[1]);
    case 'MALE_ELEMENTARY': return toNumber_(report && report.maleCounts && report.maleCounts[2]);
    case 'MALE_MIDDLE': return toNumber_(report && report.maleCounts && report.maleCounts[3]);
    case 'MALE_HIGH': return toNumber_(report && report.maleCounts && report.maleCounts[4]);
    case 'MALE_OTHER': return toNumber_(report && report.maleCounts && report.maleCounts[5]);
    case 'FEMALE_PRESCHOOL': return toNumber_(report && report.femaleCounts && report.femaleCounts[0]);
    case 'FEMALE_OUT_OF_SCHOOL': return toNumber_(report && report.femaleCounts && report.femaleCounts[1]);
    case 'FEMALE_ELEMENTARY': return toNumber_(report && report.femaleCounts && report.femaleCounts[2]);
    case 'FEMALE_MIDDLE': return toNumber_(report && report.femaleCounts && report.femaleCounts[3]);
    case 'FEMALE_HIGH': return toNumber_(report && report.femaleCounts && report.femaleCounts[4]);
    case 'FEMALE_OTHER': return toNumber_(report && report.femaleCounts && report.femaleCounts[5]);
    case 'MEAL_BREAKFAST': return toNumber_(report && report.mealBreakfast);
    case 'MEAL_LUNCH': return toNumber_(report && report.mealLunch);
    case 'MEAL_DINNER': return toNumber_(report && report.mealDinner);
    case 'ATTENDANCE_CAPACITY': return toNumber_(report && report.attendanceCapacity);
    case 'ATTENDANCE_OFFICIAL': return toNumber_(report && report.attendanceOfficial);
    case 'ATTENDANCE_ALTERNATIVE': return toNumber_(report && report.attendanceAlternative);
    case 'ATTENDANCE_ABSENT': return toNumber_(report && report.attendanceAbsent);
    case 'ATTENDANCE_OTHER':
      if (toNumber_(report && report.attendanceOther) !== 0) {
        return toNumber_(report && report.attendanceOther);
      }
      return toNumber_(report && report.maleCounts && report.maleCounts[5]);
    case 'STAFF_WORKER': return toNumber_(report && report.staffWorker);
    case 'STAFF_TEACHER': return toNumber_(report && report.staffTeacher);
    case 'STAFF_PUBLIC': return toNumber_(report && report.staffPublic);
    case 'STAFF_OTHER': return toNumber_(report && report.staffOther);
    case 'STAFF_CHANGES': return valueOrEmpty_(report && report.staffChanges);
    case 'CHILD_CHANGES': return valueOrEmpty_(report && report.childChanges);
    case 'VISITOR_REASON': return valueOrEmpty_(report && report.visitorReason);
    case 'CHILD_SPECIAL_COUNSELING': return valueOrEmpty_(report && report.childSpecialCounseling);
    case 'FACILITY_SAFETY_HYGIENE': return valueOrEmpty_(report && report.facilitySafetyHygiene);
    case 'SUPPLIES_ENVIRONMENT': return valueOrEmpty_(report && report.suppliesEnvironment);
    case 'STAFF_EDUCATION_TRIP': return valueOrEmpty_(report && report.staffEducationTrip);
    case 'MISC_NOTES': return valueOrEmpty_(report && report.miscNotes);
    case 'WORK_1': return valueOrEmpty_(report && report.works && report.works[0]);
    case 'WORK_2': return valueOrEmpty_(report && report.works && report.works[1]);
    case 'WORK_3': return valueOrEmpty_(report && report.works && report.works[2]);
    case 'WORK_4': return valueOrEmpty_(report && report.works && report.works[3]);
    case 'WORK_5': return valueOrEmpty_(report && report.works && report.works[4]);
    case 'WORK_6_7':
      return [valueOrEmpty_(report && report.works && report.works[5]), valueOrEmpty_(report && report.works && report.works[6])]
        .filter(function(item) { return item !== ''; })
        .join('\n');
    default:
      return '';
  }
}

function applyApprovalStampsToTemplateSheet_(sheet, approvalSlots, stampBlobCache, approvalAnchorMap) {
  const slots = Array.isArray(approvalSlots) ? approvalSlots : [];
  if (!sheet || !slots.length) {
    return;
  }

  const anchorMap = approvalAnchorMap || findApprovalAnchorsInTemplateSheet_(sheet, slots);
  slots.forEach(function(slot) {
    const label = normalizeApprovalLabel_(slot && slot.label);
    const anchor = anchorMap[label];
    const stampUrl = valueOrEmpty_(slot && slot.stampUrl).trim();
    if (!anchor || !stampUrl) {
      return;
    }

    const blob = getStampBlobForPreview_(stampUrl, stampBlobCache);
    if (!blob) {
      return;
    }

    try {
      const image = sheet.insertImage(blob, anchor.column, anchor.row, 4, 4);
      const width = Math.max(anchor.width - 8, 24);
      const height = Math.max(anchor.height - 8, 20);
      image.setWidth(width);
      image.setHeight(height);
    } catch (error) {
      Logger.log('applyApprovalStampsToTemplateSheet_ failed: %s\n%s', error.message, error.stack || '');
    }
  });
}

function findApprovalAnchorsInTemplateSheet_(sheet, approvalSlots) {
  const slots = Array.isArray(approvalSlots) ? approvalSlots : [];
  const labels = slots.map(function(slot) {
    return normalizeApprovalLabel_(slot && slot.label);
  }).filter(Boolean);
  if (!labels.length) {
    return {};
  }

  const rowLimit = Math.min(sheet.getLastRow(), 6);
  const columnLimit = Math.min(sheet.getLastColumn(), 20);
  const values = sheet.getRange(1, 1, rowLimit, columnLimit).getDisplayValues();
  const mergeMap = buildMergeLookup_(sheet.getDataRange().getMergedRanges());
  const result = {};

  labels.forEach(function(label) {
    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      let found = false;
      for (let columnIndex = 0; columnIndex < values[rowIndex].length; columnIndex += 1) {
        if (normalizeApprovalLabel_(values[rowIndex][columnIndex]) !== label) {
          continue;
        }
        const labelA1 = rowColumnToA1_(rowIndex + 1, columnIndex + 1);
        const labelMerge = mergeMap[labelA1] || { isTopLeft: true, rowspan: 1, colspan: 1 };
        if (!labelMerge.isTopLeft) {
          continue;
        }
        const targetRow = rowIndex + labelMerge.rowspan + 1;
        const targetColumn = columnIndex + 1;
        const targetA1 = rowColumnToA1_(targetRow, targetColumn);
        const targetMerge = mergeMap[targetA1] || { isTopLeft: true, rowspan: 1, colspan: labelMerge.colspan || 1 };
        const targetColspan = targetMerge.colspan || labelMerge.colspan || 1;
        const targetRowspan = targetMerge.rowspan || 1;
        result[label] = {
          row: targetRow,
          column: targetColumn,
          width: getTemplateSheetCellWidthPx_(sheet, targetColumn, targetColspan),
          height: getTemplateSheetCellHeightPx_(sheet, targetRow, targetRowspan),
        };
        found = true;
        break;
      }
      if (found) {
        break;
      }
    }
  });

  return result;
}

function getStampBlobForPreview_(stampUrl, stampBlobCache) {
  const cache = stampBlobCache || {};
  if (cache[stampUrl]) {
    return cache[stampUrl];
  }

  try {
    const driveId = extractDriveFileIdFromValue_(stampUrl);
    let blob = null;
    if (driveId) {
      blob = DriveApp.getFileById(driveId).getBlob();
    } else {
      const response = UrlFetchApp.fetch(stampUrl, {
        headers: {
          Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
        },
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        blob = response.getBlob();
      }
    }

    if (!blob) {
      return null;
    }

    cache[stampUrl] = blob;
    return blob;
  } catch (error) {
    Logger.log('getStampBlobForPreview_ failed: %s\n%s', error.message, error.stack || '');
    return null;
  }
}
