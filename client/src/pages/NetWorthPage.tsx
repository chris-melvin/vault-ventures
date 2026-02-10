import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import NetWorthSummary from '../components/networth/NetWorthSummary';
import WealthBreakdownChart from '../components/networth/WealthBreakdownChart';
import PortfolioTable from '../components/networth/PortfolioTable';
import { networth } from '../lib/api';
import type { NetWorthResponse } from '@shared/types';

export default function NetWorthPage() {
  const [data, setData] = useState<NetWorthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    networth.get().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Net Worth</h2>
          <p className="text-white/40">Total wealth breakdown across wallet, bank & portfolio</p>
        </div>

        {loading ? (
          <div className="text-center text-white/30 py-12">Loading...</div>
        ) : data ? (
          <div className="space-y-6">
            <NetWorthSummary data={data} />
            <WealthBreakdownChart data={data} />
            <PortfolioTable items={data.portfolio_breakdown} />
          </div>
        ) : (
          <div className="text-center text-white/30 py-12">Failed to load data</div>
        )}
      </main>
    </div>
  );
}
