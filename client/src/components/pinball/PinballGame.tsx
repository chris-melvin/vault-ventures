import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PinballReel from './PinballReel';
import PinballBoard from './PinballBoard';
import ChipSelector from '../shared/ChipSelector';
import { useGameStore } from '../../stores/useGameStore';
import { useMetaStore } from '../../stores/useMetaStore';
import { pinball as pinballApi } from '../../lib/api';
import { formatCents, PINBALL_SYMBOL_EMOJIS } from '../../lib/constants';
import { PINBALL_POCKET_MULTIPLIERS } from '@shared/types';
import type { PinballSpinResult, PinballSymbol } from '@shared/types';

const BET_LEVELS = [
  { level: 1, balls: 1, label: '1 Ball' },
  { level: 2, balls: 2, label: '2 Balls' },
  { level: 3, balls: 5, label: '5 Balls' },
];

export default function PinballGame() {
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance, balance_cents } = useGameStore();
  const pushToasts = useMetaStore((s) => s.pushToasts);

  const [betLevel, setBetLevel] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<PinballSpinResult | null>(null);
  const [showBonus, setShowBonus] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [reelStops, setReelStops] = useState<(number | null)[]>([null, null, null]);
  const stoppedCountRef = useRef(0);

  const totalCost = currentBet * betLevel;

  const handleSpin = async () => {
    if (currentBet === 0 || spinning) return;

    setSpinning(true);
    setShowResult(false);
    setShowBonus(false);
    setResult(null);
    stoppedCountRef.current = 0;
    setReelStops([null, null, null]);

    try {
      const res = await pinballApi.spin(currentBet, betLevel);
      setResult(res);
      setBalance(res.new_balance_cents);
      if (res.new_achievements?.length) pushToasts(res.new_achievements);

      // Set reel stops to trigger deceleration
      setReelStops(res.reel_stops);
    } catch (err) {
      console.error(err);
      setSpinning(false);
    }
  };

  const handleReelStopped = useCallback(() => {
    stoppedCountRef.current += 1;
    if (stoppedCountRef.current >= 3) {
      setSpinning(false);
      // Short delay then show result or bonus
      setTimeout(() => {
        setShowResult(true);
      }, 400);
    }
  }, []);

  const handleBonusComplete = useCallback(() => {
    setShowBonus(false);
    // Result already shown during bonus
  }, []);

  const handleStartBonus = () => {
    setShowResult(false);
    setShowBonus(true);
  };

  const handleNewSpin = () => {
    setResult(null);
    setShowResult(false);
    setShowBonus(false);
    setReelStops([null, null, null]);
  };

  const isIdle = !spinning && !showBonus;
  const hasResult = result && showResult && !showBonus;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* Reels area */}
      <div
        className="w-full p-6 flex flex-col items-center gap-4 relative overflow-hidden rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #2a1a3e 0%, #1a0d2e 40%, #0d0618 100%)',
          border: '3px solid #8B6914',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Title */}
        <div className="text-center">
          <h2 className="text-casino-gold font-bold text-lg tracking-wider uppercase">
            Pinball Slots
          </h2>
          <p className="text-white/40 text-xs">Land {PINBALL_SYMBOL_EMOJIS.pinball} on reel 3 for bonus!</p>
        </div>

        {/* 3 Reels */}
        {!showBonus && (
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <PinballReel
                key={i}
                reelIndex={i}
                targetStop={reelStops[i]}
                spinning={spinning}
                onStopped={handleReelStopped}
                delay={i * 150}
              />
            ))}
          </div>
        )}

        {/* Bonus board */}
        {showBonus && result?.bonus && (
          <PinballBoard
            balls={result.bonus.balls}
            baseBet={currentBet}
            onComplete={handleBonusComplete}
          />
        )}

        {/* Result display */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-2"
            >
              {/* Payline symbols */}
              <div className="flex justify-center gap-2 text-3xl">
                {result.symbols.map((sym: PinballSymbol, i: number) => (
                  <span key={i}>{PINBALL_SYMBOL_EMOJIS[sym]}</span>
                ))}
              </div>

              {result.winning_symbol && !result.bonus_triggered && (
                <div className="text-casino-gold font-bold text-lg">
                  Win: {formatCents(result.payout_cents)}
                </div>
              )}

              {!result.winning_symbol && !result.bonus_triggered && (
                <div className="text-white/50 text-sm">No win</div>
              )}

              {result.bonus_triggered && !showBonus && (
                <div className="space-y-2">
                  <div className="text-casino-gold font-bold text-lg animate-pulse">
                    {PINBALL_SYMBOL_EMOJIS.pinball} BONUS TRIGGERED! {PINBALL_SYMBOL_EMOJIS.pinball}
                  </div>
                  {result.winning_symbol && (
                    <div className="text-white/70 text-sm">
                      Base win: {formatCents(currentBet * result.win_multiplier)}
                    </div>
                  )}
                  <button
                    onClick={handleStartBonus}
                    className="btn-primary px-6 py-2 text-base tracking-wider"
                  >
                    PLAY BONUS
                  </button>
                </div>
              )}

              {!result.bonus_triggered && (
                <button
                  onClick={handleNewSpin}
                  className="text-white/40 text-xs hover:text-white/60 transition-colors cursor-pointer mt-1"
                >
                  Spin again
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-bonus summary */}
        <AnimatePresence>
          {result && !showBonus && !showResult && result.bonus_triggered && result.bonus && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-2"
            >
              <div className="text-casino-gold font-bold text-xl">
                Total: {formatCents(result.payout_cents)}
              </div>
              <button
                onClick={handleNewSpin}
                className="text-white/40 text-xs hover:text-white/60 transition-colors cursor-pointer"
              >
                Spin again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pocket multipliers reference */}
        {!showBonus && (
          <div className="flex gap-1 text-[10px] text-white/30">
            {PINBALL_POCKET_MULTIPLIERS.map((m, i) => (
              <span key={i} className={m === 100 ? 'text-casino-gold/60 font-bold' : ''}>
                {m}x
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      {isIdle && !result && (
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Bet level selector */}
          <div className="flex gap-2">
            {BET_LEVELS.map(bl => (
              <button
                key={bl.level}
                onClick={() => setBetLevel(bl.level)}
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                style={{
                  backgroundColor: betLevel === bl.level ? 'rgba(212,175,55,0.2)' : 'transparent',
                  color: betLevel === bl.level ? '#d4af37' : 'rgba(255,255,255,0.4)',
                  border: `1.5px solid ${betLevel === bl.level ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                Lv{bl.level}: {bl.label}
              </button>
            ))}
          </div>

          <ChipSelector />

          {chipStack.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={removeLastChip} className="btn-secondary px-3 py-1.5 text-xs">
                UNDO
              </button>
              <button onClick={clearBet} className="btn-secondary px-3 py-1.5 text-xs">
                CLEAR
              </button>
            </div>
          )}

          <div className="text-center">
            <span className="text-white/50 text-xs">
              Base: {formatCents(currentBet)} x Lv{betLevel} = {' '}
              <span className="text-casino-gold font-bold">{formatCents(totalCost)}</span>
            </span>
          </div>

          <button
            onClick={handleSpin}
            disabled={spinning || currentBet === 0 || totalCost > balance_cents}
            className="btn-primary w-full text-lg tracking-wider"
          >
            SPIN
          </button>
        </div>
      )}
    </div>
  );
}
