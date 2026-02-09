import { useState } from 'react';
import CardHand from '../cards/CardHand';
import ChipSelector from '../shared/ChipSelector';
import TableResult from '../shared/TableResult';
import GameHistory from '../shared/GameHistory';
import BaccaratBettingTable from './BaccaratBettingTable';
import { useGameStore } from '../../stores/useGameStore';
import { baccarat as bacApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { BaccaratResult, BaccaratBetType, GameHistoryEntry } from '@shared/types';

const WINNER_COLORS: Record<string, string> = {
  player: 'bg-blue-500',
  banker: 'bg-red-500',
  tie: 'bg-green-500',
};

const WINNER_LABELS: Record<string, string> = {
  player: 'P',
  banker: 'B',
  tie: 'T',
};

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderBaccaratEntry(entry: GameHistoryEntry) {
  const d = entry.result_data;
  const winner = d.winner as string;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${WINNER_COLORS[winner] ?? 'bg-gray-500'}`}>
          {WINNER_LABELS[winner] ?? '?'}
        </span>
        <span className="text-white/80">
          {d.playerValue} vs {d.bankerValue}
        </span>
        <span className="text-white/40 text-xs capitalize">{d.betType} bet</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white/25 text-xs">{timeAgo(entry.timestamp)}</span>
      </div>
    </div>
  );
}

export default function BaccaratGame() {
  const [betType, setBetType] = useState<BaccaratBetType>('player');
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance } = useGameStore();

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

  const hasResult = result !== null;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl flex-1 min-h-0 overflow-hidden">
      {/* Table felt */}
      <div
        className="w-full p-6 min-h-[440px] flex flex-col relative overflow-hidden rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #6b1a2a 0%, #4a1020 40%, #2a0a15 100%)',
          border: '3px solid #8B6914',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Felt texture overlay */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, transparent 1px, rgba(255,255,255,0.03) 1px)',
            backgroundSize: '4px 4px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-between py-2">
          {/* Card display area */}
          {hasResult ? (
            <div className="flex justify-center gap-12 w-full">
              <CardHand
                cards={result.banker_hand}
                label="Banker"
                value={result.banker_value}
                flipAnimation
              />
              <CardHand
                cards={result.player_hand}
                label="Player"
                value={result.player_value}
                delay={0.3}
                flipAnimation
              />
            </div>
          ) : (
            <div className="h-28 flex items-center">
              <span className="text-white/15 text-lg">Place your bet and deal</span>
            </div>
          )}

          {/* Inline table result */}
          <TableResult
            show={showResult}
            isWin={isWin}
            amount={isWin ? (result?.payout_cents ?? 0) : currentBet}
            message={resultMsg}
            onComplete={() => {
              setShowResult(false);
              setResult(null);
              clearBet();
              setHistoryKey(k => k + 1);
            }}
          />

          {/* Betting areas on the felt */}
          <BaccaratBettingTable
            selectedBet={betType}
            chips={chipStack}
            onSelectBet={setBetType}
            onPlaceChip={addChip}
            winner={hasResult ? result.winner : null}
            disabled={loading || hasResult}
          />
        </div>
      </div>

      {/* Bet controls below table */}
      {!hasResult && (
        <div className="flex flex-col items-center gap-3 w-full max-w-lg">
          <ChipSelector />

          {chipStack.length > 0 && (
            <div className="flex items-center gap-3">
              <button onClick={removeLastChip} className="btn-secondary px-4 py-2 text-sm">
                UNDO
              </button>
              <button onClick={clearBet} className="btn-secondary px-4 py-2 text-sm">
                CLEAR
              </button>
            </div>
          )}

          <div className="text-center">
            <span className="text-white/50 text-sm">Total Bet</span>
            <div className="text-casino-gold font-bold text-2xl">{formatCents(currentBet)}</div>
          </div>

          <button
            onClick={handleDeal}
            disabled={loading || currentBet === 0}
            className="btn-primary w-full text-lg tracking-wider"
          >
            {loading ? 'DEALING...' : 'DEAL'}
          </button>
        </div>
      )}

      <div className="w-full flex-1 min-h-0 flex flex-col">
        <GameHistory
          gameType="baccarat"
          refreshKey={historyKey}
          renderEntry={renderBaccaratEntry}
        />
      </div>
    </div>
  );
}
