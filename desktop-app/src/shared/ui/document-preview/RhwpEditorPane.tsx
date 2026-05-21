import { useEffect, useRef, useState } from 'react';
import { createHwpxBytesFromHtml } from '../../../data/hwpxExport';

type RhwpEditorPaneProps = {
  defaultHtml?: string;
  html: string;
  onHtmlCommit?: (html: string) => void;
};

type RhwpEditorInstance = {
  destroy?: () => void;
  readonly element?: HTMLIFrameElement;
  loadFile?: (data: ArrayBuffer | Uint8Array, fileName?: string) => Promise<{ pageCount?: number }>;
  _request?: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown> & { pageCount?: number }>;
};

const RHWP_INLINE_STYLE_PROPS = [
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'border-collapse',
  'table-layout',
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'vertical-align',
  'padding',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'width',
  'height'
];

function shouldKeepComputedStyle(prop: string, value: string) {
  if (!value) return false;
  if (value === 'normal' && !['font-weight', 'line-height'].includes(prop)) return false;
  if ((prop === 'background-color' || prop === 'color') && value === 'rgba(0, 0, 0, 0)') return false;
  return true;
}

function inlineStylesForRhwpImport(sourceHtml: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return `<html><body><!--StartFragment-->${sourceHtml}<!--EndFragment--></body></html>`;
  }

  const sandbox = document.createElement('div');
  sandbox.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:210mm',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1'
  ].join(';');
  sandbox.innerHTML = sourceHtml;
  document.body.appendChild(sandbox);

  try {
    sandbox.querySelectorAll<HTMLElement>('table, col, tr, td, th, div, p, span, strong').forEach((element) => {
      const computed = window.getComputedStyle(element);
      const tagName = element.tagName.toLowerCase();
      const props = tagName === 'col' ? ['width'] : RHWP_INLINE_STYLE_PROPS;
      props.forEach((prop) => {
        const value = computed.getPropertyValue(prop);
        if (shouldKeepComputedStyle(prop, value)) {
          element.style.setProperty(prop, value);
        }
      });

      if ((tagName === 'td' || tagName === 'th') && !element.style.border) {
        element.style.border = '1px solid #9ca3af';
      }
      if (tagName === 'table') {
        element.style.setProperty('border-collapse', 'collapse');
        element.style.setProperty('table-layout', 'fixed');
        element.style.setProperty('width', '100%');
      }
    });

    sandbox.querySelectorAll('style, script, link, meta').forEach((node) => node.remove());
    const fragment = sandbox.innerHTML.trim();
    return `<html><body><!--StartFragment-->${fragment}<!--EndFragment--></body></html>`;
  } finally {
    sandbox.remove();
  }
}

