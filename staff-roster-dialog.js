const STAFF_ROSTER_ADMIN_EMAIL_PROPERTY_KEY = 'staff_roster_admin_email';
const STAFF_ROSTER_NONSTAFF_MANAGER_EMAIL_PROPERTY_KEY = 'staff_roster_nonstaff_manager_email';
const STAFF_ROSTER_DROPDOWN_OPTIONS_PROPERTY_KEY = 'staff_roster_dropdown_options';
const STAFF_ROSTER_DIALOG_CACHE_VERSION = 'staff-roster-dialog-cache-v3';
const STAFF_ROSTER_DIALOG_CACHE_TTL_SECONDS = 900;
const STAFF_ROSTER_DIALOG_CACHE_CHUNK_SIZE = 85000;

function normalizeStaffRosterDashboardType_(dashboardType) {
  return String(dashboardType || '').trim().toLowerCase() === 'nonstaff' ? 'nonstaff' : 'staff';
}

function normalizeStaffRosterDialogCacheToken_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_.@-]+/g, '_')
    .slice(0, 90) || 'none';
}

function getStaffRosterDialogCacheScope_(adminContext) {
  const context = adminContext || getStaffRosterAdminContext_();
  const role = context && context.canManage
    ? 'admin'
    : (context && context.canManageNonStaff ? 'nonstaff-manager' : 'viewer');
  return normalizeStaffRosterDialogCacheToken_(role + ':' + (context && context.currentUserEmail || ''));
}

function getStaffRosterDialogCacheKey_(kind, selectedYear, dashboardType, adminContext) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  return [
    STAFF_ROSTER_DIALOG_CACHE_VERSION,
    String(kind || 'list'),
    String(normalizedYear),
    normalizeStaffRosterDashboardType_(dashboardType),
    getStaffRosterDialogCacheScope_(adminContext)
  ].join(':');
}

function getStaffRosterDialogCache_() {
  return CacheService.getScriptCache();
}

function chunkStaffRosterDialogCacheText_(text) {
  const source = String(text || '');
  const chunks = [];
  for (let index = 0; index < source.length; index += STAFF_ROSTER_DIALOG_CACHE_CHUNK_SIZE) {
    chunks.push(source.slice(index, index + STAFF_ROSTER_DIALOG_CACHE_CHUNK_SIZE));
  }
  return chunks.length ? chunks : [''];
}

function readStaffRosterDialogCachePayload_(cacheKey) {
  try {
    const cache = getStaffRosterDialogCache_();
    const metaText = cache.get(cacheKey + ':meta');
    if (!metaText) return null;
    const meta = JSON.parse(metaText);
    if (!meta || meta.version !== STAFF_ROSTER_DIALOG_CACHE_VERSION || !meta.chunkCount) {
      return null;
    }
    const chunkKeys = [];
    for (let index = 0; index < Number(meta.chunkCount); index += 1) {
      chunkKeys.push(cacheKey + ':chunk:' + index);
    }
    const chunkValues = cache.getAll(chunkKeys);
    const chunks = chunkKeys.map(function(key) {
      return chunkValues[key] || '';
    });
    if (chunks.some(function(chunk) { return !chunk; })) {
      return null;
    }
    return JSON.parse(chunks.join('') || '{}');
  } catch (error) {
    Logger.log('readStaffRosterDialogCachePayload_ failed: %s', error.message);
    return null;
  }
}

function writeStaffRosterDialogCachePayload_(cacheKey, payload) {
  try {
    const cache = getStaffRosterDialogCache_();
    const previousMetaText = cache.get(cacheKey + ':meta');
    const previousMeta = previousMetaText ? JSON.parse(previousMetaText) : null;
    const text = JSON.stringify(payload || {});
    const chunks = chunkStaffRosterDialogCacheText_(text);
    const values = {};
    chunks.forEach(function(chunk, index) {
      values[cacheKey + ':chunk:' + index] = chunk;
    });
    cache.putAll(values, STAFF_ROSTER_DIALOG_CACHE_TTL_SECONDS);
    cache.put(cacheKey + ':meta', JSON.stringify({
      version: STAFF_ROSTER_DIALOG_CACHE_VERSION,
      chunkCount: chunks.length,
      cachedAt: new Date().toISOString(),
    }), STAFF_ROSTER_DIALOG_CACHE_TTL_SECONDS);
    if (previousMeta && Number(previousMeta.chunkCount) > chunks.length) {
      const staleKeys = [];
      for (let index = chunks.length; index < Number(previousMeta.chunkCount); index += 1) {
        staleKeys.push(cacheKey + ':chunk:' + index);
      }
      if (staleKeys.length) {
        cache.removeAll(staleKeys);
      }
    }
  } catch (error) {
    Logger.log('writeStaffRosterDialogCachePayload_ failed: %s', error.message);
  }
}

function clearStaffRosterDialogCachePayload_(kind, selectedYear, dashboardType, adminContext) {
  try {
    const cacheKey = getStaffRosterDialogCacheKey_(kind, selectedYear, dashboardType, adminContext);
    const cache = getStaffRosterDialogCache_();
    const metaText = cache.get(cacheKey + ':meta');
    const keys = [cacheKey + ':meta'];
    if (metaText) {
      const meta = JSON.parse(metaText);
      for (let index = 0; index < Number(meta && meta.chunkCount || 0); index += 1) {
        keys.push(cacheKey + ':chunk:' + index);
      }
    }
    cache.removeAll(keys);
  } catch (error) {
    Logger.log('clearStaffRosterDialogCachePayload_ failed: %s', error.message);
  }
}

function clearStaffRosterDialogCachesForCurrentUser_(selectedYear) {
  const context = getStaffRosterAdminContext_();
  ['staff', 'nonstaff'].forEach(function(type) {
    clearStaffRosterDialogCachePayload_('list', selectedYear, type, context);
    clearStaffRosterDialogCachePayload_('detail', selectedYear, type, context);
  });
}

function showStaffRosterDialog() {
  showStaffRosterDialogByType_('staff');
}

function showNonStaffRosterDialog() {
  showStaffRosterDialogByType_('nonstaff');
}

function showStaffRosterDialogByType_(dashboardType) {
  const normalizedType = normalizeStaffRosterDashboardType_(dashboardType);
  const dialogTitle = '종사자 / 비종사자 현황';
  try {
    const template = HtmlService.createTemplateFromFile('staff-roster-view');
    template.dashboardType = normalizedType;
    const htmlOutput = template.evaluate()
      .setWidth(2400)
      .setHeight(1500);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, dialogTitle);
  } catch (error) {
    SpreadsheetApp.getUi().alert(dialogTitle + '을 열지 못했습니다.\n' + error.message);
  }
}

function warmStaffRosterDialogDataOnOpen_() {
  const startedAt = Date.now();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const availableYears = listStaffRosterDialogYears_(spreadsheet);
  const selectedYear = resolvePreferredStaffRosterYear_(spreadsheet, availableYears);

  getStaffRosterDialogDataByYear(selectedYear, {
    dashboardType: 'staff',
  });

  if (Date.now() - startedAt < 8000) {
    getStaffRosterDialogDataByYear(selectedYear, {
      dashboardType: 'nonstaff',
    });
  }
}

function warmStaffRosterDialogDataOnOpen() {
  warmStaffRosterDialogDataOnOpen_();
  return {
    ok: true,
    warmedAt: new Date().toISOString(),
  };
}

function getStaffRosterDialogShellData(dashboardType) {
  let spreadsheet = null;
  let availableYears = [
    { year: 2026, label: '2026년' },
    { year: 2025, label: '2025년' },
    { year: 2024, label: '2024년' },
  ];
  try {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    availableYears = listStaffRosterDialogYears_(spreadsheet);
  } catch (error) {
    Logger.log('getStaffRosterDialogShellData spreadsheet fallback: %s', error.message);
  }
  const adminContext = getStaffRosterAdminContext_();
  const normalizedType = normalizeStaffRosterDashboardType_(dashboardType);
  return {
    dashboardType: normalizedType,
    selectedYear: spreadsheet ? resolvePreferredStaffRosterYear_(spreadsheet, availableYears) : 2026,
    availableYears: availableYears,
    canManageStaffRoster: adminContext.canManage,
    canManageNonStaffRoster: adminContext.canManageNonStaff,
    adminModeEnabled: adminContext.enabled,
    adminEmail: adminContext.adminEmail,
    nonStaffManagerEmail: adminContext.nonStaffManagerEmail,
    currentUserEmail: adminContext.currentUserEmail,
    dropdownOptions: getStaffRosterDropdownOptions_(),
  };
}

function runStaffRosterAdminMaintenanceTask(input) {
  assertStaffRosterAdmin_();
  const task = String(input && input.task || '').trim();
  const years = [2024, 2025, 2026];
  let result = null;
  let title = '';
  const lines = [];

  if (task === 'carryover') {
    title = '연도 이월 정리';
    result = {
      results: years.map(function(year) {
        const bundle = getStaffRosterBundleByYear_(year);
        const beforeStaffCount = bundle && bundle.staffInfo && bundle.staffInfo.entries
          ? bundle.staffInfo.entries.length
          : 0;
        const beforeNonStaffCount = bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries
          ? bundle.nonStaffInfo.entries.length
          : 0;
        const prepareResult = prepareStaffRosterBundleForDisplayYear_(year, bundle, true);
        const afterStaffCount = bundle && bundle.staffInfo && bundle.staffInfo.entries
          ? bundle.staffInfo.entries.length
          : 0;
        const afterNonStaffCount = bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries
          ? bundle.nonStaffInfo.entries.length
          : 0;
        return {
          year: year,
          changed: Number(prepareResult && prepareResult.changed) || 0,
          staffCount: afterStaffCount,
          nonStaffCount: afterNonStaffCount,
          addedStaffCount: Math.max(afterStaffCount - beforeStaffCount, 0),
          addedNonStaffCount: Math.max(afterNonStaffCount - beforeNonStaffCount, 0),
        };
      }),
    };
    result.results.forEach(function(item) {
      lines.push(item.year + '년: 종사자 ' + item.staffCount + '명 / 비종사자 ' + item.nonStaffCount + '명 / 변경 ' + item.changed + '건');
    });
  } else if (task === 'annualLeave') {
    title = '연가 병합';
    result = applyAnnualLeaveToStaffRosterForYears_(years);
    (result.results || []).forEach(function(item) {
      if (item.errorMessage) {
        lines.push(item.year + '년: 실패 - ' + item.errorMessage);
        return;
      }
      lines.push(item.year + '년: 연가 ' + item.appliedDateCount + '건 / 종사자 ' + item.updatedStaffCount + '명 반영');
    });
  } else if (task === 'staffAttendance') {
    title = '종사자 출결 자동 생성';
    result = resetStaffAttendanceByAnnualLeaveForYears_(years);
    (result.results || []).forEach(function(item) {
      lines.push(item.year + '년: 반영 ' + item.updatedCount + '명 / 출석 ' + item.attendanceDateCount + '일 / 연가 ' + item.leaveDateCount + '일');
    });
  } else if (task === 'seniorAttendance') {
    title = '시니어 출결 자동 생성';
    result = resetSeniorAttendanceByDateRangeForYears2024To2026();
    (result.results || []).forEach(function(item) {
      lines.push(item.year + '년: 반영 ' + item.updatedCount + '명 / 출결 ' + item.attendanceDateCount + '일');
    });
  } else if (task === 'nonstaffDateRange') {
    title = '비종사자 시작/종료일 갱신';
    result = {
      results: years.map(function(year) {
        const bundle = getStaffRosterBundleByYear_(year);
        const updatedCount = applyNonStaffDateRangesFromDailyAttendance_(bundle, year);
        if (updatedCount) {
          saveStaffRosterMasterMutation_(year, bundle);
        } else {
          touchStaffRosterRuntimeCaches_(year, bundle);
        }
        return {
          year: year,
          updatedCount: updatedCount,
        };
      }),
    };
    result.results.forEach(function(item) {
      lines.push(item.year + '년: ' + item.updatedCount + '명 갱신');
    });
  } else if (task === 'logApply') {
    title = '일지데이터 반영';
    result = {
      results: years.map(function(year) {
        try {
          const logResult = applyStaffRosterToLogDataByYear_(year);
          return {
            year: year,
            logSheetName: valueOrEmpty_(logResult && logResult.logSheetName),
            updatedCount: Number(logResult && logResult.updatedCount) || 0,
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
      }),
    };
    result.results.forEach(function(item) {
      if (item.errorMessage) {
        lines.push(item.year + '년: 실패 - ' + item.errorMessage);
        return;
      }
      lines.push(item.year + '년: ' + item.logSheetName + ' ' + item.updatedCount + '건 반영');
    });
  } else {
    throw new Error('알 수 없는 관리자 작업입니다.');
  }

  return {
    task: task,
    title: title,
    summaryLines: lines,
    result: result,
    finishedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
  };
}

function getDefaultStaffRosterDropdownOptions_() {
  return {
    organizationName: '서창지역아동센터(양산애사회적협동조합)',
    tabLocks: {
      basic: true,
      documents: true,
      attendance: true,
      leave: true,
      stamp: true,
    },
    classificationOptions: [
      '교사',
      '공익',
      '기타',
    ],
    activityTypeOptions: [
      '시니어',
      '멘토',
      '자원봉사자',
      '근로장학생',
      '교사',
      '강사',
      '공익',
    ],
    statusOptions: [
      '재직',
      '연차',
      '연차 제외',
      '퇴사',
      '비활성',
      '입사 전',
      '휴직',
      '종료',
      '위촉',
      '활동',
    ],
    attendanceStatusOptions: [
      '출석',
      '결석',
      '공결',
      '연가',
      '병가',
      '지각',
      '조퇴',
      '외출',
      '확인 필요',
    ],
  };
}

function normalizeStaffRosterTabLocks_(input, fallback) {
  const payload = input || {};
  const base = fallback || {};
  const normalizeOne = function(key) {
    return Object.prototype.hasOwnProperty.call(payload, key)
      ? payload[key] === true
      : base[key] === true;
  };
  return {
    basic: normalizeOne('basic'),
    documents: normalizeOne('documents'),
    attendance: normalizeOne('attendance'),
    leave: normalizeOne('leave'),
    stamp: normalizeOne('stamp'),
  };
}

function normalizeStaffRosterDropdownOptions_(input) {
  const payload = input || {};
  const defaults = getDefaultStaffRosterDropdownOptions_();
  const allowedClassificationOptions = { '교사': true, '공익': true, '기타': true };
  return {
    organizationName: String(payload.organizationName || '').trim(),
    tabLocks: normalizeStaffRosterTabLocks_(payload.tabLocks, defaults.tabLocks),
    classificationOptions: uniqueStrings_(Array.isArray(payload.classificationOptions) ? payload.classificationOptions : []).filter(function(value) {
      return !!allowedClassificationOptions[value];
    }),
    activityTypeOptions: uniqueStrings_(Array.isArray(payload.activityTypeOptions) ? payload.activityTypeOptions : []),
    statusOptions: uniqueStrings_(Array.isArray(payload.statusOptions) ? payload.statusOptions : []),
    attendanceStatusOptions: uniqueStrings_(Array.isArray(payload.attendanceStatusOptions) ? payload.attendanceStatusOptions : []),
  };
}

function getStaffRosterDropdownOptions_() {
  const defaults = getDefaultStaffRosterDropdownOptions_();
  const raw = PropertiesService.getDocumentProperties().getProperty(STAFF_ROSTER_DROPDOWN_OPTIONS_PROPERTY_KEY);
  if (!raw) {
    return defaults;
  }
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeStaffRosterDropdownOptions_({
        organizationName: parsed && parsed.organizationName,
        tabLocks: parsed && parsed.tabLocks,
        classificationOptions: Array.isArray(parsed && parsed.classificationOptions)
          ? parsed.classificationOptions
          : defaults.classificationOptions,
        activityTypeOptions: Array.isArray(parsed && parsed.activityTypeOptions)
          ? parsed.activityTypeOptions
          : defaults.activityTypeOptions,
        statusOptions: Array.isArray(parsed && parsed.statusOptions)
          ? parsed.statusOptions
          : defaults.statusOptions,
        attendanceStatusOptions: Array.isArray(parsed && parsed.attendanceStatusOptions)
          ? parsed.attendanceStatusOptions
          : defaults.attendanceStatusOptions,
      });
      return {
        organizationName: normalized.organizationName || defaults.organizationName,
        tabLocks: Object.assign({}, defaults.tabLocks, normalized.tabLocks),
        classificationOptions: normalized.classificationOptions.length ? normalized.classificationOptions : defaults.classificationOptions,
        activityTypeOptions: normalized.activityTypeOptions.length ? normalized.activityTypeOptions : defaults.activityTypeOptions,
        statusOptions: normalized.statusOptions.length ? normalized.statusOptions : defaults.statusOptions,
        attendanceStatusOptions: normalized.attendanceStatusOptions.length ? normalized.attendanceStatusOptions : defaults.attendanceStatusOptions,
      };
    } catch (error) {
    Logger.log('getStaffRosterDropdownOptions_ parse failed: %s', error.message);
    return defaults;
  }
}

function getStaffRosterDropdownOptions() {
  return getStaffRosterDropdownOptions_();
}

function normalizeMentorSheetText_(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function getMentorAttendanceSourceConfigs_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceDefinitions = [
    {
      sheetName: '2024년 멘토 출근부',
      year: 2024,
      activityType: '멘토',
      classification: '기타',
    },
    {
      sheetName: '2025년 멘토 출근부',
      year: 2025,
      activityType: '멘토',
      classification: '기타',
    },
    {
      sheetName: '2025년 국가근로장학 출근부',
      year: 2025,
      activityType: '근로장학생',
      classification: '기타',
    },
  ];
  const configs = sourceDefinitions.map(function(definition) {
    const sheet = spreadsheet.getSheetByName(definition.sheetName);
    if (!sheet) return null;
    return Object.assign({}, definition, {
      sheet: sheet,
      memo: definition.activityType,
    });
  }).filter(Boolean);

  if (!configs.length) {
    const legacySheet = spreadsheet.getSheetByName('멘토');
    if (legacySheet) {
      configs.push({
        sheetName: '멘토',
        sheet: legacySheet,
        year: '',
        activityType: '멘토',
        classification: '기타',
        memo: '멘토',
      });
    }
  }
  return configs;
}

function getMentorAttendanceSheetValues_(sheet) {
  const lastRow = Math.min(Math.max(Number(sheet.getLastRow()) || 1, 1), 2500);
  const lastColumn = Math.min(Math.max(Number(sheet.getLastColumn()) || 1, 1), 80);
  if (lastRow < 1 || lastColumn < 1) {
    return {
      lastRow: 0,
      lastColumn: 0,
      values: [],
    };
  }
  try {
    return {
      lastRow: lastRow,
      lastColumn: lastColumn,
      values: sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues(),
    };
  } catch (error) {
    Utilities.sleep(700);
    return {
      lastRow: lastRow,
      lastColumn: lastColumn,
      values: sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues(),
    };
  }
}

function findMentorHeaderIndex_(headers, aliases) {
  const normalizedAliases = (aliases || []).map(normalizeMentorSheetText_);
  for (let index = 0; index < (headers || []).length; index += 1) {
    const normalizedHeader = normalizeMentorSheetText_(headers[index]);
    if (normalizedAliases.indexOf(normalizedHeader) !== -1) {
      return index;
    }
  }
  for (let index = 0; index < (headers || []).length; index += 1) {
    const normalizedHeader = normalizeMentorSheetText_(headers[index]);
    if (!normalizedHeader) continue;
    for (let aliasIndex = 0; aliasIndex < normalizedAliases.length; aliasIndex += 1) {
      const alias = normalizedAliases[aliasIndex];
      if (alias && normalizedHeader.indexOf(alias) !== -1) {
        return index;
      }
    }
  }
  return null;
}

function findMentorSheetHeaderInfo_(values) {
  const rows = values || [];
  const maxRows = Math.min(rows.length, 20);
  const aliases = {
    name: ['성명', '이름', '멘토명', '활동자명', '참여자명'],
    date: ['날짜', '일자', '활동일', '출석일', '방문일'],
    email: ['이메일', '계정이메일', '계정 이메일'],
    status: ['상태', '출결', '출결상태', '활동상태'],
    memo: ['비고', '메모', '내용', '활동내용'],
    startTime: ['시작시간', '시작', '입실', '출근'],
    endTime: ['종료시간', '종료', '퇴실', '퇴근'],
    classification: ['구분', '분류'],
    activityType: ['활동유형', '유형', '직위', '역할'],
  };
  let best = null;
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const headers = rows[rowIndex] || [];
    const map = {};
    Object.keys(aliases).forEach(function(key) {
      map[key] = findMentorHeaderIndex_(headers, aliases[key]);
    });
    const score =
      (map.name !== null ? 4 : 0) +
      (map.date !== null ? 3 : 0) +
      (map.status !== null ? 1 : 0) +
      (map.email !== null ? 1 : 0) +
      (map.memo !== null ? 1 : 0);
    if (!best || score > best.score) {
      best = {
        rowIndex: rowIndex,
        headerRowNumber: rowIndex + 1,
        headers: headers,
        map: map,
        score: score,
      };
    }
  }
  return best || {
    rowIndex: 0,
    headerRowNumber: 1,
    headers: rows[0] || [],
    map: {},
    score: 0,
  };
}

function normalizeMentorSheetDate_(value, fallbackYear) {
  const normalized = normalizeRosterDateValue_(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const text = valueOrEmpty_(value).trim();
  const md = text.match(/(?:^|[^0-9])(\d{1,2})\s*(?:월|[.\-/])\s*(\d{1,2})/);
  const year = normalizeAttendanceYear_(fallbackYear);
  if (md && year) {
    return [
      String(year),
      String(Number(md[1]) || 1).padStart(2, '0'),
      String(Number(md[2]) || 1).padStart(2, '0'),
    ].join('-');
  }
  return '';
}

function normalizeMentorSheetStatus_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) return '출석';
  if (/결석|불참/.test(text)) return '결석';
  if (/공결/.test(text)) return '공결';
  if (/연가|연차|휴가|병가/.test(text)) return text;
  return /출석|참석|활동|참여|완료/.test(text) ? '출석' : text;
}

function getMentorSheetYearMonthFromRow_(row, fallbackYear, fallbackMonth) {
  let year = normalizeAttendanceYear_(fallbackYear) || '';
  let month = Number(fallbackMonth) || 0;
  (row || []).forEach(function(cell) {
    const text = valueOrEmpty_(cell).trim();
    if (!text) return;
    const yearMonthMatch = text.match(/(\d{2,4})\s*년\s*(\d{1,2})\s*월/);
    if (yearMonthMatch) {
      const rawYear = Number(yearMonthMatch[1]) || 0;
      year = rawYear < 100 ? 2000 + rawYear : rawYear;
      month = Number(yearMonthMatch[2]) || month;
      return;
    }
    const monthMatch = text.match(/(?:^|[^0-9])(\d{1,2})\s*월/);
    if (monthMatch) {
      month = Number(monthMatch[1]) || month;
    }
  });
  return {
    year: year,
    month: month,
  };
}

function normalizeMentorSheetDateColumn_(value, fallbackYear, fallbackMonth) {
  const explicitDate = normalizeMentorSheetDate_(value, fallbackYear);
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
    return explicitDate;
  }
  const year = normalizeAttendanceYear_(fallbackYear);
  const month = Number(fallbackMonth) || 0;
  const text = valueOrEmpty_(value).trim();
  const dayMatch = text.match(/^(?:\s*)(\d{1,2})(?:\s*일)?(?:\s*[(（]?[월화수목금토일]?[)）]?)?\s*$/);
  if (!year || !month || !dayMatch) {
    return '';
  }
  const day = Number(dayMatch[1]) || 0;
  if (day < 1 || day > 31) {
    return '';
  }
  return [
    String(year),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function isMentorSheetAttendanceMark_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) return false;
  if (/^[0\s\-_.·]*$/.test(text)) return false;
  if (/^합계$|^계$|^총계$|^월$|^화$|^수$|^목$|^금$|^토$|^일$/.test(text)) return false;
  return true;
}

function isMentorSheetLikelyName_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) return false;
  if (isStaffRosterHeaderLikeValue_(text)) return false;
  if (/년|월|일|요일|합계|총계|출석|결석|비고|상태|시간|멘토|학생|아동/.test(text)) return false;
  if (/학과|학부|전공|대학교|대학|고등학교|중학교|초등학교|학교|기관|센터|학년|학번/.test(text)) return false;
  if (/^\d+$/.test(text)) return false;
  return /[가-힣A-Za-z]/.test(text) && text.length <= 30;
}

function isMentorSheetPersonNameLike_(value) {
  const text = valueOrEmpty_(value).replace(/\s+/g, '').trim();
  if (!isMentorSheetLikelyName_(text)) {
    return false;
  }
  return /^[가-힣]{2,5}$/.test(text) || /^[A-Za-z]{2,20}$/.test(text);
}

function findMentorSheetNameInRow_(row, dateColumnStart) {
  const limit = Math.max(Math.min(Number(dateColumnStart) || row.length, 8), 1);
  for (let index = 0; index < limit; index += 1) {
    const text = valueOrEmpty_(row[index]).trim();
    if (isMentorSheetPersonNameLike_(text)) {
      return text;
    }
  }
  for (let index = 0; index < limit; index += 1) {
    const text = valueOrEmpty_(row[index]).trim();
    if (isMentorSheetLikelyName_(text)) {
      return text;
    }
  }
  for (let index = 0; index < Math.min(row.length, 8); index += 1) {
    const text = valueOrEmpty_(row[index]).trim();
    if (isMentorSheetPersonNameLike_(text)) {
      return text;
    }
  }
  for (let index = 0; index < Math.min(row.length, 8); index += 1) {
    const text = valueOrEmpty_(row[index]).trim();
    if (isMentorSheetLikelyName_(text)) {
      return text;
    }
  }
  return '';
}

