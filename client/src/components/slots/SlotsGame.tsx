import { useState, useRef, useCallback } from 'react';
import Reel from './Reel';
import BetControls from '../shared/BetControls';
import ResultOverlay from '../shared/ResultOverlay';
import { useGameStore } from '../../stores/useGameStore';
import { slots as slotsApi } from '../../lib/api';
import { formatCents, SLOT_SYMBOL_EMOJIS } from '../../lib/constants';
import type { SlotsSpinResult } from '@shared/types';

const REEL_COUNT = 5;

export default function SlotsGame() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SlotsSpinResult | null>(null);
  const [reelStops, setReelStops] = useState<(number | null)[]>(Array(REEL_COUNT).fill(null));
  const [showResult, setShowResult] = useState(false);
  const stoppedCountRef = useRef(0);
  const { currentBet, setBalance, setSpinning: setStoreSpinning } = useGameStore();

  const handleReelStopped = useCallback(() => {
    stoppedCountRef.current++;
    if (stoppedCountRef.current >= REEL_COUNT && result) {
      setSpinning(false);
      setStoreSpinning(false);
      setBalance(result.new_balance_cents);

      if (result.payout_cents > 0 || result.paylines.length > 0) {
        setTimeout(() => setShowResult(true), 200);
      }
    }
  }, [result, setBalance, setStoreSpinning]);

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setStoreSpinning(true);
    setShowResult(false);
    stoppedCountRef.current = 0;

    // Start all reels spinning (no stops yet)
    setReelStops(Array(REEL_COUNT).fill(null));

    try {
      const res = await slotsApi.spin(currentBet);
      setResult(res);
      // Set target stops (reels will decelerate to these positions)
      setReelStops(res.reel_stops);
    } catch (err: any) {
      setSpinning(false);
      setStoreSpinning(false);
    }
  };

  const resultMessage = result?.paylines.length
    ? result.paylines.map(p => {
        const sym = p.symbols[0];
        return `${SLOT_SYMBOL_EMOJIS[sym]} ${p.multiplier}x`;
      }).join(' + ')
    : 'No win';

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Slot machine frame */}
      <div className="card-panel p-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent rounded-xl" />
        <div className="relative z-10">
          <div className="text-center mb-4">
            <h3 className="text-casino-gold font-bold text-lg tracking-wider">MEGA SLOTS</h3>
          </div>

          <div className="flex gap-2 justify-center p-4 bg-casino-black/50 rounded-lg">
            {Array.from({ length: REEL_COUNT }).map((_, i) => (
              <Reel
                key={i}
                reelIndex={i}
                targetStop={reelStops[i]}
                spinning={spinning}
                onStopped={handleReelStopped}
                delay={i * 100}
                isNearMiss={result?.is_near_miss ?? false}
              />
            ))}
          </div>

          {/* Payline display */}
          {result && !spinning && result.paylines.length > 0 && (
            <div className="mt-4 text-center">
              <div className="text-casino-gold text-sm font-bold animate-pulse">
                {resultMessage}
              </div>
            </div>
          )}
        </div>
      </div>

      <BetControls
        onAction={handleSpin}
        actionLabel={spinning ? 'SPINNING...' : 'SPIN'}
        disabled={spinning}
      />

      <ResultOverlay
        show={showResult}
        amount={result?.payout_cents ?? 0}
        isWin={(result?.payout_cents ?? 0) > 0}
        message={resultMessage}
        onDismiss={() => setShowResult(false)}
      />
    </div>
  );
}
