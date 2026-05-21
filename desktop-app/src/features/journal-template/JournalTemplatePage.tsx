import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { DashboardSnapshot, JournalTemplate } from '../../types';
import { loadJournalTemplates, saveJournalTemplate } from '../../data/dataProvider';
import { downloadHwpxFromHtml } from '../../data/hwpxExport';
import { defaultJournalTemplateHtml, journalTemplateFields, renderJournalTemplate } from '../../data/journalTemplates';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { PanelTitle } from '../../shared/ui/PanelTitle';
import { HwpStylePreview, PreviewModeTabs, RhwpEditorPane } from '../../shared/ui/document-preview';
import type { DocumentPreviewMode } from '../../shared/ui/document-preview';
function HtmlTemplateEditor({
  html,
  onCommit,
  onSelectCell
}: {
  html: string;
  onCommit: (html: string) => void;
  onSelectCell?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!editorRef.current || lastHtmlRef.current === html) return;
    editorRef.current.innerHTML = html;
    lastHtmlRef.current = html;
    setDirty(false);
  }, [html]);

  const commit = () => {
    const nextHtml = editorRef.current?.innerHTML || '';
    lastHtmlRef.current = nextHtml;
    setDirty(false);
    onCommit(nextHtml);
  };

  return (
    <div className="html-template-editor-shell">
      <div className="html-template-editor-toolbar">
        <span>{dirty ? 'HTML 표 수정 중' : 'HTML 표 편집 가능'}</span>
        <button type="button" className="primary small" onClick={commit} disabled={!dirty}>
          편집 반영
        </button>
      </div>
      <div className="html-template-editor-stage">
        <div
          ref={editorRef}
          className="html-template-editor template-clickable-preview"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => setDirty(true)}
          onBlur={commit}
          onClickCapture={onSelectCell}
        />
      </div>
    </div>
  );
}
function TemplateTreeFolderIcons() {
  return (
    <>
      <svg
        className="template-tree-icon template-folder-closed-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
      <svg
        className="template-tree-icon template-folder-open-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        <path d="M2 10h20" />
      </svg>
    </>
  );
}

