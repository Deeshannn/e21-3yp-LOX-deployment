function success(res, data = {}, status = 200) {
  return res.status(status).json(data);
}

function fail(res, message, status = 400) {
  return res.status(status).json({ message });
}

module.exports = {
  success,
  fail
};
