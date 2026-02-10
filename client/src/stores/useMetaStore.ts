import { create } from 'zustand';
import type { BankAccountState, Achievement, UserStats, AchievementUnlock } from '@shared/types';

interface MetaState {
  // Bank
  bankAccount: BankAccountState | null;
  setBankAccount: (account: BankAccountState) => void;

  // Achievements
  achievements: Achievement[];
  stats: UserStats | null;
  setAchievements: (achievements: Achievement[], stats: UserStats) => void;

  // Achievement toast queue
  toastQueue: AchievementUnlock[];
  pushToasts: (unlocks: AchievementUnlock[]) => void;
  dismissToast: () => void;
}

export const useMetaStore = create<MetaState>((set) => ({
  bankAccount: null,
  setBankAccount: (account) => set({ bankAccount: account }),

  achievements: [],
  stats: null,
  setAchievements: (achievements, stats) => set({ achievements, stats }),

  toastQueue: [],
  pushToasts: (unlocks) =>
    set((state) => ({ toastQueue: [...state.toastQueue, ...unlocks] })),
  dismissToast: () =>
    set((state) => ({ toastQueue: state.toastQueue.slice(1) })),
}));
