import { formatCents } from '../../lib/constants';
import type { ProfitLossPoint } from '@shared/types';

interface Props {
  data: ProfitLossPoint[];
}

export default function ProfitTimeline({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="card-panel p-4">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Profit/Loss Timeline</h3>
        <p className="text-white/30 text-sm text-center py-8">Not enough data yet</p>
      </div>
    );
  }

  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 10, bottom: 20, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.cumulative_profit_cents);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal)) || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH / 2 - (d.cumulative_profit_cents / absMax) * (chartH / 2);
    return { x, y, val: d.cumulative_profit_cents };
  });

  const zeroY = padding.top + chartH / 2;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area above zero line (profit) and below (loss)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`;

  const current = values[values.length - 1];
  const isUp = current >= 0;

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Profit/Loss Timeline</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Zero line */}
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeDasharray="4" />
        <text x={padding.left - 4} y={zeroY + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9}>
          $0
        </text>

        {/* Labels */}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" fill="rgba(46,204,113,0.5)" fontSize={9}>
          +{formatCents(absMax)}
        </text>
        <text x={padding.left - 4} y={padding.top + chartH + 4} textAnchor="end" fill="rgba(231,76,60,0.5)" fontSize={9}>
          -{formatCents(absMax)}
        </text>

        {/* Area */}
        <path d={areaPath} fill={isUp ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)'} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={isUp ? '#2ecc71' : '#e74c3c'} strokeWidth={2} />

        {/* Current dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={isUp ? '#2ecc71' : '#e74c3c'} />
      </svg>
    </div>
  );
}
