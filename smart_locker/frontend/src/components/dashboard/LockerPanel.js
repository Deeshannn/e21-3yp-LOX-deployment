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
  onRelease
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

  const canControlLocker = (locker) => {
    if (user.role !== 'USER') {
      return true;
    }

    return isLockerOwnedByCurrentUser(locker);
  };

  return (
    <section className="panel">
      <h2>{user.role === 'USER' ? 'My Locker Access' : 'Locker Monitoring'}</h2>

      <div className="grid-form station-picker-row">
        <select value={selectedStationId} onChange={(e) => onStationChange(e.target.value)}>
          <option value="">Select Station</option>
          {stations.map((station) => (
            <option key={station._id} value={station._id}>
              {station.name} ({station.code})
            </option>
          ))}
        </select>
      </div>

      {!hasActiveUserLockers ? <LockerGrid lockers={lockers} /> : null}

      <div className="cards">
        {visibleLockers.map((locker) => (
          <article className="mini-card" key={locker._id}>
            <h3>{locker.code}</h3>
            <p>Lock: {locker.lockState}</p>
            <p>Door: {locker.doorState}</p>
            <p>Booked: {locker.isBooked ? 'Yes' : 'No'}</p>
            {canControlLocker(locker) ? (
              <div className="actions">
                <button onClick={() => onUnlock(locker._id)}>Unlock</button>
                <button onClick={() => onLock(locker._id)}>Lock</button>
                <button onClick={() => onRelease(locker._id)}>Release</button>
              </div>
            ) : (
              <p className="muted-text">View only</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default LockerPanel;
