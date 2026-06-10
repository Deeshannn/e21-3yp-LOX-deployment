/**
 * overdueService.js
 * Pure logic service for computing reservation phase and managing overdue state.
 * No HTTP concerns — can be called from controllers or other services.
 */

const { ReservationPhase } = require('../constants/enums');
const Locker = require('../models/Locker');
const Station = require('../models/Station');

/**
 * Compute the current reservation phase and time metadata for a locker.
 *
 * @param {object} locker  - Locker Mongoose document (must have reservedAt, overdueReleasedAt)
 * @param {object} station - Station Mongoose document (must have freeDurationMinutes, gracePeriodMinutes, overdueRatePerHour)
 * @returns {{ phase, timeRemainingMs, overdueMs, chargeAmount, graceEndsAt, freeEndsAt }}
 */
function getReservationPhase(locker, station) {
  const now = Date.now();

  // Defaults if station fields are somehow missing
  const freeDurationMs = (station.freeDurationMinutes ?? 60) * 60 * 1000;
  const gracePeriodMs = (station.gracePeriodMinutes ?? 10) * 60 * 1000;
  const ratePerHour = station.overdueRatePerHour ?? 1.0;

  // If no reservedAt, treat as ACTIVE with no countdown (shouldn't normally happen)
  if (!locker.reservedAt || !locker.isBooked) {
    return {
      phase: null,
      timeRemainingMs: null,
      overdueMs: 0,
      chargeAmount: 0,
      graceEndsAt: null,
      freeEndsAt: null
    };
  }

  const reservedAt = new Date(locker.reservedAt).getTime();
  const freeEndsAt = new Date(reservedAt + freeDurationMs);
  const elapsedMs = now - reservedAt;

  // --- OVERDUE_RELEASED: payment done, grace period still active ---
  if (locker.overdueReleasedAt) {
    const releasedAt = new Date(locker.overdueReleasedAt).getTime();
    const graceEndsAt = new Date(releasedAt + gracePeriodMs);
    const graceRemainingMs = graceEndsAt.getTime() - now;

    if (graceRemainingMs > 0) {
      return {
        phase: ReservationPhase.OVERDUE_RELEASED,
        timeRemainingMs: graceRemainingMs,
        overdueMs: 0,
        chargeAmount: 0,
        graceEndsAt,
        freeEndsAt
      };
    }

    // Grace period has expired! Revert to OVERDUE.
    // Calculate overdue duration starting from when the grace period ended.
    const overdueMs = now - graceEndsAt.getTime();
    const overdueHours = overdueMs / (1000 * 60 * 60);
    const chargeAmount = Math.max(parseFloat((overdueHours * ratePerHour).toFixed(2)), 0.50); // minimum $0.50

    return {
      phase: ReservationPhase.OVERDUE,
      timeRemainingMs: 0,
      overdueMs,
      chargeAmount,
      graceEndsAt,
      freeEndsAt
    };
  }

  // --- ACTIVE: still within free window ---
  if (elapsedMs < freeDurationMs) {
    return {
      phase: ReservationPhase.ACTIVE,
      timeRemainingMs: freeDurationMs - elapsedMs,
      overdueMs: 0,
      chargeAmount: 0,
      graceEndsAt: null,
      freeEndsAt
    };
  }

  // --- OVERDUE: free window expired, payment needed ---
  const overdueMs = elapsedMs - freeDurationMs;
  const overdueHours = overdueMs / (1000 * 60 * 60);
  const chargeAmount = Math.max(parseFloat((overdueHours * ratePerHour).toFixed(2)), 0.50); // minimum $0.50

  return {
    phase: ReservationPhase.OVERDUE,
    timeRemainingMs: 0,
    overdueMs,
    chargeAmount,
    graceEndsAt: null,
    freeEndsAt
  };
}

/**
 * Compute the overdue charge amount only.
 * @param {object} station
 * @param {number} overdueMinutes
 * @returns {number} charge in dollars (minimum $0.50)
 */
function computeOverdueCharge(station, overdueMinutes) {
  const ratePerHour = station.overdueRatePerHour ?? 1.0;
  const overdueHours = overdueMinutes / 60;
  return Math.max(parseFloat((overdueHours * ratePerHour).toFixed(2)), 0.50);
}

/**
 * Mark a locker as overdue-released after successful payment.
 * @param {string} lockerId
 * @param {string} orderId
 */
async function markOverdueReleased(lockerId, orderId) {
  const locker = await Locker.findById(lockerId);
  if (!locker) {
    const error = new Error('Locker not found');
    error.statusCode = 404;
    throw error;
  }

  locker.overdueReleasedAt = new Date();
  locker.overduePaymentId = orderId;
  await locker.save();
  return locker;
}

/**
 * Get all overdue lockers for a station with their computed charge.
 * @param {string} stationId
 * @returns {Array}
 */
async function getOverdueLockersForStation(stationId) {
  const station = await Station.findById(stationId);
  if (!station) {
    const error = new Error('Station not found');
    error.statusCode = 404;
    throw error;
  }

  const lockers = await Locker.find({ stationId, isBooked: true })
    .populate('currentUserId', 'name email')
    .sort({ reservedAt: 1 });

  const result = [];
  for (const locker of lockers) {
    const { phase, overdueMs, chargeAmount, freeEndsAt } = getReservationPhase(locker, station);
    if (phase === ReservationPhase.OVERDUE) {
      result.push({
        locker,
        phase,
        overdueMs,
        chargeAmount,
        freeEndsAt
      });
    }
  }

  return result;
}

module.exports = {
  getReservationPhase,
  computeOverdueCharge,
  markOverdueReleased,
  getOverdueLockersForStation
};
