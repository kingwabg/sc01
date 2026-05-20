function escapeJsonForHtmlScript_(jsonText) {
  return String(jsonText || '')
    .replace(/<\//g, '<\\/')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function encodeJsonForHtmlPayload_(jsonText) {
  return Utilities.base64EncodeWebSafe(String(jsonText || ''), Utilities.Charset.UTF_8);
}

const PREVIEW_TABLE_BORDER_COLOR = '#9b9b9b';
const PREVIEW_TABLE_HEADER_BACKGROUND = '#d9d9d9';
const DEFAULT_GUIDANCE_TEXT = Object.freeze({
  life: '1. 인사 생활화, 2. 센터 규칙 지키기, 3. 공용 물품 관리, 4. 자기 주도적 정리',
  hygiene: '수시로 손 씻기 및 소독',
  safety: '1. 실내 정숙 보행 2. 등하원 교통안전, 3. 즉시 귀가 원칙, 4. 비상시 대처',
});

function withDefaultGuidanceFields_(report) {
  const nextReport = report || {};
  nextReport.guidanceLife = valueOrEmpty_(nextReport.guidanceLife || DEFAULT_GUIDANCE_TEXT.life);
  nextReport.guidanceHygiene = valueOrEmpty_(nextReport.guidanceHygiene || DEFAULT_GUIDANCE_TEXT.hygiene);
  nextReport.guidanceSafety = valueOrEmpty_(nextReport.guidanceSafety || DEFAULT_GUIDANCE_TEXT.safety);
  return nextReport;
}

function buildTemplateDrivenPreviewPayload_(rowNumbers, selectedYear, autoPrint) {
  const settings = getAutomationSettings_();
  const reports = getReportsByRowNumbers_(rowNumbers, selectedYear).map(function(report) {
    withDefaultGuidanceFields_(report);
    report.approvalSlots = buildApprovalSlotsForReport_(report, settings);
    return report;
  });

  if (!reports.length) {
    throw new Error('미리보기할 데이터가 없습니다.');
  }

  const pageCount = countLightweightPreviewPages_(reports);
  const generatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');

  return {
    reports: reports,
    pageCount: pageCount,
    selectedYear: normalizeAttendanceYear_(selectedYear) || '',
    autoPrint: !!autoPrint,
    generatedAt: generatedAt,
  };
}

function getTemplateDrivenPreviewPayload(rowNumbers, selectedYear, autoPrint) {
  return buildTemplateDrivenPreviewPayload_(rowNumbers, selectedYear, autoPrint);
}

function escapeHtmlForPreview_(value) {
  return value == null ? '' : String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toPreviewValue_(value) {
  return value == null ? '' : String(value);
}

function formatPreviewDateLabel_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return value.getFullYear() + '년 ' + (value.getMonth() + 1) + '월 ' + value.getDate() + '일 ' + weekdays[value.getDay()];
  }

  const text = toPreviewValue_(value).trim();
  if (!text) {
    return '';
  }
  if (/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(text)) {
    return text;
  }

  const match = text.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return text;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(date.getTime())) {
    return text;
  }
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return Number(match[1]) + '년 ' + Number(match[2]) + '월 ' + Number(match[3]) + '일 ' + weekdays[date.getDay()];
}

