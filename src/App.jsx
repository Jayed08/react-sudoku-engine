import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sudoku } from './sudoku.js';
import Menu from './components/Menu.jsx';
import Cell from './components/Cell.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import GameModal from './components/GameModal.jsx';
import CustomBuilder from './components/CustomBuilder.jsx';
import {
  MAX_MISTAKES,
  emptyGrid,
  emptyNotes,
  formatTime,
  readInitialLevel,
  persistSave,
  persistLoad,
  persistClear,
} from './utils/sudokuHelpers.js';

export default function App() {
  const gameRef = useRef(new Sudoku());
  const [screen, setScreen] = useState(() => (readInitialLevel() ? 'game' : 'menu'));
  const [level, setLevel] = useState(() => readInitialLevel() || 'Easy');
  const [puzzle, setPuzzle] = useState(emptyGrid);
  const [solution, setSolution] = useState(emptyGrid);
  const [values, setValues] = useState(emptyGrid);
  const [notes, setNotes] = useState(emptyNotes);
  const [errors, setErrors] = useState(() => Array(81).fill(false));
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState(null);

  // States to keep track of custom puzzle for restarts/try-agains
  const [customInitialPuzzle, setCustomInitialPuzzle] = useState(null);
  const [customInitialSolution, setCustomInitialSolution] = useState(null);

  const fixedCells = useMemo(() => puzzle.map((value) => value !== 0), [puzzle]);
  const selectedValue = selectedIndex === null ? 0 : puzzle[selectedIndex] || values[selectedIndex];

  // ── Restore persisted state on first mount ────────────────────────────────
  useEffect(() => {
    const urlLevel = readInitialLevel();
    if (urlLevel) {
      startGame(urlLevel);
      return;
    }

    const saved = persistLoad();
    if (saved?.screen === 'game' && saved.puzzle?.length === 81) {
      setPuzzle(saved.puzzle);
      setSolution(saved.solution ?? emptyGrid);
      setValues(saved.values ?? emptyGrid);
      setNotes(saved.notes ?? emptyNotes());
      setErrors(Array(81).fill(false));
      setMistakes(saved.mistakes ?? 0);
      setLevel(saved.level ?? 'Easy');
      setSecondsElapsed(saved.secondsElapsed ?? 0);
      setIsPencilMode(false);
      setScreen('game');

      if (saved.customInitialPuzzle) {
        setCustomInitialPuzzle(saved.customInitialPuzzle);
        setCustomInitialSolution(saved.customInitialSolution);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist whenever game state changes ───────────────────────────────────
  useEffect(() => {
    if (screen === 'game' && !isLoading) {
      persistSave({
        screen,
        puzzle,
        solution,
        values,
        notes,
        mistakes,
        level,
        secondsElapsed,
        customInitialPuzzle,
        customInitialSolution,
      });
    }
  }, [
    screen,
    puzzle,
    solution,
    values,
    notes,
    mistakes,
    level,
    secondsElapsed,
    isLoading,
    customInitialPuzzle,
    customInitialSolution,
  ]);

  // ── Clear persistence when leaving game ───────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') persistClear();
  }, [screen]);

  const startGame = useCallback((nextLevel, customData = null) => {
    setLevel(nextLevel);
    setScreen('game');
    setIsLoading(true);
    setModal(null);
    setSelectedIndex(null);
    window.history.pushState(null, '', `?level=${encodeURIComponent(nextLevel)}`);

    window.setTimeout(() => {
      let finalPuzzle, finalSolution;
      if (customData) {
        finalPuzzle = customData.puzzle;
        finalSolution = customData.solution;
        setCustomInitialPuzzle(customData.puzzle);
        setCustomInitialSolution(customData.solution);
      } else if (nextLevel.startsWith('Custom') && customInitialPuzzle) {
        finalPuzzle = customInitialPuzzle;
        finalSolution = customInitialSolution;
      } else {
        const data = gameRef.current.generate(nextLevel);
        finalPuzzle = data.puzzle;
        finalSolution = data.solution;
        setCustomInitialPuzzle(null);
        setCustomInitialSolution(null);
      }

      setPuzzle(finalPuzzle);
      setSolution(finalSolution);
      setValues(emptyGrid);
      setNotes(emptyNotes());
      setErrors(Array(81).fill(false));
      setMistakes(0);
      setIsPencilMode(false);
      setSecondsElapsed(0);
      setIsLoading(false);
    }, 50);
  }, [customInitialPuzzle, customInitialSolution]);

  const returnToMenu = useCallback(() => {
    setScreen('menu');
    setModal(null);
    setSelectedIndex(null);
    window.history.pushState(null, '', window.location.pathname);
  }, []);

  const openBuilder = useCallback(() => {
    setScreen('builder');
    setModal(null);
    setSelectedIndex(null);
    window.history.pushState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (screen !== 'game' || isLoading || modal) return undefined;

    const interval = window.setInterval(() => {
      setSecondsElapsed((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [screen, isLoading, modal]);

  const closeModal = useCallback(() => setModal(null), []);

  const clearConflictingNotes = useCallback((index, number) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    setNotes((current) =>
      current.map((cellNotes, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const sameGroup = r === row || c === col || (r >= boxRow && r < boxRow + 3 && c >= boxCol && c < boxCol + 3);
        return sameGroup ? cellNotes.filter((note) => note !== number) : cellNotes;
      })
    );
  }, []);

  const checkSolved = useCallback((nextValues) => {
    return solution.every((answer, index) => puzzle[index] !== 0 || nextValues[index] === answer);
  }, [puzzle, solution]);

  const handleInput = useCallback((number) => {
    if (selectedIndex === null || fixedCells[selectedIndex] || modal) return;

    if (isPencilMode && !values[selectedIndex]) {
      setNotes((current) =>
        current.map((cellNotes, index) => {
          if (index !== selectedIndex) return cellNotes;
          return cellNotes.includes(number)
            ? cellNotes.filter((note) => note !== number)
            : [...cellNotes, number].sort((a, b) => a - b);
        })
      );
      return;
    }

    if (values[selectedIndex] === number && !errors[selectedIndex]) return;

    if (number === solution[selectedIndex]) {
      setValues((current) => {
        const next = [...current];
        next[selectedIndex] = number;
        if (checkSolved(next)) {
          setModal({
            title: 'Solved!',
            message: `Time: ${formatTime(secondsElapsed)}`,
            primary: 'Play Again',
            secondary: 'Menu',
            onPrimary: () => startGame(level),
            onSecondary: returnToMenu,
          });
        }
        return next;
      });
      setErrors((current) => {
        const next = [...current];
        next[selectedIndex] = false;
        return next;
      });
      setNotes((current) => {
        const next = current.map((cellNotes, index) => (index === selectedIndex ? [] : cellNotes));
        return next;
      });
      clearConflictingNotes(selectedIndex, number);
      return;
    }

    setValues((current) => {
      const next = [...current];
      next[selectedIndex] = number;
      return next;
    });
    setErrors((current) => {
      const next = [...current];
      next[selectedIndex] = true;
      return next;
    });
    setMistakes((current) => {
      const next = current + 1;
      if (next >= MAX_MISTAKES) {
        setModal({
          title: 'Game Over',
          message: 'Too many mistakes.',
          primary: 'Try Again',
          secondary: 'Menu',
          onPrimary: () => startGame(level),
          onSecondary: returnToMenu,
        });
      }
      return next;
    });
  }, [
    checkSolved,
    clearConflictingNotes,
    errors,
    fixedCells,
    isPencilMode,
    level,
    modal,
    returnToMenu,
    secondsElapsed,
    selectedIndex,
    solution,
    startGame,
    values,
  ]);

  const clearCurrentCell = useCallback(() => {
    if (selectedIndex === null || fixedCells[selectedIndex] || modal) return;

    setValues((current) => {
      const next = [...current];
      next[selectedIndex] = 0;
      return next;
    });
    setErrors((current) => {
      const next = [...current];
      next[selectedIndex] = false;
      return next;
    });
    setNotes((current) => current.map((cellNotes, index) => (index === selectedIndex ? [] : cellNotes)));
  }, [fixedCells, modal, selectedIndex]);

  const moveSelection = useCallback((key) => {
    setSelectedIndex((current) => {
      if (current === null) return 0;
      if (key === 'ArrowUp' && current >= 9) return current - 9;
      if (key === 'ArrowDown' && current <= 71) return current + 9;
      if (key === 'ArrowLeft' && current % 9 !== 0) return current - 1;
      if (key === 'ArrowRight' && current % 9 !== 8) return current + 1;
      return current;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (screen !== 'game' || modal) return;

      const number = Number(event.key);
      if (number >= 1 && number <= 9) {
        handleInput(number);
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        moveSelection(event.key);
      }

      if (event.key === 'Backspace' || event.key === 'Delete') clearCurrentCell();
      if (event.key.toLowerCase() === 'n') setIsPencilMode((current) => !current);
      if (event.key === 'Escape') setSelectedIndex(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearCurrentCell, handleInput, modal, moveSelection, screen]);

  const requestRestart = () => {
    setModal({
      title: 'Restart?',
      message: 'Abandon current game and start new?',
      primary: 'Restart',
      secondary: 'Cancel',
      onPrimary: () => startGame(level),
      onSecondary: closeModal,
    });
  };

  if (screen === 'menu') {
    return <Menu onSelectLevel={startGame} onOpenBuilder={openBuilder} />;
  }

  if (screen === 'builder') {
    return (
      <CustomBuilder
        onBack={returnToMenu}
        onPlayCustom={(customData) => startGame('Custom', customData)}
      />
    );
  }

  return (
    <div className="app-shell">
      {isLoading && <LoadingOverlay />}
      <header className="game-header">
        <div className="header-title">
          <button className="icon-button" type="button" aria-label="Back to menu" onClick={returnToMenu}>
            <span aria-hidden="true">‹</span>
          </button>
          <h1>Sudoku</h1>
        </div>

        <div className="game-stats">
          <div className="timer">{formatTime(secondsElapsed)}</div>
          <div className="mistakes">
            Mistakes: <span className={mistakes > 0 ? 'danger' : ''}>{mistakes}/{MAX_MISTAKES}</span>
          </div>
          <span className="level-pill">{level}</span>
        </div>
      </header>

      <main className="game-layout">
        <section className="board-stage" aria-label="Sudoku board">
          <div className="sudoku-grid">
            {puzzle.map((given, index) => (
              <Cell
                key={index}
                index={index}
                given={given}
                value={values[index]}
                notes={notes[index]}
                isSelected={selectedIndex === index}
                isHighlighted={selectedValue !== 0 && (given || values[index]) === selectedValue}
                hasError={errors[index]}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </section>

        <aside className="control-panel">
          <div className="action-row">
            <button className="primary-button" type="button" onClick={requestRestart}>New</button>
            <button className="secondary-button" type="button" onClick={clearCurrentCell}>Clear</button>
            <button
              className={`secondary-button pencil-button ${isPencilMode ? 'active' : ''}`}
              type="button"
              onClick={() => setIsPencilMode((current) => !current)}
            >
              <span aria-hidden="true">✎</span>
              {isPencilMode ? 'On' : 'Off'}
            </button>
          </div>

          <div className="numpad">
            {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
              <button className="numpad-button" type="button" key={number} onClick={() => handleInput(number)}>
                {number}
              </button>
            ))}
          </div>
        </aside>
      </main>

      {modal && <GameModal modal={modal} />}
    </div>
  );
}
