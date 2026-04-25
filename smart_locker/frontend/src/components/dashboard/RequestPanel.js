import React from 'react';

function RequestPanel({ user, requests, onApprove, onReject }) {
  if (user.role === 'USER') {
    return (
      <section className="panel">
        <h2>Direct Locker Access</h2>
        <article className="mini-card">
          <p>You do not need to send an approval request anymore.</p>
          <p>Select a station in Locker Monitoring and click any available green locker slot.</p>
          <p>The selected locker will be assigned to you and unlocked immediately.</p>
        </article>
      </section>
    );
  }

  if (!(user.role === 'SUPER_ADMIN' || user.role === 'SUB_ADMIN')) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Pending User Requests</h2>
      <div className="cards">
        {requests
          .filter((item) => item.status === 'PENDING' || item.status === 'QUEUED')
          .map((item) => (
            <article className="mini-card" key={item._id}>
              <h3>{item.userId?.name || 'User'}</h3>
              <p>Status: {item.status}</p>
              <p>Station: {item.stationId?.code || '-'}</p>
              <p>Note: {item.note || '-'}</p>
              <div className="actions">
                <button onClick={() => onApprove(item._id)}>Approve</button>
                <button className="danger" onClick={() => onReject(item._id)}>Reject</button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

export default RequestPanel;
