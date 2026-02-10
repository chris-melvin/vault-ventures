import { computeBigRoad, getMaxCols, BIG_ROAD_ROWS, type BaccaratWinner, type BigRoadCell } from '../../lib/baccaratRoads';
import { useRef, useEffect } from 'react';

const WINNER_COLORS: Record<'player' | 'banker', string> = {
  player: '#3b82f6',  // blue
  banker: '#ef4444',  // red
};

const CELL_SIZE = 22;
const MAX_VISIBLE_COLS = 16;

interface BigRoadProps {
  results: BaccaratWinner[];
}

export default function BigRoad({ results }: BigRoadProps) {
  const grid = computeBigRoad(results);
  const maxCols = getMaxCols(grid);
  const displayCols = Math.max(MAX_VISIBLE_COLS, maxCols);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right to show latest results
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [results.length]);

  return (
    <div className="flex flex-col">
      <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Big Road</div>
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin border border-white/10 rounded"
        style={{ maxWidth: MAX_VISIBLE_COLS * (CELL_SIZE + 1) + 2 }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${displayCols}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${BIG_ROAD_ROWS}, ${CELL_SIZE}px)`,
            gap: '1px',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {Array.from({ length: BIG_ROAD_ROWS }).map((_, row) =>
            Array.from({ length: displayCols }).map((_, col) => {
              const cell = grid[row]?.[col] ?? null;
              return (
                <div
                  key={`${row}-${col}`}
                  className="relative flex items-center justify-center"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  }}
                >
                  {cell && (
                    <>
                      <div
                        className="rounded-full"
                        style={{
                          width: CELL_SIZE - 5,
                          height: CELL_SIZE - 5,
                          border: `2px solid ${WINNER_COLORS[cell.winner]}`,
                          backgroundColor: 'transparent',
                        }}
                      />
                      {cell.hasTie && (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div
                            className="w-full h-[2px] rotate-45"
                            style={{ backgroundColor: '#22c55e' }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
