/**
 * utils/slug.js
 * Helper untuk generate slug dari teks dan memastikan slug unik di database
 */

/**
 * Konversi teks ke slug URL-friendly
 * Contoh: "Berita Terkini 2025!" → "berita-terkini-2025"
 *
 * @param {string} text
 * @returns {string}
 */
function toSlug(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .trim()
    // Ganti karakter Arab/non-latin dengan strip (karena judul bisa Bahasa Arab)
    .replace(/[\u0600-\u06FF\u0750-\u077F]+/g, (match) => {
      // Pertahankan karakter Arab apa adanya jika diinginkan, atau strip
      return "";
    })
    .replace(/[^a-z0-9\s-]/g, "")   // hapus karakter selain huruf, angka, spasi, strip
    .replace(/\s+/g, "-")            // spasi → strip
    .replace(/-+/g, "-")             // strip ganda → satu strip
    .replace(/^-|-$/g, "");          // trim strip di awal/akhir
}

/**
 * Generate slug unik dengan fallback timestamp
 * Cek ke database apakah slug sudah dipakai, jika iya tambah suffix angka
 *
 * @param {string}   baseText  - Teks asal (judul, nama, dll)
 * @param {Function} checkFn   - Async function(slug): Promise<boolean> → true jika sudah ada
 * @param {string}   [existing] - Slug existing (agar tidak konflik dengan diri sendiri saat update)
 * @returns {Promise<string>}
 *
 * Contoh pemakaian:
 *   const slug = await generateUniqueSlug(title, (s) => Post.findOne({ where: { slug: s } }));
 */
async function generateUniqueSlug(baseText, checkFn, existing = null) {
  let slug = toSlug(baseText);

  // Jika slug kosong (misal judul hanya karakter Arab), pakai timestamp
  if (!slug) slug = `post-${Date.now()}`;

  // Kalau sama dengan existing slug (update kasus), langsung kembalikan
  if (existing && existing === slug) return slug;

  let candidate = slug;
  let counter = 1;

  while (await checkFn(candidate)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }

  return candidate;
}

module.exports = { toSlug, generateUniqueSlug };
