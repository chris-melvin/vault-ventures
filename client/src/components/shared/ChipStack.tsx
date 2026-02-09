import { motion, AnimatePresence } from 'motion/react';
import { CHIP_COLORS, formatCents } from '../../lib/constants';

interface ChipStackProps {
  chips: number[];
  showTotal?: boolean;
}

export default function ChipStack({ chips, showTotal = true }: ChipStackProps) {
  const total = chips.reduce((sum, v) => sum + v, 0);

  if (chips.length === 0) return null;

  // Show max 8 visual chips, compress beyond that
  const visibleChips = chips.slice(-8);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ height: visibleChips.length * 3 + 28 }}>
        <AnimatePresence>
          {visibleChips.map((value, i) => {
            const colors = CHIP_COLORS[value];
            return (
              <motion.div
                key={`${value}-${i}-${chips.length}`}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-3 flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                  bottom: i * 3,
                  zIndex: i,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
      {showTotal && total > 0 && (
        <div className="text-casino-gold font-bold text-sm mt-1">
          {formatCents(total)}
        </div>
      )}
    </div>
  );
}
