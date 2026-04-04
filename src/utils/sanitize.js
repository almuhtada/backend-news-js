/**
 * utils/sanitize.js
 * Helper untuk membersihkan input dari karakter berbahaya
 * dan strip HTML tags dari konten berita
 */

/**
 * Strip semua HTML tags dari string
 * Berguna untuk generate excerpt dari content HTML
 *
 * @param {string} html
 * @returns {string}
 *
 * Contoh:
 *   stripHtml("<p>Berita <b>penting</b></p>") → "Berita penting"
 */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")    // ganti tag dengan spasi
    .replace(/&nbsp;/g, " ")      // ganti HTML entities umum
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")      // normalisasi spasi ganda
    .trim();
}

/**
 * Generate excerpt (ringkasan singkat) dari konten HTML
 *
 * @param {string} html       - Konten HTML penuh
 * @param {number} [maxChars=160] - Panjang maksimal karakter
 * @returns {string}
 */
function generateExcerpt(html, maxChars = 160) {
  const text = stripHtml(html);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).replace(/\s+\S*$/, "") + "...";
}

/**
 * Trim dan normalisasi string input dari user
 * Mencegah leading/trailing whitespace dan whitespace berlebih
 *
 * @param {string} value
 * @returns {string}
 */
function cleanString(value) {
  if (typeof value !== "string") return value;
  return value.trim().replace(/\s{2,}/g, " ");
}

/**
 * Escape karakter khusus SQL LIKE agar aman dipakai di query Sequelize Op.like
 * Contoh: "50%" → "50\%" agar tidak diinterpretasi sebagai wildcard
 *
 * @param {string} value
 * @returns {string}
 */
function escapeLike(value) {
  if (!value) return "";
  return value.replace(/[%_\\]/g, "\\$&");
}

module.exports = { stripHtml, generateExcerpt, cleanString, escapeLike };
