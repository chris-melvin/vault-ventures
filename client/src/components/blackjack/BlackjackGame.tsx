import { useState } from 'react';
import CardHand from './CardHand';
import BetControls from '../shared/BetControls';
import ResultOverlay from '../shared/ResultOverlay';
import { useGameStore } from '../../stores/useGameStore';
import { blackjack as bjApi } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import type { BlackjackState } from '@shared/types';

export default function BlackjackGame() {
  const [game, setGame] = useState<BlackjackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { currentBet, setBalance } = useGameStore();

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

  const getResultMessage = (): { amount: number; isWin: boolean; message: string } => {
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

  const resultInfo = getResultMessage();

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
      {/* Table felt */}
      <div className="card-panel w-full p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-casino-green-dark to-casino-green opacity-90 rounded-xl" />

        <div className="relative z-10 flex flex-col items-center gap-10 flex-1 justify-center">
          {/* Dealer hand */}
          {game && (
            <CardHand
              cards={game.dealer_hand}
              label="Dealer"
              value={game.dealer_value}
            />
          )}

          {/* Status indicator */}
          {isEnded && (
            <div className={`text-center text-lg font-bold ${
              resultInfo.isWin ? 'text-casino-gold' : 'text-white'
            }`}>
              {resultInfo.message}
            </div>
          )}

          {!game && (
            <div className="text-white/20 text-lg">Place your bet and deal</div>
          )}

          {/* Player hand */}
          {game && (
            <CardHand
              cards={game.player_hand}
              label="You"
              value={game.player_value}
              delay={0.3}
            />
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isPlaying && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('hit')}
            disabled={loading}
            className="btn-primary px-8"
          >
            HIT
          </button>
          <button
            onClick={() => handleAction('stand')}
            disabled={loading}
            className="btn-secondary px-8"
          >
            STAND
          </button>
          {game.can_double && (
            <button
              onClick={() => handleAction('double')}
              disabled={loading}
              className="btn-secondary px-8"
            >
              DOUBLE
            </button>
          )}
        </div>
      )}

      {/* Bet controls (only when not playing) */}
      {!isPlaying && (
        <BetControls
          onAction={handleDeal}
          actionLabel={loading ? 'DEALING...' : 'DEAL'}
          disabled={loading}
        />
      )}

      <ResultOverlay
        show={showResult}
        amount={resultInfo.amount}
        isWin={resultInfo.isWin}
        message={resultInfo.message}
        onDismiss={() => {
          setShowResult(false);
          setGame(null);
        }}
      />
    </div>
  );
}
