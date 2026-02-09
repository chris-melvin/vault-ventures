import { create } from 'zustand';

interface GameState {
  balance_cents: number;
  currentBet: number;
  isSpinning: boolean;
  lastWin: number;
  setBalance: (balance: number) => void;
  setBet: (amount: number) => void;
  setSpinning: (spinning: boolean) => void;
  setLastWin: (amount: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  balance_cents: 0,
  currentBet: 500,
  isSpinning: false,
  lastWin: 0,

  setBalance: (balance) => set({ balance_cents: balance }),
  setBet: (amount) => set({ currentBet: amount }),
  setSpinning: (spinning) => set({ isSpinning: spinning }),
  setLastWin: (amount) => set({ lastWin: amount }),
}));
