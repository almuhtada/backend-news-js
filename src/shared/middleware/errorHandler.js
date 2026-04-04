module.exports = function errorHandler(err, req, res, next) {
  const env = process.env.NODE_ENV || 'development';
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: env === 'development' ? err.message : 'Something went wrong',
    ...(env === 'development' && { stack: err.stack }),
  });
};

