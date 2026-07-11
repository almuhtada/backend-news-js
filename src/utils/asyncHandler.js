/**
 * Wrap asynchronous route handlers and middleware to catch errors and pass them to the next middleware.
 * This eliminates the need for try-catch blocks in controllers.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = asyncHandler;
