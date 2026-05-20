const HOP_HWPX_MIME_TYPE = 'application/hwp+zip';
const HOP_WEB_EDITOR_URL_PROPERTY = 'HOP_WEB_EDITOR_URL';
const HOP_WEB_EDITOR_DEFAULT_URL = 'https://kingwabg.github.io/sc/';

function exportLogsAsHopHwpx(dates, selectedYear) {
  const bundle = buildHopHwpxExportBundle_(dates, selectedYear);
  const file = DriveApp.createFile(bundle.blob);
  const urls = buildTemplatePreviewPdfFileUrls_(file.getId());

  return {
    fileId: file.getId(),
    fileName: bundle.fileName,
    reportCount: bundle.reports.length,
    selectedYear: bundle.selectedYear,
    url: urls.downloadUrl,
    openUrl: file.getUrl(),
    downloadUrl: urls.downloadUrl,
    note: 'HOP은 데스크톱 앱이므로 생성된 .hwpx 파일을 다운로드한 뒤 HOP에서 열어주세요.',
  };
}

function buildHopHwpxExportBundle_(dates, selectedYear) {
  const resolved = resolveLogDataRowNumbersByDates_(dates, selectedYear);
  const payload = buildTemplateDrivenPreviewPayload_(resolved.rowNumbers, resolved.year, false);
  const reports = payload.reports || [];

  if (!reports.length) {
    throw new Error('HOP용 한글 파일로 만들 일지데이터가 없습니다.');
  }

  const fileName = buildHopHwpxFileName_(reports, payload.selectedYear || resolved.year);
  const blob = buildHopHwpxBlob_(reports, payload.selectedYear || resolved.year, fileName);
  return {
    blob: blob,
    fileName: fileName,
    reports: reports,
    selectedYear: payload.selectedYear || resolved.year,
  };
}

function exportLogsForHopWeb(dates, selectedYear) {
  const bundle = buildHopHwpxExportBundle_(dates, selectedYear);
  const file = DriveApp.createFile(bundle.blob);
  const urls = buildTemplatePreviewPdfFileUrls_(file.getId());
  const exportResult = {
    fileId: file.getId(),
    fileName: bundle.fileName,
    reportCount: bundle.reports.length,
    selectedYear: bundle.selectedYear,
    url: urls.downloadUrl,
    openUrl: file.getUrl(),
    downloadUrl: urls.downloadUrl,
    transferSource: 'postMessage',
    inlineBase64: Utilities.base64Encode(bundle.blob.getBytes()),
    inlineMimeType: HOP_HWPX_MIME_TYPE,
  };
  const editorUrl = getHopWebEditorUrl_();

  if (!editorUrl) {
    return Object.assign({}, exportResult, {
      configured: false,
      launchUrl: '',
      message: 'HOP Web 연결 주소가 아직 설정되지 않았습니다. HOP 웹 에디션 배포 후 운영일지 > HOP Web 연결 설정에서 주소를 저장해주세요.',
    });
  }

  return Object.assign({}, exportResult, {
    configured: true,
    launchUrl: buildHopWebLaunchUrl_(editorUrl, exportResult),
    message: 'HOP Web으로 열 준비가 완료되었습니다.',
  });
}

function getHopWebEditorConfig() {
  const storedUrl = String(PropertiesService.getScriptProperties().getProperty(HOP_WEB_EDITOR_URL_PROPERTY) || '').trim();
  const editorUrl = getHopWebEditorUrl_();
  const storedUrlIgnored = !!storedUrl && isLegacyHopWebEditorUrl_(storedUrl);
  return {
    configured: !!editorUrl,
    url: editorUrl,
    usingDefault: !storedUrl || storedUrlIgnored,
    storedUrl: storedUrl,
    storedUrlIgnored: storedUrlIgnored,
    defaultUrl: HOP_WEB_EDITOR_DEFAULT_URL,
    propertyKey: HOP_WEB_EDITOR_URL_PROPERTY,
  };
}

function setHopWebEditorUrl(url) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    PropertiesService.getScriptProperties().deleteProperty(HOP_WEB_EDITOR_URL_PROPERTY);
    return getHopWebEditorConfig();
  }

  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('HOP Web 주소는 http:// 또는 https:// 로 시작해야 합니다.');
  }

  PropertiesService.getScriptProperties().setProperty(HOP_WEB_EDITOR_URL_PROPERTY, normalizedUrl);
  return getHopWebEditorConfig();
}

function setHopWebEditorUrlToLocalPreview() {
  return setHopWebEditorUrl('http://127.0.0.1:7701/');
}

function setHopWebEditorUrlToSeochangHop() {
  return setHopWebEditorUrl(HOP_WEB_EDITOR_DEFAULT_URL);
}

