import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import type { ViewKey } from './navigation';

type AppShellProps = {
  children: ReactNode;
  currentView: ViewKey;
  providerLabel: string;
  sidebarHidden: boolean;
  onSidebarToggle: () => void;
  onViewChange: (view: ViewKey) => void;
};

export function AppShell({
  children,
  currentView,
  providerLabel,
  sidebarHidden,
  onSidebarToggle,
  onViewChange
}: AppShellProps) {
  return (
    <main className={`shell ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <AppSidebar
        currentView={currentView}
        hidden={sidebarHidden}
        onToggleHidden={onSidebarToggle}
        onViewChange={onViewChange}
        providerLabel={providerLabel}
      />

      <section className="workspace">
        {children}
      </section>
    </main>
  );
}
