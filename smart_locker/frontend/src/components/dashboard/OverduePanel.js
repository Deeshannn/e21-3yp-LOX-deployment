import React from 'react';

/**
 * OverduePanel – shows all overdue lockers at a station for sub-admin monitoring.
 */
function OverduePanel({ station, overdueLockers = [] }) {
  function formatDuration(ms) {
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  if (!station) {
    return (
      <section className="panel overdue-panel">
        <h2>Overdue Lockers</h2>
        <p className="muted-text">Select a station to view overdue lockers.</p>
      </section>
    );
  }

  return (
    <section className="panel overdue-panel">
      <div className="overdue-header">
        <div>
          <h2>Overdue Lockers</h2>
        </div>
        <span className="overdue-badge-count">
          {overdueLockers.length} overdue
        </span>
      </div>

      {overdueLockers.length === 0 ? (
        <div className="overdue-empty">
          <p>No overdue lockers at this station.</p>
        </div>
      ) : (
        <div className="overdue-table-wrapper">
          <table className="overdue-table">
            <thead>
              <tr>
                <th>Locker</th>
                <th>User</th>
                <th>Overdue By</th>
                <th>Accrued Charge</th>
                <th>Free Ended At</th>
              </tr>
            </thead>
            <tbody>
              {overdueLockers.map(({ locker, overdueMs, chargeAmount, freeEndsAt }) => {
                const user = locker.currentUserId;
                return (
                  <tr key={locker._id} className="overdue-row">
                    <td>
                      <span className="locker-code-badge">{locker.code}</span>
                    </td>
                    <td>
                      <div className="overdue-user-info">
                        <span className="overdue-user-name">{user?.name || 'Unknown'}</span>
                        <span className="overdue-user-email">{user?.email || ''}</span>
                      </div>
                    </td>
                    <td>
                      <span className="overdue-duration">{formatDuration(overdueMs)}</span>
                    </td>
                    <td>
                      <span className="overdue-charge">${Number(chargeAmount).toFixed(2)}</span>
                    </td>
                    <td className="overdue-free-ended">
                      {freeEndsAt ? new Date(freeEndsAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OverduePanel;