function safeCssFontFamilyForPreview_(value) {
  const fallback = '"Malgun Gothic", "맑은 고딕", sans-serif';
  if (!value) {
    return fallback;
  }
  const normalized = String(value).replace(/["\\]/g, '\\$&');
  return '"' + normalized + '", ' + fallback;
}

function wrapStyleForPreview_(cell) {
  const strategy = String(cell && cell.wrapStrategy || '').toUpperCase();
  if (strategy.indexOf('CLIP') !== -1) {
    return 'white-space:nowrap;overflow:hidden;text-overflow:clip;';
  }
  if (strategy.indexOf('OVERFLOW') !== -1) {
    return 'white-space:nowrap;overflow:visible;';
  }
  return 'white-space:pre-wrap;overflow-wrap:anywhere;';
}

function borderSideToCssForPreview_(side) {
  if (!side || !side.style || side.style === 'NONE') {
    return '0 none transparent';
  }
  const color = PREVIEW_TABLE_BORDER_COLOR;
  const style = String(side.style || '').toUpperCase();
  let css = 'solid';
  let width = '1px';
  if (style.indexOf('DOTTED') !== -1) {
    css = 'dotted';
  } else if (style.indexOf('DASHED') !== -1) {
    css = 'dashed';
  } else if (style.indexOf('DOUBLE') !== -1) {
    css = 'double';
    width = '3px';
  } else if (style.indexOf('SOLID_THICK') !== -1) {
    width = '3px';
  } else if (style.indexOf('SOLID_MEDIUM') !== -1) {
    width = '2px';
  }
  return width + ' ' + css + ' ' + color;
}

function borderStyleForPreview_(cell) {
  const borders = cell && cell.borders ? cell.borders : {};
  return [
    'border-top:' + borderSideToCssForPreview_(borders.top),
    'border-right:' + borderSideToCssForPreview_(borders.right),
    'border-bottom:' + borderSideToCssForPreview_(borders.bottom),
    'border-left:' + borderSideToCssForPreview_(borders.left),
  ].join(';');
}

function normalizePreviewTableBackground_(background) {
  const normalized = String(background || '#ffffff').trim().toLowerCase();
  if (!normalized || normalized === '#ffffff' || normalized === 'white') {
    return '#ffffff';
  }
  return PREVIEW_TABLE_HEADER_BACKGROUND;
}

function makeColGroupForPreview_(model) {
  const widths = (model && model.columnWidths || []).length ? model.columnWidths : Array(16).fill(50);
  const total = widths.reduce(function(sum, width) { return sum + width; }, 0) || 1;
  return '<colgroup>' + widths.map(function(width) {
    return '<col style="width:' + ((width / total) * 100).toFixed(4) + '%">';
  }).join('') + '</colgroup>';
}

function rowHeightStyleForPreview_(model, rowIndex) {
  const baseHeight = (model && model.rowHeights || [])[rowIndex] || 24;
  const height = Math.ceil(baseHeight * 1.16);
  return 'height:' + height + 'px';
}

function getCellPixelHeightForPreview_(model, rowIndex, rowspan) {
  const count = Math.max(Number(rowspan) || 1, 1);
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Math.ceil(((model && model.rowHeights || [])[rowIndex + index] || 24) * 1.16);
  }
  return total;
}

function normalizeTemplateFontSizeForPreview_(cell) {
  const rawSize = Number(cell && cell.fontSize);
  const text = toPreviewValue_(cell && cell.text || '').replace(/\s+/g, '');
  if (text.indexOf('운영일지') !== -1) {
    return Math.max(rawSize || 0, 20);
  }
  return Math.max(rawSize || 0, 10.5);
}

function getBindingValueForPreview_(report, fieldKey) {
  switch (fieldKey) {
    case 'DATE': return formatPreviewDateLabel_(report.date);
    case 'OPERATING_HOURS': return report.operatingHours;
    case 'MANAGER': return report.manager;
    case 'MALE_PRESCHOOL': return report.maleCounts[0];
    case 'MALE_OUT_OF_SCHOOL': return report.maleCounts[1];
    case 'MALE_ELEMENTARY': return report.maleCounts[2];
    case 'MALE_MIDDLE': return report.maleCounts[3];
    case 'MALE_HIGH': return report.maleCounts[4];
    case 'MALE_OTHER': return report.maleCounts[5];
    case 'FEMALE_PRESCHOOL': return report.femaleCounts[0];
    case 'FEMALE_OUT_OF_SCHOOL': return report.femaleCounts[1];
    case 'FEMALE_ELEMENTARY': return report.femaleCounts[2];
    case 'FEMALE_MIDDLE': return report.femaleCounts[3];
    case 'FEMALE_HIGH': return report.femaleCounts[4];
    case 'FEMALE_OTHER': return report.femaleCounts[5];
    case 'MEAL_BREAKFAST': return report.mealBreakfast;
    case 'MEAL_LUNCH': return report.mealLunch;
    case 'MEAL_DINNER': return report.mealDinner;
    case 'ATTENDANCE_CAPACITY': return report.attendanceCapacity;
    case 'ATTENDANCE_CURRENT': return report.attendanceCurrent;
    case 'ATTENDANCE_PRESENT': return report.attendancePresent;
    case 'ATTENDANCE_OFFICIAL': return report.attendanceOfficial;
    case 'ATTENDANCE_ALTERNATIVE': return report.attendanceAlternative;
    case 'ATTENDANCE_ABSENT': return report.attendanceAbsent;
    case 'ATTENDANCE_OTHER': return toNumber_(report.attendanceOther) === 0 ? '' : report.attendanceOther;
    case 'STAFF_WORKER': return report.staffWorker;
    case 'STAFF_TEACHER': return report.staffTeacher;
    case 'STAFF_PUBLIC': return report.staffPublic;
    case 'STAFF_OTHER': return report.staffOther;
    case 'STAFF_CHANGES': return report.staffChanges;
    case 'CHILD_CHANGES': return report.childChanges;
    case 'VISITOR_REASON': return report.visitorReason;
    case 'CHILD_SPECIAL_COUNSELING': return report.childSpecialCounseling;
    case 'FACILITY_SAFETY_HYGIENE': return report.facilitySafetyHygiene;
    case 'SUPPLIES_ENVIRONMENT': return report.suppliesEnvironment;
    case 'STAFF_EDUCATION_TRIP': return report.staffEducationTrip;
    case 'MISC_NOTES': return report.miscNotes;
    case 'WORK_1': return report.works[0];
    case 'WORK_2': return report.works[1];
    case 'WORK_3': return report.works[2];
    case 'WORK_4': return report.works[3];
    case 'WORK_5': return report.works[4];
    case 'WORK_6_7': return [report.works[5], report.works[6]].filter(Boolean).join('\n');
    case 'APPROVAL_SLOT_1': return (report.approvalSlots || [])[0] || null;
    case 'APPROVAL_SLOT_2': return (report.approvalSlots || [])[1] || null;
    case 'APPROVAL_SLOT_3': return (report.approvalSlots || [])[2] || null;
    case 'PROGRAM_TITLE': return report.programTitle || '';
    case 'PROGRAM_PARTICIPANTS': return report.programParticipants || '';
    default: return '';
  }
}

function renderApprovalValueForPreview_(slot) {
  const stampUrl = toPreviewValue_(slot && slot.stampUrl || '');
  if (stampUrl) {
    return '<img class="approval-stamp" src="' + escapeHtmlForPreview_(stampUrl) + '" alt="' + escapeHtmlForPreview_(toPreviewValue_(slot && slot.label || '결재')) + ' 도장">';
  }
  return '<div class="approval-fallback">&nbsp;</div>';
}

function renderCellContentForPreview_(report, cell, rowIndex, model, valueMap) {
  const fieldKey = cell && cell.binding ? cell.binding.fieldKey : (cell && cell.formulaBinding ? cell.formulaBinding.fieldKey : '');
  const a1 = cell && cell.a1 ? cell.a1 : '';
  const mappedValue = a1 && valueMap && Object.prototype.hasOwnProperty.call(valueMap, a1)
    ? valueMap[a1]
    : undefined;
  const value = mappedValue !== undefined ? mappedValue : (fieldKey ? getBindingValueForPreview_(report, fieldKey) : '');
  const minHeight = Math.max(getCellPixelHeightForPreview_(model, rowIndex, cell.rowspan) - 4, 18);

  if (fieldKey && fieldKey.indexOf('APPROVAL_SLOT_') === 0) {
    return '<div class="approval-slot cell-content" style="--cell-min-height:' + minHeight + 'px">' + renderApprovalValueForPreview_(value) + '</div>';
  }

  const cls = cell && cell.align === 'left' ? 'binding-wrap text-left cell-content' : 'binding-wrap cell-content';
  const displayText = fieldKey ? toPreviewValue_(value) : toPreviewValue_(cell && cell.text || '');
  return '<div class="' + cls + '" style="--cell-min-height:' + minHeight + 'px"><div class="static-text">' + escapeHtmlForPreview_(displayText) + '</div></div>';
}

function buildProgramValueMapForPreview_(report, model) {
  const rows = model && Array.isArray(model.rows) ? model.rows : [];
  const items = Array.isArray(report && report.programItems) ? report.programItems : [];
  const valueMap = {};

  function findFieldCells(fieldKey) {
    const matches = [];
    rows.forEach(function(row) {
      (row || []).forEach(function(cell) {
        const bindingFieldKey = cell && cell.binding ? cell.binding.fieldKey : (cell && cell.formulaBinding ? cell.formulaBinding.fieldKey : '');
        if (bindingFieldKey === fieldKey) {
          matches.push(cell);
        }
      });
    });
    return matches;
  }

  const titleCells = findFieldCells('PROGRAM_TITLE');
  const participantCells = findFieldCells('PROGRAM_PARTICIPANTS');
  const titleAnchor = titleCells[0];
  const participantAnchor = participantCells[0];

  if (titleAnchor && titleAnchor.a1) {
    valueMap[titleAnchor.a1] = items.map(function(item) {
      return toPreviewValue_(item && item.title || '');
    }).filter(Boolean).join('\n');
  }

  if (participantAnchor && participantAnchor.a1) {
    valueMap[participantAnchor.a1] = items.map(function(item) {
      return toPreviewValue_(item && (item.participants || item.rawText || item.title) || '');
    }).filter(Boolean).join('\n\n');
  }

  return valueMap;
}

function renderTemplateRowsForPreview_(report, model, valueMap) {
  return (model.rows || []).map(function(row, rowIndex) {
    const cellsHtml = (row || []).map(function(cell) {
      const attrs = [
        cell.colspan > 1 ? 'colspan="' + cell.colspan + '"' : '',
        cell.rowspan > 1 ? 'rowspan="' + cell.rowspan + '"' : '',
        'style="' + [
          'background:' + normalizePreviewTableBackground_(cell.background),
          'font-weight:' + (cell.bold ? '700' : '400'),
          'font-size:' + normalizeTemplateFontSizeForPreview_(cell) + 'pt',
          'color:' + (cell.fontColor || '#000000'),
          'font-family:' + safeCssFontFamilyForPreview_(cell.fontFamily),
          'font-style:' + (cell.italic ? 'italic' : 'normal'),
          'text-decoration:' + (cell.underline ? 'underline' : 'none'),
          'text-align:' + (cell.align || 'center'),
          'vertical-align:' + (cell.verticalAlign || 'middle'),
          'padding:2px 3px',
          wrapStyleForPreview_(cell),
          rowHeightStyleForPreview_(model, rowIndex),
          borderStyleForPreview_(cell),
        ].join(';') + '"',
        cell.align === 'left' ? 'class="text-left"' : '',
      ].filter(Boolean).join(' ');

      return '<td ' + attrs + '>' + renderCellContentForPreview_(report, cell, rowIndex, model, valueMap) + '</td>';
    }).join('');

    return '<tr style="' + rowHeightStyleForPreview_(model, rowIndex) + '">' + cellsHtml + '</tr>';
  }).join('');
}

function renderSinglePreviewPageHtml_(report, model, pageIndex, pageCount, valueMap) {
  return '<div class="page" data-page-index="' + pageIndex + '"><div class="page-inner"><div class="sheet-scale-box"><div class="sheet-scale-frame" data-design-width="0" style="width:100%;min-width:0"><table class="sheet-table">' +
    makeColGroupForPreview_(model) +
    renderTemplateRowsForPreview_(report, model, valueMap || {}) +
    '</table></div></div></div></div>';
}

function buildTemplateDrivenPagesHtml_(payload) {
  const reports = payload && Array.isArray(payload.reports) ? payload.reports : [];
  const templateModel = payload && payload.templateModel ? payload.templateModel : { columnWidths: [], rowHeights: [], rows: [] };
  const secondTemplateModel = payload && payload.secondTemplateModel ? payload.secondTemplateModel : { columnWidths: [], rowHeights: [], rows: [] };
  const pageCount = payload && payload.pageCount ? payload.pageCount : reports.length;
  const pages = [];

  reports.forEach(function(report) {
    pages.push(renderSinglePreviewPageHtml_(report, templateModel, pages.length, pageCount, {}));
    if (report && report.hasProgramPage && Array.isArray(report.programTexts) && report.programTexts.length && Array.isArray(secondTemplateModel.rows) && secondTemplateModel.rows.length) {
      pages.push(renderSinglePreviewPageHtml_(report, secondTemplateModel, pages.length, pageCount, buildProgramValueMapForPreview_(report, secondTemplateModel)));
    }
  });

  return pages.join('');
}

function previewMultilineTextHtml_(value) {
  return escapeHtmlForPreview_(toPreviewValue_(value)).replace(/\r?\n/g, '<br>');
}

function previewNumberHtml_(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return escapeHtmlForPreview_(String(value));
}

function previewOptionalNumberHtml_(value) {
  if (value === null || value === undefined || value === '' || Number(value) === 0) {
    return '&nbsp;';
  }
  return escapeHtmlForPreview_(String(value));
}

function previewAttendanceOtherHtml_(report) {
  const attendanceOther = report && report.attendanceOther;
  if (attendanceOther !== null && attendanceOther !== undefined && attendanceOther !== '' && Number(attendanceOther) !== 0) {
    return previewNumberHtml_(attendanceOther);
  }
  return previewNumberHtml_(report && report.maleCounts && report.maleCounts[5]);
}

function renderApprovalRowHtml_(approvalSlots) {
  const slots = Array.isArray(approvalSlots) ? approvalSlots : [];
  if (!slots.length) {
    return '';
  }

  const labelCells = slots.map(function(slot) {
    const label = escapeHtmlForPreview_(toPreviewValue_(slot && slot.label || '결재'));
    return '<td style="width:70px;min-height:22px;border:1px solid #9b9b9b;padding:0 4px;text-align:center;vertical-align:middle;background:#d9d9d9;font-size:11px;font-weight:700;line-height:1.15;color:#111827">' +
      label +
      '</td>';
  }).join('');

  const stampCells = slots.map(function(slot) {
    const label = escapeHtmlForPreview_(toPreviewValue_(slot && slot.label || '결재'));
    const stampUrl = toPreviewValue_(slot && slot.stampUrl || '');
    const content = stampUrl
      ? '<img class="approval-stamp" src="' + escapeHtmlForPreview_(stampUrl) + '" alt="' + label + ' 도장" style="display:block;margin:0 auto;max-width:56px;max-height:44px">'
      : '<div style="min-height:44px"></div>';
    return '<td style="width:70px;min-height:48px;border:1px solid #9b9b9b;padding:2px 4px;text-align:center;vertical-align:middle;background:#fff">' +
      content +
      '</td>';
  }).join('');

  return '<table style="border-collapse:collapse;margin-left:auto;table-layout:fixed;background:#fff">' +
    '<tr>' +
      '<td rowspan="2" style="width:26px;border:1px solid #9b9b9b;padding:0;background:#d9d9d9;text-align:center;vertical-align:middle;font-size:11px;font-weight:800;color:#111827;line-height:1.1;letter-spacing:0.02em">결<br>재</td>' +
      labelCells +
    '</tr>' +
    '<tr>' +
      stampCells +
    '</tr>' +
  '</table>';
}

function renderInfoTableHtml_(rows) {
  return '<table class="log-program-info-table" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px">' + rows.map(function(row) {
    return '<tr>' +
      '<td style="width:104px;border:1px solid #9b9b9b;padding:6px 8px;background:#d9d9d9;font-weight:700;text-align:center;vertical-align:middle;white-space:normal;word-break:keep-all;overflow-wrap:normal">' + escapeHtmlForPreview_(row.label) + '</td>' +
      '<td style="border:1px solid #9b9b9b;padding:6px 8px;background:#fff;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;overflow:visible">' + row.valueHtml + '</td>' +
    '</tr>';
  }).join('') + '</table>';
}

function renderProgramItemTablesHtml_(report) {
  const items = Array.isArray(report && report.programItems) ? report.programItems : [];
  if (!items.length) {
    return renderInfoTableHtml_([
      { label: '프로그램명', valueHtml: previewMultilineTextHtml_(report && report.programTitle) || '-' },
      { label: '참석자 명단', valueHtml: previewMultilineTextHtml_(report && report.programParticipants) || '-' }
    ]);
  }

  return items.map(function(item) {
    const title = previewMultilineTextHtml_(item && item.title) || '-';
    const participants = previewMultilineTextHtml_(item && (item.participants || item.rawText)) || '-';
    return '<div style="margin-bottom:14px">' +
      renderInfoTableHtml_([
        { label: '프로그램명', valueHtml: title },
        { label: '참석자 명단', valueHtml: participants }
      ]) +
    '</div>';
  }).join('');
}

function renderSummaryGridHtml_(report) {
  const items = [
    ['정원', previewNumberHtml_(report.attendanceCapacity)],
    ['현원', previewNumberHtml_(report.attendanceCurrent)],
    ['출석', previewNumberHtml_(report.attendancePresent)],
    ['공결', previewNumberHtml_(report.attendanceOfficial)],
    ['대체출석', previewNumberHtml_(report.attendanceAlternative)],
    ['결석', previewNumberHtml_(report.attendanceAbsent)],
    ['기타', previewOptionalNumberHtml_(report.attendanceOther)],
    ['종사자수', previewNumberHtml_(report.staffWorker)],
    ['교사수', previewNumberHtml_(report.staffTeacher)],
    ['공익수', previewNumberHtml_(report.staffPublic)],
    ['기타인원', previewNumberHtml_(report.staffOther)]
  ];

  return '<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr>' +
    items.map(function(item) {
      return '<th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9;font-weight:700">' + escapeHtmlForPreview_(item[0]) + '</th>';
    }).join('') +
    '</tr><tr>' +
    items.map(function(item) {
      return '<td style="border:1px solid #9b9b9b;padding:6px 4px;text-align:center;background:#fff">' + item[1] + '</td>';
    }).join('') +
    '</tr></table>';
}

function renderSectionTitleHtml_(title) {
  return '<div style="margin:12px 0 6px;padding:6px 8px;border:1px solid #9b9b9b;background:#d9d9d9;font-size:12px;font-weight:800;letter-spacing:-0.01em">' +
    escapeHtmlForPreview_(title) +
  '</div>';
}

function renderChildBreakdownHtml_(report) {
  const labels = ['취학전', '학교밖', '초등', '중등', '고등', '기타'];
  const male = Array.isArray(report.maleCounts) ? report.maleCounts : [];
  const female = Array.isArray(report.femaleCounts) ? report.femaleCounts : [];
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:12px">' +
    '<tr><th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9"></th>' +
    labels.map(function(label) {
      return '<th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9">' + label + '</th>';
    }).join('') +
    '</tr>' +
    '<tr><th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9">남</th>' +
    labels.map(function(_, index) {
      return '<td style="border:1px solid #9b9b9b;padding:6px 4px;text-align:center;background:#fff">' + previewNumberHtml_(male[index]) + '</td>';
    }).join('') +
    '</tr>' +
    '<tr><th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9">여</th>' +
    labels.map(function(_, index) {
      return '<td style="border:1px solid #9b9b9b;padding:6px 4px;text-align:center;background:#fff">' + previewNumberHtml_(female[index]) + '</td>';
    }).join('') +
    '</tr></table>';
}

function renderWorkTableHtml_(report) {
  const works = Array.isArray(report.works) ? report.works : [];
  const visibleWorks = works.map(function(work, index) {
    return {
      index: index,
      text: valueOrEmpty_(work).trim()
    };
  }).filter(function(item) {
    return !!item.text;
  });
  if (!visibleWorks.length) {
    return '';
  }
  return '<table class="log-program-info-table" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px">' + visibleWorks.map(function(item) {
    return '<tr>' +
      '<td style="width:104px;border:1px solid #9b9b9b;padding:6px 8px;background:#d9d9d9;font-weight:700;text-align:center;vertical-align:middle">업무 ' + (item.index + 1) + '</td>' +
      '<td style="border:1px solid #9b9b9b;padding:6px 8px;background:#fff;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;overflow:visible">' + previewMultilineTextHtml_(item.text) + '</td>' +
    '</tr>';
  }).join('') + '</table>';
}

function renderWorkContinuationTableHtml_(entries) {
  const content = renderWorkEntriesHtml_(entries, 0);
  if (!content) {
    return '';
  }
  return '<table class="log-continuation-table" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:0">' +
    '<tr>' +
      '<td style="width:104px;border:1px solid #9b9b9b;padding:6px 8px;background:#d9d9d9;font-weight:700;text-align:center;vertical-align:middle;white-space:normal">업무 내용</td>' +
      '<td style="border:1px solid #9b9b9b;padding:8px 10px;background:#fff;text-align:left;vertical-align:top;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;line-break:auto;line-height:1.45">' + content + '</td>' +
    '</tr>' +
  '</table>';
}

function joinManagementText_(parts) {
  return (parts || []).map(function(item) {
    const label = valueOrEmpty_(item && item.label).trim();
    const value = valueOrEmpty_(item && item.value).trim();
    if (!value) return '';
    return label ? (label + ' : ' + value) : value;
  }).filter(Boolean).join('\n');
}

function buildManagementPreviewText_(report, type) {
  if (type === 'staff') {
    return joinManagementText_([
      { value: report && report.staffChanges },
      { label: '교육/출장', value: report && report.staffEducationTrip },
    ]);
  }
  if (type === 'child') {
    return joinManagementText_([
      { value: report && report.childChanges },
      { label: '특이사항', value: report && report.childSpecialCounseling },
    ]);
  }
  if (type === 'facility') {
    return joinManagementText_([
      { label: '안전/위생', value: report && report.facilitySafetyHygiene },
      { label: '물품/환경', value: report && report.suppliesEnvironment },
    ]);
  }
  return '';
}

function renderWorkContentHtml_(workLines) {
  if (!workLines) {
    return '&nbsp;';
  }

  return '<div style="padding:0 2px">' + workLines + '</div>';
}

function renderMiscNotesRowHtml_(report) {
  return '<table class="log-continuation-table" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px">' +
    '<tr>' +
      '<td style="width:104px;border:1px solid #9b9b9b;padding:6px 8px;background:#d9d9d9;font-weight:700;text-align:center;vertical-align:middle;white-space:normal">기타</td>' +
      '<td style="border:1px solid #9b9b9b;padding:6px 8px;background:#fff;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;line-height:1.35">' + (previewMultilineTextHtml_(report && report.miscNotes) || '&nbsp;') + '</td>' +
    '</tr>' +
  '</table>';
}

function renderMealGridHtml_(report) {
  const items = [
    ['조식', previewNumberHtml_(report.mealBreakfast)],
    ['중식', previewNumberHtml_(report.mealLunch)],
    ['석식', previewNumberHtml_(report.mealDinner)]
  ];
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr>' +
    items.map(function(item) {
      return '<th style="border:1px solid #9b9b9b;padding:6px 4px;background:#d9d9d9;font-weight:700">' + escapeHtmlForPreview_(item[0]) + '</th>';
    }).join('') +
    '</tr><tr>' +
    items.map(function(item) {
      return '<td style="border:1px solid #9b9b9b;padding:6px 4px;text-align:center;background:#fff">' + item[1] + '</td>';
    }).join('') +
    '</tr></table>';
}

function renderHeaderBandHtml_(report) {
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">' +
    '<tr>' +
      '<td style="border:1px solid #9b9b9b;padding:10px 12px;background:#d9d9d9;font-size:26px;font-weight:800;letter-spacing:-0.03em">운영일지</td>' +
      '<td style="border:1px solid #9b9b9b;padding:8px 10px;background:#fff;text-align:right;font-size:12px;line-height:1.6">' +
        '<div><strong>일자</strong> ' + escapeHtmlForPreview_(formatPreviewDateLabel_(report.date)) + '</div>' +
        '<div><strong>운영시간</strong> ' + escapeHtmlForPreview_(toPreviewValue_(report.operatingHours)) + '</div>' +
        '<div><strong>담당자</strong> ' + escapeHtmlForPreview_(toPreviewValue_(report.manager)) + '</div>' +
      '</td>' +
    '</tr>' +
  '</table>';
}

function renderTemplateLikeGridRow_(cells) {
  return '<tr>' + cells.map(function(cell) {
    const colspan = cell.colspan && cell.colspan > 1 ? ' colspan="' + cell.colspan + '"' : '';
    const rowspan = cell.rowspan && cell.rowspan > 1 ? ' rowspan="' + cell.rowspan + '"' : '';
    const className = cell.className ? ' class="' + escapeHtmlForPreview_(cell.className) + '"' : '';
    const background = normalizePreviewTableBackground_(cell.background);
    const align = cell.align || 'center';
    const extraStyle = cell.style ? ';' + cell.style : '';
    const overflowStyle = cell.allowOverflow ? 'overflow:visible!important;' : 'overflow:hidden;';
    return '<td' + className + colspan + rowspan +
      ' style="box-sizing:border-box!important;border:1px solid #9b9b9b;padding:4px 5px!important;background:' + background + ';text-align:' + align + ';vertical-align:middle;font-size:10.5px!important;line-height:1.22!important;white-space:normal;word-break:break-all;overflow-wrap:anywhere;line-break:anywhere;' + overflowStyle + 'width:auto' + extraStyle + '">' +
      (cell.html || '&nbsp;') +
      '</td>';
  }).join('') + '</tr>';
}

function renderTemplateLikeColGroup_(count) {
  const safeCount = Math.max(Number(count) || 14, 1);
  let html = '<colgroup>';
  for (let index = 0; index < safeCount; index += 1) {
    html += '<col style="width:' + (100 / safeCount).toFixed(4) + '%">';
  }
  return html + '</colgroup>';
}

function renderTemplateLikeWeightedColGroup_(weights) {
  const safeWeights = (Array.isArray(weights) && weights.length ? weights : Array(14).fill(1)).map(function(weight) {
    const numeric = Number(weight);
    return numeric > 0 ? numeric : 1;
  });
  const total = safeWeights.reduce(function(sum, weight) {
    return sum + weight;
  }, 0) || safeWeights.length;
  return '<colgroup>' + safeWeights.map(function(weight) {
    return '<col style="width:' + ((weight / total) * 100).toFixed(4) + '%">';
  }).join('') + '</colgroup>';
}

function mergePreviewCellStyles_() {
  return Array.prototype.slice.call(arguments)
    .filter(function(style) { return !!style; })
    .join(';');
}

const LOG_WORK_FIRST_PAGE_LINE_CAPACITY = 8;
const LOG_WORK_CONTINUATION_LINE_CAPACITY = 18;
const LOG_WORK_TEXT_CHARS_PER_LINE = 46;

function estimateWorkEntryLineCount_(text) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.reduce(function(total, line) {
    const compactLength = valueOrEmpty_(line).trim().length;
    return total + Math.max(1, Math.ceil(compactLength / LOG_WORK_TEXT_CHARS_PER_LINE));
  }, 0);
}

