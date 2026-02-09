import ChipStack from './ChipStack';

interface BettingCircleProps {
  chips: number[];
  label?: string;
  onClick: () => void;
  accentColor?: string;
  highlight?: boolean;
  dimmed?: boolean;
}

export default function BettingCircle({
  chips,
  label,
  onClick,
  accentColor = '#d4af37',
  highlight = false,
  dimmed = false,
}: BettingCircleProps) {
  const hasChips = chips.length > 0;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer transition-all"
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: `2px dashed ${hasChips || highlight ? accentColor : 'rgba(255,255,255,0.2)'}`,
        backgroundColor: hasChips ? 'rgba(212,175,55,0.05)' : 'transparent',
        boxShadow: highlight
          ? `0 0 20px ${accentColor}40, inset 0 0 15px ${accentColor}15`
          : hasChips
            ? `inset 0 0 10px ${accentColor}10`
            : 'none',
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      {hasChips ? (
        <ChipStack chips={chips} showTotal={true} />
      ) : (
        label && <span className="text-white/30 text-xs uppercase tracking-wider">{label}</span>
      )}
    </button>
  );
}
