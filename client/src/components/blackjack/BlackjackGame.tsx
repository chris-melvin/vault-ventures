import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CardHand from '../cards/CardHand';
import ChipSelector from '../shared/ChipSelector';
import BettingCircle from '../shared/BettingCircle';
import TableResult from '../shared/TableResult';
import { useGameStore } from '../../stores/useGameStore';
import { blackjack as bjApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { BlackjackState } from '@shared/types';

export default function BlackjackGame() {
  const [game, setGame] = useState<BlackjackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { currentBet, chipStack, addChip, removeLastChip, clearBet, setBalance } = useGameStore();

  const isPlaying = game?.status === 'playing';
  const isEnded = game && game.status !== 'playing';

  const handleDeal = async () => {
    setLoading(true);
    setShowResult(false);
    try {
      const result = await bjApi.deal(currentBet);
      setGame(result);
      setBalance(result.new_balance_cents);
      if (result.status !== 'playing') {
        setTimeout(() => setShowResult(true), 800);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'hit' | 'stand' | 'double') => {
    if (!game || loading) return;
    setLoading(true);
    try {
      let result: BlackjackState;
      if (action === 'hit') result = await bjApi.hit(game.session_id);
      else if (action === 'stand') result = await bjApi.stand(game.session_id);
      else result = await bjApi.double(game.session_id);

      setGame(result);
      setBalance(result.new_balance_cents);
      if (result.status !== 'playing') {
        setTimeout(() => setShowResult(true), 600);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getResultInfo = (): { amount: number; isWin: boolean; message: string } => {
    if (!game) return { amount: 0, isWin: false, message: '' };
    switch (game.status) {
      case 'blackjack':
        return { amount: game.payout_cents, isWin: true, message: 'Blackjack! 3:2 payout' };
      case 'player_win':
        return { amount: game.payout_cents, isWin: true, message: 'You win!' };
      case 'dealer_bust':
        return { amount: game.payout_cents, isWin: true, message: 'Dealer busts!' };
      case 'player_bust':
        return { amount: currentBet, isWin: false, message: 'Bust!' };
      case 'dealer_win':
        return { amount: currentBet, isWin: false, message: 'Dealer wins' };
      case 'push':
        return { amount: 0, isWin: false, message: 'Push - bet returned' };
      default:
        return { amount: 0, isWin: false, message: '' };
    }
  };

  const resultInfo = getResultInfo();

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
              value={game.dealer_value}
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

          {/* Inline table result */}
          <TableResult
            show={showResult}
            isWin={resultInfo.isWin}
            amount={resultInfo.amount}
            message={resultInfo.message}
            onComplete={() => {
              setShowResult(false);
              setGame(null);
              clearBet();
            }}
          />

          {!game && !showResult && (
            <div className="text-white/20 text-lg">Place your bet and deal</div>
          )}

          {/* Player area: betting circle + hand */}
          <div className="flex items-end gap-6">
            {!isPlaying && !isEnded && (
              <BettingCircle
                chips={chipStack}
                label="BET"
                onClick={addChip}
              />
            )}
            {(isPlaying || isEnded) && game && (
              <div className="flex items-center gap-4">
                {chipStack.length > 0 && (
                  <BettingCircle chips={chipStack} label="" onClick={() => {}} />
                )}
                <CardHand
                  cards={game.player_hand}
                  label="You"
                  value={game.player_value}
                  delay={0.3}
                />
              </div>
            )}
          </div>

          {/* Action buttons on the felt */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                {[
                  { label: 'HIT', action: 'hit' as const, delay: 0 },
                  { label: 'STAND', action: 'stand' as const, delay: 0.05 },
                  ...(game?.can_double ? [{ label: 'DOUBLE', action: 'double' as const, delay: 0.1 }] : []),
                ].map((btn) => (
                  <motion.button
                    key={btn.label}
                    onClick={() => handleAction(btn.action)}
                    disabled={loading}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: btn.delay }}
                    className="px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider cursor-pointer transition-colors"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#d4af37',
                      border: '1.5px solid rgba(212,175,55,0.5)',
                    }}
                  >
                    {btn.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bet controls below table (only when not playing) */}
      {!isPlaying && !isEnded && (
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
    </div>
  );
}
