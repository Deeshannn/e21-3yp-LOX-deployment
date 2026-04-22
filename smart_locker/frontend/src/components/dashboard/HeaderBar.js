import React from 'react';

function HeaderBar({ user, onRefresh, onLogout }) {
  return (
    <header className="header panel">
      <div>
        <h1>Smart Locker Dashboard</h1>
        <p>
          {user.name} | <span className="role">{user.role.replace('_', ' ')}</span>
        </p>
      </div>
      <div className="header-actions">
        <button className="secondary" onClick={onRefresh}>Refresh</button>
        <button className="danger" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}

export default HeaderBar;
