function parseDesktopExportYears_(value) {
  const raw = String(value || '').trim();
  const years = raw
    ? raw.split(/[,|\s]+/).map(function(item) { return normalizeAttendanceYear_(item); }).filter(Boolean)
    : [2024, 2025, 2026];
  const seen = {};
  return years.filter(function(year) {
    if (seen[year]) return false;
    seen[year] = true;
    return year >= 2000 && year <= 2100;
  });
}

function buildDesktopPersonId_(kind, name) {
  return String(kind || 'staff') + '-' + String(name || '')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣-]/g, '');
}

function buildDesktopChildId_(name) {
  return 'child-' + String(name || '')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣-]/g, '');
}

function getDesktopChildKey_(child) {
  return normalizeSearchKeyword_(child && child.name);
}

function readDesktopEntryText_(entry, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    const value = valueOrEmpty_(entry && entry[keys[i]]).trim();
    if (value) return value;
  }
  return '';
}

function mapDesktopRosterEntry_(entry, kind) {
  const name = readDesktopEntryText_(entry, ['name', '이름', '성명']);
  if (!name) return null;
  const sourceKind = kind === 'nonStaff' || kind === 'nonstaff' ? 'nonStaff' : 'staff';
  const role = readDesktopEntryText_(entry, ['position', 'jobTitle', 'role', 'activityType', 'roleText', '활동유형', '직위']);
  const category = readDesktopEntryText_(entry, ['category', 'classification', 'qualification', 'group', '구분']);
  const status = readDesktopEntryText_(entry, ['status', '상태']) || (sourceKind === 'staff' ? '재직' : '활동');
  const startedAt = normalizeDateKey_(readDesktopEntryText_(entry, ['startedAt', 'joinDate', 'startDate', 'startDateKey', '입사일', '시작일']));
  const endedAt = normalizeDateKey_(readDesktopEntryText_(entry, ['endedAt', 'exitDate', 'endDate', 'endDateKey', '퇴사일', '종료일']));
  const email = readDesktopEntryText_(entry, ['email', 'accountEmail', '계정 이메일']);
  const dutyText = readDesktopEntryText_(entry, ['dutyText', 'roleText', 'workText', 'activityText', '담당업무', '활동내용']);
  return {
    id: buildDesktopPersonId_(sourceKind, name),
    kind: sourceKind,
    name: name,
    role: role,
    category: category,
    status: status,
    startedAt: startedAt,
    endedAt: endedAt,
    email: email,
    dutyText: dutyText,
  };
}

function mergeDesktopPerson_(target, source) {
  if (!target) return source;
  const next = Object.assign({}, target);
  ['role', 'category', 'status', 'email', 'dutyText'].forEach(function(key) {
    if (!next[key] && source[key]) next[key] = source[key];
  });
  if (source.startedAt && (!next.startedAt || source.startedAt < next.startedAt)) {
    next.startedAt = source.startedAt;
  }
  if (source.endedAt && (!next.endedAt || source.endedAt > next.endedAt)) {
    next.endedAt = source.endedAt;
  }
  return next;
}

function collectDesktopPeopleForYear_(year, peopleById) {
  if (typeof getStaffRosterBundleByYear_ !== 'function') return;
  const bundle = getStaffRosterBundleByYear_(year);
  const staffEntries = bundle && bundle.staffInfo && bundle.staffInfo.entries || [];
  const nonStaffEntries = bundle && bundle.nonStaffInfo && bundle.nonStaffInfo.entries || [];
  staffEntries.forEach(function(entry) {
    const person = mapDesktopRosterEntry_(entry, 'staff');
    if (person) peopleById[person.id] = mergeDesktopPerson_(peopleById[person.id], person);
  });
  nonStaffEntries.forEach(function(entry) {
    const person = mapDesktopRosterEntry_(entry, 'nonStaff');
    if (person) peopleById[person.id] = mergeDesktopPerson_(peopleById[person.id], person);
  });
}

function collectDesktopStaffAttendanceForYear_(year) {
  if (typeof getStaffAttendanceDbRows_ !== 'function') return [];
  return getStaffAttendanceDbRows_(year, false).map(function(row) {
    const sourceType = String(row.sourceType || '').toLowerCase();
    const personKind = sourceType === 'nonstaff' || sourceType === 'non_staff' ? 'nonStaff' : 'staff';
    const personId = buildDesktopPersonId_(personKind, row.name);
    const statusText = valueOrEmpty_(row.status).trim();
    const status = statusText.indexOf('연') !== -1 ? 'leave'
      : statusText.indexOf('공') !== -1 ? 'official'
      : statusText.indexOf('대체') !== -1 ? 'substitute'
      : statusText.indexOf('결') !== -1 ? 'absent'
      : 'present';
    return {
      id: row.id || ('attendance-' + personId + '-' + row.date),
      personId: personId,
      personKind: personKind,
      date: row.date,
      yearMonth: row.yearMonth || String(row.date || '').slice(0, 7),
      status: status,
      memo: row.memo || '',
      syncedAt: row.updatedAt || '',
    };
  });
}

