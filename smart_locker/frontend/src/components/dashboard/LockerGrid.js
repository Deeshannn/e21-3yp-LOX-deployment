import React from 'react';

const GRID_ROWS = 16;
const GRID_COLS = 16;
const TOTAL_SLOTS = GRID_ROWS * GRID_COLS;

function getLockerUserId(locker) {
  return locker?.currentUserId?._id || locker?.currentUserId || '';
}

function getLockerSlotStatus(locker, currentUserId) {
  if (!locker) {
    return 'empty';
  }

  if (!locker.isBooked) {
    return 'available';
  }

  return String(getLockerUserId(locker)) === String(currentUserId) ? 'mine' : 'occupied';
}

function LockerGrid({ user, lockers, onClaimLocker }) {
  const currentUserId = user?.id || user?._id;
  const normalizedLockers = lockers.slice(0, TOTAL_SLOTS);
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, index) => normalizedLockers[index] || null);

  return (
    <div className="locker-grid-wrapper">
      <div className="legend-row">
        <span className="legend-item"><span className="legend-dot available" />Available</span>
        <span className="legend-item"><span className="legend-dot mine" />My locker</span>
        <span className="legend-item"><span className="legend-dot occupied" />Occupied</span>
        <span className="legend-item"><span className="legend-dot empty" />No locker inserted</span>
      </div>

      <div className="locker-grid" role="grid" aria-label="Locker station grid">
        {slots.map((locker, index) => {
          const status = getLockerSlotStatus(locker, currentUserId);
          const code = locker?.code || `Slot ${index + 1}`;
          const canClaim = Boolean(locker && user?.role === 'USER' && status === 'available');

          const title = locker
            ? canClaim
              ? `${locker.code} - available (click to claim and unlock)`
              : `${locker.code} - ${status}`
            : `Slot ${index + 1} - no locker inserted`;

          const onSlotSelect = () => {
            if (canClaim && onClaimLocker) {
              onClaimLocker(locker._id);
            }
          };

          return (
            <div
              key={locker?._id || `slot-${index}`}
              className={`locker-slot locker-slot-${status}${canClaim ? ' locker-slot-clickable' : ''}`}
              role="gridcell"
              aria-label={`${code} ${status}${canClaim ? ' click to claim and unlock' : ''}`}
              title={title}
              tabIndex={canClaim ? 0 : -1}
              onClick={onSlotSelect}
              onKeyDown={(e) => {
                if (canClaim && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSlotSelect();
                }
              }}
            >
              {locker ? locker.code : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LockerGrid;