function splitWorkTextLineForPreview_(line) {
  const text = valueOrEmpty_(line).trim();
  if (!text) {
    return [''];
  }
  const chunks = [];
  for (let start = 0; start < text.length; start += LOG_WORK_TEXT_CHARS_PER_LINE) {
    chunks.push(text.slice(start, start + LOG_WORK_TEXT_CHARS_PER_LINE));
  }
  return chunks.length ? chunks : [''];
}

function normalizeWorkTextForDuplicatePreview_(text) {
  return valueOrEmpty_(text)
    .replace(/\s+/g, ' ')
    .trim();
}

function buildWorkEntriesForPreview_(works) {
  const entries = [];
  const seenWorkTexts = {};
  (Array.isArray(works) ? works : []).forEach(function(work, index) {
    const text = valueOrEmpty_(work).trim();
    if (!text) {
      return;
    }
    const normalizedWorkText = normalizeWorkTextForDuplicatePreview_(text);
    if (!normalizedWorkText || seenWorkTexts[normalizedWorkText]) {
      return;
    }
    seenWorkTexts[normalizedWorkText] = true;
    let isFirstLineForWork = true;
    text.split(/\r?\n/).forEach(function(line) {
      splitWorkTextLineForPreview_(line).forEach(function(chunk) {
        entries.push({
          number: index + 1,
          showNumber: isFirstLineForWork,
          text: chunk,
          lineCount: 1,
        });
        isFirstLineForWork = false;
      });
    });
  });
  return entries;
}

