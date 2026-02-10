import { useEffect, useState } from 'react';
import BeadPlate from './BeadPlate';
import BigRoad from './BigRoad';
import { history as historyApi } from '../../lib/api';
import type { GameHistoryEntry } from '@shared/types';
import type { BaccaratWinner } from '../../lib/baccaratRoads';

interface BaccaratRoadsProps {
  refreshKey: number;
}

export default function BaccaratRoads({ refreshKey }: BaccaratRoadsProps) {
  const [results, setResults] = useState<BaccaratWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    historyApi.list('baccarat', 50).then((entries: GameHistoryEntry[]) => {
      if (cancelled) return;
      // Extract winner from each entry's result_data, oldest first
      const winners = entries
        .reverse()
        .map(e => {
          const winner = e.result_data?.winner;
          if (winner === 'player' || winner === 'banker' || winner === 'tie') return winner as BaccaratWinner;
          return null;
        })
        .filter((w): w is BaccaratWinner => w !== null);
      setResults(winners);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
        <div className="text-white/30 text-sm text-center">Loading roads...</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
        <div className="text-white/30 text-sm text-center">No games yet</div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 flex flex-col gap-3">
      <div className="px-1">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Scoreboard</h3>
      </div>
      <div className="flex flex-col gap-3">
        <BeadPlate results={results} />
        <BigRoad results={results} />
      </div>
      <div className="flex items-center gap-4 px-1 text-[10px] text-white/40">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Player</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Banker</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Tie</span>
        </div>
      </div>
    </div>
  );
}
