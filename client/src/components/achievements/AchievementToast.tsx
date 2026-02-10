import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMetaStore } from '../../stores/useMetaStore';
import { formatCents } from '../../lib/constants';

export default function AchievementToast() {
  const toastQueue = useMetaStore((s) => s.toastQueue);
  const dismissToast = useMetaStore((s) => s.dismissToast);
  const current = toastQueue[0];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timer);
  }, [current, dismissToast]);

  return (
    <div className="fixed top-20 right-4 z-[100] pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="card-panel gold-glow p-4 min-w-[280px] pointer-events-auto cursor-pointer"
            onClick={dismissToast}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{current.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-casino-gold uppercase tracking-wider font-bold">
                  Achievement Unlocked!
                </div>
                <div className="text-white font-bold text-sm truncate">{current.name}</div>
                <div className="text-white/50 text-xs truncate">{current.description}</div>
                {current.reward_cents > 0 && (
                  <div className="text-casino-gold text-xs mt-1">
                    +{formatCents(current.reward_cents)} reward
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
