import { useEffect } from 'react';
import Header from '../components/layout/Header';
import AchievementGrid from '../components/achievements/AchievementGrid';
import StatsPanel from '../components/achievements/StatsPanel';
import { achievements as achievementsApi } from '../lib/api';
import { useMetaStore } from '../stores/useMetaStore';

export default function AchievementsPage() {
  const achievements = useMetaStore((s) => s.achievements);
  const stats = useMetaStore((s) => s.stats);
  const setAchievements = useMetaStore((s) => s.setAchievements);

  useEffect(() => {
    achievementsApi.getAll().then((data) => {
      setAchievements(data.achievements, data.stats);
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-casino-black flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Achievements</h2>
          <p className="text-white/40">Track your progress and unlock rewards</p>
        </div>

        {stats && (
          <div className="mb-6">
            <StatsPanel stats={stats} />
          </div>
        )}

        <AchievementGrid achievements={achievements} />
      </main>
    </div>
  );
}
