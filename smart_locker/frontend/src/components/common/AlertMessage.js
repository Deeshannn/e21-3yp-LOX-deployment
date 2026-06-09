import React from 'react';

function AlertMessage({ type, text, onClose }) {
  if (!text) {
    return null;
  }

  const isError = type === 'error';
  const title = isError ? 'Oh no!' : 'Yeah!';
  const icon = isError ? '✕' : '✓';

  return (
    <div className="notification-backdrop" role="presentation">
      <div
        className={isError ? 'notification-card notification-error' : 'notification-card notification-success'}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        aria-describedby="notification-message"
      >
        <div className="notification-icon" aria-hidden="true">
          <span>{icon}</span>
        </div>
        <h3 id="notification-title">{title}</h3>
        <p id="notification-message">{text}</p>
        <button type="button" className="notification-action" onClick={onClose} autoFocus>
          Proceed
        </button>
      </div>
    </div>
  );
}

export default AlertMessage;
