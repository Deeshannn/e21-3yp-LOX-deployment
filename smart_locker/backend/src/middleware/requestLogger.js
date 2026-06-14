const requestLogger = (req, res, next) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(2);
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

module.exports = { requestLogger };
