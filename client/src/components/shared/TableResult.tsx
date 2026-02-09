import { motion, AnimatePresence } from 'motion/react';
import { formatCents } from '../../lib/constants';
import { useEffect, useRef } from 'react';
import WinAmountFloat from './WinAmountFloat';

interface TableResultProps {
  show: boolean;
  isWin: boolean;
  amount: number;
  message: string;
  onComplete: () => void;
  duration?: number;
}

function TableConfetti({ count = 30 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.2 + Math.random() * 1,
      size: 3 + Math.random() * 5,
      color: ['#d4af37', '#f0d060', '#e74c3c', '#2ecc71', '#3498db'][
        Math.floor(Math.random() * 5)
      ],
      drift: (Math.random() - 0.5) * 40,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 15 }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: '40%', x: `${p.x}%`, opacity: 1 }}
          animate={{ y: '110%', x: `${p.x + p.drift}%`, opacity: 0 }}
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

export default function TableResult({ show, isWin, amount, message, onComplete, duration = 3500 }: TableResultProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onCompleteRef.current(), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const isPush = !isWin && amount === 0;

  return (
    <AnimatePresence>
      {show && (
        <>
          {isWin && <TableConfetti />}

          {/* Lose: red flash on felt */}
          {!isWin && !isPush && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-red-500/10 pointer-events-none"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{ zIndex: 14 }}
            />
          )}

          {/* Lose: screen shake wrapper */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 16 }}
            {...(!isWin && !isPush
              ? { animate: { x: [0, -4, 4, -3, 3, -1, 1, 0] }, transition: { duration: 0.35 } }
              : {})}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="relative cursor-pointer pointer-events-auto px-8 py-4 rounded-xl text-center"
              style={{
                backgroundColor: isWin
                  ? 'rgba(10, 10, 15, 0.85)'
                  : isPush
                    ? 'rgba(10, 10, 15, 0.75)'
                    : 'rgba(10, 10, 15, 0.85)',
                border: isWin
                  ? '2px solid rgba(212, 175, 55, 0.6)'
                  : isPush
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '2px solid rgba(192, 57, 43, 0.5)',
                boxShadow: isWin
                  ? '0 0 30px rgba(212, 175, 55, 0.3)'
                  : 'none',
              }}
            >
              {isWin && (
                <motion.div
                  className="text-3xl font-bold text-casino-gold mb-1"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
                >
                  WIN
                </motion.div>
              )}
              {!isWin && !isPush && (
                <div className="text-3xl font-bold text-casino-red mb-1">LOSE</div>
              )}
              {isPush && (
                <div className="text-3xl font-bold text-white/70 mb-1">PUSH</div>
              )}

              {amount > 0 && (
                <div className={`text-lg font-bold ${isWin ? 'text-casino-gold-light' : 'text-white/40'}`}>
                  {isWin ? '+' : '-'}{formatCents(amount)}
                </div>
              )}
              {message && <div className="text-white/50 text-sm mt-1">{message}</div>}

              {/* Floating win amount */}
              {isWin && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <WinAmountFloat show={true} amount={amount} />
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