function collectDesktopJournalsForYear_(year) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logDataResult = resolveLogDataSheet_(spreadsheet, year);
  const logSheet = logDataResult && logDataResult.sheet;
  if (!logSheet) return [];
  const fieldMap = getFieldMap_(logSheet);
  const lastRow = logSheet.getLastRow();
  if (lastRow < LOG_PRINT_CONFIG.DATA_START_ROW) return [];
  const columnCount = Math.max(logSheet.getLastColumn(), getRequiredColumnCount_(fieldMap));
  const rows = getSheetValuesWithPadding_(
    logSheet,
    LOG_PRINT_CONFIG.DATA_START_ROW,
    lastRow - LOG_PRINT_CONFIG.DATA_START_ROW + 1,
    columnCount
  );
  return rows.map(function(row) {
    const date = normalizeDateKey_(getOptionalRowFieldValue_(row, fieldMap, 'DATE') || row[fieldMap.DATE]);
    if (!date) return null;
    return {
      id: 'journal-' + date,
      date: date,
      operatingHours: valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'OPERATING_HOURS')).trim(),
      manager: valueOrEmpty_(getOptionalRowFieldValue_(row, fieldMap, 'MANAGER')).trim(),
      capacity: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_CAPACITY')),
      enrolled: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_CURRENT')),
      presentChildren: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_PRESENT')),
      absentChildren: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'ATTENDANCE_ABSENT')),
      staffCount: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_WORKER')),
      teacherCount: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_TEACHER')),
      publicServiceCount: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_PUBLIC')),
      otherVisitorCount: toNumber_(getOptionalRowFieldValue_(row, fieldMap, 'STAFF_OTHER')),
      workText: getWorksValues_(row, fieldMap).filter(Boolean).join('\n'),
      syncStatus: 'synced',
    };
  }).filter(function(item) { return !!item; });
}

function normalizeDesktopChildListHeader_(value) {
  return valueOrEmpty_(value)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function findDesktopChildHeaderRow_(values) {
  for (let rowIndex = 0; rowIndex < Math.min(values.length, 8); rowIndex += 1) {
    const headers = values[rowIndex].map(normalizeDesktopChildListHeader_);
    if (headers.indexOf('이름') > -1 && headers.indexOf('성별') > -1) {
      return rowIndex;
    }
  }
  return -1;
}

function buildDesktopChildHeaderMap_(headers) {
  const normalizedHeaders = headers.map(normalizeDesktopChildListHeader_);
  const used = {};

  function findExact(labels) {
    for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
      const label = labels[labelIndex];
      for (let index = 0; index < normalizedHeaders.length; index += 1) {
        if (used[index]) continue;
        if (normalizedHeaders[index] === label) {
          used[index] = true;
          return index;
        }
      }
    }
    return -1;
  }

  function findAny(labels, options) {
    const minIndex = options && options.minIndex !== undefined ? options.minIndex : 0;
    for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
      const label = labels[labelIndex];
      for (let index = minIndex; index < normalizedHeaders.length; index += 1) {
        if (used[index]) continue;
        if (normalizedHeaders[index] === label || normalizedHeaders[index].indexOf(label) > -1) {
          used[index] = true;
          return index;
        }
      }
    }
    return -1;
  }

  const map = {
    number: findExact(['번호', '순번']),
    name: findAny(['이름', '성명']),
    gender: findAny(['성별']),
    phone: findAny(['휴대폰', '전화번호']),
    residentNo: findAny(['주민번호', '주민등록번호']),
    birthDate: findAny(['생년월일', '생일']),
    age: findAny(['연령', '나이']),
    school: findAny(['학교']),
    grade: findAny(['학년']),
    joinedAt: findAny(['입소일', '입소일자', '시작일']),
    address: findAny(['주소']),
    useType: findAny(['이용유형', '이용형태']),
    incomeLevel: findAny(['기준중위소득', '중위소득']),
    guardianName: findAny(['보호자성명', '보호자']),
    guardianRelation: findAny(['보호자관계', '관계']),
    familyType: findAny(['유형']),
    guardianContact: -1,
    memo: findAny(['비고', '특이사항']),
    manager: findAny(['담당자']),
    kidsId: findAny(['키즈콜ID', '키즈ID', '키즈아이디', 'KIDSID']),
    leftAt: findAny(['퇴소일', '종료일']),
    status: findAny(['상태'])
  };

  map.guardianContact = findAny(['연락처', '보호자연락처'], { minIndex: Math.max(map.familyType + 1, 0) });
  return map;
}

