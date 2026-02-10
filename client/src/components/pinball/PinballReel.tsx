import { useEffect, useRef, useState } from 'react';
import { PINBALL_SYMBOL_EMOJIS } from '../../lib/constants';
import { PINBALL_REEL_STRIPS, PINBALL_REEL_LENGTH } from '@shared/types';
import type { PinballSymbol } from '@shared/types';

interface PinballReelProps {
  reelIndex: number;
  targetStop: number | null;
  spinning: boolean;
  onStopped: () => void;
  delay: number;
}

const SYMBOL_HEIGHT = 80;
const VISIBLE = 3;

export default function PinballReel({ reelIndex, targetStop, spinning, onStopped, delay }: PinballReelProps) {
  const [offset, setOffset] = useState(0);
  const [blur, setBlur] = useState(0);
  const [stopped, setStopped] = useState(true);
  const velocityRef = useRef(0);
  const offsetRef = useRef(0);
  const animRef = useRef(0);
  const startTimeRef = useRef(0);
  const strip = PINBALL_REEL_STRIPS[reelIndex];

  useEffect(() => {
    if (!spinning) return;

    setStopped(false);
    startTimeRef.current = performance.now();
    velocityRef.current = 0;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;

      if (elapsed < delay) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const spinElapsed = elapsed - delay;

      if (spinElapsed < 300) {
        velocityRef.current = (spinElapsed / 300) * 28;
      } else if (targetStop !== null && spinElapsed > 700) {
        const decelElapsed = spinElapsed - 700;
        velocityRef.current = Math.max(0, 28 - decelElapsed * 0.04);

        if (velocityRef.current <= 0) {
          const targetOffset = targetStop * SYMBOL_HEIGHT;
          setOffset(targetOffset);
          setBlur(0);
          setStopped(true);
          onStopped();
          return;
        }
      } else {
        velocityRef.current = 28;
      }

      offsetRef.current += velocityRef.current;
      const totalHeight = PINBALL_REEL_LENGTH * SYMBOL_HEIGHT;
      offsetRef.current %= totalHeight;

      setOffset(offsetRef.current);
      setBlur(Math.min(velocityRef.current * 0.4, 8));

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, targetStop, delay, reelIndex, onStopped]);

  const extendedSymbols: PinballSymbol[] = [...strip, ...strip, ...strip];
  const containerHeight = VISIBLE * SYMBOL_HEIGHT;
  const symbolOffset = stopped && targetStop !== null
    ? targetStop * SYMBOL_HEIGHT
    : offset;

  return (
    <div
      className="overflow-hidden rounded-lg bg-casino-dark border border-white/10 relative"
      style={{ width: 90, height: containerHeight }}
    >
      <div
        className="absolute w-full"
        style={{
          transform: `translateY(-${symbolOffset % (PINBALL_REEL_LENGTH * SYMBOL_HEIGHT)}px)`,
          filter: blur > 0 ? `blur(${blur}px)` : 'none',
        }}
      >
        {extendedSymbols.map((sym, i) => (
          <div
            key={`${sym}-${i}`}
            className="flex items-center justify-center"
            style={{ height: SYMBOL_HEIGHT, width: 90 }}
          >
            <span className="text-4xl select-none">{PINBALL_SYMBOL_EMOJIS[sym]}</span>
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
