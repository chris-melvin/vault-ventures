import { useGameStore } from '../../stores/useGameStore';
import { formatCents } from '../../lib/constants';

export default function BalanceDisplay() {
  const balance = useGameStore((s) => s.balance_cents);

  return (
    <div className="card-panel px-6 py-3 inline-flex flex-col items-center">
      <span className="text-xs text-white/50 uppercase tracking-wider">Balance</span>
      <span className="text-casino-gold font-bold text-xl">{formatCents(balance)}</span>
    </div>
  );
}