function ensureMentorMatrixEntry_(result, year, nameKey, name, config) {
  if (!result[year]) {
    result[year] = {};
  }
  if (!result[year][nameKey]) {
    result[year][nameKey] = {
      name: name,
      activityType: config.activityType || '멘토',
      classification: config.classification || '기타',
      dailyMap: {},
      firstDate: '',
      lastDate: '',
    };
  }
  return result[year][nameKey];
}

function touchMentorMatrixEntryDateRange_(entry, dateKey) {
  const normalizedDate = normalizeRosterDateValue_(dateKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return;
  }
  if (!entry.firstDate || normalizedDate < entry.firstDate) {
    entry.firstDate = normalizedDate;
  }
  if (!entry.lastDate || normalizedDate > entry.lastDate) {
    entry.lastDate = normalizedDate;
  }
}

function collectMentorSheetMatrixAttendanceByYear_(years) {
  const normalizedYears = uniqueNumbers_((years || [2024, 2025, 2026]).map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const result = {};
  normalizedYears.forEach(function(year) {
    result[year] = {};
  });
  const sourceConfigs = getMentorAttendanceSourceConfigs_().filter(function(config) {
    const sourceYear = normalizeAttendanceYear_(config && config.year);
    return !sourceYear || normalizedYears.indexOf(sourceYear) !== -1;
  });

  sourceConfigs.forEach(function(config) {
    const sheet = config.sheet;
    const safeData = getMentorAttendanceSheetValues_(sheet);
    const lastRow = safeData.lastRow;
    const lastColumn = safeData.lastColumn;
    if (lastRow < 1 || lastColumn < 1) return;
    const values = safeData.values;
    let currentYear = normalizeAttendanceYear_(config.year) || '';
    let currentMonth = 0;
    let activeDateColumns = [];

    values.forEach(function(row) {
      const context = getMentorSheetYearMonthFromRow_(row, currentYear, currentMonth);
      currentYear = context.year || currentYear;
      currentMonth = context.month || currentMonth;

      const rowDateColumns = [];
      (row || []).forEach(function(cell, index) {
        const dateKey = normalizeMentorSheetDateColumn_(cell, currentYear, currentMonth);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && normalizedYears.indexOf(Number(dateKey.slice(0, 4))) !== -1) {
          rowDateColumns.push({
            index: index,
            dateKey: dateKey,
          });
        }
      });
      if (rowDateColumns.length >= 2) {
        activeDateColumns = rowDateColumns;
        return;
      }
      if (!activeDateColumns.length) {
        return;
      }

      const firstDateColumn = activeDateColumns.reduce(function(min, item) {
        return Math.min(min, item.index);
      }, row.length);
      const name = findMentorSheetNameInRow_(row, firstDateColumn);
      const nameKey = normalizeStaffRosterPersonNameKey_(name);
      if (!nameKey) {
        return;
      }

      activeDateColumns.forEach(function(item) {
        const year = Number(item.dateKey.slice(0, 4));
        if (normalizedYears.indexOf(year) === -1) return;
        const entry = ensureMentorMatrixEntry_(result, year, nameKey, name, config);
        touchMentorMatrixEntryDateRange_(entry, item.dateKey);
      });

      activeDateColumns.forEach(function(item) {
        const cell = row[item.index];
        if (!isMentorSheetAttendanceMark_(cell)) {
          return;
        }
        const year = Number(item.dateKey.slice(0, 4));
        const entry = ensureMentorMatrixEntry_(result, year, nameKey, name, config);
        touchMentorMatrixEntryDateRange_(entry, item.dateKey);
        entry.dailyMap[item.dateKey] = {
          status: normalizeMentorSheetStatus_(cell),
          memo: config.memo || config.activityType || '멘토',
          startTime: '',
          endTime: '',
        };
      });
    });
  });

  return result;
}

function readMentorSheetRows_() {
  const config = getMentorAttendanceSourceConfigs_()[0];
  if (!config || !config.sheet) {
    throw new Error("'2024년 멘토 출근부', '2025년 멘토 출근부', '2025년 국가근로장학 출근부' 시트를 찾지 못했습니다.");
  }
  return readMentorSheetRowsFromConfig_(config);
}

function readMentorSheetRowsFromConfig_(config) {
  const sheet = config.sheet;
  const safeData = getMentorAttendanceSheetValues_(sheet);
  const lastRow = safeData.lastRow;
  const lastColumn = safeData.lastColumn;
  if (lastRow < 1 || lastColumn < 1) {
    return {
      config: config,
      sheet: sheet,
      values: [],
      headerInfo: findMentorSheetHeaderInfo_([]),
      rows: [],
    };
  }
  const values = safeData.values;
  const headerInfo = findMentorSheetHeaderInfo_(values);
  const rows = values.slice(headerInfo.rowIndex + 1).map(function(row, index) {
    return {
      rowNumber: headerInfo.rowIndex + 2 + index,
      row: row,
    };
  });
  return {
    config: config,
    sheet: sheet,
    values: values,
    headerInfo: headerInfo,
    rows: rows,
  };
}

function inspectMentorSheetLog() {
  const configs = getMentorAttendanceSourceConfigs_();
  if (!configs.length) {
    throw new Error("'2024년 멘토 출근부', '2025년 멘토 출근부', '2025년 국가근로장학 출근부' 시트를 찾지 못했습니다.");
  }
  Logger.log('=== 출근부 시트 분석 ===');
  configs.forEach(function(config) {
    const data = readMentorSheetRowsFromConfig_(config);
    const sheet = data.sheet;
    const headerInfo = data.headerInfo;
    Logger.log('--- 시트: %s / 연도: %s / 활동유형: %s / 구분: %s ---',
      sheet.getName(),
      config.year || '-',
      config.activityType || '-',
      config.classification || '-'
    );
    const safeLastRow = data.values.length;
    const safeLastColumn = data.values[0] ? data.values[0].length : 1;
    Logger.log('읽은 범위: %s행 / %s열', safeLastRow, safeLastColumn);
    Logger.log('추정 헤더 행: %s / 점수: %s', headerInfo.headerRowNumber, headerInfo.score);
    Logger.log('헤더: %s', JSON.stringify(headerInfo.headers || []));
    Logger.log('매핑: %s', JSON.stringify(headerInfo.map || {}));

    const ranges = [
      'A1:' + mentorColumnToLetter_(Math.min(safeLastColumn, 20)) + Math.min(safeLastRow, 30),
    ];
    if (safeLastRow > 30) {
      const startRow = Math.max(1, safeLastRow - 24);
      ranges.push('A' + startRow + ':' + mentorColumnToLetter_(Math.min(safeLastColumn, 20)) + safeLastRow);
    }
    ranges.forEach(function(a1) {
      const range = sheet.getRange(a1);
      const rangeValues = range.getDisplayValues();
      Logger.log('=== 범위: %s ===', a1);
      rangeValues.forEach(function(row, index) {
        Logger.log('%s행: %s', range.getRow() + index, JSON.stringify(row));
      });
    });

    const dateSamples = [];
    const nameSamples = [];
    const map = headerInfo.map || {};
    (data.rows || []).forEach(function(item) {
      const row = item.row || [];
      const name = map.name === null || map.name === undefined ? '' : valueOrEmpty_(row[map.name]).trim();
      const rawDate = map.date === null || map.date === undefined ? '' : valueOrEmpty_(row[map.date]).trim();
      if (name && nameSamples.indexOf(name) === -1 && nameSamples.length < 20) nameSamples.push(name);
      if (rawDate && dateSamples.indexOf(rawDate) === -1 && dateSamples.length < 20) dateSamples.push(rawDate);
    });
    Logger.log('이름 샘플: %s', JSON.stringify(nameSamples));
    Logger.log('날짜 샘플: %s', JSON.stringify(dateSamples));
  });
  const matrixAttendance = collectMentorSheetMatrixAttendanceByYear_([2024, 2025, 2026]);
  Object.keys(matrixAttendance).sort().forEach(function(year) {
    const names = Object.keys(matrixAttendance[year] || {});
    const dateCount = names.reduce(function(sum, nameKey) {
      return sum + Object.keys(matrixAttendance[year][nameKey].dailyMap || {}).length;
    }, 0);
    const rangeCount = names.filter(function(nameKey) {
      const item = matrixAttendance[year][nameKey] || {};
      return !!(item.firstDate && item.lastDate);
    }).length;
    Logger.log('가로 날짜표 추정: %s년 / 인원 %s명 / 날짜범위 %s명 / 출결일 %s건 / 샘플 %s',
      year,
      names.length,
      rangeCount,
      dateCount,
      JSON.stringify(names.slice(0, 10).map(function(nameKey) {
        return matrixAttendance[year][nameKey].name;
      }))
    );
  });
}

function mentorColumnToLetter_(column) {
  let temp = Number(column) || 1;
  let letter = '';
  while (temp > 0) {
    const modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

function buildMentorNonStaffEntriesByYear_(years) {
  const normalizedYears = uniqueNumbers_((years || [2024, 2025, 2026]).map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const sourceConfigs = getMentorAttendanceSourceConfigs_();
  if (!sourceConfigs.length) {
    throw new Error("'2024년 멘토 출근부', '2025년 멘토 출근부', '2025년 국가근로장학 출근부' 시트를 찾지 못했습니다.");
  }

  const byYearAndName = {};
  const currentYear = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy')) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const getYearlyNonStaffStatus = function(year) {
    return Number(year) < currentYear ? '종료' : '활동';
  };
  normalizedYears.forEach(function(year) {
    byYearAndName[year] = {};
  });
  const matrixAttendanceByYear = collectMentorSheetMatrixAttendanceByYear_(normalizedYears);

  sourceConfigs.forEach(function(config) {
    const data = readMentorSheetRowsFromConfig_(config);
    const map = data.headerInfo.map || {};
    if (map.name === null || map.name === undefined) {
      return;
    }
    (data.rows || []).forEach(function(item) {
      const row = item.row || [];
      const name = valueOrEmpty_(row[map.name]).trim();
      if (!name || isStaffRosterHeaderLikeValue_(name)) return;
      const rawDateValue = map.date === null || map.date === undefined ? '' : row[map.date];
      const explicitDate = rawDateValue ? normalizeMentorSheetDate_(rawDateValue, config.year) : '';
      const targetYears = explicitDate
        ? [Number(explicitDate.slice(0, 4))]
        : [normalizeAttendanceYear_(config.year)].filter(Boolean);
      targetYears.forEach(function(year) {
        if (normalizedYears.indexOf(year) === -1) return;
        const nameKey = normalizeStaffRosterPersonNameKey_(name);
        if (!nameKey) return;
        if (!byYearAndName[year][nameKey]) {
          byYearAndName[year][nameKey] = {
            displayOrder: '',
            name: name,
            email: map.email === null || map.email === undefined ? '' : valueOrEmpty_(row[map.email]).trim(),
            position: map.activityType === null || map.activityType === undefined ? (config.activityType || '멘토') : (valueOrEmpty_(row[map.activityType]).trim() || config.activityType || '멘토'),
            group: '',
            classification: map.classification === null || map.classification === undefined ? (config.classification || '기타') : (valueOrEmpty_(row[map.classification]).trim() || config.classification || '기타'),
            category: config.classification || '기타',
            status: getYearlyNonStaffStatus(year),
            joinDate: '',
            exitDate: '',
            attendanceStatus: '출석',
            attendanceDays: '',
            absenceDays: '',
            attendanceMemo: '',
            dailyAttendanceJson: '',
            sourceType: 'nonstaff',
            sourceSheet: '비 종사자',
            sourceRowNumber: 0,
          };
        }
        const entry = byYearAndName[year][nameKey];
        if (!entry.email && map.email !== null && map.email !== undefined) entry.email = valueOrEmpty_(row[map.email]).trim();
        const dailyMap = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson);
        const dateForYear = rawDateValue ? normalizeMentorSheetDate_(rawDateValue, year) : '';
        if (dateForYear && Number(dateForYear.slice(0, 4)) === year) {
          const status = map.status === null || map.status === undefined ? '출석' : normalizeMentorSheetStatus_(row[map.status]);
          const memo = map.memo === null || map.memo === undefined ? (config.memo || config.activityType || '멘토') : (valueOrEmpty_(row[map.memo]).trim() || config.memo || config.activityType || '멘토');
          dailyMap[dateForYear] = {
            status: status,
            memo: memo,
            startTime: map.startTime === null || map.startTime === undefined ? '' : valueOrEmpty_(row[map.startTime]).trim(),
            endTime: map.endTime === null || map.endTime === undefined ? '' : valueOrEmpty_(row[map.endTime]).trim(),
          };
        }
        const dates = Object.keys(dailyMap).sort();
        entry.dailyAttendanceJson = stringifyStaffRosterDailyAttendanceMap_(dailyMap);
        entry.attendanceDays = dates.length ? String(dates.length) : '';
        entry.joinDate = dates.length ? dates[0] : year + '-01-01';
        entry.exitDate = dates.length ? dates[dates.length - 1] : year + '-12-31';
      });
    });
  });

  normalizedYears.forEach(function(year) {
    const matrixByName = matrixAttendanceByYear[year] || {};
    Object.keys(matrixByName).forEach(function(nameKey) {
      const matrixEntry = matrixByName[nameKey];
      if (!byYearAndName[year][nameKey]) {
        byYearAndName[year][nameKey] = {
          displayOrder: '',
          name: matrixEntry.name,
          email: '',
          position: matrixEntry.activityType || '멘토',
          group: '',
          classification: matrixEntry.classification || '기타',
          category: matrixEntry.classification || '기타',
          status: getYearlyNonStaffStatus(year),
          joinDate: '',
          exitDate: '',
          attendanceStatus: '출석',
          attendanceDays: '',
          absenceDays: '',
          attendanceMemo: '',
          dailyAttendanceJson: '',
          sourceType: 'nonstaff',
          sourceSheet: '비 종사자',
          sourceRowNumber: 0,
        };
      }
      const entry = byYearAndName[year][nameKey];
      const dailyMap = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson);
      Object.keys(matrixEntry.dailyMap || {}).forEach(function(dateKey) {
        dailyMap[dateKey] = matrixEntry.dailyMap[dateKey];
      });
      const dates = Object.keys(dailyMap).sort();
      entry.dailyAttendanceJson = stringifyStaffRosterDailyAttendanceMap_(dailyMap);
      entry.attendanceDays = dates.length ? String(dates.length) : '';
      entry.joinDate = dates.length ? dates[0] : (matrixEntry.firstDate || entry.joinDate);
      entry.exitDate = dates.length ? dates[dates.length - 1] : (matrixEntry.lastDate || entry.exitDate);
    });
  });

  return byYearAndName;
}

function getStaffRosterDailyAttendanceDateRangeForYear_(dailyAttendanceJson, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear);
  if (!normalizedYear) {
    return null;
  }
  const dailyMap = parseStaffRosterDailyAttendanceJson_(dailyAttendanceJson);
  const dates = Object.keys(dailyMap || {}).map(function(dateKey) {
    return normalizeRosterDateValue_(dateKey);
  }).filter(function(dateKey) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && Number(dateKey.slice(0, 4)) === normalizedYear;
  }).sort();
  if (!dates.length) {
    return null;
  }
  return {
    joinDate: dates[0],
    exitDate: dates[dates.length - 1],
  };
}

function applyNonStaffDateRangesFromDailyAttendance_(bundle, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const info = bundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
  let updatedCount = 0;
  info.entries = (info.entries || []).map(function(entry) {
    const range = getStaffRosterDailyAttendanceDateRangeForYear_(entry && entry.dailyAttendanceJson, normalizedYear);
    if (!range) {
      return entry;
    }
    if (normalizeRosterDateValue_(entry && entry.joinDate) === range.joinDate
      && normalizeRosterDateValue_(entry && entry.exitDate) === range.exitDate) {
      return entry;
    }
    updatedCount += 1;
    return normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
      joinDate: range.joinDate,
      exitDate: range.exitDate,
      sourceType: 'nonstaff',
      sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '비 종사자',
    }), 'nonstaff', '비 종사자');
  });
  bundle.nonStaffInfo = info;
  return updatedCount;
}

function isAttendanceImportManagedNonStaffEntry_(entry) {
  const position = valueOrEmpty_(entry && entry.position).trim();
  const group = valueOrEmpty_(entry && (entry.group || entry.category)).trim();
  const classification = valueOrEmpty_(entry && entry.classification).trim();
  const text = [position, group, classification].join(' ');
  return /멘토|근로장학생|국가근로장학/.test(text);
}

function getNonStaffEntryMergeKey_(entry) {
  const email = normalizeStaffRosterEmail_(entry && entry.email);
  if (email) {
    return 'email:' + email;
  }
  const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
  return nameKey ? 'name:' + nameKey : '';
}

function getNonStaffSourceSheetsForRecovery_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const exactNames = [
    '비 종사자',
    '비종사자',
    '비 종사자 현황',
    '비종사자 현황',
    '비 종사자현황',
  ];
  const foundByName = {};
  const result = [];
  const addSheet = function(sheet) {
    if (!sheet) return;
    const name = sheet.getName();
    if (foundByName[name]) return;
    if (name === STAFF_ROSTER_DB_SHEET_NAME || name === LOG_PRINT_CONFIG.DATA_STORE_SHEET_NAME) return;
    foundByName[name] = true;
    result.push(sheet);
  };
  exactNames.forEach(function(name) {
    addSheet(spreadsheet.getSheetByName(name));
  });
  spreadsheet.getSheets().forEach(function(sheet) {
    const normalizedName = String(sheet.getName() || '').replace(/\s+/g, '');
    if (/비.*종사|비종사/.test(normalizedName)) {
      addSheet(sheet);
    }
  });
  return result;
}

function getPreservedNonStaffEntriesForAttendanceImport_(selectedYear, currentEntries) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const preservedByKey = {};
  const addEntry = function(entry) {
    if (!entry || !entry.name || isAttendanceImportManagedNonStaffEntry_(entry)) {
      return;
    }
    const normalized = normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
      sourceType: 'nonstaff',
      sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '비 종사자',
    }), 'nonstaff', '비 종사자');
    const key = getNonStaffEntryMergeKey_(normalized);
    if (key && !preservedByKey[key]) {
      preservedByKey[key] = normalized;
    }
  };

  (currentEntries || []).forEach(addEntry);

  getNonStaffSourceSheetsForRecovery_().forEach(function(sheet) {
    const sourceInfo = readStaffRosterEntriesFromSheet_(sheet, 'nonstaff');
    filterStaffRosterEntriesForYear_(sourceInfo.entries || [], normalizedYear).forEach(addEntry);
  });

  return Object.keys(preservedByKey).map(function(key) {
    return preservedByKey[key];
  });
}

function isNonStaffCarryoverCandidate_(entry, sourceYear, targetYear) {
  if (!entry || !entry.name || isAttendanceImportManagedNonStaffEntry_(entry)) {
    return false;
  }
  const normalizedSourceYear = normalizeAttendanceYear_(sourceYear);
  const normalizedTargetYear = normalizeAttendanceYear_(targetYear);
  const targetStart = normalizedTargetYear + '-01-01';
  const sourceEnd = normalizedSourceYear + '-12-31';
  const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
  const status = valueOrEmpty_(entry && entry.status).trim();
  if (exitDate && exitDate <= sourceEnd) {
    return false;
  }
  if (!exitDate && /종료|퇴사|퇴직|비활성/.test(status)) {
    return false;
  }
  if (exitDate && exitDate < targetStart) {
    return false;
  }
  return true;
}

function buildNonStaffCarryoverEntry_(entry, targetYear, sourceRowNumber) {
  const normalizedTargetYear = normalizeAttendanceYear_(targetYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const targetStart = normalizedTargetYear + '-01-01';
  const targetEnd = normalizedTargetYear + '-12-31';
  const currentYear = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy')) || normalizedTargetYear;
  const sourceJoinDate = normalizeRosterDateValue_(entry && entry.joinDate);
  const sourceExitDate = normalizeRosterDateValue_(entry && entry.exitDate);
  const carryJoinDate = sourceJoinDate && sourceJoinDate > targetStart ? sourceJoinDate : targetStart;
  const carryExitDate = sourceExitDate && sourceExitDate < targetEnd ? sourceExitDate : targetEnd;
  return normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
    joinDate: carryJoinDate,
    exitDate: carryExitDate,
    status: normalizedTargetYear < currentYear ? '종료' : (valueOrEmpty_(entry && entry.status).trim() || '활동'),
    attendanceStatus: '',
    attendanceDays: '',
    absenceDays: '',
    attendanceMemo: '',
    dailyAttendanceJson: '',
    sourceType: 'nonstaff',
    sourceSheet: '비 종사자',
    sourceRowNumber: sourceRowNumber,
  }), 'nonstaff', '비 종사자');
}

function carryOverNonStaffRosterFrom2024To2025() {
  assertStaffRosterAdmin_();
  const sourceYear = 2024;
  const targetYear = 2025;
  const sourceBundle = getStaffRosterBundleByYear_(sourceYear);
  const targetBundle = getStaffRosterBundleByYear_(targetYear);
  const targetInfo = targetBundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
  const existingKeys = {};
  (targetInfo.entries || []).forEach(function(entry) {
    const key = getNonStaffEntryMergeKey_(entry);
    if (key) existingKeys[key] = true;
  });
  let nextRowNumber = Math.max.apply(null, [1].concat((targetInfo.entries || []).map(function(entry) {
    return Number(entry && entry.sourceRowNumber) || 0;
  }))) + 1;
  const addedEntries = [];
  let skippedExistingCount = 0;
  let skippedEndedCount = 0;

  (sourceBundle.nonStaffInfo && sourceBundle.nonStaffInfo.entries || []).forEach(function(entry) {
    if (!isNonStaffCarryoverCandidate_(entry, sourceYear, targetYear)) {
      if (entry && entry.name && !isAttendanceImportManagedNonStaffEntry_(entry)) {
        skippedEndedCount += 1;
      }
      return;
    }
    const key = getNonStaffEntryMergeKey_(entry);
    if (key && existingKeys[key]) {
      skippedExistingCount += 1;
      return;
    }
    const carriedEntry = buildNonStaffCarryoverEntry_(entry, targetYear, nextRowNumber++);
    const carriedKey = getNonStaffEntryMergeKey_(carriedEntry);
    if (carriedKey) {
      existingKeys[carriedKey] = true;
    }
    targetInfo.entries.push(carriedEntry);
    addedEntries.push(carriedEntry);
  });

  targetBundle.nonStaffInfo = targetInfo;
  targetBundle.entries = (targetBundle.staffInfo && targetBundle.staffInfo.entries || []).concat(targetInfo.entries || []);
  saveStaffRosterMasterMutation_(targetYear, targetBundle);
  return {
    sourceYear: sourceYear,
    targetYear: targetYear,
    addedCount: addedEntries.length,
    skippedExistingCount: skippedExistingCount,
    skippedEndedCount: skippedEndedCount,
    addedNames: addedEntries.map(function(entry) { return entry.name; }),
  };
}

function carryOverNonStaffRosterFrom2024To2025WithAlert() {
  const result = carryOverNonStaffRosterFrom2024To2025();
  const lines = [
    '24년 -> 25년 비종사자 이월 결과',
    '추가: ' + result.addedCount + '명',
    '이미 있음: ' + result.skippedExistingCount + '명',
    '종료/대상 아님: ' + result.skippedEndedCount + '명',
  ];
  if (result.addedNames.length) {
    lines.push('추가 명단: ' + result.addedNames.join(', '));
  }
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function syncSeniorAttendanceFromHwangJiyoung2025() {
  assertStaffRosterAdmin_();
  const selectedYear = 2025;
  const bundle = getStaffRosterBundleByYear_(selectedYear);
  const info = bundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
  const entries = info.entries || [];
  const sourceNameKey = normalizeStaffRosterPersonNameKey_('황지영');
  const sourceEntry = entries.find(function(entry) {
    return normalizeStaffRosterPersonNameKey_(entry && entry.name) === sourceNameKey;
  });
  if (!sourceEntry) {
    throw new Error('2025년 비종사자 현황에서 황지영을 찾지 못했습니다.');
  }
  const sourceDailyAttendanceJson = valueOrEmpty_(sourceEntry.dailyAttendanceJson).trim();
  const sourceDailyMap = parseStaffRosterDailyAttendanceJson_(sourceDailyAttendanceJson);
  const sourceDates = Object.keys(sourceDailyMap).sort();
  if (!sourceDates.length) {
    throw new Error('황지영 상세보기 출결 데이터가 비어 있습니다.');
  }
  let updatedCount = 0;
  const updatedNames = [];
  info.entries = entries.map(function(entry) {
    const name = valueOrEmpty_(entry && entry.name).trim();
    const nameKey = normalizeStaffRosterPersonNameKey_(name);
    const text = [
      entry && entry.position,
      entry && entry.group,
      entry && entry.category,
      entry && entry.classification,
    ].join(' ');
    if (!name || nameKey === sourceNameKey || !/시니어/.test(text)) {
      return entry;
    }
    updatedCount += 1;
    updatedNames.push(name);
    return normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
      attendanceStatus: valueOrEmpty_(sourceEntry.attendanceStatus).trim() || '출석',
      attendanceDays: valueOrEmpty_(sourceEntry.attendanceDays).trim() || String(sourceDates.length),
      absenceDays: valueOrEmpty_(sourceEntry.absenceDays).trim(),
      attendanceMemo: valueOrEmpty_(sourceEntry.attendanceMemo).trim(),
      dailyAttendanceJson: stringifyStaffRosterDailyAttendanceMap_(sourceDailyMap),
      joinDate: normalizeRosterDateValue_(sourceEntry.joinDate) || sourceDates[0],
      exitDate: normalizeRosterDateValue_(sourceEntry.exitDate) || sourceDates[sourceDates.length - 1],
      sourceType: 'nonstaff',
      sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '비 종사자',
    }), 'nonstaff', '비 종사자');
  });
  bundle.nonStaffInfo = info;
  bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || []).concat(info.entries || []);
  saveStaffRosterMasterMutation_(selectedYear, bundle);
  return {
    selectedYear: selectedYear,
    sourceName: '황지영',
    sourceDateCount: sourceDates.length,
    updatedCount: updatedCount,
    updatedNames: updatedNames,
  };
}