function getDesktopChildCell_(row, index) {
  return index >= 0 ? valueOrEmpty_(row[index]).trim() : '';
}

function cleanDesktopChildText_(value) {
  const text = valueOrEmpty_(value).trim();
  return text === '-' || text === 'FALSE' || text === 'false' ? '' : text;
}

function isDesktopChildDataRow_(row, map) {
  const name = getDesktopChildCell_(row, map.name);
  if (!name) return false;
  const normalizedName = normalizeSearchKeyword_(name);
  if (normalizedName === '이름' || normalizedName === '대기아동' || normalizedName === '퇴소자아동') {
    return false;
  }
  if (map.number >= 0) {
    const numberText = getDesktopChildCell_(row, map.number);
    if (numberText && !/^\d+$/.test(numberText)) {
      return false;
    }
  }
  return true;
}

function mapDesktopChildListRow_(row, map, sheetName) {
  const name = getDesktopChildCell_(row, map.name);
  const statusFromSheet = sheetName === LOG_PRINT_CONFIG.EXITED_CHILD_LIST_SHEET_NAME ? '퇴소' : '재원';
  const explicitStatus = getDesktopChildCell_(row, map.status);
  const child = {
    id: buildDesktopChildId_(name),
    name: name,
    gender: normalizeGender_(getDesktopChildCell_(row, map.gender)),
    phone: cleanDesktopChildText_(getDesktopChildCell_(row, map.phone)),
    residentNo: cleanDesktopChildText_(getDesktopChildCell_(row, map.residentNo)),
    birthDate: normalizeDateKey_(getDesktopChildCell_(row, map.birthDate)),
    age: cleanDesktopChildText_(getDesktopChildCell_(row, map.age)),
    school: cleanDesktopChildText_(getDesktopChildCell_(row, map.school)),
    grade: cleanDesktopChildText_(getDesktopChildCell_(row, map.grade)),
    address: cleanDesktopChildText_(getDesktopChildCell_(row, map.address)),
    useType: cleanDesktopChildText_(getDesktopChildCell_(row, map.useType)),
    incomeLevel: cleanDesktopChildText_(getDesktopChildCell_(row, map.incomeLevel)),
    guardianName: cleanDesktopChildText_(getDesktopChildCell_(row, map.guardianName)),
    guardianRelation: cleanDesktopChildText_(getDesktopChildCell_(row, map.guardianRelation)),
    familyType: cleanDesktopChildText_(getDesktopChildCell_(row, map.familyType)),
    guardianContact: cleanDesktopChildText_(getDesktopChildCell_(row, map.guardianContact)),
    vulnerableType: cleanDesktopChildText_(getDesktopChildCell_(row, map.useType)),
    status: explicitStatus || statusFromSheet,
    joinedAt: normalizeDateKey_(getDesktopChildCell_(row, map.joinedAt)),
    leftAt: normalizeDateKey_(getDesktopChildCell_(row, map.leftAt)),
    manager: cleanDesktopChildText_(getDesktopChildCell_(row, map.manager)),
    kidsId: cleanDesktopChildText_(getDesktopChildCell_(row, map.kidsId)),
    memo: cleanDesktopChildText_(getDesktopChildCell_(row, map.memo)),
  };
  if (child.kidsId === '퇴소' || child.kidsId === '대기') {
    child.kidsId = '';
  }
  if (child.leftAt && !explicitStatus) {
    child.status = '퇴소';
  }
  return child;
}

function getDesktopChildFillScore_(child) {
  return [
    'gender', 'phone', 'residentNo', 'birthDate', 'age', 'school', 'grade', 'address',
    'useType', 'incomeLevel', 'guardianName', 'guardianRelation', 'familyType',
    'guardianContact', 'vulnerableType', 'joinedAt', 'leftAt', 'manager', 'kidsId', 'memo'
  ].reduce(function(score, key) {
    return score + (valueOrEmpty_(child && child[key]).trim() ? 1 : 0);
  }, 0);
}

