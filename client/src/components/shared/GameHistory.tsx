import { useEffect, useState, type ReactNode } from 'react';
import { history as historyApi } from '../../lib/api';
import type { GameHistoryEntry } from '@shared/types';

interface Props {
  gameType: string;
  refreshKey: number;
  renderEntry: (entry: GameHistoryEntry, index: number) => ReactNode;
}

export default function GameHistory({ gameType, refreshKey, renderEntry }: Props) {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    historyApi.list(gameType).then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [gameType, refreshKey]);

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">History</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="px-4 py-6 text-center text-white/30 text-sm">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-white/30 text-sm">No games yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {entries.map((entry, i) => (
              <div key={entry.id} className="px-4 py-2.5">
                {renderEntry(entry, i)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
