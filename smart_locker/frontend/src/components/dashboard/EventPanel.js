import React from 'react';

function EventPanel({ events }) {
  return (
    <section className="panel event-panel">
      <div className="section-heading">
        <h2>Locker Behavior Events</h2>
        <p>Live activity for the selected station.</p>
      </div>

      <div className="event-list">
        {events.length ? (
          events.map((event) => (
            <div className="event-row" key={event._id}>
              <strong>{event.eventType}</strong>
              <span>{event.message}</span>
              <span>{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p className="muted-text">No locker events yet.</p>
        )}
      </div>
    </section>
  );
}

export default EventPanel;
