import { useState } from 'react';
import {
  Users,
  Boxes,
  Briefcase,
  TrendingUp,
  Bot,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Lock,
} from 'lucide-react';

interface ModuleFeature {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: typeof Users;
  color: string;
  bgGlow: string;
  stats: string;
  highlight: string;
}

const MODULES: ModuleFeature[] = [
  {
    id: 'crm',
    name: 'CRM & Sales Pipelines',
    tagline: 'Lead & Deal Automation',
    description: 'Track leads, deal stages, client communications, and automated quotation pipelines in real time.',
    icon: TrendingUp,
    color: '#38bdf8',
    bgGlow: 'rgba(56, 189, 248, 0.15)',
    stats: '+35% Deal Velocity',
    highlight: 'Pipeline Board & Quote Builder',
  },
  {
    id: 'inventory',
    name: 'Inventory & POS',
    tagline: 'Multi-Warehouse Control',
    description: 'Real-time stock tracking, multi-location inventory, low-stock triggers, and instant retail POS checkout.',
    icon: Boxes,
    color: '#34d399',
    bgGlow: 'rgba(52, 211, 153, 0.15)',
    stats: 'Zero Stockouts',
    highlight: 'Barcode Scanner & POS Terminal',
  },
  {
    id: 'hrm',
    name: 'HRM & Payroll',
    tagline: 'Workforce Intelligence',
    description: 'Employee lifecycle, biometric attendance sync, leave workflow approval, and automated salary slip generation.',
    icon: Users,
    color: '#a78bfa',
    bgGlow: 'rgba(167, 139, 250, 0.15)',
    stats: '100% Payroll Accuracy',
    highlight: 'Self-Serve Employee Portal',
  },
  {
    id: 'finance',
    name: 'Finance & Invoicing',
    tagline: 'Double-Entry Accounting',
    description: 'Automated P&L ledger, GST compliance reports, automated invoice generation, and expense tracking.',
    icon: Briefcase,
    color: '#fbbf24',
    bgGlow: 'rgba(251, 191, 36, 0.15)',
    stats: 'Automated Tax Audit',
    highlight: 'PDF Invoices & Expense Approvals',
  },
  {
    id: 'ai',
    name: 'AI Business Insights',
    tagline: 'Predictive Analytics',
    description: 'Smart revenue forecasting, customer churn prevention alerts, and automated executive summaries.',
    icon: Bot,
    color: '#f472b6',
    bgGlow: 'rgba(244, 114, 182, 0.15)',
    stats: '24/7 AI Advisor',
    highlight: 'Automated Revenue Forecasting',
  },
  {
    id: 'security',
    name: 'Enterprise Security',
    tagline: 'Multi-Tenant Governance',
    description: 'Role-based access control (RBAC), multi-tenant isolation, audit logging, and flexible SaaS subscription plans.',
    icon: ShieldCheck,
    color: '#818cf8',
    bgGlow: 'rgba(129, 140, 248, 0.15)',
    stats: '99.9% Uptime SLA',
    highlight: 'Role-Based Access Control',
  },
];

export function ProjectShowcase() {
  const [activeModuleId, setActiveModuleId] = useState<string>('crm');
  const activeModule = MODULES.find((m) => m.id === activeModuleId) || MODULES[0];
  const ActiveIcon = activeModule.icon;

  return (
    <div className="project-showcase-container" style={{ position: 'relative', width: '100%' }}>
      {/* Dynamic CSS animations */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-1deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes shimmerBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .showcase-card-hover {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .showcase-card-hover:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(56, 189, 248, 0.15);
        }
        .tab-btn-active {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>

      {/* Decorative ambient glowing backdrops */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(99,102,241,0.05) 70%, transparent 100%)',
          filter: 'blur(50px)',
          animation: 'pulseGlow 8s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-20px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.16) 0%, rgba(244,114,182,0.05) 70%, transparent 100%)',
          filter: 'blur(50px)',
          animation: 'pulseGlow 10s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glass Panel */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header Badge & Title */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, rgba(56,189,248,0.15) 0%, rgba(167,139,250,0.15) 100%)',
              border: '1px solid rgba(56,189,248,0.3)',
              marginBottom: '14px',
            }}
          >
            <Sparkles size={14} style={{ color: '#38bdf8' }} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7dd3fc',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Unified Business Operating System
            </span>
          </div>

          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            Empowering Modern SMEs with{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Complete Intelligence
            </span>
          </h2>

          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>
            BizSathi consolidates core enterprise operations into a single synchronized platform designed for speed, control, and growth.
          </p>
        </div>

        {/* Dynamic Interactive Active Feature Banner */}
        <div
          style={{
            background: `linear-gradient(135deg, rgba(15,23,42,0.9) 0%, ${activeModule.bgGlow} 100%)`,
            border: `1px solid ${activeModule.color}40`,
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: `0 8px 24px -4px ${activeModule.bgGlow}`,
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${activeModule.color}30, ${activeModule.color}10)`,
                  border: `1px solid ${activeModule.color}60`,
                  display: 'grid',
                  placeItems: 'center',
                  color: activeModule.color,
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${activeModule.color}30`,
                }}
              >
                <ActiveIcon size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    {activeModule.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: `${activeModule.color}25`,
                      color: activeModule.color,
                      border: `1px solid ${activeModule.color}50`,
                    }}
                  >
                    {activeModule.tagline}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
                  {activeModule.description}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              className="sm-flex-badge"
            >
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Impact Benchmark</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: activeModule.color }}>
                {activeModule.stats}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} style={{ color: activeModule.color }} />
              Key Capability: <strong style={{ color: '#f8fafc' }}>{activeModule.highlight}</strong>
            </span>
            <span style={{ color: activeModule.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Live System Ready <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Module Selection Grid */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Explore Platform Modules
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = mod.id === activeModuleId;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleId(mod.id)}
                  className="showcase-card-hover"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: isActive ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.5)',
                    border: isActive ? `1.5px solid ${mod.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: `${mod.color}20`,
                        color: mod.color,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    {isActive && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: mod.color,
                          boxShadow: `0 0 8px ${mod.color}`,
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: isActive ? '#ffffff' : '#cbd5e1' }}>
                      {mod.name.split('&')[0]}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {mod.tagline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Animated Metrics Floating Bar */}
        <div
          style={{
            background: 'rgba(2, 6, 23, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={16} style={{ color: '#38bdf8' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>99.9% Uptime</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>High availability cluster</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={16} style={{ color: '#34d399' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Real-time Sync</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Multi-warehouse stock</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={16} style={{ color: '#a78bfa' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>Enterprise RBAC</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Strict tenant isolation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
