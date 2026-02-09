import { useState, useRef, useCallback, useEffect } from 'react';
import WheelCanvas from './WheelCanvas';
import type { WheelCanvasHandle } from './WheelCanvas';
import BettingBoard from './BettingBoard';
import ResultOverlay from '../shared/ResultOverlay';
import { useGameStore } from '../../stores/useGameStore';
import { wheel as wheelApi } from '../../lib/api';
import { getSymbolConfig, type WheelSymbol } from '@shared/types';
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

export default function WheelGame() {
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState({ amount: 0, isWin: false, message: '' });
  const [bets, setBets] = useState<Partial<Record<WheelSymbol, number>>>({});
  const [winningSymbol, setWinningSymbol] = useState<WheelSymbol | null>(null);
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
