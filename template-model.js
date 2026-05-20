function getTemplateColumnLayoutConfig_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  const fallbackColumns = 15;
  const fallbackWidths = Array(fallbackColumns).fill(50);

  if (!templateSheet) {
    return {
      columnWidths: fallbackWidths,
    };
  }

  try {
    const maxColumns = Math.max(templateSheet.getMaxColumns(), 1);
    const count = Math.max(Math.min(maxColumns, fallbackColumns), 1);
    const widths = [];

    for (let column = 1; column <= count; column += 1) {
      try {
        widths.push(templateSheet.getColumnWidth(column));
      } catch (error) {
        widths.push(50);
      }
    }

    while (widths.length < fallbackColumns) {
      widths.push(50);
    }

    return {
      columnWidths: widths,
    };
  } catch (error) {
    return {
      columnWidths: fallbackWidths,
    };
  }
}

function getSheetValuesWithPadding_(sheet, startRow, numRows, requiredColumnCount) {
  const safeNumRows = Math.max(0, numRows);
  const safeRequiredColumns = Math.max(1, requiredColumnCount);

  if (safeNumRows === 0) {
    return [];
  }

  const availableRows = Math.max(0, sheet.getMaxRows() - Math.max(1, startRow) + 1);
  const availableColumns = Math.max(1, sheet.getMaxColumns());
  const readRowCount = Math.min(safeNumRows, availableRows);
  const readColumnCount = Math.min(safeRequiredColumns, availableColumns);
  const values = readRowCount > 0
    ? sheet.getRange(startRow, 1, readRowCount, readColumnCount).getValues()
    : [];

  while (values.length < safeNumRows) {
    values.push([]);
  }

  return values.map(function(row) {
    const padded = row.slice();
    while (padded.length < safeRequiredColumns) {
      padded.push('');
    }
    return padded;
  });
}

function ensureSheetCapacity_(sheet, minRows, minColumns) {
  const safeRows = Math.max(1, Number(minRows) || 1);
  const safeColumns = Math.max(1, Number(minColumns) || 1);
  const currentRows = sheet.getMaxRows();
  const currentColumns = sheet.getMaxColumns();

  if (currentRows < safeRows) {
    sheet.insertRowsAfter(currentRows, safeRows - currentRows);
  }
  if (currentColumns < safeColumns) {
    sheet.insertColumnsAfter(currentColumns, safeColumns - currentColumns);
  }
}

function getTemplateLayoutConfig_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME);
  const fallbackColumnCount = 16;
  const fallbackRowCount = 23;
  const fallbackLayout = {
    columnWidths: Array(fallbackColumnCount).fill(50),
    rowHeights: Array(fallbackRowCount).fill(24),
    totalWidth: fallbackColumnCount * 50,
  };

  if (!templateSheet) {
    return fallbackLayout;
  }

  try {
    const maxColumns = Math.max(templateSheet.getMaxColumns(), 1);
    const maxRows = Math.max(templateSheet.getMaxRows(), 1);
    const columnCount = Math.max(Math.min(maxColumns, fallbackColumnCount), 1);
    const rowCount = Math.max(Math.min(maxRows, fallbackRowCount), 1);
    const columnWidths = [];
    const rowHeights = [];

    for (let column = 1; column <= columnCount; column += 1) {
      try {
        columnWidths.push(templateSheet.getColumnWidth(column));
      } catch (error) {
        columnWidths.push(50);
      }
    }

    for (let row = 1; row <= rowCount; row += 1) {
      try {
        rowHeights.push(templateSheet.getRowHeight(row));
      } catch (error) {
        rowHeights.push(24);
      }
    }

    while (columnWidths.length < fallbackColumnCount) {
      columnWidths.push(50);
    }

    while (rowHeights.length < fallbackRowCount) {
      rowHeights.push(24);
    }

    return {
      columnWidths: columnWidths,
      rowHeights: rowHeights,
      totalWidth: columnWidths.reduce(function(total, width) {
        return total + width;
      }, 0),
    };
  } catch (error) {
    return fallbackLayout;
  }
}

