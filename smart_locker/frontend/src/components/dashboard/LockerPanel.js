import React from 'react';
import LockerGrid from './LockerGrid';

function LockerPanel({
  user,
  stations,
  selectedStationId,
  onStationChange,
  lockers,
  onUnlock,
  onLock,
  onRelease,
  onIgnoreSecurity
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
    if (user.role !== 'USER') {
      return true;
    }

    return isLockerOwnedByCurrentUser(locker);
  };

  const getLockerStationId = (locker) => {
    if (!locker?.stationId) {
      return '';
    }
    return String(locker.stationId?._id || locker.stationId);
  };

  const canIgnoreL1SecurityWarning = (locker) => {
    if (user.role !== 'SUB_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return false;
    }

    const allowedStationIds = (user.stationIds || []).map((id) => String(id));
    return user.role === 'SUPER_ADMIN' || allowedStationIds.includes(getLockerStationId(locker));
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
          {visibleLockers.map((locker) => (
            <article className="mini-card" key={locker._id}>
              <h3>{locker.code}</h3>
              <p>Lock: {locker.lockState}</p>
              <p>Door: {locker.doorState}</p>
              <p>Booked: {locker.isBooked ? 'Yes' : 'No'}</p>
              {locker.code === 'L1' && locker.securityAlertActive ? (
                <p className="security-warning">
                  {locker.securityAlertMessage || 'Security alert active on Locker 1.'}
                </p>
              ) : null}
              {canControlLocker(locker) ? (
                <div className="actions">
                  <button onClick={() => onUnlock(locker._id)}>Unlock</button>
                  <button onClick={() => onLock(locker._id)}>Lock</button>
                  <button onClick={() => onRelease(locker._id)}>Release</button>
                  {locker.code === 'L1' && locker.securityAlertActive && canIgnoreL1SecurityWarning(locker) ? (
                    <button className="danger" onClick={() => onIgnoreSecurity(locker._id)}>
                      Ignore Warning
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="muted-text">View only</p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default LockerPanel;
