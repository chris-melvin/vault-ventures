import type { PricePoint } from '@shared/types';

interface Props {
  data: PricePoint[];
  width?: number;
  height?: number;
}

export default function PriceSparkline({ data, width = 120, height = 40 }: Props) {
  if (data.length < 2) return null;

  const prices = data.map((d) => d.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.price_cents - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const isUp = prices[prices.length - 1] >= prices[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
