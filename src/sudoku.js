import { HumanSolverEngine } from './human_solver.js';

const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];

export class Sudoku {
  constructor() {
    this.board = [];
  }

  generate(level) {
    const maxAttempts = 3000;
    let bestFallback = null;
    const targetLevel = LEVELS.includes(level) ? level : 'Easy';
    const targetIndex = LEVELS.indexOf(targetLevel);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      this.board = Array.from({ length: 9 }, () => Array(9).fill(0));
      this.fillDiagonal();
      this.solve(this.board);
      const solutionFlat = this.board.flat();

      const generated = this.removeDigitsForDifficulty(targetLevel);

      if (generated.grade.level === targetLevel) {
        return { puzzle: generated.puzzle, solution: solutionFlat };
      }

      if (!bestFallback) {
        bestFallback = { puzzle: generated.puzzle, solution: solutionFlat, actualLevel: generated.grade.level };
      } else {
        const currentDiff = Math.abs(LEVELS.indexOf(generated.grade.level) - targetIndex);
        const bestDiff = Math.abs(LEVELS.indexOf(bestFallback.actualLevel) - targetIndex);
        if (currentDiff < bestDiff) {
          bestFallback = { puzzle: generated.puzzle, solution: solutionFlat, actualLevel: generated.grade.level };
        }
      }
    }
    return { puzzle: bestFallback.puzzle, solution: bestFallback.solution };
  }

  fillDiagonal() {
    for (let i = 0; i < 9; i += 3) {
      this.fillBox(i, i);
    }
  }

  fillBox(row, col) {
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        let num;
        do {
          num = Math.floor(Math.random() * 9) + 1;
        } while (!this.isSafeInBox(row, col, num));
        this.board[row + i][col + j] = num;
      }
    }
  }

  solve(board) {
    const rowMasks = new Int16Array(9);
    const colMasks = new Int16Array(9);
    const boxMasks = new Int16Array(9);
    const emptyCells = [];

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const val = board[r][c];
        if (val !== 0) {
          const bit = 1 << (val - 1);
          rowMasks[r] |= bit;
          colMasks[c] |= bit;
          boxMasks[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= bit;
        } else {
          emptyCells.push(r * 9 + c);
        }
      }
    }

    const solveRec = () => {
      let minOptions = 10;
      let bestCellVal = -1;
      let bestRow = -1;
      let bestCol = -1;
      let bestBoxIndex = -1;
      let bestTaken = 0;

      for (let i = 0; i < emptyCells.length; i += 1) {
        const cell = emptyCells[i];
        const r = Math.floor(cell / 9);
        const c = cell % 9;
        if (board[r][c] !== 0) continue;

        const boxIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const taken = rowMasks[r] | colMasks[c] | boxMasks[boxIndex];
        
        let available = (~taken) & 0x1FF;
        let optionsCount = 0;
        let temp = available;
        while (temp) {
          optionsCount += 1;
          temp &= temp - 1;
        }
        
        if (optionsCount === 0) return false;

        if (optionsCount < minOptions) {
          minOptions = optionsCount;
          bestCellVal = cell;
          bestRow = r;
          bestCol = c;
          bestBoxIndex = boxIndex;
          bestTaken = taken;
          if (minOptions === 1) break;
        }
      }

      if (bestCellVal === -1) {
        return true;
      }

      for (let num = 1; num <= 9; num += 1) {
        const bit = 1 << (num - 1);
        if ((bestTaken & bit) === 0) {
          rowMasks[bestRow] |= bit;
          colMasks[bestCol] |= bit;
          boxMasks[bestBoxIndex] |= bit;
          board[bestRow][bestCol] = num;
          
          if (solveRec()) return true;
          
          board[bestRow][bestCol] = 0;
          rowMasks[bestRow] &= ~bit;
          colMasks[bestCol] &= ~bit;
          boxMasks[bestBoxIndex] &= ~bit;
        }
      }
      return false;
    };

    return solveRec();
  }

  removeDigitsForDifficulty(level) {
    const candidates = [];
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        candidates.push({ r, c });
      }
    }
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let best = null;
    let exactMatch = null;
    const targetIndex = LEVELS.indexOf(level);
    let hintsCount = 81;
    let lastValidState = null;

    for (const { r, c } of candidates) {
      const value = this.board[r][c];
      this.board[r][c] = 0;

      if (!this.hasUniqueSolution(this.board)) {
        this.board[r][c] = value;
        continue;
      }

      hintsCount--;

      // Cap maximum number of hints to 55 (At least 26 holes)
      if (hintsCount <= 55) {
        const current = this.snapshotGradedPuzzle();
        lastValidState = current;

        if (current.grade.level === level && !this.hasFullRowColOrBox(this.board)) {
          exactMatch = current;
          break; // Return early!
        }

        if (!best) {
          best = current;
        } else {
          const currentHasFull = this.hasFullRowColOrBox(this.board);
          const bestHasFull = this.hasFullRowColOrBox(best.puzzle);
          
          if (currentHasFull && !bestHasFull) {
            // Keep best
          } else if (!currentHasFull && bestHasFull) {
            best = current;
          } else {
            const currentDiff = Math.abs(LEVELS.indexOf(current.grade.level) - targetIndex);
            const bestDiff = Math.abs(LEVELS.indexOf(best.grade.level) - targetIndex);
            if (currentDiff < bestDiff) {
              best = current;
            }
          }
        }
      } else {
        lastValidState = { puzzle: this.board.flat(), needsGrading: true };
      }
    }

    let result = exactMatch || best || lastValidState;
    if (result && result.needsGrading) {
        result = this.snapshotGradedPuzzle();
    }
    return result;
  }

  snapshotGradedPuzzle() {
    const puzzle = this.board.flat();
    const grid = [];
    for (let i = 0; i < 9; i += 1) {
      grid.push(puzzle.slice(i * 9, (i + 1) * 9));
    }
    const engine = new HumanSolverEngine(grid);
    return { puzzle, grade: engine.gradePuzzle() };
  }

  hasUniqueSolution(board) {
    const rowMasks = new Int16Array(9);
    const colMasks = new Int16Array(9);
    const boxMasks = new Int16Array(9);
    const emptyCells = [];

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const val = board[r][c];
        if (val !== 0) {
          const bit = 1 << (val - 1);
          rowMasks[r] |= bit;
          colMasks[c] |= bit;
          boxMasks[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= bit;
        } else {
          emptyCells.push(r * 9 + c);
        }
      }
    }

    let solutions = 0;
    const solve = () => {
      if (solutions > 1) return;
      let minOptions = 10;
      let bestCellVal = -1;
      let bestRow = -1;
      let bestCol = -1;
      let bestBoxIndex = -1;
      let bestTaken = 0;

      for (let i = 0; i < emptyCells.length; i += 1) {
        const cell = emptyCells[i];
        const r = Math.floor(cell / 9);
        const c = cell % 9;
        if (board[r][c] !== 0) continue;

        const boxIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const taken = rowMasks[r] | colMasks[c] | boxMasks[boxIndex];
        
        let available = (~taken) & 0x1FF;
        let optionsCount = 0;
        let temp = available;
        while (temp) {
          optionsCount += 1;
          temp &= temp - 1;
        }
        
        if (optionsCount === 0) return;

        if (optionsCount < minOptions) {
          minOptions = optionsCount;
          bestCellVal = cell;
          bestRow = r;
          bestCol = c;
          bestBoxIndex = boxIndex;
          bestTaken = taken;
          if (minOptions === 1) break;
        }
      }

      if (bestCellVal === -1) {
        solutions += 1;
        return;
      }

      for (let num = 1; num <= 9; num += 1) {
        const bit = 1 << (num - 1);
        if ((bestTaken & bit) === 0) {
          rowMasks[bestRow] |= bit;
          colMasks[bestCol] |= bit;
          boxMasks[bestBoxIndex] |= bit;
          board[bestRow][bestCol] = num;
          solve();
          board[bestRow][bestCol] = 0;
          rowMasks[bestRow] &= ~bit;
          colMasks[bestCol] &= ~bit;
          boxMasks[bestBoxIndex] &= ~bit;
          if (solutions > 1) return;
        }
      }
    };

    solve();
    return solutions === 1;
  }

  isSafe(board, row, col, num) {
    return (
      this.isSafeInRow(board, row, num) &&
      this.isSafeInCol(board, col, num) &&
      this.isSafeInBox(row - (row % 3), col - (col % 3), num)
    );
  }

  isSafeInRow(board, row, num) {
    for (let c = 0; c < 9; c += 1) {
      if (board[row][c] === num) return false;
    }
    return true;
  }

  isSafeInCol(board, col, num) {
    for (let r = 0; r < 9; r += 1) {
      if (board[r][col] === num) return false;
    }
    return true;
  }

  isSafeInBox(rowStart, colStart, num) {
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (this.board[rowStart + r][colStart + c] === num) return false;
      }
    }
    return true;
  }

  hasFullRowColOrBox(board) {
    const isFlat = !Array.isArray(board[0]);
    
    // Check rows & columns
    for (let i = 0; i < 9; i += 1) {
      let rowClues = 0;
      let colClues = 0;
      for (let j = 0; j < 9; j += 1) {
        const rowVal = isFlat ? board[i * 9 + j] : board[i][j];
        if (rowVal !== 0) rowClues += 1;
        
        const colVal = isFlat ? board[j * 9 + i] : board[j][i];
        if (colVal !== 0) colClues += 1;
      }
      if (rowClues === 9 || colClues === 9) return true;
    }
    
    // Check boxes
    for (let b = 0; b < 9; b += 1) {
      const br = Math.floor(b / 3) * 3;
      const bc = (b % 3) * 3;
      let boxClues = 0;
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          const val = isFlat ? board[(br + i) * 9 + (bc + j)] : board[br + i][bc + j];
          if (val !== 0) boxClues += 1;
        }
      }
      if (boxClues === 9) return true;
    }
    
    return false;
  }
}