function mergeDesktopChild_(target, source) {
  if (!target) return source;
  const sourceIsRicher = getDesktopChildFillScore_(source) > getDesktopChildFillScore_(target);
  const next = Object.assign({}, sourceIsRicher ? source : target);
  const other = sourceIsRicher ? target : source;

  [
    'gender', 'phone', 'residentNo', 'birthDate', 'age', 'school', 'grade', 'address',
    'useType', 'incomeLevel', 'guardianName', 'guardianRelation', 'familyType',
    'guardianContact', 'vulnerableType', 'manager', 'kidsId', 'memo'
  ].forEach(function(key) {
    if (!next[key] && other[key]) next[key] = other[key];
  });

  if (source.joinedAt && (!next.joinedAt || source.joinedAt < next.joinedAt)) {
    next.joinedAt = source.joinedAt;
  }
  if (target.status === '재원' && getDesktopChildFillScore_(target) > 6) {
    next.status = '재원';
    next.leftAt = '';
  } else if (source.status === '재원' && getDesktopChildFillScore_(source) > 6) {
    next.status = '재원';
    next.leftAt = '';
  } else if (target.status === '퇴소' || source.status === '퇴소') {
    next.status = '퇴소';
    next.leftAt = source.leftAt || target.leftAt || next.leftAt || '';
  } else if (target.status === '대기' || source.status === '대기') {
    next.status = '대기';
    next.leftAt = '';
  } else {
    next.status = next.status || source.status || target.status || '재원';
    next.leftAt = source.leftAt || target.leftAt || next.leftAt || '';
  }
  next.id = buildDesktopChildId_(next.name);
  return next;
}

function addDesktopChild_(childrenByKey, child) {
  const key = getDesktopChildKey_(child);
  if (!key) return;
  childrenByKey[key] = mergeDesktopChild_(childrenByKey[key], child);
}

function collectDesktopChildrenFromListSheets_(spreadsheet, years, childrenByKey) {
  [
    LOG_PRINT_CONFIG.CHILD_LIST_SHEET_NAME,
    LOG_PRINT_CONFIG.EXITED_CHILD_LIST_SHEET_NAME
  ].forEach(function(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 2) return;
    const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
    let currentStatus = sheetName === LOG_PRINT_CONFIG.EXITED_CHILD_LIST_SHEET_NAME ? '대기' : '재원';
    let currentMap = null;

    values.forEach(function(row) {
      const firstCell = normalizeSearchKeyword_(row[0]);
      if (firstCell === '대기아동') {
        currentStatus = '대기';
        currentMap = null;
        return;
      }
      if (firstCell === '퇴소자아동') {
        currentStatus = '퇴소';
        currentMap = null;
        return;
      }

      const headers = row.map(normalizeDesktopChildListHeader_);
      if (headers.indexOf('이름') > -1 && headers.indexOf('성별') > -1) {
        currentMap = buildDesktopChildHeaderMap_(row);
        return;
      }
      if (!currentMap || !isDesktopChildDataRow_(row, currentMap)) return;

      const child = mapDesktopChildListRow_(row, currentMap, sheetName);
      child.status = currentStatus;
      if (currentStatus === '대기') {
        child.leftAt = '';
      }
      addDesktopChild_(childrenByKey, child);
    });
  });

  Object.keys(childrenByKey).forEach(function(key) {
    const child = childrenByKey[key];
    if (!child.age && child.birthDate && years && years.length) {
      child.age = calculateChildAgeByYear_(child.birthDate, Math.max.apply(null, years));
    }
  });
}

function mapDesktopChildAttendanceStatus_(statusText) {
  const text = valueOrEmpty_(statusText).trim();
  if (text === '공결') return 'official';
  if (text === '대체출석') return 'substitute';
  if (text === '결석') return 'absent';
  if (text === '출석') return 'present';
  return 'other';
}

function collectDesktopChildAttendanceForYear_(spreadsheet, year, childrenByKey) {
  const sourceResult = getAttendanceSourceSheetByYear_(spreadsheet, year);
  const sourceSheet = sourceResult && sourceResult.sheet;
  if (!sourceSheet) return [];

  const childLookup = buildCombinedChildLookup_(spreadsheet, year);
  const rows = buildAttendanceNormalizedRows_(sourceSheet);
  const attendance = [];

  rows.forEach(function(row, index) {
    const date = normalizeDateKey_(row[0]);
    const name = valueOrEmpty_(row[1]).trim();
    const school = valueOrEmpty_(row[2]).trim();
    const statusText = valueOrEmpty_(row[4]).trim();
    if (!date || !name || !statusText) return;

    const matchedChild = findChildRecord_(childLookup, name, school) || {};
    const child = {
      id: buildDesktopChildId_(name),
      name: name,
      gender: matchedChild.gender || '',
      birthDate: normalizeDateKey_(matchedChild.birthDate || ''),
      age: matchedChild.age || '',
      school: matchedChild.school || school,
      grade: matchedChild.grade || valueOrEmpty_(row[3]).trim(),
      vulnerableType: '',
      status: '재원',
      joinedAt: date,
      leftAt: '',
    };
    addDesktopChild_(childrenByKey, child);

    const childId = buildDesktopChildId_(name);
    attendance.push({
      id: 'child-attendance-' + childId + '-' + date + '-' + index,
      childId: childId,
      date: date,
      yearMonth: date.slice(0, 7),
      status: mapDesktopChildAttendanceStatus_(statusText),
      memo: valueOrEmpty_(row[5]).trim() || valueOrEmpty_(row[6]).trim(),
      syncedAt: '',
    });
  });

  return attendance;
}