function syncSeniorAttendanceFromHwangJiyoung2025WithAlert() {
  const result = syncSeniorAttendanceFromHwangJiyoung2025();
  const lines = [
    '2025년 시니어 출결 복사 완료',
    '기준: 황지영',
    '출결일: ' + result.sourceDateCount + '일',
    '반영: ' + result.updatedCount + '명',
  ];
  if (result.updatedNames.length) {
    lines.push('반영 명단: ' + result.updatedNames.join(', '));
  }
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function isSeniorNonStaffRosterEntry_(entry) {
  const text = [
    entry && entry.position,
    entry && entry.group,
    entry && entry.category,
    entry && entry.classification,
  ].join(' ');
  return /시니어/.test(text);
}

function formatSeniorAttendanceDateKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd');
}

function buildSeniorMonthlyAttendanceMapByDateRange_(selectedYear, joinDateKey, exitDateKey) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const yearStartKey = normalizedYear + '-01-01';
  const yearEndKey = normalizedYear + '-12-31';
  const startKey = normalizeRosterDateValue_(joinDateKey);
  const endKey = normalizeRosterDateValue_(exitDateKey);
  if (!startKey || !endKey || endKey < startKey) {
    return {};
  }

  const boundedStartKey = startKey > yearStartKey ? startKey : yearStartKey;
  const boundedEndKey = endKey < yearEndKey ? endKey : yearEndKey;
  if (boundedEndKey < boundedStartKey) {
    return {};
  }

  const map = {};
  for (let month = 1; month <= 12; month += 1) {
    const monthStartKey = normalizedYear + '-' + String(month).padStart(2, '0') + '-01';
    const monthEndDate = new Date(normalizedYear, month, 0);
    const monthEndKey = formatSeniorAttendanceDateKey_(monthEndDate);
    const rangeStartKey = monthStartKey > boundedStartKey ? monthStartKey : boundedStartKey;
    const rangeEndKey = monthEndKey < boundedEndKey ? monthEndKey : boundedEndKey;
    if (rangeEndKey < rangeStartKey) {
      continue;
    }

    let addedInMonth = 0;
    const cursor = parseDateKeyAsKstDate_(rangeStartKey);
    const endDate = parseDateKeyAsKstDate_(rangeEndKey);
    while (cursor && endDate && cursor.getTime() <= endDate.getTime() && addedInMonth < 20) {
      const weekDay = cursor.getDay();
      if (weekDay !== 0 && weekDay !== 6) {
        map[formatSeniorAttendanceDateKey_(cursor)] = {
          status: '출석',
          memo: '',
          startTime: '',
          endTime: '',
        };
        addedInMonth += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

function resetSeniorAttendanceByDateRangeForYears2024To2026() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const results = [];

  years.forEach(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    const info = bundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
    const changedEntries = [];
    let skippedNoRangeCount = 0;

    info.entries = (info.entries || []).map(function(entry) {
      if (!isSeniorNonStaffRosterEntry_(entry)) {
        return entry;
      }
      const joinDate = normalizeRosterDateValue_(entry && entry.joinDate);
      const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
      const dailyMap = buildSeniorMonthlyAttendanceMapByDateRange_(year, joinDate, exitDate);
      const dateCount = Object.keys(dailyMap).length;
      if (!joinDate || !exitDate || !dateCount) {
        skippedNoRangeCount += 1;
        return entry;
      }

      const updatedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
        attendanceStatus: '출석',
        attendanceDays: String(dateCount),
        absenceDays: '',
        attendanceMemo: '월별 20일 기준 자동 생성',
        dailyAttendanceJson: stringifyStaffRosterDailyAttendanceMap_(dailyMap),
        sourceType: 'nonstaff',
        sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '비 종사자',
      }), 'nonstaff', '비 종사자');
      changedEntries.push(updatedEntry);
      return updatedEntry;
    });

    bundle.nonStaffInfo = info;
    bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || []).concat(info.entries || []);
    if (changedEntries.length) {
      upsertStaffRosterDbEntries_(year, changedEntries);
      touchStaffRosterRuntimeCaches_(year, bundle);
      try {
        markStaffRosterCacheStale_(year);
      } catch (error) {
        Logger.log('resetSeniorAttendanceByDateRangeForYears2024To2026 cache stale failed: %s', error.message);
      }
    }
    results.push({
      year: year,
      updatedCount: changedEntries.length,
      skippedNoRangeCount: skippedNoRangeCount,
      attendanceDateCount: changedEntries.reduce(function(sum, entry) {
        return sum + Object.keys(parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson)).length;
      }, 0),
      updatedNames: changedEntries.map(function(entry) {
        return valueOrEmpty_(entry && entry.name).trim();
      }).filter(Boolean),
    });
  });

  return { results: results };
}

function resetSeniorAttendanceByDateRangeForYears2024To2026WithAlert() {
  const result = resetSeniorAttendanceByDateRangeForYears2024To2026();
  const lines = ['24~26년 시니어 출결 초기화 완료'];
  (result.results || []).forEach(function(item) {
    lines.push(item.year + '년: 반영 ' + item.updatedCount + '명 / 출결 ' + item.attendanceDateCount + '일 / 시작·종료일 없음 ' + item.skippedNoRangeCount + '명');
    if (item.updatedNames && item.updatedNames.length) {
      lines.push(' - ' + item.updatedNames.join(', '));
    }
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function buildStaffAnnualLeaveLookupForYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const support = getAnnualLeaveSupportByYear_(normalizedYear);
  const lookup = {};
  Object.keys(support.leaveNamesByDate || {}).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate) return;
    (support.leaveNamesByDate[dateKey] || []).forEach(function(name) {
      const nameKey = normalizeAnnualLeavePersonKey_(name);
      if (!nameKey) return;
      if (!lookup[nameKey]) lookup[nameKey] = {};
      lookup[nameKey][normalizedDate] = true;
    });
  });
  return lookup;
}

function getStaffAttendanceDefaultEndDateKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const yearStartKey = normalizedYear + '-01-01';
  const yearEndKey = normalizedYear + '-12-31';
  const todayKey = normalizeDateKey_(new Date());
  if (!todayKey) {
    return yearEndKey;
  }
  const todayYear = normalizeAttendanceYear_(todayKey.slice(0, 4));
  if (todayYear > normalizedYear) {
    return yearEndKey;
  }
  if (todayYear < normalizedYear) {
    return yearStartKey;
  }
  return todayKey < yearStartKey ? yearStartKey : (todayKey > yearEndKey ? yearEndKey : todayKey);
}

function getStaffAttendanceHolidayMap_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const holidaysByYear = {
    2024: {
      '2024-01-01': '신정',
      '2024-02-09': '설날',
      '2024-02-10': '설날',
      '2024-02-11': '설날',
      '2024-02-12': '대체',
      '2024-03-01': '삼일절',
      '2024-04-10': '선거일',
      '2024-05-01': '근로자의날',
      '2024-05-05': '어린이날',
      '2024-05-06': '대체',
      '2024-05-15': '부처님오신날',
      '2024-06-06': '현충일',
      '2024-08-15': '광복절',
      '2024-09-16': '추석',
      '2024-09-17': '추석',
      '2024-09-18': '추석',
      '2024-10-03': '개천절',
      '2024-10-09': '한글날',
      '2024-12-25': '성탄절',
    },
    2025: {
      '2025-01-01': '신정',
      '2025-01-27': '임시공휴일',
      '2025-01-28': '설날',
      '2025-01-29': '설날',
      '2025-01-30': '설날',
      '2025-03-01': '삼일절',
      '2025-03-03': '대체',
      '2025-05-01': '근로자의날',
      '2025-05-05': '어린이날/부처님',
      '2025-05-06': '대체',
      '2025-06-03': '선거일',
      '2025-06-06': '현충일',
      '2025-08-15': '광복절',
      '2025-10-03': '개천절',
      '2025-10-05': '추석',
      '2025-10-06': '추석',
      '2025-10-07': '추석',
      '2025-10-08': '대체',
      '2025-10-09': '한글날',
      '2025-12-25': '성탄절',
    },
    2026: {
      '2026-01-01': '신정',
      '2026-02-16': '설날',
      '2026-02-17': '설날',
      '2026-02-18': '설날',
      '2026-03-01': '삼일절',
      '2026-03-02': '대체',
      '2026-05-01': '근로자의날',
      '2026-05-05': '어린이날',
      '2026-05-24': '부처님오신날',
      '2026-05-25': '대체',
      '2026-06-03': '선거일',
      '2026-06-06': '현충일',
      '2026-08-15': '광복절',
      '2026-08-17': '대체',
      '2026-09-24': '추석',
      '2026-09-25': '추석',
      '2026-09-26': '추석',
      '2026-09-28': '대체',
      '2026-10-03': '개천절',
      '2026-10-05': '대체',
      '2026-10-09': '한글날',
      '2026-12-25': '성탄절',
    },
  };
  return holidaysByYear[normalizedYear] || {};
}

function buildStaffAttendanceMapByDateRange_(selectedYear, joinDateKey, exitDateKey, personName, leaveLookup) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const yearStartKey = normalizedYear + '-01-01';
  const yearEndKey = normalizedYear + '-12-31';
  const startKey = normalizeRosterDateValue_(joinDateKey);
  const endKey = normalizeRosterDateValue_(exitDateKey) || getStaffAttendanceDefaultEndDateKey_(normalizedYear);
  if (!startKey || !endKey || endKey < startKey) {
    return {};
  }

  const boundedStartKey = startKey > yearStartKey ? startKey : yearStartKey;
  const boundedEndKey = endKey < yearEndKey ? endKey : yearEndKey;
  if (boundedEndKey < boundedStartKey) {
    return {};
  }

  const map = {};
  const nameKey = normalizeAnnualLeavePersonKey_(personName);
  const personLeaveLookup = nameKey && leaveLookup && leaveLookup[nameKey] ? leaveLookup[nameKey] : {};
  const holidayMap = getStaffAttendanceHolidayMap_(normalizedYear);
  const cursor = parseDateKeyAsKstDate_(boundedStartKey);
  const endDate = parseDateKeyAsKstDate_(boundedEndKey);
  while (cursor && endDate && cursor.getTime() <= endDate.getTime()) {
    const weekDay = cursor.getDay();
    const dateKey = formatSeniorAttendanceDateKey_(cursor);
    if (weekDay !== 0 && weekDay !== 6 && !holidayMap[dateKey]) {
      if (personLeaveLookup[dateKey]) {
        map[dateKey] = {
          status: '연가',
          memo: '',
          startTime: '',
          endTime: '',
        };
      } else {
        map[dateKey] = {
          status: '출석',
          memo: '',
          startTime: '',
          endTime: '',
        };
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return map;
}

function resetStaffAttendanceByAnnualLeaveForYears_(years) {
  assertStaffRosterAdmin_();
  const options = {};
  const rawYears = Array.isArray(years)
    ? years
    : (years && typeof years === 'object' && Array.isArray(years.years) ? years.years : []);
  const normalizedYears = uniqueNumbers_(rawYears.map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  if (years && !Array.isArray(years) && typeof years === 'object') {
    Object.keys(years).forEach(function(key) {
      if (key !== 'years') options[key] = years[key];
    });
  }
  const skipCenterDirector = !!options.skipCenterDirector;
  const clearOutOfRange = !!options.clearOutOfRange;
  const results = [];

  normalizedYears.forEach(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    prepareStaffRosterBundleForDisplayYear_(year, bundle, true);
    const info = bundle.staffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '종사자', 'staff');
    const leaveLookup = buildStaffAnnualLeaveLookupForYear_(year);
    const changedEntries = [];
    let skippedNoRangeCount = 0;
    let skippedCenterDirectorCount = 0;
    let leaveDateCount = 0;

    info.entries = (info.entries || []).map(function(entry) {
      const name = valueOrEmpty_(entry && entry.name).trim();
      const position = valueOrEmpty_(entry && entry.position).trim();
      if (skipCenterDirector && /센터장|시설장/.test(position)) {
        skippedCenterDirectorCount += 1;
        return entry;
      }
      const joinDate = normalizeRosterDateValue_(entry && entry.joinDate);
      const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
      const dailyMap = buildStaffAttendanceMapByDateRange_(year, joinDate, exitDate, name, leaveLookup);
      const dateKeys = Object.keys(dailyMap);
      if (!name || !joinDate || !dateKeys.length) {
        skippedNoRangeCount += 1;
        if (clearOutOfRange && name && joinDate) {
          const updatedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
            attendanceStatus: '',
            attendanceDays: '',
            absenceDays: '',
            attendanceMemo: '',
            dailyAttendanceJson: '',
            sourceType: 'staff',
            sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '종사자',
          }), 'staff', '종사자');
          changedEntries.push(updatedEntry);
          return updatedEntry;
        }
        return entry;
      }

      const personLeaveDateCount = dateKeys.filter(function(dateKey) {
        return dailyMap[dateKey] && dailyMap[dateKey].status === '연가';
      }).length;
      leaveDateCount += personLeaveDateCount;
      const attendanceDateCount = dateKeys.length - personLeaveDateCount;
      const updatedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
        attendanceStatus: '출석',
        attendanceDays: String(attendanceDateCount),
        absenceDays: personLeaveDateCount ? String(personLeaveDateCount) : '',
        attendanceMemo: '',
        dailyAttendanceJson: stringifyStaffRosterDailyAttendanceMap_(dailyMap),
        sourceType: 'staff',
        sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '종사자',
      }), 'staff', '종사자');
      changedEntries.push(updatedEntry);
      return updatedEntry;
    });

    bundle.staffInfo = info;
    bundle.entries = (info.entries || []).concat(bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
    if (changedEntries.length) {
      saveStaffRosterMasterByYear_(year, bundle);
      touchStaffRosterRuntimeCaches_(year, bundle);
      try {
        markStaffRosterCacheStale_(year);
      } catch (error) {
        Logger.log('resetStaffAttendanceByAnnualLeaveForYears2024To2026 cache stale failed: %s', error.message);
      }
    }
    results.push({
      year: year,
      updatedCount: changedEntries.length,
      skippedNoRangeCount: skippedNoRangeCount,
      skippedCenterDirectorCount: skippedCenterDirectorCount,
      attendanceDateCount: changedEntries.reduce(function(sum, entry) {
        return sum + Object.keys(parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson)).filter(function(dateKey) {
          const item = parseStaffRosterDailyAttendanceJson_(entry.dailyAttendanceJson)[dateKey];
          return item && normalizeStaffRosterDailyAttendanceItem_(item).status === '출석';
        }).length;
      }, 0),
      leaveDateCount: leaveDateCount,
      updatedNames: changedEntries.map(function(entry) {
        return valueOrEmpty_(entry && entry.name).trim();
      }).filter(Boolean),
    });
  });

  return { results: results };
}

function resetStaffAttendanceByAnnualLeaveForYears2024To2026() {
  return resetStaffAttendanceByAnnualLeaveForYears_([2024, 2025, 2026]);
}

function resetStaffAttendanceByAnnualLeaveForYear2026ExceptCenterDirector() {
  return resetStaffAttendanceByAnnualLeaveForYears_({
    years: [2026],
    skipCenterDirector: true,
    clearOutOfRange: true,
  });
}