function promptHopWebEditorUrl() {
  const ui = SpreadsheetApp.getUi();
  const currentUrl = getHopWebEditorUrl_();
  const response = ui.prompt(
    'HOP Web 연결 설정',
    [
      'HOP 웹 에디션 배포 주소를 입력해주세요.',
      '비워두면 서창 HOP 웹 주소를 기본값으로 사용합니다.',
      '예: ' + HOP_WEB_EDITOR_DEFAULT_URL,
      '',
      '현재 주소: ' + (currentUrl || '(설정 안 됨)'),
      '빈 값으로 확인하면 사용자 설정을 삭제하고 기본 공개 주소로 돌아갑니다.',
    ].join('\n'),
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert('HOP Web 주소 설정을 취소했습니다.');
    return;
  }

  const result = setHopWebEditorUrl(response.getResponseText());
  ui.alert(result.usingDefault ? 'HOP Web 연결 주소를 기본 공개 주소로 되돌렸습니다:\n' + result.url : 'HOP Web 연결 주소를 저장했습니다:\n' + result.url);
}

function showHopWebEditorConfigStatus() {
  const ui = SpreadsheetApp.getUi();
  const config = getHopWebEditorConfig();
  ui.alert([
    'HOP Web 상태',
    '',
    '설정 여부: ' + (config.configured ? '설정됨' : '설정 안 됨'),
    '주소: ' + (config.url || '-'),
    '기본 주소 사용: ' + (config.usingDefault ? '예' : '아니오'),
    '',
    config.configured
      ? '통계보기에서 날짜 선택 후 HOP Web 버튼으로 연결할 수 있습니다.'
      : '운영일지 > HOP Web 연결 설정에서 웹 에디션 주소를 먼저 저장해주세요.',
  ].join('\n'));
}

function getHopWebEditorUrl_() {
  const storedUrl = String(PropertiesService.getScriptProperties().getProperty(HOP_WEB_EDITOR_URL_PROPERTY) || '').trim();
  if (storedUrl && !isLegacyHopWebEditorUrl_(storedUrl)) {
    return storedUrl;
  }
  return HOP_WEB_EDITOR_DEFAULT_URL;
}

