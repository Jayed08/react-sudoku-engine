import React, { useCallback, useEffect, useState } from 'react';
import { Sudoku } from '../sudoku.js';
import { getConflicts, solveFlat, flatTo2d, gradeFlat } from '../utils/sudokuHelpers.js';
import './CustomBuilder.css';

export default function CustomBuilder({ onBack, onPlayCustom }) {
  const [grid, setGrid] = useState(Array(81).fill(0));
  const [selected, setSelected] = useState(null);
  const [conflicts, setConflicts] = useState(Array(81).fill(false));
  const [status, setStatus] = useState(null); // { kind: 'ok'|'warn'|'err'|'analysis', text?, level? }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConflicts(getConflicts(grid));
  }, [grid]);

  const setNum = useCallback((n) => {
    if (selected === null) return;
    setGrid((g) => {
      const next = [...g];
      next[selected] = n;
      return next;
    });
    setStatus(null);
  }, [selected]);

  const erase = useCallback(() => {
    if (selected === null) return;
    setGrid((g) => {
      const next = [...g];
      next[selected] = 0;
      return next;
    });
    setStatus(null);
  }, [selected]);

  useEffect(() => {
    const onKey = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        setNum(n);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        erase();
        return;
      }
      const dirs = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
      if (dirs[e.key] !== undefined) {
        e.preventDefault();
        setSelected((cur) => {
          if (cur === null) return 0;
          if (e.key === 'ArrowLeft' && cur % 9 === 0) return cur;
          if (e.key === 'ArrowRight' && cur % 9 === 8) return cur;
          const next = cur + dirs[e.key];
          return next >= 0 && next < 81 ? next : cur;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNum, erase]);

  const clues = grid.filter(Boolean).length;
  const hasConflicts = conflicts.some(Boolean);

  const run = (fn) => {
    if (hasConflicts) {
      setStatus({ kind: 'err', text: 'Fix conflicting cells first.' });
      return;
    }
    if (clues < 17) {
      setStatus({ kind: 'err', text: `Need at least 17 clues (you have ${clues}).` });
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      fn();
      setBusy(false);
    }, 20);
  };

  const validateGridState = (currentGrid) => {
    const sol = solveFlat(currentGrid);
    if (!sol) return { valid: false, error: 'No solution exists — check your clues.' };

    const eng = new Sudoku();
    const unique = eng.hasUniqueSolution(flatTo2d([...currentGrid]));
    if (!unique) return { valid: false, error: 'Puzzle has multiple solutions — add more clues to make it unique.' };

    return { valid: true, solution: sol };
  };

  const handleValidate = () => run(() => {
    const res = validateGridState(grid);
    if (!res.valid) {
      setStatus({ kind: 'err', text: res.error });
    } else {
      setStatus({ kind: 'ok', text: '✓ Valid! Unique solution confirmed.' });
    }
  });

  const handleSolve = () => run(() => {
    const res = validateGridState(grid);
    if (!res.valid) {
      setStatus({ kind: 'err', text: `Cannot solve: ${res.error}` });
    } else {
      setGrid(res.solution);
      setStatus({ kind: 'ok', text: '✓ Solved! The grid shows the complete solution.' });
    }
  });

  const handleAnalyze = () => run(() => {
    const res = validateGridState(grid);
    if (!res.valid) {
      setStatus({ kind: 'err', text: `Cannot analyze: ${res.error}` });
    } else {
      const grade = gradeFlat(grid);
      setStatus({ kind: 'analysis', level: grade.level });
    }
  });

  const handlePlay = () => run(() => {
    const res = validateGridState(grid);
    if (!res.valid) {
      setStatus({ kind: 'err', text: `Cannot play: ${res.error}` });
    } else {
      const grade = gradeFlat(grid);
      onPlayCustom({
        puzzle: [...grid],
        solution: res.solution,
        level: `Custom (${grade.level})`
      });
    }
  });

  const LEVEL_COLOR = {
    Beginner: '#22c55e',
    Easy: '#84cc16',
    Medium: '#f59e0b',
    Hard: '#ea580c',
    Expert: '#dc2626',
    Extreme: '#7c3aed'
  };

  return (
    <div className="app-shell">
      <header className="game-header">
        <div className="header-title">
          <button className="icon-button" type="button" aria-label="Back to menu" onClick={onBack}>
            <span aria-hidden="true">‹</span>
          </button>
          <h1>Custom Puzzle</h1>
        </div>
        <div className="game-stats">
          <span className="level-pill">{clues} clue{clues !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <main className="game-layout">
        <section className="board-stage" aria-label="Custom Sudoku board">
          <div className="sudoku-grid">
            {grid.map((val, idx) => (
              <button
                key={idx}
                className={[
                  'cell',
                  val ? 'fixed-cell' : 'playable-cell',
                  selected === idx ? 'selected' : '',
                  conflicts[idx] ? 'error' : '',
                ].filter(Boolean).join(' ')}
                type="button"
                onClick={() => setSelected(idx)}
              >
                <span className="value">{val || ''}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="control-panel">
          <p className="builder-hint-text">
            Click a cell, then type a digit or use the pad below. Arrow keys move the selection.
          </p>

          <div className="action-row">
            <button className="secondary-button" type="button" onClick={erase} style={{ gridColumn: 'span 2' }}>
              Erase
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setGrid(Array(81).fill(0));
                setStatus(null);
                setSelected(null);
              }}
            >
              Clear
            </button>
          </div>

          <div className="numpad">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <button className="numpad-button" type="button" key={n} onClick={() => setNum(n)}>{n}</button>
            ))}
          </div>

          <div className="builder-actions">
            <button className="secondary-button" type="button" onClick={handleValidate} disabled={busy}>Validate</button>
            <button className="secondary-button" type="button" onClick={handleSolve} disabled={busy}>Solve</button>
            <button className="secondary-button" type="button" onClick={handleAnalyze} disabled={busy}>Analyze</button>
            <button
              className="primary-button"
              type="button"
              onClick={handlePlay}
              disabled={busy}
              style={{ gridColumn: 'span 3' }}
            >
              Play Puzzle
            </button>
          </div>

          {busy && (
            <div className="builder-busy">
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
            </div>
          )}

          {status && !busy && (
            <div className={`builder-status builder-status--${status.kind}`}>
              {status.kind === 'analysis' ? (
                <div className="bs-row">
                  <span className="bs-label">Difficulty</span>
                  <span className="bs-value" style={{ color: LEVEL_COLOR[status.level] }}>{status.level}</span>
                </div>
              ) : (
                <p className="bs-text">{status.text}</p>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
