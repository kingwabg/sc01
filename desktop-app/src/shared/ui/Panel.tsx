import type { ReactNode } from 'react';

type PanelElement = 'div' | 'section' | 'aside';

type PanelProps = {
  as?: PanelElement;
  children: ReactNode;
  className?: string;
};

export function Panel({ as = 'div', children, className }: PanelProps) {
  const panelClassName = ['panel', className].filter(Boolean).join(' ');

  if (as === 'section') {
    return <section className={panelClassName}>{children}</section>;
  }

  if (as === 'aside') {
    return <aside className={panelClassName}>{children}</aside>;
  }

  return <div className={panelClassName}>{children}</div>;
}
