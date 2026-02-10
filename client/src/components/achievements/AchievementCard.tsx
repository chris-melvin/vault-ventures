import type { Achievement } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  achievement: Achievement;
}

export default function AchievementCard({ achievement }: Props) {
  const { unlocked, icon, name, description, reward_cents } = achievement;

  return (
    <div
      className={`card-panel p-4 transition-all ${
        unlocked
          ? 'border-casino-gold/30 gold-glow'
          : 'opacity-50 grayscale'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-3xl ${unlocked ? '' : 'filter blur-[2px]'}`}>
          {unlocked ? icon : '?'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm">{name}</div>
          <div className="text-white/40 text-xs mt-0.5">{description}</div>
          {reward_cents > 0 && (
            <div className={`text-xs mt-1 ${unlocked ? 'text-casino-gold' : 'text-white/30'}`}>
              Reward: {formatCents(reward_cents)}
            </div>
          )}
          {unlocked && achievement.unlocked_at && (
            <div className="text-white/20 text-[10px] mt-1">
              Unlocked {new Date(achievement.unlocked_at * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
