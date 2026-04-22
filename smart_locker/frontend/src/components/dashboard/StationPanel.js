import React from 'react';

function StationPanel({ user, stations, onEmergencyUnlock, onLockAll, onChangeSchedule }) {
  if (!(user.role === 'SUPER_ADMIN' || user.role === 'SUB_ADMIN')) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Station Monitoring</h2>
      <div className="cards">
        {stations.map((station) => (
          <article className="mini-card" key={station._id}>
            <h3>{station.name}</h3>
            <p>Code: {station.code}</p>
            <p>Schedule: {station.schedule.openTime} - {station.schedule.closeTime}</p>
            <div className="actions">
              <button onClick={() => onEmergencyUnlock(station._id)}>Emergency Unlock All</button>
              <button onClick={() => onLockAll(station._id)}>Lock All</button>
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => onChangeSchedule(station)}>
                Change Schedule
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StationPanel;
