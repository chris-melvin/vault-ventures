import { useState } from 'react';
import RouletteWheel from './RouletteWheel';
import RouletteBettingTable from './RouletteBettingTable';
import ResultOverlay from '../shared/ResultOverlay';
import GameHistory from '../shared/GameHistory';
import ChipSelector from '../shared/ChipSelector';
import { useGameStore } from '../../stores/useGameStore';
import { useMetaStore } from '../../stores/useMetaStore';
import { roulette as rouletteApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { RouletteBet, RouletteSpinResult, GameHistoryEntry } from '@shared/types';
import { playSpinStart, playWinFanfare, playBigWinFanfare, playLoseSound } from '../../lib/sounds';

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const COLOR_EMOJI: Record<string, string> = { red: '🔴', black: '⚫', green: '🟢' };

function renderRouletteEntry(entry: GameHistoryEntry) {
  const d = entry.result_data;
  const payout = d.payoutCents ?? 0;
  const isWin = payout > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{COLOR_EMOJI[d.winningColor] || '⚪'}</span>
        <span className="text-white/80">{d.winningNumber}</span>
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

export default function RouletteGame() {
  const [spinning, setSpinning] = useState(false);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [result, setResult] = useState<RouletteSpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState({ amount: 0, isWin: false, message: '' });
  const [historyKey, setHistoryKey] = useState(0);
  const { setBalance, balance_cents, selectedChipValue } = useGameStore();
  const pushToasts = useMetaStore((s) => s.pushToasts);

  const totalBet = bets.reduce((s, b) => s + b.amount_cents, 0);

  const handlePlaceBet = (bet: RouletteBet) => {
    if (spinning) return;
    if (totalBet + bet.amount_cents > balance_cents) return;
    setBets((prev) => {
      const key = `${bet.type}:${bet.numbers.join(',')}`;
      const existing = prev.findIndex(
        (b) => `${b.type}:${b.numbers.join(',')}` === key
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], amount_cents: updated[existing].amount_cents + bet.amount_cents };
        return updated;
      }
      return [...prev, bet];
    });
    setWinningNumber(null);
    setResult(null);
  };

  const handleClearAll = () => {
    setBets([]);
    setWinningNumber(null);
    setResult(null);
  };

  const handleSpin = async () => {
    if (spinning || totalBet === 0) return;
    setSpinning(true);
    setWinningNumber(null);
    setResult(null);

    setBalance(balance_cents - totalBet);
    playSpinStart();

    try {
      const res = await rouletteApi.spin(bets);
      setResult(res);
      setWinningNumber(res.winning_number);
    } catch {
      setBalance(balance_cents);
      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    if (!result) return;
    setSpinning(false);
    setBalance(result.new_balance_cents);
    if (result.new_achievements?.length) pushToasts(result.new_achievements);

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
      message: `${COLOR_EMOJI[result.winning_color]} ${result.winning_number} ${result.winning_color} — ${
        isWin ? `Won ${formatCents(result.payout_cents)}` : 'No winning bets'
      }`,
    });
    setHistoryKey((k) => k + 1);
    setTimeout(() => setShowResult(true), 300);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full">
        {/* Wheel */}
        <RouletteWheel
          winningNumber={winningNumber}
          spinning={spinning}
          onSpinComplete={handleSpinComplete}
        />

        {/* Betting table */}
        <div className="flex-1 w-full max-w-md overflow-y-auto max-h-[420px]">
          <RouletteBettingTable
            bets={bets}
            onPlaceBet={handlePlaceBet}
            winningNumber={winningNumber}
            disabled={spinning}
            chipValue={selectedChipValue}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <ChipSelector />

        {totalBet > 0 && !spinning && (
          <button onClick={handleClearAll} className="btn-secondary px-4 py-2 text-sm">
            CLEAR ALL
          </button>
        )}

        <div className="text-center">
          <span className="text-white/50 text-sm">Total Bet</span>
          <div className="text-casino-gold font-bold text-2xl">{formatCents(totalBet)}</div>
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning || totalBet === 0}
          className="btn-primary w-full text-lg tracking-wider"
        >
          {spinning ? 'SPINNING...' : 'SPIN'}
        </button>
      </div>

      {/* History */}
      <div className="w-full flex-1 min-h-0 flex flex-col">
        <GameHistory gameType="roulette" refreshKey={historyKey} renderEntry={renderRouletteEntry} />
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
