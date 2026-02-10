import { SIC_BO_PAYOUTS, type SicBoBetType } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  bets: Partial<Record<SicBoBetType, number>>;
  onPlaceBet: (betType: SicBoBetType) => void;
  winningBets: SicBoBetType[];
  disabled: boolean;
}

const BET_SECTIONS: { label: string; bets: { type: SicBoBetType; label: string }[] }[] = [
  {
    label: 'Big / Small',
    bets: [
      { type: 'small', label: 'Small (4-10)' },
      { type: 'big', label: 'Big (11-17)' },
    ],
  },
  {
    label: 'Odd / Even',
    bets: [
      { type: 'odd', label: 'Odd' },
      { type: 'even', label: 'Even' },
    ],
  },
  {
    label: 'Singles',
    bets: [1, 2, 3, 4, 5, 6].map((n) => ({
      type: `single_${n}` as SicBoBetType,
      label: `${n}`,
    })),
  },
  {
    label: 'Doubles',
    bets: [1, 2, 3, 4, 5, 6].map((n) => ({
      type: `double_${n}` as SicBoBetType,
      label: `${n}-${n}`,
    })),
  },
  {
    label: 'Triples',
    bets: [
      ...[1, 2, 3, 4, 5, 6].map((n) => ({
        type: `triple_${n}` as SicBoBetType,
        label: `${n}-${n}-${n}`,
      })),
      { type: 'any_triple' as SicBoBetType, label: 'Any Triple' },
    ],
  },
  {
    label: 'Totals',
    bets: Array.from({ length: 14 }, (_, i) => ({
      type: `total_${i + 4}` as SicBoBetType,
      label: `${i + 4}`,
    })),
  },
];

function BetCell({
  type,
  label,
  amount,
  isWinner,
  disabled,
  onPlace,
}: {
  type: SicBoBetType;
  label: string;
  amount: number;
  isWinner: boolean;
  disabled: boolean;
  onPlace: () => void;
}) {
  const payout = SIC_BO_PAYOUTS[type];

  return (
    <button
      onClick={onPlace}
      disabled={disabled}
      className={`
        relative rounded-lg border px-2 py-1.5 text-center transition-all cursor-pointer
        ${isWinner
          ? 'border-casino-gold bg-casino-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
          : amount > 0
            ? 'border-casino-gold/50 bg-white/10'
            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="text-xs font-bold text-white">{label}</div>
      <div className="text-[10px] text-white/40">{payout}:1</div>
      {amount > 0 && (
        <div className="text-[10px] text-casino-gold font-medium mt-0.5">
          {formatCents(amount)}
        </div>
      )}
    </button>
  );
}

export default function SicBoBettingBoard({ bets, onPlaceBet, winningBets, disabled }: Props) {
  const winSet = new Set(winningBets);

  return (
    <div className="w-full space-y-3">
      {BET_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{section.label}</div>
          <div className={`grid gap-1.5 ${
            section.bets.length <= 2 ? 'grid-cols-2' :
            section.bets.length <= 7 ? 'grid-cols-7' :
            'grid-cols-7'
          }`}>
            {section.bets.map((bet) => (
              <BetCell
                key={bet.type}
                type={bet.type}
                label={bet.label}
                amount={bets[bet.type] || 0}
                isWinner={winSet.has(bet.type)}
                disabled={disabled}
                onPlace={() => onPlaceBet(bet.type)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
