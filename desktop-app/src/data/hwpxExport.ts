import JSZip from 'jszip';
import { invoke } from '@tauri-apps/api/core';

const META_INF_CONTAINER_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
  + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"'
  + ' xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">'
  + '<ocf:rootfiles>'
  + '<ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>'
  + '<ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/>'
  + '<ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/>'
  + '</ocf:rootfiles>'
  + '</ocf:container>';

const META_INF_CONTAINER_RDF = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
  + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
  + '<rdf:Description rdf:about="">'
  + '<ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/>'
  + '</rdf:Description>'
  + '<rdf:Description rdf:about="Contents/header.xml">'
  + '<rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/>'
  + '</rdf:Description>'
  + '<rdf:Description rdf:about="">'
  + '<ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/>'
  + '</rdf:Description>'
  + '<rdf:Description rdf:about="Contents/section0.xml">'
  + '<rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/>'
  + '</rdf:Description>'
  + '<rdf:Description rdf:about="">'
  + '<rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>'
  + '</rdf:Description>'
  + '</rdf:RDF>';

const META_INF_MANIFEST_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'
  + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>';

const PREVIEW_IMAGE_PNG = new Uint8Array([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x04, 0x00, 0x00, 0x00, 0xB5, 0x1C, 0x0C,
  0x02, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9C, 0x63, 0x64, 0x60, 0x00, 0x00,
  0x00, 0x05, 0x00, 0x01, 0x6F, 0x68, 0x67, 0xBC,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
  0xAE, 0x42, 0x60, 0x82
]);

const PARA_CLOSE = '</hp:p></hs:sec>';

type HwpxBaseAssets = {
  content: string;
  header: string;
  section: string;
  settings: string;
  version: string;
};

let cachedBaseAssets: HwpxBaseAssets | null = null;

async function loadTextAsset(name: string) {
  const response = await fetch(new URL(`hwpx/${name}`, window.location.href));
  if (!response.ok) {
    throw new Error(`${name} 기본 파일을 불러오지 못했습니다.`);
  }
  return response.text();
}

async function loadBaseAssets() {
  if (cachedBaseAssets) return cachedBaseAssets;
  const [content, header, section, settings, version] = await Promise.all([
    loadTextAsset('empty_content.hpf'),
    loadTextAsset('empty_header.xml'),
    loadTextAsset('empty_section0.xml'),
    loadTextAsset('settings.xml'),
    loadTextAsset('version.xml')
  ]);
  cachedBaseAssets = { content, header, section, settings, version };
  return cachedBaseAssets;
}

