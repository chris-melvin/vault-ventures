import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CardHand from '../cards/CardHand';
import ChipSelector from '../shared/ChipSelector';
import BettingCircle from '../shared/BettingCircle';
import TableResult from '../shared/TableResult';
import { useGameStore } from '../../stores/useGameStore';
import { useMetaStore } from '../../stores/useMetaStore';
import { useCardReveal, type RevealStep } from '../../hooks/useCardReveal';
import { BLACKJACK_TIMINGS } from '../../lib/dealingTimings';
import { blackjack as bjApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import { handValue } from './blackjackLogic';
import type { BlackjackState, BlackjackAction } from '@shared/types';

const ACTION_LABELS: Record<string, string> = {
  hit: 'HIT',
  stand: 'STAND',
  double: 'DOUBLE',
  split: 'SPLIT',
  surrender: 'SURRENDER',
  insurance_yes: 'YES',
  insurance_no: 'NO',
};

const ALL_PLAY_ACTIONS: BlackjackAction[] = ['hit', 'stand', 'double', 'split', 'surrender'];

export default function BlackjackGame() {
  const [game, setGame] = useState<BlackjackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [numHands, setNumHands] = useState(1);
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance } = useGameStore();
  const pushToasts = useMetaStore((s) => s.pushToasts);
  const { positions, isAnimating, startReveal, skipToEnd, reset } = useCardReveal();

  const isPlaying = game?.game_status === 'playing';
  const isInsurancePrompt = game?.game_status === 'insurance_prompt';
  const isResolved = game?.game_status === 'resolved';
  const hasMultipleHands = game && game.hands.length > 1;

  // Position key for a player hand index
  // Multi-hand deal uses 'hand0'/'hand1'/'hand2', single uses 'player'
  const getHandKey = (idx: number) => numHands > 1 ? `hand${idx}` : 'player';

  const buildDealSteps = useCallback((result: BlackjackState, dealtNumHands: number): RevealStep[] => {
    const t = BLACKJACK_TIMINGS;
    const steps: RevealStep[] = [];
    const handKeys = dealtNumHands > 1
      ? result.hands.map((_, i) => `hand${i}`)
      : ['player'];

    // Round 1: first card to each hand, then dealer
    for (const key of handKeys) {
      steps.push({ position: key, delay: steps.length === 0 ? 0 : t.dealInterval, action: 'deal' });
      steps.push({ position: key, delay: t.flipDelay, action: 'flip' });
    }
    steps.push({ position: 'dealer', delay: t.dealInterval, action: 'deal' });
    steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });

    // Round 2: second card to each hand, then dealer hole card
    for (const key of handKeys) {
      steps.push({ position: key, delay: t.dealInterval, action: 'deal' });
      steps.push({ position: key, delay: t.flipDelay, action: 'flip' });
    }
    steps.push({ position: 'dealer', delay: t.dealInterval, action: 'deal' });

    // If game is already resolved (all naturals), flip the hole card
    if (result.game_status === 'resolved') {
      steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });
    }

    return steps;
  }, []);

  const handleDeal = async () => {
    setLoading(true);
    setShowResult(false);
    try {
      const result = await bjApi.deal(currentBet, numHands);
      setGame(result);
      setBalance(result.new_balance_cents);
      if (result.new_achievements?.length) pushToasts(result.new_achievements);

      const steps = buildDealSteps(result, numHands);
      const handKeys = numHands > 1
        ? result.hands.map((_, i) => `hand${i}`)
        : ['player'];

      const initialCounts: Record<string, { dealt: number; flipped: number }> = {
        dealer: { dealt: 0, flipped: 0 },
      };
      for (const key of handKeys) {
        initialCounts[key] = { dealt: 0, flipped: 0 };
      }

      startReveal(steps, {
        initialCounts,
        onComplete: () => {
          if (result.game_status === 'resolved') {
            setTimeout(() => setShowResult(true), 400);
          }
        },
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: BlackjackAction) => {
    if (!game || loading) return;
    setLoading(true);
    const activeIdx = game.active_hand_index;
    const activeKey = getHandKey(activeIdx);
    const prevPlayerCount = (game.hands[activeIdx]?.cards || game.player_hand).length;

    try {
      let result: BlackjackState;

      switch (action) {
        case 'hit':
          result = await bjApi.hit(game.session_id);
          break;
        case 'stand':
          result = await bjApi.stand(game.session_id);
          break;
        case 'double':
          result = await bjApi.double(game.session_id);
          break;
        case 'split':
          result = await bjApi.split(game.session_id);
          break;
        case 'surrender':
          result = await bjApi.surrender(game.session_id);
          break;
        case 'insurance_yes':
          result = await bjApi.insurance(game.session_id, true);
          break;
        case 'insurance_no':
          result = await bjApi.insurance(game.session_id, false);
          break;
        default:
          return;
      }

      setGame(result);
      setBalance(result.new_balance_cents);
      if (result.new_achievements?.length) pushToasts(result.new_achievements);

      const t = BLACKJACK_TIMINGS;

      // Build initialCounts preserving all current hand positions
      const buildInitialCounts = () => {
        const counts: Record<string, { dealt: number; flipped: number }> = {};
        for (const [key, val] of Object.entries(positions)) {
          counts[key] = { ...val };
        }
        counts[activeKey] = { dealt: prevPlayerCount, flipped: prevPlayerCount };
        if (!counts['dealer']) {
          counts['dealer'] = { dealt: 2, flipped: 1 };
        }
        return counts;
      };

      if (action === 'hit' || action === 'double') {
        const steps: RevealStep[] = [];
        steps.push({ position: activeKey, delay: t.hitDealDelay, action: 'deal' });
        steps.push({ position: activeKey, delay: t.hitFlipDelay, action: 'flip' });

        if (result.game_status === 'resolved') {
          steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });
          for (let i = 2; i < result.dealer_hand.length; i++) {
            steps.push({ position: 'dealer', delay: t.dealInterval, action: 'deal' });
            steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });
          }
        }

        startReveal(steps, {
          initialCounts: buildInitialCounts(),
          onComplete: () => {
            if (result.game_status === 'resolved') {
              setTimeout(() => setShowResult(true), 400);
            }
          },
        });
      } else if (action === 'stand' || action === 'surrender') {
        const steps: RevealStep[] = [];

        if (result.game_status === 'resolved') {
          steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });
          for (let i = 2; i < result.dealer_hand.length; i++) {
            steps.push({ position: 'dealer', delay: t.dealInterval, action: 'deal' });
            steps.push({ position: 'dealer', delay: t.flipDelay, action: 'flip' });
          }
        }

        if (steps.length > 0) {
          startReveal(steps, {
            initialCounts: buildInitialCounts(),
            onComplete: () => {
              if (result.game_status === 'resolved') {
                setTimeout(() => setShowResult(true), 400);
              }
            },
          });
        } else if (result.game_status === 'resolved') {
          setTimeout(() => setShowResult(true), 400);
        }
      } else if (action === 'split') {
        // Reset reveal state — split changes hand structure
        reset();
        if (result.game_status === 'resolved') {
          setTimeout(() => setShowResult(true), 600);
        }
      } else if (action === 'insurance_yes' || action === 'insurance_no') {
        if (result.game_status === 'resolved') {
          // Dealer had blackjack — flip hole card
          startReveal(
            [{ position: 'dealer', delay: 300, action: 'flip' }],
            {
              initialCounts: buildInitialCounts(),
              onComplete: () => {
                setTimeout(() => setShowResult(true), 400);
              },
            },
          );
        }
        // else: insurance declined, no animation, continue playing
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (!game) return;
    const finalCounts: Record<string, number> = {
      dealer: game.dealer_hand.length,
    };
    if (numHands > 1) {
      game.hands.forEach((hand, idx) => {
        finalCounts[`hand${idx}`] = hand.cards.length;
      });
    } else {
      finalCounts['player'] = (game.hands[game.active_hand_index]?.cards || game.player_hand).length;
    }
    skipToEnd(finalCounts);
  };

  const getResultInfo = (): { amount: number; isWin: boolean; message: string } => {
    if (!game || game.game_status !== 'resolved') return { amount: 0, isWin: false, message: '' };

    const multiHand = game.hands.length > 1;

    if (multiHand) {
      const totalBet = game.hands.reduce((sum, h) => sum + h.bet_cents, 0);
      const payout = game.total_payout_cents;
      const net = payout - totalBet;

      if (net > 0) return { amount: payout, isWin: true, message: `+${formatCents(net)}` };
      if (net === 0) return { amount: 0, isWin: false, message: 'Break even' };
      return { amount: totalBet - payout, isWin: false, message: 'Lost' };
    }

    const outcome = game.hand_outcomes[0];
    const hand = game.hands[0];

    if (hand?.status === 'surrendered') {
      return { amount: Math.floor(hand.bet_cents / 2), isWin: false, message: 'Surrendered - half bet returned' };
    }

    switch (outcome) {
      case 'blackjack':
        return { amount: game.total_payout_cents, isWin: true, message: 'Blackjack! 3:2 payout' };
      case 'player_win':
        return { amount: game.total_payout_cents, isWin: true, message: 'You win!' };
      case 'dealer_bust':
        return { amount: game.total_payout_cents, isWin: true, message: 'Dealer busts!' };
      case 'player_bust':
        return { amount: hand?.bet_cents || currentBet, isWin: false, message: 'Bust!' };
      case 'dealer_win':
        return { amount: hand?.bet_cents || currentBet, isWin: false, message: 'Dealer wins' };
      case 'push':
        return { amount: 0, isWin: false, message: 'Push - bet returned' };
      default:
        return { amount: 0, isWin: false, message: '' };
    }
  };

  const resultInfo = getResultInfo();

  // Derive dealer reveal counts from hook positions
  const dealerDealt = positions['dealer']?.dealt;
  const dealerFlipped = positions['dealer']?.flipped;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      {/* Table felt */}
      <div
        className="w-full p-6 min-h-[420px] flex flex-col relative overflow-hidden"
        style={{
          borderRadius: '50% 50% 12px 12px / 20% 20% 0 0',
          background: 'radial-gradient(ellipse at 50% 40%, #1e7a45 0%, #1a6b3c 40%, #0d4a2a 100%)',
          border: '3px solid #8B6914',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={isAnimating ? handleSkip : undefined}
      >
        {/* Felt texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, transparent 1px, rgba(0,0,0,0.05) 1px)',
            backgroundSize: '4px 4px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-between py-4">
          {/* Dealer hand */}
          {game ? (
            <CardHand
              cards={game.dealer_hand}
              label="Dealer"
              value={game.dealer_value ?? (game.game_status !== 'resolved' ? handValue(game.dealer_hand) : null)}
              dealtCount={dealerDealt}
              flippedCount={dealerFlipped}
            />
          ) : (
            <div className="h-20" />
          )}

          {/* Insurance line */}
          <div className="w-full flex items-center gap-2 px-4 opacity-30">
            <div className="flex-1 border-t border-dashed border-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest">Insurance</span>
            <div className="flex-1 border-t border-dashed border-white/40" />
          </div>

          {/* Insurance prompt overlay */}
          <AnimatePresence>
            {isInsurancePrompt && !isAnimating && (
              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="text-casino-gold font-bold text-lg uppercase tracking-wider">Insurance?</div>
                <div className="text-white/60 text-sm">
                  Cost: {formatCents(Math.floor((game?.hands[0]?.bet_cents || currentBet) / 2))}
                </div>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => handleAction('insurance_yes')}
                    disabled={loading}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#d4af37',
                      border: '1.5px solid rgba(212,175,55,0.5)',
                    }}
                  >
                    YES
                  </motion.button>
                  <motion.button
                    onClick={() => handleAction('insurance_no')}
                    disabled={loading}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(192,57,43,0.4)',
                      color: '#e74c3c',
                      border: '1.5px solid rgba(192,57,43,0.5)',
                    }}
                  >
                    NO
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline table result */}
          <TableResult
            show={showResult}
            isWin={resultInfo.isWin}
            amount={resultInfo.amount}
            message={resultInfo.message}
            onComplete={() => {
              setShowResult(false);
              setGame(null);
              reset();
              clearBet();
            }}
          />

          {!game && !showResult && (
            <div className="text-white/20 text-lg">Place your bet and deal</div>
          )}

          {/* Player area: betting circle + hand(s) */}
          <div className="flex items-end gap-6">
            {!isPlaying && !isInsurancePrompt && !isResolved && (
              <BettingCircle
                chips={chipStack}
                label="BET"
                onClick={addChip}
              />
            )}
            {game && (isPlaying || isInsurancePrompt || isResolved) && (
              <div className="flex items-center gap-4">
                {chipStack.length > 0 && (
                  <BettingCircle chips={chipStack} label="" onClick={() => {}} />
                )}
                {hasMultipleHands ? (
                  <div className="flex gap-4">
                    {game.hands.map((hand, idx) => {
                      // Only pass animation counts for initial multi-hand deal, not post-split
                      const handKey = numHands > 1 ? `hand${idx}` : undefined;
                      const handDealt = handKey ? positions[handKey]?.dealt : undefined;
                      const handFlipped = handKey ? positions[handKey]?.flipped : undefined;
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          <CardHand
                            cards={hand.cards}
                            label={`Hand ${idx + 1}`}
                            value={hand.value}
                            dealtCount={handDealt}
                            flippedCount={handFlipped}
                            active={game.game_status === 'playing' && idx === game.active_hand_index}
                          />
                          <span className="text-white/40 text-[10px]">{formatCents(hand.bet_cents)}</span>
                          {game.game_status === 'resolved' && game.hand_outcomes[idx] && (
                            <span className={`text-[10px] font-bold uppercase ${
                              game.hand_outcomes[idx] === 'player_win' || game.hand_outcomes[idx] === 'dealer_bust' || game.hand_outcomes[idx] === 'blackjack'
                                ? 'text-green-400'
                                : game.hand_outcomes[idx] === 'push'
                                  ? 'text-white/50'
                                  : 'text-red-400'
                            }`}>
                              {game.hand_outcomes[idx]?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <CardHand
                    cards={game.hands[game.active_hand_index]?.cards || game.player_hand}
                    label="You"
                    value={game.hands[0]?.value ?? game.player_value}
                    dealtCount={positions['player']?.dealt}
                    flippedCount={positions['player']?.flipped}
                  />
                )}
              </div>
            )}
          </div>

          {/* Action buttons on the felt (all 5 always visible, unavailable greyed out) */}
          <AnimatePresence>
            {isPlaying && !isAnimating && game && (
              <motion.div
                className="flex gap-2 flex-wrap justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                {ALL_PLAY_ACTIONS.map((action, i) => {
                  const isAvailable = game.available_actions.includes(action);
                  const isFold = action === 'surrender';
                  return (
                    <motion.button
                      key={action}
                      onClick={() => isAvailable && handleAction(action)}
                      disabled={loading || !isAvailable}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: isAvailable ? 1 : 0.3, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider transition-colors"
                      style={{
                        backgroundColor: isFold ? 'rgba(192,57,43,0.4)' : 'rgba(0,0,0,0.5)',
                        color: isFold ? '#e74c3c' : '#d4af37',
                        border: `1.5px solid ${isFold ? 'rgba(192,57,43,0.5)' : 'rgba(212,175,55,0.5)'}`,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {ACTION_LABELS[action] || action.toUpperCase()}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bet controls below table (only when not playing) */}
      {!isPlaying && !isInsurancePrompt && !isResolved && (
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

          {/* Hand count selector */}
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-sm">Hands</span>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setNumHands(n)}
                  className="w-9 h-9 rounded-full font-bold text-sm transition-all"
                  style={{
                    backgroundColor: numHands === n ? '#d4af37' : 'rgba(255,255,255,0.1)',
                    color: numHands === n ? '#1a1a2e' : 'rgba(255,255,255,0.5)',
                    border: numHands === n ? '2px solid #d4af37' : '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <span className="text-white/50 text-sm">Total Bet</span>
            <div className="text-casino-gold font-bold text-2xl">
              {numHands > 1 ? `${formatCents(currentBet)} \u00d7 ${numHands}` : formatCents(currentBet)}
            </div>
            {numHands > 1 && (
              <div className="text-white/40 text-xs">{formatCents(currentBet * numHands)} total</div>
            )}
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
    </div>
  );
}
