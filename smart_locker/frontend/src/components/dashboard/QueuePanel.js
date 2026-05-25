import React from 'react';

function QueuePanel({ queueEntries }) {
  return (
    <section className="panel">
      <h2>Queue</h2>
      <div className="cards">
        {queueEntries.map((entry) => (
          <article className="mini-card" key={entry._id}>
            <h3>{entry.userId?.name || 'User'}</h3>
            <p>Status: {entry.status}</p>
            <p>Requested: {new Date(entry.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default QueuePanel;
