import React from 'react';
import './Cell.css';

export default function Cell({ given, value, notes, isSelected, isHighlighted, hasError, onSelect }) {
  const displayValue = given || value || '';
  const classes = [
    'cell',
    given ? 'fixed-cell' : 'playable-cell',
    isSelected ? 'selected' : '',
    isHighlighted ? 'highlight-same' : '',
    hasError ? 'error' : '',
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} type="button" onClick={onSelect}>
      <span className="notes-grid" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => index + 1).map((number) => (
          <span className={`note-num ${notes.includes(number) ? 'active' : ''}`} key={number}>
            {number}
          </span>
        ))}
      </span>
      <span className="value">{displayValue}</span>
    </button>
  );
}
