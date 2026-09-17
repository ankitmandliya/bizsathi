import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, eyebrow, action }: PageHeaderProps) {
  return (
    <div className="page-heading">
      <div className="page-heading-info">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-heading-title">{title}</h1>
        {subtitle && <p className="page-heading-subtitle">{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
