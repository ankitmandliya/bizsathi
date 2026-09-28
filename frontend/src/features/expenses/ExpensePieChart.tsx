import React, { useState } from 'react';
import { CategoryBreakdownItem } from './services/expensesApi';
import { PieChart as PieChartIcon, IndianRupee } from 'lucide-react';

const COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#64748b', // Slate
];

interface ExpensePieChartProps {
  breakdown: CategoryBreakdownItem[];
  totalExpense: number;
}

export function ExpensePieChart({ breakdown, totalExpense }: ExpensePieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  if (!breakdown || breakdown.length === 0 || totalExpense <= 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--muted)',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--line)',
        }}
      >
        <PieChartIcon size={36} color="var(--muted)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>No expenses found for the selected filters.</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Try adjusting date range or category filters.</p>
      </div>
    );
  }

  // Calculate SVG Pie/Donut Chart slices
  let cumulativePercent = 0;

  const slices = breakdown.map((item, idx) => {
    const startPercent = cumulativePercent;
    cumulativePercent += item.percentage;
    const endPercent = cumulativePercent;

    const startAngle = (startPercent / 100) * 360 - 90;
    const endAngle = (endPercent / 100) * 360 - 90;

    const x1 = Math.cos((startAngle * Math.PI) / 180);
    const y1 = Math.sin((startAngle * Math.PI) / 180);
    const x2 = Math.cos((endAngle * Math.PI) / 180);
    const y2 = Math.sin((endAngle * Math.PI) / 180);

    const midAngle = (startAngle + endAngle) / 2;
    const dx = Math.cos((midAngle * Math.PI) / 180) * 0.08;
    const dy = Math.sin((midAngle * Math.PI) / 180) * 0.08;

    const largeArcFlag = item.percentage > 50 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'L 0 0',
    ].join(' ');

    const color = COLORS[idx % COLORS.length];

    return {
      ...item,
      color,
      pathData: item.percentage >= 99.9 ? null : pathData,
      dx,
      dy,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '24px',
        position: 'relative',
      }}
    >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          margin: '0 0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <PieChartIcon size={18} color="#6366f1" /> Expense Breakdown by Category
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* Donut SVG Container */}
        <div
          style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}
          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => {
            setHoveredIndex(null);
            setTooltipPos(null);
          }}
        >
          <svg
            viewBox="-1.2 -1.2 2.4 2.4"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {slices.map((slice, i) => {
              const isHovered = hoveredIndex === i;
              const isDimmed = hoveredIndex !== null && !isHovered;

              return (
                <g
                  key={i}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
                    transform: isHovered ? `translate(${slice.dx}px, ${slice.dy}px) scale(1.04)` : 'translate(0px, 0px) scale(1)',
                    transformOrigin: '0 0',
                    opacity: isDimmed ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                >
                  {slice.pathData ? (
                    <path
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="var(--bg-card)"
                      strokeWidth="0.03"
                    />
                  ) : (
                    <circle r="1" cx="0" cy="0" fill={slice.color} />
                  )}
                </g>
              );
            })}
            {/* Center Donut Hole */}
            <circle r="0.65" cx="0" cy="0" fill="var(--bg-card)" style={{ pointerEvents: 'none' }} />
          </svg>

          {/* Center Donut Label */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              padding: '12px',
            }}
          >
            {activeSlice ? (
              <>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: activeSlice.color,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '130px',
                  }}
                >
                  {activeSlice.category_name}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text)',
                    margin: '2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <IndianRupee size={14} style={{ display: 'inline' }} />
                  {activeSlice.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  {activeSlice.percentage.toFixed(1)}% of total
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Expense
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--text)',
                    margin: '2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <IndianRupee size={15} style={{ display: 'inline' }} />
                  {totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                  {breakdown.length} Categories
                </span>
              </>
            )}
          </div>
        </div>

        {/* Category Breakdown Table / Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {slices.map((item, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.category_id || idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: isHovered ? 'rgba(99, 102, 241, 0.08)' : 'rgba(241, 245, 249, 0.4)',
                  border: `1.5px solid ${isHovered ? item.color : 'var(--line)'}`,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  transform: isHovered ? 'translateX(4px)' : 'none',
                  boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 4,
                      background: item.color,
                      flexShrink: 0,
                      boxShadow: isHovered ? `0 0 8px ${item.color}` : 'none',
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text)', display: 'block' }}>{item.category_name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {item.count || 0} {item.count === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span
                    style={{
                      color: isHovered ? item.color : 'var(--muted)',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <IndianRupee size={13} />
                    {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && tooltipPos && activeSlice && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(tooltipPos.x + 14, window.innerWidth - 240),
            top: tooltipPos.y - 40,
            pointerEvents: 'none',
            zIndex: 9999,
            background: '#0f172a',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '200px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', color: '#fff' }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: activeSlice.color,
                boxShadow: `0 0 6px ${activeSlice.color}`,
              }}
            />
            <span>{activeSlice.category_name}</span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total Spent:</span>
              <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <IndianRupee size={12} />
                {activeSlice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Category Share:</span>
              <strong style={{ color: '#f472b6' }}>{activeSlice.percentage.toFixed(1)}%</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Total Records:</span>
              <strong style={{ color: '#cbd5e1' }}>
                {activeSlice.count || 0} {activeSlice.count === 1 ? 'record' : 'records'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
