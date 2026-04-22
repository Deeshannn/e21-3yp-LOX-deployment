import React from 'react';
import './App.css';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import { apiRequest, authHeaders } from './services/apiClient';
import { useDashboardData } from './hooks/useDashboardData';

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('token') || '');
  const [user, setUser] = React.useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [rejectionNotice, setRejectionNotice] = React.useState('');
  const [approvalNotice, setApprovalNotice] = React.useState('');
  const [authMode, setAuthMode] = React.useState('login');
  const [authForm, setAuthForm] = React.useState({
    name: '',
    email: '',
    password: '',
    stationCode: '',
    role: 'USER',
    inviteKey: ''
  });

  const [stationForm, setStationForm] = React.useState({
    name: '',
    code: '',
    openTime: '08:00',
    closeTime: '20:00'
  });
  const [lockerForm, setLockerForm] = React.useState({
    stationId: '',
    code: '',
    controlTopic: '',
    stateTopic: ''
  });
  const [requestForm, setRequestForm] = React.useState({ stationId: '', note: '' });

  const { stations, selectedStationId, setSelectedStationId, lockers, requests, queueEntries, events, load } =
    useDashboardData(token, user);

  React.useEffect(() => {
    if (!token || !user) {
      return;
    }

    load().catch((err) => setError(err.message));
  }, [token, user, load]);

  React.useEffect(() => {
    if (!token || !user || user.role !== 'USER' || !requests.length) {
      return;
    }

    const latestRejected = requests.find((item) => item.status === 'REJECTED');
    if (!latestRejected?._id) {
      return;
    }

    const seenKey = `seenRejectedRequestIds:${user.id}`;
    let seenIds = [];

    try {
      const raw = localStorage.getItem(seenKey);
      seenIds = raw ? JSON.parse(raw) : [];
    } catch (err) {
      seenIds = [];
    }

    if (seenIds.includes(latestRejected._id)) {
      return;
    }

    localStorage.setItem(seenKey, JSON.stringify([...seenIds, latestRejected._id]));
    setRejectionNotice('Your current request was rejected. You can make another request now.');

    const timeoutId = window.setTimeout(() => {
      setRejectionNotice('');
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [token, user, requests]);

  React.useEffect(() => {
    if (!token || !user || user.role !== 'USER' || !requests.length) {
      return;
    }

    const latestApproved = requests.find((item) => item.status === 'APPROVED');
    if (!latestApproved?._id) {
      return;
    }

    const seenKey = `seenApprovedRequestIds:${user.id}`;
    let seenIds = [];

    try {
      const raw = localStorage.getItem(seenKey);
      seenIds = raw ? JSON.parse(raw) : [];
    } catch (err) {
      seenIds = [];
    }

    if (seenIds.includes(latestApproved._id)) {
      return;
    }

    const lockerCode = latestApproved.lockerId?.code;
    const nextMessage = lockerCode
      ? `Your request was accepted. You can use locker code "${lockerCode}" below.`
      : 'Your request was accepted. You can use your assigned locker below.';

    localStorage.setItem(seenKey, JSON.stringify([...seenIds, latestApproved._id]));
    setApprovalNotice(nextMessage);

    const timeoutId = window.setTimeout(() => {
      setApprovalNotice('');
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [token, user, requests]);

  const saveSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMessage('');
    setApprovalNotice('');
    setRejectionNotice('');
    setError('');
  };

  const onAuthFormChange = (key, value) => {
    setAuthForm((prev) => ({ ...prev, [key]: value }));
  };

  const withRefresh = async (action) => {
    setError('');
    setMessage('');
    try {
      const response = await action();
      if (response?.message) {
        setMessage(response.message);
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              stationCode: authForm.stationCode,
              role: authForm.role,
              inviteKey: authForm.inviteKey
            };

      const data = await apiRequest(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      saveSession(data.token, data.user);
      setMessage('Logged in successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  const onBootstrapSuperAdmin = async () => {
    setError('');
    setMessage('');
    try {
      const data = await apiRequest('/auth/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name || 'Super Admin',
          email: authForm.email,
          password: authForm.password
        })
      });

      saveSession(data.token, data.user);
      setMessage('Super admin created and logged in');
    } catch (err) {
      setError(err.message);
    }
  };

  const headers = authHeaders(token);

  const onCreateStation = async (e) => {
    e.preventDefault();
    await withRefresh(() =>
      apiRequest('/stations', {
        method: 'POST',
        headers,
        body: JSON.stringify(stationForm)
      })
    );
  };

  const onCreateLocker = async (e) => {
    e.preventDefault();
    await withRefresh(() =>
      apiRequest('/lockers', {
        method: 'POST',
        headers,
        body: JSON.stringify(lockerForm)
      })
    );
  };

  const onCreateRequest = async (e) => {
    e.preventDefault();
    await withRefresh(() =>
      apiRequest('/requests/access', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestForm)
      })
    );
  };

  const onApproveRequest = (requestId) =>
    withRefresh(() => apiRequest(`/requests/${requestId}/approve`, { method: 'POST', headers }));
  const onRejectRequest = (requestId) =>
    withRefresh(() => apiRequest(`/requests/${requestId}/reject`, { method: 'POST', headers }));
  const onCancelRequest = (requestId) =>
    withRefresh(() => apiRequest(`/requests/${requestId}/cancel`, { method: 'POST', headers }));

  const onUnlock = (lockerId) =>
    withRefresh(() => apiRequest(`/lockers/${lockerId}/unlock`, { method: 'POST', headers }));
  const onLock = (lockerId) =>
    withRefresh(() => apiRequest(`/lockers/${lockerId}/lock`, { method: 'POST', headers }));
  const onRelease = (lockerId) =>
    withRefresh(() => apiRequest(`/lockers/${lockerId}/release`, { method: 'POST', headers }));

  const onEmergencyUnlock = (stationId) =>
    withRefresh(() => apiRequest(`/stations/${stationId}/emergency-unlock`, { method: 'POST', headers }));
  const onLockAll = (stationId) =>
    withRefresh(() => apiRequest(`/stations/${stationId}/lock-all`, { method: 'POST', headers }));

  const onChangeSchedule = (station) => {
    const openTime = window.prompt('Open time (HH:MM)', station.schedule.openTime) || station.schedule.openTime;
    const closeTime =
      window.prompt('Close time (HH:MM)', station.schedule.closeTime) || station.schedule.closeTime;

    withRefresh(() =>
      apiRequest(`/stations/${station._id}/schedule`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ openTime, closeTime })
      })
    );
  };

  if (!token || !user) {
    return (
      <AuthPage
        mode={authMode}
        form={authForm}
        error={error}
        message={message}
        onModeChange={setAuthMode}
        onChange={onAuthFormChange}
        onSubmit={onAuthSubmit}
        onBootstrapSuperAdmin={onBootstrapSuperAdmin}
      />
    );
  }

  return (
    <DashboardPage
      user={user}
      error={error}
      approvalNotice={approvalNotice}
      message={message}
      rejectionNotice={rejectionNotice}
      stations={stations}
      selectedStationId={selectedStationId}
      lockers={lockers}
      requests={requests}
      queueEntries={queueEntries}
      events={events}
      stationForm={stationForm}
      lockerForm={lockerForm}
      requestForm={requestForm}
      onRefresh={() => load().catch((err) => setError(err.message))}
      onLogout={clearSession}
      onStationFormChange={(k, v) => setStationForm((prev) => ({ ...prev, [k]: v }))}
      onCreateStation={onCreateStation}
      onLockerFormChange={(k, v) => setLockerForm((prev) => ({ ...prev, [k]: v }))}
      onCreateLocker={onCreateLocker}
      onStationFilterChange={setSelectedStationId}
      onEmergencyUnlock={onEmergencyUnlock}
      onLockAll={onLockAll}
      onChangeSchedule={onChangeSchedule}
      onRequestFormChange={(k, v) => setRequestForm((prev) => ({ ...prev, [k]: v }))}
      onCreateRequest={onCreateRequest}
      onApproveRequest={onApproveRequest}
      onRejectRequest={onRejectRequest}
      onCancelRequest={onCancelRequest}
      onUnlock={onUnlock}
      onLock={onLock}
      onRelease={onRelease}
    />
  );
}

export default App;
