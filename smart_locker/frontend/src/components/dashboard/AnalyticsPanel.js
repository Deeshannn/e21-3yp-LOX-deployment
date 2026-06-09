import React from 'react';

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function toHourIndex(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.getHours();
}

function sameLocalDay(value, reference = new Date()) {
  const date = new Date(value);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function buildHourSeries(items, getTime, filterItem) {
  const series = Array.from({ length: 24 }, () => 0);

  items.forEach((item) => {
    if (filterItem && !filterItem(item)) {
      return;
    }

    const hourIndex = toHourIndex(getTime(item));
    if (hourIndex === null) {
      return;
    }

    series[hourIndex] += 1;
  });

  return series;
}

function sumSeries(series) {
  return series.reduce((total, value) => total + value, 0);
}

function maxSeries(series) {
  return Math.max(...series, 0);
}

function peakHourLabel(series) {
  const peakValue = maxSeries(series);
  if (!peakValue) {
    return 'No peak yet';
  }

  const peakHour = series.findIndex((value) => value === peakValue);
  return `${String(peakHour).padStart(2, '0')}:00`;
}

function BarChart({ title, description, series, accentClass }) {
  const maxValue = maxSeries(series) || 1;

  return (
    <article className="analytics-chart panel">
      <div className="section-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="bar-chart" aria-label={title}>
        {HOURS.map((hour) => {
          const value = series[hour] || 0;
          const height = Math.max((value / maxValue) * 100, value > 0 ? 10 : 0);

          return (
            <div className="bar-column" key={hour}>
              <div className="bar-track">
                <div className={`bar-fill ${accentClass}`} style={{ height: `${height}%` }} title={`${hour}:00 - ${value}`} />
              </div>
              <span className="bar-value">{value}</span>
              <span className="bar-label">{String(hour).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AnalyticsPanel({ requests }) {
  const now = new Date();

  const requestsToday = requests.filter((request) => sameLocalDay(request.createdAt, now));
  const approvedToday = requests.filter(
    (request) => request.status === 'APPROVED' && sameLocalDay(request.approvedAt || request.createdAt, now)
  );

  const queueSeries = buildHourSeries(requestsToday, (request) => request.createdAt, (request) => request.status === 'QUEUED');
  const accessSeries = buildHourSeries(approvedToday, (request) => request.approvedAt || request.createdAt);
  const peakSeries = HOURS.map((hour) => (queueSeries[hour] || 0) + (accessSeries[hour] || 0));

  return (
    <section className="panel analytics-panel">
      <div className="section-heading">
        <h2>Analytics</h2>
        <p>Live bar graphs update automatically as new requests and approvals flow through the system.</p>
      </div>

      <div className="analytics-summary cards">
        <article className="mini-card">
          <h3>Queue waits today</h3>
          <p>{sumSeries(queueSeries)}</p>
        </article>
        <article className="mini-card">
          <h3>Locker access today</h3>
          <p>{sumSeries(accessSeries)}</p>
        </article>
        <article className="mini-card">
          <h3>Peak hour</h3>
          <p>{peakHourLabel(peakSeries)}</p>
        </article>
      </div>

      <div className="analytics-grid">
        <BarChart
          title="Queue Waited"
          description="How many requests entered the queue per hour today."
          series={queueSeries}
          accentClass="bar-fill-queue"
        />
        <BarChart
          title="Locker Access"
          description="How many requests were approved per hour today."
          series={accessSeries}
          accentClass="bar-fill-access"
        />
        <BarChart
          title="Peak Hours"
          description="Combined queue and locker activity by hour."
          series={peakSeries}
          accentClass="bar-fill-peak"
        />
      </div>
    </section>
  );
}

export default AnalyticsPanel;
