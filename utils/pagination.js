/**
 * utils/pagination.js
 * Helper untuk kalkulasi pagination dari query params
 */

/**
 * Parse dan validasi pagination params dari req.query
 *
 * @param {object} query     - req.query
 * @param {number} [maxLimit=100] - Batas maksimal limit per request
 * @returns {{ page: number, limit: number, offset: number }}
 *
 * Contoh:
 *   const { page, limit, offset } = parsePagination(req.query);
 *   await Post.findAndCountAll({ limit, offset });
 */
function parsePagination(query, maxLimit = 100) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 10;

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Buat metadata pagination untuk response
 *
 * @param {number} count  - Total records
 * @param {number} page   - Halaman saat ini
 * @param {number} limit  - Limit per halaman
 * @returns {object}
 */
function buildPaginationMeta(count, page, limit) {
  return {
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
    hasNext: page < Math.ceil(count / limit),
    hasPrev: page > 1,
  };
}

module.exports = { parsePagination, buildPaginationMeta };
