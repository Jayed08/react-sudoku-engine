import { Sudoku } from '../sudoku.js';
import { HumanSolverEngine } from '../human_solver.js';

export const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];
export const MAX_MISTAKES = 3;
export const emptyGrid = Array(81).fill(0);
export const emptyNotes = () => Array.from({ length: 81 }, () => []);
export const STORAGE_KEY = 'sudoku_persist_v1';

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function readInitialLevel() {
  const params = new URLSearchParams(window.location.search);
  const level = params.get('level');
  return LEVELS.includes(level) ? level : null;
}

export function persistSave(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /**/ }
}

export function persistLoad() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch (_) {
    return null;
  }
}

export function persistClear() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /**/ }
}

export function getConflicts(flat) {
  const out = Array(81).fill(false);
  for (let i = 0; i < 81; i++) {
    if (!flat[i]) continue;
    const r = Math.floor(i / 9), c = i % 9;
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    for (let j = i + 1; j < 81; j++) {
      if (flat[j] !== flat[i]) continue;
      const r2 = Math.floor(j / 9), c2 = j % 9;
      const b2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
      if (r === r2 || c === c2 || b === b2) {
        out[i] = true;
        out[j] = true;
      }
    }
  }
  return out;
}

export function flatTo2d(flat) {
  return Array.from({ length: 9 }, (_, r) => flat.slice(r * 9, r * 9 + 9));
}

export function solveFlat(flat) {
  const board = flatTo2d([...flat]);
  const eng = new Sudoku();
  return eng.solve(board) ? board.flat() : null;
}

export function gradeFlat(flat) {
  const engine = new HumanSolverEngine(flatTo2d([...flat]));
  return engine.gradePuzzle();
}