function getTemplatePreviewModelBySheetName_(sheetName, approvalSlots) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = spreadsheet.getSheetByName(sheetName);
  const fallback = {
    columnWidths: Array(16).fill(50),
    rowHeights: Array(23).fill(24),
    rows: [],
  };

  if (!templateSheet) {
    return fallback;
  }

  const rowCount = Math.max(templateSheet.getLastRow(), 1);
  const columnCount = Math.max(templateSheet.getLastColumn(), 1);
  const range = templateSheet.getRange(1, 1, rowCount, columnCount);
  const displayValues = range.getDisplayValues();
  const backgrounds = range.getBackgrounds();
  const fontWeights = range.getFontWeights();
  const fontSizes = range.getFontSizes();
  const fontColors = range.getFontColors();
  const fontFamilies = range.getFontFamilies();
  const fontStyles = range.getFontStyles();
  const textStyles = range.getTextStyles();
  const wrapStrategies = range.getWrapStrategies();
  const horizontalAlignments = range.getHorizontalAlignments();
  const verticalAlignments = range.getVerticalAlignments();
  const notes = range.getNotes();
  const borderSnapshot = getTemplateBorderSnapshot_(templateSheet, rowCount, columnCount);
  const borderMatrix = borderSnapshot.matrix;
  const mergedRanges = templateSheet.getDataRange().getMergedRanges();
  const mergeMap = buildMergeLookup_(mergedRanges);
  const formulaLookup = getTemplateFormulaCellMap_().reduce(function(result, item) {
    result[item.a1] = item;
    return result;
  }, {});
  const rows = [];
  const columnWidths = [];
  const rowHeights = [];

  for (let column = 1; column <= columnCount; column += 1) {
    columnWidths.push(templateSheet.getColumnWidth(column));
  }

  for (let row = 1; row <= rowCount; row += 1) {
    rowHeights.push(templateSheet.getRowHeight(row));
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = [];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const a1 = rowColumnToA1_(rowIndex + 1, columnIndex + 1);
      const mergeInfo = mergeMap[a1];

      if (mergeInfo && !mergeInfo.isTopLeft) {
        continue;
      }

      const binding = parseTemplateBindingNote_(notes[rowIndex][columnIndex]);
      const formulaBinding = formulaLookup[a1] || null;
      const cellText = binding || formulaBinding ? '' : displayValues[rowIndex][columnIndex];

      cells.push({
        a1: a1,
        column: columnIndex + 1,
        text: cellText,
        colspan: mergeInfo ? mergeInfo.colspan : 1,
        rowspan: mergeInfo ? mergeInfo.rowspan : 1,
        background: backgrounds[rowIndex][columnIndex],
        bold: fontWeights[rowIndex][columnIndex] === 'bold',
        fontSize: Number(fontSizes[rowIndex][columnIndex]) || null,
        fontColor: fontColors[rowIndex][columnIndex] || '',
        fontFamily: fontFamilies[rowIndex][columnIndex] || '',
        italic: String(fontStyles[rowIndex][columnIndex] || '').toLowerCase() === 'italic',
        underline: !!(textStyles[rowIndex][columnIndex] && textStyles[rowIndex][columnIndex].isUnderline && textStyles[rowIndex][columnIndex].isUnderline()),
        wrapStrategy: wrapStrategies[rowIndex][columnIndex] || '',
        align: horizontalAlignments[rowIndex][columnIndex] || 'center',
        verticalAlign: verticalAlignments[rowIndex][columnIndex] || 'middle',
        borders: borderMatrix[rowIndex] && borderMatrix[rowIndex][columnIndex]
          ? borderMatrix[rowIndex][columnIndex]
          : null,
        binding: binding,
        formulaBinding: formulaBinding,
      });
    }

    rows.push(cells);
  }

  const templateModel = {
    columnWidths: columnWidths,
    rowHeights: rowHeights,
    rows: rows,
    borderDebug: borderSnapshot.debug,
  };
  injectApprovalBindingsIntoTemplateModel_(templateModel, approvalSlots);
  return templateModel;
}

