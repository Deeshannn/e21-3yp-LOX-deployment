import React from 'react';

function ThemePanel({ theme, onThemeChange }) {
  return (
    <section className="panel theme-panel">
      <div className="section-heading">
        <h2>Theme</h2>
        <p>Choose the look you want for the dashboard.</p>
      </div>

      <div className="theme-options" role="group" aria-label="Theme options">
        <button
          type="button"
          className={theme === 'light' ? 'theme-option active' : 'theme-option'}
          onClick={() => onThemeChange('light')}
        >
          Light
        </button>
        <button
          type="button"
          className={theme === 'dark' ? 'theme-option active' : 'theme-option'}
          onClick={() => onThemeChange('dark')}
        >
          Dark
        </button>
      </div>

      <div className="theme-preview">
        <strong>Current theme</strong>
        <span>{theme === 'dark' ? 'Dark mode is active.' : 'Light mode is active.'}</span>
      </div>
    </section>
  );
}

export default ThemePanel;