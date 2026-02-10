import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import BalanceChart from '../components/stats/BalanceChart';
import GameTypeBreakdown from '../components/stats/GameTypeBreakdown';
import MarketROIPanel from '../components/stats/MarketROIPanel';
import ProfitTimeline from '../components/stats/ProfitTimeline';
import { stats } from '../lib/api';
import type { StatsDeepDiveResponse } from '@shared/types';

export default function StatsPage() {
  const [data, setData] = useState<StatsDeepDiveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stats.deepDive().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Stats Deep Dive</h2>
          <p className="text-white/40">Balance history, win rates, ROI & profit analytics</p>
        </div>

        {loading ? (
          <div className="text-center text-white/30 py-12">Loading...</div>
        ) : data ? (
          <div className="space-y-6">
            <BalanceChart data={data.balance_history} />
            <ProfitTimeline data={data.profit_loss_timeline} />
            <GameTypeBreakdown data={data.game_type_stats} />
            <MarketROIPanel data={data.market_roi} />
          </div>
        ) : (
          <div className="text-center text-white/30 py-12">Failed to load data</div>
        )}
      </main>
    </div>
  );
}
