import React from 'react';

const GRID_ROWS = 4;
const GRID_COLS = 4;
const TOTAL_SLOTS = GRID_ROWS * GRID_COLS;

function getLockerSlotStatus(locker) {
  if (!locker) {
    return 'empty';
  }
  return locker.isBooked ? 'occupied' : 'available';
}

function LockerGrid({ lockers }) {
  const normalizedLockers = lockers.slice(0, TOTAL_SLOTS);
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, index) => normalizedLockers[index] || null);

  return (
    <div className="locker-grid-wrapper">
      <div className="legend-row">
        <span className="legend-item"><span className="legend-dot available" />Available</span>
        <span className="legend-item"><span className="legend-dot occupied" />Occupied</span>
        <span className="legend-item"><span className="legend-dot empty" />No locker inserted</span>
      </div>

      <div className="locker-grid" role="grid" aria-label="Locker station grid">
        {slots.map((locker, index) => {
          const status = getLockerSlotStatus(locker);
          const code = locker?.code || `Slot ${index + 1}`;

          return (
            <div
              key={locker?._id || `slot-${index}`}
              className={`locker-slot locker-slot-${status}`}
              role="gridcell"
              aria-label={`${code} ${status}`}
              title={locker ? `${locker.code} - ${status}` : `Slot ${index + 1} - no locker inserted`}
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
