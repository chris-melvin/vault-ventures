import { create } from 'zustand';

interface AudioState {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 0.5,
  muted: false,
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}));
