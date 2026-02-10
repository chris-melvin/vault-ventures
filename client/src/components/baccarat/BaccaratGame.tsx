import { useState, useCallback } from 'react';
import CardHand from '../cards/CardHand';
import ChipSelector from '../shared/ChipSelector';
import TableResult from '../shared/TableResult';
import BaccaratRoads from './BaccaratRoads';
import BaccaratBettingTable from './BaccaratBettingTable';
import { useGameStore } from '../../stores/useGameStore';
import { useCardReveal, type RevealStep } from '../../hooks/useCardReveal';
import { BACCARAT_TIMINGS } from '../../lib/dealingTimings';
import { baccarat as bacApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { BaccaratResult, BaccaratBetType } from '@shared/types';

export default function BaccaratGame() {
  const [betType, setBetType] = useState<BaccaratBetType>('player');
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance } = useGameStore();
  const { positions, isAnimating, startReveal, skipToEnd, reset } = useCardReveal();

  const buildDealSteps = useCallback((res: BaccaratResult): RevealStep[] => {
    const t = BACCARAT_TIMINGS;
    const steps: RevealStep[] = [];

    // Deal 4 cards face-down alternating: player, banker, player, banker
    steps.push({ position: 'player', delay: 0, action: 'deal' });
    steps.push({ position: 'banker', delay: t.dealInterval, action: 'deal' });
    steps.push({ position: 'player', delay: t.dealInterval, action: 'deal' });
    steps.push({ position: 'banker', delay: t.dealInterval, action: 'deal' });

    // Dramatic pause, then flip player cards
    steps.push({ position: 'player', delay: t.preFlipPause, action: 'flip' });
    steps.push({ position: 'player', delay: t.flipInterval, action: 'flip' });

    // Dramatic pause, then flip banker cards
    steps.push({ position: 'banker', delay: t.betweenHandsPause, action: 'flip' });
    steps.push({ position: 'banker', delay: t.flipInterval, action: 'flip' });

    // 3rd cards if they exist
    if (res.player_hand.length > 2) {
      steps.push({ position: 'player', delay: t.thirdCardDealDelay, action: 'deal' });
      steps.push({ position: 'player', delay: t.thirdCardFlipDelay, action: 'flip' });
    }
    if (res.banker_hand.length > 2) {
      steps.push({ position: 'banker', delay: t.thirdCardDealDelay, action: 'deal' });
      steps.push({ position: 'banker', delay: t.thirdCardFlipDelay, action: 'flip' });
    }

    return steps;
  }, []);

  const handleDeal = async () => {
    setLoading(true);
    setShowResult(false);
    setResult(null);
    try {
      const res = await bacApi.deal(currentBet, betType);
      setResult(res);
      setBalance(res.new_balance_cents);

      const steps = buildDealSteps(res);
      startReveal(steps, {
        initialCounts: {
          player: { dealt: 0, flipped: 0 },
          banker: { dealt: 0, flipped: 0 },
        },
        onComplete: () => {
          setTimeout(() => setShowResult(true), 400);
        },
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (!result) return;
    skipToEnd({
      player: result.player_hand.length,
      banker: result.banker_hand.length,
    });
  };

  const isWin = result ? result.payout_cents > 0 : false;
  const resultMsg = result
    ? `${result.winner.charAt(0).toUpperCase() + result.winner.slice(1)} wins (${result.player_value} vs ${result.banker_value})`
    : '';

  const hasResult = result !== null;

  // Derive reveal counts from hook
  const playerDealt = positions['player']?.dealt;
  const playerFlipped = positions['player']?.flipped;
  const bankerDealt = positions['banker']?.dealt;
  const bankerFlipped = positions['banker']?.flipped;

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
        onClick={isAnimating ? handleSkip : undefined}
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
          {hasResult || isAnimating ? (
            <div className="flex justify-center gap-12 w-full">
              <CardHand
                cards={result?.banker_hand || []}
                label="Banker"
                value={result?.banker_value}
                dealtCount={bankerDealt}
                flippedCount={bankerFlipped}
              />
              <CardHand
                cards={result?.player_hand || []}
                label="Player"
                value={result?.player_value}
                dealtCount={playerDealt}
                flippedCount={playerFlipped}
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
              reset();
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
            winner={hasResult && !isAnimating ? result.winner : null}
            disabled={loading || hasResult || isAnimating}
          />
        </div>
      </div>

      {/* Bet controls below table */}
      {!hasResult && !isAnimating && (
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
        <BaccaratRoads refreshKey={historyKey} />
      </div>
    </div>
  );
}