function cleanText(value: string | null | undefined) {
  return (value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderTextXml(value: string) {
  let output = '<hp:t>';
  Array.from(value).forEach((char) => {
    if (char === '\t') {
      output += '<hp:tab width="4000" leader="0" type="1"/>';
    } else if (char === '\n') {
      output += '<hp:lineBreak/>';
    } else {
      output += escapeXml(char);
    }
  });
  return `${output}</hp:t>`;
}

function renderLineSegs(text: string, paragraphIndex: number) {
  const lineCount = Math.max(1, text.split('\n').length);
  const baseVert = paragraphIndex * 1600;
  return Array.from({ length: lineCount }, (_, index) => {
    const textpos = index === 0 ? 0 : index * 2;
    return `<hp:lineseg textpos="${textpos}" vertpos="${baseVert + index * 1600}" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="${HWPX_TEXT_WIDTH}" flags="393216"/>`;
  }).join('');
}

function applyHwpxPageSetup(sectionXml: string) {
  return sectionXml.replace(
    /<hp:margin header="\d+" footer="\d+" gutter="\d+" left="\d+" right="\d+" top="\d+" bottom="\d+"\/>/,
    '<hp:margin header="4252" footer="4252" gutter="0" left="2835" right="2835" top="4252" bottom="5102"/>'
  );
}

function renderTableLineSeg(paragraphIndex: number) {
  const baseVert = paragraphIndex * 1600;
  return `<hp:lineseg textpos="0" vertpos="${baseVert}" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="0" flags="393216"/>`;
}

function mmToHwpx(value: number | null | undefined) {
  if (!Number.isFinite(value || 0)) return 0;
  return Math.round((value || 0) * 283.465);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type ParsedHwpxCell = {
  text: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  gray: boolean;
  align: 'left' | 'center';
  kind: HwpxCellKind;
  desiredHeight: number;
};

type HwpxCellKind =
  | 'title'
  | 'approvalLabel'
  | 'approvalHead'
  | 'stamp'
  | 'gray'
  | 'work'
  | 'left'
  | 'body';

type ParsedHwpxTable = {
  cells: ParsedHwpxCell[];
  rowCount: number;
  colCount: number;
  columnWidths: number[];
  rowHeights: number[];
};

type HwpxTableKind = 'title' | 'journal' | 'generic';

type ParsedHwpxHtml = {
  tables: ParsedHwpxTable[];
  lines: string[];
};

export type HwpxTablePositionMode = 'fixed' | 'edit';

export type HwpxTablePositionOptions = {
  mode?: HwpxTablePositionMode;
  horizontalMm?: number;
  verticalMm?: number;
  widthPercent?: number;
};

type HwpxExportOptions = {
  preferNative?: boolean;
  allowFallback?: boolean;
  tablePosition?: HwpxTablePositionOptions;
};

const HWPX_TEXT_WIDTH = 53858;
const HWPX_TABLE_WIDTH = 53292;
const HWPX_CELL_BORDER_WHITE = 3;
const HWPX_CELL_BORDER_GRAY = 4;
const HWPX_TABLE_CENTER_PARA = 20;
const HWPX_TABLE_LEFT_PARA = 11;
const HWPX_TABLE_LEFT_COMPACT_PARA = 21;
const HWPX_CHAR_BODY = 30;
const HWPX_CHAR_LABEL = 31;
const HWPX_CHAR_TITLE = 32;
const HWPX_CHAR_SMALL = 33;
const HWPX_CHAR_STAMP = 34;

function getTablePosition(tableIndex: number, options?: HwpxTablePositionOptions) {
  const horizontal = clampNumber(mmToHwpx(options?.horizontalMm), -4252, 4252);
  const vertical = clampNumber(mmToHwpx(options?.verticalMm), -2835, 8504);
  const editMode = options?.mode === 'edit';
  const widthPercent = clampNumber(options?.widthPercent ?? 100, 75, 100);
  const tableWidth = Math.round(HWPX_TABLE_WIDTH * widthPercent / 100);
  const baseLeft = 283;
  const baseRight = 283;
  const baseTop = 120;

  return {
    editMode,
    horizontal,
    vertical,
    tableWidth,
    leftMargin: clampNumber(baseLeft + horizontal, 0, 8504),
    rightMargin: clampNumber(baseRight - horizontal, 0, 8504),
    topMargin: tableIndex === 0 ? clampNumber(baseTop + Math.max(0, vertical), 0, 8504) : baseTop
  };
}

function normalizeTextLines(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function elementTextWithBreaks(element: Element) {
  const chunks: string[] = [];
  const blockTags = new Set(['DIV', 'P', 'LI']);
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      chunks.push(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as Element;
    const tagName = child.tagName.toUpperCase();
    if (tagName === 'BR') {
      chunks.push('\n');
      return;
    }
    if (tagName === 'IMG') {
      const alt = child.getAttribute('alt') || '';
      if (alt) chunks.push(alt);
      return;
    }
    const startsBlock = blockTags.has(tagName);
    if (startsBlock && chunks.length && !chunks[chunks.length - 1].endsWith('\n')) {
      chunks.push('\n');
    }
    child.childNodes.forEach(walk);
    if (startsBlock && chunks.length && !chunks[chunks.length - 1].endsWith('\n')) {
      chunks.push('\n');
    }
  };
  element.childNodes.forEach(walk);
  return normalizeTextLines(chunks.join(''));
}

function parsePixelValue(value: string | null | undefined, property: string) {
  if (!value) return null;
  const regex = new RegExp(`${property}\\s*:\\s*([0-9.]+)px`, 'i');
  const match = value.match(regex);
  return match ? Number(match[1]) : null;
}

function isGrayCell(cell: Element) {
  const className = String((cell as HTMLElement).className || '').toLowerCase();
  const style = String(cell.getAttribute('style') || '').toLowerCase();
  return className.includes('gray')
    || style.includes('#d9d9d9')
    || style.includes('217, 217, 217')
    || style.includes('background: rgb(245, 245, 245)')
    || style.includes('background:#f5f5f5');
}

function getCellAlign(cell: Element): 'left' | 'center' {
  const className = String((cell as HTMLElement).className || '').toLowerCase();
  const style = String(cell.getAttribute('style') || '').toLowerCase();
  if (className.includes('left') || style.includes('text-align: left')) return 'left';
  return 'center';
}

function getCellKind(cell: Element, text: string): HwpxCellKind {
  const className = String((cell as HTMLElement).className || '').toLowerCase();
  const normalized = text.replace(/\s+/g, '');
  if (className.includes('journal-title') || normalized.includes('운영일지(아동)')) return 'title';
  if (className.includes('approval-stamp') || normalized.endsWith('도장')) return 'stamp';
  if (className.includes('approval-head')) return 'approvalHead';
  if (className.includes('approval-label') || normalized === '결재') return 'approvalLabel';
  if (className.includes('work-cell')) return 'work';
  if (isGrayCell(cell)) return 'gray';
  if (getCellAlign(cell) === 'left') return 'left';
  return 'body';
}

function getTableKind(table: HTMLTableElement): HwpxTableKind {
  const className = String(table.className || '').toLowerCase();
  const text = cleanText(table.textContent).replace(/\s+/g, '');
  if (className.includes('journal-title-table') || (text.includes('운영일지') && text.includes('결재'))) {
    return 'title';
  }
  if (
    className.includes('journal-main-table')
    || (text.includes('아동현황') && text.includes('업무내용') && text.includes('통합관리'))
  ) {
    return 'journal';
  }
  return 'generic';
}

function getTemplateRowHeights(kind: HwpxTableKind, rowCount: number) {
  if (kind === 'title') {
    const profile = [1200, 3200];
    return Array.from({ length: rowCount }, (_, index) => profile[index] || 1800);
  }
  if (kind === 'journal') {
    const profile = [
      2100,
      2200,
      2200,
      2200,
      2200,
      2200,
      5200,
      1500,
      1700,
      1700,
      1700,
      1700,
      18800,
      1700
    ];
    return Array.from({ length: rowCount }, (_, index) => profile[index] || 1700);
  }
  return null;
}

function isGuidanceCellText(text: string) {
  const normalized = text.replace(/\s+/g, '');
  return normalized.includes('생활지도') && normalized.includes('위생지도') && normalized.includes('안전지도');
}

function estimateCellHeight(cell: Element, text: string, kind: HwpxCellKind) {
  const inlineHeight = parsePixelValue(cell.getAttribute('style'), 'height');
  const lineCount = Math.max(1, text.split('\n').filter((line) => line.trim()).length);
  if (isGuidanceCellText(text)) {
    return Math.max(5200, 1600 + lineCount * 1200);
  }
  const base = kind === 'title'
    ? 2600
    : kind === 'stamp'
      ? 2200
      : kind === 'approvalHead'
        ? 850
        : kind === 'work'
          ? 18800
          : kind === 'left'
            ? 1200
            : 1050;
  const step = kind === 'work' ? 900 : kind === 'left' ? 660 : 520;
  const fromText = base + Math.max(0, lineCount - 1) * step;
  const fromStyle = inlineHeight ? Math.round(inlineHeight * 75) : 0;
  const min = kind === 'approvalHead' ? 800 : kind === 'stamp' ? 2100 : kind === 'title' ? 2600 : 1050;
  const max = kind === 'work' ? 26000 : 9000;
  return Math.max(min, Math.min(max, Math.max(fromText, fromStyle)));
}

function widthsFromColGroup(table: HTMLTableElement, colCount: number) {
  const cols = Array.from(table.querySelectorAll(':scope > colgroup > col'));
  if (!cols.length) return null;
  const weights = cols.slice(0, colCount).map((col) => {
    const style = col.getAttribute('style') || '';
    const percent = style.match(/width\s*:\s*([0-9.]+)%/i);
    return percent ? Number(percent[1]) : 1;
  });
  while (weights.length < colCount) weights.push(1);
  return normalizeColumnWeights(weights);
}

function inferTitleColumnWeights(table: HTMLTableElement, colCount: number) {
  const text = cleanText(table.textContent);
  if (colCount === 5 && text.includes('운영일지') && text.includes('결재')) {
    return normalizeColumnWeights([420, 24, 82, 82, 82]);
  }
  return null;
}

function normalizeColumnWeights(weights: number[]) {
  const total = weights.reduce((sum, width) => sum + Math.max(0.1, width), 0) || 1;
  let used = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return Math.max(600, HWPX_TABLE_WIDTH - used);
    const width = Math.max(600, Math.round((Math.max(0.1, weight) / total) * HWPX_TABLE_WIDTH));
    used += width;
    return width;
  });
}

function parseHtmlTable(table: HTMLTableElement): ParsedHwpxTable | null {
  const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'));
  if (!rows.length) return null;

  const occupied = new Set<string>();
  const cells: ParsedHwpxCell[] = [];
  let colCount = 0;

  rows.forEach((row, rowIndex) => {
    let colIndex = 0;
    Array.from(row.children)
      .filter((cell) => ['TD', 'TH'].includes(cell.tagName.toUpperCase()))
      .forEach((cell) => {
        while (occupied.has(`${rowIndex}:${colIndex}`)) colIndex += 1;
        const colSpan = Math.max(1, Number((cell as HTMLTableCellElement).colSpan || 1));
        const rowSpan = Math.max(1, Number((cell as HTMLTableCellElement).rowSpan || 1));
        const text = elementTextWithBreaks(cell);
        const kind = getCellKind(cell, text);
        cells.push({
          text,
          row: rowIndex,
          col: colIndex,
          rowSpan,
          colSpan,
          gray: isGrayCell(cell),
          align: getCellAlign(cell),
          kind,
          desiredHeight: estimateCellHeight(cell, text, kind)
        });
        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          for (let c = colIndex; c < colIndex + colSpan; c += 1) {
            occupied.add(`${r}:${c}`);
          }
        }
        colIndex += colSpan;
        colCount = Math.max(colCount, colIndex);
      });
  });

  if (!cells.length || !colCount) return null;

  const columnWidths = widthsFromColGroup(table, colCount)
    || inferTitleColumnWeights(table, colCount)
    || normalizeColumnWeights(Array.from({ length: colCount }, () => 1));
  const rowHeights = getTemplateRowHeights(getTableKind(table), rows.length)
    || Array.from({ length: rows.length }, () => 1180);
  cells.forEach((cell) => {
    const portion = Math.max(900, Math.round(cell.desiredHeight / Math.max(1, cell.rowSpan)));
    for (let row = cell.row; row < Math.min(rowHeights.length, cell.row + cell.rowSpan); row += 1) {
      rowHeights[row] = Math.max(rowHeights[row], portion);
    }
  });

  return {
    cells,
    rowCount: rows.length,
    colCount,
    columnWidths,
    rowHeights
  };
}

function parseHtmlForHwpx(html: string): ParsedHwpxHtml {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style,script').forEach((node) => node.remove());

  const tables = Array.from(doc.querySelectorAll('table'))
    .map((table) => parseHtmlTable(table as HTMLTableElement))
    .filter((table): table is ParsedHwpxTable => Boolean(table));

  const tableLines = tables.flatMap((table) => {
    const matrix: string[][] = Array.from({ length: table.rowCount }, () => Array.from({ length: table.colCount }, () => ''));
    table.cells.forEach((cell) => {
      matrix[cell.row][cell.col] = cell.text;
    });
    return matrix.map((row) => row.filter(Boolean).join('\t')).filter(Boolean);
  });

  if (tableLines.length) return { tables, lines: tableLines };

  const lines = cleanText(doc.body.textContent)
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean);

  return { tables: [], lines };
}

