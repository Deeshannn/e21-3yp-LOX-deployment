import React from 'react';

/**
 * FreeDurationPanel – lets a sub-admin (or super-admin) configure the
 * free duration, overdue rate, and grace period for a station.
 */
function FreeDurationPanel({ stations, selectedStationId, token, onRefresh }) {
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const station = stations.find((s) => s._id === selectedStationId) || stations[0];

  const [form, setForm] = React.useState({
    freeDurationMinutes: 60,
    overdueRatePerHour: 1.0,
    gracePeriodMinutes: 10
  });

  React.useEffect(() => {
    if (station) {
      setForm({
        freeDurationMinutes: station.freeDurationMinutes ?? 60,
        overdueRatePerHour: station.overdueRatePerHour ?? 1.0,
        gracePeriodMinutes: station.gracePeriodMinutes ?? 10
      });
    }
  }, [station]); // changed from station?._id

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!station) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/api/stations/${station._id}/free-duration`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update');

      setMessage('Free duration settings saved successfully.');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!station) {
    return (
      <section className="panel overdue-panel">
        <h2>Free Duration Settings</h2>
        <p className="muted-text">Select a station to configure free duration.</p>
      </section>
    );
  }

  return (
    <section className="panel free-duration-panel">
      <div className="free-duration-header">
        <div>
          <h2>Free Duration Settings</h2>
        </div>
      </div>

      {message ? <div className="alert alert-success">{message}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="free-duration-form">
        <div className="fd-field-group">
          <div className="fd-field">
            <label htmlFor="fd-free-minutes">
              Free Duration
            </label>
            <div className="fd-input-row">
              <input
                id="fd-free-minutes"
                type="number"
                min="0"
                max="1440"
                step="5"
                value={form.freeDurationMinutes}
                onChange={(e) => handleChange('freeDurationMinutes', e.target.value)}
              />
              <span className="fd-unit">minutes</span>
            </div>
          </div>

          <div className="fd-field">
            <label htmlFor="fd-rate">
              Overdue Rate
            </label>
            <div className="fd-input-row">
              <span className="fd-prefix">$</span>
              <input
                id="fd-rate"
                type="number"
                min="0"
                max="100"
                step="0.25"
                value={form.overdueRatePerHour}
                onChange={(e) => handleChange('overdueRatePerHour', e.target.value)}
              />
              <span className="fd-unit">/ hour</span>
            </div>
          </div>

          <div className="fd-field">
            <label htmlFor="fd-grace">
              Grace Period
            </label>
            <div className="fd-input-row">
              <input
                id="fd-grace"
                type="number"
                min="1"
                max="60"
                step="1"
                value={form.gracePeriodMinutes}
                onChange={(e) => handleChange('gracePeriodMinutes', e.target.value)}
              />
              <span className="fd-unit">minutes</span>
            </div>
          </div>
        </div>

        <div className="fd-summary-box">
          <h4>Summary</h4>
          <ul>
            <li>Free for <strong>{form.freeDurationMinutes} min</strong> after reservation</li>
            <li>After that: <strong>${Number(form.overdueRatePerHour).toFixed(2)}/hr</strong> charge</li>
            <li>After payment: <strong>{form.gracePeriodMinutes} min</strong> grace to retrieve items</li>
          </ul>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </section>
  );
}

export default FreeDurationPanel;
