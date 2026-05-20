function showLogSearchPanel() {
  const template = HtmlService.createTemplate(buildSearchPanelTemplate_());
  template.today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE,
    'yyyy-MM-dd'
  );

  const htmlOutput = template.evaluate()
    .setWidth(LOG_PRINT_CONFIG.SEARCH_DIALOG_WIDTH)
    .setHeight(LOG_PRINT_CONFIG.SEARCH_DIALOG_HEIGHT);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, LOG_PRINT_CONFIG.SEARCH_TITLE);
}

function searchLogs(filters) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = filters && filters.year ? filters.year : '';
  const logDataResult = resolveLogDataSheet_(spreadsheet, selectedYear);
  const sheet = logDataResult.sheet;

  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트가 없습니다."));
  }

  const fieldMap = getFieldMap_(sheet);
  const lastRow = sheet.getLastRow();
  const columnCount = Math.max(sheet.getLastColumn(), getRequiredColumnCount_(fieldMap));

  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) {
    return [];
  }

  const rows = getSheetValuesWithPadding_(
    sheet,
    LOG_PRINT_CONFIG.DATA_START_ROW,
    lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1,
    columnCount
  );

  const startDate = normalizeFilterDate_(filters && filters.startDate);
  const endDate = normalizeFilterDate_(filters && filters.endDate);
  const managerKeyword = normalizeSearchKeyword_(filters && filters.managerKeyword);

  return rows
    .map(function(row, index) {
      return buildSearchResult_(row, fieldMap, LOG_PRINT_CONFIG.DATA_START_ROW + index);
    })
    .filter(function(item) {
      return item.dateValue !== null;
    })
    .filter(function(item) {
      if (startDate && item.dateValue < startDate) {
        return false;
      }
      if (endDate && item.dateValue > endDate) {
        return false;
      }
      if (managerKeyword && item.managerSearch.indexOf(managerKeyword) === -1) {
        return false;
      }
      return true;
    })
    .map(function(item) {
      return {
        rowNumber: item.rowNumber,
        date: item.date,
        operatingHours: item.operatingHours,
        manager: item.manager,
        maleTotal: item.maleTotal,
        femaleTotal: item.femaleTotal,
        staffCount: item.staffCount,
        breakfast: item.breakfast,
        lunch: item.lunch,
        dinner: item.dinner,
        hasVisitor: item.hasVisitor,
        workCount: item.workCount,
      };
    });
}



function buildSearchResult_(row, fieldMap, rowNumber) {
  const maleCounts = CHILD_MALE_FIELDS.map(function(fieldKey) {
    return toNumber_(row[fieldMap[fieldKey]]);
  });
  const femaleCounts = CHILD_FEMALE_FIELDS.map(function(fieldKey) {
    return toNumber_(row[fieldMap[fieldKey]]);
  });
  const dateValue = normalizeRowDate_(row[fieldMap.DATE]);
  const manager = valueOrEmpty_(row[fieldMap.MANAGER]).trim();
  const works = getWorksValues_(row, fieldMap).filter(function(value) {
    return hasDisplayValue_(value);
  });

  return {
    rowNumber: rowNumber,
    dateValue: dateValue,
    date: formatDateValue_(row[fieldMap.DATE]),
    operatingHours: valueOrEmpty_(row[fieldMap.OPERATING_HOURS]).trim(),
    manager: manager,
    managerSearch: normalizeSearchKeyword_(manager),
    maleTotal: sumNumbers_(maleCounts),
    femaleTotal: sumNumbers_(femaleCounts),
    breakfast: getOptionalNumberValue_(row, fieldMap, 'MEAL_BREAKFAST'),
    lunch: getOptionalNumberValue_(row, fieldMap, 'MEAL_LUNCH'),
    dinner: getOptionalNumberValue_(row, fieldMap, 'MEAL_DINNER'),
    hasVisitor: hasDisplayValue_(getOptionalTextValue_(row, fieldMap, 'VISITOR_REASON')),
    workCount: works.length,
    staffCount: (
      toNumber_(row[fieldMap.STAFF_WORKER]) +
      toNumber_(row[fieldMap.STAFF_TEACHER]) +
      toNumber_(row[fieldMap.STAFF_PUBLIC]) +
      toNumber_(row[fieldMap.STAFF_OTHER])
    ),
  };
}

function normalizeFilterDate_(value) {
  if (!hasDisplayValue_(value)) {
    return null;
  }

  const date = new Date(String(value));
  if (isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeRowDate_(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (!hasDisplayValue_(value)) {
    return null;
  }

  const parsed = new Date(String(value));
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function normalizeSearchKeyword_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

