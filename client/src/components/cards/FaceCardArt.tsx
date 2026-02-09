import { SUIT_COLORS } from '../../lib/constants';

interface FaceCardArtProps {
  rank: string;
  suit: string;
  size: 'sm' | 'md' | 'lg';
}

const FACE_CONFIG: Record<string, { label: string; symbol: string; accent: string }> = {
  J: { label: 'J', symbol: '\u2694', accent: '#4a90d9' },   // Crossed swords
  Q: { label: 'Q', symbol: '\u2655', accent: '#c850c0' },   // White chess queen
  K: { label: 'K', symbol: '\u2654', accent: '#d4af37' },   // White chess king
};

const FRAME_SIZES = {
  sm: { w: 'w-10', h: 'h-14', text: 'text-lg', sub: 'text-[8px]' },
  md: { w: 'w-12', h: 'h-16', text: 'text-2xl', sub: 'text-[10px]' },
  lg: { w: 'w-16', h: 'h-22', text: 'text-3xl', sub: 'text-xs' },
};

export default function FaceCardArt({ rank, suit, size }: FaceCardArtProps) {
  const config = FACE_CONFIG[rank];
  if (!config) return null;

  const color = SUIT_COLORS[suit];
  const s = FRAME_SIZES[size];

  return (
    <div className={`${s.w} ${s.h} flex flex-col items-center justify-center relative`}>
      {/* Decorative frame */}
      <div
        className="absolute inset-0 rounded border-2 opacity-30"
        style={{ borderColor: config.accent }}
      />
      {/* Crown/symbol area */}
      <span className={`${s.text} leading-none select-none`} style={{ color: config.accent }}>
        {config.symbol}
      </span>
      {/* Suit marker below */}
      <span className={`${s.sub} mt-0.5 opacity-60`} style={{ color }}>
        {rank}
      </span>
    </div>
  );
}
