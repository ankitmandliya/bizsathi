import React, { useState } from 'react';
import { ChartSeries } from '../types/report';

interface ReportChartsProps {
  primaryChart?: ChartSeries;
  secondaryChart?: ChartSeries;
  primaryTitle?: string;
  secondaryTitle?: string;
  primaryType?: 'bar' | 'line' | 'donut';
  secondaryType?: 'bar' | 'line' | 'donut';
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#64748b'];

export const ReportCharts: React.FC<ReportChartsProps> = ({
  primaryChart,
  secondaryChart,
  primaryTitle = 'Performance & Trends',
  secondaryTitle = 'Distribution & Breakdown',
  primaryType = 'bar',
  secondaryType = 'donut',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number } | null>(null);

  if (!primaryChart && !secondaryChart) {
    return null;
  }

  const formatValue = (val: number) => {
    return val >= 1000 ? `₹${val.toLocaleString('en-IN')}` : val.toString();
  };

  const renderBarChart = (series: ChartSeries) => {
    const data = series.data || [];
    if (data.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', fontSize: '13px', color: 'var(--muted)' }}>
          No chart data available for this range
        </div>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.value), 1);

    return (
      <div style={{ position: 'relative', paddingTop: '16px' }}>
        {/* Hover Banner */}
        {hoveredPoint && (
          <div style={{ position: 'absolute', top: '-4px', right: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', background: 'var(--panel-alt)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            {hoveredPoint.label}: {formatValue(hoveredPoint.value)}
          </div>
        )}

        {/* Bar Chart Container */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', height: '180px', borderBottom: '1px solid var(--line)', paddingBottom: '8px', paddingLeft: '8px', paddingRight: '8px' }}>
          {data.map((item, idx) => {
            const heightPercent = Math.max((item.value / maxValue) * 100, 6);
            const color = series.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

            return (
              <div
                key={idx}
                style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint({ label: item.label, value: item.value })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Value Label above bar */}
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                  {item.value > 0 ? (item.value >= 1000 ? `₹${(item.value / 1000).toFixed(0)}k` : item.value) : ''}
                </span>

                {/* Colored Bar Element */}
                <div style={{ width: '100%', height: '130px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '38px',
                      borderRadius: '6px 6px 0 0',
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                      transition: 'height 0.3s ease, opacity 0.2s ease',
                      opacity: hoveredPoint && hoveredPoint.label !== item.label ? 0.6 : 1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                    title={`${item.label}: ${formatValue(item.value)}`}
                  />
                </div>

                {/* X-Axis Label */}
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginTop: '8px', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLineChart = (series: ChartSeries) => {
    const data = series.data || [];
    if (data.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', fontSize: '13px', color: 'var(--muted)' }}>
          No chart data available for this range
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 24;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const points = data.map((d, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (d.value / maxValue) * (height - padding * 2);
      return { x, y, label: d.label, value: d.value };
    });

    const pathD = points.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    const color = series.color || '#10b981';

    return (
      <div style={{ position: 'relative', paddingTop: '16px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '170px' }}>
          <defs>
            <linearGradient id={`grad-${series.name.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + ratio * (height - padding * 2)}
              x2={width - padding}
              y2={padding + ratio * (height - padding * 2)}
              stroke="var(--line)"
              strokeDasharray="4 4"
            />
          ))}

          <path d={areaD} fill={`url(#grad-${series.name.replace(/\s+/g, '-')})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />

          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r="5"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPoint({ label: pt.label, value: pt.value })}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <title>{`${pt.label}: ${formatValue(pt.value)}`}</title>
            </circle>
          ))}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: '4px' }}>
          {data.map((d, i) => (
            <span key={i} style={{ fontSize: '10px', color: 'var(--muted)', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderDonutChart = (series: ChartSeries) => {
    const data = series.data || [];
    if (data.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', fontSize: '13px', color: 'var(--muted)' }}>
          No chart data available for this range
        </div>
      );
    }

    const total = data.reduce((acc, d) => acc + d.value, 0);
    let cumulativeAngle = 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', paddingTop: '16px', height: '180px' }}>
        <svg viewBox="0 0 100 100" style={{ width: '135px', height: '135px' }}>
          {data.map((item, idx) => {
            const percentage = total > 0 ? item.value / total : 0;
            const strokeDasharray = `${percentage * 283} 283`;
            const strokeDashoffset = -cumulativeAngle * 283;
            cumulativeAngle += percentage;
            const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke={color}
                strokeWidth="11"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease' }}
                onMouseEnter={() => setHoveredPoint({ label: item.label, value: item.value })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <title>{`${item.label}: ${formatValue(item.value)} (${Math.round(percentage * 100)}%)`}</title>
              </circle>
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', flex: 1 }}>
          {data.map((item, idx) => {
            const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                <span style={{ color: 'var(--muted)', fontWeight: 700, marginLeft: 'auto' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChartByType = (series: ChartSeries, type: 'bar' | 'line' | 'donut') => {
    if (type === 'line') return renderLineChart(series);
    if (type === 'donut') return renderDonutChart(series);
    return renderBarChart(series);
  };

  return (
    <div className="reports-charts-grid">
      {primaryChart && (
        <div className="reports-chart-card">
          <div className="reports-chart-title">{primaryTitle || primaryChart.name}</div>
          <div className="reports-chart-sub">{primaryChart.name}</div>
          {renderChartByType(primaryChart, primaryType)}
        </div>
      )}

      {secondaryChart && (
        <div className="reports-chart-card">
          <div className="reports-chart-title">{secondaryTitle || secondaryChart.name}</div>
          <div className="reports-chart-sub">{secondaryChart.name}</div>
          {renderChartByType(secondaryChart, secondaryType)}
        </div>
      )}
    </div>
  );
};

