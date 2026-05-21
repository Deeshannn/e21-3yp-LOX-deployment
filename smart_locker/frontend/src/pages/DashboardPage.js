import React from 'react';
import HeaderBar from '../components/dashboard/HeaderBar';
import AlertMessage from '../components/common/AlertMessage';
import AdminSetupPanel from '../components/dashboard/AdminSetupPanel';
import StationPanel from '../components/dashboard/StationPanel';
import RequestPanel from '../components/dashboard/RequestPanel';
import LockerPanel from '../components/dashboard/LockerPanel';
import QueuePanel from '../components/dashboard/QueuePanel';
import EventPanel from '../components/dashboard/EventPanel';

function DashboardPage(props) {
  const {
    user,
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
    stationForm,
    lockerForm,
    requestForm,
    onRefresh,
    onLogout,
    onStationFormChange,
    onCreateStation,
    onLockerFormChange,
    onCreateLocker,
    onStationFilterChange,
    onEmergencyUnlock,
    onLockAll,
    onChangeSchedule,
    onRequestFormChange,
    onCreateRequest,
    onApproveRequest,
    onRejectRequest,
    onCancelRequest,
    onUnlock,
    onLock,
    onRelease,
    onIgnoreSecurity,
    onClearError,
    onClearMessage,
    onClearApprovalNotice,
    onClearRejectionNotice
  } = props;

  const activeNotification = error
    ? { type: 'error', text: error, onClose: onClearError }
    : rejectionNotice
      ? { type: 'error', text: rejectionNotice, onClose: onClearRejectionNotice }
      : approvalNotice
        ? { type: 'success', text: approvalNotice, onClose: onClearApprovalNotice }
        : message
          ? { type: 'success', text: message, onClose: onClearMessage }
          : null;

  return (
    <div className="page">
      <HeaderBar user={user} onRefresh={onRefresh} onLogout={onLogout} />
      {activeNotification ? <AlertMessage {...activeNotification} /> : null}

      <div className={user.role === 'SUB_ADMIN' ? 'dashboard-home-layout' : 'dashboard-stack'}>
        <div className="dashboard-stack dashboard-home-main">
          <AdminSetupPanel
            user={user}
            stations={stations}
            stationForm={stationForm}
            onStationFormChange={onStationFormChange}
            onCreateStation={onCreateStation}
            lockerForm={lockerForm}
            onLockerFormChange={onLockerFormChange}
            onCreateLocker={onCreateLocker}
          />

          <StationPanel
            user={user}
            stations={stations}
            onEmergencyUnlock={onEmergencyUnlock}
            onLockAll={onLockAll}
            onChangeSchedule={onChangeSchedule}
          />

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
          />

          <QueuePanel queueEntries={queueEntries} />
        </div>

        {user.role === 'SUB_ADMIN' ? <EventPanel events={events} /> : null}
      </div>
    </div>
  );
}

export default DashboardPage;