function resetStaffAttendanceByAnnualLeaveForYears2024To2026WithAlert() {
  const result = resetStaffAttendanceByAnnualLeaveForYears2024To2026();
  const lines = ['24~26년 종사자 출결 초기화 완료'];
  (result.results || []).forEach(function(item) {
    lines.push(item.year + '년: 반영 ' + item.updatedCount + '명 / 출석 ' + item.attendanceDateCount + '일 / 연가 ' + item.leaveDateCount + '일 / 시작일 없음 ' + item.skippedNoRangeCount + '명');
    if (item.updatedNames && item.updatedNames.length) {
      lines.push(' - ' + item.updatedNames.join(', '));
    }
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function clearStaffRosterAutoAttendanceMemoFromEntry_(entry) {
  const AUTO_MEMO_TEXT = '연가 외 평일 출석 자동 생성';
  const nextEntry = Object.assign({}, entry || {});
  let changed = false;
  let dailyMemoClearedCount = 0;
  if (valueOrEmpty_(nextEntry.attendanceMemo).trim() === AUTO_MEMO_TEXT) {
    nextEntry.attendanceMemo = '';
    changed = true;
  }
  const dailyMap = parseStaffRosterDailyAttendanceJson_(nextEntry.dailyAttendanceJson);
  Object.keys(dailyMap || {}).forEach(function(dateKey) {
    const item = normalizeStaffRosterDailyAttendanceItem_(dailyMap[dateKey]);
    if (valueOrEmpty_(item.memo).trim() === AUTO_MEMO_TEXT) {
      item.memo = '';
      dailyMap[dateKey] = item;
      dailyMemoClearedCount += 1;
      changed = true;
    }
  });
  if (dailyMemoClearedCount) {
    nextEntry.dailyAttendanceJson = stringifyStaffRosterDailyAttendanceMap_(dailyMap);
  }
  return {
    entry: nextEntry,
    changed: changed,
    dailyMemoClearedCount: dailyMemoClearedCount,
  };
}

function clearStaffRosterAutoAttendanceMemoForYears_(years) {
  assertStaffRosterAdmin_();
  const AUTO_MEMO_TEXT = '연가 외 평일 출석 자동 생성';
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYears = uniqueNumbers_((years || []).map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const yearLookup = {};
  normalizedYears.forEach(function(year) {
    yearLookup[year] = true;
  });
  const resultsByYear = {};
  normalizedYears.forEach(function(year) {
    resultsByYear[year] = {
      year: year,
      rosterMemoClearedCount: 0,
      dailyMemoClearedCount: 0,
      attendanceDbMemoClearedCount: 0,
      masterStoreMemoClearedCount: 0,
    };
  });

  const staffDbSheet = spreadsheet.getSheetByName(STAFF_ROSTER_DB_SHEET_NAME);
  if (staffDbSheet && staffDbSheet.getLastRow() > 1) {
    const range = staffDbSheet.getRange(2, 1, staffDbSheet.getLastRow() - 1, STAFF_ROSTER_DB_HEADERS.length);
    const values = range.getDisplayValues();
    let changed = false;
    const nowText = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
    values.forEach(function(row) {
      const rowYear = normalizeAttendanceYear_(row[1]);
      if (!yearLookup[rowYear] || valueOrEmpty_(row[7]).trim()) {
        return;
      }
      try {
        const parsed = JSON.parse(valueOrEmpty_(row[8]).trim() || '{}');
        const cleaned = clearStaffRosterAutoAttendanceMemoFromEntry_(parsed);
        if (!cleaned.changed) {
          return;
        }
        const sourceType = normalizeStaffRosterDashboardType_(parsed.sourceType || row[2]);
        const sourceSheet = valueOrEmpty_(parsed.sourceSheet || row[3]).trim() || getStaffRosterSheetNameBySourceType_(sourceType);
        row[6] = nowText;
        row[8] = JSON.stringify(normalizeStaffRosterCacheEntry_(cleaned.entry, sourceType, sourceSheet));
        resultsByYear[rowYear].rosterMemoClearedCount += valueOrEmpty_(parsed.attendanceMemo).trim() === AUTO_MEMO_TEXT ? 1 : 0;
        resultsByYear[rowYear].dailyMemoClearedCount += cleaned.dailyMemoClearedCount;
        changed = true;
      } catch (error) {
        Logger.log('clearStaffRosterAutoAttendanceMemoForYears_ DB_STAFF parse failed: %s', error.message);
      }
    });
    if (changed) {
      range.setValues(values);
    }
  }

  const attendanceDbSheet = spreadsheet.getSheetByName(STAFF_ATTENDANCE_DB_SHEET_NAME);
  if (attendanceDbSheet && attendanceDbSheet.getLastRow() > 1) {
    const range = attendanceDbSheet.getRange(2, 1, attendanceDbSheet.getLastRow() - 1, STAFF_ATTENDANCE_DB_HEADERS.length);
    const values = range.getDisplayValues();
    let changed = false;
    const nowText = new Date().toISOString();
    values.forEach(function(row) {
      const rowYear = normalizeAttendanceYear_(row[1]);
      if (!yearLookup[rowYear] || valueOrEmpty_(row[13]).trim()) {
        return;
      }
      if (valueOrEmpty_(row[11]).trim() !== AUTO_MEMO_TEXT) {
        return;
      }
      row[11] = '';
      row[12] = nowText;
      resultsByYear[rowYear].attendanceDbMemoClearedCount += 1;
      changed = true;
    });
    if (changed) {
      range.setValues(values);
    }
  }

  normalizedYears.forEach(function(year) {
    const stored = readDataStoreJson_(STAFF_ROSTER_MASTER_STORE_TYPE, year);
    if (stored && stored.storeVersion === STAFF_ROSTER_MASTER_VERSION) {
      let storeChanged = false;
      ['staffInfo', 'nonStaffInfo'].forEach(function(infoKey) {
        const info = stored[infoKey];
        if (!info || !Array.isArray(info.entries)) {
          return;
        }
        info.entries = info.entries.map(function(entry) {
          const cleaned = clearStaffRosterAutoAttendanceMemoFromEntry_(entry);
          if (cleaned.changed) {
            storeChanged = true;
            resultsByYear[year].masterStoreMemoClearedCount += 1;
            resultsByYear[year].dailyMemoClearedCount += cleaned.dailyMemoClearedCount;
            return cleaned.entry;
          }
          return entry;
        });
      });
      if (storeChanged) {
        stored.savedAt = new Date().toISOString();
        writeDataStoreJson_(STAFF_ROSTER_MASTER_STORE_TYPE, year, stored);
      }
    }

    staffRosterBundleMemo_[year] = null;
    staffRosterCompositionMemo_ = {};
    staffRosterAttendanceDbMemo_ = {};
    try {
      markStaffRosterCacheStale_(year);
    } catch (error) {
      Logger.log('clearStaffRosterAutoAttendanceMemoForYears_ cache stale failed: %s', error.message);
    }
    try {
      clearStaffRosterDialogCachesForCurrentUser_(year);
    } catch (error) {
      Logger.log('clearStaffRosterAutoAttendanceMemoForYears_ dialog cache clear failed: %s', error.message);
    }
    try {
      clearAttendanceYearCache_(year, {
        clearStudentDetails: false,
        markSnapshotStale: false,
        clearTemplatePreview: false,
      });
    } catch (error) {
      Logger.log('clearStaffRosterAutoAttendanceMemoForYears_ attendance cache clear failed: %s', error.message);
    }
  });

  return {
    results: normalizedYears.map(function(year) {
      return resultsByYear[year];
    }),
  };
}

function clearStaffRosterAutoAttendanceMemoForYears2024To2026() {
  return clearStaffRosterAutoAttendanceMemoForYears_([2024, 2025, 2026]);
}

function clearStaffRosterAutoAttendanceMemoForYears2024To2026WithAlert() {
  const result = clearStaffRosterAutoAttendanceMemoForYears2024To2026();
  const lines = ['24~26년 자동 출결 메모 삭제 완료'];
  (result.results || []).forEach(function(item) {
    lines.push(
      item.year + '년: 종사자 요약 ' + item.rosterMemoClearedCount +
      '건 / 날짜별 메모 ' + item.dailyMemoClearedCount +
      '건 / 출결DB ' + item.attendanceDbMemoClearedCount +
      '건 / 저장본 ' + item.masterStoreMemoClearedCount + '건'
    );
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function inspectStaffAttendanceStorageForYear2026() {
  const year = 2026;
  const bundle = getStaffRosterBundleByYear_(year);
  const info = bundle.staffInfo || {};
  const rows = (info.entries || []).map(function(entry) {
    const dailyMap = parseStaffRosterDailyAttendanceJson_(entry && entry.dailyAttendanceJson);
    const dateKeys = Object.keys(dailyMap || {}).filter(function(dateKey) {
      return String(dateKey).indexOf('2026-') === 0;
    }).sort();
    return {
      name: valueOrEmpty_(entry && entry.name).trim(),
      position: valueOrEmpty_(entry && entry.position).trim(),
      status: valueOrEmpty_(entry && entry.status).trim(),
      joinDate: normalizeRosterDateValue_(entry && entry.joinDate),
      exitDate: normalizeRosterDateValue_(entry && entry.exitDate),
      dailyCount2026: dateKeys.length,
      firstDate: dateKeys[0] || '',
      lastDate: dateKeys[dateKeys.length - 1] || '',
      sourceRowNumber: Number(entry && entry.sourceRowNumber) || 0,
    };
  });
  return JSON.stringify({
    year: year,
    staffCount: rows.length,
    emptyDailyNames: rows.filter(function(row) { return !row.dailyCount2026; }).map(function(row) { return row.name; }),
    rows: rows,
  }, null, 2);
}

function rebuildStaffRosterStaffEntriesFromSourceSheetByYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = spreadsheet.getSheetByName('종사자');
  if (!staffSheet) {
    throw new Error("'종사자' 시트를 찾을 수 없습니다.");
  }

  const currentBundle = getStaffRosterBundleByYear_(normalizedYear);
  const staffInfo = readStaffRosterEntriesFromSheet_(staffSheet, 'staff');
  if (!staffInfo || !staffInfo.entries || !staffInfo.entries.length) {
    throw new Error("'종사자' 시트에서 불러올 종사자 데이터가 없습니다.");
  }

  const preservedNonStaffInfo = currentBundle && currentBundle.nonStaffInfo
    ? normalizeStaffRosterSheetInfoFromCache_(currentBundle.nonStaffInfo, '비 종사자', 'nonstaff')
    : readStaffRosterEntriesFromSheet_(spreadsheet.getSheetByName('비 종사자'), 'nonstaff');
  const rebuiltBundle = buildStaffRosterBundleFromSheetInfos_(normalizedYear, staffInfo, preservedNonStaffInfo);
  const prepareResult = prepareStaffRosterBundleForDisplayYear_(normalizedYear, rebuiltBundle, false);
  const savedBundle = saveStaffRosterMasterMutation_(normalizedYear, rebuiltBundle);
  return {
    year: normalizedYear,
    importedStaffCount: Number(staffInfo.entries.length) || 0,
    preservedNonStaffCount: Number(preservedNonStaffInfo && preservedNonStaffInfo.entries && preservedNonStaffInfo.entries.length) || 0,
    preparedChangedCount: Number(prepareResult && prepareResult.changed) || 0,
    bundle: savedBundle,
  };
}

function rebuildStaffRosterAndAttendanceForYears2024To2026() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const results = [];

  years.forEach(function(year) {
    const item = {
      year: year,
      importedStaffCount: 0,
      preservedNonStaffCount: 0,
      preparedChangedCount: 0,
      importedAnnualLeaveCount: 0,
      autoCreatedStaffCount: 0,
      autoCreatedStaffNames: [],
      attendanceUpdatedCount: 0,
      attendanceDateCount: 0,
      leaveDateCount: 0,
      staffCount: 0,
      errorMessage: '',
    };

    try {
      const rebuildResult = rebuildStaffRosterStaffEntriesFromSourceSheetByYear_(year);
      item.importedStaffCount = Number(rebuildResult && rebuildResult.importedStaffCount) || 0;
      item.preservedNonStaffCount = Number(rebuildResult && rebuildResult.preservedNonStaffCount) || 0;
      item.preparedChangedCount = Number(rebuildResult && rebuildResult.preparedChangedCount) || 0;

      const annualResult = syncAndApplyAnnualLeaveToStaffRosterForYears_([year]);
      const annualItem = annualResult && annualResult.results && annualResult.results[0] ? annualResult.results[0] : null;
      if (annualItem && annualItem.errorMessage) {
        throw new Error(annualItem.errorMessage);
      }
      item.importedAnnualLeaveCount = Number(annualItem && annualItem.importedRowCount) || 0;
      item.autoCreatedStaffCount = Number(annualItem && annualItem.autoCreatedStaffCount) || 0;
      item.autoCreatedStaffNames = annualItem && annualItem.autoCreatedStaffNames ? annualItem.autoCreatedStaffNames.slice() : [];

      const attendanceResult = resetStaffAttendanceByAnnualLeaveForYears_([year]);
      const attendanceItem = attendanceResult && attendanceResult.results && attendanceResult.results[0] ? attendanceResult.results[0] : null;
      item.attendanceUpdatedCount = Number(attendanceItem && attendanceItem.updatedCount) || 0;
      item.attendanceDateCount = Number(attendanceItem && attendanceItem.attendanceDateCount) || 0;
      item.leaveDateCount = Number(attendanceItem && attendanceItem.leaveDateCount) || 0;

      const latestBundle = getStaffRosterBundleByYear_(year);
      item.staffCount = Number(latestBundle && latestBundle.staffInfo && latestBundle.staffInfo.entries && latestBundle.staffInfo.entries.length) || 0;
    } catch (error) {
      item.errorMessage = error && error.message ? error.message : String(error);
    }

    results.push(item);
  });

  return { results: results };
}

function rebuildStaffRosterAndAttendanceForYears2024To2026WithAlert() {
  const result = rebuildStaffRosterAndAttendanceForYears2024To2026();
  const lines = ['24~26년 종사자현황 재구성 + 출결 채우기 완료'];
  (result.results || []).forEach(function(item) {
    if (item.errorMessage) {
      lines.push(item.year + '년: 실패 - ' + item.errorMessage);
      return;
    }
    lines.push(
      item.year + '년: 종사자 시트 ' + item.importedStaffCount + '명 / 연가 원본 ' + item.importedAnnualLeaveCount +
      '건 / 자동생성 ' + item.autoCreatedStaffCount + '명 / 최종 ' + item.staffCount +
      '명 / 출석 ' + item.attendanceDateCount + '일 / 연가 ' + item.leaveDateCount + '일'
    );
    if (item.autoCreatedStaffNames && item.autoCreatedStaffNames.length) {
      lines.push(' - 자동생성: ' + item.autoCreatedStaffNames.join(', '));
    }
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function syncMentorSheetToNonStaffRosterForYears2024To2026() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const entriesByYear = buildMentorNonStaffEntriesByYear_(years);
  const results = [];

  years.forEach(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    const info = bundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
    const yearEntriesByName = entriesByYear[year] || {};
    const existingByName = {};
    (info.entries || []).forEach(function(entry) {
      const key = normalizeStaffRosterPersonNameKey_(entry && entry.name);
      if (key) existingByName[key] = entry;
    });
    let updatedCount = 0;
    let insertedCount = 0;
    let nextRowNumber = Math.max.apply(null, [1].concat((info.entries || []).map(function(entry) {
      return Number(entry && entry.sourceRowNumber) || 0;
    }))) + 1;

    const preservedEntries = getPreservedNonStaffEntriesForAttendanceImport_(year, info.entries || []);
    const refreshedEntries = preservedEntries.slice();
    Object.keys(yearEntriesByName).forEach(function(nameKey) {
      const mentorEntry = yearEntriesByName[nameKey];
      const existing = existingByName[nameKey];
      const sourceRowNumber = existing && Number(existing.sourceRowNumber)
        ? Number(existing.sourceRowNumber)
        : nextRowNumber++;
      const merged = normalizeStaffRosterCacheEntry_(Object.assign({}, existing || {}, mentorEntry, {
        sourceType: 'nonstaff',
        sourceSheet: '비 종사자',
        sourceRowNumber: sourceRowNumber,
        position: mentorEntry.position || '멘토',
        classification: mentorEntry.classification || '기타',
        category: mentorEntry.classification || '기타',
      }), 'nonstaff', '비 종사자');
      if (existing) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }
      refreshedEntries.push(merged);
    });

    const removedCount = Math.max((info.entries || []).filter(function(entry) {
      return isAttendanceImportManagedNonStaffEntry_(entry);
    }).length - Object.keys(yearEntriesByName).length, 0);
    info.entries = refreshedEntries;
    bundle.nonStaffInfo = info;
    bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || []).concat(info.entries || []);
    const dateRangeUpdatedCount = applyNonStaffDateRangesFromDailyAttendance_(bundle, year);
    saveStaffRosterMasterMutation_(year, bundle);
    results.push({
      year: year,
      updatedCount: updatedCount,
      insertedCount: insertedCount,
      preservedCount: preservedEntries.length,
      removedCount: removedCount,
      dateRangeUpdatedCount: dateRangeUpdatedCount,
      totalCount: updatedCount + insertedCount,
    });
  });

  const lines = ['출근부 -> 비종사자 현황 반영 결과'];
  results.forEach(function(item) {
    lines.push(item.year + '년: 보존 ' + item.preservedCount + '명 / 추가 ' + item.insertedCount + '명 / 수정 ' + item.updatedCount + '명 / 제외 ' + item.removedCount + '명 / 시작·종료일 갱신 ' + item.dateRangeUpdatedCount + '명');
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return { results: results };
}

function refreshNonStaffDateRangesForYears2024To2026() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    const updatedCount = applyNonStaffDateRangesFromDailyAttendance_(bundle, year);
    if (updatedCount) {
      saveStaffRosterMasterMutation_(year, bundle);
    } else {
      touchStaffRosterRuntimeCaches_(year, bundle);
    }
    return {
      year: year,
      updatedCount: updatedCount,
    };
  });
  const lines = ['비종사자 시작·종료일 갱신 결과'];
  results.forEach(function(item) {
    lines.push(item.year + '년: ' + item.updatedCount + '명 갱신');
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return { results: results };
}

function saveStaffRosterDropdownOptions(input) {
  assertStaffRosterAdmin_();
  const normalized = normalizeStaffRosterDropdownOptions_(input);
  PropertiesService.getDocumentProperties().setProperty(
    STAFF_ROSTER_DROPDOWN_OPTIONS_PROPERTY_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}

function getStaffRosterAdminEmail_() {
  return String(PropertiesService.getDocumentProperties().getProperty(STAFF_ROSTER_ADMIN_EMAIL_PROPERTY_KEY) || '').trim();
}

function getStaffRosterNonStaffManagerEmail_() {
  return String(PropertiesService.getDocumentProperties().getProperty(STAFF_ROSTER_NONSTAFF_MANAGER_EMAIL_PROPERTY_KEY) || '').trim();
}

function getCurrentStaffRosterUserEmail_() {
  try {
    const activeEmail = String((Session.getActiveUser() && Session.getActiveUser().getEmail()) || '').trim();
    if (activeEmail) {
      return activeEmail;
    }
  } catch (error) {
    Logger.log('getCurrentStaffRosterUserEmail_ active user failed: %s', error.message);
  }
  try {
    return String((Session.getEffectiveUser() && Session.getEffectiveUser().getEmail()) || '').trim();
  } catch (error) {
    Logger.log('getCurrentStaffRosterUserEmail_ effective user failed: %s', error.message);
  }
  return '';
}

function getStaffRosterAdminContext_() {
  const adminEmail = getStaffRosterAdminEmail_();
  const nonStaffManagerEmail = getStaffRosterNonStaffManagerEmail_();
  const currentUserEmail = getCurrentStaffRosterUserEmail_();
  const normalizedAdmin = adminEmail.toLowerCase();
  const normalizedNonStaffManager = nonStaffManagerEmail.toLowerCase();
  const normalizedCurrent = currentUserEmail.toLowerCase();
  const enabled = !!normalizedAdmin;
  const isAdmin = !!normalizedAdmin && !!normalizedCurrent && normalizedAdmin === normalizedCurrent;
  const isNonStaffManager = !!normalizedNonStaffManager && !!normalizedCurrent && normalizedNonStaffManager === normalizedCurrent;
  return {
    enabled: enabled,
    adminEmail: adminEmail,
    nonStaffManagerEmail: nonStaffManagerEmail,
    currentUserEmail: currentUserEmail,
    canManage: !enabled || isAdmin,
    canManageNonStaff: !enabled || isAdmin || isNonStaffManager,
    isAdmin: isAdmin,
    isNonStaffManager: isNonStaffManager,
  };
}

function assertStaffRosterAdmin_() {
  const context = getStaffRosterAdminContext_();
  if (context.canManage) {
    return context;
  }
  throw new Error('종사자 현황 수정은 관리자만 가능합니다.');
}

function assertStaffRosterManageAccessForSourceType_(sourceType) {
  const context = getStaffRosterAdminContext_();
  const normalizedType = normalizeStaffRosterDashboardType_(sourceType);
  if (context.canManage || (normalizedType === 'nonstaff' && context.canManageNonStaff)) {
    return context;
  }
  throw new Error(normalizedType === 'nonstaff'
    ? '비종사자 현황 수정은 관리자 또는 비종사자 부관리자만 가능합니다.'
    : '종사자 현황 수정은 관리자만 가능합니다.');
}

function setCurrentUserAsStaffRosterAdmin() {
  const email = getCurrentStaffRosterUserEmail_();
  if (!email) {
    SpreadsheetApp.getUi().alert('현재 사용자 이메일을 확인할 수 없어 관리자 지정에 실패했습니다.');
    return;
  }
  PropertiesService.getDocumentProperties().setProperty(STAFF_ROSTER_ADMIN_EMAIL_PROPERTY_KEY, email);
  SpreadsheetApp.getUi().alert('종사자 관리자 계정을 지정했습니다.\n관리자: ' + email);
}

function clearStaffRosterAdmin() {
  PropertiesService.getDocumentProperties().deleteProperty(STAFF_ROSTER_ADMIN_EMAIL_PROPERTY_KEY);
  SpreadsheetApp.getUi().alert('종사자 관리자 제한을 해제했습니다.');
}

function setCurrentUserAsNonStaffRosterManager() {
  assertStaffRosterAdmin_();
  const email = getCurrentStaffRosterUserEmail_();
  if (!email) {
    SpreadsheetApp.getUi().alert('현재 사용자 이메일을 확인할 수 없어 비종사자 부관리자 지정에 실패했습니다.');
    return;
  }
  PropertiesService.getDocumentProperties().setProperty(STAFF_ROSTER_NONSTAFF_MANAGER_EMAIL_PROPERTY_KEY, email);
  SpreadsheetApp.getUi().alert('비종사자 부관리자를 지정했습니다.\n부관리자: ' + email);
}

function setNonStaffRosterManagerEmailPrompt() {
  assertStaffRosterAdmin_();
  const ui = SpreadsheetApp.getUi();
  const current = getStaffRosterNonStaffManagerEmail_();
  const response = ui.prompt(
    '비종사자 부관리자 지정',
    '비종사자 현황을 수정할 수 있는 부관리자 이메일을 입력하세요.' + (current ? '\n현재: ' + current : ''),
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const email = String(response.getResponseText() || '').trim();
  if (!email || email.indexOf('@') === -1) {
    ui.alert('올바른 이메일을 입력해주세요.');
    return;
  }
  PropertiesService.getDocumentProperties().setProperty(STAFF_ROSTER_NONSTAFF_MANAGER_EMAIL_PROPERTY_KEY, email);
  ui.alert('비종사자 부관리자를 지정했습니다.\n부관리자: ' + email);
}

function clearNonStaffRosterManager() {
  assertStaffRosterAdmin_();
  PropertiesService.getDocumentProperties().deleteProperty(STAFF_ROSTER_NONSTAFF_MANAGER_EMAIL_PROPERTY_KEY);
  SpreadsheetApp.getUi().alert('비종사자 부관리자 지정을 해제했습니다.');
}

function showStaffRosterAdminStatus() {
  const context = getStaffRosterAdminContext_();
  const lines = [
    '종사자 관리자 상태',
    '관리자 모드: ' + (context.enabled ? '사용 중' : '해제됨'),
    '관리자 이메일: ' + (context.adminEmail || '-'),
    '비종사자 부관리자 이메일: ' + (context.nonStaffManagerEmail || '-'),
    '현재 사용자: ' + (context.currentUserEmail || '(확인 불가)'),
    '전체 수정 권한: ' + (context.canManage ? '허용' : '읽기 전용'),
    '비종사자 수정 권한: ' + (context.canManageNonStaff ? '허용' : '읽기 전용'),
  ];
  SpreadsheetApp.getUi().alert(lines.join('\n'));
}

function resolvePreferredStaffRosterYear_(spreadsheet, availableYears) {
  const years = Array.isArray(availableYears) ? availableYears : listStaffRosterDialogYears_(spreadsheet);
  const normalizedYears = years.map(function(item) {
    return Number(item && item.year) || 0;
  }).filter(Boolean);

  if (normalizedYears.indexOf(2026) !== -1) {
    return 2026;
  }

  const workingYear = normalizeAttendanceYear_(resolveWorkingYear_(spreadsheet));
  if (workingYear && normalizedYears.indexOf(workingYear) !== -1) {
    return workingYear;
  }

  return normalizedYears[0] || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
}

function getStaffRosterDialogDataByYear(selectedYear, options) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dashboardType = normalizeStaffRosterDashboardType_(options && options.dashboardType);
  const forceRefresh = !!(options && options.forceRefresh);
  const adminContext = getStaffRosterAdminContext_();
  const cacheKey = getStaffRosterDialogCacheKey_('list', normalizedYear, dashboardType, adminContext);
  if (!forceRefresh) {
    const cachedPayload = readStaffRosterDialogCachePayload_(cacheKey);
    if (cachedPayload && Number(cachedPayload.selectedYear) === normalizedYear && normalizeStaffRosterDashboardType_(cachedPayload.dashboardType) === dashboardType) {
      return Object.assign({}, cachedPayload, {
        fromWarmCache: true,
      });
    }
  }
  if (forceRefresh) {
    staffRosterBundleMemo_[normalizedYear] = null;
    staffRosterAnalysisSavedMemo_[normalizedYear] = null;
    staffRosterCompositionMemo_ = {};
    staffRosterAttendanceDbMemo_ = {};
    clearStaffRosterDialogCachePayload_('list', normalizedYear, dashboardType, adminContext);
    clearStaffRosterDialogCachePayload_('detail', normalizedYear, dashboardType, adminContext);
  }
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  prepareStaffRosterBundleForDisplayYear_(normalizedYear, bundle, false);
  const analysis = bundle.analysis || inspectStaffRosterByYear_(normalizedYear);
  const referenceDateKey = getStaffRosterReferenceDateKey_(normalizedYear);
  const leaveNames = [];
  const stampMap = {};
  const annualLeaveByName = getAnnualLeaveDailyAttendanceByNameForRoster_(normalizedYear);
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  (annualLeaveInfo && annualLeaveInfo.leaveNamesByDate && annualLeaveInfo.leaveNamesByDate[referenceDateKey] || []).forEach(function(name) {
    if (leaveNames.indexOf(name) === -1) {
      leaveNames.push(name);
    }
  });
  const viewerRestricted = !adminContext.canManage;
  const mergedStaffEntries = (bundle.staffInfo && bundle.staffInfo.entries || []);
  const rawEntries = []
    .concat(mergedStaffEntries.map(function(entry) {
      const keepDetailData = false;
      return compactStaffRosterEntryViewModelForList_(
        buildStaffRosterEntryViewModel_(entry, referenceDateKey, leaveNames, stampMap, annualLeaveByName, normalizedYear, {
          listCompact: true,
          keepDetailData: keepDetailData,
        }),
        { keepDetailData: keepDetailData }
      );
    }))
    .concat((bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []).map(function(entry) {
      const keepDetailData = dashboardType === 'nonstaff' && Number(bundle.nonStaffInfo && bundle.nonStaffInfo.entries && bundle.nonStaffInfo.entries.length) <= 120;
      const sourceEntry = keepDetailData
        ? hydrateStaffRosterEntryDailyAttendanceFromDb_(entry, normalizedYear)
        : entry;
      return compactStaffRosterEntryViewModelForList_(
        buildStaffRosterEntryViewModel_(sourceEntry, referenceDateKey, leaveNames, stampMap, annualLeaveByName, normalizedYear, {
          listCompact: true,
          keepDetailData: keepDetailData,
        }),
        { keepDetailData: keepDetailData }
      );
    }));
  const dedupedEntries = collapseStaffRosterViewModels_(filterStaffRosterEntriesForYear_(
    filterStaffRosterEntriesForViewer_(rawEntries, adminContext),
    normalizedYear
  ));
  const staffEntries = dedupedEntries.filter(function(entry) {
    return entry.sourceType === 'staff';
  });
  const nonStaffEntries = dedupedEntries.filter(function(entry) {
    return entry.sourceType === 'nonstaff';
  });
  const summaryCounts = summarizeStaffRosterViewModels_(dedupedEntries);

  const payload = {
    dashboardType: dashboardType,
    selectedYear: normalizedYear,
    referenceDateKey: referenceDateKey,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    viewerRestricted: viewerRestricted,
    viewerEmail: adminContext.currentUserEmail || '',
    summary: {
      rawRosterCount: viewerRestricted ? dedupedEntries.length : (Number(analysis && analysis.totalRosterCount) || 0),
      totalRosterCount: dedupedEntries.length,
      staffCount: staffEntries.length,
      nonStaffCount: nonStaffEntries.length,
      teacherCount: summaryCounts.teacher,
      publicCount: summaryCounts.public,
      otherCount: summaryCounts.other,
      excludedCount: summaryCounts.excluded,
      activeWorkerCount: summaryCounts.activeWorker,
      activeTeacherCount: summaryCounts.activeTeacher,
      activePublicCount: summaryCounts.activePublic,
      activeOtherCount: summaryCounts.activeOther,
      leaveCount: leaveNames.length,
      duplicateRemovedCount: viewerRestricted ? 0 : Math.max(rawEntries.length - dedupedEntries.length, 0),
    },
    leaveNames: viewerRestricted ? [] : leaveNames.slice(),
    sheets: viewerRestricted ? [] : ((analysis && analysis.sheets) || []).map(function(sheetInfo) {
      return {
        name: valueOrEmpty_(sheetInfo && sheetInfo.name),
        sourceType: valueOrEmpty_(sheetInfo && sheetInfo.sourceType),
        rowCount: Number(sheetInfo && sheetInfo.rowCount) || 0,
        headerRowNumber: Number(sheetInfo && sheetInfo.headerRowNumber) || 1,
        recognizedFields: (sheetInfo && sheetInfo.recognizedFields || []).slice(),
        missingRecommendedFields: (sheetInfo && sheetInfo.missingRecommendedFields || []).slice(),
        headers: (sheetInfo && sheetInfo.headers || []).slice(),
      };
    }),
    staffEntries: staffEntries,
    nonStaffEntries: nonStaffEntries,
  };
  writeStaffRosterDialogCachePayload_(cacheKey, payload);
  return payload;
}

function getStaffRosterEntryDetailData(selectedYear, sourceType, sourceRowNumber, name) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedType = normalizeStaffRosterDashboardType_(sourceType);
  const normalizedName = normalizeStaffRosterPersonNameKey_(name);
  const rowNumber = Number(sourceRowNumber) || 0;
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const referenceDateKey = getStaffRosterReferenceDateKey_(normalizedYear);
  const annualLeaveByName = getAnnualLeaveDailyAttendanceByNameForRoster_(normalizedYear);
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  const leaveNames = [];
  (annualLeaveInfo && annualLeaveInfo.leaveNamesByDate && annualLeaveInfo.leaveNamesByDate[referenceDateKey] || []).forEach(function(itemName) {
    if (leaveNames.indexOf(itemName) === -1) {
      leaveNames.push(itemName);
    }
  });
  function findMatchedEntry_() {
    const entries = normalizedType === 'nonstaff'
      ? (bundle.nonStaffInfo && bundle.nonStaffInfo.entries || [])
      : (bundle.staffInfo && bundle.staffInfo.entries || []);
    return (entries || []).find(function(entry) {
      if (rowNumber && Number(entry && entry.sourceRowNumber) === rowNumber) {
        return true;
      }
      return normalizedName && normalizeStaffRosterPersonNameKey_(entry && entry.name) === normalizedName;
    });
  }
  let matched = findMatchedEntry_();
  if (!matched) {
    prepareStaffRosterBundleForDisplayYear_(normalizedYear, bundle, false);
    matched = findMatchedEntry_();
  }
  if (!matched) {
    throw new Error('상세 데이터를 찾지 못했습니다.');
  }
  const adminContext = getStaffRosterAdminContext_();
  if (!isStaffRosterEntryVisibleToViewer_(matched, adminContext)) {
    throw new Error('상세 데이터를 볼 권한을 확인하지 못했습니다.');
  }
  const attendanceEntry = hydrateStaffRosterEntryDailyAttendanceFromDb_(matched, normalizedYear);
  const detailEntry = normalizedType === 'staff'
    ? buildStaffRosterEntryWithAnnualLeave_(attendanceEntry, annualLeaveByName, normalizedYear, { skipAttendanceHydration: true })
    : attendanceEntry;
  const viewModel = buildStaffRosterEntryViewModel_(
    detailEntry,
    referenceDateKey,
    leaveNames,
    {},
    annualLeaveByName,
    normalizedYear
  );
  return sanitizeStaffRosterEntryDetailForViewer_(viewModel, adminContext);
}

function getStaffRosterEntryDetailDataBatch(selectedYear, sourceType, options) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const normalizedType = normalizeStaffRosterDashboardType_(sourceType);
  const forceRefresh = !!(options && options.forceRefresh);
  const adminContext = getStaffRosterAdminContext_();
  const cacheKey = getStaffRosterDialogCacheKey_('detail', normalizedYear, normalizedType, adminContext);
  if (!forceRefresh) {
    const cachedPayload = readStaffRosterDialogCachePayload_(cacheKey);
    if (cachedPayload && Number(cachedPayload.selectedYear) === normalizedYear && normalizeStaffRosterDashboardType_(cachedPayload.sourceType) === normalizedType) {
      return Object.assign({}, cachedPayload, {
        fromWarmCache: true,
      });
    }
  } else {
    clearStaffRosterDialogCachePayload_('detail', normalizedYear, normalizedType, adminContext);
  }
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const referenceDateKey = getStaffRosterReferenceDateKey_(normalizedYear);
  const annualLeaveByName = getAnnualLeaveDailyAttendanceByNameForRoster_(normalizedYear);
  const annualLeaveInfo = getAnnualLeaveSupportByYear_(normalizedYear);
  const leaveNames = [];
  (annualLeaveInfo && annualLeaveInfo.leaveNamesByDate && annualLeaveInfo.leaveNamesByDate[referenceDateKey] || []).forEach(function(itemName) {
    if (leaveNames.indexOf(itemName) === -1) {
      leaveNames.push(itemName);
    }
  });

  const sourceEntries = normalizedType === 'nonstaff'
    ? (bundle.nonStaffInfo && bundle.nonStaffInfo.entries || [])
    : (bundle.staffInfo && bundle.staffInfo.entries || []);
  const visibleEntries = filterStaffRosterEntriesForYear_(
    filterStaffRosterEntriesForViewer_(sourceEntries, adminContext),
    normalizedYear
  );
  const hydratedEntries = hydrateStaffRosterEntriesDailyAttendanceFromDb_(visibleEntries, normalizedYear);
  const viewModels = hydratedEntries.map(function(entry) {
    const detailEntry = normalizedType === 'staff'
      ? buildStaffRosterEntryWithAnnualLeave_(entry, annualLeaveByName, normalizedYear, { skipAttendanceHydration: true })
      : entry;
    return sanitizeStaffRosterEntryDetailForViewer_(buildStaffRosterEntryViewModel_(
      detailEntry,
      referenceDateKey,
      leaveNames,
      {},
      annualLeaveByName,
      normalizedYear
    ), adminContext);
  });
  const payload = {
    selectedYear: normalizedYear,
    sourceType: normalizedType,
    entries: collapseStaffRosterViewModels_(viewModels),
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
  };
  writeStaffRosterDialogCachePayload_(cacheKey, payload);
  return payload;
}

function sanitizeStaffRosterEntryDetailForViewer_(viewModel, adminContext) {
  if (!viewModel || !adminContext || adminContext.canManage) {
    return viewModel;
  }
  if (normalizeStaffRosterDashboardType_(viewModel.sourceType) === 'nonstaff' && adminContext.canManageNonStaff) {
    return viewModel;
  }
  if (isStaffRosterEntryOwnedByViewer_(viewModel, adminContext)) {
    return viewModel;
  }
  const sanitized = Object.assign({}, viewModel);
  [
    'attendanceStatus',
    'attendanceDays',
    'absenceDays',
    'attendanceMemo',
    'dailyAttendanceJson',
    'leaveCarryover',
    'leaveManualAdjustment',
    'leaveMemo'
  ].forEach(function(fieldKey) {
    sanitized[fieldKey] = '';
  });
  return sanitized;
}

function inspectStaffRosterDetailLazyLoadSampleJson() {
  const detail = getStaffRosterEntryDetailData(2026, 'nonstaff', 25, '황지영');
  const dailyMap = parseStaffRosterDailyAttendanceJson_(detail && detail.dailyAttendanceJson);
  return JSON.stringify({
    year: 2026,
    name: detail && detail.name,
    sourceType: detail && detail.sourceType,
    sourceRowNumber: detail && detail.sourceRowNumber,
    dailyAttendanceDateCount: Object.keys(dailyMap || {}).length,
    firstDates: Object.keys(dailyMap || {}).sort().slice(0, 5),
  }, null, 2);
}

function buildStaffRosterEntryWithAnnualLeave_(entry, annualLeaveByName, selectedYear, options) {
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType);
  if (sourceType !== 'staff') {
    return entry;
  }
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const hydratedEntry = options && options.skipAttendanceHydration
    ? entry
    : hydrateStaffRosterEntryDailyAttendanceFromDb_(entry, normalizedYear);
  return Object.assign({}, hydratedEntry, {
    dailyAttendanceJson: mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_(
      hydratedEntry && hydratedEntry.dailyAttendanceJson,
      hydratedEntry && hydratedEntry.name,
      annualLeaveByName
    ),
  });
}

function collapseStaffRosterViewModels_(entries) {
  const lookup = {};
  (entries || []).forEach(function(item) {
    const key = normalizeStaffRosterDedupKey_(item && item.name, item && item.sourceType);
    if (!key) {
      return;
    }
    const current = lookup[key];
    if (!current || compareStaffRosterViewModels_(item, current) < 0) {
      lookup[key] = item;
    }
  });
  return Object.keys(lookup).map(function(key) {
    return lookup[key];
  }).sort(function(a, b) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
  });
}

function normalizeStaffRosterDedupKey_(name, sourceType) {
  const normalizedName = String(name || '').replace(/\s+/g, '').trim().toLowerCase();
  if (!normalizedName) {
    return '';
  }
  return normalizeStaffRosterDashboardType_(sourceType) + ':' + normalizedName;
}

function normalizeStaffRosterEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function splitStaffRosterEmails_(value) {
  return String(value || '')
    .split(/[,\n;\s]+/)
    .map(function(email) { return normalizeStaffRosterEmail_(email); })
    .filter(Boolean);
}

function normalizeStaffRosterPersonNameKey_(value) {
  return String(value || '').replace(/\s+/g, '').trim().toLowerCase();
}

function getStaffRosterPersonKeys_(entry) {
  const keys = splitStaffRosterEmails_(entry && entry.email).map(function(email) {
    return 'email:' + email;
  });
  const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
  if (nameKey) {
    keys.push('name:' + nameKey);
  }
  return keys;
}

function isPositiveStaffRosterDocumentValue_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return false;
  }
  if (/미납|미완료|예정|대기|없음|해당\s*없음|불필요|not/i.test(text)) {
    return false;
  }
  return true;
}

