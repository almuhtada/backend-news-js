const { AppError } = require("../../utils");

module.exports = function errorHandler(err, req, res, next) {
  const env = process.env.NODE_ENV || "development";

  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Handle Sequelize Database Errors
  if (err.name === "SequelizeValidationError") {
    const message = err.errors.map((el) => el.message).join(", ");
    error = new AppError(message, 400);
  } else if (err.name === "SequelizeUniqueConstraintError") {
    const message = err.errors.map((el) => el.message).join(", ");
    error = new AppError(message, 400);
  } else if (err.name === "SequelizeDatabaseError") {
    error = new AppError("Database query execution error", 500);
  }

  const statusCode = error.statusCode || err.status || 500;
  const status = error.status || "error";

  console.error("Global Error Log:", err);

  res.status(statusCode).json({
    success: false,
    status: status,
    message: error.message || "Internal Server Error",
    ...(env === "development" && { stack: error.stack }),
  });
};
