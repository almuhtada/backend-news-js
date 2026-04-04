/**
 * utils/logger.js
 * Simple logger dengan timestamp dan level — pengganti console.error/log di seluruh project
 */

const ENV = process.env.NODE_ENV || "development";

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
};

function timestamp() {
  return new Date().toISOString();
}

function format(level, color, context, message, meta) {
  const prefix = `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${color}[${level}]${COLORS.reset}`;
  const ctx = context ? ` ${COLORS.cyan}(${context})${COLORS.reset}` : "";

  if (meta) {
    console.log(`${prefix}${ctx} ${message}`, meta);
  } else {
    console.log(`${prefix}${ctx} ${message}`);
  }
}

const logger = {
  /**
   * Log informasi umum (hanya tampil di development)
   * @param {string} context  - Nama controller/service (misal: "postController")
   * @param {string} message
   * @param {*}      [meta]
   */
  info(context, message, meta) {
    if (ENV !== "production") {
      format("INFO", COLORS.green, context, message, meta);
    }
  },

  /**
   * Log peringatan
   */
  warn(context, message, meta) {
    format("WARN", COLORS.yellow, context, message, meta);
  },

  /**
   * Log error — selalu tampil di semua environment
   * @param {string} context
   * @param {string} message
   * @param {Error|*} [error]
   */
  error(context, message, error) {
    format("ERROR", COLORS.red, context, message);
    if (error) {
      if (ENV === "development") {
        console.error(error);
      } else {
        // Production: hanya log message, bukan full stack
        console.error(`${COLORS.red}  →${COLORS.reset}`, error?.message || String(error));
      }
    }
  },

  /**
   * Log debug — hanya development
   */
  debug(context, message, meta) {
    if (ENV === "development") {
      format("DEBUG", COLORS.gray, context, message, meta);
    }
  },
};

module.exports = logger;