function normalizeStaffRosterCompletionStatus_(value, fallbackValue) {
  const text = valueOrEmpty_(value || fallbackValue).trim();
  if (!text) {
    return '';
  }
  if (/미납|미완료|대기|없음|not/i.test(text)) {
    return '미완료';
  }
  if (/예정|예약|일정/i.test(text)) {
    return '예정';
  }
  if (/해당\s*없음|불필요|제외/i.test(text)) {
    return '해당없음';
  }
  if (isPositiveStaffRosterDocumentValue_(text)) {
    return '완료';
  }
  return text;
}

function normalizeStaffRosterMembershipFeeStatus_(value) {
  const text = valueOrEmpty_(value).trim();
  if (!text) {
    return '';
  }
  if (/미납|미완료|대기|없음|not/i.test(text)) {
    return '미납';
  }
  if (/해당\s*없음|불필요|제외/i.test(text)) {
    return '해당없음';
  }
  return isPositiveStaffRosterDocumentValue_(text) ? '납부완료' : text;
}

function getStaffRosterDocumentDate_(primaryValue, legacyValue) {
  return normalizeRosterDateValue_(primaryValue) || normalizeRosterDateValue_(legacyValue) || '';
}

function getStaffRosterMembershipCarryoverLookup_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!getStaffRosterMembershipCarryoverLookup_.memo) {
    getStaffRosterMembershipCarryoverLookup_.memo = {};
  }
  if (getStaffRosterMembershipCarryoverLookup_.memo[normalizedYear]) {
    return getStaffRosterMembershipCarryoverLookup_.memo[normalizedYear];
  }
  const lookup = {};
  for (let year = normalizedYear - 1; year >= 2024; year -= 1) {
    const bundle = readStaffRosterMasterByYear_(year);
    if (!bundle || !bundle.staffInfo || !Array.isArray(bundle.staffInfo.entries)) {
      continue;
    }
    bundle.staffInfo.entries.forEach(function(entry) {
      if (!isPositiveStaffRosterDocumentValue_(entry && entry.coopMembershipFee)) {
        return;
      }
      getStaffRosterPersonKeys_(entry).forEach(function(key) {
        if (!lookup[key]) {
          lookup[key] = {
            year: year,
            value: normalizeStaffRosterMembershipFeeStatus_(entry.coopMembershipFee),
            date: normalizeDateKey_(entry && entry.coopMembershipFeeDate),
          };
        }
      });
    });
  }
  getStaffRosterMembershipCarryoverLookup_.memo[normalizedYear] = lookup;
  return lookup;
}

function resolveStaffRosterMembershipFee_(entry, selectedYear) {
  const currentValue = valueOrEmpty_(entry && entry.coopMembershipFee).trim();
  if (currentValue) {
    return {
      value: normalizeStaffRosterMembershipFeeStatus_(currentValue),
      date: normalizeDateKey_(entry && entry.coopMembershipFeeDate),
      inheritedYear: '',
    };
  }
  const lookup = getStaffRosterMembershipCarryoverLookup_(selectedYear);
  const keys = getStaffRosterPersonKeys_(entry);
  for (let index = 0; index < keys.length; index += 1) {
    const found = lookup[keys[index]];
    if (found && found.value) {
      return {
        value: '납부완료',
        date: found.date || '',
        inheritedYear: found.year,
      };
    }
  }
  return {
    value: '',
    date: normalizeDateKey_(entry && entry.coopMembershipFeeDate),
    inheritedYear: '',
  };
}

function isStaffRosterEntryOwnedByViewer_(entry, adminContext) {
  const viewerEmail = normalizeStaffRosterEmail_(adminContext && adminContext.currentUserEmail);
  if (!viewerEmail) {
    return false;
  }
  return splitStaffRosterEmails_(entry && entry.email).indexOf(viewerEmail) !== -1;
}

function isStaffRosterEntryVisibleToViewer_(entry, adminContext) {
  if (!adminContext || adminContext.canManage) {
    return true;
  }
  const viewerEmail = normalizeStaffRosterEmail_(adminContext.currentUserEmail);
  if (!viewerEmail) {
    return false;
  }
  return true;
}

function filterStaffRosterEntriesForViewer_(entries, adminContext) {
  return (entries || []).filter(function(entry) {
    return isStaffRosterEntryVisibleToViewer_(entry, adminContext);
  });
}

function filterStaffRosterEntriesForReferenceDate_(entries, referenceDateKey) {
  const normalizedReferenceDate = normalizeDateKey_(referenceDateKey);
  if (!normalizedReferenceDate) {
    return (entries || []).slice();
  }
  return (entries || []).filter(function(entry) {
    return isStaffRosterEntryInServiceOnDate_(entry, normalizedReferenceDate);
  });
}

function filterStaffRosterEntriesForYear_(entries, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const yearStart = normalizedYear + '-01-01';
  const yearEnd = normalizedYear + '-12-31';
  return (entries || []).filter(function(entry) {
    const joinDate = normalizeRosterDateValue_(entry && entry.joinDate);
    const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
    if (joinDate && joinDate > yearEnd) {
      return false;
    }
    if (exitDate && exitDate < yearStart) {
      return false;
    }
    return true;
  });
}

function toStaffRosterLeaveNumber_(value) {
  const text = valueOrEmpty_(value).replace(/,/g, '').trim();
  if (!text) {
    return 0;
  }
  const numeric = Number(text);
  return isFinite(numeric) ? numeric : 0;
}

function clampStaffRosterLeaveNumber_(value) {
  const numeric = Number(value || 0);
  if (!isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
}

function getStaffRosterLeaveLastDayOfMonth_(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addStaffRosterLeaveMonths_(date, monthOffset) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  const targetMonthIndex = date.getMonth() + Number(monthOffset || 0);
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(date.getDate(), getStaffRosterLeaveLastDayOfMonth_(targetYear, normalizedMonthIndex));
  return new Date(targetYear, normalizedMonthIndex, day);
}

function addStaffRosterLeaveYears_(date, yearOffset) {
  return addStaffRosterLeaveMonths_(date, Number(yearOffset || 0) * 12);
}

function formatStaffRosterLeaveDate_(date) {
  return date instanceof Date && !isNaN(date.getTime()) ? formatDate_(date) : '';
}

function compareStaffRosterLeaveDate_(left, right) {
  return left instanceof Date && right instanceof Date ? left.getTime() - right.getTime() : 0;
}

function getStaffRosterLeaveAsOfDate_(selectedYear, exitDateKey) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const todayKey = normalizeDateKey_(new Date());
  const todayYear = Number(todayKey.slice(0, 4)) || normalizedYear;
  let asOfDate = parseDateKeyAsKstDate_(normalizedYear + '-12-31');
  if (todayYear === normalizedYear) {
    asOfDate = parseDateKeyAsKstDate_(todayKey) || asOfDate;
  }
  const exitDate = parseDateKeyAsKstDate_(exitDateKey);
  if (exitDate && compareStaffRosterLeaveDate_(exitDate, asOfDate) < 0) {
    return exitDate;
  }
  return asOfDate;
}

function getStaffRosterLeaveServiceText_(joinDate, asOfDate) {
  if (!joinDate || !asOfDate || compareStaffRosterLeaveDate_(asOfDate, joinDate) < 0) {
    return '-';
  }
  let years = asOfDate.getFullYear() - joinDate.getFullYear();
  let months = asOfDate.getMonth() - joinDate.getMonth();
  if (asOfDate.getDate() < joinDate.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return years + '년 ' + months + '개월';
}

function getCompletedStaffRosterLeaveYears_(joinDate, asOfDate) {
  if (!joinDate || !asOfDate || compareStaffRosterLeaveDate_(asOfDate, joinDate) < 0) {
    return 0;
  }
  let years = asOfDate.getFullYear() - joinDate.getFullYear();
  const anniversary = addStaffRosterLeaveYears_(joinDate, years);
  if (anniversary && compareStaffRosterLeaveDate_(anniversary, asOfDate) > 0) {
    years -= 1;
  }
  return Math.max(years, 0);
}

function getAnnualStaffRosterLeaveDaysForCompletedYears_(completedYears) {
  if (completedYears < 1) {
    return 0;
  }
  const additional = completedYears >= 3 ? Math.floor((completedYears - 1) / 2) : 0;
  return Math.min(25, 15 + additional);
}

function getStaffRosterLeaveUsedAmount_(item) {
  const normalized = normalizeStaffRosterDailyAttendanceItem_(item);
  const text = [normalized.status, normalized.memo].join(' ');
  if (!/연가|연차|월차|휴가|반차/.test(text)) {
    return 0;
  }
  if (/반차/.test(text)) {
    return 0.5;
  }
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:일|개|day)/i)
    || text.match(/(?:연가|연차|월차|휴가)\s*(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    const amount = Number(amountMatch[1]);
    return isFinite(amount) && amount > 0 && amount <= 5 ? amount : 1;
  }
  return 1;
}

function summarizeStaffRosterLeaveUsage_(dailyAttendanceJson, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const dailyMap = parseStaffRosterDailyAttendanceJson_(dailyAttendanceJson);
  const usedDates = [];
  let usedDays = 0;
  Object.keys(dailyMap || {}).sort().forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || Number(normalizedDate.slice(0, 4)) !== normalizedYear) {
      return;
    }
    const amount = getStaffRosterLeaveUsedAmount_(dailyMap[dateKey]);
    if (!amount) {
      return;
    }
    const normalizedItem = normalizeStaffRosterDailyAttendanceItem_(dailyMap[dateKey]);
    usedDays += amount;
    usedDates.push({
      date: normalizedDate,
      amount: clampStaffRosterLeaveNumber_(amount),
      status: normalizedItem.status,
      memo: normalizedItem.memo,
    });
  });
  return {
    usedDays: clampStaffRosterLeaveNumber_(usedDays),
    usedDates: usedDates,
  };
}

function buildStaffRosterLeaveSummary_(entry, dailyAttendanceJson, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceType = valueOrEmpty_(entry && entry.sourceType).trim().toLowerCase();
  const joinDateKey = normalizeRosterDateValue_(entry && entry.joinDate);
  const exitDateKey = normalizeRosterDateValue_(entry && entry.exitDate);
  const joinDate = parseDateKeyAsKstDate_(joinDateKey);
  const asOfDate = getStaffRosterLeaveAsOfDate_(normalizedYear, exitDateKey);
  const carryover = toStaffRosterLeaveNumber_(entry && entry.leaveCarryover);
  const manualAdjustment = toStaffRosterLeaveNumber_(entry && entry.leaveManualAdjustment);
  const usage = summarizeStaffRosterLeaveUsage_(dailyAttendanceJson, normalizedYear);
  const notes = [];

  if (sourceType === 'nonstaff') {
    notes.push('비종사자는 기본 연차 계산 대상에서 제외했습니다.');
  }
  if (!joinDate) {
    notes.push('입사일/시작일이 없어 자동 계산을 보류했습니다.');
  }
  if (exitDateKey) {
    notes.push('퇴사일/종료일 기준으로 계산을 멈췄습니다.');
  }

  let monthlyGranted = 0;
  let annualGranted = 0;
  let nextMonthlyAccrualDate = '';
  let nextAnnualGrantDate = '';
  let annualGrantDate = '';
  const monthlyAccrualDates = [];

  if (sourceType !== 'nonstaff' && joinDate && asOfDate && compareStaffRosterLeaveDate_(asOfDate, joinDate) >= 0) {
    const firstAnniversary = addStaffRosterLeaveYears_(joinDate, 1);
    for (let monthOffset = 1; monthOffset <= 11; monthOffset += 1) {
      const accrualDate = addStaffRosterLeaveMonths_(joinDate, monthOffset);
      if (!accrualDate || compareStaffRosterLeaveDate_(accrualDate, asOfDate) > 0) {
        if (!nextMonthlyAccrualDate && accrualDate && (!firstAnniversary || compareStaffRosterLeaveDate_(accrualDate, firstAnniversary) < 0)) {
          nextMonthlyAccrualDate = formatStaffRosterLeaveDate_(accrualDate);
        }
        continue;
      }
      if (accrualDate.getFullYear() === normalizedYear) {
        monthlyGranted += 1;
        monthlyAccrualDates.push(formatStaffRosterLeaveDate_(accrualDate));
      }
    }

    const annualCandidate = new Date(
      normalizedYear,
      joinDate.getMonth(),
      Math.min(joinDate.getDate(), getStaffRosterLeaveLastDayOfMonth_(normalizedYear, joinDate.getMonth()))
    );
    if (firstAnniversary && compareStaffRosterLeaveDate_(annualCandidate, firstAnniversary) >= 0) {
      if (compareStaffRosterLeaveDate_(annualCandidate, asOfDate) <= 0) {
        const completedYears = getCompletedStaffRosterLeaveYears_(joinDate, annualCandidate);
        annualGranted = getAnnualStaffRosterLeaveDaysForCompletedYears_(completedYears);
        annualGrantDate = formatStaffRosterLeaveDate_(annualCandidate);
      } else {
        nextAnnualGrantDate = formatStaffRosterLeaveDate_(annualCandidate);
      }
    }
  }

  const generatedDays = clampStaffRosterLeaveNumber_(monthlyGranted + annualGranted);
  const totalGranted = clampStaffRosterLeaveNumber_(generatedDays + carryover + manualAdjustment);
  const remainingDays = clampStaffRosterLeaveNumber_(totalGranted - usage.usedDays);

  return {
    selectedYear: normalizedYear,
    asOfDate: formatStaffRosterLeaveDate_(asOfDate),
    joinDate: joinDateKey,
    exitDate: exitDateKey,
    serviceText: getStaffRosterLeaveServiceText_(joinDate, asOfDate),
    eligible: sourceType !== 'nonstaff' && !!joinDate,
    policyText: '입사일 기준 / 1년 미만 월 1일, 1년 이상 15일, 3년 이상 2년마다 1일 가산',
    monthlyGranted: clampStaffRosterLeaveNumber_(monthlyGranted),
    annualGranted: clampStaffRosterLeaveNumber_(annualGranted),
    generatedDays: generatedDays,
    carryover: clampStaffRosterLeaveNumber_(carryover),
    manualAdjustment: clampStaffRosterLeaveNumber_(manualAdjustment),
    totalGranted: totalGranted,
    usedDays: usage.usedDays,
    remainingDays: remainingDays,
    annualGrantDate: annualGrantDate,
    nextMonthlyAccrualDate: nextMonthlyAccrualDate,
    nextAnnualGrantDate: nextAnnualGrantDate,
    monthlyAccrualDates: monthlyAccrualDates,
    usedDates: usage.usedDates,
    memo: valueOrEmpty_(entry && entry.leaveMemo).trim(),
    notes: notes,
  };
}

function compareStaffRosterViewModels_(left, right) {
  const availabilityDiff = getStaffRosterAvailabilityRank_(left && left.availability) - getStaffRosterAvailabilityRank_(right && right.availability);
  if (availabilityDiff !== 0) {
    return availabilityDiff;
  }
  const bucketDiff = getStaffRosterBucketRank_(left && left.bucket) - getStaffRosterBucketRank_(right && right.bucket);
  if (bucketDiff !== 0) {
    return bucketDiff;
  }
  const sourceDiff = getStaffRosterSourceRank_(left && left.sourceType) - getStaffRosterSourceRank_(right && right.sourceType);
  if (sourceDiff !== 0) {
    return sourceDiff;
  }
  const joinDiff = compareDateDescForRoster_(left && left.joinDate, right && right.joinDate);
  if (joinDiff !== 0) {
    return joinDiff;
  }
  const exitDiff = compareDateDescForRoster_(left && left.exitDate, right && right.exitDate);
  if (exitDiff !== 0) {
    return exitDiff;
  }
  return 0;
}

function getStaffRosterAvailabilityRank_(key) {
  switch (String(key || '')) {
    case 'active': return 0;
    case 'leave': return 1;
    case 'pending': return 2;
    case 'inactive': return 3;
    case 'excluded': return 4;
    default: return 5;
  }
}

function getStaffRosterBucketRank_(key) {
  switch (String(key || '')) {
    case 'teacher': return 0;
    case 'public': return 1;
    case 'other': return 2;
    case 'excluded': return 3;
    default: return 4;
  }
}

function getStaffRosterSourceRank_(key) {
  return String(key || '') === 'staff' ? 0 : 1;
}

function compareDateDescForRoster_(left, right) {
  const normalizedLeft = normalizeDateKey_(left);
  const normalizedRight = normalizeDateKey_(right);
  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  if (!normalizedLeft) {
    return 1;
  }
  if (!normalizedRight) {
    return -1;
  }
  return normalizedLeft > normalizedRight ? -1 : 1;
}

function summarizeStaffRosterViewModels_(entries) {
  return (entries || []).reduce(function(result, item) {
    const bucket = String(item && item.bucket || '');
    const availability = String(item && item.availability || '');
    const sourceType = normalizeStaffRosterDashboardType_(item && item.sourceType);
    if (bucket === 'teacher') {
      result.teacher += 1;
      if (availability === 'active' && sourceType === 'nonstaff') {
        result.activeTeacher += 1;
      }
    } else if (bucket === 'public') {
      result.public += 1;
      if (availability === 'active' && sourceType === 'nonstaff') {
        result.activePublic += 1;
      }
    } else if (bucket === 'excluded') {
      result.excluded += 1;
    } else {
      result.other += 1;
      if (availability === 'active' && sourceType === 'nonstaff') {
        result.activeOther += 1;
      }
    }
    if (availability === 'active' && sourceType === 'staff') {
      result.activeWorker += 1;
    }
    return result;
  }, {
    teacher: 0,
    public: 0,
    other: 0,
    excluded: 0,
    activeWorker: 0,
    activeTeacher: 0,
    activePublic: 0,
    activeOther: 0,
  });
}

function listStaffRosterDialogYears_(spreadsheet) {
  let years = [];
  if (typeof listAttendanceDialogYears_ === 'function') {
    try {
      years = listAttendanceDialogYears_(spreadsheet).map(function(item) {
        return {
          year: Number(item && item.year) || 0,
          label: valueOrEmpty_(item && item.label) || ((item && item.year) ? (item.year + '년') : ''),
        };
      }).filter(function(item) {
        return !!item.year;
      });
    } catch (error) {
      years = [];
    }
  }

  if (!years.length) {
    const lookup = {};
    (spreadsheet ? spreadsheet.getSheets() : []).forEach(function(sheet) {
      const match = String(sheet.getName() || '').match(/^(\d{2})년\s+(출석부|일지데이터)$/);
      if (!match) {
        return;
      }
      const year = 2000 + Number(match[1]);
      if (year) {
        lookup[year] = true;
      }
    });
    years = Object.keys(lookup).map(function(year) {
      return { year: Number(year), label: String(year) + '년' };
    }).sort(function(a, b) {
      return b.year - a.year;
    });
  }

  if (!years.length) {
    const currentYear = new Date().getFullYear();
    years = [
      { year: currentYear, label: currentYear + '년' },
    ];
  }

  return years;
}