function getTemplatePreviewModel_(approvalSlots) {
  return getTemplatePreviewModelBySheetName_(LOG_PRINT_CONFIG.TEMPLATE_SHEET_NAME, approvalSlots);
}

function getSecondTemplatePreviewModel_(approvalSlots) {
  ensureSecondTemplateBindings_();
  return getTemplatePreviewModelBySheetName_(LOG_PRINT_CONFIG.TEMPLATE_SECOND_SHEET_NAME, approvalSlots);
}

function getTemplateBorderSnapshot_(templateSheet, rowCount, columnCount) {
  const fallback = Array.from({ length: rowCount }, function() {
    return Array.from({ length: columnCount }, function() {
      return null;
    });
  });
  const fallbackDebug = {
    rowCount: rowCount,
    columnCount: columnCount,
    userBorderCells: 0,
    effectiveBorderCells: 0,
  };

  try {
    const spreadsheetId = templateSheet.getParent().getId();
    const sheetName = templateSheet.getName();
    const endA1 = rowColumnToA1_(rowCount, columnCount);
    const rangeA1 = encodeURIComponent(sheetName + '!A1:' + endA1);
    const fields = encodeURIComponent('sheets(data(rowData(values)))');
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId
      + '?includeGridData=true'
      + '&ranges=' + rangeA1
      + '&fields=' + fields;

    const response = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      Logger.log('getTemplateBorderMatrix_ failed: %s %s', response.getResponseCode(), response.getContentText());
      return {
        matrix: fallback,
        debug: fallbackDebug,
      };
    }

    const payload = JSON.parse(response.getContentText() || '{}');
    const sheet = payload && payload.sheets && payload.sheets[0];
    const data = sheet && sheet.data && sheet.data[0];
    const rowData = data && Array.isArray(data.rowData) ? data.rowData : [];

    let userBorderCells = 0;
    let effectiveBorderCells = 0;

    const matrix = Array.from({ length: rowCount }, function(_, rowIndex) {
      const values = rowData[rowIndex] && Array.isArray(rowData[rowIndex].values)
        ? rowData[rowIndex].values
        : [];

      return Array.from({ length: columnCount }, function(_, columnIndex) {
        const userEnteredFormat = values[columnIndex] && values[columnIndex].userEnteredFormat;
        const effectiveFormat = values[columnIndex] && values[columnIndex].effectiveFormat;
        const userBorders = normalizeTemplateBorders_(userEnteredFormat && userEnteredFormat.borders);
        if (hasTemplateBorderSide_(userBorders)) {
          userBorderCells += 1;
          return userBorders;
        }
        const effectiveBorders = normalizeTemplateBorders_(effectiveFormat && effectiveFormat.borders);
        if (hasTemplateBorderSide_(effectiveBorders)) {
          effectiveBorderCells += 1;
          return effectiveBorders;
        }
        return null;
      });
    });

    return {
      matrix: matrix,
      debug: {
        rowCount: rowCount,
        columnCount: columnCount,
        userBorderCells: userBorderCells,
        effectiveBorderCells: effectiveBorderCells,
      },
    };
  } catch (error) {
    Logger.log('getTemplateBorderMatrix_ error: %s\n%s', error.message, error.stack || '');
    return {
      matrix: fallback,
      debug: fallbackDebug,
    };
  }
}

function normalizeTemplateBorders_(borders) {
  if (!borders) {
    return null;
  }

  const normalized = {
    top: normalizeTemplateBorderSide_(borders.top),
    right: normalizeTemplateBorderSide_(borders.right),
    bottom: normalizeTemplateBorderSide_(borders.bottom),
    left: normalizeTemplateBorderSide_(borders.left),
  };

  return hasTemplateBorderSide_(normalized) ? normalized : null;
}

