import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PinballBall from './PinballBall';
import { PINBALL_POCKET_MULTIPLIERS } from '@shared/types';
import type { PinballBonusBallResult } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface PinballBoardProps {
  balls: PinballBonusBallResult[];
  baseBet: number;
  onComplete: () => void;
}

const BOARD_WIDTH = 320;
const BOARD_HEIGHT = 400;
const PEG_ROWS = 8;

export default function PinballBoard({ balls, baseBet, onComplete }: PinballBoardProps) {
  const [currentBallIndex, setCurrentBallIndex] = useState(0);
  const [launchedBalls, setLaunchedBalls] = useState<number[]>([]);
  const [completedBalls, setCompletedBalls] = useState<number[]>([]);
  const [runningTotal, setRunningTotal] = useState(0);

  const handleLaunch = useCallback(() => {
    if (currentBallIndex >= balls.length) return;
    setLaunchedBalls(prev => [...prev, currentBallIndex]);
  }, [currentBallIndex, balls.length]);

  const handleBallComplete = useCallback((ballIndex: number) => {
    const ball = balls[ballIndex];
    setCompletedBalls(prev => [...prev, ballIndex]);
    setRunningTotal(prev => prev + ball.multiplier * baseBet);
    setCurrentBallIndex(prev => {
      const next = prev + 1;
      if (next >= balls.length) {
        setTimeout(onComplete, 1200);
      }
      return next;
    });
  }, [balls, baseBet, onComplete]);

  const allDone = completedBalls.length === balls.length;

  // Generate peg positions
  const pegs: { x: number; y: number }[] = [];
  for (let row = 0; row < PEG_ROWS; row++) {
    const pegsInRow = row % 2 === 0 ? 9 : 8;
    const rowOffset = row % 2 === 0 ? 0 : BOARD_WIDTH / 18;
    for (let col = 0; col < pegsInRow; col++) {
      const x = rowOffset + (col + 0.5) * (BOARD_WIDTH / pegsInRow);
      const y = 30 + (row + 0.5) * ((BOARD_HEIGHT - 80) / PEG_ROWS);
      pegs.push({ x, y });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="text-center">
        <span className="text-casino-gold font-bold text-lg uppercase tracking-wider">
          Bonus Round!
        </span>
        <div className="text-white/60 text-sm">
          {balls.length} ball{balls.length > 1 ? 's' : ''} to launch
        </div>
      </div>

      {/* Board */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          background: 'linear-gradient(180deg, #1a1a3e 0%, #0d0d2b 100%)',
          border: '2px solid rgba(212,175,55,0.3)',
        }}
      >
        {/* Pegs */}
        {pegs.map((peg, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              left: peg.x - 4,
              top: peg.y - 4,
              background: 'radial-gradient(circle at 30% 30%, #d4af37, #8B6914)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        {/* Pockets at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex">
          {PINBALL_POCKET_MULTIPLIERS.map((mult, i) => {
            const isHit = completedBalls.some(bIdx => balls[bIdx].pocket_index === i);
            const is100x = mult === 100;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center py-2 text-xs font-bold border-t"
                style={{
                  borderColor: 'rgba(212,175,55,0.2)',
                  backgroundColor: isHit
                    ? is100x ? 'rgba(255,215,0,0.3)' : 'rgba(46,204,113,0.2)'
                    : is100x ? 'rgba(255,215,0,0.08)' : 'transparent',
                  color: is100x ? '#ffd700' : isHit ? '#2ecc71' : 'rgba(255,255,255,0.5)',
                }}
              >
                {mult}x
              </div>
            );
          })}
        </div>

        {/* Active balls */}
        <AnimatePresence>
          {launchedBalls.map(bIdx => (
            <PinballBall
              key={bIdx}
              path={balls[bIdx].path}
              boardWidth={BOARD_WIDTH}
              boardHeight={BOARD_HEIGHT - 40}
              onComplete={() => handleBallComplete(bIdx)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Running total */}
      <div className="text-center">
        <span className="text-white/60 text-sm">Bonus winnings: </span>
        <span className="text-casino-gold font-bold">{formatCents(runningTotal)}</span>
      </div>

      {/* Launch button */}
      {!allDone && (
        <button
          onClick={handleLaunch}
          disabled={launchedBalls.includes(currentBallIndex)}
          className="btn-primary px-8 py-3 text-lg tracking-wider"
        >
          {currentBallIndex === 0 ? 'LAUNCH BALL' : `LAUNCH BALL ${currentBallIndex + 1}/${balls.length}`}
        </button>
      )}

      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <span className="text-casino-gold font-bold text-xl">
            Total bonus: {formatCents(runningTotal)}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