function TemplateTreeFileIcon() {
  return (
    <svg
      className="template-tree-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export function JournalTemplatePage({ snapshot }: { snapshot: DashboardSnapshot }) {
  type TemplateCellSelection = {
    tableIndex: number;
    rowIndex: number;
    cellIndex: number;
    label: string;
  };

  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState(snapshot.journals[0]?.id || '');
  const [templateName, setTemplateName] = useState('기본 운영일지');
  const [templateGroup, setTemplateGroup] = useState('일지');
  const [templateHtml, setTemplateHtml] = useState(defaultJournalTemplateHtml);
  const [message, setMessage] = useState('운영일지 템플릿을 준비했습니다.');
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedFieldToken, setSelectedFieldToken] = useState(journalTemplateFields[0]?.token || '{{날짜}}');
  const [selectedTemplateCell, setSelectedTemplateCell] = useState<TemplateCellSelection | null>(null);
  const [openTemplateGroups, setOpenTemplateGroups] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<DocumentPreviewMode>('rhwp');
  const compactLayout = useMediaQuery('(max-width: 1180px)');
  const [templatePaneWidths, setTemplatePaneWidths] = useState(() => {
    try {
      const saved = window.localStorage.getItem('seochang-template-pane-widths');
      const parsed = saved ? JSON.parse(saved) as { list?: number; editor?: number } : null;
      return {
        list: typeof parsed?.list === 'number' ? Math.min(520, Math.max(210, parsed.list)) : 250,
        editor: typeof parsed?.editor === 'number' ? Math.min(560, Math.max(320, parsed.editor)) : 390
      };
    } catch {
      return { list: 250, editor: 390 };
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadJournalTemplates()
      .then((items) => {
        setTemplates(items);
        const defaultTemplate = items.find((item) => item.isDefault) || items[0];
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setTemplateName(defaultTemplate.name);
          setTemplateGroup(defaultTemplate.groupName);
          setTemplateHtml(defaultTemplate.html);
        }
      })
      .catch((error) => {
        setMessage(`템플릿 로딩 실패: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, []);

  useEffect(() => {
    const selected = templates.find((template) => template.id === selectedTemplateId);
    if (!selected) return;
    setTemplateName(selected.name);
    setTemplateGroup(selected.groupName);
    setTemplateHtml(selected.html);
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!selectedJournalId && snapshot.journals[0]) {
      setSelectedJournalId(snapshot.journals[0].id);
    }
  }, [selectedJournalId, snapshot.journals]);

  useEffect(() => {
    window.localStorage.setItem('seochang-template-pane-widths', JSON.stringify(templatePaneWidths));
  }, [templatePaneWidths]);

  const selectedJournal = snapshot.journals.find((journal) => journal.id === selectedJournalId) || snapshot.journals[0];
  const renderedHtml = selectedJournal
    ? renderJournalTemplate(templateHtml, selectedJournal, snapshot.staff, snapshot.nonStaff, snapshot.attendance)
    : '<div class="journal-page">운영일지 데이터가 없습니다.</div>';
  const templateGroups = useMemo(() => {
    const names = new Set<string>(['일지', ...customGroups]);
    templates.forEach((template) => names.add(template.groupName || '일지'));
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'ko'));
  }, [customGroups, templates]);
  const groupedTemplates = useMemo(() => {
    return templateGroups.map((groupName) => ({
      groupName,
      items: templates
        .filter((template) => (template.groupName || '일지') === groupName)
      .sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name, 'ko'))
    }));
  }, [templateGroups, templates]);

  useEffect(() => {
    setOpenTemplateGroups((current) => {
      const next = new Set(current);
      templateGroups.forEach((groupName) => next.add(groupName));
      return Array.from(next).filter((groupName) => templateGroups.includes(groupName));
    });
  }, [templateGroups]);

  const toggleTemplateGroup = (groupName: string, open: boolean) => {
    setTemplateGroup(groupName);
    setOpenTemplateGroups((current) => {
      if (open) return Array.from(new Set([...current, groupName]));
      return current.filter((item) => item !== groupName);
    });
  };

  const markSelectedPreviewCell = () => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.querySelectorAll('.template-preview-selected-cell').forEach((node) => {
      node.classList.remove('template-preview-selected-cell');
    });
    if (!selectedTemplateCell) return;
    const table = preview.querySelectorAll('table')[selectedTemplateCell.tableIndex] as HTMLTableElement | undefined;
    const row = table ? Array.from(table.rows)[selectedTemplateCell.rowIndex] : undefined;
    const cell = row ? Array.from(row.cells)[selectedTemplateCell.cellIndex] : undefined;
    cell?.classList.add('template-preview-selected-cell');
  };

  useEffect(() => {
    markSelectedPreviewCell();
  }, [renderedHtml, selectedTemplateCell]);

  const insertField = (token: string) => {
    setSelectedFieldToken(token);
    if (selectedTemplateCell) {
      const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
      const cell = findTemplateCell(doc, selectedTemplateCell);
      if (cell) {
        cell.innerHTML = token;
        setTemplateHtml(doc.body.innerHTML);
        setMessage(`${selectedTemplateCell.label}에 ${token} 필드를 넣었습니다.`);
        return;
      }
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateHtml((current) => current + token);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setTemplateHtml((current) => current.slice(0, start) + token + current.slice(end));
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const findTemplateCell = (doc: Document, selection: TemplateCellSelection | null) => {
    if (!selection) return null;
    const table = doc.body.querySelectorAll('table')[selection.tableIndex] as HTMLTableElement | undefined;
    const row = table ? Array.from(table.rows)[selection.rowIndex] : undefined;
    const cell = row ? Array.from(row.cells)[selection.cellIndex] : undefined;
    return cell || null;
  };

  const selectPreviewCell = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement | null;
    const fallbackRoot = event.currentTarget as HTMLDivElement;
    const preview = previewRef.current?.contains(cell) ? previewRef.current : fallbackRoot;
    if (!cell || !preview || !preview.contains(cell)) return;
    const table = cell.closest('table') as HTMLTableElement | null;
    const row = cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row) return;
    const tableIndex = Array.from(preview.querySelectorAll('table')).indexOf(table);
    const rowIndex = Array.from(table.rows).indexOf(row);
    const cellIndex = Array.from(row.cells).indexOf(cell);
    if (tableIndex < 0 || rowIndex < 0 || cellIndex < 0) return;
    const nextSelection = {
      tableIndex,
      rowIndex,
      cellIndex,
      label: `표 ${tableIndex + 1} · ${rowIndex + 1}행 ${cellIndex + 1}칸`
    };
    setSelectedTemplateCell(nextSelection);
    setMessage(`${nextSelection.label}을 선택했습니다. 필드를 교체하거나 추가할 수 있습니다.`);
    preview.querySelectorAll('.template-preview-selected-cell').forEach((node) => {
      node.classList.remove('template-preview-selected-cell');
    });
    cell.classList.add('template-preview-selected-cell');
    window.requestAnimationFrame(markSelectedPreviewCell);
  };

  const updateSelectedCell = (mode: 'replace' | 'append' | 'clear') => {
    if (!selectedTemplateCell) {
      setMessage('먼저 미리보기에서 수정할 표 칸을 클릭해 주세요.');
      return;
    }
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const cell = findTemplateCell(doc, selectedTemplateCell);
    if (!cell) {
      setMessage('선택한 칸을 템플릿 코드에서 찾지 못했습니다. 다시 클릭해 주세요.');
      setSelectedTemplateCell(null);
      return;
    }
    if (mode === 'replace') {
      cell.innerHTML = selectedFieldToken;
    } else if (mode === 'append') {
      const current = cell.innerHTML.trim();
      cell.innerHTML = current && current !== '&nbsp;' ? `${current} ${selectedFieldToken}` : selectedFieldToken;
    } else {
      cell.innerHTML = '&nbsp;';
    }
    setTemplateHtml(doc.body.innerHTML);
    setMessage(`${selectedTemplateCell.label} ${mode === 'replace' ? '교체' : mode === 'append' ? '추가' : '비우기'} 완료`);
  };

  const fitSelectedTableWidth = () => {
    const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
    const tables = Array.from(doc.body.querySelectorAll('table')) as HTMLTableElement[];
    const targets = selectedTemplateCell ? [tables[selectedTemplateCell.tableIndex]].filter(Boolean) : tables;
    if (!targets.length) {
      setMessage('폭을 맞출 표를 찾지 못했습니다.');
      return;
    }
    targets.forEach((table) => {
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'fixed';
      table.style.borderCollapse = 'collapse';
      table.style.boxSizing = 'border-box';
      Array.from(table.querySelectorAll('td, th')).forEach((cell) => {
        const target = cell as HTMLTableCellElement;
        target.style.boxSizing = 'border-box';
        target.style.wordBreak = 'break-all';
        target.style.overflowWrap = 'anywhere';
      });
    });
    setTemplateHtml(doc.body.innerHTML);
    setMessage(selectedTemplateCell ? `${selectedTemplateCell.label}이 있는 표 폭을 100%로 맞췄습니다.` : '모든 표 폭을 100%로 맞췄습니다.');
  };

  const saveTemplate = async () => {
    const current = templates.find((template) => template.id === selectedTemplateId);
    const next: JournalTemplate = {
      id: current?.id || `template-${Date.now()}`,
      name: templateName.trim() || '이름 없는 템플릿',
      groupName: templateGroup.trim() || '일지',
      html: templateHtml,
      isDefault: current?.isDefault ?? true
    };
    await saveJournalTemplate(next);
    const items = await loadJournalTemplates();
    setTemplates(items);
    setSelectedTemplateId(next.id);
    setMessage('템플릿을 저장했습니다.');
  };

  const createTemplate = () => {
    const id = `template-${Date.now()}`;
    const groupName = templateGroup.trim() || templateGroups[0] || '일지';
    setSelectedTemplateId(id);
    setTemplateName('새 운영일지 템플릿');
    setTemplateGroup(groupName);
    setTemplateHtml(defaultJournalTemplateHtml);
    setTemplates((current) => [
      { id, name: '새 운영일지 템플릿', groupName, html: defaultJournalTemplateHtml, isDefault: false },
      ...current
    ]);
    setMessage(`${groupName} 그룹에 새 템플릿을 만들었습니다.`);
  };

  const addTemplateGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      setMessage('그룹 이름을 입력해 주세요.');
      return;
    }
    setCustomGroups((current) => Array.from(new Set([...current, name])));
    setTemplateGroup(name);
    setNewGroupName('');
    setMessage(`${name} 그룹을 만들었습니다. 이 그룹으로 저장하면 목록에 유지됩니다.`);
  };

  const copyRenderedHtml = async () => {
    await navigator.clipboard.writeText(renderedHtml);
    setMessage('미리보기 HTML을 복사했습니다.');
  };

  const downloadRenderedHwpx = async () => {
    const safeName = (templateName || '운영일지').replace(/[^\d가-힣A-Za-z_-]+/g, '_');
    setMessage('HWPX 파일을 준비하고 있습니다.');
    try {
      await downloadHwpxFromHtml(renderedHtml, `${safeName}.hwpx`);
      setMessage('HWPX 파일을 내려받았습니다.');
    } catch (error) {
      setMessage(`HWPX 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const resetToDefaultTemplate = () => {
    setTemplateName('기본 운영일지');
    setTemplateGroup('일지');
    setTemplateHtml(defaultJournalTemplateHtml);
    setMessage('기본 운영일지 템플릿으로 되돌렸습니다. 저장을 누르면 적용됩니다.');
  };

  const printRenderedHtml = () => {
    const printWindow = window.open('', '_blank', 'width=980,height=900');
    if (!printWindow) {
      setMessage('인쇄 창을 열 수 없습니다. 팝업 차단 설정을 확인해주세요.');
      return;
    }
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>운영일지 인쇄</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body { margin: 0; background: #fff; }
            .journal-page { box-shadow: none !important; page-break-after: always; }
          </style>
        </head>
        <body>${renderedHtml}</body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const fieldGroups = journalTemplateFields.reduce<Record<string, typeof journalTemplateFields>>((acc, field) => {
    acc[field.group] = acc[field.group] || [];
    acc[field.group].push(field);
    return acc;
  }, {});
  const clampTemplatePaneWidth = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const beginTemplatePaneResize = (target: 'list' | 'editor') => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = templatePaneWidths;
    const handleMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setTemplatePaneWidths({
        list: target === 'list' ? clampTemplatePaneWidth(startWidths.list + delta, 210, 520) : startWidths.list,
        editor: target === 'editor' ? clampTemplatePaneWidth(startWidths.editor - delta, 320, 560) : startWidths.editor
      });
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      document.body.classList.remove('pane-resizing');
    };
    document.body.classList.add('pane-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  };
  const templateGridTemplate = compactLayout
    ? 'minmax(0, 1fr)'
    : `${templatePaneWidths.list}px 10px minmax(720px, 1fr) 10px ${templatePaneWidths.editor}px`;

  return (
    <section className="journal-workspace template-workspace" style={{ gridTemplateColumns: templateGridTemplate }}>
      <div className="panel journal-list-panel">
        <PanelTitle title="템플릿목록" actions={<button type="button" onClick={createTemplate}>새 템플릿</button>} />
        <div className="template-group-create">
          <input
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            placeholder="새 그룹 이름"
          />
          <button type="button" onClick={addTemplateGroup}>그룹 추가</button>
        </div>
        <div className="template-tree-container">
          <ul className="template-tree-list">
            {groupedTemplates.map((group, groupIndex) => {
              const folderId = `template-folder-${groupIndex}`;
              const isOpen = openTemplateGroups.includes(group.groupName);
              return (
                <li className="template-tree-node" key={group.groupName}>
                  <input
                    type="checkbox"
                    id={folderId}
                    className="template-tree-toggle"
                    checked={isOpen}
                    onChange={(event) => toggleTemplateGroup(group.groupName, event.target.checked)}
                  />
                  <label
                    htmlFor={folderId}
                    className={`template-tree-label ${templateGroup === group.groupName ? 'is-active' : ''}`}
                    title={group.groupName}
                  >
                    <TemplateTreeFolderIcons />
                    <span>{group.groupName}</span>
                    <em>{group.items.length}</em>
                  </label>
                  <div className="template-tree-children-wrapper">
                    <ul className="template-tree-children">
                      {group.items.map((template) => (
                        <li className="template-tree-node" key={template.id}>
                          <button
                            type="button"
                            className={`template-file-item ${template.id === selectedTemplateId ? 'is-selected' : ''}`}
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setTemplateGroup(group.groupName);
                            }}
                          >
                            <TemplateTreeFileIcon />
                            <span>{template.name || '이름 없는 템플릿'}</span>
                            {template.isDefault && <em>기본</em>}
                          </button>
                        </li>
                      ))}
                      {!group.items.length && (
                        <li className="template-tree-node">
                          <div className="template-file-item is-empty">
                            <TemplateTreeFileIcon />
                            <span>아직 템플릿이 없습니다.</span>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {!compactLayout && (
        <div
          className="journal-pane-resizer template-pane-resizer"
          role="separator"
          aria-label="템플릿 목록 너비 조절"
          onPointerDown={beginTemplatePaneResize('list')}
        />
      )}

      <div className="panel preview-panel template-document-panel">
        <PanelTitle
          title="문서 에디터"
          description="표를 직접 누르고 수정하면서 오른쪽에서 필드를 꽂습니다."
          actions={(
            <div className="button-cluster">
              <label className="preview-date-select">
                날짜
                <select value={selectedJournal?.id || ''} onChange={(event) => setSelectedJournalId(event.target.value)}>
                  {snapshot.journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.date} · {journal.manager || '담당자 없음'}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={copyRenderedHtml}>HTML 복사</button>
              <button type="button" onClick={downloadRenderedHwpx}>HWPX 다운로드</button>
              <button type="button" className="primary small" onClick={printRenderedHtml}>인쇄</button>
            </div>
          )}
        />
        <PreviewModeTabs value={previewMode} onChange={setPreviewMode} editable />
        {previewMode === 'html' ? (
          <div className="a4-preview-stage">
            <div
              ref={previewRef}
              className="a4-preview template-clickable-preview"
              onClickCapture={selectPreviewCell}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        ) : previewMode === 'htmlEdit' ? (
          <HtmlTemplateEditor html={templateHtml} onCommit={setTemplateHtml} onSelectCell={selectPreviewCell} />
        ) : previewMode === 'rhwp' ? (
          <RhwpEditorPane html={templateHtml} onHtmlCommit={setTemplateHtml} defaultHtml={defaultJournalTemplateHtml} />
        ) : (
          <HwpStylePreview html={renderedHtml} />
        )}
      </div>
      {!compactLayout && (
        <div
          className="journal-pane-resizer template-pane-resizer"
          role="separator"
          aria-label="필드 설정 너비 조절"
          onPointerDown={beginTemplatePaneResize('editor')}
        />
      )}

      <div className="panel template-editor-panel template-inspector-panel">
        <PanelTitle
          title="필드 / 설정"
          description="선택한 칸에 값을 넣거나 템플릿 정보를 관리합니다."
          actions={(
            <div className="button-cluster">
              <button type="button" onClick={resetToDefaultTemplate}>기본 복구</button>
              <button type="button" className="primary small" onClick={saveTemplate}>저장</button>
            </div>
          )}
        />
        <div className="template-meta-grid">
          <label>
            이름
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          </label>
          <label>
            그룹
            <input value={templateGroup} onChange={(event) => setTemplateGroup(event.target.value)} />
          </label>
        </div>
        <div className="template-cell-tools">
          <div>
            <span>선택 칸</span>
            <strong>{selectedTemplateCell?.label || '문서의 표 칸을 클릭하세요'}</strong>
          </div>
          <label>
            필드
            <select value={selectedFieldToken} onChange={(event) => setSelectedFieldToken(event.target.value)}>
              {journalTemplateFields.map((field) => (
                <option key={field.token} value={field.token}>{field.group} · {field.label}</option>
              ))}
            </select>
          </label>
          <div className="template-cell-tool-actions">
            <button type="button" onClick={() => updateSelectedCell('replace')}>칸 교체</button>
            <button type="button" onClick={() => updateSelectedCell('append')}>뒤에 추가</button>
            <button type="button" onClick={() => updateSelectedCell('clear')}>칸 비우기</button>
            <button type="button" onClick={fitSelectedTableWidth}>표 폭 맞춤</button>
          </div>
        </div>
        <div className="field-bank">
          {Object.entries(fieldGroups).map(([group, fields]) => (
            <div key={group}>
              <strong>{group}</strong>
              <div>
                {fields.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    className={selectedFieldToken === field.token ? 'active' : ''}
                    onClick={() => insertField(field.token)}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <details className="template-code-details">
          <summary>고급 HTML 코드</summary>
          <textarea
            ref={textareaRef}
            className="template-code"
            value={templateHtml}
            onChange={(event) => setTemplateHtml(event.target.value)}
          />
        </details>
        <p className="editor-message">{message}</p>
      </div>
    </section>
  );
}