function getCellTextMetrics(cell: ParsedHwpxCell) {
  if (cell.kind === 'title') {
    return {
      charPrId: HWPX_CHAR_TITLE,
      paraId: HWPX_TABLE_CENTER_PARA,
      vertAlign: 'CENTER',
      textHeight: 1500,
      vertSize: 1680,
      baseline: 1270,
      lineStep: 1780,
      spacing: 280
    };
  }
  if (cell.kind === 'stamp') {
    return {
      charPrId: HWPX_CHAR_STAMP,
      paraId: HWPX_TABLE_CENTER_PARA,
      vertAlign: 'CENTER',
      textHeight: 820,
      vertSize: 900,
      baseline: 700,
      lineStep: 980,
      spacing: 180
    };
  }
  if (cell.kind === 'approvalLabel' || cell.kind === 'approvalHead' || cell.kind === 'gray') {
    return {
      charPrId: HWPX_CHAR_LABEL,
      paraId: HWPX_TABLE_CENTER_PARA,
      vertAlign: 'CENTER',
      textHeight: 820,
      vertSize: 900,
      baseline: 700,
      lineStep: 1020,
      spacing: 220
    };
  }
  if (cell.kind === 'work') {
    return {
      charPrId: HWPX_CHAR_BODY,
      paraId: HWPX_TABLE_LEFT_COMPACT_PARA,
      vertAlign: 'TOP',
      textHeight: 820,
      vertSize: 920,
      baseline: 700,
      lineStep: 1120,
      spacing: 300
    };
  }
  if (isGuidanceCellText(cell.text)) {
    return {
      charPrId: HWPX_CHAR_SMALL,
      paraId: HWPX_TABLE_LEFT_COMPACT_PARA,
      vertAlign: 'CENTER',
      textHeight: 760,
      vertSize: 860,
      baseline: 650,
      lineStep: 1180,
      spacing: 240
    };
  }
  if (cell.align === 'left') {
    return {
      charPrId: HWPX_CHAR_SMALL,
      paraId: HWPX_TABLE_LEFT_COMPACT_PARA,
      vertAlign: 'CENTER',
      textHeight: 760,
      vertSize: 840,
      baseline: 650,
      lineStep: 980,
      spacing: 220
    };
  }
  return {
    charPrId: HWPX_CHAR_BODY,
    paraId: HWPX_TABLE_CENTER_PARA,
    vertAlign: 'CENTER',
    textHeight: 780,
    vertSize: 860,
    baseline: 660,
    lineStep: 960,
    spacing: 220
  };
}

