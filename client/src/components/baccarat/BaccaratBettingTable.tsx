import BettingCircle from '../shared/BettingCircle';
import type { BaccaratBetType } from '@shared/types';

interface BaccaratBettingTableProps {
  selectedBet: BaccaratBetType;
  chips: number[];
  onSelectBet: (type: BaccaratBetType) => void;
  onPlaceChip: () => void;
  winner?: BaccaratBetType | null;
  disabled?: boolean;
}

const BET_AREAS: { type: BaccaratBetType; label: string; payout: string; color: string }[] = [
  { type: 'player', label: 'PLAYER', payout: '1:1', color: '#2980b9' },
  { type: 'tie', label: 'TIE', payout: '8:1', color: '#d4af37' },
  { type: 'banker', label: 'BANKER', payout: '0.95:1', color: '#c0392b' },
];

export default function BaccaratBettingTable({
  selectedBet,
  chips,
  onSelectBet,
  onPlaceChip,
  winner = null,
  disabled = false,
}: BaccaratBettingTableProps) {
  return (
    <div className="flex items-end justify-center gap-4">
      {BET_AREAS.map((area) => {
        const isSelected = selectedBet === area.type;
        const isWinner = winner === area.type;
        const isDimmed = winner !== null && !isWinner;

        return (
          <div key={area.type} className="flex flex-col items-center gap-1">
            <span className="text-white/40 text-[10px] uppercase tracking-wider">{area.payout}</span>
            <BettingCircle
              chips={isSelected ? chips : []}
              label={area.label}
              onClick={() => {
                if (disabled) return;
                if (selectedBet !== area.type) {
                  onSelectBet(area.type);
                } else {
                  onPlaceChip();
                }
              }}
              accentColor={area.color}
              highlight={isWinner}
              dimmed={isDimmed}
            />
          </div>
        );
      })}
    </div>
  );
}
