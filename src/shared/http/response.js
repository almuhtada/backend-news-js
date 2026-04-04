const ok = (res, data, message = "Success") =>
  res.json({ success: true, message, data });

const created = (res, data, message = "Created successfully") =>
  res.status(201).json({ success: true, message, data });

const badRequest = (res, message = "Bad request") =>
  res.status(400).json({ success: false, message });

const unauthorized = (res, message = "Unauthorized") =>
  res.status(401).json({ success: false, message });

const forbidden = (res, message = "Forbidden") =>
  res.status(403).json({ success: false, message });

const notFound = (res, message = "Not found") =>
  res.status(404).json({ success: false, message });

const serverError = (res, error, message = "Internal server error") => {
  const isDev = process.env.NODE_ENV === "development";
  return res.status(500).json({
    success: false,
    message,
    ...(isDev && { error: error?.message || String(error) }),
  });
};

const paginated = (res, rows, count, page, limit) =>
  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  });

module.exports = {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  paginated,
};
