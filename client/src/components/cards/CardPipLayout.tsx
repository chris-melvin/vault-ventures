import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/constants';

interface CardPipLayoutProps {
  rank: string;
  suit: string;
  size: 'sm' | 'md' | 'lg';
}

const PIP_SIZES = { sm: 'text-xs', md: 'text-base', lg: 'text-xl' };

// Standard pip positions as [top%, left%, rotated?]
const PIP_LAYOUTS: Record<number, [number, number, boolean][]> = {
  2: [[25, 50, false], [75, 50, true]],
  3: [[25, 50, false], [50, 50, false], [75, 50, true]],
  4: [[25, 30, false], [25, 70, false], [75, 30, true], [75, 70, true]],
  5: [[25, 30, false], [25, 70, false], [50, 50, false], [75, 30, true], [75, 70, true]],
  6: [[25, 30, false], [25, 70, false], [50, 30, false], [50, 70, false], [75, 30, true], [75, 70, true]],
  7: [[25, 30, false], [25, 70, false], [37, 50, false], [50, 30, false], [50, 70, false], [75, 30, true], [75, 70, true]],
  8: [[25, 30, false], [25, 70, false], [37, 50, false], [50, 30, false], [50, 70, false], [63, 50, true], [75, 30, true], [75, 70, true]],
  9: [
    [25, 30, false], [25, 70, false],
    [42, 30, false], [42, 70, false],
    [50, 50, false],
    [58, 30, true], [58, 70, true],
    [75, 30, true], [75, 70, true],
  ],
  10: [
    [25, 30, false], [25, 70, false],
    [33, 50, false],
    [42, 30, false], [42, 70, false],
    [58, 30, true], [58, 70, true],
    [67, 50, true],
    [75, 30, true], [75, 70, true],
  ],
};

export default function CardPipLayout({ rank, suit, size }: CardPipLayoutProps) {
  const num = parseInt(rank);
  const positions = PIP_LAYOUTS[num];
  if (!positions) return null;

  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];

  return (
    <div className="absolute inset-0">
      {positions.map(([top, left, rotated], i) => (
        <span
          key={i}
          className={`absolute ${PIP_SIZES[size]} leading-none select-none`}
          style={{
            color,
            top: `${top}%`,
            left: `${left}%`,
            transform: `translate(-50%, -50%) ${rotated ? 'rotate(180deg)' : ''}`,
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}