function isLegacyHopWebEditorUrl_(url) {
  const normalized = String(url || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.indexOf('edwardkim.github.io/rhwp') !== -1
    || normalized.indexOf('cdn.jsdelivr.net/gh/kingwabg/sc@gh-pages') !== -1
    || normalized.indexOf('127.0.0.1') !== -1
    || normalized.indexOf('localhost') !== -1;
}

function buildHopWebLaunchUrl_(editorUrl, exportResult) {
  const base = String(editorUrl || '').trim();
  const separator = base.indexOf('?') === -1 ? '?' : '&';
  const params = {
    mode: 'open',
    source: exportResult.transferSource || 'drive',
    fileId: exportResult.fileId || '',
    fileName: exportResult.fileName || '',
    downloadUrl: exportResult.downloadUrl || exportResult.url || '',
    openUrl: exportResult.openUrl || '',
  };
  const query = Object.keys(params).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  return base + separator + query;
}

function buildHopHwpxBlob_(reports, selectedYear, fileName) {
  const paragraphs = buildHopHwpxParagraphs_(reports, selectedYear);
  const previewText = paragraphs.join('\n');
  const sectionXml = buildHopHwpxTemplateSectionXml_(reports, selectedYear);
  const blobs = [
    hopHwpxTextBlob_('application/hwp+zip', 'mimetype', HOP_HWPX_MIME_TYPE),
    hopHwpxTextBlob_('text/xml', 'version.xml', buildHopHwpxVersionXml_()),
    hopHwpxTextBlob_('text/xml', 'settings.xml', buildHopHwpxSettingsXml_()),
    hopHwpxTextBlob_('text/xml', 'META-INF/manifest.xml', buildHopHwpxManifestXml_()),
    hopHwpxTextBlob_('text/xml', 'META-INF/container.xml', buildHopHwpxContainerXml_()),
    hopHwpxTextBlob_('text/xml', 'META-INF/container.rdf', buildHopHwpxContainerRdf_()),
    hopHwpxTextBlob_('text/xml', 'Contents/content.hpf', buildHopHwpxContentHpf_(fileName)),
    hopHwpxTextBlob_('text/xml', 'Contents/header.xml', buildHopHwpxHeaderXml_()),
    hopHwpxTextBlob_('text/xml', 'Contents/section0.xml', sectionXml),
    hopHwpxTextBlob_('text/plain', 'Preview/PrvText.txt', previewText),
    hopHwpxTextBlob_('text/javascript', 'Scripts/headerScripts.js', ''),
    hopHwpxTextBlob_('text/javascript', 'Scripts/sourceScripts.js', ''),
  ];

  return Utilities.zip(blobs, fileName).setContentType(HOP_HWPX_MIME_TYPE).setName(fileName);
}

function buildHopHwpxParagraphs_(reports, selectedYear) {
  const lines = [];
  const yearLabel = selectedYear ? selectedYear + '년' : '';

  hopHwpxPushLine_(lines, '운영일지');
  hopHwpxPushLine_(lines, yearLabel + ' HOP 한글 내보내기');
  hopHwpxPushLine_(lines, '생성일: ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'));

  reports.forEach(function(report, index) {
    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '────────────────────────');
    hopHwpxPushLine_(lines, (index + 1) + '. ' + hopHwpxText_(report.date) + ' 운영일지');
    hopHwpxPushLine_(lines, '────────────────────────');
    hopHwpxPushLine_(lines, '운영시간: ' + hopHwpxDash_(report.operatingHours));
    hopHwpxPushLine_(lines, '담당자: ' + hopHwpxDash_(report.manager));

    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '[출석 분석]');
    hopHwpxPushLine_(lines, '정원: ' + hopHwpxNum_(report.attendanceCapacity) + ' / 현원: ' + hopHwpxNum_(report.attendanceCurrent));
    hopHwpxPushLine_(lines, '출석: ' + hopHwpxNum_(report.attendancePresent) + ' / 결석: ' + hopHwpxNum_(report.attendanceAbsent) + ' / 공결: ' + hopHwpxNum_(report.attendanceOfficial));
    hopHwpxPushLine_(lines, '교육: ' + hopHwpxNum_(report.attendanceAlternative) + ' / 기타: ' + hopHwpxNum_(report.attendanceOther));
    hopHwpxPushLine_(lines, '급식: 조식 ' + hopHwpxNum_(report.mealBreakfast) + ' / 중식 ' + hopHwpxNum_(report.mealLunch) + ' / 석식 ' + hopHwpxNum_(report.mealDinner));

    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '[아동 현황]');
    hopHwpxPushLine_(lines, '남아: ' + hopHwpxJoinNumbers_(report.maleCounts) + ' / 합계 ' + hopHwpxSum_(report.maleCounts));
    hopHwpxPushLine_(lines, '여아: ' + hopHwpxJoinNumbers_(report.femaleCounts) + ' / 합계 ' + hopHwpxSum_(report.femaleCounts));
    hopHwpxPushMultiline_(lines, '변동사항', report.childChanges);

    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '[종사자 현황]');
    hopHwpxPushLine_(lines, '종사자: ' + hopHwpxNum_(report.staffWorker) + ' / 교사: ' + hopHwpxNum_(report.staffTeacher) + ' / 공익: ' + hopHwpxNum_(report.staffPublic) + ' / 기타: ' + hopHwpxNum_(report.staffOther));
    hopHwpxPushMultiline_(lines, '종사자 변동', report.staffChanges);

    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '[업무 내용]');
    const works = Array.isArray(report.works) ? report.works : [];
    if (works.length) {
      works.forEach(function(work, workIndex) {
        hopHwpxPushLine_(lines, (workIndex + 1) + ') ' + hopHwpxDash_(work));
      });
    } else {
      hopHwpxPushLine_(lines, '-');
    }

    hopHwpxPushLine_(lines, '');
    hopHwpxPushMultiline_(lines, '기타', report.miscNotes);

    hopHwpxPushLine_(lines, '');
    hopHwpxPushLine_(lines, '[프로그램]');
    const programItems = Array.isArray(report.programItems) ? report.programItems : [];
    if (programItems.length) {
      programItems.forEach(function(item, programIndex) {
        hopHwpxPushLine_(lines, (programIndex + 1) + ') ' + hopHwpxDash_(item && item.title));
        hopHwpxPushLine_(lines, '참석자: ' + hopHwpxDash_(item && item.participants));
      });
    } else if (Array.isArray(report.programTexts) && report.programTexts.length) {
      report.programTexts.forEach(function(text) {
        hopHwpxPushMultiline_(lines, '프로그램', text);
      });
    } else {
      hopHwpxPushLine_(lines, '-');
    }

    if (Array.isArray(report.approvalSlots) && report.approvalSlots.length) {
      hopHwpxPushLine_(lines, '');
      hopHwpxPushLine_(lines, '[결재]');
      report.approvalSlots.forEach(function(slot) {
        hopHwpxPushLine_(lines, hopHwpxDash_(slot && slot.label) + ': ' + hopHwpxDash_(slot && slot.name));
      });
    }
  });

  return lines;
}

function buildHopHwpxFileName_(reports, selectedYear) {
  const dates = (reports || []).map(function(report) {
    return hopHwpxSafeFilePart_(report && report.date);
  }).filter(Boolean);
  const first = dates[0] || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  const last = dates.length > 1 ? dates[dates.length - 1] : '';
  const range = last && last !== first ? first + '-' + last : first;
  return '운영일지_HOP_' + (selectedYear || '') + '_' + range + '.hwpx';
}

