import { useState } from 'react';
import type { Achievement, AchievementCategory } from '@shared/types';
import AchievementCard from './AchievementCard';

const CATEGORIES: { value: AchievementCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wealth', label: 'Wealth' },
  { value: 'gambling', label: 'Gambling' },
  { value: 'streak', label: 'Streaks' },
  { value: 'bank', label: 'Bank' },
  { value: 'collection', label: 'Collection' },
];

interface Props {
  achievements: Achievement[];
}

export default function AchievementGrid({ achievements }: Props) {
  const [filter, setFilter] = useState<AchievementCategory | 'all'>('all');

  const filtered = filter === 'all'
    ? achievements
    : achievements.filter((a) => a.category === filter);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/50 text-sm">
          {unlockedCount}/{achievements.length} unlocked
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                filter === cat.value
                  ? 'bg-casino-gold text-casino-black font-bold'
                  : 'bg-casino-card text-white/50 hover:text-white/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered
          .sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1))
          .map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
      </div>
    </div>
  );
}
