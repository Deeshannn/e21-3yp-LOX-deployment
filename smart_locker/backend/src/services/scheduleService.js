const Station = require('../models/Station');
const Locker = require('../models/Locker');
const { publishLockerCommand, logEvent } = require('./mqttService');
const { LockerStates } = require('../constants/enums');

function nowAsHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

async function runScheduleTick() {
  const current = nowAsHHMM();
  const stations = await Station.find({ 'schedule.enabled': true });

  for (const station of stations) {
    let command = null;
    let eventType = null;

    if (station.schedule.openTime === current) {
      command = 'UNLOCK';
      eventType = 'SCHEDULE_OPEN';
    }

    if (station.schedule.closeTime === current) {
      command = 'LOCK';
      eventType = 'SCHEDULE_CLOSE';
    }

    if (!command) {
      continue;
    }

    const lockers = await Locker.find({ stationId: station._id });
    for (const locker of lockers) {
      try {
        await publishLockerCommand(locker, command);
        locker.lockState = command === 'LOCK' ? LockerStates.LOCKED : LockerStates.UNLOCKED;
        await locker.save();
        await logEvent(locker, eventType, `Locker automatically ${command === 'LOCK' ? 'locked' : 'unlocked'} by schedule`);
      } catch (error) {
        console.error('Schedule command failed:', error.message);
      }
    }
  }
}

function startScheduler() {
  setInterval(() => {
    runScheduleTick().catch((error) => {
      console.error('Schedule tick error:', error.message);
    });
  }, 60 * 1000);
}

module.exports = {
  startScheduler
};
