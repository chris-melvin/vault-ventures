import { useState, useRef, useCallback } from 'react';

/**
 * A single step in a card reveal sequence.
 * 'deal' makes the next card visible (slides onto table).
 * 'flip' reveals the next face-down card (flips to show face).
 */
export interface RevealStep {
  position: string;
  delay: number;
  action: 'deal' | 'flip';
}

interface PositionState {
  dealt: number;
  flipped: number;
}

interface StartOptions {
  /** Set initial counts per position (e.g. to preserve existing visible cards) */
  initialCounts?: Record<string, PositionState>;
  onComplete?: () => void;
}

/**
 * Controls card dealing suspense via dealt/flipped counts per position.
 * Unlike useDealingSequence, this hook never stores or modifies card data —
 * it only tracks how many cards should be visible and how many are face-up.
 * The game components pass real card arrays and these counts to CardHand.
 */
export function useCardReveal() {
  const [positions, setPositions] = useState<Record<string, PositionState>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const clearTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  /**
   * Start a timed reveal sequence.
   * Each step increments dealt or flipped count for the given position after its delay.
   * Delays are relative to the previous step (cumulative).
   */
  const startReveal = useCallback((steps: RevealStep[], options?: StartOptions) => {
    clearTimeouts();

    const initial = options?.initialCounts ?? {};
    setPositions(initial);
    setIsAnimating(true);
    onCompleteRef.current = options?.onComplete ?? null;

    if (steps.length === 0) {
      setIsAnimating(false);
      options?.onComplete?.();
      return;
    }

    let cumulativeDelay = 0;
    steps.forEach((step, i) => {
      cumulativeDelay += step.delay;
      const t = setTimeout(() => {
        setPositions(prev => {
          const next = { ...prev };
          const pos = next[step.position] ?? { dealt: 0, flipped: 0 };
          if (step.action === 'deal') {
            next[step.position] = { dealt: pos.dealt + 1, flipped: pos.flipped };
          } else {
            next[step.position] = { dealt: pos.dealt, flipped: pos.flipped + 1 };
          }
          return next;
        });

        // After the last step, allow time for flip animation then complete
        if (i === steps.length - 1) {
          const finishT = setTimeout(() => {
            setIsAnimating(false);
            onCompleteRef.current?.();
          }, 500);
          timeoutsRef.current.push(finishT);
        }
      }, cumulativeDelay);
      timeoutsRef.current.push(t);
    });
  }, [clearTimeouts]);

  /**
   * Skip to the end of any running animation.
   * Sets all positions to fully dealt and flipped at the given counts.
   */
  const skipToEnd = useCallback((finalCounts: Record<string, number>) => {
    clearTimeouts();
    const final: Record<string, PositionState> = {};
    for (const [pos, count] of Object.entries(finalCounts)) {
      final[pos] = { dealt: count, flipped: count };
    }
    setPositions(final);
    setIsAnimating(false);
    onCompleteRef.current?.();
  }, [clearTimeouts]);

  /**
   * Set position states directly without animation.
   */
  const setRevealed = useCallback((counts: Record<string, PositionState>) => {
    setPositions(counts);
  }, []);

  /** Clear all state. */
  const reset = useCallback(() => {
    clearTimeouts();
    setPositions({});
    setIsAnimating(false);
    onCompleteRef.current = null;
  }, [clearTimeouts]);

  return {
    positions,
    isAnimating,
    startReveal,
    skipToEnd,
    setRevealed,
    reset,
  };
}
