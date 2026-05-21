import { menuGroups } from './navigation';
import type { ViewKey } from './navigation';

type AppSidebarProps = {
  currentView: ViewKey;
  hidden: boolean;
  onToggleHidden: () => void;
  onViewChange: (view: ViewKey) => void;
  providerLabel: string;
};

function NavIcon({ viewKey }: { viewKey: ViewKey }) {
  const common = {
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (viewKey === 'dashboard') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    );
  }

  if (viewKey === 'staffRoster' || viewKey === 'nonStaffRoster') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20.5 21v-2a3.2 3.2 0 0 0-2.4-3.1" />
        <path d="M16.4 3.3a4 4 0 0 1 0 7.4" />
      </svg>
    );
  }

  if (viewKey === 'children' || viewKey === 'childAttendance') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
        <path d="M17.5 9.5h3" />
      </svg>
    );
  }

  if (viewKey === 'programPlans' || viewKey === 'programJournals' || viewKey === 'programEvaluations') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.2l1.8 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
        <path d="M8 13h8" />
        <path d="M8 16h5" />
      </svg>
    );
  }

  if (viewKey === 'templateManager') {
    return (
      <svg className="nav-icon" {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    );
  }

  if (viewKey === 'journalPrint' || viewKey === 'journalCreate' || viewKey === 'journalQuickEdit' || viewKey === 'journalStats') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5Z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (viewKey === 'settings') {
    return (
      <svg className="nav-icon" {...common}>
        <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.05V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.12.34.45.67 1.55 1H21a2 2 0 1 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    );
  }

  return (
    <svg className="nav-icon" {...common}>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function AppSidebar({
  currentView,
  hidden,
  onToggleHidden,
  onViewChange,
  providerLabel
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">서</div>
        <div className="brand-copy">
          <span className="brand-role">OPERATIONS</span>
          <strong>서창 운영관리</strong>
          <span className="provider-pill">
            <span className="provider-dot" aria-hidden="true" />
            {providerLabel}
          </span>
        </div>
        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={onToggleHidden}
          aria-label={hidden ? '사이드 메뉴 펼치기' : '사이드 메뉴 접기'}
          title={hidden ? '펼치기' : '접기'}
        >
          <span>{hidden ? '›' : '‹'}</span>
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuGroups.map((group) => {
          const groupActive = group.items.some((item) => item.key === currentView);
          return (
            <div className={`nav-group ${groupActive ? 'is-active' : ''}`} key={group.title}>
              <span>
                {group.title}
                <small>{group.items.length}</small>
              </span>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  aria-current={currentView === item.key ? 'page' : undefined}
                  className={currentView === item.key ? 'active' : ''}
                  type="button"
                  onClick={() => onViewChange(item.key)}
                  title={item.label}
                >
                  <NavIcon viewKey={item.key} />
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className={currentView === 'settings' ? 'active' : ''}
          title="기본 설정"
          onClick={() => onViewChange('settings')}
        >
          <span className="sidebar-footer-icon">?</span>
          <span>기본 설정</span>
        </button>
        <button
          type="button"
          className={`danger ${currentView === 'export' ? 'active' : ''}`}
          title="내보내기"
          onClick={() => onViewChange('export')}
        >
          <span className="sidebar-footer-icon">↗</span>
          <span>내보내기</span>
        </button>
      </div>
    </aside>
  );
}
