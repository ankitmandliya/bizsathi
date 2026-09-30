import React from 'react';
import { SummaryCard } from '../types/report';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  ShoppingBag,
  Package,
  Briefcase,
  Target,
  Megaphone,
} from 'lucide-react';

interface ReportSummaryCardsProps {
  cards: SummaryCard[];
  loading?: boolean;
}

const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'dollar':
      return DollarSign;
    case 'users':
      return Users;
    case 'vendors':
      return ShoppingBag;
    case 'inventory':
      return Package;
    case 'briefcase':
      return Briefcase;
    case 'crm':
      return Target;
    case 'campaign':
      return Megaphone;
    default:
      return FileText;
  }
};

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ cards, loading }) => {
  if (loading) {
    return (
      <div className="reports-cards-grid">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="reports-stat-card" style={{ opacity: 0.6 }}>
            <div style={{ height: '14px', background: 'var(--panel-alt)', borderRadius: '4px', width: '50%', marginBottom: '12px' }} />
            <div style={{ height: '28px', background: 'var(--panel-alt)', borderRadius: '6px', width: '70%', marginBottom: '8px' }} />
            <div style={{ height: '12px', background: 'var(--panel-alt)', borderRadius: '4px', width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="reports-cards-grid">
      {cards.map((card, idx) => {
        const IconComponent = getIconComponent(card.icon);
        const isPos = card.trend_is_positive !== false;

        return (
          <div key={idx} className="reports-stat-card">
            <div className="reports-stat-header">
              <span className="reports-stat-title">{card.title}</span>
              <div className="reports-stat-icon">
                <IconComponent size={18} />
              </div>
            </div>

            <div className="reports-stat-value">{card.value}</div>

            {(card.trend || card.subtitle) && (
              <div className="reports-stat-sub">
                {card.trend && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isPos ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: isPos ? 'var(--success-text)' : 'var(--danger-text)',
                    }}
                  >
                    {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {card.trend}
                  </span>
                )}
                {card.subtitle && <span>{card.subtitle}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