function getStaffRosterReferenceDateKey_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const now = new Date();
  const currentYear = Number(Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy')) || normalizedYear;
  if (normalizedYear < currentYear) {
    return normalizedYear + '-12-31';
  }
  if (normalizedYear > currentYear) {
    return normalizedYear + '-01-01';
  }
  return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function buildStaffRosterEntryViewModel_(entry, referenceDateKey, leaveNames, stampMap, annualLeaveByName, selectedYear, options) {
  const opts = options || {};
  const includeDetailData = !opts.listCompact || !!opts.keepDetailData;
  const sourceType = valueOrEmpty_(entry && entry.sourceType).trim().toLowerCase();
  const bucket = classifyStaffRosterEntry_(entry);
  let availability = resolveStaffRosterEntryAvailability_(entry, referenceDateKey, leaveNames);
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const currentYear = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy')) || normalizedYear;
  if (sourceType === 'nonstaff') {
    const statusText = valueOrEmpty_(entry && entry.status).trim();
    if (normalizedYear < currentYear || /종료|퇴/.test(statusText)) {
      availability = { key: 'inactive', label: '종료', tone: 'danger' };
    }
  }
  const group = valueOrEmpty_(entry && (entry.group || entry.category));
  const classification = valueOrEmpty_(entry && entry.classification);
  const position = valueOrEmpty_(entry && entry.position);
  const name = valueOrEmpty_(entry && entry.name);
  const rawStampUrl = valueOrEmpty_(entry && entry.stampUrl).trim();
  let dailyAttendanceJson = '';
  if (includeDetailData) {
    const mergedDailyAttendanceJson = mergeAnnualLeaveIntoStaffRosterDailyAttendanceJson_(
      entry && entry.dailyAttendanceJson,
      name,
      annualLeaveByName
    );
    dailyAttendanceJson = filterStaffRosterDailyAttendanceJsonForYear_(
      mergedDailyAttendanceJson,
      normalizedYear
    );
  }
  const membershipFee = resolveStaffRosterMembershipFee_(entry, selectedYear);
  const abusePledgeDate = getStaffRosterDocumentDate_(entry && entry.abusePreventionPledgeDate, entry && entry.abusePreventionPledge);
  const abusePledgeStatus = normalizeStaffRosterCompletionStatus_(entry && entry.abusePreventionPledgeStatus, entry && entry.abusePreventionPledge);
  const sexCrimeDisabilityDate = getStaffRosterDocumentDate_(entry && entry.sexCrimeDisabilityCheckDate, entry && entry.sexCrimeDisabilityCheck);
  const sexCrimeDisabilityStatus = normalizeStaffRosterCompletionStatus_(entry && entry.sexCrimeDisabilityCheckStatus, entry && entry.sexCrimeDisabilityCheck);
  const healthDate = getStaffRosterDocumentDate_(entry && entry.healthCheckDate, entry && entry.tuberculosisCheckDate);
  const healthStatus = normalizeStaffRosterCompletionStatus_(entry && entry.healthCheckStatus, entry && entry.healthCheckDate);
  return {
    displayOrder: valueOrEmpty_(entry && entry.displayOrder),
    name: name,
    email: valueOrEmpty_(entry && entry.email),
    position: position,
    roleText: valueOrEmpty_(entry && entry.roleText),
    group: group,
    classification: classification,
    category: position,
    status: valueOrEmpty_(entry && entry.status),
    joinDate: valueOrEmpty_(entry && entry.joinDate),
    exitDate: valueOrEmpty_(entry && entry.exitDate),
    attendanceStatus: valueOrEmpty_(entry && entry.attendanceStatus),
    attendanceDays: valueOrEmpty_(entry && entry.attendanceDays),
    absenceDays: valueOrEmpty_(entry && entry.absenceDays),
    attendanceMemo: valueOrEmpty_(entry && entry.attendanceMemo),
    dailyAttendanceJson: dailyAttendanceJson,
    leaveCarryover: valueOrEmpty_(entry && entry.leaveCarryover),
    leaveManualAdjustment: valueOrEmpty_(entry && entry.leaveManualAdjustment),
    leaveMemo: valueOrEmpty_(entry && entry.leaveMemo),
    leaveSummary: includeDetailData ? buildStaffRosterLeaveSummary_(entry, dailyAttendanceJson, selectedYear) : null,
    coopMembershipFee: membershipFee.value,
    coopMembershipFeeDate: membershipFee.date,
    coopMembershipFeeInheritedYear: membershipFee.inheritedYear,
    criminalRecordCheckDate: valueOrEmpty_(entry && entry.criminalRecordCheckDate),
    abusePreventionPledge: valueOrEmpty_(entry && entry.abusePreventionPledge),
    abusePreventionPledgeDate: abusePledgeDate,
    abusePreventionPledgeStatus: abusePledgeStatus,
    sexCrimeDisabilityCheck: valueOrEmpty_(entry && entry.sexCrimeDisabilityCheck),
    sexCrimeDisabilityCheckDate: sexCrimeDisabilityDate,
    sexCrimeDisabilityCheckStatus: sexCrimeDisabilityStatus,
    healthCheckDate: healthDate,
    healthCheckStatus: healthStatus,
    tuberculosisCheckDate: valueOrEmpty_(entry && entry.tuberculosisCheckDate),
    stampUrl: rawStampUrl || (stampMap && name ? valueOrEmpty_(stampMap[name]).trim() : ''),
    sourceType: sourceType,
    sourceTypeLabel: sourceType === 'nonstaff' ? '비종사자' : '종사자',
    sourceSheet: valueOrEmpty_(entry && entry.sourceSheet),
    sourceRowNumber: Number(entry && entry.sourceRowNumber) || 0,
    bucket: bucket,
    bucketLabel: bucket === 'teacher' ? '교사' :
      bucket === 'public' ? '공익' :
      bucket === 'excluded' ? '제외' : '기타',
    availability: availability.key,
    availabilityLabel: availability.label,
    availabilityTone: availability.tone,
  };
}

function filterStaffRosterDailyAttendanceJsonForYear_(dailyAttendanceJson, selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceMap = parseStaffRosterDailyAttendanceJson_(dailyAttendanceJson);
  const filteredMap = {};
  Object.keys(sourceMap || {}).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || normalizeAttendanceYear_(normalizedDate.slice(0, 4)) !== normalizedYear) {
      return;
    }
    filteredMap[normalizedDate] = sourceMap[dateKey];
  });
  return stringifyStaffRosterDailyAttendanceMap_(filteredMap);
}

function compactStaffRosterEntryViewModelForList_(entry, options) {
  const opts = options || {};
  const dailyJson = valueOrEmpty_(entry && entry.dailyAttendanceJson).trim();
  const dailyMap = opts.keepDetailData ? parseStaffRosterDailyAttendanceJson_(dailyJson) : {};
  const dateCount = opts.keepDetailData ? Object.keys(dailyMap || {}).length : 0;
  return Object.assign({}, entry, {
    dailyAttendanceJson: opts.keepDetailData ? dailyJson : '',
    dailyAttendanceDateCount: dateCount,
    hasDailyAttendanceJson: dateCount > 0,
    detailLoaded: !!opts.keepDetailData,
  });
}

function resolveStaffRosterEntryAvailability_(entry, referenceDateKey, leaveNames) {
  const normalizedDate = normalizeDateKey_(referenceDateKey);
  const name = valueOrEmpty_(entry && entry.name).trim();
  const joinDate = normalizeDateKey_(entry && entry.joinDate);
  const exitDate = normalizeDateKey_(entry && entry.exitDate);
  const status = valueOrEmpty_(entry && entry.status).trim();
  const group = valueOrEmpty_(entry && (entry.group || entry.category)).trim();
  const classification = valueOrEmpty_(entry && entry.classification).trim();
  const position = valueOrEmpty_(entry && entry.position).trim();

  if (!name) {
    return { key: 'unknown', label: '확인 필요', tone: 'muted' };
  }
  if (getManagerExcludedPositions_().indexOf(position) !== -1) {
    return { key: 'excluded', label: '제외', tone: 'muted' };
  }
  if (joinDate && normalizedDate && joinDate > normalizedDate) {
    return { key: 'pending', label: '입사 전', tone: 'warning' };
  }
  if (exitDate && normalizedDate && exitDate <= normalizedDate) {
    return { key: 'inactive', label: '퇴사', tone: 'danger' };
  }
  if (!exitDate && status && /퇴|종료|휴직/.test(status)) {
    return { key: 'inactive', label: '비활성', tone: 'danger' };
  }
  if (!exitDate && ((group && /퇴|종료/.test(group)) || (classification && /퇴|종료/.test(classification)))) {
    return { key: 'inactive', label: '비활성', tone: 'danger' };
  }
  if ((leaveNames || []).indexOf(name) !== -1) {
    return { key: 'leave', label: '연차 제외', tone: 'warning' };
  }
  return { key: 'active', label: '재직', tone: 'success' };
}

function buildStaffRosterGroupText_(group, classification) {
  const safeGroup = valueOrEmpty_(group).trim();
  const safeClassification = valueOrEmpty_(classification).trim();
  if (safeGroup && safeClassification) {
    return safeGroup + ' / ' + safeClassification;
  }
  return safeGroup || safeClassification;
}

function getStaffRosterSheetNameBySourceType_(sourceType) {
  return String(sourceType || '').trim().toLowerCase() === 'nonstaff' ? '비 종사자' : '종사자';
}

function getStaffRosterSourceTypeBySheetName_(sheetName) {
  return String(sheetName || '').trim() === '비 종사자' ? 'nonstaff' : 'staff';
}

function buildStaffRosterFieldValueMap_(payload) {
  const fieldValueMap = {};
  [
    'displayOrder',
    'name',
    'email',
    'position',
    'roleText',
    'group',
    'classification',
    'status',
    'joinDate',
    'exitDate',
    'attendanceStatus',
    'attendanceDays',
    'absenceDays',
    'attendanceMemo',
    'dailyAttendanceJson',
    'leaveCarryover',
    'leaveManualAdjustment',
    'leaveMemo',
    'coopMembershipFee',
    'coopMembershipFeeDate',
    'criminalRecordCheckDate',
    'abusePreventionPledge',
    'abusePreventionPledgeDate',
    'abusePreventionPledgeStatus',
    'sexCrimeDisabilityCheck',
    'sexCrimeDisabilityCheckDate',
    'sexCrimeDisabilityCheckStatus',
    'healthCheckDate',
    'healthCheckStatus',
    'tuberculosisCheckDate',
    'stampUrl',
  ].forEach(function(fieldKey) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, fieldKey)) {
      fieldValueMap[fieldKey] = valueOrEmpty_(payload[fieldKey]).trim();
    }
  });
  if (
    normalizeStaffRosterDashboardType_(payload && payload.sourceType) === 'nonstaff' &&
    (
      Object.prototype.hasOwnProperty.call(fieldValueMap, 'position') ||
      Object.prototype.hasOwnProperty.call(fieldValueMap, 'group') ||
      Object.prototype.hasOwnProperty.call(fieldValueMap, 'classification')
    )
  ) {
    fieldValueMap.classification = normalizeNonStaffClassificationByActivityText_(fieldValueMap);
  }
  return fieldValueMap;
}

function getStaffRosterFieldTabKey_(fieldKey) {
  const key = String(fieldKey || '').trim();
  if ([
    'displayOrder',
    'name',
    'email',
    'position',
    'roleText',
    'group',
    'classification',
    'status',
    'joinDate',
    'exitDate',
  ].indexOf(key) !== -1) {
    return 'basic';
  }
  if ([
    'coopMembershipFee',
    'coopMembershipFeeDate',
    'criminalRecordCheckDate',
    'abusePreventionPledge',
    'abusePreventionPledgeDate',
    'abusePreventionPledgeStatus',
    'sexCrimeDisabilityCheck',
    'sexCrimeDisabilityCheckDate',
    'sexCrimeDisabilityCheckStatus',
    'healthCheckDate',
    'healthCheckStatus',
    'tuberculosisCheckDate',
  ].indexOf(key) !== -1) {
    return 'documents';
  }
  if ([
    'attendanceStatus',
    'attendanceDays',
    'absenceDays',
    'attendanceMemo',
    'dailyAttendanceJson',
  ].indexOf(key) !== -1) {
    return 'attendance';
  }
  if ([
    'leaveCarryover',
    'leaveManualAdjustment',
    'leaveMemo',
  ].indexOf(key) !== -1) {
    return 'leave';
  }
  if (key === 'stampUrl') {
    return 'stamp';
  }
  return '';
}

function getStaffRosterChangedLockedTabs_(currentEntry, fieldValueMap, tabLocks) {
  const changedLockedTabs = {};
  Object.keys(fieldValueMap || {}).forEach(function(fieldKey) {
    const tabKey = getStaffRosterFieldTabKey_(fieldKey);
    if (!tabKey || !(tabLocks && tabLocks[tabKey])) {
      return;
    }
    const currentValue = valueOrEmpty_(currentEntry && currentEntry[fieldKey]).trim();
    const nextValue = valueOrEmpty_(fieldValueMap[fieldKey]).trim();
    if (currentValue !== nextValue) {
      changedLockedTabs[tabKey] = true;
    }
  });
  return Object.keys(changedLockedTabs);
}

function filterStaffRosterFieldValueMapByTabLocks_(fieldValueMap, tabLocks, adminContext) {
  if (adminContext && (adminContext.canManage || adminContext.canManageNonStaff)) {
    return fieldValueMap;
  }
  const filtered = {};
  Object.keys(fieldValueMap || {}).forEach(function(fieldKey) {
    const tabKey = getStaffRosterFieldTabKey_(fieldKey);
    if (!tabKey || !(tabLocks && tabLocks[tabKey])) {
      filtered[fieldKey] = fieldValueMap[fieldKey];
    }
  });
  return filtered;
}

function getStaffRosterTabLockLabel_(tabKey) {
  const labels = {
    basic: '기본',
    documents: '서류',
    attendance: '출결',
    leave: '연차',
    stamp: '도장',
  };
  return labels[tabKey] || tabKey;
}

function assertStaffRosterEntryUpdateAllowed_(payload, currentEntry, fieldValueMap, adminContext) {
  const currentSourceType = normalizeStaffRosterDashboardType_(currentEntry && currentEntry.sourceType);
  const nextSourceType = normalizeStaffRosterDashboardType_(payload && payload.sourceType);
  if (adminContext && adminContext.canManage) {
    return;
  }
  if (currentSourceType === 'nonstaff' && nextSourceType === 'nonstaff' && adminContext && adminContext.canManageNonStaff) {
    return;
  }
  if (nextSourceType !== currentSourceType) {
    throw new Error('분류 변경은 관리자만 가능합니다.');
  }
  throw new Error(currentSourceType === 'nonstaff'
    ? '비종사자 현황 수정은 관리자 또는 비종사자 부관리자만 가능합니다.'
    : '종사자 현황 수정은 관리자만 가능합니다.');
}

function saveStaffRosterStampUrlFromPayload_(payload) {
  if (!Object.prototype.hasOwnProperty.call(payload || {}, 'stampUrl')) {
    return null;
  }
  return saveAutomationStampUrlForName_(payload.name, payload.stampUrl);
}

function writeStaffRosterFieldsToSheetRow_(sheet, rowNumber, headerIndexMap, fieldValueMap) {
  Object.keys(fieldValueMap || {}).forEach(function(fieldKey) {
    const columnIndex = headerIndexMap[fieldKey];
    if (columnIndex === null || columnIndex === undefined) {
      return;
    }
    sheet.getRange(rowNumber, columnIndex + 1).setValue(fieldValueMap[fieldKey]);
  });
}

function detectStaffRosterHeaderForSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const sampleRowCount = Math.min(lastRow, 8);
  const values = sampleRowCount > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, sampleRowCount, lastColumn).getDisplayValues()
    : [[]];
  const detectedHeader = detectStaffRosterHeaderRow_(values);
  const headerIndexMap = detectedHeader.headerIndexMap || {};
  if (headerIndexMap.name === null || headerIndexMap.name === undefined) {
    throw new Error("'" + sheet.getName() + "' 시트에서 이름 헤더를 찾지 못했습니다.");
  }
  return {
    lastRow: lastRow,
    lastColumn: lastColumn,
    detectedHeader: detectedHeader,
    headerIndexMap: headerIndexMap,
    headerRowNumber: Number(detectedHeader && detectedHeader.rowIndex) + 1 || 1,
  };
}

function getCanonicalStaffRosterHeaderLabel_(fieldKey) {
  const aliasesMap = getStaffRosterHeaderAliases_();
  const aliases = aliasesMap[fieldKey] || [];
  return aliases[0] || fieldKey;
}

function ensureStaffRosterFieldColumns_(sheet, headerInfo, fieldKeys) {
  const headerIndexMap = Object.assign({}, headerInfo && headerInfo.headerIndexMap || {});
  let nextColumnIndex = Number(headerInfo && headerInfo.lastColumn) || 0;
  const headerRowNumber = Number(headerInfo && headerInfo.headerRowNumber) || 1;

  (fieldKeys || []).forEach(function(fieldKey) {
    if (headerIndexMap[fieldKey] !== null && headerIndexMap[fieldKey] !== undefined) {
      return;
    }
    const headerLabel = getCanonicalStaffRosterHeaderLabel_(fieldKey);
    sheet.getRange(headerRowNumber, nextColumnIndex + 1).setValue(headerLabel);
    headerIndexMap[fieldKey] = nextColumnIndex;
    nextColumnIndex += 1;
  });

  return {
    headerIndexMap: headerIndexMap,
    lastColumn: nextColumnIndex,
    headerRowNumber: headerRowNumber,
  };
}

function ensureStaffRosterAccountEmailColumns() {
  assertStaffRosterAdmin_();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  ['staff', 'nonstaff'].forEach(function(sourceType) {
    const sheetName = getStaffRosterSheetNameBySourceType_(sourceType);
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      results.push(sheetName + ': 시트 없음');
      return;
    }

    const headerInfo = detectStaffRosterHeaderForSheet_(sheet);
    const hadEmailColumn = headerInfo.headerIndexMap.email !== null && headerInfo.headerIndexMap.email !== undefined;
    const ensuredHeader = ensureStaffRosterFieldColumns_(sheet, headerInfo, ['email']);
    const emailColumnNumber = Number(ensuredHeader.headerIndexMap.email) + 1;
    results.push(
      sheetName + ': ' +
      (hadEmailColumn ? '이미 있음' : '새로 생성') +
      ' (' + columnToLetter_(emailColumnNumber) + '열)'
    );
  });

  const yearLookup = {};
  listStaffRosterDialogYears_(spreadsheet).forEach(function(item) {
    if (item && item.year) {
      yearLookup[item.year] = true;
    }
  });
  [2024, 2025, 2026, resolveWorkingYear_(spreadsheet)].forEach(function(year) {
    const normalizedYear = normalizeAttendanceYear_(year);
    if (normalizedYear) {
      yearLookup[normalizedYear] = true;
    }
  });
  Object.keys(yearLookup).forEach(function(year) {
    clearStaffRosterYearCaches_(Number(year));
  });

  SpreadsheetApp.getUi().alert(
    '계정 이메일 칸 확인 완료',
    results.join('\n') + '\n\n윤희빈 행의 계정 이메일 칸에 실제 로그인 이메일을 입력한 뒤 종사자 현황을 다시 열어주세요.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function syncStaffRosterSheetsToMasterStoreForConfiguredYears() {
  assertStaffRosterAdmin_();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const yearLookup = {};
  [2024, 2025, 2026, resolveWorkingYear_(spreadsheet)].forEach(function(year) {
    const normalizedYear = normalizeAttendanceYear_(year);
    if (normalizedYear) {
      yearLookup[normalizedYear] = true;
    }
  });
  listStaffRosterDialogYears_(spreadsheet).forEach(function(item) {
    if (item && item.year) {
      yearLookup[item.year] = true;
    }
  });

  const years = Object.keys(yearLookup).map(function(year) {
    return Number(year);
  }).filter(Boolean).sort(function(a, b) { return a - b; });
  const lines = ['종사자 시트 -> 내부 저장소 반영 결과'];

  years.forEach(function(year) {
    try {
      staffRosterBundleMemo_[year] = null;
      const beforeMaster = readStaffRosterMasterByYear_(year);
      const bundle = buildStaffRosterBundleFreshByYear_(year);
      const savedMaster = readStaffRosterMasterByYear_(year);
      const importedCount = Number(bundle && bundle.entries && bundle.entries.length) || 0;
      const savedCount = Number(savedMaster && savedMaster.entries && savedMaster.entries.length) || 0;
      lines.push(
        year + '년: 시트 ' + importedCount + '건 / 저장소 ' + savedCount + '건' +
        (!importedCount && beforeMaster ? ' (시트 데이터 없음, 기존 저장소 유지)' : '')
      );
    } catch (error) {
      lines.push(year + '년: 실패 - ' + error.message);
    }
  });

  SpreadsheetApp.getUi().alert(
    '내부 저장소 반영 완료',
    lines.join('\n') + '\n\n이제 종사자/비 종사자 현황은 내부 저장소를 우선 읽습니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function normalizeNonStaffClassificationByActivityText_(entry) {
  const activityText = valueOrEmpty_(entry && entry.position).replace(/\s+/g, '').trim();
  const fallbackText = [
    valueOrEmpty_(entry && entry.group),
    valueOrEmpty_(entry && entry.classification),
    valueOrEmpty_(entry && entry.category),
  ].join(' ').replace(/\s+/g, '').trim();
  const text = activityText || fallbackText;
  if (text === '공익' || /사회복무/.test(text)) {
    return '공익';
  }
  if (text === '교사' || /아동복지교사|돌봄교사|기초학습/.test(text)) {
    return '교사';
  }
  return '기타';
}

function shouldNormalizeNonStaffClassificationYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear);
  return normalizedYear >= 2024 && normalizedYear <= 2026;
}

function normalizeNonStaffClassificationsInBundleForYear_(selectedYear, bundle, persist, skipNameLookup) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!shouldNormalizeNonStaffClassificationYear_(normalizedYear) || !bundle || !bundle.nonStaffInfo) {
    return {
      total: 0,
      changed: 0,
      counts: {},
    };
  }

  const entries = bundle.nonStaffInfo.entries || [];
  let changedCount = 0;
  const counts = {};
  entries.forEach(function(entry) {
    const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
    if (nameKey && skipNameLookup && skipNameLookup[nameKey]) {
      const currentClassification = valueOrEmpty_(entry && entry.classification).trim() || '기타';
      counts[currentClassification] = (counts[currentClassification] || 0) + 1;
      return;
    }
    const nextClassification = normalizeNonStaffClassificationByActivityText_(entry);
    counts[nextClassification] = (counts[nextClassification] || 0) + 1;
    if (valueOrEmpty_(entry.classification).trim() !== nextClassification) {
      changedCount += 1;
      entry.classification = nextClassification;
      entry.category = entry.group || nextClassification;
    } else {
      entry.classification = nextClassification;
      entry.category = entry.group || nextClassification;
    }
  });

  bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || []).concat(entries);
  bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
  if (persist && changedCount) {
    writeStaffRosterDbBundle_(normalizedYear, bundle);
    touchStaffRosterRuntimeCaches_(normalizedYear, bundle);
  }
  return {
    total: entries.length,
    changed: changedCount,
    counts: counts,
  };
}

function shouldCarryOverStaffRosterFieldsYear_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear);
  return normalizedYear >= 2025 && normalizedYear <= 2026;
}

function getStaffRosterCarryoverEntriesBySourceType_(bundle, sourceType) {
  const normalizedSourceType = normalizeStaffRosterDashboardType_(sourceType);
  const info = normalizedSourceType === 'staff'
    ? (bundle && bundle.staffInfo)
    : (bundle && bundle.nonStaffInfo);
  const lookup = {};
  (info && info.entries || []).forEach(function(entry) {
    const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
    if (!nameKey || lookup[nameKey]) {
      return;
    }
    lookup[nameKey] = entry;
  });
  return lookup;
}

function mergeStaffRosterDuplicateDailyAttendanceJson_(baseJson, incomingJson) {
  const baseMap = parseStaffRosterDailyAttendanceJson_(baseJson);
  const incomingMap = parseStaffRosterDailyAttendanceJson_(incomingJson);
  Object.keys(incomingMap || {}).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate) return;
    const incomingItem = normalizeStaffRosterDailyAttendanceItem_(incomingMap[dateKey]);
    const currentItem = baseMap[normalizedDate] ? normalizeStaffRosterDailyAttendanceItem_(baseMap[normalizedDate]) : null;
    if (!currentItem || isAnnualLeaveAttendanceItem_(incomingItem)) {
      baseMap[normalizedDate] = incomingItem;
      return;
    }
    if (!isAnnualLeaveAttendanceItem_(currentItem) && incomingItem.memo && !currentItem.memo) {
      currentItem.memo = incomingItem.memo;
    }
    baseMap[normalizedDate] = currentItem;
  });
  return stringifyStaffRosterDailyAttendanceMap_(baseMap);
}

function mergeStaffRosterDuplicateEntry_(baseEntry, incomingEntry) {
  const sourceType = normalizeStaffRosterDashboardType_(baseEntry && baseEntry.sourceType || incomingEntry && incomingEntry.sourceType);
  const sourceSheet = valueOrEmpty_(baseEntry && baseEntry.sourceSheet || incomingEntry && incomingEntry.sourceSheet).trim()
    || getStaffRosterSheetNameBySourceType_(sourceType);
  const merged = Object.assign({}, baseEntry || {});
  Object.keys(incomingEntry || {}).forEach(function(fieldKey) {
    if (fieldKey === 'dailyAttendanceJson' || fieldKey === 'sourceRowNumber') return;
    if (!hasDisplayValue_(merged[fieldKey]) && hasDisplayValue_(incomingEntry[fieldKey])) {
      merged[fieldKey] = incomingEntry[fieldKey];
    }
  });

  const baseJoinDate = normalizeRosterDateValue_(merged.joinDate);
  const incomingJoinDate = normalizeRosterDateValue_(incomingEntry && incomingEntry.joinDate);
  if (incomingJoinDate && (!baseJoinDate || incomingJoinDate < baseJoinDate)) {
    merged.joinDate = incomingJoinDate;
  }

  const baseExitDate = normalizeRosterDateValue_(merged.exitDate);
  const incomingExitDate = normalizeRosterDateValue_(incomingEntry && incomingEntry.exitDate);
  if (!baseExitDate || (incomingExitDate && incomingExitDate > baseExitDate)) {
    merged.exitDate = incomingExitDate || baseExitDate || '';
  }

  const baseRowNumber = Number(merged.sourceRowNumber) || 0;
  const incomingRowNumber = Number(incomingEntry && incomingEntry.sourceRowNumber) || 0;
  if (!baseRowNumber || (incomingRowNumber && incomingRowNumber < baseRowNumber)) {
    merged.sourceRowNumber = incomingRowNumber || baseRowNumber;
  }

  merged.dailyAttendanceJson = mergeStaffRosterDuplicateDailyAttendanceJson_(
    merged.dailyAttendanceJson,
    incomingEntry && incomingEntry.dailyAttendanceJson
  );
  merged.sourceType = sourceType;
  merged.sourceSheet = sourceSheet;
  return normalizeStaffRosterCacheEntry_(merged, sourceType, sourceSheet);
}

