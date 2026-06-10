import React from 'react';
import HeaderBar from '../components/dashboard/HeaderBar';
import AlertMessage from '../components/common/AlertMessage';
import RequestPanel from '../components/dashboard/RequestPanel';
import LockerPanel from '../components/dashboard/LockerPanel';
import QueuePanel from '../components/dashboard/QueuePanel';
import AccountPanel from '../components/dashboard/AccountPanel';
import HelpPanel from '../components/dashboard/HelpPanel';
import AnalyticsPanel from '../components/dashboard/AnalyticsPanel';
import StorePanel from '../components/marketplace/StorePanel';
import FreeDurationPanel from '../components/dashboard/FreeDurationPanel';
import OverduePanel from '../components/dashboard/OverduePanel';

function createProfileForm(user) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
    homeBackgroundUrl: user?.homeBackgroundUrl || '',
    phone: user?.phone || '',
    jobTitle: user?.jobTitle || '',
    bio: user?.bio || ''
  };
}

function DashboardPage(props) {
  const {
    user,
    token,
    error,
    approvalNotice,
    message,
    rejectionNotice,
    stations,
    selectedStationId,
    lockers,
    requests,
    queueEntries,
    events,
    overdueLockers,
    requestForm,
    onRefresh,
    onLogout,
    onStationFilterChange,
    onRequestFormChange,
    onCreateRequest,
    onApproveRequest,
    onRejectRequest,
    onCancelRequest,
    onUnlock,
    onLock,
    onRelease,
    onIgnoreSecurity,
    onOverduePayment,
    onUpdateProfile,
    onClearError,
    onClearMessage,
    onClearApprovalNotice,
    onClearRejectionNotice
  } = props;

  const [activeSection, setActiveSection] = React.useState('home');
  const [localProfileForm, setLocalProfileForm] = React.useState(() => createProfileForm(user));

  const stationName = React.useMemo(() => {
    const selectedStation = stations.find((station) => station._id === selectedStationId);
    if (selectedStation?.name) {
      return selectedStation.name;
    }

    const assignedStationId = user?.stationIds?.[0];
    const assignedStation = stations.find((station) => station._id === assignedStationId || station._id === String(assignedStationId));
    return assignedStation?.name || selectedStation?.name || 'Locker Station';
  }, [selectedStationId, stations, user]);

  React.useEffect(() => {
    setLocalProfileForm(createProfileForm(user));
  }, [user]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    await onUpdateProfile(localProfileForm);
  };

  const handleProfileChange = (key, value) => {
    setLocalProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const activeNotification = error
    ? { type: 'error', text: error, onClose: onClearError }
    : rejectionNotice
      ? { type: 'error', text: rejectionNotice, onClose: onClearRejectionNotice }
      : approvalNotice
        ? { type: 'success', text: approvalNotice, onClose: onClearApprovalNotice }
        : message
          ? { type: 'success', text: message, onClose: onClearMessage }
          : null;

  const homeBackgroundUrl = localProfileForm.homeBackgroundUrl || user.homeBackgroundUrl || '';
  const homeSectionStyle = homeBackgroundUrl
    ? {
        '--home-background-image': `url("${homeBackgroundUrl}")`
      }
    : {
        '--home-background-image': 'none'
      };

  // Determine the currently selected station object (for overdue panel)
  const selectedStation = stations.find((s) => s._id === selectedStationId) || stations[0] || null;

  const isAdmin = user.role === 'SUB_ADMIN' || user.role === 'SUPER_ADMIN';

  return (
    <div className="page dashboard-page">
      <HeaderBar
        user={user}
        stationName={stationName}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onRefresh={onRefresh}
        onLogout={onLogout}
      />

      {activeNotification ? <AlertMessage {...activeNotification} /> : null}

      {activeSection === 'home' ? (
        <main className="dashboard-stack dashboard-home-shell" style={homeSectionStyle}>
          <RequestPanel
            user={user}
            stations={stations}
            requests={requests}
            requestForm={requestForm}
            onRequestFormChange={onRequestFormChange}
            onCreateRequest={onCreateRequest}
            onApprove={onApproveRequest}
            onReject={onRejectRequest}
            onCancel={onCancelRequest}
          />

          <LockerPanel
            user={user}
            stations={stations}
            selectedStationId={selectedStationId}
            onStationChange={onStationFilterChange}
            lockers={lockers}
            onUnlock={onUnlock}
            onLock={onLock}
            onRelease={onRelease}
            onIgnoreSecurity={onIgnoreSecurity}
            onOverduePayment={onOverduePayment}
            token={token}
          />

          <QueuePanel queueEntries={queueEntries} />

          {/* Sub-admin / Super-admin: Free Duration Settings + Overdue Monitoring */}
          {isAdmin ? (
            <>
              <FreeDurationPanel
                stations={stations}
                selectedStationId={selectedStationId}
                token={token}
                onRefresh={onRefresh}
              />
              <OverduePanel
                station={selectedStation}
                overdueLockers={overdueLockers}
              />
            </>
          ) : null}
        </main>
      ) : null}

      {activeSection === 'store' ? <StorePanel user={user} token={token} /> : null}

      {activeSection === 'account' ? (
        <AccountPanel
          user={user}
          profileForm={localProfileForm}
          onProfileFormChange={handleProfileChange}
          onSubmit={handleProfileSubmit}
        />
      ) : null}

      {activeSection === 'help' ? <HelpPanel /> : null}

      {activeSection === 'analytics' ? <AnalyticsPanel requests={requests} events={events} queueEntries={queueEntries} /> : null}
    </div>
  );
}

export default DashboardPage;
