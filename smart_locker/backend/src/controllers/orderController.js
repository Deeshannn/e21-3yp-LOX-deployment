const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { listOrdersForUser, updateOrderStatus } = require('../services/orderService');

const listOrdersHandler = asyncHandler(async (req, res) => {
  const orders = await listOrdersForUser(req.user);
  return success(res, { orders });
});

const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(req.params.orderId, req.body.status);
  return success(res, { message: 'Order status updated', order });
});

module.exports = {
  listOrdersHandler,
  updateOrderStatusHandler
};