function splitWorkEntriesByCapacity_(entries, capacity) {
  const safeCapacity = Math.max(Number(capacity) || 1, 1);
  const current = [];
  const overflow = [];
  let usedLines = 0;
  let hasOverflowed = false;

  (entries || []).forEach(function(entry) {
    const entryLines = Math.max(Number(entry && entry.lineCount) || 1, 1);
    if (!hasOverflowed && current.length && usedLines + entryLines > safeCapacity) {
      hasOverflowed = true;
    }
    if (hasOverflowed) {
      overflow.push(entry);
      return;
    }
    current.push(entry);
    usedLines += entryLines;
  });

  return {
    current: current,
    overflow: overflow,
  };
}

function chunkWorkEntriesForPreview_(entries, capacity) {
  const chunks = [];
  let remaining = (entries || []).slice();
  while (remaining.length) {
    const split = splitWorkEntriesByCapacity_(remaining, capacity);
    const chunk = split.current.length ? split.current : [remaining[0]];
    chunks.push(chunk);
    remaining = split.current.length ? split.overflow : remaining.slice(1);
  }
  return chunks;
}

function paginateReportWorksForPreview_(report) {
  const entries = buildWorkEntriesForPreview_(report && report.works);
  const firstSplit = splitWorkEntriesByCapacity_(entries, LOG_WORK_FIRST_PAGE_LINE_CAPACITY);
  return {
    firstEntries: firstSplit.current,
    continuationChunks: chunkWorkEntriesForPreview_(firstSplit.overflow, LOG_WORK_CONTINUATION_LINE_CAPACITY),
    hasContinuation: firstSplit.overflow.length > 0,
  };
}

