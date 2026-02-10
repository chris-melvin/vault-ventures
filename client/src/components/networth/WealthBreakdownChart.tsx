import type { NetWorthResponse } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  data: NetWorthResponse;
}

const SEGMENTS = [
  { key: 'wallet_cents', label: 'Wallet', color: '#d4af37' },
  { key: 'bank_cents', label: 'Bank', color: '#2ecc71' },
  { key: 'portfolio_value_cents', label: 'Portfolio', color: '#3498db' },
  { key: 'pending_rent_cents', label: 'Pending Rent', color: '#e67e22' },
  { key: 'pending_interest_cents', label: 'Pending Interest', color: '#9b59b6' },
] as const;

export default function WealthBreakdownChart({ data }: Props) {
  const total = data.total_net_worth_cents || 1;
  const segments = SEGMENTS.map((s) => ({
    ...s,
    value: data[s.key],
    percent: (data[s.key] / total) * 100,
  })).filter((s) => s.value > 0);

  const size = 200;
  const center = size / 2;
  const radius = 80;
  const innerRadius = 50;

  let cumulativeAngle = -90;

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Wealth Breakdown</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg) => {
            const startAngle = cumulativeAngle;
            const sweepAngle = (seg.percent / 100) * 360;
            cumulativeAngle += sweepAngle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;
            const largeArc = sweepAngle > 180 ? 1 : 0;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            const ix1 = center + innerRadius * Math.cos(startRad);
            const iy1 = center + innerRadius * Math.sin(startRad);
            const ix2 = center + innerRadius * Math.cos(endRad);
            const iy2 = center + innerRadius * Math.sin(endRad);

            return (
              <path
                key={seg.key}
                d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`}
                fill={seg.color}
                stroke="#1a1a2e"
                strokeWidth={2}
              />
            );
          })}
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize={12} fontWeight="bold">
            {formatCents(total)}
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-white/60">{seg.label}</span>
              <span className="text-white/80 font-medium ml-auto">{seg.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
