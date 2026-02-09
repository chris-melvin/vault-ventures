import { useGameStore } from '../../stores/useGameStore';
import { CHIP_VALUES, CHIP_COLORS, formatCents, formatChipLabel } from '../../lib/constants';

interface BetControlsProps {
  onAction: () => void;
  actionLabel: string;
  disabled?: boolean;
  minBet?: number;
  maxBet?: number;
}

export default function BetControls({
  onAction,
  actionLabel,
  disabled = false,
  minBet = 100,
  maxBet = 10000000,
}: BetControlsProps) {
  const { currentBet, setBet, balance_cents } = useGameStore();

  const selectChip = (value: number) => {
    if (value <= balance_cents && value >= minBet && value <= maxBet) {
      setBet(value);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg">
      <div className="flex items-center gap-3">
        {CHIP_VALUES.map((value) => {
          const colors = CHIP_COLORS[value];
          const isSelected = currentBet === value;
          const isDisabled = value > balance_cents;

          return (
            <button
              key={value}
              onClick={() => selectChip(value)}
              disabled={isDisabled}
              className="chip"
              style={{
                backgroundColor: colors.bg,
                borderColor: isSelected ? '#d4af37' : colors.border,
                color: colors.text,
                opacity: isDisabled ? 0.3 : 1,
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 15px rgba(212,175,55,0.5)' : 'none',
              }}
            >
              {formatChipLabel(value)}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <span className="text-white/50 text-sm">Bet Amount</span>
        <div className="text-casino-gold font-bold text-2xl">{formatCents(currentBet)}</div>
      </div>

      <button
        onClick={onAction}
        disabled={disabled || currentBet > balance_cents}
        className="btn-primary w-full text-lg tracking-wider"
      >
        {actionLabel}
      </button>
    </div>
  );
}
