import type {
  Child,
  ChildAttendanceEntry,
  DashboardSnapshot,
  ImportSummary,
  InitialImportPayload,
  JournalEntry,
  JournalTemplate
} from '../types';
import * as localDb from './localDatabase';

type ImportMode = 'demo' | 'spreadsheet' | 'manual' | 'empty';

export type DataProviderMode = 'desktop-sqlite' | 'browser-local' | 'web-api';

interface DataProvider {
  replaceLocalDatabaseFromImport(
    payload: InitialImportPayload,
    sourceMode: ImportMode,
    sourceWebAppUrl?: string
  ): Promise<ImportSummary>;
  loadJournalTemplates(): Promise<JournalTemplate[]>;
  saveJournalTemplate(template: JournalTemplate): Promise<void>;
  saveGeneratedJournals(journals: JournalEntry[]): Promise<{ created: number }>;
  saveJournalEntry(journal: JournalEntry): Promise<JournalEntry>;
  saveChildRecord(child: Child): Promise<Child>;
  saveChildAttendanceEntries(entries: ChildAttendanceEntry[]): Promise<{ saved: number }>;
  deleteChildAttendanceEntry(childId: string, date: string): Promise<{ deleted: number }>;
  rebuildDedupedChildrenFromLocalData(): Promise<{ before: number; after: number; removed: number }>;
  loadDashboardSnapshot(): Promise<DashboardSnapshot>;
}

function getEnvValue(key: string) {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env?.[key] || '';
}

function getWebApiBaseUrl() {
  return getEnvValue('VITE_SEOCHANG_API_URL').trim().replace(/\/+$/, '');
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function getDataProviderMode(): DataProviderMode {
  if (getWebApiBaseUrl()) return 'web-api';
  return isTauriRuntime() ? 'desktop-sqlite' : 'browser-local';
}

export function getDataProviderLabel() {
  const mode = getDataProviderMode();
  if (mode === 'web-api') return 'Web API';
  if (mode === 'desktop-sqlite') return 'SQLite Desktop';
  return '브라우저 로컬';
}

const localProvider: DataProvider = {
  replaceLocalDatabaseFromImport: localDb.replaceLocalDatabaseFromImport,
  loadJournalTemplates: localDb.loadJournalTemplates,
  saveJournalTemplate: localDb.saveJournalTemplate,
  saveGeneratedJournals: localDb.saveGeneratedJournals,
  saveJournalEntry: localDb.saveJournalEntry,
  saveChildRecord: localDb.saveChildRecord,
  saveChildAttendanceEntries: localDb.saveChildAttendanceEntries,
  deleteChildAttendanceEntry: localDb.deleteChildAttendanceEntry,
  rebuildDedupedChildrenFromLocalData: localDb.rebuildDedupedChildrenFromLocalData,
  loadDashboardSnapshot: localDb.loadDashboardSnapshot
};

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getWebApiBaseUrl();
  if (!baseUrl) {
    throw new Error('웹 API 주소가 설정되지 않았습니다.');
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`웹 API 요청 실패 (${response.status}): ${text || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

const webApiProvider: DataProvider = {
  replaceLocalDatabaseFromImport(payload, sourceMode, sourceWebAppUrl = '') {
    return requestJson<ImportSummary>('/api/import', {
      method: 'POST',
      body: JSON.stringify({ payload, sourceMode, sourceWebAppUrl })
    });
  },
  loadJournalTemplates() {
    return requestJson<JournalTemplate[]>('/api/journal-templates');
  },
  saveJournalTemplate(template) {
    return requestJson<void>('/api/journal-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  },
  saveGeneratedJournals(journals) {
    return requestJson<{ created: number }>('/api/generated-journals', {
      method: 'POST',
      body: JSON.stringify({ journals })
    });
  },
  saveJournalEntry(journal) {
    return requestJson<JournalEntry>('/api/journals', {
      method: 'POST',
      body: JSON.stringify(journal)
    });
  },
  saveChildRecord(child) {
    return requestJson<Child>('/api/children', {
      method: 'POST',
      body: JSON.stringify(child)
    });
  },
  saveChildAttendanceEntries(entries) {
    return requestJson<{ saved: number }>('/api/child-attendance', {
      method: 'POST',
      body: JSON.stringify({ entries })
    });
  },
  deleteChildAttendanceEntry(childId, date) {
    return requestJson<{ deleted: number }>(`/api/child-attendance?childId=${encodeURIComponent(childId)}&date=${encodeURIComponent(date)}`, {
      method: 'DELETE'
    });
  },
  rebuildDedupedChildrenFromLocalData() {
    return requestJson<{ before: number; after: number; removed: number }>('/api/children/dedupe', {
      method: 'POST'
    });
  },
  loadDashboardSnapshot() {
    return requestJson<DashboardSnapshot>('/api/dashboard-snapshot');
  }
};

function getProvider(): DataProvider {
  return getDataProviderMode() === 'web-api' ? webApiProvider : localProvider;
}

export function replaceLocalDatabaseFromImport(
  payload: InitialImportPayload,
  sourceMode: ImportMode,
  sourceWebAppUrl = ''
) {
  return getProvider().replaceLocalDatabaseFromImport(payload, sourceMode, sourceWebAppUrl);
}

export function loadJournalTemplates() {
  return getProvider().loadJournalTemplates();
}

export function saveJournalTemplate(template: JournalTemplate) {
  return getProvider().saveJournalTemplate(template);
}

export function saveGeneratedJournals(journals: JournalEntry[]) {
  return getProvider().saveGeneratedJournals(journals);
}

export function saveJournalEntry(journal: JournalEntry) {
  return getProvider().saveJournalEntry(journal);
}

export function saveChildRecord(child: Child) {
  return getProvider().saveChildRecord(child);
}

export function saveChildAttendanceEntries(entries: ChildAttendanceEntry[]) {
  return getProvider().saveChildAttendanceEntries(entries);
}

export function deleteChildAttendanceEntry(childId: string, date: string) {
  return getProvider().deleteChildAttendanceEntry(childId, date);
}

export function rebuildDedupedChildrenFromLocalData() {
  return getProvider().rebuildDedupedChildrenFromLocalData();
}

export function loadDashboardSnapshot() {
  return getProvider().loadDashboardSnapshot();
}
