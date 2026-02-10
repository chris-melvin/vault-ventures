import type { BankTransaction } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  transactions: BankTransaction[];
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DEPOSIT: { label: 'Deposit', color: 'text-blue-400' },
  WITHDRAW: { label: 'Withdraw', color: 'text-red-400' },
  INTEREST: { label: 'Interest', color: 'text-green-400' },
};

export default function BankHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="card-panel p-6 text-center text-white/30">
        No bank transactions yet
      </div>
    );
  }

  return (
    <div className="card-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold text-white/70">Transaction History</h3>
      </div>
      <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
        {transactions.map((tx) => {
          const info = TYPE_LABELS[tx.type] || { label: tx.type, color: 'text-white/50' };
          return (
            <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className={`text-sm font-bold ${info.color}`}>{info.label}</div>
                <div className="text-white/30 text-xs">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold text-sm ${tx.amount_cents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount_cents >= 0 ? '+' : ''}{formatCents(tx.amount_cents)}
                </div>
                <div className="text-white/30 text-xs">Bal: {formatCents(tx.balance_after_cents)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