function hopHwpxSafeFilePart_(value) {
  return String(value || '').replace(/[^0-9A-Za-z가-힣_-]/g, '');
}

function hopHwpxTextBlob_(mimeType, name, text) {
  return Utilities.newBlob(String(text || ''), mimeType, name);
}

function hopHwpxText_(value) {
  return String(value == null ? '' : value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
}

function hopHwpxDash_(value) {
  const text = hopHwpxText_(value);
  return text || '-';
}

function hopHwpxNum_(value) {
  const number = Number(value || 0);
  return isNaN(number) ? '0' : String(number);
}

function hopHwpxSum_(values) {
  return String((Array.isArray(values) ? values : []).reduce(function(total, value) {
    const number = Number(value || 0);
    return total + (isNaN(number) ? 0 : number);
  }, 0));
}

function hopHwpxJoinNumbers_(values) {
  const numbers = (Array.isArray(values) ? values : []).map(function(value) {
    return hopHwpxNum_(value);
  });
  return numbers.length ? numbers.join(', ') : '-';
}

function hopHwpxPushLine_(lines, value) {
  lines.push(hopHwpxText_(value));
}

function hopHwpxPushMultiline_(lines, label, value) {
  const text = hopHwpxText_(value);
  if (!text) {
    hopHwpxPushLine_(lines, label + ': -');
    return;
  }

  const split = text.split(/\n+/).map(function(line) {
    return hopHwpxText_(line);
  }).filter(Boolean);

  if (!split.length) {
    hopHwpxPushLine_(lines, label + ': -');
    return;
  }

  hopHwpxPushLine_(lines, label + ': ' + split[0]);
  split.slice(1).forEach(function(line) {
    hopHwpxPushLine_(lines, '  ' + line);
  });
}

function hopHwpxXmlEscape_(value) {
  return hopHwpxText_(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildHopHwpxTemplateSectionXml_(reports, selectedYear) {
  const parts = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">',
  ];
  let paraId = 0;
  let tableId = 1;

  parts.push(hopHwpxSectionStartParagraphXml_(paraId++));

  (reports || []).forEach(function(report, reportIndex) {
    if (reportIndex > 0) {
      parts.push(hopHwpxPageBreakParagraphXml_(paraId++));
    }

    const title = hopHwpxText_(report && report.date) + ' 운영일지';
    parts.push(hopHwpxParagraphXml_(title || '운영일지', paraId++, '1'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxTitleTable_(report), paraId++, tableId++));
    parts.push(hopHwpxParagraphXml_('운영 개요', paraId++, '2'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxOverviewTable_(report), paraId++, tableId++));
    parts.push(hopHwpxParagraphXml_('아동 현황', paraId++, '2'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxChildTable_(report), paraId++, tableId++));
    parts.push(hopHwpxParagraphXml_('종사자 현황', paraId++, '2'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxStaffTable_(report), paraId++, tableId++));
    parts.push(hopHwpxParagraphXml_('업무 내용', paraId++, '2'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxWorkTable_(report), paraId++, tableId++));
    parts.push(hopHwpxParagraphXml_('기타', paraId++, '2'));
    parts.push(hopHwpxTableParagraphXml_(buildHopHwpxMemoTable_(report), paraId++, tableId++));

    const programTables = buildHopHwpxProgramTables_(report);
    parts.push(hopHwpxParagraphXml_('프로그램', paraId++, '2'));
    programTables.forEach(function(table) {
      parts.push(hopHwpxTableParagraphXml_(table, paraId++, tableId++));
    });
  });

  if (!reports || !reports.length) {
    parts.push(hopHwpxParagraphXml_((selectedYear || '') + ' 운영일지 데이터가 없습니다.', paraId++, '0'));
  }

  parts.push('</hs:sec>');
  return parts.join('');
}

function buildHopHwpxTitleTable_(report) {
  const slots = Array.isArray(report && report.approvalSlots) ? report.approvalSlots : [];
  const firstSlot = slots[0] || {};
  const secondSlot = slots[1] || {};
  return {
    colWidths: [6800, 8500, 8700, 4200, 7150, 7150],
    rows: [
      [
        hopHwpxCell_('운영일지', { colSpan: 3, charPrId: '1' }),
        hopHwpxLabelCell_('결재'),
        hopHwpxLabelCell_(firstSlot.label || '담당'),
        hopHwpxLabelCell_(secondSlot.label || '센터장'),
      ],
      [
        hopHwpxLabelCell_('일자'),
        hopHwpxCell_(hopHwpxDash_(report && report.date), { colSpan: 2 }),
        hopHwpxLabelCell_('확인'),
        hopHwpxCell_(firstSlot.name || ''),
        hopHwpxCell_(secondSlot.name || ''),
      ],
      [
        hopHwpxLabelCell_('운영시간'),
        hopHwpxCell_(hopHwpxDash_(report && report.operatingHours), { colSpan: 2 }),
        hopHwpxLabelCell_('담당자'),
        hopHwpxCell_(hopHwpxDash_(report && report.manager), { colSpan: 2 }),
      ],
    ],
  };
}

function buildHopHwpxOverviewTable_(report) {
  return {
    colWidths: [5200, 9200, 5200, 9200, 5200, 8520],
    rows: [
      [
        hopHwpxLabelCell_('정원'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendanceCapacity)),
        hopHwpxLabelCell_('현원'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendanceCurrent)),
        hopHwpxLabelCell_('출석'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendancePresent)),
      ],
      [
        hopHwpxLabelCell_('결석'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendanceAbsent)),
        hopHwpxLabelCell_('공결'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendanceOfficial)),
        hopHwpxLabelCell_('교육'),
        hopHwpxCell_(hopHwpxNum_(report && report.attendanceAlternative)),
      ],
      [
        hopHwpxLabelCell_('조식'),
        hopHwpxCell_(hopHwpxNum_(report && report.mealBreakfast)),
        hopHwpxLabelCell_('중식'),
        hopHwpxCell_(hopHwpxNum_(report && report.mealLunch)),
        hopHwpxLabelCell_('석식'),
        hopHwpxCell_(hopHwpxNum_(report && report.mealDinner)),
      ],
    ],
  };
}

