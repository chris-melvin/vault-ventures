import { useState } from 'react';
import CardHand from '../blackjack/CardHand';
import BetControls from '../shared/BetControls';
import ResultOverlay from '../shared/ResultOverlay';
import { useGameStore } from '../../stores/useGameStore';
import { baccarat as bacApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { BaccaratResult, BaccaratBetType } from '@shared/types';

export default function BaccaratGame() {
  const [betType, setBetType] = useState<BaccaratBetType>('player');
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { currentBet, setBalance } = useGameStore();

  const handleDeal = async () => {
    setLoading(true);
    setShowResult(false);
    setResult(null);
    try {
      const res = await bacApi.deal(currentBet, betType);
      setResult(res);
      setBalance(res.new_balance_cents);
      setTimeout(() => setShowResult(true), 1200);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isWin = result ? result.payout_cents > 0 : false;
  const resultMsg = result
    ? `${result.winner.charAt(0).toUpperCase() + result.winner.slice(1)} wins (${result.player_value} vs ${result.banker_value})`
    : '';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      {/* Bet type selector */}
      <div className="flex gap-3">
        {(['player', 'banker', 'tie'] as BaccaratBetType[]).map((type) => (
          <button
            key={type}
            onClick={() => !loading && setBetType(type)}
            className={`px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all cursor-pointer ${
              betType === type
                ? 'bg-casino-gold text-casino-black'
                : 'bg-casino-card text-white/60 border border-white/10 hover:border-casino-gold/30'
            }`}
          >
            {type}
            <span className="block text-xs font-normal opacity-60 mt-0.5">
              {type === 'player' ? '1:1' : type === 'banker' ? '0.95:1' : '8:1'}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-panel w-full p-8 min-h-[350px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/30 to-casino-dark rounded-xl" />

        <div className="relative z-10 flex flex-col items-center gap-8 flex-1 justify-center">
          {result ? (
            <>
              <CardHand
                cards={result.banker_hand}
                label="Banker"
                value={result.banker_value}
              />

              <div className={`text-center text-lg font-bold ${
                result.winner === betType ? 'text-casino-gold' : 'text-white/50'
              }`}>
                {resultMsg}
              </div>

              <CardHand
                cards={result.player_hand}
                label="Player"
                value={result.player_value}
                delay={0.3}
              />
            </>
          ) : (
            <div className="text-white/20 text-lg">
              Select bet type, amount, and deal
            </div>
          )}
        </div>
      </div>

      <BetControls
        onAction={handleDeal}
        actionLabel={loading ? 'DEALING...' : 'DEAL'}
        disabled={loading}
      />

      <ResultOverlay
        show={showResult}
        amount={result?.payout_cents ?? currentBet}
        isWin={isWin}
        message={resultMsg}
        onDismiss={() => {
          setShowResult(false);
          setResult(null);
        }}
      />
    </div>
  );
}
