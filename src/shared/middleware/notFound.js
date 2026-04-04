module.exports = function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    suggestion: "Check /api-docs for available endpoints",
  });
};

