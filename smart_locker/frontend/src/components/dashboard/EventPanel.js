import React from 'react';

function EventPanel({ events }) {
  return (
    <section className="panel">
      <h2>Locker Behavior Events</h2>
      <div className="event-list">
        {events.map((event) => (
          <div className="event-row" key={event._id}>
            <strong>{event.eventType}</strong> | {event.message} | {new Date(event.createdAt).toLocaleString()}
          </div>
        ))}
      </div>
    </section>
  );
}

export default EventPanel;
