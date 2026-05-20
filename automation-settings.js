function createAutomationSettingsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = ensureAutomationSettingsSheet_(spreadsheet);
  spreadsheet.setActiveSheet(result.sheet);
  SpreadsheetApp.getUi().alert(
    "'" + result.sheet.getName() + "' 시트를 준비했습니다.\n" +
    '추가된 기본 규칙: ' + result.addedCount + '건'
  );
}

function getAutomationSettingsDefaultRows_() {
  return [
    ['GENERAL', 'OPERATING_HOURS_SCHOOL', '학기중 (10:00 ~ 19:00)', '학기중 자동 운영시간 기본값'],
    ['GENERAL', 'OPERATING_HOURS_VACATION', '방학중 (10:00 ~ 19:00)', '방학중 자동 운영시간 기본값'],
    ['GENERAL', 'MANAGER_EXCLUDED_POSITIONS', '시설장,센터장', '담당자 대체와 종사자수 계산에서 제외할 직위'],
    ['MANAGER_RULE', 'RULE_2024', '2024-01-01|2024-12-31|황민주', '형식: 시작일|종료일|담당자'],
    ['MANAGER_RULE', 'RULE_2025_H1', '2025-01-01|2025-07-31|김성은', '형식: 시작일|종료일|담당자'],
    ['MANAGER_RULE', 'RULE_2025_H2', '2025-08-01|2026-12-31|최하은', '형식: 시작일|종료일|담당자'],
    ['APPROVAL_SLOT', 'SLOT_1', '담당자|AUTO_MANAGER', '형식: 결재칸라벨|이름 또는 AUTO_MANAGER'],
    ['APPROVAL_SLOT', 'SLOT_2', '팀장|왕준하', '형식: 결재칸라벨|이름 또는 AUTO_MANAGER'],
    ['APPROVAL_SLOT', 'SLOT_3', '시설장|왕시형', '형식: 결재칸라벨|이름 또는 AUTO_MANAGER'],
    ['STAMP', '왕시형', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
    ['STAMP', '왕준하', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
    ['STAMP', '최하은', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
    ['STAMP', '황민주', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
    ['STAMP', '김성은', '', '도장 이미지 URL 또는 Google Drive 파일 URL/ID'],
  ];
}

function ensureAutomationSettingsSheet_(spreadsheet) {
  const sheet = getOrCreateSheet_(spreadsheet, LOG_PRINT_CONFIG.AUTOMATION_SETTINGS_SHEET_NAME);
  const headerRow = ['section', 'key', 'value', 'description'];
  const defaultRows = getAutomationSettingsDefaultRows_();
  let addedCount = 0;

  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headerRow.length)).getDisplayValues()[0];
    const normalizedCurrent = headerRow.map(function(_, index) {
      return valueOrEmpty_(currentHeaders[index]).trim();
    });
    if (normalizedCurrent.join('|') !== headerRow.join('|')) {
      sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    }
  }

  const existingValues = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 4)).getDisplayValues()
    : [];
  const existingKeys = {};
  existingValues.forEach(function(row) {
    const section = valueOrEmpty_(row[0]).trim();
    const key = valueOrEmpty_(row[1]).trim();
    if (section && key) {
      existingKeys[section + '::' + key] = true;
    }
  });

  migrateLegacyApprovalSlots_(sheet, existingValues);

  const rowsToAppend = defaultRows.filter(function(row) {
    return !existingKeys[row[0] + '::' + row[1]];
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
    addedCount = rowsToAppend.length;
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);
  clearAutomationSettingsMemo_();

  return {
    sheet: sheet,
    addedCount: addedCount,
  };
}

function migrateLegacyApprovalSlots_(sheet, existingValues) {
  const rowIndexMap = {};
  existingValues.forEach(function(row, index) {
    const section = valueOrEmpty_(row[0]).trim();
    const key = valueOrEmpty_(row[1]).trim();
    if (section && key) {
      rowIndexMap[section + '::' + key] = index + 2;
    }
  });

  const slot1Row = rowIndexMap['APPROVAL_SLOT::SLOT_1'];
  const slot2Row = rowIndexMap['APPROVAL_SLOT::SLOT_2'];
  const slot3Row = rowIndexMap['APPROVAL_SLOT::SLOT_3'];
  if (!slot1Row || !slot2Row || slot3Row) {
    return;
  }

  const slot1Value = valueOrEmpty_(sheet.getRange(slot1Row, 3).getDisplayValue()).trim();
  const slot2Value = valueOrEmpty_(sheet.getRange(slot2Row, 3).getDisplayValue()).trim();
  if (slot1Value !== '시설장|왕시형' || slot2Value !== '담당자|AUTO_MANAGER') {
    return;
  }

  sheet.getRange(slot1Row, 3).setValue('담당자|AUTO_MANAGER');
  sheet.getRange(slot2Row, 3).setValue('팀장|왕준하');
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([
    ['APPROVAL_SLOT', 'SLOT_3', '시설장|왕시형', '형식: 결재칸라벨|이름 또는 AUTO_MANAGER'],
  ]);
}

