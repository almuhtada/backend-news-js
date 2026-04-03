/**
 * utils/response.js
 * Standardized API response helpers — dipakai di semua controller
 */

/**
 * 200 OK — data berhasil diambil atau diproses
 */
const ok = (res, data, message = "Success") =>
  res.json({ success: true, message, data });

/**
 * 201 Created — resource baru berhasil dibuat
 */
const created = (res, data, message = "Created successfully") =>
  res.status(201).json({ success: true, message, data });

/**
 * 400 Bad Request — validasi gagal atau input tidak valid
 */
const badRequest = (res, message = "Bad request") =>
  res.status(400).json({ success: false, message });

/**
 * 401 Unauthorized — token tidak ada atau tidak valid
 */
const unauthorized = (res, message = "Unauthorized") =>
  res.status(401).json({ success: false, message });

/**
 * 403 Forbidden — tidak punya akses ke resource ini
 */
const forbidden = (res, message = "Forbidden") =>
  res.status(403).json({ success: false, message });

/**
 * 404 Not Found — resource tidak ditemukan
 */
const notFound = (res, message = "Not found") =>
  res.status(404).json({ success: false, message });

/**
 * 500 Internal Server Error — error tidak terduga di server
 */
const serverError = (res, error, message = "Internal server error") => {
  const isDev = process.env.NODE_ENV === "development";
  return res.status(500).json({
    success: false,
    message,
    ...(isDev && { error: error?.message || String(error) }),
  });
};

/**
 * Paginated response — untuk endpoint yang support pagination
 * @param {object} res - Express response
 * @param {Array}  rows - Array data
 * @param {number} count - Total records (dari findAndCountAll)
 * @param {number} page - Halaman saat ini (1-based)
 * @param {number} limit - Jumlah item per halaman
 */
const paginated = (res, rows, count, page, limit) =>
  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  });

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFound, serverError, paginated };