function renderCellLines(text: string, cellWidth: number, metrics: ReturnType<typeof getCellTextMetrics>) {
  const lineCount = Math.max(1, text.split('\n').length);
  return Array.from({ length: lineCount }, (_, index) => {
    const textpos = index === 0 ? 0 : index * 2;
    return `<hp:lineseg textpos="${textpos}" vertpos="${index * metrics.lineStep}" vertsize="${metrics.vertSize}" textheight="${metrics.textHeight}" baseline="${metrics.baseline}" spacing="${metrics.spacing}" horzpos="0" horzsize="${Math.max(800, cellWidth - 360)}" flags="393216"/>`;
  }).join('');
}

function renderCellSubList(cell: ParsedHwpxCell, cellWidth: number) {
  const metrics = getCellTextMetrics(cell);
  const text = cell.text || '';
  return `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${metrics.vertAlign}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">`
    + `<hp:p id="0" paraPrIDRef="${metrics.paraId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + `<hp:run charPrIDRef="${metrics.charPrId}">${renderTextXml(text)}</hp:run>`
    + `<hp:linesegarray>${renderCellLines(text, cellWidth, metrics)}</hp:linesegarray>`
    + '</hp:p>'
    + '</hp:subList>';
}

function renderCellMargin(cell: ParsedHwpxCell) {
  if (cell.kind === 'work') {
    return '<hp:cellMargin left="220" right="220" top="180" bottom="120"/>';
  }
  if (isGuidanceCellText(cell.text)) {
    return '<hp:cellMargin left="180" right="180" top="180" bottom="180"/>';
  }
  if (cell.align === 'left') {
    return '<hp:cellMargin left="160" right="140" top="80" bottom="80"/>';
  }
  if (cell.kind === 'approvalHead') {
    return '<hp:cellMargin left="40" right="40" top="20" bottom="20"/>';
  }
  if (cell.kind === 'approvalLabel') {
    return '<hp:cellMargin left="20" right="20" top="20" bottom="20"/>';
  }
  return '<hp:cellMargin left="100" right="100" top="70" bottom="70"/>';
}

function renderHwpxTable(table: ParsedHwpxTable, index: number, tablePosition?: HwpxTablePositionOptions) {
  const height = table.rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);
  const tableId = 9000 + index;
  const position = getTablePosition(index, tablePosition);
  const cellWidth = (cell: ParsedHwpxCell) =>
    table.columnWidths.slice(cell.col, cell.col + cell.colSpan).reduce((sum, width) => sum + width, 0);
  const cellHeight = (cell: ParsedHwpxCell) =>
    table.rowHeights.slice(cell.row, cell.row + cell.rowSpan).reduce((sum, rowHeight) => sum + rowHeight, 0);

  const rows = Array.from({ length: table.rowCount }, (_, rowIndex) => {
    const rowCells = table.cells
      .filter((cell) => cell.row === rowIndex)
      .sort((a, b) => a.col - b.col)
      .map((cell) => {
        const width = cellWidth(cell);
        const heightValue = cellHeight(cell);
        const borderFill = cell.gray ? HWPX_CELL_BORDER_GRAY : HWPX_CELL_BORDER_WHITE;
        return `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${borderFill}">`
          + renderCellSubList(cell, width)
          + `<hp:cellAddr colAddr="${cell.col}" rowAddr="${cell.row}"/>`
          + `<hp:cellSpan colSpan="${cell.colSpan}" rowSpan="${cell.rowSpan}"/>`
          + `<hp:cellSz width="${width}" height="${heightValue}"/>`
          + renderCellMargin(cell)
          + '</hp:tc>';
      }).join('');
    return `<hp:tr>${rowCells}</hp:tr>`;
  }).join('');

  return `<hp:tbl id="${tableId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="${table.rowCount}" colCnt="${table.colCount}" cellSpacing="0" borderFillIDRef="${HWPX_CELL_BORDER_WHITE}" noAdjust="0">`
    + `<hp:sz width="${position.tableWidth}" widthRelTo="ABSOLUTE" height="${height}" heightRelTo="ABSOLUTE" protect="0"/>`
    + `<hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="${position.editMode ? '0' : '1'}" allowOverlap="${position.editMode ? '1' : '0'}" holdAnchorAndSO="${position.editMode ? '1' : '0'}" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="${position.vertical}" horzOffset="${position.horizontal}"/>`
    + `<hp:outMargin left="${position.leftMargin}" right="${position.rightMargin}" top="${position.topMargin}" bottom="283"/>`
    + '<hp:inMargin left="0" right="0" top="0" bottom="0"/>'
    + rows
    + '</hp:tbl>';
}