function clearAutomationSettingsMemo_() {
  automationSettingsMemo_ = null;
}

function getAutomationSettings_() {
  if (automationSettingsMemo_) {
    return automationSettingsMemo_;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(LOG_PRINT_CONFIG.AUTOMATION_SETTINGS_SHEET_NAME);
  const settingsMap = {};

  if (sheet && sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 4)).getDisplayValues();
    values.forEach(function(row) {
      const section = valueOrEmpty_(row[0]).trim();
      const key = valueOrEmpty_(row[1]).trim();
      const value = valueOrEmpty_(row[2]).trim();
      if (!section || !key) {
        return;
      }
      if (!settingsMap[section]) {
        settingsMap[section] = {};
      }
      settingsMap[section][key] = value;
    });
  }

  const managerRules = buildManagerRulesFromSettingsMap_(settingsMap);
  const excludedPositions = splitSettingsList_(getAutomationSettingValueFromMap_(settingsMap, 'GENERAL', 'MANAGER_EXCLUDED_POSITIONS', ''));
  const approvalSlots = buildApprovalSlotsFromSettingsMap_(settingsMap);
  const stampMap = buildStampMapFromSettingsMap_(settingsMap);

  automationSettingsMemo_ = {
    map: settingsMap,
    managerRules: managerRules.length ? managerRules : DEFAULT_LOG_MANAGER_RULES.slice(),
    excludedPositions: excludedPositions.length ? excludedPositions : MANAGER_EXCLUDED_POSITIONS.slice(),
    approvalSlots: approvalSlots.length ? approvalSlots : getDefaultApprovalSlots_(),
    stampMap: stampMap,
  };
  return automationSettingsMemo_;
}

function getAutomationSettingValueFromMap_(settingsMap, section, key, defaultValue) {
  const sectionMap = settingsMap && settingsMap[section] ? settingsMap[section] : null;
  if (!sectionMap) {
    return defaultValue;
  }
  const value = valueOrEmpty_(sectionMap[key]).trim();
  return value || defaultValue;
}

function getAutomationSettingValue_(section, key, defaultValue) {
  return getAutomationSettingValueFromMap_(getAutomationSettings_().map, section, key, defaultValue);
}

function splitSettingsList_(value) {
  return String(value || '')
    .split(',')
    .map(function(item) {
      return valueOrEmpty_(item).trim();
    })
    .filter(Boolean);
}

function buildManagerRulesFromSettingsMap_(settingsMap) {
  const rules = [];
  const sectionMap = settingsMap && settingsMap.MANAGER_RULE ? settingsMap.MANAGER_RULE : {};

  Object.keys(sectionMap).forEach(function(key) {
    const parts = String(sectionMap[key] || '').split('|').map(function(part) {
      return valueOrEmpty_(part).trim();
    });
    if (parts.length < 3) {
      return;
    }

    const startDate = normalizeDateKey_(parts[0]);
    const endDate = normalizeDateKey_(parts[1]);
    const managerName = parts[2];
    if (!startDate || !endDate || !managerName) {
      return;
    }

    rules.push({
      startDate: startDate,
      endDate: endDate,
      managerName: managerName,
    });
  });

  rules.sort(function(a, b) {
    return a.startDate.localeCompare(b.startDate);
  });

  return rules;
}

function getDefaultApprovalSlots_() {
  return [
    { label: '담당자', name: 'AUTO_MANAGER' },
    { label: '팀장', name: '왕준하' },
    { label: '시설장', name: '왕시형' },
  ];
}

function buildApprovalSlotsFromSettingsMap_(settingsMap) {
  const sectionMap = settingsMap && settingsMap.APPROVAL_SLOT ? settingsMap.APPROVAL_SLOT : {};
  const slots = [];

  Object.keys(sectionMap).sort().forEach(function(key) {
    const parts = String(sectionMap[key] || '').split('|').map(function(part) {
      return valueOrEmpty_(part).trim();
    });
    if (parts.length < 2) {
      return;
    }
    if (!parts[0] || !parts[1]) {
      return;
    }
    slots.push({
      label: parts[0],
      name: parts[1],
    });
  });

  return slots;
}

function buildStampMapFromSettingsMap_(settingsMap) {
  const sectionMap = settingsMap && settingsMap.STAMP ? settingsMap.STAMP : {};
  const stampMap = {};

  Object.keys(sectionMap).forEach(function(name) {
    const normalizedUrl = normalizeStampUrl_(sectionMap[name]);
    if (normalizedUrl) {
      stampMap[name] = normalizedUrl;
    }
  });

  return stampMap;
}

