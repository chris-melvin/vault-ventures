import { useGameStore } from '../../stores/useGameStore';
import { CHIP_VALUES, CHIP_COLORS, formatChipLabel } from '../../lib/constants';

export default function ChipSelector() {
  const { selectedChipValue, setSelectedChip, balance_cents, chipStack } = useGameStore();
  const currentTotal = chipStack.reduce((sum, v) => sum + v, 0);

  return (
    <div className="flex items-center gap-2">
      {CHIP_VALUES.map((value) => {
        const colors = CHIP_COLORS[value];
        const isSelected = selectedChipValue === value;
        const cantAfford = currentTotal + value > balance_cents;

        return (
          <button
            key={value}
            onClick={() => setSelectedChip(value)}
            disabled={cantAfford}
            className="chip"
            style={{
              backgroundColor: colors.bg,
              borderColor: isSelected ? '#d4af37' : colors.border,
              color: colors.text,
              opacity: cantAfford ? 0.3 : 1,
              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
              boxShadow: isSelected ? '0 0 15px rgba(212,175,55,0.5)' : 'none',
            }}
          >
            {formatChipLabel(value)}
          </button>
        );
      })}
    </div>
  );
}
