import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code,
  Container,
  Copy,
  ExternalLink,
  Layers,
  Server,
  Settings,
  Terminal,
  Zap,
} from 'lucide-react';

/* ============================================================
   DESIGN TOKENS (inline — works with project CSS variables)
   ============================================================ */

type TabKey =
  | 'quickstart'
  | 'prereqs'
  | 'env'
  | 'backend'
  | 'frontend'
  | 'docker'
  | 'urls'
  | 'troubleshooting';

/* ============================================================
   CODE BLOCK
   ============================================================ */
function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  // Minimal syntax colouring for bash-like code
  const lines = code.split('\n').map((line, i) => {
    const isComment = line.trim().startsWith('#');
    const isCmd = /^(cd|npm|python|docker|pip|npx|alembic|pytest|ruff|mypy)/.test(line.trim());
    const color = isComment
      ? 'var(--muted)'
      : isCmd
      ? '#93c5fd'
      : 'var(--text-2)';
    return (
      <span key={i} style={{ color, display: 'block' }}>
        {line || '\u00a0'}
      </span>
    );
  });

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(5,10,20,0.8)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 48px 16px 16px',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        fontSize: '12.5px',
        lineHeight: '1.75',
        overflowX: 'auto',
        marginTop: '8px',
        marginBottom: '4px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Language tag */}
      <span
        style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          fontSize: '9px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          fontFamily: 'var(--font-sans, Inter)',
        }}
      >
        {language}
      </span>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)',
          background: copied ? 'var(--success-bg)' : 'var(--panel-alt)',
          color: copied ? 'var(--success-text)' : 'var(--muted-2)',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--t-base)',
          fontFamily: 'var(--font-sans, Inter)',
          whiteSpace: 'nowrap',
        }}
        title="Copy to clipboard"
        aria-label="Copy code to clipboard"
      >
        {copied ? (
          <>
            <Check size={11} />
            Copied!
          </>
        ) : (
          <>
            <Copy size={11} />
            Copy
          </>
        )}
      </button>

      {/* Code */}
      <pre
        style={{
          margin: '16px 0 0',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 'inherit',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {lines}
      </pre>
    </div>
  );
}

/* ============================================================
   STEP CARD
   ============================================================ */
function StepCard({
  step,
  label,
  code,
  accentColor = 'var(--primary)',
}: {
  step: string;
  label: string;
  code: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--panel-alt)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: `${accentColor}20`,
            color: accentColor,
            display: 'grid',
            placeItems: 'center',
            fontSize: '10px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {step}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
          {label}
        </span>
      </div>
      <CodeBlock code={code} />
    </div>
  );
}

/* ============================================================
   ISSUE CARD
   ============================================================ */
function IssueCard({
  type,
  issue,
  cause,
  fix,
  code,
}: {
  type: 'error' | 'warning';
  issue: string;
  cause?: string;
  fix: string;
  code?: string;
}) {
  const palette =
    type === 'error'
      ? {
          bg: 'var(--error-bg)',
          border: 'rgba(248,113,113,0.25)',
          title: 'var(--error-text)',
          text: 'var(--error-text)',
          icon: <AlertTriangle size={15} style={{ color: 'var(--error-text)' }} />,
        }
      : {
          bg: 'var(--warning-bg)',
          border: 'rgba(251,191,36,0.25)',
          title: 'var(--warning-text)',
          text: 'var(--warning-text)',
          icon: <AlertTriangle size={15} style={{ color: 'var(--warning-text)' }} />,
        };

  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700, color: palette.title, fontSize: '13px' }}>
        {palette.icon}
        {issue}
      </div>
      {cause && (
        <p style={{ fontSize: '12.5px', color: palette.text }}>
          <strong>Cause:</strong> {cause}
        </p>
      )}
      <p style={{ fontSize: '12.5px', color: palette.text }}>
        <strong>Fix:</strong> {fix}
      </p>
      {code && <CodeBlock code={code} />}
    </div>
  );
}

/* ============================================================
   URL TABLE ROW
   ============================================================ */
function UrlRow({ service, url, port, badge }: { service: string; url: string; port: string; badge?: string }) {
  return (
    <tr
      style={{ borderBottom: '1px solid var(--line)', transition: 'background var(--t-fast)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
        {service}
        {badge && (
          <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'var(--primary-dim)', color: 'var(--primary)' }}>
            {badge}
          </span>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}
        >
          {url}
          <ExternalLink size={11} />
        </a>
      </td>
      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--muted-2)' }}>
        {port}
      </td>
    </tr>
  );
}

