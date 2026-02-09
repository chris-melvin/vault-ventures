import { WHEEL_SYMBOL_CONFIGS, type WheelSymbol, type WheelSymbolConfig } from '@shared/types';
import { CHIP_VALUES, CHIP_COLORS, formatCents, formatChipLabel } from '../../lib/constants';
import { useGameStore } from '../../stores/useGameStore';
import { playChipPlace } from '../../lib/sounds';

interface BettingBoardProps {
  bets: Partial<Record<WheelSymbol, number>>;
  onPlaceBet: (symbol: WheelSymbol, amount: number) => void;
  onClearBet: (symbol: WheelSymbol) => void;
  onClearAll: () => void;
  onSpin: () => void;
  spinning: boolean;
  winningSymbol: WheelSymbol | null;
}

export default function BettingBoard({
  bets,
  onPlaceBet,
  onClearBet,
  onClearAll,
  onSpin,
  spinning,
  winningSymbol,
}: BettingBoardProps) {
  const { balance_cents } = useGameStore();
  const selectedChip = useGameStore((s) => s.currentBet);
  const setBet = useGameStore((s) => s.setBet);

  const totalBet = Object.values(bets).reduce((sum, v) => sum + (v || 0), 0);
  const hasBets = totalBet > 0;

  const handleCardClick = (symbol: WheelSymbol) => {
    if (spinning) return;
    if (selectedChip > balance_cents - totalBet) return;
    playChipPlace();
    onPlaceBet(symbol, selectedChip);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      {/* Symbol cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {WHEEL_SYMBOL_CONFIGS.map((config: WheelSymbolConfig) => {
          const bet = bets[config.symbol] || 0;
          const isWinner = winningSymbol === config.symbol;
          const isLoser = winningSymbol !== null && !isWinner && bet > 0;

          return (
            <button
              key={config.symbol}
              onClick={() => handleCardClick(config.symbol)}
              disabled={spinning}
              className="relative rounded-lg p-3 text-center transition-all border-2"
              style={{
                backgroundColor: config.color + '22',
                borderColor: isWinner
                  ? '#d4af37'
                  : bet > 0
                    ? config.color
                    : 'rgba(255,255,255,0.08)',
                opacity: isLoser ? 0.4 : 1,
                boxShadow: isWinner ? '0 0 20px rgba(212,175,55,0.5)' : 'none',
              }}
            >
              <div className="text-2xl mb-1">{config.emoji}</div>
              <div className="text-xs font-bold text-white/90 truncate">{config.name}</div>
              <div className="text-xs mt-0.5" style={{ color: config.color }}>
                {config.payout}:1
              </div>
              <div className="text-[10px] text-white/40">{config.sections} sections</div>
              {bet > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className="text-xs font-bold text-casino-gold">{formatCents(bet)}</span>
                  {!spinning && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearBet(config.symbol);
                      }}
                      className="text-white/40 hover:text-white text-xs leading-none ml-1"
                    >
                      x
                    </button>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chip selector */}
      <div className="flex items-center justify-center gap-2">
        {CHIP_VALUES.map((value) => {
          const colors = CHIP_COLORS[value];
          const isSelected = selectedChip === value;
          const isDisabled = value > balance_cents;

          return (
            <button
              key={value}
              onClick={() => setBet(value)}
              disabled={isDisabled}
              className="chip"
              style={{
                width: '2.75rem',
                height: '2.75rem',
                fontSize: '0.75rem',
                backgroundColor: colors.bg,
                borderColor: isSelected ? '#d4af37' : colors.border,
                color: colors.text,
                opacity: isDisabled ? 0.3 : 1,
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
              }}
            >
              {formatChipLabel(value)}
            </button>
          );
        })}
      </div>

      {/* Total bet display */}
      {hasBets && (
        <div className="text-center">
          <span className="text-white/50 text-xs">Total Bet</span>
          <div className="text-casino-gold font-bold text-lg">{formatCents(totalBet)}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {hasBets && !spinning && (
          <button onClick={onClearAll} className="btn-secondary flex-shrink-0 py-2 px-4 text-sm">
            Clear All
          </button>
        )}
        <button
          onClick={onSpin}
          disabled={spinning || !hasBets}
          className="btn-primary flex-1 text-lg tracking-wider"
        >
          {spinning ? 'SPINNING...' : 'SPIN'}
        </button>
      </div>
    </div>
  );
}
