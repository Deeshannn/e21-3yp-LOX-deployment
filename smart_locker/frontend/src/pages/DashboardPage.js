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
    onRelease
  } = props;

  return (
    <div className="page">
      <HeaderBar user={user} onRefresh={onRefresh} onLogout={onLogout} />
      <AlertMessage type="error" text={error} />
      <AlertMessage type="success" text={approvalNotice} />
      <AlertMessage type="error" text={rejectionNotice} />
      <AlertMessage type="success" text={message} />

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
      />

      <QueuePanel queueEntries={queueEntries} />
      <EventPanel events={events} />
    </div>
  );
}

export default DashboardPage;
