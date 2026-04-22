const mongoose = require('mongoose');
const { mqttClient } = require('../services/mqttService');

function healthHandler(req, res) {
  res.json({
    ok: true,
    dbReady: mongoose.connection.readyState === 1,
    mqttConnected: mqttClient.connected
  });
}

module.exports = {
  healthHandler
};