/* ============================================================
   NAV ITEMS CONFIG
   ============================================================ */
const navItems: { key: TabKey; label: string; icon: typeof BookOpen; color: string }[] = [
  { key: 'quickstart',     label: 'Quick Start',             icon: Zap,          color: '#fbbf24' },
  { key: 'prereqs',        label: 'Prerequisites',            icon: Layers,       color: '#60a5fa' },
  { key: 'env',            label: 'Environment (.env)',       icon: Settings,     color: '#a78bfa' },
  { key: 'backend',        label: 'Backend Setup',            icon: Server,       color: '#34d399' },
  { key: 'frontend',       label: 'Frontend Setup',           icon: Code,         color: '#38bdf8' },
  { key: 'docker',         label: 'Docker & Services',        icon: Container,    color: '#6366f1' },
  { key: 'urls',           label: 'URLs & Ports',             icon: ExternalLink, color: '#f472b6' },
  { key: 'troubleshooting',label: 'Troubleshooting',          icon: AlertTriangle,color: '#f87171' },
];

/* ============================================================
   SECTION HEADER
   ============================================================ */
function SectionHeader({ icon: Icon, color, title, subtitle }: {
  icon: typeof BookOpen;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div
          style={{
            width: '34px', height: '34px',
            borderRadius: 'var(--radius-md)',
            display: 'grid', placeItems: 'center',
            background: `${color}18`,
            color,
          }}
        >
          <Icon size={17} />
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--muted-2)', marginLeft: '44px' }}>{subtitle}</p>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export function ProjectDocumentation({ standalone = false }: { standalone?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabKey>('quickstart');

  const activeNav = navItems.find((n) => n.key === activeTab)!;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: standalone ? 'column' : undefined,
        height: standalone ? '100%' : undefined,
      }}
    >
      {standalone && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
            Developer Guide
          </p>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', marginBottom: '6px' }}>
            Project Documentation
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--muted-2)' }}>
            Complete setup guide for BizSathi <span style={{ fontFamily: 'monospace', background: 'var(--panel-alt)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>v0.1.0</span> — monorepo architecture with FastAPI + React + PostgreSQL.
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: '0',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: standalone ? 'var(--radius-xl)' : 'var(--radius-xl)',
          overflow: 'hidden',
          minHeight: standalone ? '70vh' : '480px',
          boxShadow: standalone ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: '220px',
            flexShrink: 0,
            background: 'var(--panel-alt)',
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 10px',
            gap: '2px',
          }}
        >
          {/* Sidebar header */}
          <div style={{ padding: '4px 8px 14px', borderBottom: '1px solid var(--line)', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <BookOpen size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Docs</span>
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-dim)', color: 'var(--primary)',
                letterSpacing: '0.05em',
              }}>
                v0.1.0
              </span>
            </div>
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent',
                  background: isActive ? `${item.color}16` : 'transparent',
                  color: isActive ? item.color : 'var(--muted-2)',
                  borderColor: isActive ? `${item.color}30` : 'transparent',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--t-base)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--panel-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted-2)';
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={14} style={{ color: isActive ? item.color : 'inherit', flexShrink: 0 }} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px' }}>
              <Terminal size={11} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 500 }}>
                BizSathi Monorepo
              </span>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            padding: '28px',
            overflowY: 'auto',
            maxHeight: standalone ? '80vh' : '600px',
          }}
        >
          {/* ── Quick Start ── */}
          {activeTab === 'quickstart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Quick Start Guide"
                subtitle="Essential commands to get the complete project running locally in minutes."
              />

              <StepCard
                step="1"
                label="Start Backend API (FastAPI)"
                accentColor="#34d399"
                code={`cd backend\n..\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`}
              />
              <StepCard
                step="2"
                label="Start Frontend Dev Server (React + Vite)"
                accentColor="#38bdf8"
                code={`cd frontend\nnpm run dev`}
              />
              <StepCard
                step="3"
                label="Docker Full Stack (Alternative — runs everything)"
                accentColor="#6366f1"
                code={`docker compose up --build`}
              />

              {/* Info banner */}
              <div style={{
                background: 'var(--info-bg)', border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
                fontSize: '12.5px', color: 'var(--info-text)',
                display: 'flex', gap: '8px',
              }}>
                <Zap size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  After starting, visit <strong style={{ fontFamily: 'monospace' }}>http://localhost:5173</strong> for the app and <strong style={{ fontFamily: 'monospace' }}>http://localhost:8000/docs</strong> for the Swagger API docs.
                </span>
              </div>
            </div>
          )}

          {/* ── Prerequisites ── */}
          {activeTab === 'prereqs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Prerequisites & Monorepo Structure"
                subtitle="System requirements and directory layout."
              />

              {/* Requirements */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                {[
                  { label: 'Node.js', detail: 'v20 LTS or v22+', color: '#68d391', icon: '⬡' },
                  { label: 'Python', detail: '3.12 · venv in .venv/', color: '#fbbf24', icon: '🐍' },
                  { label: 'Docker', detail: 'Desktop for PostgreSQL & Redis', color: '#60a5fa', icon: '🐳' },
                ].map((req) => (
                  <div
                    key={req.label}
                    style={{
                      background: 'var(--panel-alt)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{req.icon}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13.5px' }}>{req.label}</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted-2)' }}>{req.detail}</span>
                  </div>
                ))}
              </div>

              {/* Directory structure */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Monorepo Directory Layout
                </p>
                <CodeBlock
                  language="tree"
                  code={`bizsathi/
├── backend/               # FastAPI backend, models, repositories, routes
│   ├── app/               # Application source code
│   ├── migrations/        # Alembic database migrations
│   └── tests/             # Pytest test suite
├── frontend/              # React 19 + TypeScript + Vite
│   ├── src/               # UI components, features (CRM, Auth, HRM…)
│   └── dist/              # Production static build output
├── workers/               # Background task workers (Email, Notifications)
├── infrastructure/        # Nginx config, AWS ECS task definitions
├── docs/                  # Project reports & technical documentation
└── docker-compose.yml     # Multi-container orchestration setup`}
                />
              </div>
            </div>
          )}

          {/* ── Environment ── */}
          {activeTab === 'env' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Environment Variables (.env)"
                subtitle="Configure environment variables before starting any service."
              />

              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  Backend — <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>backend/.env</code>
                </p>
                <CodeBlock
                  language="dotenv"
                  code={`DEBUG=True
SECRET_KEY=dev_secret_key_1234567890_bizsathi_saas
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bizsathi`}
                />
              </div>

              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                  Frontend — <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>frontend/.env</code>
                </p>
                <CodeBlock language="dotenv" code={`VITE_API_BASE_URL=http://localhost:8000`} />
              </div>

              <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '12.5px', color: 'var(--warning-text)' }}>
                ⚠️ Never commit <code style={{ fontFamily: 'monospace' }}>.env</code> files to version control. Copy from <code style={{ fontFamily: 'monospace' }}>.env.example</code> before running.
              </div>
            </div>
          )}

          {/* ── Backend Setup ── */}
          {activeTab === 'backend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Backend Installation & Commands"
                subtitle="Virtual environment, database migrations, tests, and API server."
              />

              <StepCard step="1" label="Create Virtual Environment & Install Dependencies" accentColor="#34d399"
                code={`cd backend\npython -m venv .venv\n..\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt`} />
              <StepCard step="2" label="Run Alembic Database Migrations" accentColor="#60a5fa"
                code={`cd backend\n..\\.venv\\Scripts\\alembic.exe upgrade head`} />
              <StepCard step="3" label="Run Pytest Suite & Linters" accentColor="#a78bfa"
                code={`cd backend\n..\\.venv\\Scripts\\pytest.exe\n..\\.venv\\Scripts\\ruff.exe check app tests\n..\\.venv\\Scripts\\mypy.exe app`} />
              <StepCard step="4" label="Start Backend Server (Uvicorn)" accentColor="#fbbf24"
                code={`cd backend\n..\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`} />
            </div>
          )}

          {/* ── Frontend Setup ── */}
          {activeTab === 'frontend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Frontend Installation & Commands"
                subtitle="React 19 + Vite dev server, linting, tests, and production build."
              />

              <StepCard step="1" label="Install Frontend Dependencies" accentColor="#38bdf8"
                code={`cd frontend\nnpm install`} />
              <StepCard step="2" label="Start Vite Development Server" accentColor="#34d399"
                code={`cd frontend\nnpm run dev`} />
              <StepCard step="3" label="Run ESLint & TypeScript Type Check" accentColor="#a78bfa"
                code={`cd frontend\nnpm run lint\nnpx tsc -b`} />
              <StepCard step="4" label="Run Vitest Suite & Production Build" accentColor="#fbbf24"
                code={`cd frontend\nnpm run test -- --run\nnpm run build`} />
            </div>
          )}

          {/* ── Docker ── */}
          {activeTab === 'docker' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Docker & Third-Party Services"
                subtitle="Containerized deployment with PostgreSQL and Redis via Docker Compose."
              />

              <StepCard step="↑" label="Start Full Monorepo Stack" accentColor="#6366f1"
                code={`docker compose up --build`} />
              <StepCard step="↓" label="Stop All Docker Services" accentColor="#f87171"
                code={`docker compose down`} />
              <StepCard step="⟳" label="Rebuild a Specific Service" accentColor="#fbbf24"
                code={`docker compose up --build backend\ndocker compose up --build frontend`} />

              {/* Services table */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Managed Services
                </p>
                <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {[
                    { service: 'PostgreSQL', version: '16', port: '5432', color: '#60a5fa' },
                    { service: 'Redis', version: '7', port: '6379', color: '#f87171' },
                    { service: 'Backend API', version: 'FastAPI', port: '8000', color: '#34d399' },
                    { service: 'Frontend', version: 'Vite', port: '5173', color: '#38bdf8' },
                  ].map((svc, i) => (
                    <div
                      key={svc.service}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderBottom: i < 3 ? '1px solid var(--line)' : 'none',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: svc.color, display: 'inline-block' }} />
                        {svc.service}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted-2)' }}>{svc.version}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: svc.color, fontWeight: 700 }}>:{svc.port}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── URLs & Ports ── */}
          {activeTab === 'urls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Default URLs & Port Allocations"
                subtitle="Local addresses for all services and developer tools."
              />

              <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(96,165,250,0.06)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--muted-2)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' }}>Service</th>
                      <th style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--muted-2)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' }}>Local URL</th>
                      <th style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--muted-2)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' }}>Port</th>
                    </tr>
                  </thead>
                  <tbody>
                    <UrlRow service="Frontend App (Vite)"          url="http://localhost:5173"       port="5173" badge="React" />
                    <UrlRow service="Backend API (FastAPI)"        url="http://localhost:8000"       port="8000" badge="Python" />
                    <UrlRow service="Swagger API Documentation"    url="http://localhost:8000/docs"  port="8000" />
                    <UrlRow service="Redoc API Documentation"      url="http://localhost:8000/redoc" port="8000" />
                    <UrlRow service="Backend Health Check"         url="http://localhost:8000/health" port="8000" />
                    <UrlRow service="PostgreSQL Database"          url="localhost:5432"              port="5432" />
                    <UrlRow service="Redis Cache"                  url="localhost:6379"              port="6379" />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Troubleshooting ── */}
          {activeTab === 'troubleshooting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionHeader
                icon={activeNav.icon}
                color={activeNav.color}
                title="Troubleshooting & Common Fixes"
                subtitle="Solutions to the most common setup and runtime issues."
              />

              <IssueCard
                type="error"
                issue='Leads / CRM page shows "Network Error"'
                cause="The backend FastAPI process is not running on port 8000."
                fix="Start the backend server in a separate terminal window:"
                code={`cd backend\n..\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`}
              />
              <IssueCard
                type="warning"
                issue="CORS Blocked Request Header"
                fix='Verify ALLOWED_ORIGINS in backend/.env contains "http://localhost:5173". Restart the backend after any .env change.'
              />
              <IssueCard
                type="warning"
                issue='Database connection error: "could not connect to server"'
                fix="Ensure PostgreSQL is running. Start it with Docker:"
                code={`docker compose up -d postgres`}
              />
              <IssueCard
                type="error"
                issue="npm install fails — peer dependency conflicts"
                fix="Use the legacy peer deps flag:"
                code={`cd frontend\nnpm install --legacy-peer-deps`}
              />
              <IssueCard
                type="warning"
                issue="Alembic migration error — table already exists"
                fix="Stamp the current revision and retry:"
                code={`cd backend\n..\\.venv\\Scripts\\alembic.exe stamp head\n..\\.venv\\Scripts\\alembic.exe upgrade head`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