export function RhwpEditorPane({ html, onHtmlCommit, defaultHtml }: RhwpEditorPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<RhwpEditorInstance | null>(null);
  const loadSeqRef = useRef(0);
  const [showHtmlPanel, setShowHtmlPanel] = useState(false);
  const [draftHtml, setDraftHtml] = useState(html);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('RHWP 에디터를 준비하는 중입니다.');

  const resetRhwpEmbeddedCaches = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope.includes('/rhwp-studio/'))
            .map((registration) => registration.unregister())
        );
      }
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => /rhwp|workbox|wasm/i.test(key))
            .map((key) => window.caches.delete(key))
        );
      }
    } catch (error) {
      console.warn('RHWP embedded cache cleanup skipped', error);
    }
  };

  useEffect(() => {
    setDraftHtml(html);
    setDirty(false);
  }, [html]);

  const applyHtmlDraft = (nextHtml = draftHtml) => {
    setDraftHtml(nextHtml);
    setDirty(false);
    onHtmlCommit?.(nextHtml);
  };

  const requestRhwpEditor = (
    editor: RhwpEditorInstance,
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 60000
  ): Promise<Record<string, unknown> & { pageCount?: number; timedOut?: boolean }> => {
    const iframe = editor.element;
    const targetWindow = iframe?.contentWindow;
    if (!targetWindow) {
      return editor._request
        ? editor._request(method, params)
        : Promise.reject(new Error('RHWP iframe을 찾지 못했습니다.'));
    }

    const id = Date.now() + Math.floor(Math.random() * 100000);
    return new Promise((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timer);
      };
      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.type !== 'rhwp-response' || data.id !== id) return;
        if (event.source !== targetWindow) {
          console.info('RHWP response accepted from alternate window reference', { method, id });
        }
        finished = true;
        cleanup();
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.result || {});
        }
      };
      const timer = window.setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        console.warn('RHWP request timed out', { method, id, timeoutMs });
        resolve({ timedOut: true });
      }, timeoutMs);

      window.addEventListener('message', handleMessage);
      targetWindow.postMessage({ type: 'rhwp-request', id, method, params }, '*');
    });
  };

  const createEmbeddedRhwpEditor = (
    container: HTMLDivElement,
    studioUrl: string
  ): Promise<RhwpEditorInstance> => new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = studioUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.tabIndex = 0;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('RHWP iframe 로드 시간이 초과되었습니다.'));
    }, 20000);

    iframe.addEventListener('load', () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve({
        element: iframe,
        destroy: () => iframe.remove()
      });
    }, { once: true });
    iframe.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(new Error('RHWP iframe을 불러오지 못했습니다.'));
    }, { once: true });

    container.appendChild(iframe);
  });

  const navigateRhwpIframe = (
    iframe: HTMLIFrameElement,
    url: string,
    timeoutMs = 30000
  ): Promise<void> => new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('RHWP 문서 로드 시간이 초과되었습니다.'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('RHWP 문서를 불러오지 못했습니다.'));
    };
    iframe.addEventListener('load', handleLoad, { once: true });
    iframe.addEventListener('error', handleError, { once: true });
    iframe.src = url;
  });

  const createRhwpNativeSessionUrl = (
    sourceHtml: string,
    fileName = '운영일지.hwp'
  ) => {
    const key = `seochang-rhwp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    window.sessionStorage.setItem(key, JSON.stringify({
      html: sourceHtml,
      fileName
    }));
    const loadUrl = new URL('/rhwp-studio/index.html', window.location.origin);
    loadUrl.searchParams.set('embed', '1');
    loadUrl.searchParams.set('v', String(Date.now()));
    loadUrl.searchParams.set('seochangNativeHtmlKey', key);
    loadUrl.searchParams.set('autoFixValidation', '1');
    loadUrl.searchParams.set('suppressValidationModal', '1');
    loadUrl.searchParams.set('suppressHwpxSaveNotice', '1');
    return loadUrl;
  };

  const waitForRhwpTables = async (editor: RhwpEditorInstance, timeoutMs = 45000) => {
    const deadline = Date.now() + timeoutMs;
    let lastResult: Record<string, unknown> & { pageCount?: number; timedOut?: boolean } = {};
    while (Date.now() < deadline) {
      try {
        const result = await requestRhwpEditor(editor, 'getTableLayout', {}, 5000);
        lastResult = result;
        const tables = Array.isArray(result.tables) ? result.tables : [];
        if (tables.length > 0) return result;
      } catch (error) {
        console.warn('RHWP table layout polling failed', error);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
    return lastResult;
  };

  const fitRhwpEditorToWidth = (editor: RhwpEditorInstance) => {
    window.setTimeout(() => {
      try {
        editor.element?.contentWindow?.postMessage({ type: 'seochang-rhwp-fit-width' }, '*');
        editor.element?.contentWindow?.focus();
      } catch (error) {
        console.warn('RHWP fit-width skipped', error);
      }
    }, 350);
  };

  const focusRhwpEditorFrame = (editor = editorRef.current) => {
    window.setTimeout(() => {
      try {
        editor?.element?.focus();
        editor?.element?.contentWindow?.focus();
      } catch (error) {
        console.warn('RHWP iframe focus skipped', error);
      }
    }, 50);
  };

  const loadTemplateIntoEditor = async (editor: RhwpEditorInstance, sourceHtml: string) => {
    const seq = ++loadSeqRef.current;
    const rhwpHtml = inlineStylesForRhwpImport(sourceHtml);
    setStatus('RHWP 에디터에 운영일지 표를 만드는 중입니다.');
    let result: { pageCount?: number; timedOut?: boolean } | undefined;
    if (editor.element) {
      try {
        const loadUrl = createRhwpNativeSessionUrl(rhwpHtml, '운영일지.hwp');
        await navigateRhwpIframe(editor.element, loadUrl.toString(), 60000);
        await waitForRhwpTables(editor, 45000);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        result = {};
      } catch (nativeError) {
        console.warn('RHWP native table load failed, falling back to HWPX load.', nativeError);
        if (seq !== loadSeqRef.current) return;
        setStatus('RHWP 표 생성 실패 · HWPX 방식으로 다시 여는 중입니다.');
        const bytes = await createHwpxBytesFromHtml(rhwpHtml, {
          preferNative: false,
          allowFallback: true
        });
        if (seq !== loadSeqRef.current) return;
        const fileBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const blobUrl = URL.createObjectURL(new Blob([fileBuffer], { type: 'application/hwp+zip' }));
        const loadUrl = new URL('/rhwp-studio/index.html', window.location.origin);
        loadUrl.searchParams.set('embed', '1');
        loadUrl.searchParams.set('v', String(Date.now()));
        loadUrl.searchParams.set('url', blobUrl);
        loadUrl.searchParams.set('filename', '운영일지.hwpx');
        loadUrl.searchParams.set('autoFixValidation', '1');
        loadUrl.searchParams.set('suppressValidationModal', '1');
        loadUrl.searchParams.set('suppressHwpxSaveNotice', '1');
        try {
          await navigateRhwpIframe(editor.element, loadUrl.toString());
          result = { pageCount: 1 };
        } finally {
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        }
      }
    } else if (editor.loadFile) {
      const bytes = await createHwpxBytesFromHtml(rhwpHtml, {
        preferNative: false,
        allowFallback: true
      });
      result = await editor.loadFile(bytes, '운영일지.hwpx');
    }
    if (seq !== loadSeqRef.current) return;
    fitRhwpEditorToWidth(editor);
    focusRhwpEditorFrame(editor);
    setStatus(`운영일지 템플릿 로드 완료${result?.pageCount ? ` · ${result.pageCount}쪽` : ''}`);
  };

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | undefined;

    async function mountEditor() {
      if (!hostRef.current) return;
      hostRef.current.innerHTML = '';
      setStatus('RHWP 에디터를 불러오는 중입니다.');

      try {
        setStatus('RHWP 캐시를 정리하는 중입니다.');
        await resetRhwpEmbeddedCaches();
        if (cancelled || !hostRef.current) return;
        const studioUrl = new URL('/rhwp-studio/index.html', window.location.origin);
        studioUrl.searchParams.set('embed', '1');
        studioUrl.searchParams.set('v', String(Date.now()));
        const editor = await createEmbeddedRhwpEditor(hostRef.current, studioUrl.toString());
        if (cancelled) {
          editor.destroy?.();
          return;
        }
        editorRef.current = editor;
        setStatus('RHWP iframe 탑재 완료 · 문서를 준비하는 중입니다.');
        if (cancelled) return;
        await loadTemplateIntoEditor(editor, html);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`RHWP 에디터 로딩 실패: ${message}`);
      }
    }

    mountEditor();

    return () => {
      cancelled = true;
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    loadTemplateIntoEditor(editorRef.current, html).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`운영일지 템플릿 로드 실패: ${message}`);
    });
  }, [html]);

  return (
    <div className="rhwp-editor-shell rhwp-library-shell">
      <div className="rhwp-library-head">
        <div>
          <strong>RHWP 라이브러리 에디터</strong>
          <span>{status}</span>
        </div>
        <div className="rhwp-library-actions">
          <button
            type="button"
            className={showHtmlPanel ? 'active' : ''}
            onClick={() => setShowHtmlPanel((current) => !current)}
          >
            HTML 탭
          </button>
          <button type="button" onClick={() => applyHtmlDraft(defaultHtml || html)}>
            기본 HTML
          </button>
          <button type="button" className="primary small" onClick={() => applyHtmlDraft()}>
            HTML 저장
          </button>
        </div>
      </div>

      {showHtmlPanel && (
        <div className="rhwp-library-tools">
          <div className="rhwp-html-menu-panel rhwp-library-html-panel">
            <div className="rhwp-html-menu-head">
              <strong>HTML로 표 만들기</strong>
              <span>붙여 넣은 HTML은 운영일지 템플릿 값으로 저장됩니다.</span>
            </div>
            <textarea
              value={draftHtml}
              onChange={(event) => {
                setDraftHtml(event.target.value);
                setDirty(true);
              }}
              spellCheck={false}
            />
            <div className="button-cluster">
              <button type="button" onClick={() => applyHtmlDraft(defaultHtml || html)}>
                기본 템플릿 넣기
              </button>
              <button type="button" className="primary small" onClick={() => applyHtmlDraft()}>
                표 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rhwp-library-body">
        <div ref={hostRef} className="rhwp-editor-host rhwp-editor-host-visible" />
      </div>

      <div className="rhwp-editor-status">{status}</div>
      {dirty && <div className="rhwp-dirty-status">수정 내용이 있습니다. HTML 저장을 누르면 템플릿에 반영됩니다.</div>}
    </div>
  );
}
