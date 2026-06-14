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
  const [processing, setProcessing] = React.useState(null); // format: { id, action }

  const handleApprove = async (id) => {
    if (processing) return;
    setProcessing({ id, action: 'approve' });
    try {
      await onApprove(id);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    if (processing) return;
    setProcessing({ id, action: 'reject' });
    try {
      await onReject(id);
    } finally {
      setProcessing(null);
    }
  };

  if (user.role === 'USER') {
    const activeRequest = requests.find((item) => item.status === 'PENDING' || item.status === 'QUEUED');

    return (
      <section className="panel">
        <h2>Request Locker Access</h2>

        {activeRequest ? (
          <article className="mini-card">
            <h3>Current Request</h3>
            <p>Status: {activeRequest.status}</p>
            <p>Sub-admin station: {activeRequest.stationId?.code || '-'}</p>
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
            <option value="">Select Sub-admin Station</option>
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
              <p>Sub-admin station: {item.stationId?.code || '-'}</p>
              <p>Note: {item.note || '-'}</p>
              <div className="actions">
                <button disabled={processing !== null} onClick={() => handleApprove(item._id)}>
                  {processing?.id === item._id && processing?.action === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button className="danger" disabled={processing !== null} onClick={() => handleReject(item._id)}>
                  {processing?.id === item._id && processing?.action === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

export default RequestPanel;
