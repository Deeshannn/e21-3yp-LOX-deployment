import React from 'react';

function AdminSetupPanel({ user, stationForm, onStationFormChange, onCreateStation, lockerForm, onLockerFormChange, onCreateLocker, stations }) {
  if (!(user.role === 'SUPER_ADMIN' || user.role === 'SUB_ADMIN')) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Admin Setup</h2>

      {user.role === 'SUPER_ADMIN' && (
        <form onSubmit={onCreateStation} className="grid-form inline">
          <input
            placeholder="Station Name"
            value={stationForm.name}
            onChange={(e) => onStationFormChange('name', e.target.value)}
            required
          />
          <input
            placeholder="Station Code"
            value={stationForm.code}
            onChange={(e) => onStationFormChange('code', e.target.value.toUpperCase())}
            required
          />
          <input
            type="time"
            value={stationForm.openTime}
            onChange={(e) => onStationFormChange('openTime', e.target.value)}
          />
          <input
            type="time"
            value={stationForm.closeTime}
            onChange={(e) => onStationFormChange('closeTime', e.target.value)}
          />
          <button type="submit">Create Station</button>
        </form>
      )}

      <form onSubmit={onCreateLocker} className="grid-form inline">
        <select
          value={lockerForm.stationId}
          onChange={(e) => onLockerFormChange('stationId', e.target.value)}
          required
        >
          <option value="">Select Station</option>
          {stations.map((station) => (
            <option key={station._id} value={station._id}>
              {station.name} ({station.code})
            </option>
          ))}
        </select>
        <input
          placeholder="Locker Code"
          value={lockerForm.code}
          onChange={(e) => onLockerFormChange('code', e.target.value.toUpperCase())}
          required
        />
        <input
          placeholder="Control Topic (optional)"
          value={lockerForm.controlTopic}
          onChange={(e) => onLockerFormChange('controlTopic', e.target.value)}
        />
        <input
          placeholder="State Topic (optional)"
          value={lockerForm.stateTopic}
          onChange={(e) => onLockerFormChange('stateTopic', e.target.value)}
        />
        <button type="submit">Add Locker</button>
      </form>
    </section>
  );
}

export default AdminSetupPanel;
