const env = require("../config/env");

// 404 for routes that do not exist
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Express 5 sends errors thrown in async controllers here.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Bad ObjectId, e.g. /api/restaurants/abc. Don't echo the raw value back.
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  // Mongoose schema validation failed
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors });
  }

  // Broken JSON in the request body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  // Unique index violation (once you add unique indexes, e.g. on users.email)
  if (err.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" });
  }

  // Errors from body-parser etc. carry a safe status and message (e.g. 413 body too large)
  const status = err.status || err.statusCode || 500;
  if (status < 500 && err.expose) {
    return res.status(status).json({ message: err.message });
  }

  // Anything else is a bug: log the details, but never send internals to clients in production
  console.error(err);
  res.status(status).json({ message: env.isProduction ? "Something went wrong" : err.message || "Something went wrong" });
}

module.exports = { notFound, errorHandler };