function renderWorkEntriesHtml_(entries, minimumRows) {
  const safeEntries = (entries || []).map(function(entry) {
    return {
      number: Number(entry && entry.number) || 0,
      showNumber: entry && entry.showNumber !== false,
      text: valueOrEmpty_(entry && entry.text).trim(),
    };
  });
  const htmlRows = safeEntries.map(function(entry) {
    return '<div style="padding:2px 0">' + previewMultilineTextHtml_(entry.text) + '</div>';
  });
  for (let index = safeEntries.length; index < Math.max(Number(minimumRows) || 0, 0); index += 1) {
    htmlRows.push('<div style="padding:2px 0">&nbsp;</div>');
  }
  return htmlRows.join('');
}

function renderCompactLeftLabelHtml_(mainText, detailText) {
  return '<span style="display:block;font-weight:700;line-height:1.08;word-break:keep-all;white-space:normal">' +
    escapeHtmlForPreview_(mainText).replace(/\s+/g, '<br>') +
    '</span>' +
    '<span style="display:block;margin-top:1px;font-size:9px;font-weight:700;letter-spacing:-0.08em;line-height:1.05;white-space:nowrap;word-break:keep-all">' +
    escapeHtmlForPreview_(detailText) +
    '</span>';
}

function renderTemplateLikeSheetHtml_(report, workPagination) {
  report = withDefaultGuidanceFields_(report);
  const safeWorkPagination = workPagination || paginateReportWorksForPreview_(report);
  const male = Array.isArray(report.maleCounts) ? report.maleCounts : [];
  const female = Array.isArray(report.femaleCounts) ? report.femaleCounts : [];
  const mealBreakfast = previewNumberHtml_(report.mealBreakfast);
  const mealLunch = previewNumberHtml_(report.mealLunch);
  const mealDinner = previewNumberHtml_(report.mealDinner);
  const guidance1 = previewMultilineTextHtml_(report.guidanceLife);
  const guidance2 = previewMultilineTextHtml_(report.guidanceHygiene);
  const guidance3 = previewMultilineTextHtml_(report.guidanceSafety);
  const workLines = renderWorkEntriesHtml_(safeWorkPagination.firstEntries, safeWorkPagination.hasContinuation ? 0 : 7);
  const topGridRowHeight = 36;
  const topGridCellStyle = 'min-height:' + topGridRowHeight + 'px';
  const topGridTripleCellStyle = mergePreviewCellStyles_('font-weight:700', 'min-height:' + (topGridRowHeight * 3) + 'px');
  const topGridDoubleCellStyle = mergePreviewCellStyles_('font-weight:700', 'min-height:' + (topGridRowHeight * 2) + 'px');

  const rows = [
    renderTemplateLikeGridRow_([
      { colspan: 2, background: '#d9d9d9', html: '<strong>일자</strong>' },
      { colspan: 4, html: escapeHtmlForPreview_(formatPreviewDateLabel_(report.date)) },
      { colspan: 2, background: '#d9d9d9', html: '<strong>운영시간</strong>' },
      { colspan: 3, html: escapeHtmlForPreview_(toPreviewValue_(report.operatingHours)) },
      { colspan: 1, background: '#d9d9d9', html: '<strong>담당자</strong>' },
      { colspan: 2, html: escapeHtmlForPreview_(toPreviewValue_(report.manager)) }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, rowspan: 3, background: '#d9d9d9', html: renderCompactLeftLabelHtml_('아동 현황', '(취약구분)'), style: topGridTripleCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>성별</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>취학전</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>탈학교</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>초등<br>학교</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>중학교</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>고등<br>학교</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>기타</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>계</strong>', style: topGridCellStyle },
      { colspan: 2, rowspan: 3, background: '#d9d9d9', html: '급식현황', style: topGridTripleCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>조식</strong>', style: topGridCellStyle },
      { colspan: 2, html: mealBreakfast, style: topGridCellStyle }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>남</strong>', style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[0]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[1]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[2]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[3]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[4]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(male[5]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_((male || []).reduce(function(sum, value) { return sum + (Number(value) || 0); }, 0)), style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>중식</strong>', style: topGridCellStyle },
      { colspan: 2, html: mealLunch, style: topGridCellStyle }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>여</strong>', style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[0]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[1]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[2]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[3]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[4]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(female[5]), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_((female || []).reduce(function(sum, value) { return sum + (Number(value) || 0); }, 0)), style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>석식</strong>', style: topGridCellStyle },
      { colspan: 2, html: mealDinner, style: topGridCellStyle }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, rowspan: 2, background: '#d9d9d9', html: renderCompactLeftLabelHtml_('아동 출석', '(출석구분)'), style: topGridDoubleCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>정원</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>현원</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>출석</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>공결</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>대체<br>출석</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>결석</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>기타</strong>', style: topGridCellStyle },
      { colspan: 2, rowspan: 2, background: '#d9d9d9', html: '교사현황', style: topGridDoubleCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>종사자</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>교사</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>공익</strong>', style: topGridCellStyle },
      { colspan: 1, background: '#d9d9d9', html: '<strong>기타</strong>', style: topGridCellStyle }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, html: previewNumberHtml_(report.attendanceCapacity), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.attendanceCurrent), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.attendancePresent), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.attendanceOfficial), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.attendanceAlternative), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.attendanceAbsent), style: topGridCellStyle },
      { colspan: 1, html: previewAttendanceOtherHtml_(report), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.staffWorker), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.staffTeacher), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.staffPublic), style: topGridCellStyle },
      { colspan: 1, html: previewNumberHtml_(report.staffOther), style: topGridCellStyle }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '지도 및<br><span style="white-space:nowrap!important">협의사항</span>', style: 'font-weight:700;font-size:9.2px!important;letter-spacing:-0.5px;line-height:1.12!important' },
      { colspan: 13, html: '<strong>생활지도 :</strong> ' + (guidance1 || '&nbsp;') + '<br><strong>위생지도 :</strong> ' + (guidance2 || '&nbsp;') + '<br><strong>안전지도 :</strong> ' + (guidance3 || '&nbsp;'), align: 'left', style: 'line-height:1.45!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 14, background: '#d9d9d9', html: '<strong>통합 관리</strong>' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>종사자</strong>' },
      { colspan: 13, html: previewMultilineTextHtml_(buildManagementPreviewText_(report, 'staff')) || '&nbsp;', align: 'left' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>아동</strong>' },
      { colspan: 13, html: previewMultilineTextHtml_(buildManagementPreviewText_(report, 'child')) || '&nbsp;', align: 'left' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>방문자</strong>' },
      { colspan: 13, html: previewMultilineTextHtml_(report.visitorReason) || '&nbsp;', align: 'left', style: 'min-height:28px;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>시설</strong>' },
      { colspan: 13, html: previewMultilineTextHtml_(buildManagementPreviewText_(report, 'facility')) || '&nbsp;', align: 'left' }
    ]),
    renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '업무<br>내용', className: 'log-work-label-cell', style: 'font-weight:700;height:250px!important;vertical-align:middle!important' },
      { colspan: 13, html: renderWorkContentHtml_(workLines), align: 'left', className: 'log-work-content-cell', style: 'height:250px!important;min-height:250px!important;vertical-align:top!important;padding:7px 8px!important;line-height:1.45!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;line-break:auto!important' }
    ])
  ];

  if (!safeWorkPagination.hasContinuation) {
    rows.push(renderTemplateLikeGridRow_([
      { colspan: 1, background: '#d9d9d9', html: '<strong>기타</strong>' },
      { colspan: 13, html: previewMultilineTextHtml_(report.miscNotes) || '&nbsp;', align: 'left' }
    ]));
  }

  return '<table class="log-template-table" style="width:100%!important;max-width:100%!important;min-width:0!important;height:var(--log-main-table-height);border-collapse:collapse;table-layout:fixed;border-spacing:0;margin:0 auto 12px;box-sizing:border-box!important;overflow:visible">' + renderTemplateLikeWeightedColGroup_([0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98, 0.99]) + rows.join('') + '</table>';
}