function extractDriveFileIdFromStampUrl_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }

  const filePathMatch = text.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (filePathMatch) {
    return filePathMatch[1];
  }

  const queryIdMatch = text.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (queryIdMatch) {
    return queryIdMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) {
    return text;
  }

  const fallbackMatch = text.match(/([a-zA-Z0-9_-]{20,})/);
  return fallbackMatch ? fallbackMatch[1] : '';
}

function buildDriveStampThumbnailUrl_(fileId) {
  return fileId
    ? 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w240'
    : '';
}

function normalizeStampUrl_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }
  if (/^data:image\//i.test(text)) {
    return text;
  }
  const driveFileId = extractDriveFileIdFromStampUrl_(text);
  if (/drive\.google\.com/i.test(text)) {
    return buildDriveStampThumbnailUrl_(driveFileId);
  }
  if (driveFileId && /^[a-zA-Z0-9_-]{20,}$/.test(text)) {
    return buildDriveStampThumbnailUrl_(driveFileId);
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  if (driveFileId) {
    return buildDriveStampThumbnailUrl_(driveFileId);
  }
  return '';
}

function saveAutomationStampUrlForName_(name, stampUrl) {
  const safeName = valueOrEmpty_(name).trim();
  if (!safeName) {
    return {
      saved: false,
      reason: 'name-empty',
    };
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = ensureAutomationSettingsSheet_(spreadsheet);
  const sheet = result.sheet;
  const rawValue = valueOrEmpty_(stampUrl).trim();
  const lastRow = sheet.getLastRow();
  const values = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 4)).getDisplayValues()
    : [];
  let targetRow = 0;

  for (let index = 0; index < values.length; index += 1) {
    const section = valueOrEmpty_(values[index][0]).trim();
    const key = valueOrEmpty_(values[index][1]).trim();
    if (section === 'STAMP' && key === safeName) {
      targetRow = index + 2;
      break;
    }
  }

  if (targetRow) {
    sheet.getRange(targetRow, 3, 1, 2).setValues([[
      rawValue,
      '도장 이미지 URL 또는 Google Drive 파일 URL/ID',
    ]]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([[
      'STAMP',
      safeName,
      rawValue,
      '도장 이미지 URL 또는 Google Drive 파일 URL/ID',
    ]]);
  }

  clearAutomationSettingsMemo_();
  return {
    saved: true,
    name: safeName,
    stampUrl: normalizeStampUrl_(rawValue),
  };
}

function buildApprovalSlotsForReport_(report, settings) {
  const safeSettings = settings || getAutomationSettings_();
  const managerName = report && (report.managerName || report.manager) ? (report.managerName || report.manager) : '';
  const managerIsTeamLead = isApprovalTeamLeadManager_(report, managerName);
  const seenNames = {};

  return (safeSettings.approvalSlots || []).map(function(slot) {
    const slotName = slot.name === 'AUTO_MANAGER' ? managerName : slot.name;
    const slotKey = normalizeSearchKeyword_(slotName || slot.label || '');
    if (managerIsTeamLead && slot.name !== 'AUTO_MANAGER' && slotKey && slotKey === normalizeSearchKeyword_(managerName)) {
      return null;
    }
    if (slotKey && seenNames[slotKey]) {
      return null;
    }
    if (slotKey) {
      seenNames[slotKey] = true;
    }
    let slotLabel = slot.label;
    if (slot.name === 'AUTO_MANAGER' && managerIsTeamLead) {
      slotLabel = '담당자(팀장)';
    } else if (slotName === '왕시형' && /시설장|센터장/.test(slotLabel)) {
      slotLabel = '센터장';
    }
    return {
      label: slotLabel,
      name: slotName,
      stampUrl: safeSettings.stampMap && slotName ? (safeSettings.stampMap[slotName] || '') : '',
    };
  }).filter(Boolean);
}

function isApprovalTeamLeadManager_(report, managerName) {
  const safeManagerName = valueOrEmpty_(managerName).trim();
  if (!safeManagerName) {
    return false;
  }
  if (safeManagerName === '왕준하') {
    return true;
  }
  const dateKey = normalizeDateKey_(report && report.date);
  const selectedYear = normalizeAttendanceYear_(dateKey ? dateKey.slice(0, 4) : '');
  if (!dateKey || !selectedYear) {
    return false;
  }
  try {
    const entries = getStaffRosterEntriesByYear_(selectedYear) || [];
    return entries.some(function(entry) {
      return valueOrEmpty_(entry && entry.name).trim() === safeManagerName &&
        /팀장/.test(valueOrEmpty_(entry && entry.position).trim());
    });
  } catch (error) {
    return false;
  }
}

function getManagerExcludedPositions_() {
  return (getAutomationSettings_().excludedPositions || []).slice();
}
