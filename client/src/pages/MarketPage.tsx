import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import MarketItemCard from '../components/market/MarketItemCard';
import MarketItemDetail from '../components/market/MarketItemDetail';
import PortfolioItem from '../components/market/PortfolioItem';
import { market as marketApi, wallet } from '../lib/api';
import { useMarketStore } from '../stores/useMarketStore';
import { useGameStore } from '../stores/useGameStore';
import { useMetaStore } from '../stores/useMetaStore';
import { formatCents } from '../lib/constants';
import type { MarketCategory } from '@shared/types';

const TABS: { value: MarketCategory | 'all' | 'portfolio'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'collectible', label: 'Collectibles' },
  { value: 'stock', label: 'Stocks' },
  { value: 'property', label: 'Property' },
  { value: 'vehicle', label: 'Vehicles' },
  { value: 'portfolio', label: 'Portfolio' },
];

export default function MarketPage() {
  const setBalance = useGameStore((s) => s.setBalance);
  const { items, inventory, selectedCategory, setItems, setInventory, setCategory } = useMarketStore();
  const pushToasts = useMetaStore((s) => s.pushToasts);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadItems = async () => {
    try {
      const category = selectedCategory === 'all' || selectedCategory === 'portfolio'
        ? undefined
        : selectedCategory;
      const data = await marketApi.getItems(category);
      setItems(data);
    } catch {}
  };

  const loadInventory = async () => {
    try {
      const data = await marketApi.inventory();
      setInventory(data);
    } catch {}
  };

  useEffect(() => {
    loadItems();
    loadInventory();
    wallet.balance().then((w) => setBalance(w.balance_cents)).catch(() => {});
  }, [selectedCategory, refreshKey]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBuy = async (itemId: string, quantity: number = 1) => {
    try {
      const result = await marketApi.buy(itemId, quantity) as any;
      setBalance(result.new_balance_cents);
      if (result.new_achievements?.length) pushToasts(result.new_achievements);
      setRefreshKey((k) => k + 1);
    } catch {}
  };

  const handleSell = async (itemId: string) => {
    try {
      const result = await marketApi.sellPosition(itemId) as any;
      setBalance(result.new_balance_cents);
      if (result.new_achievements?.length) pushToasts(result.new_achievements);
      setRefreshKey((k) => k + 1);
    } catch {}
  };

  const handleCollectRent = async () => {
    try {
      const result = await marketApi.collectRent() as any;
      setBalance(result.new_balance_cents);
      if (result.new_achievements?.length) pushToasts(result.new_achievements);
      setRefreshKey((k) => k + 1);
    } catch {}
  };

  const totalPortfolioValue = inventory.reduce(
    (sum, item) => sum + item.current_price_cents * item.quantity, 0
  );
  const totalProfitLoss = inventory.reduce((sum, item) => sum + item.profit_cents, 0);
  const totalPendingRent = inventory.reduce((sum, item) => sum + item.pending_rent_cents, 0);

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Market</h2>
            <p className="text-white/40">Buy and sell collectibles, stocks, property & vehicles</p>
          </div>
          {inventory.length > 0 && (
            <div className="text-right">
              <div className="text-xs text-white/40">Portfolio Value</div>
              <div className="text-casino-gold font-bold">{formatCents(totalPortfolioValue)}</div>
              <div className={`text-xs font-bold ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{formatCents(totalProfitLoss)}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={`px-4 py-2 text-sm rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === tab.value
                  ? 'bg-casino-gold text-casino-black'
                  : 'bg-casino-card text-white/50 hover:text-white/80'
              }`}
            >
              {tab.label}
              {tab.value === 'portfolio' && inventory.length > 0 && (
                <span className="ml-1 text-xs opacity-70">({inventory.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {selectedCategory === 'portfolio' ? (
          <div>
            {inventory.length === 0 ? (
              <div className="card-panel p-12 text-center text-white/30">
                Your portfolio is empty. Browse the market to buy items!
              </div>
            ) : (
              <>
                {totalPendingRent > 0 && (
                  <div className="card-panel p-4 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-emerald-400 font-bold text-sm">Rent Available</div>
                      <div className="text-white/40 text-xs">Collect earnings from your properties</div>
                    </div>
                    <button
                      onClick={handleCollectRent}
                      className="btn-primary text-sm !py-2 !px-4 !bg-emerald-600 hover:!bg-emerald-500"
                    >
                      Collect {formatCents(totalPendingRent)}
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  {inventory.map((item) => (
                    <PortfolioItem key={item.id} item={item} onSell={handleSell} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <MarketItemCard
                key={item.id}
                item={item}
                onBuy={handleBuy}
                onSelect={setSelectedItem}
              />
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <MarketItemDetail
            itemId={selectedItem}
            onClose={() => setSelectedItem(null)}
            onBuy={handleBuy}
          />
        )}
      </main>
    </div>
  );
}
