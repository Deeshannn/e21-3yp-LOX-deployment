import React from 'react';
import LockerGrid from './LockerGrid';

/**
 * Formats milliseconds as MM:SS or HH:MM:SS
 */
function formatCountdown(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Formats milliseconds as "Xh Ym" for overdue display
 */
function formatOverdue(ms) {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m overdue`;
  return `${m}m overdue`;
}

/**
 * LockerCountdownBadge – a live client-side countdown for a single locker card.
 * Uses the locker's reservedAt + station's freeDurationMinutes / gracePeriodMinutes.
 */
function LockerCountdownBadge({ locker, station }) {
  const [phase, setPhase] = React.useState('ACTIVE');
  const [remainingMs, setRemainingMs] = React.useState(null);
  const [overdueMs, setOverdueMs] = React.useState(0);

  const freeDurationMs = (station?.freeDurationMinutes ?? 60) * 60 * 1000;
  const gracePeriodMs = (station?.gracePeriodMinutes ?? 10) * 60 * 1000;

  React.useEffect(() => {
    if (!locker.reservedAt) return;

    function tick() {
      const now = Date.now();
      const reservedAt = new Date(locker.reservedAt).getTime();
      const elapsedMs = now - reservedAt;

      if (locker.overdueReleasedAt) {
        const releasedAt = new Date(locker.overdueReleasedAt).getTime();
        const graceRemaining = (releasedAt + gracePeriodMs) - now;
        setPhase('OVERDUE_RELEASED');
        setRemainingMs(Math.max(0, graceRemaining));
        setOverdueMs(0);
        return;
      }

      if (elapsedMs < freeDurationMs) {
        setPhase('ACTIVE');
        setRemainingMs(freeDurationMs - elapsedMs);
        setOverdueMs(0);
      } else {
        setPhase('OVERDUE');
        setRemainingMs(0);
        setOverdueMs(elapsedMs - freeDurationMs);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [locker.reservedAt, locker.overdueReleasedAt, freeDurationMs, gracePeriodMs]);

  if (!locker.reservedAt) return null;

  if (phase === 'ACTIVE') {
    return (
      <div className="countdown-badge countdown-active">
        <span className="countdown-icon">🟢</span>
        <div>
          <span className="countdown-label">FREE TIME</span>
          <span className="countdown-value">{formatCountdown(remainingMs)}</span>
        </div>
      </div>
    );
  }

  if (phase === 'OVERDUE_RELEASED') {
    return (
      <div className="countdown-badge countdown-grace">
        <span className="countdown-icon">✅</span>
        <div>
          <span className="countdown-label">GRACE PERIOD</span>
          <span className="countdown-value">{formatCountdown(remainingMs)}</span>
        </div>
      </div>
    );
  }

  // OVERDUE
  return (
    <div className="countdown-badge countdown-overdue">
      <span className="countdown-icon">🔴</span>
      <div>
        <span className="countdown-label">OVERDUE</span>
        <span className="countdown-value">{formatOverdue(overdueMs)}</span>
      </div>
    </div>
  );
}

function LockerPanel({
  user,
  stations,
  selectedStationId,
  onStationChange,
  lockers,
  onUnlock,
  onLock,
  onRelease,
  onIgnoreSecurity,
  onOverduePayment,
  token
}) {
  const currentUserId = user.id || user._id;

  const isLockerOwnedByCurrentUser = (locker) => {
    const lockerUserId = locker.currentUserId?._id || locker.currentUserId || '';
    return String(lockerUserId) === String(currentUserId);
  };

  const activeUserLockers =
    user.role === 'USER'
      ? lockers.filter((locker) => locker.isBooked && isLockerOwnedByCurrentUser(locker))
      : [];

  const hasActiveUserLockers = activeUserLockers.length > 0;
  const visibleLockers = hasActiveUserLockers ? activeUserLockers : lockers;
  const showLockerCards = user.role !== 'USER' || hasActiveUserLockers;

  const canControlLocker = (locker) => {
    if (user.role !== 'USER') return true;
    return isLockerOwnedByCurrentUser(locker);
  };

  const getLockerStation = (locker) => {
    const sid = String(locker.stationId?._id || locker.stationId || '');
    return stations.find((s) => String(s._id) === sid) || null;
  };

  const canIgnoreL1SecurityWarning = (locker) => {
    if (user.role !== 'SUB_ADMIN' && user.role !== 'SUPER_ADMIN') return false;
    const allowedStationIds = (user.stationIds || []).map((id) => String(id));
    const sid = String(locker.stationId?._id || locker.stationId || '');
    return user.role === 'SUPER_ADMIN' || allowedStationIds.includes(sid);
  };

  const getLockerPhase = (locker, station) => {
    if (!locker.reservedAt || !locker.isBooked) return null;
    const freeDurationMs = (station?.freeDurationMinutes ?? 60) * 60 * 1000;
    const gracePeriodMs = (station?.gracePeriodMinutes ?? 10) * 60 * 1000;
    const elapsed = Date.now() - new Date(locker.reservedAt).getTime();
    if (locker.overdueReleasedAt) {
      const graceRemaining = (new Date(locker.overdueReleasedAt).getTime() + gracePeriodMs) - Date.now();
      return graceRemaining > 0 ? 'OVERDUE_RELEASED' : 'OVERDUE_RELEASED_EXPIRED';
    }
    return elapsed < freeDurationMs ? 'ACTIVE' : 'OVERDUE';
  };

  return (
    <section className="panel">
      <h2>{user.role === 'USER' ? 'My Locker Access' : 'Locker Monitoring'}</h2>

      <div className="grid-form station-picker-row">
        <select value={selectedStationId} onChange={(e) => onStationChange(e.target.value)}>
          <option value="">Select Sub-admin Station</option>
          {stations.map((station) => (
            <option key={station._id} value={station._id}>
              {station.name} ({station.code})
            </option>
          ))}
        </select>
      </div>

      {!hasActiveUserLockers ? <LockerGrid lockers={lockers} /> : null}

      {showLockerCards ? (
        <div className="cards">
          {visibleLockers.map((locker) => {
            const station = getLockerStation(locker);
            const phase = user.role === 'USER' ? getLockerPhase(locker, station) : null;
            const isOverdue = phase === 'OVERDUE';

            return (
              <article
                className={`mini-card${isOverdue ? ' mini-card-overdue' : ''}`}
                key={locker._id}
              >
                <h3>{locker.code}</h3>
                <p>Lock: {locker.lockState}</p>
                <p>Door: {locker.doorState}</p>
                <p>Booked: {locker.isBooked ? 'Yes' : 'No'}</p>

                {/* Live countdown badge for user's locker */}
                {user.role === 'USER' && locker.reservedAt && (
                  <LockerCountdownBadge locker={locker} station={station} />
                )}

                {locker.code === 'L1' && locker.securityAlertActive ? (
                  <p className="security-warning">
                    {locker.securityAlertMessage || 'Security alert active on Locker 1.'}
                  </p>
                ) : null}

                {canControlLocker(locker) ? (
                  <div className="actions">
                    {/* OVERDUE: only show "Pay Overdue Fee" button */}
                    {isOverdue ? (
                      <button
                        className="btn-overdue-pay"
                        onClick={() => onOverduePayment && onOverduePayment(locker._id)}
                      >
                        💳 Pay Overdue Fee
                      </button>
                    ) : (
                      <>
                        <button onClick={() => onUnlock(locker._id)}>Unlock</button>
                        <button onClick={() => onLock(locker._id)}>Lock</button>
                        <button onClick={() => onRelease(locker._id)}>Release</button>
                        {locker.code === 'L1' && locker.securityAlertActive && canIgnoreL1SecurityWarning(locker) ? (
                          <button className="danger" onClick={() => onIgnoreSecurity(locker._id)}>
                            Ignore Warning
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="muted-text">View only</p>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default LockerPanel;
