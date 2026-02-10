import { useState, useEffect } from 'react';
import { formatCents } from '../../lib/constants';

interface Props {
  bankBalance: number;
  lastInterestAt: number;
}

const RATE_PER_HOUR = 0.005;

export default function InterestCounter({ bankBalance, lastInterestAt }: Props) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (bankBalance <= 0) {
      setPending(0);
      return;
    }

    const update = () => {
      const now = Date.now() / 1000;
      const elapsed = now - lastInterestAt;
      const hours = elapsed / 3600;
      setPending(Math.floor(bankBalance * RATE_PER_HOUR * hours));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bankBalance, lastInterestAt]);

  if (bankBalance <= 0) return null;

  return (
    <div className="bg-casino-dark rounded-lg px-4 py-3">
      <div className="text-xs text-white/40 uppercase tracking-wider">Accruing Interest</div>
      <div className="text-green-400 font-bold text-lg">
        +{formatCents(pending)}
      </div>
      <div className="text-white/30 text-xs">0.1% per 12 hours</div>
    </div>
  );
}