function renderTitleWithApprovalHtml_(title, subtitle, report, extraMetaHtml, reportIndex) {
  const slots = report && Array.isArray(report.approvalSlots) ? report.approvalSlots : [];
  if (!slots.length) {
    return '<table class="log-title-table" style="width:100%!important;max-width:100%!important;min-width:0!important;border-collapse:collapse;table-layout:fixed;border-spacing:0;margin:0 0 8px;background:#fff;box-sizing:border-box!important;overflow:hidden">' +
      '<tr>' +
        '<td style="box-sizing:border-box!important;border:1px solid #9b9b9b;padding:6px 8px!important;background:#fff;text-align:center;vertical-align:middle;min-height:76px;overflow:hidden">' +
          '<div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.18;word-break:break-all">' + escapeHtmlForPreview_(title) + '</div>' +
          (subtitle ? '<div style="font-size:12px;color:#4b5563;margin-top:2px;line-height:1.3">' + escapeHtmlForPreview_(subtitle) + '</div>' : '') +
          (extraMetaHtml ? '<div style="font-size:12px;color:#374151;margin-top:8px;line-height:1.6">' + extraMetaHtml + '</div>' : '') +
        '</td>' +
      '</tr>' +
    '</table>';
  }

  const labelCells = slots.map(function(slot) {
    const label = escapeHtmlForPreview_(toPreviewValue_(slot && slot.label || '결재'));
    return '<td style="box-sizing:border-box!important;width:58px;min-width:0;max-width:58px;height:16px!important;border:1px solid #d1d5db;padding:0 2px!important;background:' + PREVIEW_TABLE_HEADER_BACKGROUND + ';text-align:center;vertical-align:middle;font-size:9px!important;font-weight:700;line-height:1.05;color:#111827;overflow:hidden;word-break:break-all">' +
      label +
      '</td>';
  }).join('');
  const stampCells = slots.map(function(slot) {
    const label = escapeHtmlForPreview_(toPreviewValue_(slot && slot.label || '결재'));
    const stampUrl = toPreviewValue_(slot && slot.stampUrl || '');
    const content = stampUrl
      ? '<img class="approval-stamp" src="' + escapeHtmlForPreview_(stampUrl) + '" alt="' + label + ' 도장" style="display:block;margin:0 auto;max-width:34px!important;max-height:34px!important">'
      : '<div style="height:34px"></div>';
    return '<td style="box-sizing:border-box!important;width:58px;min-width:0;max-width:58px;height:42px!important;border:1px solid #d1d5db;padding:2px!important;background:#fff;text-align:center;vertical-align:middle;overflow:hidden">' +
      content +
      '</td>';
  }).join('');

  return '<table class="log-title-table" style="width:100%!important;max-width:100%!important;min-width:0!important;border-collapse:collapse;table-layout:fixed;border-spacing:0;margin:0 0 16px;background:#fff;box-sizing:border-box!important;overflow:hidden">' +
    '<tr>' +
      '<td rowspan="2" style="box-sizing:border-box!important;border:0;padding:6px 8px!important;background:#fff;text-align:center;vertical-align:middle;min-height:82px;overflow:hidden">' +
        '<div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.18;word-break:break-all">' + escapeHtmlForPreview_(title) + '</div>' +
        (subtitle ? '<div style="font-size:12px;color:#4b5563;margin-top:2px;line-height:1.3">' + escapeHtmlForPreview_(subtitle) + '</div>' : '') +
        (extraMetaHtml ? '<div style="font-size:12px;color:#374151;margin-top:8px;line-height:1.6">' + extraMetaHtml + '</div>' : '') +
      '</td>' +
      '<td rowspan="2" style="box-sizing:border-box!important;width:20px;min-width:20px;max-width:20px;height:58px!important;border:1px solid #d1d5db;padding:0!important;background:' + PREVIEW_TABLE_HEADER_BACKGROUND + ';text-align:center;vertical-align:middle;font-size:9px!important;font-weight:800;color:#111827;line-height:1.15;letter-spacing:0;overflow:hidden">결<br>재</td>' +
      labelCells +
    '</tr>' +
    '<tr>' +
      stampCells +
    '</tr>' +
  '</table>';
}

function renderLightweightReportPageHtml_(report, reportIndex, pageIndex, pageCount, workPagination) {
  return '<div class="page" data-page-index="' + pageIndex + '">' +
    '<div class="page-inner">' +
      renderTitleWithApprovalHtml_(
        '운영일지(아동)',
        '',
        report,
        '',
        reportIndex
      ) +
      renderTemplateLikeSheetHtml_(report, workPagination) +
    '</div>' +
  '</div>';
}

function renderLightweightContinuationPageHtml_(report, reportIndex, pageIndex, pageCount, entries, includeMiscNotes) {
  return '<div class="page" data-page-index="' + pageIndex + '">' +
    '<div class="page-inner">' +
      renderTitleWithApprovalHtml_(
        '운영일지(아동)',
        '',
        report,
        '',
        reportIndex
      ) +
      renderWorkContinuationTableHtml_(entries) +
      (includeMiscNotes ? renderMiscNotesRowHtml_(report) : '') +
    '</div>' +
  '</div>';
}

function renderLightweightProgramPageHtml_(report, reportIndex, pageIndex, pageCount, entries, includeMiscNotes) {
  const continuationHtml = entries && entries.length ? renderWorkContinuationTableHtml_(entries) : '';
  return '<div class="page" data-page-index="' + pageIndex + '">' +
    '<div class="page-inner">' +
      renderTitleWithApprovalHtml_(
        '운영일지(아동)',
        '',
        report,
        '',
        reportIndex
      ) +
      continuationHtml +
      (includeMiscNotes ? renderMiscNotesRowHtml_(report) : '') +
      renderSectionTitleHtml_('프로그램일지') +
      renderProgramItemTablesHtml_(report) +
    '</div>' +
  '</div>';
}

function countLightweightPreviewPagesForReport_(report) {
  const workPagination = paginateReportWorksForPreview_(report);
  const programPageCount = report && report.hasProgramPage && Array.isArray(report.programTexts) && report.programTexts.length ? 1 : 0;
  if (!workPagination.continuationChunks.length) {
    return 1 + programPageCount;
  }
  if (programPageCount) {
    return 1 + Math.max(workPagination.continuationChunks.length, 1);
  }
  return 1 + workPagination.continuationChunks.length;
}

function countLightweightPreviewPages_(reports) {
  return (Array.isArray(reports) ? reports : []).reduce(function(total, report) {
    return total + countLightweightPreviewPagesForReport_(report);
  }, 0);
}

function buildLightweightPreviewPagesHtml_(payload) {
  const reports = payload && Array.isArray(payload.reports) ? payload.reports : [];
  const pageCount = payload && payload.pageCount ? payload.pageCount : countLightweightPreviewPages_(reports);
  const pages = [];

  reports.forEach(function(report, reportIndex) {
    const workPagination = paginateReportWorksForPreview_(report);
    const hasProgramPage = !!(report && report.hasProgramPage && Array.isArray(report.programTexts) && report.programTexts.length);
    const continuationChunks = workPagination.continuationChunks.slice();
    pages.push(renderLightweightReportPageHtml_(report, reportIndex, pages.length, pageCount, workPagination));

    if (hasProgramPage) {
      const programContinuation = continuationChunks.length ? continuationChunks.pop() : [];
      continuationChunks.forEach(function(chunk) {
        pages.push(renderLightweightContinuationPageHtml_(report, reportIndex, pages.length, pageCount, chunk, false));
      });
      pages.push(renderLightweightProgramPageHtml_(report, reportIndex, pages.length, pageCount, programContinuation, workPagination.hasContinuation));
    } else {
      continuationChunks.forEach(function(chunk, chunkIndex) {
        pages.push(renderLightweightContinuationPageHtml_(
          report,
          reportIndex,
          pages.length,
          pageCount,
          chunk,
          chunkIndex === continuationChunks.length - 1
        ));
      });
    }
  });

  return pages.join('');
}

