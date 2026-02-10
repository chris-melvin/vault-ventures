import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import BankPanel from '../components/bank/BankPanel';
import InterestCounter from '../components/bank/InterestCounter';
import BankHistory from '../components/bank/BankHistory';
import { bank, wallet } from '../lib/api';
import { useGameStore } from '../stores/useGameStore';
import { useMetaStore } from '../stores/useMetaStore';
import { formatCents } from '../lib/constants';
import type { BankTransaction } from '@shared/types';

export default function BankPage() {
  const setBalance = useGameStore((s) => s.setBalance);
  const walletBalance = useGameStore((s) => s.balance_cents);
  const bankAccount = useMetaStore((s) => s.bankAccount);
  const setBankAccount = useMetaStore((s) => s.setBankAccount);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [acct, history, w] = await Promise.all([
        bank.getAccount(),
        bank.history(),
        wallet.balance(),
      ]);
      setBankAccount(acct);
      setTransactions(history);
      setBalance(w.balance_cents);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeposit = async (amount: number) => {
    setLoading(true);
    try {
      const acct = await bank.deposit(amount);
      setBankAccount(acct);
      setBalance(acct.wallet_balance_cents);
      const history = await bank.history();
      setTransactions(history);
    } catch {}
    setLoading(false);
  };

  const handleWithdraw = async (amount: number) => {
    setLoading(true);
    try {
      const acct = await bank.withdraw(amount);
      setBankAccount(acct);
      setBalance(acct.wallet_balance_cents);
      const history = await bank.history();
      setTransactions(history);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Bank</h2>
          <p className="text-white/40">Earn 0.5% interest per hour on your deposits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card-panel p-4 gold-glow">
            <div className="text-xs text-white/40 uppercase tracking-wider">Bank Balance</div>
            <div className="text-casino-gold font-bold text-2xl">
              {formatCents(bankAccount?.balance_cents ?? 0)}
            </div>
          </div>
          <div className="card-panel p-4">
            <div className="text-xs text-white/40 uppercase tracking-wider">Total Interest Earned</div>
            <div className="text-green-400 font-bold text-2xl">
              {formatCents(bankAccount?.total_interest_earned_cents ?? 0)}
            </div>
          </div>
          {bankAccount && (
            <InterestCounter
              bankBalance={bankAccount.balance_cents}
              lastInterestAt={bankAccount.last_interest_at}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BankPanel
            walletBalance={walletBalance}
            bankBalance={bankAccount?.balance_cents ?? 0}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            loading={loading}
          />
          <BankHistory transactions={transactions} />
        </div>
      </main>
    </div>
  );
}