function dedupeStaffRosterInfoEntriesByName_(info, sourceType) {
  if (!info || !Array.isArray(info.entries) || !info.entries.length) {
    return { changed: 0, removedNames: [] };
  }
  const normalizedType = normalizeStaffRosterDashboardType_(sourceType);
  const byName = {};
  const entries = [];
  const removedNames = [];
  (info.entries || []).forEach(function(entry) {
    const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
    if (!nameKey) return;
    if (byName[nameKey] === undefined) {
      byName[nameKey] = entries.length;
      entries.push(entry);
      return;
    }
    const targetIndex = byName[nameKey];
    entries[targetIndex] = mergeStaffRosterDuplicateEntry_(entries[targetIndex], entry);
    removedNames.push(valueOrEmpty_(entry && entry.name).trim());
  });
  if (removedNames.length) {
    info.entries = entries.map(function(entry) {
      return normalizeStaffRosterCacheEntry_(entry, normalizedType, info.sheetName || getStaffRosterSheetNameBySourceType_(normalizedType));
    });
  }
  return {
    changed: removedNames.length,
    removedNames: removedNames,
  };
}

function isStaffRosterCarryoverCandidate_(entry, sourceYear, targetYear) {
  if (!entry || !entry.name) {
    return false;
  }
  const normalizedSourceYear = normalizeAttendanceYear_(sourceYear);
  const normalizedTargetYear = normalizeAttendanceYear_(targetYear);
  const sourceEnd = normalizedSourceYear + '-12-31';
  const targetStart = normalizedTargetYear + '-01-01';
  const joinDate = normalizeRosterDateValue_(entry && entry.joinDate);
  const exitDate = normalizeRosterDateValue_(entry && entry.exitDate);
  const status = valueOrEmpty_(entry && entry.status).trim();
  if (joinDate && joinDate > sourceEnd) {
    return false;
  }
  if (exitDate && exitDate < targetStart) {
    return false;
  }
  if (exitDate && exitDate <= sourceEnd) {
    return false;
  }
  if (!exitDate && /퇴사|퇴직|종료|비활성/.test(status)) {
    return false;
  }
  return true;
}

function buildStaffRosterCarryoverEntry_(entry, targetYear, sourceRowNumber) {
  const normalizedTargetYear = normalizeAttendanceYear_(targetYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const targetEnd = normalizedTargetYear + '-12-31';
  const sourceExitDate = normalizeRosterDateValue_(entry && entry.exitDate);
  const status = valueOrEmpty_(entry && entry.status).trim();
  return normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
    exitDate: sourceExitDate && sourceExitDate <= targetEnd ? sourceExitDate : '',
    status: /퇴사|퇴직|종료|비활성/.test(status) ? '재직' : (status || '재직'),
    sourceType: 'staff',
    sourceSheet: '종사자',
    sourceRowNumber: sourceRowNumber,
  }), 'staff', '종사자');
}

function preserveTargetYearStaffRosterEntryFields_(carriedEntry, currentEntry, targetYear) {
  const normalizedTargetYear = normalizeAttendanceYear_(targetYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const merged = Object.assign({}, carriedEntry);
  const dailyRange = getStaffRosterDailyAttendanceDateRangeForYear_(
    currentEntry && currentEntry.dailyAttendanceJson,
    normalizedTargetYear
  ) || {};
  if (dailyRange.joinDate || dailyRange.exitDate) {
    [
      'attendanceStatus',
      'attendanceDays',
      'absenceDays',
      'attendanceMemo',
      'dailyAttendanceJson',
    ].forEach(function(fieldKey) {
      const value = currentEntry && currentEntry[fieldKey];
      if (value !== null && value !== undefined && value !== '') {
        merged[fieldKey] = value;
      }
    });
  }
  [
    'leaveCarryover',
    'leaveManualAdjustment',
    'leaveMemo',
  ].forEach(function(fieldKey) {
    const value = currentEntry && currentEntry[fieldKey];
    if (value !== null && value !== undefined && value !== '') {
      merged[fieldKey] = value;
    }
  });
  return normalizeStaffRosterCacheEntry_(merged, 'staff', '종사자');
}

function applyStaffRosterCarryoverFromPreviousYear_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!shouldCarryOverStaffRosterFieldsYear_(normalizedYear) || !bundle) {
    return {
      changed: 0,
    };
  }

  const previousYear = normalizedYear - 1;
  const previousBundle = getStaffRosterBundleByYear_(previousYear);
  prepareStaffRosterBundleForDisplayYear_(previousYear, previousBundle, false);
  const previousStaffByName = getStaffRosterCarryoverEntriesBySourceType_(previousBundle, 'staff');
  const previousNonStaffByName = getStaffRosterCarryoverEntriesBySourceType_(previousBundle, 'nonstaff');
  let changedCount = 0;
  const insertedEntries = [];
  const carriedNamesBySourceType = {
    staff: {},
    nonstaff: {},
  };

  [
    { info: bundle.staffInfo, previousLookup: previousStaffByName, sourceType: 'staff' },
    { info: bundle.nonStaffInfo, previousLookup: previousNonStaffByName, sourceType: 'nonstaff' },
  ].forEach(function(group) {
    (group.info && group.info.entries || []).forEach(function(entry) {
      const nameKey = normalizeStaffRosterPersonNameKey_(entry && entry.name);
      const previousEntry = nameKey ? group.previousLookup[nameKey] : null;
      if (!previousEntry) {
        return;
      }
      carriedNamesBySourceType[group.sourceType][nameKey] = true;

      ['email', 'position', 'classification'].forEach(function(fieldKey) {
        const previousValue = valueOrEmpty_(previousEntry && previousEntry[fieldKey]).trim();
        if (!previousValue) {
          return;
        }
        if (valueOrEmpty_(entry && entry[fieldKey]).trim() !== previousValue) {
          entry[fieldKey] = previousValue;
          changedCount += 1;
        }
      });
      entry.category = entry.group || entry.classification;
    });
  });

  const currentStaffInfo = getStaffRosterInfoBySourceType_(bundle, 'staff');
  let nextStaffRowNumber = getNextStaffRosterMasterRowNumber_(bundle, 'staff');
  Object.keys(previousStaffByName).forEach(function(nameKey) {
    const previousEntry = previousStaffByName[nameKey];
    if (!isStaffRosterCarryoverCandidate_(previousEntry, previousYear, normalizedYear)) {
      return;
    }

    const matchingIndexes = [];
    (currentStaffInfo.entries || []).forEach(function(entry, index) {
      if (normalizeStaffRosterPersonNameKey_(entry && entry.name) === nameKey) {
        matchingIndexes.push(index);
      }
    });
    if (matchingIndexes.length) {
      const firstIndex = matchingIndexes[0];
      const currentEntry = currentStaffInfo.entries[firstIndex] || {};
      const rowNumber = Number(currentEntry.sourceRowNumber) || nextStaffRowNumber++;
      const carriedEntry = preserveTargetYearStaffRosterEntryFields_(
        buildStaffRosterCarryoverEntry_(previousEntry, normalizedYear, rowNumber),
        currentEntry,
        normalizedYear
      );
      currentStaffInfo.entries[firstIndex] = carriedEntry;
      for (let index = matchingIndexes.length - 1; index >= 1; index -= 1) {
        currentStaffInfo.entries.splice(matchingIndexes[index], 1);
      }
      insertedEntries.push(carriedEntry);
      changedCount += 1 + Math.max(matchingIndexes.length - 1, 0);
    } else {
      const carriedEntry = buildStaffRosterCarryoverEntry_(previousEntry, normalizedYear, nextStaffRowNumber++);
      currentStaffInfo.entries.push(carriedEntry);
      insertedEntries.push(carriedEntry);
      changedCount += 1;
    }
    carriedNamesBySourceType.staff[nameKey] = true;
  });

  return {
    changed: changedCount,
    insertedEntries: insertedEntries,
    carriedNamesBySourceType: carriedNamesBySourceType,
  };
}

function prepareStaffRosterBundleForDisplayYear_(selectedYear, bundle, persist) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  if (!bundle) {
    return {
      changed: 0,
    };
  }

  const carryoverResult = applyStaffRosterCarryoverFromPreviousYear_(normalizedYear, bundle);
  const normalizedResult = normalizeNonStaffClassificationsInBundleForYear_(
    normalizedYear,
    bundle,
    false,
    carryoverResult && carryoverResult.carriedNamesBySourceType
      ? carryoverResult.carriedNamesBySourceType.nonstaff
      : null
  );
  const staffDedupeResult = dedupeStaffRosterInfoEntriesByName_(bundle.staffInfo, 'staff');
  const changedCount = (Number(normalizedResult && normalizedResult.changed) || 0)
    + (Number(carryoverResult && carryoverResult.changed) || 0)
    + (Number(staffDedupeResult && staffDedupeResult.changed) || 0);

  bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || [])
    .concat(bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
  bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
  if (persist && changedCount) {
    saveStaffRosterMasterByYear_(normalizedYear, bundle);
    touchStaffRosterRuntimeCaches_(normalizedYear, bundle);
  }

  return {
    changed: changedCount,
    total: Number(normalizedResult && normalizedResult.total) || 0,
    counts: (normalizedResult && normalizedResult.counts) || {},
    staffDuplicatesRemoved: Number(staffDedupeResult && staffDedupeResult.changed) || 0,
  };
}

function normalizeNonStaffClassificationsForYears2024To2026() {
  const years = [2024, 2025, 2026];
  const results = [];

  years.forEach(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    const result = prepareStaffRosterBundleForDisplayYear_(year, bundle, true);
    results.push({
      year: year,
      total: result.total,
      changed: result.changed,
      counts: result.counts,
    });
  });

  return results;
}

function prepareStaffRosterYears2024To2026WithAlert() {
  assertStaffRosterAdmin_();
  const years = [2024, 2025, 2026];
  const results = years.map(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    const beforeStaffCount = bundle && bundle.staffInfo && bundle.staffInfo.entries
      ? bundle.staffInfo.entries.length
      : 0;
    const beforeNonStaffCount = bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries
      ? bundle.nonStaffInfo.entries.length
      : 0;
    const result = prepareStaffRosterBundleForDisplayYear_(year, bundle, true);
    const afterStaffCount = bundle && bundle.staffInfo && bundle.staffInfo.entries
      ? bundle.staffInfo.entries.length
      : 0;
    const afterNonStaffCount = bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries
      ? bundle.nonStaffInfo.entries.length
      : 0;
    return {
      year: year,
      changed: Number(result && result.changed) || 0,
      addedStaffCount: Math.max(afterStaffCount - beforeStaffCount, 0),
      staffCount: afterStaffCount,
      nonStaffCount: afterNonStaffCount,
      addedNonStaffCount: Math.max(afterNonStaffCount - beforeNonStaffCount, 0),
    };
  });
  const lines = ['24~26년 종사자/비종사자 연도 이월 정리 완료'];
  results.forEach(function(item) {
    lines.push(
      item.year + '년: 종사자 ' + item.staffCount + '명'
      + (item.addedStaffCount ? ' (이월 추가 ' + item.addedStaffCount + '명)' : '')
      + ' / 비종사자 ' + item.nonStaffCount + '명'
      + ' / 변경 ' + item.changed + '건'
    );
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return { results: results };
}

function normalizeNonStaffClassificationsForYears2024To2026WithAlert() {
  const results = normalizeNonStaffClassificationsForYears2024To2026();
  const lines = results.map(function(item) {
    const counts = item.counts || {};
    return item.year + '년: 전체 ' + item.total + '건 / 변경 ' + item.changed + '건'
      + ' (교사 ' + (counts['교사'] || 0)
      + ', 공익 ' + (counts['공익'] || 0)
      + ', 기타 ' + (counts['기타'] || 0) + ')';
  });
  SpreadsheetApp.getUi().alert(
    '비종사자 구분 보정 완료',
    lines.join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function compareNonStaffRosterStartDateOrder_(left, right) {
  const leftDate = normalizeRosterDateValue_(left && left.joinDate);
  const rightDate = normalizeRosterDateValue_(right && right.joinDate);
  if (leftDate !== rightDate) {
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    return leftDate < rightDate ? -1 : 1;
  }
  const leftName = normalizeStaffRosterPersonNameKey_(left && left.name);
  const rightName = normalizeStaffRosterPersonNameKey_(right && right.name);
  if (leftName !== rightName) {
    return leftName < rightName ? -1 : 1;
  }
  return (Number(left && left.sourceRowNumber) || 0) - (Number(right && right.sourceRowNumber) || 0);
}

function renumberNonStaffRosterByStartDateForYears_(years) {
  assertStaffRosterAdmin_();
  const rawYears = Array.isArray(years) ? years : [2024, 2025, 2026];
  const normalizedYears = uniqueNumbers_(rawYears.map(function(year) {
    return normalizeAttendanceYear_(year);
  }).filter(Boolean)).sort();
  const results = [];

  normalizedYears.forEach(function(year) {
    const bundle = getStaffRosterBundleByYear_(year);
    prepareStaffRosterBundleForDisplayYear_(year, bundle, false);
    const info = bundle.nonStaffInfo || normalizeStaffRosterSheetInfoFromCache_(null, '비 종사자', 'nonstaff');
    const entries = (info.entries || []).slice().sort(compareNonStaffRosterStartDateOrder_);
    let changedCount = 0;

    info.entries = entries.map(function(entry, index) {
      const nextOrder = String(index + 1);
      if (valueOrEmpty_(entry && entry.displayOrder).trim() !== nextOrder) {
        changedCount += 1;
      }
      return normalizeStaffRosterCacheEntry_(Object.assign({}, entry, {
        displayOrder: nextOrder,
        sourceType: 'nonstaff',
        sourceSheet: valueOrEmpty_(entry && entry.sourceSheet).trim() || '비 종사자',
      }), 'nonstaff', '비 종사자');
    });

    bundle.nonStaffInfo = info;
    bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || []).concat(info.entries || []);
    if (changedCount) {
      saveStaffRosterMasterMutation_(year, bundle);
      try {
        markStaffRosterCacheStale_(year);
      } catch (error) {
        Logger.log('renumberNonStaffRosterByStartDateForYears_ cache stale failed: %s', error.message);
      }
    }
    results.push({
      year: year,
      total: info.entries.length,
      changed: changedCount,
      first: info.entries[0] ? {
        order: valueOrEmpty_(info.entries[0].displayOrder),
        name: valueOrEmpty_(info.entries[0].name),
        startDate: normalizeRosterDateValue_(info.entries[0].joinDate),
      } : null,
      last: info.entries.length ? {
        order: valueOrEmpty_(info.entries[info.entries.length - 1].displayOrder),
        name: valueOrEmpty_(info.entries[info.entries.length - 1].name),
        startDate: normalizeRosterDateValue_(info.entries[info.entries.length - 1].joinDate),
      } : null,
    });
  });

  return { results: results };
}

function renumberNonStaffRosterByStartDateForYears2024To2026() {
  return renumberNonStaffRosterByStartDateForYears_([2024, 2025, 2026]);
}

function renumberNonStaffRosterByStartDateForYears2024To2026WithAlert() {
  const result = renumberNonStaffRosterByStartDateForYears2024To2026();
  const lines = ['24~26년 비종사자 번호 재정렬 완료'];
  (result.results || []).forEach(function(item) {
    lines.push(item.year + '년: 비종사자 ' + item.total + '명 / 번호 변경 ' + item.changed + '건');
  });
  SpreadsheetApp.getUi().alert(lines.join('\n'));
  return result;
}

function appendStaffRosterEntryToSheet_(sheet, fieldValueMap) {
  const headerInfo = detectStaffRosterHeaderForSheet_(sheet);
  const ensuredHeader = ensureStaffRosterFieldColumns_(sheet, headerInfo, Object.keys(fieldValueMap || {}));
  const newRowNumber = Math.max(headerInfo.lastRow, 1) + 1;
  writeStaffRosterFieldsToSheetRow_(sheet, newRowNumber, ensuredHeader.headerIndexMap, fieldValueMap);
  return {
    sheetName: sheet.getName(),
    rowNumber: newRowNumber,
    a1Notation: 'A' + newRowNumber,
  };
}

function clearStaffRosterYearCaches_(selectedYear) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterAnalysisSavedMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
  try {
    markStaffRosterCacheStale_(normalizedYear);
  } catch (error) {
    Logger.log('clearStaffRosterYearCaches_ data store stale mark failed: %s', error.message);
  }
  try {
    clearAttendanceYearCache_(normalizedYear, {
      clearStudentDetails: false,
      markSnapshotStale: false,
      clearTemplatePreview: false,
    });
  } catch (error) {
    Logger.log('clearStaffRosterYearCaches_ attendance cache clear failed: %s', error.message);
  }
  return normalizedYear;
}

function getStaffRosterInfoKeyBySourceType_(sourceType) {
  return normalizeStaffRosterDashboardType_(sourceType) === 'nonstaff' ? 'nonStaffInfo' : 'staffInfo';
}

function getStaffRosterInfoBySourceType_(bundle, sourceType) {
  const infoKey = getStaffRosterInfoKeyBySourceType_(sourceType);
  if (!bundle[infoKey]) {
    bundle[infoKey] = normalizeStaffRosterSheetInfoFromCache_(
      null,
      getStaffRosterSheetNameBySourceType_(sourceType),
      normalizeStaffRosterDashboardType_(sourceType)
    );
  }
  if (!Array.isArray(bundle[infoKey].entries)) {
    bundle[infoKey].entries = [];
  }
  return bundle[infoKey];
}

function findStaffRosterMasterEntryLocation_(bundle, item) {
  const sourceSheet = valueOrEmpty_(item && item.sourceSheet).trim();
  const sourceRowNumber = Number(item && item.sourceRowNumber) || 0;
  const sourceType = normalizeStaffRosterDashboardType_(
    (item && item.sourceType) || getStaffRosterSourceTypeBySheetName_(sourceSheet)
  );
  const name = valueOrEmpty_(item && item.name).trim();
  const infos = [
    getStaffRosterInfoBySourceType_(bundle, sourceType),
    getStaffRosterInfoBySourceType_(bundle, sourceType === 'nonstaff' ? 'staff' : 'nonstaff'),
  ];

  for (let infoIndex = 0; infoIndex < infos.length; infoIndex += 1) {
    const info = infos[infoIndex];
    for (let index = 0; index < info.entries.length; index += 1) {
      const entry = info.entries[index] || {};
      if (sourceRowNumber && Number(entry.sourceRowNumber) === sourceRowNumber) {
        if (!sourceSheet || normalizeStaffRosterSheetLookupName_(entry.sourceSheet) === normalizeStaffRosterSheetLookupName_(sourceSheet)) {
          return { info: info, index: index, entry: entry, sourceType: entry.sourceType || sourceType };
        }
      }
    }
  }

  if (name) {
    const normalizedName = name.replace(/\s+/g, '').trim();
    for (let infoIndex = 0; infoIndex < infos.length; infoIndex += 1) {
      const info = infos[infoIndex];
      for (let index = 0; index < info.entries.length; index += 1) {
        const entry = info.entries[index] || {};
        if (valueOrEmpty_(entry.name).replace(/\s+/g, '').trim() === normalizedName) {
          return { info: info, index: index, entry: entry, sourceType: entry.sourceType || sourceType };
        }
      }
    }
  }

  return null;
}

function getNextStaffRosterMasterRowNumber_(bundle, sourceType) {
  const info = getStaffRosterInfoBySourceType_(bundle, sourceType);
  return info.entries.reduce(function(max, entry) {
    return Math.max(max, Number(entry && entry.sourceRowNumber) || 0);
  }, 1) + 1;
}

function saveStaffRosterMasterMutation_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || [])
    .concat(bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
  bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
  getStaffRosterMembershipCarryoverLookup_.memo = {};
  const savedBundle = saveStaffRosterMasterByYear_(normalizedYear, bundle);
  saveStaffRosterCacheByYear_(normalizedYear, savedBundle);
  staffRosterAnalysisSavedMemo_[normalizedYear] = null;
  saveStaffRosterAnalysisIfNeeded_(normalizedYear, savedBundle.analysis);
  staffRosterBundleMemo_[normalizedYear] = savedBundle;
  staffRosterCompositionMemo_ = {};
  try {
    clearAttendanceYearCache_(normalizedYear, {
      clearStudentDetails: false,
      markSnapshotStale: false,
      clearTemplatePreview: false,
    });
  } catch (error) {
    Logger.log('saveStaffRosterMasterMutation_ attendance cache clear failed: %s', error.message);
  }
  return savedBundle;
}

function getStaffRosterEntryDbKeyForYear_(selectedYear, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceType = normalizeStaffRosterDashboardType_(entry && entry.sourceType);
  const sourceRowNumber = Number(entry && entry.sourceRowNumber) || 0;
  const name = valueOrEmpty_(entry && entry.name).trim();
  return buildStaffRosterDbKey_(normalizedYear, sourceType, sourceRowNumber, name);
}

function saveStaffRosterChangedEntriesFast_(selectedYear, bundle, changedEntries, previousEntries) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const changedList = (changedEntries || []).filter(function(entry) {
    return entry && valueOrEmpty_(entry.name).trim();
  });
  const previousList = (previousEntries || []).filter(function(entry) {
    return entry && valueOrEmpty_(entry.name).trim();
  });
  const deletedLookup = {};

  previousList.forEach(function(previousEntry) {
    const previousKey = getStaffRosterEntryDbKeyForYear_(normalizedYear, previousEntry);
    const stillExists = changedList.some(function(nextEntry) {
      return getStaffRosterEntryDbKeyForYear_(normalizedYear, nextEntry) === previousKey;
    });
    if (previousKey && !stillExists && !deletedLookup[previousKey]) {
      deletedLookup[previousKey] = true;
      markStaffRosterDbEntryDeleted_(normalizedYear, previousEntry);
    }
  });

  if (changedList.length) {
    upsertStaffRosterDbEntries_(normalizedYear, changedList);
  }
  touchStaffRosterRuntimeCaches_(normalizedYear, bundle);
  try {
    markStaffRosterCacheStale_(normalizedYear);
  } catch (error) {
    Logger.log('saveStaffRosterChangedEntriesFast_ cache stale failed: %s', error.message);
  }
}

function persistStaffRosterAttendanceIfProvided_(selectedYear, entry, payload) {
  if (!Object.prototype.hasOwnProperty.call(payload || {}, 'dailyAttendanceJson')) {
    return entry;
  }
  const dailyMap = parseStaffRosterDailyAttendanceJson_(payload && payload.dailyAttendanceJson);
  replaceStaffAttendanceDbMapForEntry_(selectedYear, entry, dailyMap);
  return Object.assign({}, entry, {
    dailyAttendanceJson: '',
  });
}

function buildStaffRosterAttendanceSummaryFieldValueMap_(payload) {
  const fieldValueMap = {};
  [
    'attendanceStatus',
    'attendanceDays',
    'absenceDays',
    'attendanceMemo',
  ].forEach(function(fieldKey) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, fieldKey)) {
      fieldValueMap[fieldKey] = valueOrEmpty_(payload[fieldKey]).trim();
    }
  });
  return fieldValueMap;
}

function findStaffRosterDbEntryFast_(selectedYear, payload) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sourceSheet = valueOrEmpty_(payload && payload.sourceSheet).trim();
  const sourceRowNumber = Number(payload && payload.sourceRowNumber) || 0;
  const sourceType = normalizeStaffRosterDashboardType_(
    (payload && payload.sourceType) || getStaffRosterSourceTypeBySheetName_(sourceSheet)
  );
  const name = valueOrEmpty_(payload && payload.name).trim();
  const normalizedName = name.replace(/\s+/g, '').trim();
  const rows = getStaffRosterDbRows_(normalizedYear, true).filter(function(row) {
    return !row.deletedAt && normalizeStaffRosterDashboardType_(row.sourceType) === sourceType;
  });

  function parseRow(row) {
    try {
      const parsed = JSON.parse(row.json);
      const entrySourceType = normalizeStaffRosterDashboardType_(parsed.sourceType || row.sourceType);
      const entrySourceSheet = valueOrEmpty_(parsed.sourceSheet || row.sourceSheet).trim() || getStaffRosterSheetNameBySourceType_(entrySourceType);
      const entry = normalizeStaffRosterCacheEntry_(Object.assign({}, parsed, {
        sourceType: entrySourceType,
        sourceSheet: entrySourceSheet,
        sourceRowNumber: Number(parsed.sourceRowNumber) || row.sourceRowNumber,
      }), entrySourceType, entrySourceSheet);
      return {
        entry: entry,
        dbRowNumber: row.rowNumber,
        sourceType: entrySourceType,
      };
    } catch (error) {
      Logger.log('findStaffRosterDbEntryFast_ parse failed: %s', error.message);
      return null;
    }
  }

  if (sourceRowNumber) {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (Number(row.sourceRowNumber) !== sourceRowNumber) {
        continue;
      }
      if (sourceSheet && normalizeStaffRosterSheetLookupName_(row.sourceSheet) !== normalizeStaffRosterSheetLookupName_(sourceSheet)) {
        continue;
      }
      const parsed = parseRow(row);
      if (parsed && parsed.entry && parsed.entry.name) {
        return parsed;
      }
    }
  }

  if (normalizedName) {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (valueOrEmpty_(row.name).replace(/\s+/g, '').trim() !== normalizedName) {
        continue;
      }
      const parsed = parseRow(row);
      if (parsed && parsed.entry && parsed.entry.name) {
        return parsed;
      }
    }
  }

  return null;
}

