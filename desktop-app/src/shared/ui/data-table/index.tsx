import { useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type SortDirection = 'asc' | 'desc';

export function normalizeFilterText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function compareTableValues(left: unknown, right: unknown) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'ko-KR', {
    numeric: true,
    sensitivity: 'base'
  });
}

export function uniqueFilterOptions<T>(rows: T[], read: (row: T) => unknown) {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = String(read(row) ?? '').trim();
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => compareTableValues(a, b));
}

function loadStoredColumnWidths<Key extends string>(storageKey: string, defaults: Record<Key, number>) {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<Key, number>>;
    return Object.keys(defaults).reduce((next, key) => {
      const typedKey = key as Key;
      const stored = Number(parsed[typedKey]);
      next[typedKey] = Number.isFinite(stored) && stored >= 48 ? stored : defaults[typedKey];
      return next;
    }, { ...defaults } as Record<Key, number>);
  } catch {
    return defaults;
  }
}

export function usePersistentColumnWidths<Key extends string>(storageName: string, defaults: Record<Key, number>) {
  const storageKey = `seochang:column-widths:${storageName}`;
  const [widths, setWidths] = useState<Record<Key, number>>(() => loadStoredColumnWidths(storageKey, defaults));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      // localStorage가 잠긴 환경에서는 현재 화면에서만 너비를 유지합니다.
    }
  }, [storageKey, widths]);

  const beginResize = (key: Key, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widths[key] || defaults[key] || 120;
    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(680, Math.max(48, startWidth + moveEvent.clientX - startX));
      setWidths((current) => ({ ...current, [key]: nextWidth }));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      document.body.classList.remove('column-resizing');
    };
    document.body.classList.add('column-resizing');
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  };

  return { widths, beginResize };
}

export function SortableHeader<Key extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  className,
  width,
  onSort,
  onResizeStart
}: {
  label: string;
  sortKey: Key;
  activeKey: Key;
  direction: SortDirection;
  className?: string;
  width?: number;
  onSort: (key: Key) => void;
  onResizeStart?: (key: Key, event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={['resizable-th', className].filter(Boolean).join(' ')} style={width ? { width, minWidth: width } : undefined}>
      <button
        className={`sortable-header-button ${active ? 'active' : ''}`}
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`${label} 정렬`}
      >
        <span>{label}</span>
        <span className="sort-indicator">{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
      {onResizeStart && (
        <span
          className="column-resize-handle"
          role="separator"
          aria-label={`${label} 너비 조절`}
          onPointerDown={(event) => onResizeStart(sortKey, event)}
        />
      )}
    </th>
  );
}
