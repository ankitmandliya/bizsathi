import { useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { ProjectDocumentation } from '../auth/ProjectDocumentation';

const quickLinks = [
  { label: 'FastAPI Swagger UI', url: 'http://localhost:8000/docs', color: '#34d399' },
  { label: 'API Health Check', url: 'http://localhost:8000/health', color: '#60a5fa' },
  { label: 'Frontend App', url: 'http://localhost:5173', color: '#a78bfa' },
];

export default function DocsPage() {
  const [lastVisited] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(167,139,250,0.05) 100%)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
              flexShrink: 0,
            }}
          >
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
              Developer Documentation
            </p>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--text)',
                letterSpacing: '-0.03em',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              BizSathi Project Guide
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--muted-2)', marginTop: '6px' }}>
              Complete setup guide for the <code style={{ fontFamily: 'monospace', background: 'var(--panel-alt)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>v0.1.0</code> monorepo — FastAPI + React + PostgreSQL.
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <p style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
            Quick Links
          </p>
          {quickLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel-alt)',
                border: '1px solid var(--line)',
                color: link.color,
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'monospace',
                textDecoration: 'none',
                transition: 'all var(--t-base)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${link.color}12`;
                (e.currentTarget as HTMLElement).style.borderColor = `${link.color}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--panel-alt)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: link.color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${link.color}`,
                }}
              />
              {link.label}
              <ExternalLink size={10} style={{ opacity: 0.6 }} />
            </a>
          ))}
          <p style={{ fontSize: '10.5px', color: 'var(--muted)', textAlign: 'right', marginTop: '2px' }}>
            {lastVisited}
          </p>
        </div>
      </div>

      {/* Stack info badges */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { label: 'FastAPI',        version: 'Python 3.12', color: '#34d399' },
          { label: 'React',          version: 'v19 + Vite',  color: '#38bdf8' },
          { label: 'PostgreSQL',     version: 'v16',         color: '#60a5fa' },
          { label: 'TypeScript',     version: 'v5',          color: '#a78bfa' },
          { label: 'Docker Compose', version: 'v3',          color: '#f472b6' },
          { label: 'Redis',          version: 'v7',          color: '#fb923c' },
        ].map((tech) => (
          <div
            key={tech.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 12px 5px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--line)',
              background: 'var(--panel-alt)',
              fontSize: '12px',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: tech.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{tech.label}</span>
            <span style={{ color: 'var(--muted-2)' }}>{tech.version}</span>
          </div>
        ))}
      </div>

      {/* Main documentation */}
      <ProjectDocumentation standalone />
    </div>
  );
}
