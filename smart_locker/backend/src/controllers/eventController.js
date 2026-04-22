const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { listEvents } = require('../services/eventService');

const listEventsHandler = asyncHandler(async (req, res) => {
  const events = await listEvents(req.user, req.query);
  return success(res, { events });
});

module.exports = {
  listEventsHandler
};
