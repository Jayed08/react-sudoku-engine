import React from 'react';
import { LEVELS } from '../utils/sudokuHelpers.js';
import './Menu.css';

export default function Menu({ onSelectLevel, onOpenBuilder }) {
  return (
    <main className="menu-screen">
      <section className="menu-panel">
        <div className="menu-copy">
          <h1>Sudoku</h1>
          <p>Select Difficulty</p>
        </div>

        <div className="level-grid">
          {LEVELS.map((level) => (
            <button
              className={`level-button level-${level.toLowerCase()}`}
              type="button"
              key={level}
              onClick={() => onSelectLevel(level)}
            >
              {level}{level === 'Extreme' ? ' ⚡' : ''}
            </button>
          ))}
        </div>

        <button className="builder-entry-btn" type="button" onClick={onOpenBuilder}>
          Custom Board Builder
        </button>
      </section>
    </main>
  );
}