function buildTableParagraph(table: ParsedHwpxTable, index: number, tablePosition?: HwpxTablePositionOptions) {
  const paragraphId = 3121191098 + index;
  return `<hp:p id="${paragraphId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + `<hp:run charPrIDRef="0">${renderHwpxTable(table, index, tablePosition)}<hp:t/></hp:run>`
    + `<hp:linesegarray>${renderTableLineSeg(index + 1)}</hp:linesegarray>`
    + '</hp:p>';
}

function buildTextOnlySectionXml(lines: string[], emptySectionXml: string) {
  const normalizedLines = lines.length ? lines : ['운영일지'];
  let xml = applyHwpxPageSetup(emptySectionXml).replace('<hp:t/>', renderTextXml(normalizedLines[0]));
  xml = xml.replace(
    /<hp:linesegarray>.*?<\/hp:linesegarray>/,
    `<hp:linesegarray>${renderLineSegs(normalizedLines[0], 0)}</hp:linesegarray>`
  );

  const extra = normalizedLines.slice(1).map((line, index) => {
    const paragraphIndex = index + 1;
    return `<hp:p id="${3121190099 + paragraphIndex}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
      + `<hp:run charPrIDRef="0">${renderTextXml(line)}</hp:run>`
      + `<hp:linesegarray>${renderLineSegs(line, paragraphIndex)}</hp:linesegarray>`
      + '</hp:p>';
  }).join('');

  return xml.replace(PARA_CLOSE, `</hp:p>${extra}</hs:sec>`);
}