function hasTemplateBorderSide_(borders) {
  return !!(borders && (borders.top || borders.right || borders.bottom || borders.left));
}

function normalizeTemplateBorderSide_(side) {
  if (!side || !side.style || side.style === 'NONE') {
    return null;
  }

  return {
    style: String(side.style || ''),
    color: googleColorToHex_(side.color),
  };
}

function googleColorToHex_(color) {
  if (!color) {
    return '#9b9b9b';
  }

  function channel(value) {
    const number = Math.max(0, Math.min(255, Math.round(Number(value || 0) * 255)));
    return ('0' + number.toString(16)).slice(-2);
  }

  return '#' + channel(color.red) + channel(color.green) + channel(color.blue);
}

function injectApprovalBindingsIntoTemplateModel_(templateModel, approvalSlots) {
  const rows = templateModel && Array.isArray(templateModel.rows) ? templateModel.rows : [];
  const normalizedSlots = Array.isArray(approvalSlots) && approvalSlots.length
    ? approvalSlots
    : getDefaultApprovalSlots_();
  let boundCount = 0;
  const boundLabels = [];

  if (!rows.length || rows.length < 2 || !normalizedSlots.length) {
    templateModel.approvalBindingCount = 0;
    templateModel.approvalBoundLabels = [];
    return templateModel;
  }

  const headerRowsToScan = Math.min(rows.length - 1, 6);

  normalizedSlots.forEach(function(slot, slotIndex) {
    const label = normalizeApprovalLabel_(slot && slot.label);
    if (!label) {
      return;
    }

    for (let rowIndex = 0; rowIndex < headerRowsToScan; rowIndex += 1) {
      const row = rows[rowIndex];
      const labelCell = (row || []).find(function(cell) {
        return normalizeApprovalLabel_(cell && cell.text) === label;
      });

      if (!labelCell) {
        continue;
      }

      const targetRow = rows[rowIndex + 1] || [];
      const targetCell = findApprovalTargetCell_(targetRow, labelCell.column, labelCell.colspan);

      if (targetCell) {
        targetCell.binding = { fieldKey: 'APPROVAL_SLOT_' + (slotIndex + 1) };
        targetCell.formulaBinding = null;
        targetCell.text = '';
        boundCount += 1;
        boundLabels.push(label);
      }
      break;
    }
  });

  templateModel.approvalBindingCount = boundCount;
  templateModel.approvalBoundLabels = uniqueStrings_(boundLabels);
  return templateModel;
}

function normalizeApprovalLabel_(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .trim();
}

function findApprovalTargetCell_(row, startColumn, colspan) {
  const normalizedStart = Number(startColumn) || 1;
  const normalizedEnd = normalizedStart + Math.max(Number(colspan) || 1, 1) - 1;

  return (row || []).find(function(cell) {
    const cellStart = Number(cell && cell.column) || 1;
    const cellEnd = cellStart + Math.max(Number(cell && cell.colspan) || 1, 1) - 1;
    return cellStart <= normalizedStart && cellEnd >= normalizedEnd;
  }) || null;
}

function buildMergeLookup_(mergedRanges) {
  const lookup = {};

  mergedRanges.forEach(function(range) {
    const startRow = range.getRow();
    const startColumn = range.getColumn();
    const rowspan = range.getNumRows();
    const colspan = range.getNumColumns();

    for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < colspan; colOffset += 1) {
        const a1 = rowColumnToA1_(startRow + rowOffset, startColumn + colOffset);
        lookup[a1] = {
          isTopLeft: rowOffset === 0 && colOffset === 0,
          rowspan: rowspan,
          colspan: colspan,
        };
      }
    }
  });

  return lookup;
}
