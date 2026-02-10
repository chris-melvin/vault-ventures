import type { UserStats } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  stats: UserStats;
}

export default function StatsPanel({ stats }: Props) {
  const statItems = [
    { label: 'Total Wagered', value: formatCents(stats.total_wagered_cents) },
    { label: 'Total Won', value: formatCents(stats.total_won_cents) },
    { label: 'Biggest Win', value: formatCents(stats.biggest_win_cents) },
    { label: 'Games Played', value: stats.total_games_played.toLocaleString() },
    { label: 'Best Win Streak', value: stats.best_win_streak.toString() },
    { label: 'Current Win Streak', value: stats.current_win_streak.toString() },
    { label: 'Worst Loss Streak', value: stats.worst_loss_streak.toString() },
    { label: 'Peak Balance', value: formatCents(stats.peak_balance_cents) },
  ];

  const gameTypes = Object.entries(stats.games_per_type);

  return (
    <div className="card-panel p-6">
      <h3 className="text-lg font-bold text-white mb-4">Player Statistics</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statItems.map((item) => (
          <div key={item.label}>
            <div className="text-xs text-white/40 uppercase tracking-wider">{item.label}</div>
            <div className="text-white font-bold text-lg">{item.value}</div>
          </div>
        ))}
      </div>

      {gameTypes.length > 0 && (
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Games by Type</div>
          <div className="flex flex-wrap gap-2">
            {gameTypes.map(([type, count]) => (
              <div key={type} className="bg-casino-dark px-3 py-1.5 rounded-lg text-sm">
                <span className="text-white/60 capitalize">{type}:</span>{' '}
                <span className="text-casino-gold font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
