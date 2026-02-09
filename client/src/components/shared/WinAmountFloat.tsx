import { motion, AnimatePresence } from 'motion/react';
import { formatCents } from '../../lib/constants';

interface WinAmountFloatProps {
  show: boolean;
  amount: number;
}

export default function WinAmountFloat({ show, amount }: WinAmountFloatProps) {
  return (
    <AnimatePresence>
      {show && amount > 0 && (
        <motion.div
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -60, opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute text-casino-gold font-bold text-xl pointer-events-none"
          style={{ zIndex: 20 }}
        >
          +{formatCents(amount)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