function buildHopHwpxChildTable_(report) {
  const maleCounts = Array.isArray(report && report.maleCounts) ? report.maleCounts : [];
  const femaleCounts = Array.isArray(report && report.femaleCounts) ? report.femaleCounts : [];
  const maxCount = Math.max(maleCounts.length, femaleCounts.length, 1);
  const labels = ['탈학교', '초등', '중등', '고등', '기타'];
  const colWidths = [6200];
  for (let index = 0; index < maxCount; index++) {
    colWidths.push(Math.floor(28200 / maxCount));
  }
  colWidths.push(8120);

  const header = [hopHwpxLabelCell_('구분')];
  for (let labelIndex = 0; labelIndex < maxCount; labelIndex++) {
    header.push(hopHwpxLabelCell_(labels[labelIndex] || ('항목' + (labelIndex + 1))));
  }
  header.push(hopHwpxLabelCell_('합계'));

  return {
    colWidths: colWidths,
    rows: [
      header,
      buildHopHwpxCountRow_('남아', maleCounts, maxCount),
      buildHopHwpxCountRow_('여아', femaleCounts, maxCount),
      [
        hopHwpxLabelCell_('변동사항'),
        hopHwpxCell_(hopHwpxDash_(report && report.childChanges), { colSpan: maxCount + 1 }),
      ],
    ],
  };
}

function buildHopHwpxCountRow_(label, values, maxCount) {
  const row = [hopHwpxLabelCell_(label)];
  for (let index = 0; index < maxCount; index++) {
    row.push(hopHwpxCell_(hopHwpxNum_(values[index])));
  }
  row.push(hopHwpxCell_(hopHwpxSum_(values)));
  return row;
}

function buildHopHwpxStaffTable_(report) {
  return {
    colWidths: [6200, 6200, 6200, 6200, 6200, 11520],
    rows: [
      [
        hopHwpxLabelCell_('종사자'),
        hopHwpxCell_(hopHwpxNum_(report && report.staffWorker)),
        hopHwpxLabelCell_('교사'),
        hopHwpxCell_(hopHwpxNum_(report && report.staffTeacher)),
        hopHwpxLabelCell_('공익'),
        hopHwpxCell_(hopHwpxNum_(report && report.staffPublic)),
      ],
      [
        hopHwpxLabelCell_('기타'),
        hopHwpxCell_(hopHwpxNum_(report && report.staffOther)),
        hopHwpxLabelCell_('변동사항'),
        hopHwpxCell_(hopHwpxDash_(report && report.staffChanges), { colSpan: 3 }),
      ],
    ],
  };
}

function buildHopHwpxWorkTable_(report) {
  const works = Array.isArray(report && report.works) ? report.works : [];
  const rows = works.length ? works.map(function(work, index) {
    return [
      hopHwpxLabelCell_(String(index + 1)),
      hopHwpxCell_(hopHwpxDash_(work), { colSpan: 3 }),
    ];
  }) : [[hopHwpxLabelCell_('1'), hopHwpxCell_('-', { colSpan: 3 })]];

  return {
    colWidths: [5200, 12440, 12440, 12440],
    rows: rows,
  };
}

function buildHopHwpxMemoTable_(report) {
  return {
    colWidths: [7200, 35320],
    rows: [
      [
        hopHwpxLabelCell_('기타'),
        hopHwpxCell_(hopHwpxDash_(report && report.miscNotes)),
      ],
    ],
  };
}

