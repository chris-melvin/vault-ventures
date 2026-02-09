import { useState, useRef, useCallback, useEffect } from 'react';
import WheelCanvas from './WheelCanvas';
import type { WheelCanvasHandle } from './WheelCanvas';
import BettingBoard from './BettingBoard';
import ResultOverlay from '../shared/ResultOverlay';
import GameHistory from '../shared/GameHistory';
import { useGameStore } from '../../stores/useGameStore';
import { wheel as wheelApi } from '../../lib/api';
import { getSymbolConfig, WHEEL_SYMBOL_CONFIGS, type WheelSymbol, type GameHistoryEntry } from '@shared/types';
import { formatCents } from '../../lib/constants';
import { playPegTick, playSpinStart, playWinFanfare, playBigWinFanfare, playLoseSound } from '../../lib/sounds';
import {
  createWheelState,
  startSpin,
  setTarget,
  stepPhysics,
  getDisplayAngle,
  type WheelPhysicsState,
} from './wheelPhysics';

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderWheelEntry(entry: GameHistoryEntry) {
  const d = entry.result_data;
  const config = WHEEL_SYMBOL_CONFIGS.find(c => c.symbol === d.winningSymbol);
  const payout = d.payoutCents ?? 0;
  const isWin = payout > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: config?.color ?? '#888' }}
        />
        <span className="text-lg">{config?.emoji ?? '?'}</span>
        <span className="text-white/80">{config?.name ?? d.winningSymbol}</span>
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

export default function WheelGame() {
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState({ amount: 0, isWin: false, message: '' });
  const [bets, setBets] = useState<Partial<Record<WheelSymbol, number>>>({});
  const [winningSymbol, setWinningSymbol] = useState<WheelSymbol | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const physicsRef = useRef<WheelPhysicsState>(createWheelState());
  const animRef = useRef<number>(0);
  const canvasRef = useRef<WheelCanvasHandle>(null);
  const { setBalance, setSpinning: setStoreSpinning, balance_cents } = useGameStore();

  const animate = useCallback(() => {
    const state = physicsRef.current;
    stepPhysics(state, performance.now());

    // Draw directly to canvas — no React state delay
    canvasRef.current?.draw(getDisplayAngle(state));

    if (state.phase === 'free-spin' || state.phase === 'decelerating') {
      animRef.current = requestAnimationFrame(animate);
    }
  }, []);

  const handlePlaceBet = (symbol: WheelSymbol, amount: number) => {
    setBets((prev) => ({
      ...prev,
      [symbol]: (prev[symbol] || 0) + amount,
    }));
    setWinningSymbol(null);
  };

  const handleClearBet = (symbol: WheelSymbol) => {
    setBets((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  const handleClearAll = () => {
    setBets({});
    setWinningSymbol(null);
  };

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setStoreSpinning(true);
    setWinningSymbol(null);

    // Optimistic balance deduction
    const totalBet = Object.values(bets).reduce((sum, v) => sum + (v || 0), 0);
    setBalance(balance_cents - totalBet);

    const state = physicsRef.current;
    state.onPegHit = () => {
      playPegTick();
    };

    playSpinStart();
    startSpin(state);
    animRef.current = requestAnimationFrame(animate);

    try {
      const result = await wheelApi.spin(bets);

      setTarget(state, result.target_segment);

      state.onSettled = () => {
        // Force one final draw at exact target angle
        canvasRef.current?.draw(getDisplayAngle(physicsRef.current));

        // Set authoritative balance from server
        setBalance(result.new_balance_cents);
        setSpinning(false);
        setStoreSpinning(false);
        setWinningSymbol(result.winning_symbol);

        const config = getSymbolConfig(result.winning_symbol);
        const hadBet = (result.bets[result.winning_symbol] || 0) > 0;
        const isWin = result.payout_cents > 0;

        // Play result sound
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
          message: hadBet
            ? `${config.emoji} ${config.name} (${config.payout}:1) — Won ${formatCents(result.payout_cents)}`
            : `${config.emoji} ${config.name} — No bet on winning symbol`,
        });
        setHistoryKey(k => k + 1);
        setTimeout(() => setShowResult(true), 300);
      };
    } catch (err: any) {
      // Revert optimistic update
      setBalance(balance_cents);
      state.phase = 'idle';
      setSpinning(false);
      setStoreSpinning(false);
      cancelAnimationFrame(animRef.current);
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 w-full">
        <div className="relative flex-shrink-0">
          <WheelCanvas ref={canvasRef} size={420} />
        </div>

        <BettingBoard
          bets={bets}
          onPlaceBet={handlePlaceBet}
          onClearBet={handleClearBet}
          onClearAll={handleClearAll}
          onSpin={handleSpin}
          spinning={spinning}
          winningSymbol={winningSymbol}
        />
      </div>

      <div className="w-full max-w-2xl flex-1 min-h-0 flex flex-col">
        <GameHistory
          gameType="wheel"
          refreshKey={historyKey}
          renderEntry={renderWheelEntry}
        />
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