function collectDesktopChildrenAndAttendance_(years) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const childrenByKey = {};
  let childAttendance = [];

  collectDesktopChildrenFromListSheets_(spreadsheet, years, childrenByKey);
  years.forEach(function(year) {
    childAttendance = childAttendance.concat(collectDesktopChildAttendanceForYear_(spreadsheet, year, childrenByKey));
  });

  const childIdByKey = {};
  const children = Object.keys(childrenByKey)
    .sort()
    .map(function(key) {
      const child = childrenByKey[key];
      child.id = buildDesktopChildId_(child.name);
      childIdByKey[key] = child.id;
      return child;
    });

  const seenAttendance = {};
  childAttendance = childAttendance.filter(function(item) {
    const key = item.childId + '|' + item.date;
    if (seenAttendance[key]) return false;
    seenAttendance[key] = true;
    item.id = 'child-attendance-' + item.childId + '-' + item.date;
    return true;
  });

  return {
    children: children,
    childAttendance: childAttendance,
  };
}

function inspectDesktopChildListExport_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const result = {
    ok: true,
    sheets: spreadsheet.getSheets().map(function(sheet) { return sheet.getName(); }).filter(function(name) {
      return String(name || '').indexOf('아동') > -1 || String(name || '').indexOf('출석부') > -1;
    }),
    childSheets: [],
  };

  [
    LOG_PRINT_CONFIG.CHILD_LIST_SHEET_NAME,
    LOG_PRINT_CONFIG.EXITED_CHILD_LIST_SHEET_NAME
  ].forEach(function(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      result.childSheets.push({ sheetName: sheetName, exists: false });
      return;
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const values = lastRow && lastColumn
      ? sheet.getRange(1, 1, Math.min(lastRow, 8), lastColumn).getDisplayValues()
      : [];
    const headerRow = findDesktopChildHeaderRow_(values);
    const map = headerRow >= 0 ? buildDesktopChildHeaderMap_(values[headerRow]) : {};
    let dataCount = 0;
    let firstData = null;
    if (headerRow >= 0 && lastRow > headerRow + 1) {
      const rows = sheet.getRange(headerRow + 2, 1, lastRow - headerRow - 1, lastColumn).getDisplayValues();
      rows.forEach(function(row) {
        if (isDesktopChildDataRow_(row, map)) {
          dataCount += 1;
          if (!firstData) {
            firstData = mapDesktopChildListRow_(row, map, sheetName);
          }
        }
      });
    }

    result.childSheets.push({
      sheetName: sheetName,
      exists: true,
      lastRow: lastRow,
      lastColumn: lastColumn,
      sampleRows: values,
      headerRow: headerRow + 1,
      headerMap: map,
      dataCount: dataCount,
      firstData: firstData,
    });
  });

  return result;
}

function buildDesktopBootstrapExport_(e) {
  const params = e && e.parameter || {};
  const years = parseDesktopExportYears_(params.years);
  const peopleById = {};
  let attendance = [];
  let journals = [];
  const childPayload = collectDesktopChildrenAndAttendance_(years);

  years.forEach(function(year) {
    collectDesktopPeopleForYear_(year, peopleById);
    attendance = attendance.concat(collectDesktopStaffAttendanceForYear_(year));
    journals = journals.concat(collectDesktopJournalsForYear_(year));
  });

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    service: 'seochang-desktop-export',
    exportedAt: new Date().toISOString(),
    sourceSpreadsheetId: spreadsheet.getId(),
    sourceSpreadsheetUrl: params.spreadsheetUrl || spreadsheet.getUrl(),
    years: years,
    people: Object.keys(peopleById).map(function(key) { return peopleById[key]; }),
    attendance: attendance,
    children: childPayload.children,
    childAttendance: childPayload.childAttendance,
    journals: journals,
  };
}