function buildHopHwpxProgramTables_(report) {
  const programItems = Array.isArray(report && report.programItems) ? report.programItems : [];
  if (programItems.length) {
    return programItems.map(function(item, index) {
      return buildHopHwpxProgramTable_(index + 1, item && item.title, item && item.participants);
    });
  }

  const programTexts = Array.isArray(report && report.programTexts) ? report.programTexts : [];
  if (programTexts.length) {
    return programTexts.map(function(text, index) {
      return buildHopHwpxProgramTable_(index + 1, text, '');
    });
  }

  return [buildHopHwpxProgramTable_(1, '-', '-')];
}

function buildHopHwpxProgramTable_(index, title, participants) {
  return {
    colWidths: [7200, 14000, 7200, 14120],
    rows: [
      [
        hopHwpxLabelCell_('프로그램 ' + index),
        hopHwpxCell_(hopHwpxDash_(title)),
        hopHwpxLabelCell_('참석자 명단'),
        hopHwpxCell_(hopHwpxDash_(participants)),
      ],
    ],
  };
}

function hopHwpxLabelCell_(text, options) {
  const merged = Object.assign({}, options || {});
  merged.label = true;
  merged.charPrId = merged.charPrId || '2';
  return hopHwpxCell_(text, merged);
}

function hopHwpxCell_(text, options) {
  const opt = options || {};
  return {
    text: hopHwpxText_(text),
    colSpan: Math.max(1, Number(opt.colSpan || 1)),
    rowSpan: Math.max(1, Number(opt.rowSpan || 1)),
    label: !!opt.label,
    charPrId: opt.charPrId || '0',
  };
}

function hopHwpxParagraphXml_(text, paraId, charPrId) {
  return [
    '<hp:p id="' + paraId + '" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">',
    '<hp:run charPrIDRef="' + (charPrId || '0') + '"><hp:t>' + hopHwpxXmlEscape_(text || ' ') + '</hp:t></hp:run>',
    '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>',
    '</hp:p>',
  ].join('');
}

function hopHwpxSectionStartParagraphXml_(paraId) {
  return [
    '<hp:p id="' + paraId + '" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">',
    '<hp:run charPrIDRef="0">',
    '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">',
    '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>',
    '<hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>',
    '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>',
    '<hp:pagePr landscape="WIDELY" width="59528" height="84186" gutterType="LEFT_ONLY">',
    '<hp:margin header="4252" footer="4252" gutter="0" left="5668" right="5668" top="5668" bottom="4252"/>',
    '</hp:pagePr>',
    '<hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>',
    '</hp:secPr>',
    '</hp:run>',
    '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray>',
    '</hp:p>',
  ].join('');
}

function hopHwpxPageBreakParagraphXml_(paraId) {
  return [
    '<hp:p id="' + paraId + '" paraPrIDRef="0" styleIDRef="0" pageBreak="1" columnBreak="0" merged="0">',
    '<hp:run charPrIDRef="0"/>',
    '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="0" flags="393216"/></hp:linesegarray>',
    '</hp:p>',
  ].join('');
}

function hopHwpxTableParagraphXml_(table, paraId, tableId) {
  const rows = Array.isArray(table && table.rows) ? table.rows : [];
  const colWidths = hopHwpxNormalizeColWidths_(table && table.colWidths, 42520);
  const rowHeights = rows.map(function(row) {
    return hopHwpxEstimateRowHeight_(row, colWidths);
  });
  const tableHeight = rowHeights.reduce(function(total, height) {
    return total + height;
  }, 0);

  const rowXml = rows.map(function(row, rowIndex) {
    return hopHwpxTableRowXml_(row, rowIndex, colWidths, rowHeights[rowIndex]);
  }).join('');

  return [
    '<hp:p id="' + paraId + '" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">',
    '<hp:run charPrIDRef="0">',
    '<hp:tbl id="' + tableId + '" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="' + rows.length + '" colCnt="' + colWidths.length + '" cellSpacing="0" borderFillIDRef="1" noAdjust="0">',
    '<hp:sz width="42520" widthRelTo="ABSOLUTE" height="' + tableHeight + '" heightRelTo="ABSOLUTE" protect="0"/>',
    '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>',
    '<hp:outMargin left="0" right="0" top="120" bottom="220"/>',
    '<hp:inMargin left="260" right="260" top="120" bottom="120"/>',
    rowXml,
    '</hp:tbl><hp:t/>',
    '</hp:run>',
    '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="0" flags="393216"/></hp:linesegarray>',
    '</hp:p>',
  ].join('');
}

