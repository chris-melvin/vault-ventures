import { useState } from 'react';
import DiceDisplay from './DiceDisplay';
import SicBoBettingBoard from './SicBoBettingBoard';
import ResultOverlay from '../shared/ResultOverlay';
import GameHistory from '../shared/GameHistory';
import ChipSelector from '../shared/ChipSelector';
import { useGameStore } from '../../stores/useGameStore';
import { useMetaStore } from '../../stores/useMetaStore';
import { sicbo as sicboApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { SicBoBetType, GameHistoryEntry } from '@shared/types';
import { playWinFanfare, playBigWinFanfare, playLoseSound } from '../../lib/sounds';

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderSicBoEntry(entry: GameHistoryEntry) {
  const d = entry.result_data;
  const payout = d.payoutCents ?? 0;
  const isWin = payout > 0;
  const dice = d.dice as number[];
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎲</span>
        <span className="text-white/80">{dice.join(' - ')} (Total: {d.total})</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={isWin ? 'text-green-400 font-medium' : 'text-white/40'}>
          {isWin ? `+${formatCents(payout)}` : 'Loss'}
        </span>
        <span className="text-white/25 text-xs">{timeAgo(entry.timestamp)}</span>
      </div>
    </div>
  );
}

export default function SicBoGame() {
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<[number, number, number] | null>(null);
  const [bets, setBets] = useState<Partial<Record<SicBoBetType, number>>>({});
  const [winningBets, setWinningBets] = useState<SicBoBetType[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState({ amount: 0, isWin: false, message: '' });
  const [historyKey, setHistoryKey] = useState(0);
  const { setBalance, balance_cents, selectedChipValue } = useGameStore();
  const pushToasts = useMetaStore((s) => s.pushToasts);

  const totalBet = Object.values(bets).reduce((sum, v) => sum + (v || 0), 0);

  const handlePlaceBet = (betType: SicBoBetType) => {
    if (rolling) return;
    if (totalBet + selectedChipValue > balance_cents) return;
    setBets((prev) => ({
      ...prev,
      [betType]: (prev[betType] || 0) + selectedChipValue,
    }));
    setWinningBets([]);
    setDice(null);
  };

  const handleClearAll = () => {
    setBets({});
    setWinningBets([]);
    setDice(null);
  };

  const handleRoll = async () => {
    if (rolling || totalBet === 0) return;
    setRolling(true);
    setWinningBets([]);
    setDice(null);

    // Optimistic balance deduction
    setBalance(balance_cents - totalBet);

    try {
      const result = await sicboApi.roll(bets);

      // Show rolling animation for a bit, then reveal
      setTimeout(() => {
        setDice(result.dice);
        setRolling(false);
        setBalance(result.new_balance_cents);
        if (result.new_achievements?.length) pushToasts(result.new_achievements);
        setWinningBets(result.winning_bets);

        const isWin = result.payout_cents > 0;
        if (isWin) {
          if (result.payout_cents >= totalBet * 10) {
            playBigWinFanfare();
          } else {
            playWinFanfare();
          }
        } else {
          playLoseSound();
        }

        setResultData({
          amount: isWin ? result.payout_cents : totalBet,
          isWin,
          message: isWin
            ? `🎲 ${result.dice.join('-')} (Total: ${result.total}) — Won ${formatCents(result.payout_cents)}`
            : `🎲 ${result.dice.join('-')} (Total: ${result.total}) — No winning bets`,
        });
        setHistoryKey((k) => k + 1);
        setTimeout(() => setShowResult(true), 300);
      }, 800);
    } catch {
      setBalance(balance_cents);
      setRolling(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl flex-1 min-h-0 overflow-hidden">
      {/* Dice display */}
      <DiceDisplay dice={dice} rolling={rolling} />

      {dice && (
        <div className="text-center">
          <span className="text-white/60 text-sm">Total: </span>
          <span className="text-casino-gold font-bold text-lg">{dice[0] + dice[1] + dice[2]}</span>
        </div>
      )}

      {/* Betting board */}
      <div className="w-full overflow-y-auto max-h-[360px]">
        <SicBoBettingBoard
          bets={bets}
          onPlaceBet={handlePlaceBet}
          winningBets={winningBets}
          disabled={rolling}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <ChipSelector />

        <div className="flex items-center gap-3">
          {totalBet > 0 && (
            <button onClick={handleClearAll} disabled={rolling} className="btn-secondary px-4 py-2 text-sm">
              CLEAR ALL
            </button>
          )}
        </div>

        <div className="text-center">
          <span className="text-white/50 text-sm">Total Bet</span>
          <div className="text-casino-gold font-bold text-2xl">{formatCents(totalBet)}</div>
        </div>

        <button
          onClick={handleRoll}
          disabled={rolling || totalBet === 0}
          className="btn-primary w-full text-lg tracking-wider"
        >
          {rolling ? 'ROLLING...' : 'ROLL DICE'}
        </button>
      </div>

      {/* History */}
      <div className="w-full flex-1 min-h-0 flex flex-col">
        <GameHistory gameType="sicbo" refreshKey={historyKey} renderEntry={renderSicBoEntry} />
      </div>

      <ResultOverlay
        show={showResult}
        amount={resultData.amount}
        isWin={resultData.isWin}
        message={resultData.message}
        onDismiss={() => setShowResult(false)}
      />
    </div>
  );
}