function buildSectionXml(parsed: ParsedHwpxHtml, emptySectionXml: string, tablePosition?: HwpxTablePositionOptions) {
  if (!parsed.tables.length) {
    return buildTextOnlySectionXml(parsed.lines, emptySectionXml);
  }

  const [firstTable, ...restTables] = parsed.tables;
  let xml = applyHwpxPageSetup(emptySectionXml).replace(
    '<hp:run charPrIDRef="0"><hp:t/></hp:run>',
    `<hp:run charPrIDRef="0">${renderHwpxTable(firstTable, 0, tablePosition)}<hp:t/></hp:run>`
  );
  xml = xml.replace(
    /<hp:linesegarray>.*?<\/hp:linesegarray>/,
    `<hp:linesegarray>${renderTableLineSeg(0)}</hp:linesegarray>`
  );
  const extra = restTables.map((table, index) => buildTableParagraph(table, index + 1, tablePosition)).join('');
  return xml.replace('</hs:sec>', `${extra}</hs:sec>`);
}

function ensureHwpxTableHeaderStyles(headerXml: string) {
  let xml = headerXml;
  if (!xml.includes('<hh:borderFill id="3"')) {
    const whiteBorder = '<hh:borderFill id="3" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/><hh:leftBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:rightBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:topBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:bottomBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:diagonal type="NONE" width="0.1 mm" color="#9CA3AF"/><hc:fillBrush><hc:winBrush faceColor="#FFFFFF" hatchColor="#FFFFFF" alpha="0"/></hc:fillBrush></hh:borderFill>';
    const grayBorder = '<hh:borderFill id="4" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/><hh:leftBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:rightBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:topBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:bottomBorder type="SOLID" width="0.1 mm" color="#9CA3AF"/><hh:diagonal type="NONE" width="0.1 mm" color="#9CA3AF"/><hc:fillBrush><hc:winBrush faceColor="#D9D9D9" hatchColor="#D9D9D9" alpha="0"/></hc:fillBrush></hh:borderFill>';
    xml = xml.replace(/<hh:borderFills itemCnt="(\d+)">/, (_match, count) => `<hh:borderFills itemCnt="${Number(count) + 2}">`);
    xml = xml.replace('</hh:borderFills>', `${whiteBorder}${grayBorder}</hh:borderFills>`);
  }

  const makeCharPr = (id: number, height: number, textColor = '#000000', spacing = 0) =>
    `<hh:charPr id="${id}" height="${height}" textColor="${textColor}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="${spacing}" latin="${spacing}" hanja="${spacing}" japanese="${spacing}" other="${spacing}" symbol="${spacing}" user="${spacing}"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/></hh:charPr>`;

  const customCharProperties = [
    makeCharPr(HWPX_CHAR_BODY, 820),
    makeCharPr(HWPX_CHAR_LABEL, 860, '#111827', -3),
    makeCharPr(HWPX_CHAR_TITLE, 1500, '#111827', -2),
    makeCharPr(HWPX_CHAR_SMALL, 760, '#111827', -5),
    makeCharPr(HWPX_CHAR_STAMP, 850, '#DC2626')
  ].filter((charPr) => {
    const id = charPr.match(/id="(\d+)"/)?.[1];
    return id && !xml.includes(`<hh:charPr id="${id}"`);
  });
  if (customCharProperties.length) {
    xml = xml.replace(/<hh:charProperties itemCnt="(\d+)">/, (_match, count) => `<hh:charProperties itemCnt="${Number(count) + customCharProperties.length}">`);
    xml = xml.replace('</hh:charProperties>', `${customCharProperties.join('')}</hh:charProperties>`);
  }

  const paraProperties = [
    '<hh:paraPr id="20" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0"><hh:align horizontal="CENTER" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="BREAK_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="120" unit="HWPUNIT"/><hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>',
    '<hh:paraPr id="21" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0"><hh:align horizontal="LEFT" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="BREAK_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="0" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="125" unit="HWPUNIT"/><hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>'
  ].filter((paraPr) => {
    const id = paraPr.match(/id="(\d+)"/)?.[1];
    return id && !xml.includes(`<hh:paraPr id="${id}"`);
  });
  if (paraProperties.length) {
    xml = xml.replace(/<hh:paraProperties itemCnt="(\d+)">/, (_match, count) => `<hh:paraProperties itemCnt="${Number(count) + paraProperties.length}">`);
    xml = xml.replace('</hh:paraProperties>', `${paraProperties.join('')}</hh:paraProperties>`);
  }
  return xml;
}

