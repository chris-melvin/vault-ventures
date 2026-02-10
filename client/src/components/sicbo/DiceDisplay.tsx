import { motion } from 'motion/react';

const DICE_FACES: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DieFace({ value, delay }: { value: number; delay: number }) {
  const dots = DICE_FACES[value] || [];

  return (
    <motion.div
      initial={{ rotateX: 0, rotateY: 0, scale: 0.5, opacity: 0 }}
      animate={{ rotateX: [720, 0], rotateY: [720, 0], scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center"
      style={{ perspective: 600 }}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-10 h-10 sm:w-12 sm:h-12">
        {Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const hasDot = dots.some(([r, c]) => r === row && c === col);
          return (
            <div key={i} className="flex items-center justify-center">
              {hasDot && (
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-900" />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface DiceDisplayProps {
  dice: [number, number, number] | null;
  rolling: boolean;
}

export default function DiceDisplay({ dice, rolling }: DiceDisplayProps) {
  if (!dice && !rolling) {
    return (
      <div className="flex gap-3 items-center justify-center py-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center"
          >
            <span className="text-white/20 text-2xl">?</span>
          </div>
        ))}
      </div>
    );
  }

  if (rolling) {
    return (
      <div className="flex gap-3 items-center justify-center py-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              rotateX: [0, 360],
              rotateY: [0, 360],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.1,
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/80 shadow-lg"
            style={{ perspective: 600 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-center justify-center py-4">
      {dice!.map((value, i) => (
        <DieFace key={`${value}-${i}`} value={value} delay={i * 0.15} />
      ))}
    </div>
  );
}
