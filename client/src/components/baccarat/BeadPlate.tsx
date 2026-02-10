import { computeBeadPlate, BEAD_ROWS, BEAD_COLS, type BaccaratWinner, type BeadCell } from '../../lib/baccaratRoads';

const WINNER_COLORS: Record<BaccaratWinner, string> = {
  player: '#3b82f6',  // blue
  banker: '#ef4444',  // red
  tie: '#22c55e',     // green
};

const WINNER_LETTERS: Record<BaccaratWinner, string> = {
  player: 'P',
  banker: 'B',
  tie: 'T',
};

interface BeadPlateProps {
  results: BaccaratWinner[];
}

export default function BeadPlate({ results }: BeadPlateProps) {
  const grid = computeBeadPlate(results);

  return (
    <div className="flex flex-col">
      <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Bead Plate</div>
      <div
        className="grid border border-white/10 rounded"
        style={{
          gridTemplateColumns: `repeat(${BEAD_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${BEAD_ROWS}, 1fr)`,
          gap: '1px',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {Array.from({ length: BEAD_ROWS }).map((_, row) =>
          Array.from({ length: BEAD_COLS }).map((_, col) => {
            const cell = grid[row][col];
            return (
              <div
                key={`${row}-${col}`}
                className="w-5 h-5 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {cell && (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                    style={{ backgroundColor: WINNER_COLORS[cell.winner] }}
                  >
                    {WINNER_LETTERS[cell.winner]}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
