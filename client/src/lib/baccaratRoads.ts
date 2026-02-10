// Pure layout computation for baccarat road scoreboards

export type BaccaratWinner = 'player' | 'banker' | 'tie';

export interface BeadCell {
  winner: BaccaratWinner;
}

export interface BigRoadCell {
  winner: 'player' | 'banker';
  /** Green slash overlay indicating a tie occurred here */
  hasTie: boolean;
}

// ============ Bead Plate ============
// Simple grid: 6 rows x N columns, fills top-to-bottom then left-to-right

export const BEAD_ROWS = 6;
export const BEAD_COLS = 12;

export function computeBeadPlate(results: BaccaratWinner[]): (BeadCell | null)[][] {
  // Initialize empty grid
  const grid: (BeadCell | null)[][] = Array.from({ length: BEAD_ROWS }, () =>
    Array(BEAD_COLS).fill(null)
  );

  for (let i = 0; i < results.length && i < BEAD_ROWS * BEAD_COLS; i++) {
    const col = Math.floor(i / BEAD_ROWS);
    const row = i % BEAD_ROWS;
    grid[row][col] = { winner: results[i] };
  }

  return grid;
}

// ============ Big Road ============
// Streaks go down columns. Winner change starts a new column.
// Ties don't start a new column - they add a slash to the last cell.
// Dragon tail: if streak > 6 rows, continue rightward along bottom row.

export const BIG_ROAD_ROWS = 6;

export function computeBigRoad(results: BaccaratWinner[]): (BigRoadCell | null)[][] {
  // Initialize grid (rows x dynamic columns)
  const grid: (BigRoadCell | null)[][] = Array.from({ length: BIG_ROAD_ROWS }, () => []);

  // Filter out leading ties and track tie positions
  let currentWinner: 'player' | 'banker' | null = null;
  let col = -1;
  let row = 0;

  // Track the last placed cell position for tie marking
  let lastCol = -1;
  let lastRow = -1;

  for (const result of results) {
    if (result === 'tie') {
      // Mark the last placed cell with a tie indicator
      if (lastCol >= 0 && lastRow >= 0) {
        const cell = grid[lastRow][lastCol];
        if (cell) {
          cell.hasTie = true;
        }
      }
      continue;
    }

    if (result !== currentWinner) {
      // Start a new column
      currentWinner = result;
      col++;
      row = 0;
    } else {
      // Continue down the same column
      row++;
    }

    // Handle dragon tail: if row >= BIG_ROAD_ROWS, continue rightward along bottom row
    let actualRow = row;
    let actualCol = col;
    if (row >= BIG_ROAD_ROWS) {
      actualRow = BIG_ROAD_ROWS - 1;
      actualCol = col + (row - BIG_ROAD_ROWS + 1);
    }

    // Ensure grid columns exist
    for (let r = 0; r < BIG_ROAD_ROWS; r++) {
      while (grid[r].length <= actualCol) {
        grid[r].push(null);
      }
    }

    // If the target cell is occupied (dragon tail collision), shift right
    while (grid[actualRow][actualCol] !== null) {
      actualCol++;
      for (let r = 0; r < BIG_ROAD_ROWS; r++) {
        while (grid[r].length <= actualCol) {
          grid[r].push(null);
        }
      }
    }

    grid[actualRow][actualCol] = { winner: result, hasTie: false };
    lastCol = actualCol;
    lastRow = actualRow;
  }

  return grid;
}

/** Get the max number of columns across all rows */
export function getMaxCols(grid: (BigRoadCell | null)[][]): number {
  return Math.max(1, ...grid.map(row => row.length));
}
