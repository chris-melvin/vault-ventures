import { motion } from 'motion/react';

interface PinballBallProps {
  path: { x: number; y: number }[];
  boardWidth: number;
  boardHeight: number;
  onComplete: () => void;
  delay?: number;
}

export default function PinballBall({ path, boardWidth, boardHeight, onComplete, delay = 0 }: PinballBallProps) {
  const xKeyframes = path.map(p => p.x * boardWidth);
  const yKeyframes = path.map(p => p.y * boardHeight);

  return (
    <motion.div
      className="absolute w-5 h-5 rounded-full z-20"
      style={{
        background: 'radial-gradient(circle at 35% 35%, #e0e0e0, #888)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.6)',
        left: -10,
        top: -10,
      }}
      initial={{ x: xKeyframes[0], y: yKeyframes[0], opacity: 0, scale: 0.5 }}
      animate={{
        x: xKeyframes,
        y: yKeyframes,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 1.8,
        delay,
        ease: 'easeIn',
        x: { duration: 1.8, delay, times: path.map((_, i) => i / (path.length - 1)) },
        y: { duration: 1.8, delay, times: path.map((_, i) => i / (path.length - 1)) },
        opacity: { duration: 0.2, delay },
        scale: { duration: 0.2, delay },
      }}
      onAnimationComplete={onComplete}
    />
  );
}
