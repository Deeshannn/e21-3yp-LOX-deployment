const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  USER: 'USER'
};

const LockerStates = {
  LOCKED: 'LOCKED',
  UNLOCKED: 'UNLOCKED',
  UNKNOWN: 'UNKNOWN'
};

const DoorStates = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  UNKNOWN: 'UNKNOWN'
};

const RequestStatuses = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  QUEUED: 'QUEUED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
};

const ReservationPhase = {
  ACTIVE: 'ACTIVE',                       // within free window
  OVERDUE: 'OVERDUE',                     // free window expired, payment needed
  OVERDUE_RELEASED: 'OVERDUE_RELEASED'    // payment done, grace period active
};

module.exports = {
  Roles,
  LockerStates,
  DoorStates,
  RequestStatuses,
  ReservationPhase
};