function hopHwpxTableRowXml_(row, rowIndex, colWidths, rowHeight) {
  let colIndex = 0;
  const cells = (row || []).map(function(cell) {
    const safeCell = cell || hopHwpxCell_('');
    const colSpan = Math.min(Math.max(1, Number(safeCell.colSpan || 1)), colWidths.length - colIndex);
    const width = hopHwpxSpanWidth_(colWidths, colIndex, colSpan);
    const xml = hopHwpxTableCellXml_(safeCell, rowIndex, colIndex, width, rowHeight, colSpan);
    colIndex += colSpan;
    return xml;
  });

  while (colIndex < colWidths.length) {
    const width = colWidths[colIndex];
    cells.push(hopHwpxTableCellXml_(hopHwpxCell_(''), rowIndex, colIndex, width, rowHeight, 1));
    colIndex++;
  }

  return '<hp:tr>' + cells.join('') + '</hp:tr>';
}

function hopHwpxTableCellXml_(cell, rowIndex, colIndex, width, height, colSpan) {
  const borderFillId = cell.label ? '2' : '1';
  return [
    '<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="' + borderFillId + '">',
    '<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">',
    hopHwpxCellParagraphsXml_(cell.text, cell.charPrId, width),
    '</hp:subList>',
    '<hp:cellAddr colAddr="' + colIndex + '" rowAddr="' + rowIndex + '"/>',
    '<hp:cellSpan colSpan="' + colSpan + '" rowSpan="' + (cell.rowSpan || 1) + '"/>',
    '<hp:cellSz width="' + width + '" height="' + height + '"/>',
    '<hp:cellMargin left="260" right="260" top="120" bottom="120"/>',
    '</hp:tc>',
  ].join('');
}

function hopHwpxCellParagraphsXml_(text, charPrId, width) {
  const lines = hopHwpxCellLines_(text);
  return lines.map(function(line, index) {
    return [
      '<hp:p id="' + index + '" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">',
      '<hp:run charPrIDRef="' + (charPrId || '0') + '"><hp:t>' + hopHwpxXmlEscape_(line || ' ') + '</hp:t></hp:run>',
      '<hp:linesegarray><hp:lineseg textpos="0" vertpos="' + (index * 1000) + '" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="' + Math.max(0, width - 520) + '" flags="393216"/></hp:linesegarray>',
      '</hp:p>',
    ].join('');
  }).join('');
}

function hopHwpxCellLines_(text) {
  const cleaned = hopHwpxText_(text);
  if (!cleaned) return [''];
  return cleaned.split(/\n+/).map(function(line) {
    return hopHwpxText_(line);
  }).filter(function(line) {
    return line !== '';
  });
}

function hopHwpxNormalizeColWidths_(widths, targetWidth) {
  const input = Array.isArray(widths) && widths.length ? widths : [targetWidth];
  const normalized = input.map(function(width) {
    const number = Number(width || 0);
    return number > 0 ? Math.floor(number) : 1;
  });
  const sum = normalized.reduce(function(total, width) {
    return total + width;
  }, 0);
  const scaled = normalized.map(function(width) {
    return Math.max(1, Math.floor(width * targetWidth / sum));
  });
  const diff = targetWidth - scaled.reduce(function(total, width) {
    return total + width;
  }, 0);
  scaled[scaled.length - 1] += diff;
  return scaled;
}

function hopHwpxSpanWidth_(colWidths, start, span) {
  let width = 0;
  for (let index = 0; index < span; index++) {
    width += colWidths[start + index] || 0;
  }
  return width;
}

function hopHwpxEstimateRowHeight_(row, colWidths) {
  let colIndex = 0;
  let maxLines = 1;
  let hasTitle = false;
  (row || []).forEach(function(cell) {
    const colSpan = Math.min(Math.max(1, Number(cell && cell.colSpan || 1)), colWidths.length - colIndex);
    const width = hopHwpxSpanWidth_(colWidths, colIndex, colSpan);
    const approxChars = Math.max(6, Math.floor(width / 520));
    const lines = hopHwpxCellLines_(cell && cell.text);
    lines.forEach(function(line) {
      maxLines = Math.max(maxLines, Math.ceil(Math.max(1, hopHwpxText_(line).length) / approxChars));
    });
    if (cell && cell.charPrId === '1') hasTitle = true;
    colIndex += colSpan;
  });

  return Math.max(hasTitle ? 1500 : 900, maxLines * 760 + 360);
}

function buildHopHwpxSectionXml_(paragraphs) {
  const items = (paragraphs || []).map(function(text, index) {
    const charPrId = index === 0 ? '1' : '0';
    return [
      '<hp:p id="' + index + '" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">',
      '<hp:run charPrIDRef="' + charPrId + '"><hp:t>' + hopHwpxXmlEscape_(text || ' ') + '</hp:t></hp:run>',
      '</hp:p>',
    ].join('');
  }).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">',
    items,
    '</hs:sec>',
  ].join('');
}

