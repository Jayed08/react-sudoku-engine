import React from 'react';
import './GameModal.css';

export default function GameModal({ modal }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <h2 id="modal-title">{modal.title}</h2>
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={modal.onSecondary}>
            {modal.secondary}
          </button>
          <button className="primary-button" type="button" onClick={modal.onPrimary}>
            {modal.primary}
          </button>
        </div>
      </div>
    </div>
  );
}
