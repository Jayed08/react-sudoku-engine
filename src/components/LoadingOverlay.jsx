import React from 'react';
import './LoadingOverlay.css';

export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p className="loading-text">Generating Puzzle...</p>
    </div>
  );
}