function buildTemplateDrivenPreviewHtmlPayload_(rowNumbers, selectedYear, autoPrint) {
  const payload = buildTemplateDrivenPreviewPayload_(rowNumbers, selectedYear, autoPrint);
  return {
    pageCount: payload.pageCount,
    autoPrint: !!payload.autoPrint,
    selectedYear: payload.selectedYear || '',
    generatedAt: payload.generatedAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
    reports: payload.reports,
    pagesHtml: buildLightweightPreviewPagesHtml_(payload),
  };
}

function getTemplateDrivenPreviewHtmlPayload(rowNumbers, selectedYear, autoPrint) {
  return buildTemplateDrivenPreviewHtmlPayload_(rowNumbers, selectedYear, autoPrint);
}

function buildTemplateDrivenPreviewHtmlPayloadFromReports_(reports, selectedYear, autoPrint) {
  const safeReports = (Array.isArray(reports) ? reports : []).map(function(report) {
    return withDefaultGuidanceFields_(report);
  });
  const pageCount = countLightweightPreviewPages_(safeReports);
  const payload = {
    reports: safeReports,
    pageCount: pageCount,
    selectedYear: normalizeAttendanceYear_(selectedYear) || '',
    autoPrint: !!autoPrint,
  };
  return {
    pageCount: payload.pageCount,
    autoPrint: !!payload.autoPrint,
    selectedYear: payload.selectedYear || '',
    generatedAt: payload.generatedAt || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || LOG_PRINT_CONFIG.DEFAULT_TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
    reports: payload.reports,
    pagesHtml: buildLightweightPreviewPagesHtml_(payload),
  };
}

function renderTemplateDrivenPreviewHtmlFromReports(reports, selectedYear, autoPrint) {
  return buildTemplateDrivenPreviewHtmlPayloadFromReports_(reports, selectedYear, autoPrint);
}

function previewLogsByRowNumbers(rowNumbers, selectedYear, autoPrint) {
  try {
    const template = HtmlService.createTemplate(buildTemplateDrivenPreviewTemplate_());
    const normalizedRows = normalizeRowNumbers_(rowNumbers);
    if (!normalizedRows.length) {
      throw new Error('미리보기할 데이터가 없습니다.');
    }
    const requestPayloadJson = JSON.stringify({
      rowNumbers: normalizedRows,
      selectedYear: normalizeAttendanceYear_(selectedYear) || '',
      autoPrint: !!autoPrint,
    });
    const bootInfoJson = JSON.stringify({
      requestedRows: normalizedRows.length,
      selectedYear: normalizeAttendanceYear_(selectedYear) || '',
      autoPrint: !!autoPrint,
    });
    template.requestPayloadBase64 = encodeJsonForHtmlPayload_(requestPayloadJson);
    template.bootInfoJson = bootInfoJson;
    template.bootInfoBase64 = encodeJsonForHtmlPayload_(bootInfoJson);

    const htmlOutput = template.evaluate()
      .setWidth(LOG_PRINT_CONFIG.DIALOG_WIDTH)
      .setHeight(LOG_PRINT_CONFIG.DIALOG_HEIGHT);

    // Keep the attendance stats dialog visible behind the print preview.
    SpreadsheetApp.getUi().showModelessDialog(htmlOutput, LOG_PRINT_CONFIG.DIALOG_TITLE);
  } catch (error) {
    Logger.log('previewLogsByRowNumbers failed: %s\n%s', error.message, error.stack || '');
    throw error;
  }
}

function previewLogsByRowNumbersExperimental(rowNumbers, selectedYear, autoPrint) {
  try {
    const uniqueRowNumbers = normalizeRowNumbers_(rowNumbers);

    if (!uniqueRowNumbers.length) {
      throw new Error('미리보기할 데이터가 없습니다.');
    }

    const template = HtmlService.createTemplate(buildTemplateSheetPdfPreviewTemplate_());
    const initialDataJson = JSON.stringify({
      selectedYear: normalizeAttendanceYear_(selectedYear) || '',
      requestRowNumbers: uniqueRowNumbers,
      autoPrint: !!autoPrint,
    });
    template.initialDataJson = initialDataJson;
    template.initialDataBase64 = encodeJsonForHtmlPayload_(initialDataJson);

    const htmlOutput = template.evaluate()
      .setWidth(LOG_PRINT_CONFIG.DIALOG_WIDTH)
      .setHeight(LOG_PRINT_CONFIG.DIALOG_HEIGHT);

    // Keep the attendance stats dialog visible behind the print preview.
    SpreadsheetApp.getUi().showModelessDialog(htmlOutput, LOG_PRINT_CONFIG.DIALOG_TITLE + ' (최종 PDF)');
  } catch (error) {
    Logger.log('previewLogsByRowNumbersExperimental failed: %s\n%s', error.message, error.stack || '');
    throw error;
  }
}

function generateTemplateSheetPreviewPdfPayload(rowNumbers, selectedYear, options) {
  const reports = buildTemplateReportsByRowNumbers_(rowNumbers, selectedYear);
  const safeOptions = options || {};

  if (!reports.length) {
    throw new Error('미리보기할 데이터가 없습니다.');
  }

  const previewPdf = buildTemplateSheetPreviewPdf_(reports, selectedYear, safeOptions);
  return {
    pageCount: reports.length,
    selectedYear: normalizeAttendanceYear_(selectedYear) || '',
    pdfBase64: previewPdf.pdfBase64,
    fileId: previewPdf.fileId || '',
    openUrl: previewPdf.openUrl || '',
    downloadUrl: previewPdf.downloadUrl || '',
    fileName: previewPdf.fileName,
    debug: previewPdf.debug,
  };
}

function savePreviewEdits(payload) {
  const selectedYear = payload && payload.year ? payload.year : '';
  return withYearWriteLock_(selectedYear, '미리보기 편집 저장', function() {
    return savePreviewEditsUnlocked_(payload);
  });
}

