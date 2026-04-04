/**
 * utils/index.js
 * Entry point — re-export semua utility agar bisa import dari satu tempat
 *
 * Contoh pemakaian:
 *   const { ok, notFound, serverError } = require("../utils");
 *   const { parsePagination }          = require("../utils");
 *   const { generateUniqueSlug }       = require("../utils");
 *   const { generateExcerpt }          = require("../utils");
 *   const logger                       = require("../utils/logger");
 */

const response   = require("./response");
const pagination = require("./pagination");
const slug       = require("./slug");
const sanitize   = require("./sanitize");
const logger     = require("./logger");

module.exports = {
  // response helpers
  ...response,

  // pagination helpers
  ...pagination,

  // slug helpers
  ...slug,

  // sanitize helpers
  ...sanitize,

  // logger (akses via require("../utils/logger") atau require("../utils").logger)
  logger,
};
