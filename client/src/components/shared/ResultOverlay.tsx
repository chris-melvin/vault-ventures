import { motion, AnimatePresence } from 'motion/react';
import { formatCents } from '../../lib/constants';
import { useEffect, useRef } from 'react';

interface ResultOverlayProps {
  show: boolean;
  amount: number;
  isWin: boolean;
  message?: string;
  onDismiss: () => void;
}

function Confetti({ count = 40 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 8,
      color: ['#d4af37', '#f0d060', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'][
        Math.floor(Math.random() * 7)
      ],
      drift: (Math.random() - 0.5) * 60,
      rotation: Math.random() * 720 - 360,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: '-10%', x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: '110%', x: `${p.x + p.drift}%`, opacity: 0, rotate: p.rotation }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function ScreenShake({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ x: 0 }}
      animate={{
        x: [0, -6, 6, -4, 4, -2, 2, 0],
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function ResultOverlay({ show, amount, isWin, message, onDismiss }: ResultOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (show) {
      timerRef.current = setTimeout(() => onDismissRef.current(), 4000);
      return () => clearTimeout(timerRef.current);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
        >
          {isWin && <Confetti />}

          {isWin ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="card-panel p-8 text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gold glow pulse behind card */}
              <motion.div
                className="absolute inset-0 rounded-xl"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(212,175,55,0.3)',
                    '0 0 60px rgba(212,175,55,0.6)',
                    '0 0 20px rgba(212,175,55,0.3)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              <motion.div
                className="text-6xl font-bold mb-2 text-casino-gold relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
              >
                WIN!
              </motion.div>
              {amount > 0 && (
                <motion.div
                  className="text-3xl font-bold text-casino-gold-light relative"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                >
                  +{formatCents(amount)}
                </motion.div>
              )}
              {message && <div className="text-white/60 mt-2 relative">{message}</div>}
              <button onClick={onDismiss} className="btn-secondary mt-6 relative">
                Continue
              </button>
            </motion.div>
          ) : (
            <ScreenShake>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className="card-panel p-8 text-center relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Red flash */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-red-500/20"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />

                <div className="text-6xl font-bold mb-2 text-casino-red relative">
                  LOSE
                </div>
                {amount > 0 && (
                  <div className="text-3xl font-bold text-white/50 relative">
                    -{formatCents(amount)}
                  </div>
                )}
                {message && <div className="text-white/60 mt-2 relative">{message}</div>}
                <button onClick={onDismiss} className="btn-secondary mt-6 relative">
                  Continue
                </button>
              </motion.div>
            </ScreenShake>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
