import React from 'react';

function getUserBadge(user) {
  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return {
    initials,
    avatarUrl: user?.avatarUrl || ''
  };
}

function HeaderBar({ user, stationName, activeSection, onSectionChange, onRefresh, onLogout }) {
  const badge = getUserBadge(user);
  const canViewStore = user?.role === 'USER' || user?.role === 'SUB_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <header className="header panel dashboard-header">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-kicker">Welcome to</p>
          <h1>{stationName || 'Locker Station'}</h1>
          <p className="dashboard-hero-subtitle"></p>
        </div>

        <div className="dashboard-user-chip" title={user?.name || 'User'}>
          <div className="dashboard-user-avatar">
            {badge.avatarUrl ? <img src={badge.avatarUrl} alt={`${user?.name || 'User'} avatar`} /> : <span>{badge.initials}</span>}
          </div>
          <div className="dashboard-user-copy">
            <span className="dashboard-user-label">Logged as</span>
            <strong>
              {user?.name || 'User'} | {user?.role === 'SUB_ADMIN' ? 'Sub Admin' : user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'}
            </strong>
          </div>
        </div>
      </div>

      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <button
          type="button"
          className={activeSection === 'home' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onSectionChange('home')}
        >
          Home
        </button>
        {canViewStore ? (
          <button
            type="button"
            className={activeSection === 'store' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => onSectionChange('store')}
          >
            Store
          </button>
        ) : null}
        <button
          type="button"
          className={activeSection === 'account' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onSectionChange('account')}
        >
          My Account
        </button>
        <button
          type="button"
          className={activeSection === 'help' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onSectionChange('help')}
        >
          Help
        </button>
        <button
          type="button"
          className={activeSection === 'analytics' ? 'nav-tab active' : 'nav-tab'}
          onClick={() => onSectionChange('analytics')}
        >
          Analytics
        </button>

        <div className="nav-actions">
          <button className="nav-tab" type="button" onClick={onRefresh}>
            Refresh
          </button>
          <button className="nav-tab" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

export default HeaderBar;
