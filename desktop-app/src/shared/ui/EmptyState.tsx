import type { ReactNode } from 'react';

type EmptyStateVariant = 'default' | 'panel' | 'inline';

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
};

export function EmptyState({ children, className = '', variant = 'default' }: EmptyStateProps) {
  const baseClass = variant === 'inline' ? 'empty-inline' : 'empty-state';
  const panelClass = variant === 'panel' ? 'panel ' : '';
  return <div className={`${panelClass}${baseClass} ${className}`.trim()}>{children}</div>;
}