function writeStaffRosterDbEntryFast_(selectedYear, dbRowNumber, entry) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const sheet = ensureStaffRosterDbSheet_(SpreadsheetApp.getActiveSpreadsheet());
  const rowValues = toStaffRosterDbRowValues_(normalizedYear, entry);
  const rowNumber = Number(dbRowNumber) || 0;
  if (rowNumber) {
    sheet.getRange(rowNumber, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, STAFF_ROSTER_DB_HEADERS.length).setValues([rowValues]);
  }
  staffRosterBundleMemo_[normalizedYear] = null;
  staffRosterCompositionMemo_ = {};
}

function saveStaffRosterAttendancePatch(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const fastLocation = findStaffRosterDbEntryFast_(normalizedYear, payload);
  let bundle = null;
  let location = fastLocation;
  if (!location) {
    bundle = getStaffRosterBundleByYear_(normalizedYear);
    const bundleLocation = findStaffRosterMasterEntryLocation_(bundle, payload);
    if (bundleLocation) {
      location = {
        entry: bundleLocation.entry,
        sourceType: bundleLocation.sourceType,
        bundleLocation: bundleLocation,
      };
    }
  }
  if (!location || !location.entry) {
    throw new Error('출결을 저장할 대상을 찾지 못했습니다.');
  }

  const currentSourceType = normalizeStaffRosterDashboardType_(
    location.entry && (location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(location.entry.sourceSheet))
  );
  assertStaffRosterManageAccessForSourceType_(currentSourceType);

  const adminContext = getStaffRosterAdminContext_();
  const tabLocks = normalizeStaffRosterTabLocks_(getStaffRosterDropdownOptions_().tabLocks);
  let fieldValueMap = buildStaffRosterAttendanceSummaryFieldValueMap_(payload);
  assertStaffRosterEntryUpdateAllowed_(Object.assign({}, payload, { sourceType: currentSourceType }), location.entry, fieldValueMap, adminContext);
  fieldValueMap = filterStaffRosterFieldValueMapByTabLocks_(fieldValueMap, tabLocks, adminContext);

  const legacyDailyAttendanceJson = valueOrEmpty_(location.entry.dailyAttendanceJson).trim();
  const nextMap = legacyDailyAttendanceJson
    ? getStaffRosterDailyAttendanceMapForEntry_(location.entry, normalizedYear)
    : {};
  const changesMap = {};
  const removedDates = [];
  const removedLookup = {};

  (Array.isArray(payload.removedDates) ? payload.removedDates : []).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || String(normalizedDate).indexOf(String(normalizedYear) + '-') !== 0 || removedLookup[normalizedDate]) {
      return;
    }
    removedLookup[normalizedDate] = true;
    removedDates.push(normalizedDate);
    delete nextMap[normalizedDate];
  });

  const rawChanges = payload.changes && typeof payload.changes === 'object' && !Array.isArray(payload.changes)
    ? payload.changes
    : {};
  Object.keys(rawChanges).forEach(function(dateKey) {
    const normalizedDate = normalizeDateKey_(dateKey);
    if (!normalizedDate || String(normalizedDate).indexOf(String(normalizedYear) + '-') !== 0) {
      return;
    }
    const normalizedItem = normalizeStaffRosterDailyAttendanceItem_(rawChanges[dateKey]);
    changesMap[normalizedDate] = normalizedItem;
    nextMap[normalizedDate] = normalizedItem;
  });

  const hasAttendanceChanges = !!(removedDates.length || Object.keys(changesMap).length);
  let attendanceResult = { insertedCount: 0, updatedCount: 0, removedCount: 0 };
  if (hasAttendanceChanges) {
    if (legacyDailyAttendanceJson) {
      attendanceResult = replaceStaffAttendanceDbMapForEntry_(normalizedYear, location.entry, nextMap);
    } else {
      attendanceResult = patchStaffAttendanceDbMapForEntry_(normalizedYear, location.entry, changesMap, removedDates);
    }
  }

  const previousEntry = Object.assign({}, location.entry);
  let updatedEntry = Object.assign({}, location.entry, fieldValueMap, {
    dailyAttendanceJson: '',
  });
  updatedEntry = normalizeStaffRosterCacheEntry_(
    updatedEntry,
    currentSourceType,
    location.entry.sourceSheet || getStaffRosterSheetNameBySourceType_(currentSourceType)
  );

  const shouldUpdateRosterDb = valueOrEmpty_(location.entry.dailyAttendanceJson).trim()
    || Object.keys(fieldValueMap).some(function(fieldKey) {
      return valueOrEmpty_(previousEntry[fieldKey]).trim() !== valueOrEmpty_(updatedEntry[fieldKey]).trim();
    });

  if (location.bundleLocation) {
    location.bundleLocation.info.entries[location.bundleLocation.index] = updatedEntry;
  }
  if (shouldUpdateRosterDb) {
    if (Number(location.dbRowNumber)) {
      writeStaffRosterDbEntryFast_(normalizedYear, location.dbRowNumber, updatedEntry);
    } else if (location.bundleLocation && bundle) {
      saveStaffRosterChangedEntriesFast_(normalizedYear, bundle, [updatedEntry], [previousEntry]);
    } else {
      writeStaffRosterDbEntryFast_(normalizedYear, 0, updatedEntry);
    }
  } else if (bundle) {
    touchStaffRosterRuntimeCaches_(normalizedYear, bundle);
  }

  return {
    ok: true,
    selectedYear: normalizedYear,
    sourceType: currentSourceType,
    sheetName: updatedEntry.sourceSheet || getStaffRosterSheetNameBySourceType_(currentSourceType),
    rowNumber: Number(updatedEntry.sourceRowNumber) || 0,
    insertedCount: Number(attendanceResult.insertedCount || attendanceResult.savedCount) || 0,
    updatedCount: Number(attendanceResult.updatedCount) || 0,
    removedCount: Number(attendanceResult.removedCount) || 0,
    dailyAttendanceJson: legacyDailyAttendanceJson ? stringifyStaffRosterDailyAttendanceMap_(nextMap) : '',
  };
}

function saveStaffRosterAttendancePatchBatch(input) {
  const payload = input || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const results = [];
  items.forEach(function(item) {
    const clientId = valueOrEmpty_(item && item.clientId).trim();
    try {
      const result = saveStaffRosterAttendancePatch(item && item.payload ? item.payload : item);
      results.push({
        clientId: clientId,
        ok: true,
        result: result,
      });
    } catch (error) {
      results.push({
        clientId: clientId,
        ok: false,
        message: error && error.message ? error.message : String(error || '알 수 없는 오류'),
      });
    }
  });
  return {
    ok: results.every(function(row) { return row && row.ok; }),
    totalCount: results.length,
    successCount: results.filter(function(row) { return row && row.ok; }).length,
    results: results,
  };
}

function touchStaffRosterRuntimeCaches_(selectedYear, bundle) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  clearStaffRosterDialogCachesForCurrentUser_(normalizedYear);
  if (bundle) {
    bundle.entries = (bundle.staffInfo && bundle.staffInfo.entries || [])
      .concat(bundle.nonStaffInfo && bundle.nonStaffInfo.entries || []);
    bundle.analysis = buildStaffRosterAnalysisPayload_(normalizedYear, bundle.staffInfo, bundle.nonStaffInfo);
    staffRosterBundleMemo_[normalizedYear] = bundle;
  } else {
    staffRosterBundleMemo_[normalizedYear] = null;
  }
  getStaffRosterMembershipCarryoverLookup_.memo = {};
  staffRosterCompositionMemo_ = {};
  try {
    clearAttendanceYearCache_(normalizedYear, {
      clearStudentDetails: false,
      markSnapshotStale: false,
      clearTemplatePreview: false,
    });
  } catch (error) {
    Logger.log('touchStaffRosterRuntimeCaches_ attendance cache clear failed: %s', error.message);
  }
}

function updateStaffRosterEntry(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const location = findStaffRosterMasterEntryLocation_(bundle, payload);
  if (!location) {
    throw new Error('수정할 저장소 항목을 찾지 못했습니다.');
  }
  const currentSourceTypeForAccess = normalizeStaffRosterDashboardType_(
    location.entry && (location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(location.entry.sourceSheet))
  );
  assertStaffRosterManageAccessForSourceType_(currentSourceTypeForAccess);

  const adminContext = getStaffRosterAdminContext_();
  const tabLocks = normalizeStaffRosterTabLocks_(getStaffRosterDropdownOptions_().tabLocks);
  let fieldValueMap = buildStaffRosterFieldValueMap_(payload);
  assertStaffRosterEntryUpdateAllowed_(payload, location.entry, fieldValueMap, adminContext);
  fieldValueMap = filterStaffRosterFieldValueMapByTabLocks_(fieldValueMap, tabLocks, adminContext);
  const sourceSheetName = valueOrEmpty_(payload.sourceSheet).trim();
  const sourceRowNumber = Number(payload.sourceRowNumber) || Number(location.entry.sourceRowNumber) || 0;
  const currentSourceType = normalizeStaffRosterDashboardType_(location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(sourceSheetName));
  const targetSourceType = normalizeStaffRosterDashboardType_(valueOrEmpty_(payload.sourceType).trim() || currentSourceType);
  const targetSheetName = getStaffRosterSheetNameBySourceType_(targetSourceType);
  const targetInfo = getStaffRosterInfoBySourceType_(bundle, targetSourceType);
  const targetRowNumber = targetSourceType === currentSourceType && sourceRowNumber
    ? sourceRowNumber
    : getNextStaffRosterMasterRowNumber_(bundle, targetSourceType);
  const previousEntry = Object.assign({}, location.entry);
  let updatedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, location.entry, fieldValueMap, {
    sourceType: targetSourceType,
    sourceSheet: targetSheetName,
    sourceRowNumber: targetRowNumber,
  }), targetSourceType, targetSheetName);
  updatedEntry = persistStaffRosterAttendanceIfProvided_(normalizedYear, updatedEntry, payload);

  if (targetInfo === location.info) {
    location.info.entries[location.index] = updatedEntry;
  } else {
    location.info.entries.splice(location.index, 1);
    targetInfo.entries.push(updatedEntry);
  }

  if (Object.prototype.hasOwnProperty.call(fieldValueMap, 'stampUrl')) {
    saveStaffRosterStampUrlFromPayload_(payload);
  }
  saveStaffRosterChangedEntriesFast_(normalizedYear, bundle, [updatedEntry], [previousEntry]);
  return {
    sheetName: targetSheetName,
    rowNumber: targetRowNumber,
    a1Notation: 'A' + targetRowNumber,
    selectedYear: normalizedYear,
  };
}

function createStaffRosterEntry(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const targetSourceType = normalizeStaffRosterDashboardType_(payload.sourceType);
  assertStaffRosterManageAccessForSourceType_(targetSourceType);
  const targetSheetName = getStaffRosterSheetNameBySourceType_(targetSourceType);
  const targetInfo = getStaffRosterInfoBySourceType_(bundle, targetSourceType);
  const rowNumber = getNextStaffRosterMasterRowNumber_(bundle, targetSourceType);
  let entry = normalizeStaffRosterCacheEntry_(Object.assign({}, buildStaffRosterFieldValueMap_(payload), {
    sourceType: targetSourceType,
    sourceSheet: targetSheetName,
    sourceRowNumber: rowNumber,
  }), targetSourceType, targetSheetName);
  entry = persistStaffRosterAttendanceIfProvided_(normalizedYear, entry, payload);
  targetInfo.entries.push(entry);
  saveStaffRosterStampUrlFromPayload_(payload);
  saveStaffRosterChangedEntriesFast_(normalizedYear, bundle, [entry], []);
  return {
    sheetName: targetSheetName,
    rowNumber: rowNumber,
    a1Notation: 'A' + rowNumber,
    selectedYear: normalizedYear,
  };
}

function saveStaffRosterEntryChanges(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const adminContext = getStaffRosterAdminContext_();
  const tabLocks = normalizeStaffRosterTabLocks_(getStaffRosterDropdownOptions_().tabLocks);
  const changes = Array.isArray(payload.changes) ? payload.changes : [];
  const results = [];
  const changedEntries = [];
  const previousEntries = [];
  let savedCount = 0;
  let skippedCount = 0;

  changes.forEach(function(change) {
    const mode = String(change && change.mode || '').trim().toLowerCase() === 'create' ? 'create' : 'update';
    const item = change && change.payload || {};
    try {
      const targetSourceType = normalizeStaffRosterDashboardType_(item.sourceType);
      const targetSheetName = getStaffRosterSheetNameBySourceType_(targetSourceType);
      let fieldValueMap = buildStaffRosterFieldValueMap_(item);
      let rowNumber = 0;

      if (mode === 'create') {
        assertStaffRosterManageAccessForSourceType_(targetSourceType);
        const targetInfo = getStaffRosterInfoBySourceType_(bundle, targetSourceType);
        rowNumber = getNextStaffRosterMasterRowNumber_(bundle, targetSourceType);
        fieldValueMap = filterStaffRosterFieldValueMapByTabLocks_(fieldValueMap, tabLocks, adminContext);
        let entry = normalizeStaffRosterCacheEntry_(Object.assign({}, fieldValueMap, {
          sourceType: targetSourceType,
          sourceSheet: targetSheetName,
          sourceRowNumber: rowNumber,
        }), targetSourceType, targetSheetName);
        entry = persistStaffRosterAttendanceIfProvided_(normalizedYear, entry, item);
        targetInfo.entries.push(entry);
        changedEntries.push(entry);
        saveStaffRosterStampUrlFromPayload_(item);
      } else {
        const location = findStaffRosterMasterEntryLocation_(bundle, item);
        if (!location) {
          skippedCount += 1;
          results.push({
            clientId: change && change.clientId || '',
            ok: false,
            error: '수정할 저장소 항목을 찾지 못했습니다.',
          });
          return;
        }
        assertStaffRosterEntryUpdateAllowed_(item, location.entry, fieldValueMap, adminContext);
        fieldValueMap = filterStaffRosterFieldValueMapByTabLocks_(fieldValueMap, tabLocks, adminContext);
        const sourceSheetName = valueOrEmpty_(item.sourceSheet).trim();
        const sourceRowNumber = Number(item.sourceRowNumber) || Number(location.entry.sourceRowNumber) || 0;
        const currentSourceType = normalizeStaffRosterDashboardType_(location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(sourceSheetName));
        const requestedSourceType = normalizeStaffRosterDashboardType_(valueOrEmpty_(item.sourceType).trim() || currentSourceType);
        const requestedSheetName = getStaffRosterSheetNameBySourceType_(requestedSourceType);
        const targetInfo = getStaffRosterInfoBySourceType_(bundle, requestedSourceType);
        rowNumber = requestedSourceType === currentSourceType && sourceRowNumber
          ? sourceRowNumber
          : getNextStaffRosterMasterRowNumber_(bundle, requestedSourceType);
        const previousEntry = Object.assign({}, location.entry);
        let updatedEntry = normalizeStaffRosterCacheEntry_(Object.assign({}, location.entry, fieldValueMap, {
          sourceType: requestedSourceType,
          sourceSheet: requestedSheetName,
          sourceRowNumber: rowNumber,
        }), requestedSourceType, requestedSheetName);
        updatedEntry = persistStaffRosterAttendanceIfProvided_(normalizedYear, updatedEntry, item);
        if (targetInfo === location.info) {
          location.info.entries[location.index] = updatedEntry;
        } else {
          location.info.entries.splice(location.index, 1);
          targetInfo.entries.push(updatedEntry);
        }
        previousEntries.push(previousEntry);
        changedEntries.push(updatedEntry);
        saveStaffRosterStampUrlFromPayload_(item);
      }

      savedCount += 1;
      results.push({
        clientId: change && change.clientId || '',
        ok: true,
        mode: mode,
        sheetName: targetSheetName,
        rowNumber: rowNumber,
        a1Notation: 'A' + rowNumber,
        selectedYear: normalizedYear,
      });
    } catch (error) {
      skippedCount += 1;
      results.push({
        clientId: change && change.clientId || '',
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  });

  if (savedCount) {
    saveStaffRosterChangedEntriesFast_(normalizedYear, bundle, changedEntries, previousEntries);
  }

  return {
    selectedYear: normalizedYear,
    savedCount: savedCount,
    skippedCount: skippedCount,
    results: results,
  };
}

function bulkUpdateStaffRosterEntries(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const changes = payload.changes || {};
  const fieldValueMap = {};

  ['position', 'group', 'classification', 'status'].forEach(function(fieldKey) {
    if (changes[fieldKey] !== null && changes[fieldKey] !== undefined) {
      fieldValueMap[fieldKey] = valueOrEmpty_(changes[fieldKey]).trim();
    }
  });

  const fieldKeys = Object.keys(fieldValueMap);
  if (!items.length || !fieldKeys.length) {
    return {
      updatedCount: 0,
      skippedCount: items.length,
      selectedYear: normalizedYear,
    };
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const changedEntries = [];
  const previousEntries = [];

  items.forEach(function(item) {
    const location = findStaffRosterMasterEntryLocation_(bundle, item);
    if (!location) {
      skippedCount += 1;
      return;
    }
    const sourceType = normalizeStaffRosterDashboardType_(location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(location.entry.sourceSheet));
    assertStaffRosterManageAccessForSourceType_(sourceType);
    const previousEntry = Object.assign({}, location.entry);
    const updatedEntry = normalizeStaffRosterCacheEntry_(
      Object.assign({}, location.entry, fieldValueMap),
      sourceType,
      location.entry.sourceSheet
    );
    location.info.entries[location.index] = updatedEntry;
    previousEntries.push(previousEntry);
    changedEntries.push(updatedEntry);
    updatedCount += 1;
  });

  if (updatedCount) {
    saveStaffRosterChangedEntriesFast_(normalizedYear, bundle, changedEntries, previousEntries);
  }
  return {
    updatedCount: updatedCount,
    skippedCount: skippedCount,
    selectedYear: normalizedYear,
  };
}

function deleteStaffRosterEntries(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const normalizedYear = normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet);
  const bundle = getStaffRosterBundleByYear_(normalizedYear);
  const items = Array.isArray(payload.items) ? payload.items : [];
  let deletedCount = 0;
  let skippedCount = 0;
  const deletedKeys = {};

  items.forEach(function(item) {
    const location = findStaffRosterMasterEntryLocation_(bundle, item);
    if (!location) {
      skippedCount += 1;
      return;
    }
    const key = valueOrEmpty_(location.entry.sourceSheet) + ':' + String(location.entry.sourceRowNumber);
    if (deletedKeys[key]) {
      skippedCount += 1;
      return;
    }
    const sourceType = normalizeStaffRosterDashboardType_(location.entry.sourceType || getStaffRosterSourceTypeBySheetName_(location.entry.sourceSheet));
    assertStaffRosterManageAccessForSourceType_(sourceType);
    deletedKeys[key] = true;
    location.info.entries.splice(location.index, 1);
    deletedCount += 1;
  });

  saveStaffRosterMasterMutation_(normalizedYear, bundle);
  return {
    deletedCount: deletedCount,
    skippedCount: skippedCount,
    selectedYear: normalizedYear,
  };
}

function normalizeStaffRosterSheetLookupName_(sheetName) {
  return String(sheetName || '').replace(/\s+/g, '').trim().toLowerCase();
}

function buildStaffRosterAttendanceSheetCandidates_(selectedYear, sourceType) {
  const normalizedYear = normalizeAttendanceYear_(selectedYear) || LOG_PRINT_CONFIG.ATTENDANCE_DEFAULT_YEAR;
  const yearLabel = String(normalizedYear || '').trim();
  const shortYearLabel = yearLabel.slice(-2);
  const sourceLabels = String(sourceType || '').trim().toLowerCase() === 'nonstaff'
    ? ['비종사자', '비 종사자']
    : ['종사자'];
  const attendanceLabels = ['출결관리', '출결 관리', '출결'];
  const candidates = [];

  sourceLabels.forEach(function(sourceLabel) {
    attendanceLabels.forEach(function(attendanceLabel) {
      candidates.push(yearLabel + '년 ' + sourceLabel + ' ' + attendanceLabel);
      candidates.push(shortYearLabel + '년 ' + sourceLabel + ' ' + attendanceLabel);
      candidates.push(sourceLabel + ' ' + attendanceLabel + ' ' + yearLabel);
      candidates.push(sourceLabel + ' ' + attendanceLabel + '_' + yearLabel);
      candidates.push(sourceLabel + ' ' + attendanceLabel);
    });
    candidates.push(yearLabel + '년 ' + sourceLabel);
    candidates.push(shortYearLabel + '년 ' + sourceLabel);
    candidates.push(sourceLabel + ' ' + yearLabel);
    candidates.push(sourceLabel + '_' + yearLabel);
    candidates.push(sourceLabel);
  });

  return uniqueStrings_(candidates.map(function(item) {
    return String(item || '').trim();
  }).filter(Boolean));
}

function findStaffRosterRowByName_(sheet, personName) {
  const normalizedName = valueOrEmpty_(personName).trim();
  if (!sheet || !normalizedName) {
    return 0;
  }
  try {
    const match = sheet.createTextFinder(normalizedName)
      .matchEntireCell(true)
      .findNext();
    if (match) {
      return match.getRow();
    }
  } catch (error) {
    Logger.log('findStaffRosterRowByName_ failed: %s', error.message);
  }
  return 0;
}

function resolveStaffRosterAttendanceFallbackRow_(sheet) {
  if (!sheet) {
    return 1;
  }
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow <= 1) {
    return 1;
  }
  return Math.min(Math.max((sheet.getFrozenRows() || 0) + 1, 2), lastRow);
}

function openStaffRosterAttendanceManagement(input) {
  const payload = input || {};
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceType = normalizeStaffRosterDashboardType_(payload.sourceType);
  const sourceSheetName = valueOrEmpty_(payload.sourceSheet).trim() || getStaffRosterSheetNameBySourceType_(sourceType);
  const sourceRowNumber = Number(payload.sourceRowNumber) || 0;
  const personName = valueOrEmpty_(payload.name).trim();
  const candidateNames = buildStaffRosterAttendanceSheetCandidates_(payload.selectedYear, sourceType);
  const sheetLookup = {};

  spreadsheet.getSheets().forEach(function(sheet) {
    const lookupKey = normalizeStaffRosterSheetLookupName_(sheet.getName());
    if (!sheetLookup[lookupKey]) {
      sheetLookup[lookupKey] = sheet;
    }
  });

  let targetSheet = null;
  let matchedCandidate = '';
  candidateNames.some(function(candidateName) {
    const matchedSheet = sheetLookup[normalizeStaffRosterSheetLookupName_(candidateName)];
    if (!matchedSheet) {
      return false;
    }
    targetSheet = matchedSheet;
    matchedCandidate = candidateName;
    return true;
  });

  const sourceSheetLookupKey = normalizeStaffRosterSheetLookupName_(sourceSheetName);
  const usedSourceFallback = !targetSheet;
  if (!targetSheet) {
    targetSheet = sheetLookup[sourceSheetLookupKey] || spreadsheet.getSheetByName(sourceSheetName);
  }

  if (!targetSheet) {
    throw new Error('비종사자 출결관리용 시트를 찾지 못했습니다.');
  }

  const targetSheetLookupKey = normalizeStaffRosterSheetLookupName_(targetSheet.getName());
  let targetRow = 0;
  let matchedBy = 'sheet';

  if (sourceRowNumber && targetSheetLookupKey === sourceSheetLookupKey) {
    targetRow = sourceRowNumber;
    matchedBy = 'sourceRow';
  } else {
    targetRow = findStaffRosterRowByName_(targetSheet, personName);
    if (targetRow) {
      matchedBy = 'name';
    }
  }

  if (!targetRow) {
    targetRow = resolveStaffRosterAttendanceFallbackRow_(targetSheet);
    matchedBy = 'fallback';
  }

  spreadsheet.setActiveSheet(targetSheet);
  const targetRange = targetSheet.getRange(Math.max(targetRow, 1), 1);
  targetRange.activate();

  return {
    sheetName: targetSheet.getName(),
    rowNumber: targetRange.getRow(),
    a1Notation: targetRange.getA1Notation(),
    matchedBy: matchedBy,
    matchedCandidate: matchedCandidate,
    selectedYear: normalizeAttendanceYear_(payload.selectedYear) || resolveWorkingYear_(spreadsheet),
    usedSourceFallback: usedSourceFallback,
  };
}
