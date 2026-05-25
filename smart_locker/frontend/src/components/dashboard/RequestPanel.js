import React from 'react';

function RequestPanel({
  user,
  stations,
  requests,
  requestForm,
  onRequestFormChange,
  onCreateRequest,
  onApprove,
  onReject,
  onCancel
}) {
  if (user.role === 'USER') {
    const activeRequest = requests.find((item) => item.status === 'PENDING' || item.status === 'QUEUED');

    return (
      <section className="panel">
        <h2>Request Locker Access</h2>

        {activeRequest ? (
          <article className="mini-card">
            <h3>Current Request</h3>
            <p>Status: {activeRequest.status}</p>
            <p>Station: {activeRequest.stationId?.code || '-'}</p>
            <p>Note: {activeRequest.note || '-'}</p>
            <div className="actions">
              <button className="danger" type="button" onClick={() => onCancel(activeRequest._id)}>
                Cancel Request
              </button>
            </div>
          </article>
        ) : null}

        <form onSubmit={onCreateRequest} className="grid-form inline">
          <select
            value={requestForm.stationId}
            onChange={(e) => onRequestFormChange('stationId', e.target.value)}
            required
            disabled={Boolean(activeRequest)}
          >
            <option value="">Select Station</option>
            {stations.map((station) => (
              <option key={station._id} value={station._id}>
                {station.name} ({station.code})
              </option>
            ))}
          </select>
          <input
            placeholder="Note"
            value={requestForm.note}
            onChange={(e) => onRequestFormChange('note', e.target.value)}
            disabled={Boolean(activeRequest)}
          />
          <button type="submit" disabled={Boolean(activeRequest)}>
            {activeRequest ? 'Request Pending' : 'Submit Request'}
          </button>
        </form>
        {activeRequest ? <p className="muted-text">Your request is pending. You can cancel it if needed.</p> : null}
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
