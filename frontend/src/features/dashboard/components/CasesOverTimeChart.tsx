import React, { useId, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useChartInView } from '../hooks/useChartInView';
import '../styles/dashboardCharts.css';

export interface MonthlyCaseData {
  month: string;
  cases: number;
  completed: number;
}

interface CasesOverTimeChartProps {
  data?: MonthlyCaseData[];
  loading?: boolean;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  return pts.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cp1x},${prev.y} ${cp2x},${pt.y} ${pt.x},${pt.y}`;
  }, '');
}

export const CasesOverTimeChart: React.FC<CasesOverTimeChartProps> = ({
  data,
  loading = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const uid = useId().replace(/:/g, '');

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { ref: scrollRef, inView } = useChartInView<HTMLDivElement>({ threshold: 0.2 });

  const defaultMonthlyData: MonthlyCaseData[] = useMemo(
    () => [
      { month: 'Jan', cases: 28, completed: 24 },
      { month: 'Feb', cases: 35, completed: 30 },
      { month: 'Mar', cases: 42, completed: 38 },
      { month: 'Apr', cases: 39, completed: 35 },
      { month: 'May', cases: 48, completed: 42 },
      { month: 'Jun', cases: 54, completed: 49 },
      { month: 'Jul', cases: 62, completed: 56 },
      { month: 'Aug', cases: 58, completed: 51 },
      { month: 'Sep', cases: 45, completed: 40 },
      { month: 'Oct', cases: 50, completed: 44 },
      { month: 'Nov', cases: 46, completed: 41 },
      { month: 'Dec', cases: 52, completed: 47 },
    ],
    []
  );

  const baseMonthly = data && data.length > 0 ? data : defaultMonthlyData;

  // Derive a realistic 7-day breakdown when toggled to Weekly
  const chartData = useMemo<MonthlyCaseData[]>(() => {
    if (viewMode === 'monthly') return baseMonthly;
    const recent = baseMonthly[baseMonthly.length - 1] ?? { cases: 42, completed: 37 };
    const dailyBase = Math.max(4, Math.round(recent.cases / 4));
    const completionRatio = recent.cases > 0 ? recent.completed / recent.cases : 0.88;
    const weights = [0.85, 1.15, 0.95, 1.25, 1.1, 0.9, 0.75];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels.map((day, idx) => {
      const c = Math.max(1, Math.round(dailyBase * weights[idx]));
      return {
        month: day,
        cases: c,
        completed: Math.min(c, Math.round(c * completionRatio)),
      };
    });
  }, [baseMonthly, viewMode]);

  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...chartData.map((d) => Math.max(d.cases, d.completed)),
      10
    );
    const step = highest > 100 ? 25 : highest > 40 ? 10 : 5;
    return Math.ceil(highest / step) * step;
  }, [chartData]);

  const totalCases = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.cases, 0),
    [chartData]
  );

  const totalCompleted = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.completed, 0),
    [chartData]
  );

  const peakEntry = useMemo(
    () => [...chartData].sort((a, b) => b.cases - a.cases)[0],
    [chartData]
  );

  const avgCases = useMemo(
    () => Math.round(totalCases / (chartData.length || 1)),
    [totalCases, chartData]
  );

  const completionPct = useMemo(
    () => (totalCases > 0 ? Math.round((totalCompleted / totalCases) * 100) : 0),
    [totalCases, totalCompleted]
  );

  // Compute trend delta between first half and second half
  const trendDelta = useMemo(() => {
    if (chartData.length < 2) return 0;
    const mid = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, mid).reduce((s, d) => s + d.cases, 0);
    const secondHalf = chartData.slice(mid).reduce((s, d) => s + d.cases, 0);
    if (firstHalf === 0) return 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10;
  }, [chartData]);

  // SVG Geometry
  const svgWidth = 560;
  const svgHeight = 230;
  const paddingLeft = 38;
  const paddingRight = 18;
  const paddingTop = 22;
  const paddingBottom = 30;
  const innerW = svgWidth - paddingLeft - paddingRight;
  const innerH = svgHeight - paddingTop - paddingBottom;
  const bottomY = paddingTop + innerH;

  const points = useMemo(() => {
    const stepX = innerW / Math.max(1, chartData.length - 1);
    return chartData.map((d, i) => {
      const x = paddingLeft + i * stepX;
      const yCases = paddingTop + innerH - (d.cases / maxVal) * innerH;
      const yCompleted = paddingTop + innerH - (d.completed / maxVal) * innerH;
      return { x, y: yCases, yCompleted, ...d };
    });
  }, [chartData, maxVal, innerW, innerH]);

  const casesPathD = useMemo(
    () => buildSmoothPath(points.map((p) => ({ x: p.x, y: p.y }))),
    [points]
  );

  const completedPathD = useMemo(
    () => buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yCompleted }))),
    [points]
  );

  const casesAreaD = useMemo(() => {
    if (points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${casesPathD} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
  }, [casesPathD, points, bottomY]);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredAnchorX = useMemo(() => {
    if (hoveredIndex === null || !hoveredPoint) return 0;
    if (chartType === 'bar') {
      const slotW = innerW / Math.max(1, points.length);
      return paddingLeft + slotW * (hoveredIndex + 0.5);
    }
    return hoveredPoint.x;
  }, [hoveredIndex, hoveredPoint, chartType, innerW, points.length]);
  const tooltipX = hoveredPoint
    ? Math.min(Math.max(hoveredAnchorX, paddingLeft + 62), svgWidth - paddingRight - 62)
    : 0;
  const tooltipY = hoveredPoint ? Math.max(6, hoveredPoint.y - 62) : 0;

  return (
    <div
      ref={scrollRef}
      className="abtc-chart-card abtc-scroll-reveal abtc-scroll-watch"
      data-in-view={inView ? 'true' : 'false'}
    >
      {/* Top gradient accent bar */}
      <div
        className="abtc-chart-accent-bar"
        style={{
          background: 'linear-gradient(90deg, transparent, #3b82f6, #10b981, transparent)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                letterSpacing: '-0.25px',
              }}
            >
              Cases Over Time
            </h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
                background: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.1)',
                color: isDark ? '#60a5fa' : '#2563eb',
                border: `1px solid ${isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(59, 130, 246, 0.2)'}`,
              }}
            >
              {totalCases.toLocaleString()} Cases
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
            Animal bite incident progression vs. completed PEP treatments
          </p>
        </div>

        {/* Controls: Bar/Line toggle + Series toggle + Monthly/Weekly segmented switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div
            role="group"
            aria-label="Chart style"
            style={{
              display: 'flex',
              gap: 2,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'var(--bg-secondary, #f3f4f6)',
              padding: 3,
              borderRadius: 9,
              border: '1px solid var(--card-border, #e5e7eb)',
            }}
          >
            {(['bar', 'line'] as const).map((type) => {
              const active = chartType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setHoveredIndex(null);
                    setChartType(type);
                  }}
                  className="abtc-segmented-btn"
                  style={{
                    background: active ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                    color: active ? 'var(--text-h, #111827)' : 'var(--text-secondary, #6b7280)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-pressed={showCompleted}
            className="abtc-segmented-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: showCompleted
                ? isDark
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(16, 185, 129, 0.1)'
                : 'var(--bg-secondary, #f3f4f6)',
              color: showCompleted
                ? isDark
                  ? '#34d399'
                  : '#059669'
                : 'var(--text-secondary, #6b7280)',
              border: `1px solid ${
                showCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--card-border, #e5e7eb)'
              }`,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: showCompleted ? '#10b981' : '#9ca3af',
              }}
            />
            Completed
          </button>

          <div
            role="group"
            aria-label="Chart timeframe"
            style={{
              display: 'flex',
              gap: 3,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'var(--bg-secondary, #f3f4f6)',
              padding: 3,
              borderRadius: 9,
              border: '1px solid var(--card-border, #e5e7eb)',
            }}
          >
            {(['monthly', 'weekly'] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setHoveredIndex(null);
                    setViewMode(mode);
                  }}
                  className="abtc-segmented-btn"
                  style={{
                    background: active ? (isDark ? '#1e293b' : '#ffffff') : 'transparent',
                    color: active ? 'var(--text-h, #111827)' : 'var(--text-secondary, #6b7280)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 215 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10 }}>
            <div className="abtc-skeleton-box" style={{ height: 175, width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div className="abtc-skeleton-box" style={{ height: 14, width: '28%' }} />
              <div className="abtc-skeleton-box" style={{ height: 14, width: '28%' }} />
              <div className="abtc-skeleton-box" style={{ height: 14, width: '28%' }} />
            </div>
          </div>
        ) : (
          <svg
            key={`${chartType}-${viewMode}-${chartData.length}`}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="img"
            aria-label={`Cases over time ${viewMode} ${chartType} chart`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={`casesAreaGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={isDark ? '0.35' : '0.26'} />
                <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`casesBarGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id={`completedBarGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id={`casesLineGrad-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <filter id={`glowBlue-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingTop + innerH * (1 - ratio);
              const val = Math.round(maxVal * ratio);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke={isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.25)'}
                    strokeDasharray={ratio === 0 ? undefined : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 9}
                    y={y + 3.5}
                    fill="var(--text-secondary, #9ca3af)"
                    fontSize="10"
                    textAnchor="end"
                    fontWeight="500"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {chartType === 'bar' ? (
              /* ── Animated Vertical Rising Bars ── */
              points.map((pt, i) => {
                const slotW = innerW / Math.max(1, points.length);
                const centerX = paddingLeft + slotW * (i + 0.5);
                const isHovered = hoveredIndex === i;
                const isDimmed = hoveredIndex !== null && !isHovered;
                const barW = showCompleted
                  ? Math.min(14, Math.max(7, slotW * 0.3))
                  : Math.min(22, Math.max(10, slotW * 0.45));
                const pairGap = 3;
                const casesH = Math.max(2, bottomY - pt.y);
                const completedH = Math.max(2, bottomY - pt.yCompleted);
                const casesX = showCompleted ? centerX - barW - pairGap / 2 : centerX - barW / 2;
                const completedX = centerX + pairGap / 2;

                return (
                  <g
                    key={pt.month}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(i)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${pt.month}: ${pt.cases} cases, ${pt.completed} completed`}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {/* Hover highlight backdrop column */}
                    <rect
                      x={paddingLeft + slotW * i + 2}
                      y={paddingTop}
                      width={Math.max(4, slotW - 4)}
                      height={innerH}
                      rx="6"
                      fill={
                        isHovered
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.09)'
                            : 'rgba(59, 130, 246, 0.06)'
                          : 'transparent'
                      }
                    />

                    {/* Primary Cases Bar (rises from bottom) */}
                    <rect
                      x={casesX}
                      y={pt.y}
                      width={barW}
                      height={casesH}
                      rx="4"
                      fill={`url(#casesBarGrad-${uid})`}
                      opacity={isDimmed ? 0.35 : 1}
                      filter={isHovered ? `url(#glowBlue-${uid})` : undefined}
                      className="abtc-bar-rise"
                      style={{ '--bar-delay': `${i * 45}ms` } as React.CSSProperties}
                    />

                    {/* Secondary Completed Bar (rises from bottom) */}
                    {showCompleted && (
                      <rect
                        x={completedX}
                        y={pt.yCompleted}
                        width={barW}
                        height={completedH}
                        rx="4"
                        fill={`url(#completedBarGrad-${uid})`}
                        opacity={isDimmed ? 0.35 : 0.92}
                        className="abtc-bar-rise"
                        style={{ '--bar-delay': `${i * 45 + 70}ms` } as React.CSSProperties}
                      />
                    )}

                    {/* X-axis label */}
                    <text
                      x={centerX}
                      y={bottomY + 18}
                      fill={isHovered ? 'var(--text-h, #111827)' : 'var(--text-secondary, #6b7280)'}
                      fontSize="10.5"
                      textAnchor="middle"
                      fontWeight={isHovered ? 700 : 500}
                    >
                      {pt.month}
                    </text>
                  </g>
                );
              })
            ) : (
              /* ── Animated Smooth Line & Area Chart ── */
              <>
                {/* Area Fill (animated clip-path reveal) */}
                <path
                  d={casesAreaD}
                  fill={`url(#casesAreaGrad-${uid})`}
                  className="abtc-svg-area-reveal"
                />

                {/* Secondary Line: Completed Treatments */}
                {showCompleted && (
                  <path
                    d={completedPathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.85}
                    className="abtc-svg-line-draw"
                    style={
                      {
                        '--line-length': 1200,
                        '--line-delay': '180ms',
                      } as React.CSSProperties
                    }
                  />
                )}

                {/* Primary Line: Total Cases */}
                <path
                  d={casesPathD}
                  fill="none"
                  stroke={`url(#casesLineGrad-${uid})`}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="abtc-svg-line-draw"
                  style={
                    {
                      '--line-length': 1200,
                      '--line-delay': '0ms',
                    } as React.CSSProperties
                  }
                />

                {/* Hover Crosshair Guide */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1={paddingTop}
                    x2={hoveredPoint.x}
                    y2={bottomY}
                    stroke={isDark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(59, 130, 246, 0.35)'}
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                )}

                {/* Interactive Hit Columns & Data Points */}
                {points.map((pt, i) => {
                  const isHovered = hoveredIndex === i;
                  const hitWidth = innerW / Math.max(1, points.length);
                  return (
                    <g
                      key={pt.month}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(i)}
                      onBlur={() => setHoveredIndex(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${pt.month}: ${pt.cases} cases, ${pt.completed} completed`}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <rect
                        x={pt.x - hitWidth / 2}
                        y={paddingTop}
                        width={hitWidth}
                        height={innerH + 22}
                        fill="transparent"
                      />

                      {showCompleted && (
                        <circle
                          cx={pt.x}
                          cy={pt.yCompleted}
                          r={isHovered ? 4.5 : 2.5}
                          fill={isDark ? '#111827' : '#ffffff'}
                          stroke="#10b981"
                          strokeWidth={isHovered ? 2.5 : 1.8}
                          className="abtc-svg-point"
                          style={{ '--pt-delay': `${240 + i * 35}ms` } as React.CSSProperties}
                        />
                      )}

                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={10}
                          fill="rgba(59, 130, 246, 0.18)"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={isDark ? '#111827' : '#ffffff'}
                        stroke="#3b82f6"
                        strokeWidth={isHovered ? 3 : 2.2}
                        filter={isHovered ? `url(#glowBlue-${uid})` : undefined}
                        className="abtc-svg-point"
                        style={{ '--pt-delay': `${140 + i * 35}ms` } as React.CSSProperties}
                      />

                      <text
                        x={pt.x}
                        y={bottomY + 18}
                        fill={isHovered ? 'var(--text-h, #111827)' : 'var(--text-secondary, #6b7280)'}
                        fontSize="10.5"
                        textAnchor="middle"
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {pt.month}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* Smart Clamped Floating Tooltip */}
            {hoveredPoint && (
              <g
                transform={`translate(${tooltipX}, ${tooltipY})`}
                className="abtc-tooltip"
              >
                <rect
                  x="-62"
                  y="0"
                  width="124"
                  height={showCompleted ? 50 : 34}
                  rx="10"
                  fill={isDark ? '#0f172a' : '#1e293b'}
                  stroke="rgba(148, 163, 184, 0.25)"
                  strokeWidth="1"
                  filter="drop-shadow(0 8px 16px rgba(15,23,42,0.28))"
                />
                <text
                  x="-50"
                  y="16"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {hoveredPoint.month}
                </text>
                <text
                  x="50"
                  y="16"
                  fill="#60a5fa"
                  fontSize="10.5"
                  fontWeight="700"
                  textAnchor="end"
                >
                  {hoveredPoint.cases} cases
                </text>
                {showCompleted && (
                  <>
                    <text
                      x="-50"
                      y="35"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontWeight="500"
                    >
                      Completed
                    </text>
                    <text
                      x="50"
                      y="35"
                      fill="#34d399"
                      fontSize="10.5"
                      fontWeight="700"
                      textAnchor="end"
                    >
                      {hoveredPoint.completed} (
                      {hoveredPoint.cases > 0
                        ? Math.round((hoveredPoint.completed / hoveredPoint.cases) * 100)
                        : 0}
                      %)
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Summary Footer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--card-border, #e5e7eb)',
          textAlign: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>Peak Volume</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #111827)', marginTop: 2 }}>
            {peakEntry?.month || '—'} ({peakEntry?.cases || 0})
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
            {viewMode === 'monthly' ? 'Monthly Avg' : 'Daily Avg'}
          </span>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h, #111827)', marginTop: 2 }}>
            {avgCases} cases/{viewMode === 'monthly' ? 'mo' : 'day'}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
            PEP Completion
          </span>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: trendDelta >= 0 ? '#10b981' : '#f59e0b',
              marginTop: 2,
            }}
          >
            {completionPct}%{' '}
            <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>
              ({trendDelta >= 0 ? '+' : ''}
              {trendDelta}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
