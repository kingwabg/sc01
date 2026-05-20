import type { InitialImportPayload } from '../types';

export interface SheetSyncSettings {
  webAppUrl: string;
  spreadsheetId: string;
  enabled: boolean;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  syncedCount: number;
}

export async function pushPendingChangesToSheets(settings: SheetSyncSettings): Promise<SyncResult> {
  if (!settings.enabled || !settings.webAppUrl) {
    return { ok: false, message: '동기화 URL이 아직 설정되지 않았습니다.', syncedCount: 0 };
  }
  return { ok: true, message: '동기화 연결 준비됨. 다음 단계에서 Apps Script API와 연결합니다.', syncedCount: 0 };
}

function appendQuery(url: string, params: Record<string, string>) {
  const marker = url.includes('?') ? '&' : '?';
  const query = new URLSearchParams(params).toString();
  return `${url}${marker}${query}`;
}

function fetchJsonp(endpoint: string): Promise<InitialImportPayload> {
  return new Promise((resolve, reject) => {
    const callbackName = `__seochangDesktopExport_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('가져오기 응답 시간이 초과되었습니다.'));
    }, 120000);

    (window as unknown as Record<string, (payload: InitialImportPayload & { ok?: boolean; error?: string }) => void>)[callbackName] = (payload) => {
      window.clearTimeout(timer);
      cleanup();
      if (payload.ok === false) {
        reject(new Error(payload.error || '가져오기 API가 실패했습니다.'));
        return;
      }
      resolve(payload);
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('가져오기 스크립트를 불러오지 못했습니다.'));
    };
    script.src = appendQuery(endpoint, { callback: callbackName });
    document.head.appendChild(script);
  });
}

export async function fetchInitialSpreadsheetSnapshot(
  webAppUrl: string,
  spreadsheetUrl: string,
  years: number[]
): Promise<InitialImportPayload> {
  const endpoint = appendQuery(webAppUrl.trim(), {
    mode: 'desktopExport',
    years: years.join(','),
    spreadsheetUrl: spreadsheetUrl.trim()
  });
  try {
    const response = await fetch(endpoint, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`가져오기 API 응답 실패: ${response.status}`);
    }
    const payload = await response.json() as InitialImportPayload & { ok?: boolean; error?: string };
    if (payload.ok === false) {
      throw new Error(payload.error || '가져오기 API가 실패했습니다.');
    }
    return payload;
  } catch {
    return fetchJsonp(endpoint);
  }
}
