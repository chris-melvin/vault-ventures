import { useGameStore } from '../../stores/useGameStore';
import { formatCents } from '../../lib/constants';
import ChipSelector from './ChipSelector';
import BettingCircle from './BettingCircle';

interface BetControlsProps {
  onAction: () => void;
  actionLabel: string;
  disabled?: boolean;
  showBettingCircle?: boolean;
}

export default function BetControls({
  onAction,
  actionLabel,
  disabled = false,
  showBettingCircle = false,
}: BetControlsProps) {
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, balance_cents } = useGameStore();

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg">
      {showBettingCircle && (
        <BettingCircle
          chips={chipStack}
          label="Place Bet"
          onClick={addChip}
        />
      )}

      <ChipSelector />

      {chipStack.length > 0 && (
        <div className="flex items-center gap-3">
          <button onClick={removeLastChip} className="btn-secondary px-4 py-2 text-sm">
            UNDO
          </button>
          <button onClick={clearBet} className="btn-secondary px-4 py-2 text-sm">
            CLEAR
          </button>
        </div>
      )}

      <div className="text-center">
        <span className="text-white/50 text-sm">Total Bet</span>
        <div className="text-casino-gold font-bold text-2xl">{formatCents(currentBet)}</div>
      </div>

      <button
        onClick={onAction}
        disabled={disabled || currentBet === 0 || currentBet > balance_cents}
        className="btn-primary w-full text-lg tracking-wider"
      >
        {actionLabel}
      </button>
    </div>
  );
}