function buildHopHwpxHeaderXml_() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<hh:head xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" version="1.5" secCnt="1">',
    '<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>',
    '<hh:refList>',
    '<hh:fontfaces itemCnt="7">',
    buildHopHwpxFontfaceXml_('HANGUL'),
    buildHopHwpxFontfaceXml_('LATIN'),
    buildHopHwpxFontfaceXml_('HANJA'),
    buildHopHwpxFontfaceXml_('JAPANESE'),
    buildHopHwpxFontfaceXml_('OTHER'),
    buildHopHwpxFontfaceXml_('SYMBOL'),
    buildHopHwpxFontfaceXml_('USER'),
    '</hh:fontfaces>',
    '<hh:borderFills itemCnt="3">',
    '<hh:borderFill id="0" threeD="0" shadow="0" centerLine="NONE"><hh:leftBorder type="NONE" width="0" color="#000000"/><hh:rightBorder type="NONE" width="0" color="#000000"/><hh:topBorder type="NONE" width="0" color="#000000"/><hh:bottomBorder type="NONE" width="0" color="#000000"/><hh:diagonal type="NONE" width="0" color="#000000"/></hh:borderFill>',
    '<hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE"><hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:diagonal type="NONE" width="0.1 mm" color="#000000"/></hh:borderFill>',
    '<hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE"><hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:diagonal type="NONE" width="0.1 mm" color="#000000"/><hc:fillBrush><hc:winBrush faceColor="#D9D9D9" hatchColor="#000000" alpha="0"/></hc:fillBrush></hh:borderFill>',
    '</hh:borderFills>',
    '<hh:charProperties itemCnt="3">',
    buildHopHwpxCharPrXml_(0, 1000, 0),
    buildHopHwpxCharPrXml_(1, 1600, 1),
    buildHopHwpxCharPrXml_(2, 950, 1),
    '</hh:charProperties>',
    '<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>',
    '<hh:numberings itemCnt="0"/>',
    '<hh:paraProperties itemCnt="1"><hh:paraPr id="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0"><hh:align horizontal="LEFT" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:lineSpacing type="PERCENT" value="160"/><hh:border borderFillIDRef="0" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0"/><hh:margin><hc:intent value="0"/><hc:left value="0"/><hc:right value="0"/><hc:prev value="0"/><hc:next value="0"/></hh:margin></hh:paraPr></hh:paraProperties>',
    '<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>',
    '</hh:refList>',
    '<hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>',
    '<hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>',
    '<hh:metaTag name="SeochangOperatingLog"/>',
    '</hh:head>',
  ].join('');
}

function buildHopHwpxFontfaceXml_(lang) {
  return '<hh:fontface lang="' + lang + '" fontCnt="1"><hh:font id="0" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font></hh:fontface>';
}

function buildHopHwpxCharPrXml_(id, height, bold) {
  const boldPart = bold ? '<hh:bold/>' : '';
  return '<hh:charPr id="' + id + '" height="' + height + '" textColor="#000000" shadeColor="NONE" useFontSpace="0" useKerning="0"><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>' + boldPart + '</hh:charPr>';
}

function buildHopHwpxContentHpf_(fileName) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:dc="http://purl.org/dc/elements/1.1/" version="1.0" unique-identifier="uid">',
    '<opf:metadata><dc:title>' + hopHwpxXmlEscape_(fileName) + '</dc:title><dc:language>ko-KR</dc:language></opf:metadata>',
    '<opf:manifest>',
    '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>',
    '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>',
    '<opf:item id="settings" href="settings.xml" media-type="application/xml"/>',
    '</opf:manifest>',
    '<opf:spine><opf:itemref idref="section0"/></opf:spine>',
    '</opf:package>',
  ].join('');
}

function buildHopHwpxManifestXml_() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">',
    '<manifest:file-entry manifest:media-type="' + HOP_HWPX_MIME_TYPE + '" manifest:full-path="/"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="version.xml"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="settings.xml"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/content.hpf"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/header.xml"/>',
    '<manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/section0.xml"/>',
    '<manifest:file-entry manifest:media-type="text/plain" manifest:full-path="Preview/PrvText.txt"/>',
    '<manifest:file-entry manifest:media-type="text/javascript" manifest:full-path="Scripts/headerScripts.js"/>',
    '<manifest:file-entry manifest:media-type="text/javascript" manifest:full-path="Scripts/sourceScripts.js"/>',
    '</manifest:manifest>',
  ].join('');
}

function buildHopHwpxContainerXml_() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">',
    '<rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></rootfiles>',
    '</container>',
  ].join('');
}

function buildHopHwpxContainerRdf_() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="Contents/content.hpf"/>',
    '</rdf:RDF>',
  ].join('');
}

function buildHopHwpxSettingsXml_() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">',
    '<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>',
    '</ha:HWPApplicationSetting>',
  ].join('');
}

function buildHopHwpxVersionXml_() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<hv:version xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" major="5" minor="0" micro="0" buildNumber="0" app="Seochang Apps Script"/>',
  ].join('');
}
