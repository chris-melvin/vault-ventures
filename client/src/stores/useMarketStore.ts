import { create } from 'zustand';
import type { MarketItemWithPrice, InventoryItem, MarketCategory } from '@shared/types';

interface MarketState {
  items: MarketItemWithPrice[];
  inventory: InventoryItem[];
  selectedCategory: MarketCategory | 'all' | 'portfolio';
  loading: boolean;

  setItems: (items: MarketItemWithPrice[]) => void;
  setInventory: (inventory: InventoryItem[]) => void;
  setCategory: (category: MarketCategory | 'all' | 'portfolio') => void;
  setLoading: (loading: boolean) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  items: [],
  inventory: [],
  selectedCategory: 'all',
  loading: false,

  setItems: (items) => set({ items }),
  setInventory: (inventory) => set({ inventory }),
  setCategory: (category) => set({ selectedCategory: category }),
  setLoading: (loading) => set({ loading }),
}));
