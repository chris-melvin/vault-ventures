import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import UTHTable from './UTHTable';
import TableResult from '../shared/TableResult';
import ChipSelector from '../shared/ChipSelector';
import BettingCircle from '../shared/BettingCircle';
import { useGameStore } from '../../stores/useGameStore';
import { uth as uthApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import { actionLabel, phaseLabel } from './uthLogic';
import type { UTHState, UTHAction } from '@shared/types';

export default function UTHGame() {
  const [game, setGame] = useState<UTHState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [tripsBet, setTripsBet] = useState(0);
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance, balance_cents } = useGameStore();

  const isPlaying = game && game.phase !== 'showdown';
  const isShowdown = game?.phase === 'showdown';

  const handleDeal = async () => {
    if (currentBet === 0) return;
    setLoading(true);
    setShowResult(false);
    try {
      const result = await uthApi.deal(currentBet, tripsBet > 0 ? tripsBet : undefined);
      setGame(result);
      setBalance(result.new_balance_cents);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: UTHAction) => {
    if (!game || loading) return;
    setLoading(true);
    try {
      const result = await uthApi.action(game.session_id, action);
      setGame(result);
      setBalance(result.new_balance_cents);
      if (result.phase === 'showdown') {
        setTimeout(() => setShowResult(true), 800);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getResultInfo = () => {
    if (!game?.result) return { amount: 0, isWin: false, message: '' };
    const r = game.result;
    switch (r.outcome) {
      case 'player_wins':
        return { amount: r.total_payout_cents, isWin: true, message: `You win! ${!r.dealer_qualifies ? '(Dealer does not qualify - ante push)' : ''}` };
      case 'dealer_wins':
        return { amount: game.bets.ante_cents + game.bets.blind_cents + game.bets.play_cents, isWin: false, message: 'Dealer wins' };
      case 'push':
        return { amount: 0, isWin: false, message: 'Push - bets returned' };
      case 'fold':
        return {
          amount: game.bets.ante_cents + game.bets.blind_cents,
          isWin: r.trips_payout_cents > 0,
          message: r.trips_payout_cents > 0 ? `Folded - Trips pays ${formatCents(r.trips_payout_cents)}!` : 'Folded',
        };
    }
  };

  const resultInfo = getResultInfo();

  // Trips bet cycling
  const tripsOptions = [0, 100, 500, 1000, 5000];
  const cycleTrips = () => {
    const idx = tripsOptions.indexOf(tripsBet);
    const next = tripsOptions[(idx + 1) % tripsOptions.length];
    if (next <= balance_cents) setTripsBet(next);
    else setTripsBet(0);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      {/* Table felt */}
      <div
        className="w-full p-6 min-h-[480px] flex flex-col relative overflow-hidden rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #1e6b45 0%, #155a35 40%, #0d3d22 100%)',
          border: '3px solid #8B6914',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Felt texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, transparent 1px, rgba(0,0,0,0.05) 1px)',
            backgroundSize: '4px 4px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4 flex-1 justify-between">
          {/* Phase indicator */}
          {game && (
            <div className="text-center">
              <span className="text-casino-gold/60 text-xs uppercase tracking-widest">
                {phaseLabel(game.phase)}
              </span>
            </div>
          )}

          {/* Table content */}
          {game ? (
            <UTHTable game={game} />
          ) : (
            <div className="flex-1 flex items-center">
              <span className="text-white/15 text-lg">Set your ante and deal</span>
            </div>
          )}

          {/* Inline table result */}
          <TableResult
            show={showResult}
            isWin={resultInfo.isWin}
            amount={resultInfo.amount}
            message={resultInfo.message}
            onComplete={() => {
              setShowResult(false);
              setGame(null);
              setTripsBet(0);
              clearBet();
            }}
          />

          {/* Action buttons on felt */}
          <AnimatePresence>
            {isPlaying && game && (
              <motion.div
                className="flex gap-2 flex-wrap justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                {game.available_actions.map((action, i) => {
                  const isFold = action === 'fold';
                  return (
                    <motion.button
                      key={action}
                      onClick={() => handleAction(action)}
                      disabled={loading}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isFold ? 'rgba(192,57,43,0.4)' : 'rgba(0,0,0,0.5)',
                        color: isFold ? '#e74c3c' : '#d4af37',
                        border: `1.5px solid ${isFold ? 'rgba(192,57,43,0.5)' : 'rgba(212,175,55,0.5)'}`,
                      }}
                    >
                      {actionLabel(action, game.bets.ante_cents)}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pre-deal controls */}
      {!game && (
        <div className="flex flex-col items-center gap-3 w-full max-w-lg">
          {/* Ante betting circle */}
          <div className="flex items-end gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/40 text-xs">Ante</span>
              <BettingCircle
                chips={chipStack}
                label="ANTE"
                onClick={addChip}
                accentColor="#d4af37"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/40 text-xs">Trips (optional)</span>
              <button
                onClick={cycleTrips}
                className="w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${tripsBet > 0 ? '#8e44ad' : 'rgba(255,255,255,0.2)'}`,
                  backgroundColor: tripsBet > 0 ? 'rgba(142,68,173,0.1)' : 'transparent',
                }}
              >
                <span className="text-white/40 text-[10px] uppercase">TRIPS</span>
                {tripsBet > 0 && (
                  <span className="text-white font-bold text-sm">{formatCents(tripsBet)}</span>
                )}
              </button>
            </div>
          </div>

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
            <span className="text-white/50 text-sm">
              Total: Ante {formatCents(currentBet)} + Blind {formatCents(currentBet)}
              {tripsBet > 0 ? ` + Trips ${formatCents(tripsBet)}` : ''}
              {' = '}
              <span className="text-casino-gold font-bold">
                {formatCents(currentBet * 2 + tripsBet)}
              </span>
            </span>
          </div>

          <button
            onClick={handleDeal}
            disabled={loading || currentBet === 0 || (currentBet * 2 + tripsBet) > balance_cents}
            className="btn-primary w-full text-lg tracking-wider"
          >
            {loading ? 'DEALING...' : 'DEAL'}
          </button>
        </div>
      )}
    </div>
  );
}
