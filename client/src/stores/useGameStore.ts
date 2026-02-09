import { create } from 'zustand';

interface GameState {
  balance_cents: number;
  currentBet: number;
  isSpinning: boolean;
  lastWin: number;
  selectedChipValue: number;
  chipStack: number[];
  setBalance: (balance: number) => void;
  setBet: (amount: number) => void;
  setSpinning: (spinning: boolean) => void;
  setLastWin: (amount: number) => void;
  setSelectedChip: (value: number) => void;
  addChip: () => void;
  removeLastChip: () => void;
  clearBet: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  balance_cents: 0,
  currentBet: 500,
  isSpinning: false,
  lastWin: 0,
  selectedChipValue: 500,
  chipStack: [],

  setBalance: (balance) => set({ balance_cents: balance }),
  setBet: (amount) => set({ currentBet: amount }),
  setSpinning: (spinning) => set({ isSpinning: spinning }),
  setLastWin: (amount) => set({ lastWin: amount }),
  setSelectedChip: (value) => set({ selectedChipValue: value }),

  addChip: () => {
    const { selectedChipValue, chipStack, balance_cents } = get();
    const currentTotal = chipStack.reduce((sum, v) => sum + v, 0);
    if (currentTotal + selectedChipValue <= balance_cents) {
      const newStack = [...chipStack, selectedChipValue];
      set({
        chipStack: newStack,
        currentBet: newStack.reduce((sum, v) => sum + v, 0),
      });
    }
  },

  removeLastChip: () => {
    const { chipStack } = get();
    if (chipStack.length === 0) return;
    const newStack = chipStack.slice(0, -1);
    set({
      chipStack: newStack,
      currentBet: newStack.reduce((sum, v) => sum + v, 0),
    });
  },

  clearBet: () => set({ chipStack: [], currentBet: 0 }),
}));
