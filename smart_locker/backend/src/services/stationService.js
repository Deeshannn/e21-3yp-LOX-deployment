const Station = require('../models/Station');

function getStationsForUser(user) {
  if (user.role === 'SUPER_ADMIN' || user.role === 'USER') {
    return Station.find({}).sort({ createdAt: 1 });
  }

  return Station.find({ _id: { $in: user.stationIds || [] } }).sort({ createdAt: 1 });
}

function getAllStations() {
  return Station.find({}).sort({ createdAt: 1 });
}

async function createStation(payload) {
  const stationData = {
    name: payload.name,
    code: payload.code.toUpperCase(),
    timezone: payload.timezone || 'Asia/Colombo',
    schedule: {
      enabled: true,
      openTime: payload.openTime || '08:00',
      closeTime: payload.closeTime || '20:00'
    }
  };

  if (payload.location && Array.isArray(payload.location.coordinates) && payload.location.coordinates.length === 2) {
    stationData.location = {
      type: 'Point',
      coordinates: payload.location.coordinates
    };
  }

  return Station.create(stationData);
}

module.exports = {
  getStationsForUser,
  getAllStations,
  createStation
};