function savePreviewEditsUnlocked_(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = payload && payload.year ? payload.year : '';
  const logDataResult = resolveLogDataSheet_(spreadsheet, selectedYear);
  const sheet = logDataResult.sheet;

  if (!sheet) {
    throw new Error(logDataResult.errorMessage || ("'" + getLogDataSheetNameByYear_(logDataResult.year) + "' 시트를 찾을 수 없습니다."));
  }

  ensureLogDetailColumnsInLogSheet_(sheet);
  const fieldMap = getFieldMap_(sheet);
  const reports = payload && payload.reports ? payload.reports : [];

  const validReports = reports.filter(function(report) {
    const rowNumber = Number(report.rowNumber);
    return rowNumber && rowNumber >= LOG_PRINT_CONFIG.DATA_START_ROW;
  });

  if (validReports.length > 0) {
    const rowNumbers = validReports.map(function(r) { return Number(r.rowNumber); });
    const minRow = Math.min.apply(null, rowNumbers);
    const maxRow = Math.max.apply(null, rowNumbers);
    const totalCols = sheet.getLastColumn();
    const allValues = sheet.getRange(minRow, 1, maxRow - minRow + 1, totalCols).getValues();

    validReports.forEach(function(report) {
      normalizeReportMealFields_(report);
      const rowNumber = Number(report.rowNumber);
      const row = allValues[rowNumber - minRow];

      row[fieldMap.DATE] = report.date || '';
      row[fieldMap.OPERATING_HOURS] = report.operatingHours || '';
      row[fieldMap.MANAGER] = report.manager || '';

      CHILD_MALE_FIELDS.forEach(function(fieldKey, index) {
        row[fieldMap[fieldKey]] = toNumber_(report.maleCounts[index]);
      });

      CHILD_FEMALE_FIELDS.forEach(function(fieldKey, index) {
        row[fieldMap[fieldKey]] = toNumber_(report.femaleCounts[index]);
      });

      row[fieldMap.STAFF_WORKER] = toNumber_(report.staffWorker);
      row[fieldMap.STAFF_TEACHER] = toNumber_(report.staffTeacher);
      row[fieldMap.STAFF_PUBLIC] = toNumber_(report.staffPublic);
      row[fieldMap.STAFF_OTHER] = toNumber_(report.staffOther);
      row[fieldMap.STAFF_CHANGES] = report.staffChanges || '';
      row[fieldMap.CHILD_CHANGES] = report.childChanges || '';

      var optionalNumericFields = [
        ['MEAL_BREAKFAST', report.mealBreakfast],
        ['MEAL_LUNCH', report.mealLunch],
        ['MEAL_DINNER', report.mealDinner],
        ['ATTENDANCE_CAPACITY', report.attendanceCapacity],
        ['ATTENDANCE_OFFICIAL', report.attendanceOfficial],
        ['ATTENDANCE_ALTERNATIVE', report.attendanceAlternative],
        ['ATTENDANCE_ABSENT', report.attendanceAbsent],
        ['ATTENDANCE_OTHER', report.attendanceOther],
      ];
      optionalNumericFields.forEach(function(pair) {
        var colIndex = fieldMap[pair[0]];
        if (colIndex !== null && colIndex !== undefined) {
          row[colIndex] = toNumber_(pair[1]);
        }
      });

      var optionalTextFields = [
        ['VISITOR_REASON', report.visitorReason],
        ['CHILD_SPECIAL_COUNSELING', report.childSpecialCounseling],
        ['FACILITY_SAFETY_HYGIENE', report.facilitySafetyHygiene],
        ['SUPPLIES_ENVIRONMENT', report.suppliesEnvironment],
        ['STAFF_EDUCATION_TRIP', report.staffEducationTrip],
        ['MISC_NOTES', mergeProgramJournalMarkerIntoNotes_(report.miscNotes, report.programTexts || [])],
      ];
      optionalTextFields.forEach(function(pair) {
        var colIndex = fieldMap[pair[0]];
        if (colIndex !== null && colIndex !== undefined) {
          row[colIndex] = pair[1] || '';
        }
      });

      (fieldMap.WORKS || []).forEach(function(colIndex, index) {
        row[colIndex] = (report.works && report.works[index]) || '';
      });
    });

    sheet.getRange(minRow, 1, maxRow - minRow + 1, totalCols).setValues(allValues);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    savedCount: reports.length,
  };
}

function normalizeReportMealFields_(report) {
  if (!report) {
    return;
  }
  const mealLunch = toNumber_(report.mealLunch);
  const mealDinner = toNumber_(report.mealDinner);
  if (mealLunch > 0) {
    report.mealLunch = mealLunch;
    report.mealDinner = 0;
    return;
  }
  if (mealDinner > 0) {
    report.mealLunch = 0;
    report.mealDinner = mealDinner;
    return;
  }
  report.mealLunch = mealLunch;
  report.mealDinner = mealDinner;
}

function applyTemplateEditSheetValuesToReport_(report, sheet, markerMap) {
  (markerMap || []).forEach(function(marker) {
    if (!marker || !marker.a1 || !marker.fieldKey) {
      return;
    }

    const range = sheet.getRange(marker.a1);
    const rawValue = range.getValue();
    const displayValue = range.getDisplayValue();
    applyTemplateFieldValueToReport_(report, marker.fieldKey, rawValue, displayValue);
  });
}

function applyTemplateFieldValueToReport_(report, fieldKey, rawValue, displayValue) {
  switch (fieldKey) {
    case 'DATE':
      report.date = hasDisplayValue_(displayValue) ? String(displayValue).trim() : valueOrEmpty_(rawValue);
      return;
    case 'OPERATING_HOURS':
      report.operatingHours = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'MANAGER':
      report.manager = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'MALE_PRESCHOOL':
      report.maleCounts[0] = toNumber_(rawValue);
      return;
    case 'MALE_OUT_OF_SCHOOL':
      report.maleCounts[1] = toNumber_(rawValue);
      return;
    case 'MALE_ELEMENTARY':
      report.maleCounts[2] = toNumber_(rawValue);
      return;
    case 'MALE_MIDDLE':
      report.maleCounts[3] = toNumber_(rawValue);
      return;
    case 'MALE_HIGH':
      report.maleCounts[4] = toNumber_(rawValue);
      return;
    case 'MALE_OTHER':
      report.maleCounts[5] = toNumber_(rawValue);
      return;
    case 'FEMALE_PRESCHOOL':
      report.femaleCounts[0] = toNumber_(rawValue);
      return;
    case 'FEMALE_OUT_OF_SCHOOL':
      report.femaleCounts[1] = toNumber_(rawValue);
      return;
    case 'FEMALE_ELEMENTARY':
      report.femaleCounts[2] = toNumber_(rawValue);
      return;
    case 'FEMALE_MIDDLE':
      report.femaleCounts[3] = toNumber_(rawValue);
      return;
    case 'FEMALE_HIGH':
      report.femaleCounts[4] = toNumber_(rawValue);
      return;
    case 'FEMALE_OTHER':
      report.femaleCounts[5] = toNumber_(rawValue);
      return;
    case 'MEAL_BREAKFAST':
      report.mealBreakfast = toNumber_(rawValue);
      return;
    case 'MEAL_LUNCH':
      report.mealLunch = toNumber_(rawValue);
      if (report.mealLunch > 0) {
        report.mealDinner = 0;
      }
      return;
    case 'MEAL_DINNER':
      report.mealDinner = toNumber_(rawValue);
      if (report.mealDinner > 0) {
        report.mealLunch = 0;
      }
      return;
    case 'ATTENDANCE_CAPACITY':
      report.attendanceCapacity = toNumber_(rawValue);
      return;
    case 'ATTENDANCE_OFFICIAL':
      report.attendanceOfficial = toNumber_(rawValue);
      return;
    case 'ATTENDANCE_ALTERNATIVE':
      report.attendanceAlternative = toNumber_(rawValue);
      return;
    case 'ATTENDANCE_ABSENT':
      report.attendanceAbsent = toNumber_(rawValue);
      return;
    case 'ATTENDANCE_OTHER':
      report.attendanceOther = toNumber_(rawValue);
      return;
    case 'STAFF_WORKER':
      report.staffWorker = toNumber_(rawValue);
      return;
    case 'STAFF_TEACHER':
      report.staffTeacher = toNumber_(rawValue);
      return;
    case 'STAFF_PUBLIC':
      report.staffPublic = toNumber_(rawValue);
      return;
    case 'STAFF_OTHER':
      report.staffOther = toNumber_(rawValue);
      return;
    case 'STAFF_CHANGES':
      report.staffChanges = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'CHILD_CHANGES':
      report.childChanges = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'VISITOR_REASON':
      report.visitorReason = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'CHILD_SPECIAL_COUNSELING':
      report.childSpecialCounseling = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'FACILITY_SAFETY_HYGIENE':
      report.facilitySafetyHygiene = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'SUPPLIES_ENVIRONMENT':
      report.suppliesEnvironment = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'STAFF_EDUCATION_TRIP':
      report.staffEducationTrip = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'MISC_NOTES':
      report.miscNotes = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_1':
      report.works[0] = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_2':
      report.works[1] = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_3':
      report.works[2] = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_4':
      report.works[3] = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_5':
      report.works[4] = valueOrEmpty_(displayValue || rawValue);
      return;
    case 'WORK_6_7':
      var lines = String(displayValue || rawValue || '').split(/\r?\n/);
      report.works[5] = valueOrEmpty_(lines[0]);
      report.works[6] = valueOrEmpty_(lines.slice(1).join('\n'));
      return;
    default:
      return;
  }
}

function parseTemplateBindingNote_(note) {
  if (!note || String(note).indexOf(LOG_PRINT_CONFIG.TEMPLATE_MARKER_NOTE_PREFIX) !== 0) {
    return null;
  }

  const fieldLine = String(note).split('\n').find(function(line) {
    return line.indexOf('field=') === 0;
  });

  if (!fieldLine) {
    return null;
  }

  return {
    fieldKey: fieldLine.replace('field=', '').trim(),
  };
}

function getWorksValues_(row, fieldMap) {
  const workValues = (fieldMap.WORKS || []).map(function(colIndex) {
    return valueOrEmpty_(row[colIndex]);
  });

  while (workValues.length < 7) {
    workValues.push('');
  }

  return workValues;
}
