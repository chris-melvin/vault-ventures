import { useEffect, useRef, useState } from 'react';
import { SLOT_SYMBOL_EMOJIS } from '../../lib/constants';
import { VISUAL_STRIPS, REEL_SYMBOL_COUNT } from './ReelStrip';
import type { SlotSymbol } from '@shared/types';

interface ReelProps {
  reelIndex: number;
  targetStop: number | null;
  spinning: boolean;
  onStopped: () => void;
  delay: number;
  isNearMiss: boolean;
}

const SYMBOL_HEIGHT = 80;
const VISIBLE = 3;

export default function Reel({ reelIndex, targetStop, spinning, onStopped, delay, isNearMiss }: ReelProps) {
  const [offset, setOffset] = useState(0);
  const [blur, setBlur] = useState(0);
  const [stopped, setStopped] = useState(true);
  const velocityRef = useRef(0);
  const offsetRef = useRef(0);
  const animRef = useRef(0);
  const startTimeRef = useRef(0);
  const strip = VISUAL_STRIPS[reelIndex];

  useEffect(() => {
    if (!spinning) return;

    setStopped(false);
    startTimeRef.current = performance.now();
    velocityRef.current = 0;

    const spinDelay = delay;
    const extraDelay = isNearMiss && reelIndex === 4 ? 500 : 0;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      if (elapsed < spinDelay) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const spinElapsed = elapsed - spinDelay;

      // Accelerate
      if (spinElapsed < 300) {
        velocityRef.current = (spinElapsed / 300) * 30;
      } else if (targetStop !== null && spinElapsed > 800 + extraDelay) {
        // Decelerate
        const decelElapsed = spinElapsed - 800 - extraDelay;
        velocityRef.current = Math.max(0, 30 - decelElapsed * 0.04);

        if (velocityRef.current <= 0) {
          // Snap to target
          const targetOffset = targetStop * SYMBOL_HEIGHT;
          setOffset(targetOffset);
          setBlur(0);
          setStopped(true);
          onStopped();
          return;
        }
      } else {
        velocityRef.current = 30;
      }

      offsetRef.current += velocityRef.current;
      const totalHeight = REEL_SYMBOL_COUNT * SYMBOL_HEIGHT;
      offsetRef.current %= totalHeight;

      setOffset(offsetRef.current);
      setBlur(Math.min(velocityRef.current * 0.4, 8));

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, targetStop, delay, isNearMiss, reelIndex, onStopped]);

  // Build extended symbol array for seamless wrapping
  const extendedSymbols: SlotSymbol[] = [...strip, ...strip, ...strip];

  const containerHeight = VISIBLE * SYMBOL_HEIGHT;
  const symbolOffset = stopped && targetStop !== null
    ? targetStop * SYMBOL_HEIGHT
    : offset;

  return (
    <div
      className="overflow-hidden rounded-lg bg-casino-dark border border-white/10 relative"
      style={{ width: 80, height: containerHeight }}
    >
      <div
        className="absolute w-full transition-none"
        style={{
          transform: `translateY(-${symbolOffset % (REEL_SYMBOL_COUNT * SYMBOL_HEIGHT)}px)`,
          filter: blur > 0 ? `blur(${blur}px)` : 'none',
        }}
      >
        {extendedSymbols.map((sym, i) => (
          <div
            key={`${sym}-${i}`}
            className="flex items-center justify-center"
            style={{ height: SYMBOL_HEIGHT, width: 80 }}
          >
            <span className="text-4xl select-none">{SLOT_SYMBOL_EMOJIS[sym]}</span>
          </div>
        ))}
      </div>

      {/* Payline indicator */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-full border-t border-b border-casino-gold/30"
          style={{ top: SYMBOL_HEIGHT, height: SYMBOL_HEIGHT }}
        />
      </div>
    </div>
  );
}
