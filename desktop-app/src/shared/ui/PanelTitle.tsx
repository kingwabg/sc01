import type { ReactNode } from 'react';

type PanelTitleProps = {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
};

export function PanelTitle({ actions, description, title }: PanelTitleProps) {
  return (
    <div className="panel-title-row">
      {description ? (
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      ) : (
        <h2>{title}</h2>
      )}
      {actions}
    </div>
  );
}
