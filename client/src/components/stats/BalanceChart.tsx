import { formatCents } from '../../lib/constants';
import type { BalanceHistoryPoint } from '@shared/types';

interface Props {
  data: BalanceHistoryPoint[];
}

export default function BalanceChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="card-panel p-4">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Balance History</h3>
        <p className="text-white/30 text-sm text-center py-8">Not enough data yet</p>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 10, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.balance_cents);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.balance_cents - minVal) / range) * chartH;
    return { x, y, val: d.balance_cents };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const current = values[values.length - 1];
  const first = values[0];
  const isUp = current >= first;

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Balance History</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartH * (1 - frac);
          const val = minVal + range * frac;
          return (
            <g key={frac}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={padding.left - 4} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>
                {formatCents(val)}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaPath} fill={isUp ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)'} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={isUp ? '#2ecc71' : '#e74c3c'} strokeWidth={2} />

        {/* Current value dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={isUp ? '#2ecc71' : '#e74c3c'} />
      </svg>
    </div>
  );
}
