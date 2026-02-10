import { useState } from 'react';
import { formatCents, CHIP_VALUES } from '../../lib/constants';

interface Props {
  walletBalance: number;
  bankBalance: number;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  loading: boolean;
}

export default function BankPanel({ walletBalance, bankBalance, onDeposit, onWithdraw, loading }: Props) {
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  const maxAmount = mode === 'deposit' ? walletBalance : bankBalance;
  const presets = [1000, 5000, 10000, 50000, 100000].filter((v) => v <= maxAmount);

  const handleAction = () => {
    if (amount <= 0) return;
    if (mode === 'deposit') onDeposit(amount);
    else onWithdraw(amount);
    setAmount(0);
  };

  return (
    <div className="card-panel p-6">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('deposit'); setAmount(0); }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
            mode === 'deposit'
              ? 'bg-casino-gold text-casino-black'
              : 'bg-casino-dark text-white/50 hover:text-white/80'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => { setMode('withdraw'); setAmount(0); }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
            mode === 'withdraw'
              ? 'bg-casino-gold text-casino-black'
              : 'bg-casino-dark text-white/50 hover:text-white/80'
          }`}
        >
          Withdraw
        </button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-white/40 mb-1">
          {mode === 'deposit' ? 'Wallet' : 'Bank'} Available: {formatCents(maxAmount)}
        </div>
        <input
          type="number"
          value={amount || ''}
          onChange={(e) => setAmount(Math.min(Number(e.target.value), maxAmount))}
          placeholder="Enter amount in cents..."
          className="input-field"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              amount === v
                ? 'bg-casino-gold text-casino-black'
                : 'bg-casino-dark text-white/60 hover:text-white'
            }`}
          >
            {formatCents(v)}
          </button>
        ))}
        {maxAmount > 0 && (
          <button
            onClick={() => setAmount(maxAmount)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-casino-dark text-white/60 hover:text-white cursor-pointer"
          >
            MAX
          </button>
        )}
      </div>

      <button
        onClick={handleAction}
        disabled={amount <= 0 || loading}
        className="btn-primary w-full"
      >
        {loading ? 'Processing...' : `${mode === 'deposit' ? 'Deposit' : 'Withdraw'} ${formatCents(amount)}`}
      </button>
    </div>
  );
}