export async function createHwpxBlobFromHtml(html: string, options: Pick<HwpxExportOptions, 'tablePosition'> = {}) {
  const assets = await loadBaseAssets();
  const parsed = parseHtmlForHwpx(html);
  const zip = new JSZip();

  zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });
  zip.file('version.xml', assets.version);
  zip.file('settings.xml', assets.settings);
  zip.file('Contents/content.hpf', assets.content);
  zip.file('Contents/header.xml', ensureHwpxTableHeaderStyles(assets.header));
  zip.file('Contents/section0.xml', buildSectionXml(parsed, assets.section, options.tablePosition));
  zip.file('META-INF/container.xml', META_INF_CONTAINER_XML);
  zip.file('META-INF/container.rdf', META_INF_CONTAINER_RDF);
  zip.file('META-INF/manifest.xml', META_INF_MANIFEST_XML);
  zip.file('Preview/PrvText.txt', `${parsed.lines.join('\r\n')}\r\n`);
  zip.file('Preview/PrvImage.png', PREVIEW_IMAGE_PNG);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/hwp+zip',
    compression: 'DEFLATE'
  });
}

export async function createHwpxBytesFromHtml(
  html: string,
  options: HwpxExportOptions = {}
) {
  if (options.preferNative !== false && !options.tablePosition) {
    try {
      const hasTauriInvoke = typeof window !== 'undefined'
        && typeof (window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } }).__TAURI_INTERNALS__?.invoke === 'function';
      if (!hasTauriInvoke) {
        throw new Error('Tauri native invoke is not available in this browser runtime.');
      }
      const bytes = await invoke<number[]>('export_hwpx_from_html', { html });
      return new Uint8Array(bytes);
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }
      console.warn('RHWP native HWPX export failed, falling back to lightweight package.', error);
    }
  }
  const blob = await createHwpxBlobFromHtml(html, { tablePosition: options.tablePosition });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function downloadHwpxFromHtml(html: string, fileName: string) {
  const bytes = await createHwpxBytesFromHtml(html);
  const blob = new Blob([bytes], { type: 'application/hwp+zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.hwpx') ? fileName : `${fileName}.hwpx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
