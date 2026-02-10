import { formatCents } from '../../lib/constants';
import type { GameTypeStats } from '@shared/types';

interface Props {
  data: GameTypeStats[];
}

const GAME_NAMES: Record<string, string> = {
  wheel: 'Money Wheel',
  slots: 'Slot Machine',
  blackjack: 'Blackjack',
  baccarat: 'Baccarat',
  uth: "Ultimate Texas Hold'em",
  pinball: 'Pinball Slots',
  sicbo: 'Sic Bo',
  roulette: 'Roulette',
};

export default function GameTypeBreakdown({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card-panel p-4">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Game Breakdown</h3>
        <p className="text-white/30 text-sm text-center py-4">No games played yet</p>
      </div>
    );
  }

  const maxWagered = Math.max(...data.map((d) => d.total_wagered_cents), 1);

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Game Breakdown</h3>
      <div className="space-y-3">
        {data.map((game) => (
          <div key={game.game_type}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-white/80 font-medium">{GAME_NAMES[game.game_type] || game.game_type}</span>
              <span className="text-white/40">{game.games_played} games</span>
            </div>
            <div className="w-full h-5 rounded-full bg-white/5 overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(game.total_wagered_cents / maxWagered) * 100}%`,
                  background: game.net_profit_cents >= 0
                    ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
                    : 'linear-gradient(90deg, #e74c3c, #c0392b)',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Wagered: {formatCents(game.total_wagered_cents)}</span>
              <span className={game.net_profit_cents >= 0 ? 'text-green-400' : 'text-red-400'}>
                P/L: {game.net_profit_cents >= 0 ? '+' : ''}{formatCents(game.net_profit_cents)}
              </span>
              <span>Win Rate: {(game.win_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
