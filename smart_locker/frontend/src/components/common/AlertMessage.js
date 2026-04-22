import React from 'react';

function AlertMessage({ type, text }) {
  if (!text) {
    return null;
  }

  return <p className={type === 'error' ? 'error panel' : 'ok panel'}>{text}</p>;
}

export default AlertMessage;
